import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

// Previous prices are now persisted in the price_cache table to survive cold starts

interface Alert {
  id: string;
  user_id: string;
  symbol: string;
  exchange: string;
  type: 'price_level' | 'rsi_level' | 'macd_cross' | 'volume_spike';
  timeframe: string | null;
  params: {
    target_price?: number;
    price_direction?: 'above' | 'below' | 'cross';
    rsi_level?: number;
    rsi_mode?: 'crossing' | 'touch';
    macd_mode?: 'signal_cross' | 'zero_cross';
    volume_threshold?: number;
    volume_period?: number;
  };
  mode: 'once' | 'every_touch' | 'crossing' | 'touch';
  active: boolean;
  paused: boolean;
  last_trigger_candle_open_time: string | null;
  cooldown_until: string | null;
  priority: number;
  last_known_price?: number;
}

interface MarketData {
  price: number;
  rsi: number | null;
  macd: { line: number; signal: number; histogram: number } | null;
  volumeRatio: number | null;
  candles: any[];
  previous?: MarketData;
}

const previousIndicatorCache = new Map<string, MarketData>();

function isForexOrMarketHoursLimited(symbol: string, exchange: string): boolean {
  const upper = symbol.toUpperCase();
  return exchange === 'forex' || upper.endsWith('BRL') || ['SPX500', 'NAS100', 'DJI30', 'IBOV'].includes(upper);
}

function isWeekendInSaoPaulo(date = new Date()): boolean {
  const weekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'America/Sao_Paulo' }).format(date);
  return weekday === 'Sat' || weekday === 'Sun';
}

interface TriggerResult {
  triggered: boolean;
  direction?: 'up' | 'down';
  probUp?: number;
  probDown?: number;
  confidence?: 'low' | 'medium' | 'high';
  comment?: string;
}

// Deterministic rule-based AI for direction prediction
function predictDirection(
  type: string,
  data: MarketData,
  params: Alert['params']
): { direction: 'up' | 'down'; probUp: number; probDown: number; confidence: 'low' | 'medium' | 'high'; comment: string } {
  let probUp = 0.5;
  let comment = '';

  if (type === 'rsi_level' && data.rsi !== null) {
    if (data.rsi <= 30) {
      probUp = 0.65 + (30 - data.rsi) * 0.01;
      comment = `RSI em zona de sobrevenda (${data.rsi.toFixed(1)}). Possível reversão de alta.`;
    } else if (data.rsi >= 70) {
      probUp = 0.35 - (data.rsi - 70) * 0.01;
      comment = `RSI em zona de sobrecompra (${data.rsi.toFixed(1)}). Possível reversão de baixa.`;
    } else {
      comment = `RSI neutro (${data.rsi.toFixed(1)}).`;
    }
  }

  if (type === 'macd_cross' && data.macd) {
    if (params.macd_mode === 'signal_cross') {
      if (data.macd.histogram > 0) {
        probUp = 0.60 + Math.min(Math.abs(data.macd.histogram) * 1000, 0.15);
        comment = `MACD cruzou acima do Signal. Momentum de alta.`;
      } else {
        probUp = 0.40 - Math.min(Math.abs(data.macd.histogram) * 1000, 0.15);
        comment = `MACD cruzou abaixo do Signal. Momentum de baixa.`;
      }
    } else {
      if (data.macd.line > 0) {
        probUp = 0.62;
        comment = `MACD cruzou linha zero para cima. Tendência de alta confirmada.`;
      } else {
        probUp = 0.38;
        comment = `MACD cruzou linha zero para baixo. Tendência de baixa confirmada.`;
      }
    }
  }

  if (type === 'volume_spike' && data.volumeRatio !== null) {
    if (data.candles && data.candles.length >= 2) {
      const lastCandle = data.candles[data.candles.length - 1];
      const prevCandle = data.candles[data.candles.length - 2];
      if (lastCandle.close > prevCandle.close) {
        probUp = 0.58 + (data.volumeRatio / 1000);
        comment = `Volume ${data.volumeRatio.toFixed(0)}% acima da média com candle de alta. Força compradora.`;
      } else {
        probUp = 0.42 - (data.volumeRatio / 1000);
        comment = `Volume ${data.volumeRatio.toFixed(0)}% acima da média com candle de baixa. Pressão vendedora.`;
      }
    }
  }

  if (type === 'price_level') {
    if (params.price_direction === 'above') {
      probUp = 0.55;
      comment = `Preço rompeu resistência em $${params.target_price}. Possível continuação de alta.`;
    } else if (params.price_direction === 'below') {
      probUp = 0.45;
      comment = `Preço rompeu suporte em $${params.target_price}. Possível continuação de baixa.`;
    } else {
      // Cross mode
      probUp = 0.50;
      comment = `Preço cruzou nível crítico em $${params.target_price}.`;
    }
  }

  probUp = Math.max(0.1, Math.min(0.9, probUp));
  const probDown = 1 - probUp;

  let confidence: 'low' | 'medium' | 'high' = 'low';
  const diff = Math.abs(probUp - 0.5);
  if (diff > 0.2) confidence = 'high';
  else if (diff > 0.1) confidence = 'medium';

  return {
    direction: probUp >= 0.5 ? 'up' : 'down',
    probUp: Math.round(probUp * 100) / 100,
    probDown: Math.round(probDown * 100) / 100,
    confidence,
    comment,
  };
}

// Check if alert should trigger - now with proper cross detection
function checkAlertCondition(
  alert: Alert,
  data: MarketData,
  previousPrice: number | null,
  previousData?: MarketData
): TriggerResult {
  const { type, params, mode } = alert;

  switch (type) {
    case 'price_level': {
      const target = params.target_price!;
      const direction = params.price_direction!;
      const price = data.price;

      if (direction === 'above') {
        if (price >= target) {
          // For crossing mode, check if we crossed from below
          if (mode === 'crossing' && previousPrice !== null && previousPrice >= target) {
            return { triggered: false };
          }
          const prediction = predictDirection(type, data, params);
          return { triggered: true, ...prediction };
        }
      } else if (direction === 'below') {
        if (price <= target) {
          // For crossing mode, check if we crossed from above
          if (mode === 'crossing' && previousPrice !== null && previousPrice <= target) {
            return { triggered: false };
          }
          const prediction = predictDirection(type, data, params);
          return { triggered: true, ...prediction };
        }
      } else if (direction === 'cross') {
        // Cross direction: trigger when price crosses the target level in either direction
        if (previousPrice !== null) {
          const crossedUp = previousPrice < target && price >= target;
          const crossedDown = previousPrice > target && price <= target;
          
          if (crossedUp || crossedDown) {
            console.log(`Price cross detected! Prev: ${previousPrice}, Current: ${price}, Target: ${target}`);
            const prediction = predictDirection(type, data, params);
            prediction.direction = crossedUp ? 'up' : 'down';
            prediction.comment = crossedUp 
              ? `Preço cruzou para cima do nível $${target}. Rompimento de resistência.`
              : `Preço cruzou para baixo do nível $${target}. Rompimento de suporte.`;
            return { triggered: true, ...prediction };
          }
        } else {
          // First time seeing this symbol - just store the price, don't trigger
          console.log(`No previous price for ${alert.symbol}, storing current: ${price}`);
        }
      }
      break;
    }

    case 'rsi_level': {
      if (data.rsi === null) return { triggered: false };
      const level = params.rsi_level!;
      const rsiMode = params.rsi_mode || 'touch';

      if (rsiMode === 'crossing') {
        if (previousData?.rsi !== null && previousData?.rsi !== undefined) {
          if ((previousData.rsi < level && data.rsi >= level) ||
              (previousData.rsi > level && data.rsi <= level)) {
            const prediction = predictDirection(type, data, params);
            return { triggered: true, ...prediction };
          }
        }
      } else {
        if (Math.abs(data.rsi - level) <= 2) {
          const prediction = predictDirection(type, data, params);
          return { triggered: true, ...prediction };
        }
      }
      break;
    }

    case 'macd_cross': {
      if (!data.macd) return { triggered: false };
      const macdMode = params.macd_mode || 'signal_cross';

      if (macdMode === 'signal_cross') {
        if (previousData?.macd) {
          const prevHist = previousData.macd.histogram;
          const currHist = data.macd.histogram;
          if ((prevHist < 0 && currHist >= 0) || (prevHist > 0 && currHist <= 0)) {
            const prediction = predictDirection(type, data, params);
            return { triggered: true, ...prediction };
          }
        }
      } else {
        if (previousData?.macd) {
          const prevLine = previousData.macd.line;
          const currLine = data.macd.line;
          if ((prevLine < 0 && currLine >= 0) || (prevLine > 0 && currLine <= 0)) {
            const prediction = predictDirection(type, data, params);
            return { triggered: true, ...prediction };
          }
        }
      }
      break;
    }

    case 'volume_spike': {
      if (data.volumeRatio === null) return { triggered: false };
      const threshold = params.volume_threshold || 200;
      
      if (data.volumeRatio >= threshold) {
        const prediction = predictDirection(type, data, params);
        return { triggered: true, ...prediction };
      }
      break;
    }
  }

  return { triggered: false };
}

async function fetchMarketData(
  supabaseUrl: string,
  symbol: string,
  exchange: string,
  timeframe: string | null
): Promise<MarketData | null> {
  try {
    // Fetch candles
    const marketResponse = await fetch(`${supabaseUrl}/functions/v1/fetch-market-data`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ symbol, exchange, timeframe, limit: 200 }),
    });

    if (!marketResponse.ok) {
      console.error('Failed to fetch market data');
      return null;
    }

    const marketData = await marketResponse.json();
    const candles = marketData.candles || [];
    const price = marketData.price;

    if (!timeframe) {
      // Price alert only needs current price
      return { price, rsi: null, macd: null, volumeRatio: null, candles: [] };
    }

    // Calculate indicators
    const indicatorResponse = await fetch(`${supabaseUrl}/functions/v1/calculate-indicators`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ candles }),
    });

    if (!indicatorResponse.ok) {
      console.error('Failed to calculate indicators');
      return { price, rsi: null, macd: null, volumeRatio: null, candles };
    }

    const indicators = await indicatorResponse.json();

    let previous: MarketData | undefined;
    if (candles.length > 35) {
      const previousIndicatorResponse = await fetch(`${supabaseUrl}/functions/v1/calculate-indicators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ candles: candles.slice(0, -1) }),
      });
      if (previousIndicatorResponse.ok) {
        const previousIndicators = await previousIndicatorResponse.json();
        previous = {
          price: previousIndicators.currentPrice || candles[candles.length - 2]?.close || price,
          rsi: previousIndicators.rsi,
          macd: previousIndicators.macd,
          volumeRatio: previousIndicators.volumeRatio,
          candles: candles.slice(0, -1),
        };
      }
    }

    return {
      price: indicators.currentPrice || price,
      rsi: indicators.rsi,
      macd: indicators.macd,
      volumeRatio: indicators.volumeRatio,
      candles,
      previous,
    };
  } catch (error) {
    console.error('Error fetching market data:', error);
    return null;
  }
}

async function sendTelegramAlert(
  supabaseUrl: string,
  chatId: string,
  alertData: any,
  retries = 3
): Promise<boolean> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[Telegram] Attempt ${attempt}/${retries} - Sending to chat ${chatId} for ${alertData.symbol}`);
      const response = await fetch(`${supabaseUrl}/functions/v1/send-telegram`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ chatId, alert: alertData }),
      });

      const responseText = await response.text();
      console.log(`[Telegram] Response (attempt ${attempt}): status=${response.status}, body=${responseText}`);

      if (response.ok) {
        let result;
        try { result = JSON.parse(responseText); } catch { result = {}; }
        if (result.success) {
          console.log(`[Telegram] ✅ Message sent successfully to ${chatId}`);
          return true;
        }
        console.error(`[Telegram] ⚠️ Response OK but success=false: ${responseText}`);
      } else {
        console.error(`[Telegram] ❌ HTTP ${response.status}: ${responseText}`);
      }

      // Wait before retry (exponential backoff)
      if (attempt < retries) {
        const delay = attempt * 1000;
        console.log(`[Telegram] Retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
      }
    } catch (error) {
      console.error(`[Telegram] ❌ Attempt ${attempt} error:`, error);
      if (attempt < retries) {
        const delay = attempt * 1000;
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  console.error(`[Telegram] ❌ All ${retries} attempts failed for chat ${chatId}`);
  return false;
}

function isAuthorizedInternal(req: Request): boolean {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  return token === SUPABASE_SERVICE_ROLE_KEY;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow calls with service role key (from scheduler or internal)
  if (!isAuthorizedInternal(req)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Parse optional body to support backfill mode
  let isBackfill = false;
  let backfillFromIso: string | null = null;
  try {
    const body = await req.clone().json().catch(() => null);
    if (body && body.retroactive === true) {
      isBackfill = true;
      backfillFromIso = body.from || null;
      console.log(`[process-alerts] Backfill mode active. From: ${backfillFromIso}`);
    }
  } catch {
    // no body, normal run
  }

  try {
    console.log(`Starting alert processing... (retroactive=${isBackfill})`);

    // Get all active, non-paused alerts
    const { data: alerts, error: alertsError } = await supabase
      .from('alerts')
      .select('*')
      .eq('active', true)
      .eq('paused', false)
      .order('priority', { ascending: false });

    if (alertsError) {
      throw new Error(`Failed to fetch alerts: ${alertsError.message}`);
    }

    console.log(`Processing ${alerts?.length || 0} active alerts`);

    const triggeredAlerts: any[] = [];
    const now = new Date();

    // Group alerts by symbol/exchange/timeframe for efficiency
    const groupedAlerts = new Map<string, Alert[]>();
    
    for (const alert of (alerts || [])) {
      // Check cooldown
      if (alert.cooldown_until && new Date(alert.cooldown_until) > now) {
        console.log(`Alert ${alert.id} is in cooldown until ${alert.cooldown_until}`);
        continue;
      }

      const key = `${alert.symbol}-${alert.exchange}-${alert.timeframe || 'spot'}`;
      if (!groupedAlerts.has(key)) {
        groupedAlerts.set(key, []);
      }
      groupedAlerts.get(key)!.push(alert);
    }

    // Process each group
    for (const [key, groupAlerts] of groupedAlerts) {
      const [symbol, exchange, timeframe] = key.split('-');
      const tf = timeframe === 'spot' ? null : timeframe;

      if (tf && isForexOrMarketHoursLimited(symbol, exchange) && isWeekendInSaoPaulo()) {
        console.log(`Weekend market guard active for ${key}; using last closed candles only.`);
      }

      console.log(`Fetching data for ${key}...`);
      const marketData = await fetchMarketData(SUPABASE_URL, symbol, exchange, tf);

      if (!marketData) {
        console.error(`Failed to get market data for ${key}`);
        continue;
      }

      console.log(`Data for ${symbol}: price=${marketData.price}, rsi=${marketData.rsi}, macd=${marketData.macd?.line}`);
      const previousIndicatorData = marketData.previous || previousIndicatorCache.get(key);

      // Get previous price from DB cache (survives cold starts)
      const priceKey = `${symbol}-${exchange}`;
      const { data: cachedPrice } = await supabase
        .from('price_cache')
        .select('last_price')
        .eq('symbol_exchange', priceKey)
        .single();
      const previousPrice = cachedPrice?.last_price ?? null;
      
      for (const alert of groupAlerts) {
        const result = checkAlertCondition(alert, marketData, previousPrice, previousIndicatorData);

        if (result.triggered) {
          console.log(`Alert ${alert.id} triggered!`);

          // Get user profile for Telegram ID
          const { data: profile } = await supabase
            .from('profiles')
            .select('telegram_id, quiet_hours_start, quiet_hours_end, timezone')
            .eq('user_id', alert.user_id)
            .single();

          // Check quiet hours (only affects Telegram, NOT history)
          let isQuietHours = false;
          if (profile?.quiet_hours_start && profile?.quiet_hours_end) {
            const tz = profile.timezone || 'America/Sao_Paulo';
            const nowInTz = new Date().toLocaleTimeString('en-US', { 
              timeZone: tz, 
              hour12: false,
              hour: '2-digit',
              minute: '2-digit'
            });
            
            const quietStart = profile.quiet_hours_start;
            const quietEnd = profile.quiet_hours_end;
            
            // Handle overnight ranges (e.g. 22:00-07:00) vs same-day (e.g. 01:00-06:00)
            isQuietHours = quietStart <= quietEnd
              ? (nowInTz >= quietStart && nowInTz <= quietEnd)
              : (nowInTz >= quietStart || nowInTz <= quietEnd);
            
            if (isQuietHours) {
              console.log(`Alert ${alert.id} in quiet hours — will record history but skip Telegram`);
            }
          }

          // Record in history (ALWAYS, even during quiet hours). Mark retroactive when in backfill.
          const historyRecord = {
            alert_id: alert.id,
            user_id: alert.user_id,
            symbol: alert.symbol,
            exchange: alert.exchange,
            type: alert.type,
            timeframe: alert.timeframe,
            event_time_utc: now.toISOString(),
            detected_time_utc: now.toISOString(),
            retroactive: isBackfill,
            price_at_event: marketData.price,
            rsi_at_event: marketData.rsi,
            macd_line_at_event: marketData.macd?.line,
            macd_signal_at_event: marketData.macd?.signal,
            macd_hist_at_event: marketData.macd?.histogram,
            direction_guess: result.direction,
            prob_up: result.probUp,
            prob_down: result.probDown,
            confidence_level: result.confidence,
            comment_ai: isBackfill
              ? `[♻️ Detectado retroativamente após downtime${backfillFromIso ? ` desde ${backfillFromIso}` : ''}] ${result.comment || ''}`
              : isQuietHours
                ? `[🔇 Notificação suprimida por horário de silêncio] ${result.comment || ''}`
                : result.comment,
            model_version: isBackfill ? 'v1.0-rules-backfill' : 'v1.0-rules',
          };

          // Use upsert with onConflict to make backfill idempotent against unique(alert_id, detected_time_utc)
          const { error: historyError } = await supabase
            .from('alerts_history')
            .upsert(historyRecord, { onConflict: 'alert_id,detected_time_utc', ignoreDuplicates: true });

          if (historyError) {
            // P2 fix: if history insert fails, do NOT consume/deactivate the alert
            console.error(`Failed to save history for alert ${alert.id}: ${historyError.message}. Alert will NOT be consumed.`);
            continue;
          }

          // Send Telegram notification (only if NOT in quiet hours AND NOT a retroactive backfill)
          if (!isQuietHours && !isBackfill && profile?.telegram_id) {
            console.log(`[Alert ${alert.id}] Sending Telegram notification to ${profile.telegram_id}`);
            const alertData = {
              symbol: alert.symbol,
              type: alert.type,
              timeframe: alert.timeframe,
              price: marketData.price,
              rsi: marketData.rsi,
              macd: marketData.macd,
              volumeRatio: marketData.volumeRatio,
              direction: result.direction,
              confidence: result.confidence,
              probUp: result.probUp,
              probDown: result.probDown,
            };

            const telegramSent = await sendTelegramAlert(SUPABASE_URL, profile.telegram_id, alertData);
            console.log(`[Alert ${alert.id}] Telegram result: ${telegramSent ? 'SUCCESS' : 'FAILED'}`);
          } else if (isQuietHours) {
            console.log(`[Alert ${alert.id}] Telegram skipped (quiet hours)`);
          } else {
            console.log(`[Alert ${alert.id}] No telegram_id configured for user ${alert.user_id}`);
          }

          // Update alert based on mode
          if (alert.mode === 'once') {
            await supabase
              .from('alerts')
              .update({ active: false })
              .eq('id', alert.id);
          } else {
            // Set cooldown (1 candle period)
            const cooldownMs = getCooldownMs(alert.timeframe);
            const cooldownUntil = new Date(now.getTime() + cooldownMs);
            
            await supabase
              .from('alerts')
              .update({ 
                last_trigger_candle_open_time: now.toISOString(),
                cooldown_until: cooldownUntil.toISOString()
              })
              .eq('id', alert.id);
          }

          triggeredAlerts.push({
            alertId: alert.id,
            symbol: alert.symbol,
            type: alert.type,
            ...result,
          });
        }
      }
      
      // Persist current price in DB for cross detection (survives cold starts)
      await supabase
        .from('price_cache')
        .upsert({ symbol_exchange: priceKey, last_price: marketData.price, updated_at: new Date().toISOString() });
      previousIndicatorCache.set(key, marketData);
    }

    console.log(`Processing complete. ${triggeredAlerts.length} alerts triggered.`);

    return new Response(
      JSON.stringify({
        success: true,
        processedAlerts: alerts?.length || 0,
        triggeredAlerts: triggeredAlerts.length,
        triggers: triggeredAlerts,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing alerts:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getCooldownMs(timeframe: string | null): number {
  if (!timeframe) return 60 * 1000; // 1 minute for price alerts
  
  const map: Record<string, number> = {
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1m': 30 * 24 * 60 * 60 * 1000,
  };
  
  return map[timeframe] || 60 * 1000;
}
