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

// Map our timeframes to Binance intervals
const timeframeMap: Record<string, string> = {
  '4h': '4h',
  '1d': '1d',
  '1w': '1w',
  '1m': '1M', // Binance uses uppercase M for months
};

async function fetchBinanceKlines(
  symbol: string,
  interval: string,
  limit: number = 100
): Promise<Candle[]> {
  const url = `https://api.binance.com/api/v3/klines?symbol=${symbol.toUpperCase()}&interval=${interval}&limit=${limit}`;
  
  console.log(`Fetching Binance klines: ${url}`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Binance API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  return data.map((k: any[]) => ({
    openTime: k[0],
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    closeTime: k[6],
  }));
}

async function fetchBybitKlines(
  symbol: string,
  interval: string,
  limit: number = 100
): Promise<Candle[]> {
  // Bybit interval mapping
  const bybitIntervalMap: Record<string, string> = {
    '4h': '240',
    '1d': 'D',
    '1w': 'W',
    '1M': 'M',
  };
  
  const bybitInterval = bybitIntervalMap[interval] || interval;
  const url = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol.toUpperCase()}&interval=${bybitInterval}&limit=${limit}`;
  
  console.log(`Fetching Bybit klines: ${url}`);
  
  const response = await fetch(url);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Bybit API error: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  if (data.retCode !== 0) {
    throw new Error(`Bybit API error: ${data.retMsg}`);
  }
  
  // Bybit returns data in reverse order (newest first)
  return data.result.list.reverse().map((k: any[]) => ({
    openTime: parseInt(k[0]),
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5]),
    closeTime: parseInt(k[0]) + getIntervalMs(interval),
  }));
}

function getIntervalMs(interval: string): number {
  const map: Record<string, number> = {
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
    '1M': 30 * 24 * 60 * 60 * 1000,
  };
  return map[interval] || 0;
}

async function fetchCurrentPrice(symbol: string, exchange: string): Promise<number> {
  if (exchange === 'bybit') {
    const url = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol.toUpperCase()}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.retCode === 0 && data.result.list.length > 0) {
      return parseFloat(data.result.list[0].lastPrice);
    }
    throw new Error(`Failed to fetch Bybit price for ${symbol}`);
  }
  
  // Default to Binance
  const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`;
  const response = await fetch(url);
  const data = await response.json();
  return parseFloat(data.price);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { symbol, exchange = 'binance', timeframe, limit = 100 } = await req.json();

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching market data for ${symbol} on ${exchange}, timeframe: ${timeframe}`);

    // If no timeframe, just fetch current price
    if (!timeframe) {
      const price = await fetchCurrentPrice(symbol, exchange);
      return new Response(
        JSON.stringify({ price, symbol, exchange }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const interval = timeframeMap[timeframe] || timeframe;
    let candles: Candle[];

    if (exchange === 'bybit') {
      candles = await fetchBybitKlines(symbol, interval, limit);
    } else {
      candles = await fetchBinanceKlines(symbol, interval, limit);
    }

    const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;

    return new Response(
      JSON.stringify({
        symbol,
        exchange,
        timeframe,
        price: currentPrice,
        candles,
        candleCount: candles.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching market data:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
