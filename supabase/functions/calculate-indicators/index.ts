import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number;
}

interface IndicatorResult {
  rsi: number | null;
  macd: {
    line: number;
    signal: number;
    histogram: number;
  } | null;
  volumeRatio: number | null;
  avgVolume: number | null;
}

// Calculate RSI (Relative Strength Index) - TradingView compatible
function calculateRSI(closes: number[], period: number = 14): number | null {
  if (closes.length < period + 1) {
    return null;
  }

  // Calculate price changes
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // First average gain/loss (simple average for first period)
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) {
      avgGain += changes[i];
    } else {
      avgLoss += Math.abs(changes[i]);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  // Apply Wilder's smoothing for remaining values
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    if (change >= 0) {
      avgGain = (avgGain * (period - 1) + change) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(change)) / period;
    }
  }

  if (avgLoss === 0) {
    return 100;
  }

  const rs = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return Math.round(rsi * 100) / 100;
}

// Calculate EMA (Exponential Moving Average)
function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);

  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
  }
  ema.push(sum / Math.min(period, data.length));

  // Calculate subsequent EMAs
  for (let i = period; i < data.length; i++) {
    const value = (data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(value);
  }

  return ema;
}

// Calculate MACD - TradingView compatible (12, 26, 9)
function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { line: number; signal: number; histogram: number } | null {
  if (closes.length < slowPeriod + signalPeriod) {
    return null;
  }

  const emaFast = calculateEMA(closes, fastPeriod);
  const emaSlow = calculateEMA(closes, slowPeriod);

  // MACD line = Fast EMA - Slow EMA
  const macdLine: number[] = [];
  const offset = slowPeriod - fastPeriod;

  for (let i = 0; i < emaSlow.length; i++) {
    macdLine.push(emaFast[i + offset] - emaSlow[i]);
  }

  // Signal line = 9-period EMA of MACD line
  const signalLine = calculateEMA(macdLine, signalPeriod);

  const currentMacd = macdLine[macdLine.length - 1];
  const currentSignal = signalLine[signalLine.length - 1];
  const histogram = currentMacd - currentSignal;

  return {
    line: Math.round(currentMacd * 100000000) / 100000000,
    signal: Math.round(currentSignal * 100000000) / 100000000,
    histogram: Math.round(histogram * 100000000) / 100000000,
  };
}

// Calculate volume ratio and average
function calculateVolumeMetrics(
  volumes: number[],
  period: number = 20
): { ratio: number; average: number } | null {
  if (volumes.length < period + 1) {
    return null;
  }

  // Calculate average of previous candles (excluding current)
  const previousVolumes = volumes.slice(-period - 1, -1);
  const avgVolume = previousVolumes.reduce((a, b) => a + b, 0) / previousVolumes.length;

  if (avgVolume === 0) {
    return null;
  }

  const currentVolume = volumes[volumes.length - 1];
  const ratio = (currentVolume / avgVolume) * 100;

  return {
    ratio: Math.round(ratio * 100) / 100,
    average: avgVolume,
  };
}

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function isAuthorizedInternal(req: Request): boolean {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  return token === SUPABASE_SERVICE_ROLE_KEY;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Only allow internal calls with service role key
  if (!isAuthorizedInternal(req)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { candles, indicators = ['rsi', 'macd', 'volume'] } = await req.json();

    if (!candles || !Array.isArray(candles) || candles.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Candles array is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const closes = candles.map((c: Candle) => c.close);
    const volumes = candles.map((c: Candle) => c.volume);

    const result: IndicatorResult = {
      rsi: null,
      macd: null,
      volumeRatio: null,
      avgVolume: null,
    };

    if (indicators.includes('rsi')) {
      result.rsi = calculateRSI(closes);
    }

    if (indicators.includes('macd')) {
      result.macd = calculateMACD(closes);
    }

    if (indicators.includes('volume')) {
      const volumeMetrics = calculateVolumeMetrics(volumes);
      if (volumeMetrics) {
        result.volumeRatio = volumeMetrics.ratio;
        result.avgVolume = volumeMetrics.average;
      }
    }

    console.log('Calculated indicators:', {
      rsi: result.rsi,
      macd: result.macd ? `${result.macd.line}/${result.macd.signal}` : null,
      volumeRatio: result.volumeRatio,
    });

    return new Response(
      JSON.stringify({
        success: true,
        currentPrice: closes[closes.length - 1],
        currentVolume: volumes[volumes.length - 1],
        ...result,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating indicators:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
