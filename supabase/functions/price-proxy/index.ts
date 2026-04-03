import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Forex symbol mappings for Yahoo Finance
const forexSymbolMap: Record<string, string> = {
  'XAUUSD': 'GC=F',
  'XAGUSD': 'SI=F',
  'WTIUSD': 'CL=F',
  'BRENTUSD': 'BZ=F',
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
  'SPX500': '^GSPC',
  'NAS100': '^NDX',
  'DJI30': '^DJI',
};

function isForexSymbol(symbol: string): boolean {
  return !!forexSymbolMap[symbol.toUpperCase()];
}

// Check if symbol is a futures perpetual (ends with PERP or has "1!" suffix)
function isFuturesSymbol(symbol: string): boolean {
  const upper = symbol.toUpperCase();
  return upper.endsWith('PERP') || upper.includes('1!');
}

// Normalize futures symbol to Binance perpetual format
function normalizeFuturesSymbol(symbol: string): string {
  let s = symbol.toUpperCase();
  if (s.includes('1!')) {
    // e.g. BTC1! -> BTCUSDT
    s = s.replace('1!', 'USDT');
  }
  if (s.endsWith('PERP')) {
    s = s.replace('PERP', '');
  }
  if (!s.endsWith('USDT')) {
    s = s + 'USDT';
  }
  return s;
}

async function fetchFuturesTicker(symbol: string): Promise<any> {
  const normalized = normalizeFuturesSymbol(symbol);
  const response = await fetch(
    `https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${normalized}`
  );
  if (!response.ok) {
    throw new Error(`Binance Futures API error: ${response.status}`);
  }
  const data = await response.json();
  return {
    symbol: symbol.toUpperCase(),
    lastPrice: data.lastPrice,
    priceChangePercent: data.priceChangePercent,
    highPrice: data.highPrice,
    lowPrice: data.lowPrice,
    openPrice: data.openPrice,
    volume: data.volume,
  };
}

async function fetchYahooTicker(symbol: string): Promise<any> {
  const yahooSymbol = forexSymbolMap[symbol.toUpperCase()];
  if (!yahooSymbol) throw new Error(`Unknown forex symbol: ${symbol}`);

  const encodedSymbol = encodeURIComponent(yahooSymbol);
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

  // Try multiple Yahoo Finance endpoints as fallbacks
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
        await response.text(); // consume body
        lastError = new Error(`Yahoo API ${response.status} for ${url}`);
        continue;
      }

      const data = await response.json();

      // v8 chart response
      if (data.chart?.result?.[0]) {
        const result = data.chart.result[0];
        const meta = result.meta;
        if (!meta?.regularMarketPrice) continue;

        const prevClose = meta.chartPreviousClose || meta.previousClose || meta.regularMarketPrice;
        const lastPrice = meta.regularMarketPrice;
        const priceChange = lastPrice - prevClose;
        const priceChangePercent = prevClose ? ((priceChange / prevClose) * 100) : 0;

        return {
          symbol: symbol.toUpperCase(),
          lastPrice: String(lastPrice),
          priceChange: String(priceChange.toFixed(5)),
          priceChangePercent: String(priceChangePercent.toFixed(3)),
          highPrice: String(meta.regularMarketDayHigh || lastPrice),
          lowPrice: String(meta.regularMarketDayLow || lastPrice),
          openPrice: String(prevClose),
          volume: String(meta.regularMarketVolume || 0),
        };
      }

      // v6 quote response
      if (data.quoteResponse?.result?.[0]) {
        const quote = data.quoteResponse.result[0];
        const lastPrice = quote.regularMarketPrice;
        const prevClose = quote.regularMarketPreviousClose || lastPrice;
        const priceChange = lastPrice - prevClose;
        const priceChangePercent = prevClose ? ((priceChange / prevClose) * 100) : 0;

        return {
          symbol: symbol.toUpperCase(),
          lastPrice: String(lastPrice),
          priceChange: String(priceChange.toFixed(5)),
          priceChangePercent: String(priceChangePercent.toFixed(3)),
          highPrice: String(quote.regularMarketDayHigh || lastPrice),
          lowPrice: String(quote.regularMarketDayLow || lastPrice),
          openPrice: String(prevClose),
          volume: String(quote.regularMarketVolume || 0),
        };
      }

      lastError = new Error(`No valid data in response for ${symbol}`);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastError || new Error(`All Yahoo Finance endpoints failed for ${symbol}`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

  let authorized = false;

  if (token === SUPABASE_SERVICE_ROLE_KEY) {
    authorized = true;
  } else if (authHeader.startsWith('Bearer ')) {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        authorized = true;
      }
    } catch {
      // invalid token
    }
  }

  if (!authorized) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { action, symbol, symbols, exchange } = await req.json();

    if (action === 'ticker' && symbol) {
      // Futures symbols
      if (isFuturesSymbol(symbol)) {
        const data = await fetchFuturesTicker(symbol);
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if forex/commodity symbol
      if (isForexSymbol(symbol)) {
        const data = await fetchYahooTicker(symbol);
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Bybit exchange
      if (exchange === 'bybit') {
        const response = await fetch(
          `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol.toUpperCase()}`
        );
        if (!response.ok) {
          const errorText = await response.text();
          return new Response(
            JSON.stringify({ error: `Bybit API error: ${response.status}`, details: errorText }),
            { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const data = await response.json();
        if (data.retCode !== 0 || !data.result?.list?.length) {
          return new Response(
            JSON.stringify({ error: `No Bybit data for ${symbol}` }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const ticker = data.result.list[0];
        return new Response(JSON.stringify({
          symbol: ticker.symbol,
          lastPrice: ticker.lastPrice,
          priceChangePercent: ticker.price24hPcnt ? (parseFloat(ticker.price24hPcnt) * 100).toFixed(3) : '0',
          highPrice: ticker.highPrice24h,
          lowPrice: ticker.lowPrice24h,
          volume: ticker.volume24h,
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Default: Binance
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}`
      );

      if (!response.ok) {
        const errorText = await response.text();
        return new Response(
          JSON.stringify({ error: `Binance API error: ${response.status}`, details: errorText }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'tickers' && symbols && Array.isArray(symbols)) {
      // Separate futures, forex, bybit, and binance symbols
      const futuresSyms = symbols.filter((s: any) => {
        const sym = typeof s === 'string' ? s : s.symbol;
        return isFuturesSymbol(sym);
      });
      const forexSyms = symbols.filter((s: any) => {
        const sym = typeof s === 'string' ? s : s.symbol;
        return !isFuturesSymbol(sym) && isForexSymbol(sym);
      });
      const bybitSyms = symbols.filter((s: any) => {
        const sym = typeof s === 'string' ? s : s.symbol;
        if (isFuturesSymbol(sym) || isForexSymbol(sym)) return false;
        if (typeof s === 'object' && s.exchange === 'bybit') return true;
        return false;
      });
      const binanceSyms = symbols.filter((s: any) => {
        const sym = typeof s === 'string' ? s : s.symbol;
        if (isFuturesSymbol(sym) || isForexSymbol(sym)) return false;
        if (typeof s === 'object' && s.exchange === 'bybit') return false;
        return true;
      });

      const results: any[] = [];

      // Fetch futures symbols in parallel
      if (futuresSyms.length > 0) {
        const futuresResults = await Promise.allSettled(
          futuresSyms.map((s: any) => fetchFuturesTicker(typeof s === 'string' ? s : s.symbol))
        );
        for (const r of futuresResults) {
          if (r.status === 'fulfilled') results.push(r.value);
        }
      }

      // Fetch forex symbols in parallel
      if (forexSyms.length > 0) {
        const forexResults = await Promise.allSettled(
          forexSyms.map((s: any) => fetchYahooTicker(typeof s === 'string' ? s : s.symbol))
        );
        for (const r of forexResults) {
          if (r.status === 'fulfilled') results.push(r.value);
        }
      }

      // Fetch Bybit symbols in parallel
      if (bybitSyms.length > 0) {
        const bybitResults = await Promise.allSettled(
          bybitSyms.map(async (s: any) => {
            const sym = typeof s === 'string' ? s : s.symbol;
            const resp = await fetch(`https://api.bybit.com/v5/market/tickers?category=spot&symbol=${sym.toUpperCase()}`);
            const data = await resp.json();
            if (data.retCode === 0 && data.result?.list?.length) {
              const t = data.result.list[0];
              return {
                symbol: t.symbol,
                lastPrice: t.lastPrice,
                priceChangePercent: t.price24hPcnt ? (parseFloat(t.price24hPcnt) * 100).toFixed(3) : '0',
                highPrice: t.highPrice24h,
                lowPrice: t.lowPrice24h,
                volume: t.volume24h,
              };
            }
            return null;
          })
        );
        for (const r of bybitResults) {
          if (r.status === 'fulfilled' && r.value) results.push(r.value);
        }
      }

      // Fetch crypto symbols from Binance
      if (binanceSyms.length > 0) {
        const symbolsParam = binanceSyms.map((s: any) => `"${(typeof s === 'string' ? s : s.symbol).toUpperCase()}"`).join(',');
        const response = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbolsParam}]`
        );

        if (response.ok) {
          const data = await response.json();
          results.push(...data);
        }
      }

      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "ticker" with symbol or "tickers" with symbols array.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Price proxy error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
