import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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

// Forex symbol mappings for Yahoo Finance
const forexSymbolMap: Record<string, string> = {
  'XAUUSD': 'GC=F',      // Gold futures
  'XAGUSD': 'SI=F',      // Silver futures
  'WTIUSD': 'CL=F',      // WTI Crude Oil
  'BRENTUSD': 'BZ=F',    // Brent Crude
  'EURUSD': 'EURUSD=X',
  'GBPUSD': 'GBPUSD=X',
  'USDJPY': 'USDJPY=X',
  'USDCHF': 'USDCHF=X',
  'AUDUSD': 'AUDUSD=X',
  'USDCAD': 'USDCAD=X',
  'NZDUSD': 'NZDUSD=X',
  'EURGBP': 'EURGBP=X',
  'EURJPY': 'EURJPY=X',
  'GBPJPY': 'GBPJPY=X',
  // BRL pairs (Real Brasileiro)
  'USDBRL': 'USDBRL=X',
  'EURBRL': 'EURBRL=X',
  'GBPBRL': 'GBPBRL=X',
  'JPYBRL': 'JPYBRL=X',
  'ARSBRL': 'ARSBRL=X',
  'SPX500': '^GSPC',     // S&P 500
  'NAS100': '^NDX',      // Nasdaq 100
  'DJI30': '^DJI',       // Dow Jones
  'IBOV': '^BVSP',       // Ibovespa
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

// Fetch forex/commodity price using Yahoo Finance with multi-endpoint fallback
async function fetchForexPrice(symbol: string): Promise<number> {
  const yahooSymbol = forexSymbolMap[symbol.toUpperCase()];
  
  if (!yahooSymbol) {
    throw new Error(`Unknown forex symbol: ${symbol}`);
  }
  
  console.log(`Fetching forex price for ${symbol} (Yahoo: ${yahooSymbol})`);
  
  const encodedSymbol = encodeURIComponent(yahooSymbol);
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  const endpoints = [
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?interval=1d&range=2d`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?interval=1d&range=2d`,
    `https://query2.finance.yahoo.com/v6/finance/quote?symbols=${encodedSymbol}`,
  ];

  let lastError: Error | null = null;

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': userAgent },
      });

      if (!response.ok) {
        await response.text();
        lastError = new Error(`Yahoo API ${response.status} for ${url}`);
        continue;
      }

      const data = await response.json();

      // v8 chart response
      if (data.chart?.result?.[0]?.meta?.regularMarketPrice) {
        return data.chart.result[0].meta.regularMarketPrice;
      }

      // v6 quote response
      if (data.quoteResponse?.result?.[0]?.regularMarketPrice) {
        return data.quoteResponse.result[0].regularMarketPrice;
      }

      lastError = new Error(`No valid price in response for ${symbol}`);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError || new Error(`All Yahoo Finance endpoints failed for ${symbol}`);
}

// Fetch forex candles using Yahoo Finance
async function fetchForexKlines(
  symbol: string,
  interval: string,
  limit: number = 100
): Promise<Candle[]> {
  const yahooSymbol = forexSymbolMap[symbol.toUpperCase()];
  
  if (!yahooSymbol) {
    throw new Error(`Unknown forex symbol: ${symbol}`);
  }
  
  // Map our intervals to Yahoo intervals
  const yahooIntervalMap: Record<string, { interval: string; range: string }> = {
    '4h': { interval: '1h', range: '60d' },    // Yahoo doesn't have 4h, use 1h
    '1d': { interval: '1d', range: '1y' },
    '1w': { interval: '1wk', range: '5y' },
    '1M': { interval: '1mo', range: '10y' },
  };
  
  const yahooParams = yahooIntervalMap[interval] || { interval: '1d', range: '1y' };
  
  console.log(`Fetching forex klines for ${symbol} (Yahoo: ${yahooSymbol})`);
  
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  const endpoints = [
    `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${yahooParams.interval}&range=${yahooParams.range}`,
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${yahooParams.interval}&range=${yahooParams.range}`,
  ];

  let result: any = null;
  let lastError: Error | null = null;

  for (const url of endpoints) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': userAgent },
      });

      if (!response.ok) {
        await response.text();
        lastError = new Error(`Yahoo API ${response.status}`);
        continue;
      }

      const data = await response.json();
      result = data.chart?.result?.[0];
      if (result) break;

      lastError = new Error(`No chart data for ${symbol}`);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  
  if (!result) {
    throw lastError || new Error(`All Yahoo Finance endpoints failed for ${symbol}`);
  }
  
  const timestamps = result.timestamp || [];
  const quotes = result.indicators?.quote?.[0] || {};
  
  const candles: Candle[] = [];
  
  for (let i = 0; i < timestamps.length && candles.length < limit; i++) {
    if (quotes.open?.[i] != null && quotes.close?.[i] != null) {
      candles.push({
        openTime: timestamps[i] * 1000,
        open: quotes.open[i],
        high: quotes.high[i] || quotes.open[i],
        low: quotes.low[i] || quotes.open[i],
        close: quotes.close[i],
        volume: quotes.volume?.[i] || 0,
        closeTime: (timestamps[i + 1] || timestamps[i]) * 1000,
      });
    }
  }
  
  // For 4h timeframe, aggregate 1h candles
  if (interval === '4h' && candles.length > 0) {
    const aggregated: Candle[] = [];
    for (let i = 0; i < candles.length; i += 4) {
      const chunk = candles.slice(i, i + 4);
      if (chunk.length > 0) {
        aggregated.push({
          openTime: chunk[0].openTime,
          open: chunk[0].open,
          high: Math.max(...chunk.map(c => c.high)),
          low: Math.min(...chunk.map(c => c.low)),
          close: chunk[chunk.length - 1].close,
          volume: chunk.reduce((sum, c) => sum + c.volume, 0),
          closeTime: chunk[chunk.length - 1].closeTime,
        });
      }
    }
    return aggregated.slice(-limit);
  }
  
  return candles.slice(-limit);
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

// Futures support
function isFuturesSymbol(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  return upper.endsWith('PERP') || upper.includes('1!');
}

function normalizeFuturesSymbol(symbol: string): string {
  let s = symbol.toUpperCase();
  if (s.includes('1!')) s = s.replace('1!', 'USDT');
  if (s.endsWith('PERP')) s = s.replace('PERP', '');
  if (!s.endsWith('USDT')) s = s + 'USDT';
  return s;
}

async function fetchFuturesKlines(symbol: string, interval: string, limit: number = 100): Promise<Candle[]> {
  const normalized = normalizeFuturesSymbol(symbol);
  const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${normalized}&interval=${interval}&limit=${limit}`;
  console.log(`Fetching Binance Futures klines: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Binance Futures API error: ${response.status}`);
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

async function fetchCurrentPrice(symbol: string, exchange: string): Promise<number> {
  // Futures
  if (isFuturesSymbol(symbol)) {
    const normalized = normalizeFuturesSymbol(symbol);
    const url = `https://fapi.binance.com/fapi/v1/ticker/price?symbol=${normalized}`;
    const response = await fetch(url);
    const data = await response.json();
    return parseFloat(data.price);
  }

  // Forex/commodity
  if (exchange === 'forex' || forexSymbolMap[symbol.toUpperCase()]) {
    return await fetchForexPrice(symbol);
  }
  
  if (exchange === 'bybit') {
    const url = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol.toUpperCase()}`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.retCode === 0 && data.result.list.length > 0) {
      return parseFloat(data.result.list[0].lastPrice);
    }
    throw new Error(`Failed to fetch Bybit price for ${symbol}`);
  }
  
  // Default to Binance spot
  const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`;
  const response = await fetch(url);
  const data = await response.json();
  return parseFloat(data.price);
}

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

function isAuthorizedInternal(req: Request): boolean {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  return token === SUPABASE_SERVICE_ROLE_KEY;
}

serve(async (req) => {
  // Handle CORS preflight
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
    const { symbol, exchange = 'binance', timeframe, limit = 100 } = await req.json();

    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Fetching market data for ${symbol} on ${exchange}, timeframe: ${timeframe}`);

    // Check symbol type
    const isForexSym = exchange === 'forex' || forexSymbolMap[symbol.toUpperCase()];
    const isFutures = isFuturesSymbol(symbol);

    // If no timeframe, just fetch current price
    if (!timeframe) {
      const price = await fetchCurrentPrice(symbol, exchange);
      return new Response(
        JSON.stringify({ price, symbol, exchange: isFutures ? 'futures' : isForexSym ? 'forex' : exchange }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const interval = timeframeMap[timeframe] || timeframe;
    let candles: Candle[];

    if (isFutures) {
      candles = await fetchFuturesKlines(symbol, interval, limit);
    } else if (isForexSym) {
      candles = await fetchForexKlines(symbol, interval, limit);
    } else if (exchange === 'bybit') {
      candles = await fetchBybitKlines(symbol, interval, limit);
    } else {
      candles = await fetchBinanceKlines(symbol, interval, limit);
    }

    const currentPrice = candles.length > 0 ? candles[candles.length - 1].close : 0;

    return new Response(
      JSON.stringify({
        symbol,
        exchange: isFutures ? 'futures' : isForexSym ? 'forex' : exchange,
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
