import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');

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
}

interface MarketData {
  price: number;
  rsi: number | null;
  macd: { line: number; signal: number; histogram: number } | null;
  volumeRatio: number | null;
  candles: any[];
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
      // Oversold - likely to go up
      probUp = 0.65 + (30 - data.rsi) * 0.01;
      comment = `RSI em zona de sobrevenda (${data.rsi.toFixed(1)}). Possível reversão de alta.`;
    } else if (data.rsi >= 70) {
      // Overbought - likely to go down
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
      // Zero cross
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
    // High volume usually confirms the current trend
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
    }
  }

  // Clamp probabilities
  probUp = Math.max(0.1, Math.min(0.9, probUp));
  const probDown = 1 - probUp;

  // Determine confidence based on probability difference
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

// Check if alert should trigger
function checkAlertCondition(
  alert: Alert,
  data: MarketData,
  previousData?: MarketData
): TriggerResult {
  const { type, params, mode } = alert;

  switch (type) {
    case 'price_level': {
      const target = params.target_price!;
      const direction = params.price_direction!;
      const price = data.price;

      if (direction === 'above' && price >= target) {
        if (mode === 'crossing' && previousData && previousData.price >= target) {
          return { triggered: false };
        }
        const prediction = predictDirection(type, data, params);
        return { triggered: true, ...prediction };
      }
      if (direction === 'below' && price <= target) {
        if (mode === 'crossing' && previousData && previousData.price <= target) {
          return { triggered: false };
        }
        const prediction = predictDirection(type, data, params);
        return { triggered: true, ...prediction };
      }
      if (direction === 'cross') {
        if (previousData) {
          if ((previousData.price < target && price >= target) || 
              (previousData.price > target && price <= target)) {
            const prediction = predictDirection(type, data, params);
            return { triggered: true, ...prediction };
          }
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
        // Touch mode
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
          // Check for crossover
          const prevHist = previousData.macd.histogram;
          const currHist = data.macd.histogram;
          if ((prevHist < 0 && currHist >= 0) || (prevHist > 0 && currHist <= 0)) {
            const prediction = predictDirection(type, data, params);
            return { triggered: true, ...prediction };
          }
        }
      } else {
        // Zero cross
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, exchange, timeframe, limit: 100 }),
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candles }),
    });

    if (!indicatorResponse.ok) {
      console.error('Failed to calculate indicators');
      return { price, rsi: null, macd: null, volumeRatio: null, candles };
    }

    const indicators = await indicatorResponse.json();

    return {
      price: indicators.currentPrice || price,
      rsi: indicators.rsi,
      macd: indicators.macd,
      volumeRatio: indicators.volumeRatio,
      candles,
    };
  } catch (error) {
    console.error('Error fetching market data:', error);
    return null;
  }
}

async function sendTelegramAlert(
  supabaseUrl: string,
  chatId: string,
  alertData: any
): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-telegram`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, alert: alertData }),
    });

    return response.ok;
  } catch (error) {
    console.error('Error sending Telegram alert:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    console.log('Starting alert processing...');

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

      console.log(`Fetching data for ${key}...`);
      const marketData = await fetchMarketData(SUPABASE_URL, symbol, exchange, tf);

      if (!marketData) {
        console.error(`Failed to get market data for ${key}`);
        continue;
      }

      console.log(`Data for ${symbol}: price=${marketData.price}, rsi=${marketData.rsi}, macd=${marketData.macd?.line}`);

      for (const alert of groupAlerts) {
        const result = checkAlertCondition(alert, marketData);

        if (result.triggered) {
          console.log(`Alert ${alert.id} triggered!`);

          // Get user profile for Telegram ID
          const { data: profile } = await supabase
            .from('profiles')
            .select('telegram_id, quiet_hours_start, quiet_hours_end, timezone')
            .eq('user_id', alert.user_id)
            .single();

          // Check quiet hours
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
            
            if (nowInTz >= quietStart || nowInTz <= quietEnd) {
              console.log(`Alert ${alert.id} skipped due to quiet hours`);
              continue;
            }
          }

          // Record in history
          const historyRecord = {
            alert_id: alert.id,
            user_id: alert.user_id,
            symbol: alert.symbol,
            exchange: alert.exchange,
            type: alert.type,
            timeframe: alert.timeframe,
            event_time_utc: now.toISOString(),
            detected_time_utc: now.toISOString(),
            retroactive: false,
            price_at_event: marketData.price,
            rsi_at_event: marketData.rsi,
            macd_line_at_event: marketData.macd?.line,
            macd_signal_at_event: marketData.macd?.signal,
            macd_hist_at_event: marketData.macd?.histogram,
            direction_guess: result.direction,
            prob_up: result.probUp,
            prob_down: result.probDown,
            confidence_level: result.confidence,
            comment_ai: result.comment,
            model_version: 'v1.0-rules',
          };

          const { error: historyError } = await supabase
            .from('alerts_history')
            .insert(historyRecord);

          if (historyError) {
            console.error(`Failed to save history: ${historyError.message}`);
          }

          // Send Telegram notification
          if (profile?.telegram_id) {
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

            await sendTelegramAlert(SUPABASE_URL, profile.telegram_id, alertData);
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
