import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// ---------- Response envelope ----------
type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
  status?: number;
  serverTime: string; // UTC ISO
};

function ok<T>(data: T, extra: Partial<Envelope<T>> = {}) {
  const body: Envelope<T> = {
    ok: true,
    data,
    serverTime: new Date().toISOString(),
    ...extra,
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function fail(code: string, message: string, status = 200, extra: Record<string, unknown> = {}) {
  const body: Envelope<never> = {
    ok: false,
    error: message,
    code,
    status,
    serverTime: new Date().toISOString(),
    ...extra,
  };
  // Always return 200 so the client can read the body and avoid blank screens
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ---------- Server-side error logging ----------
async function logSystemError(stage: string, details: Record<string, unknown>) {
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return;
    // Use REST API directly to avoid importing the supabase client (keeps boot fast and safe)
    await fetch(`${url}/rest/v1/system_events`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        type: 'price_proxy_error',
        start_time_utc: new Date().toISOString(),
        end_time_utc: new Date().toISOString(),
        details: { stage, ...details },
      }),
    });
  } catch (e) {
    console.error('Failed to log system error:', e);
  }
}

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
  // BRL pairs
  'USDBRL': 'USDBRL=X',
  'EURBRL': 'EURBRL=X',
  'GBPBRL': 'GBPBRL=X',
  'JPYBRL': 'JPYBRL=X',
  'ARSBRL': 'ARSBRL=X',
  'SPX500': '^GSPC',
  'NAS100': '^NDX',
  'DJI30': '^DJI',
  'IBOV': '^BVSP',
};

function isForexSymbol(symbol: string): boolean {
  return !!forexSymbolMap[symbol.toUpperCase()];
}

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
    serverTime: new Date().toISOString(),
  };
}

async function fetchYahooTicker(symbol: string): Promise<any> {
  const yahooSymbol = forexSymbolMap[symbol.toUpperCase()];
  if (!yahooSymbol) throw new Error(`Unknown forex symbol: ${symbol}`);

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
      const response = await fetch(url, { headers: { 'User-Agent': userAgent } });
      if (!response.ok) {
        await response.text();
        lastError = new Error(`Yahoo API ${response.status} for ${url}`);
        continue;
      }
      const data = await response.json();

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
          serverTime: new Date().toISOString(),
        };
      }

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
          serverTime: new Date().toISOString(),
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

  let payload: any = null;
  try {
    payload = await req.json();
  } catch {
    return fail('BAD_REQUEST', 'Invalid JSON body', 400);
  }

  const { action, symbol, symbols, exchange } = payload || {};

  try {
    if (action === 'ticker' && symbol) {
      let data: any;
      if (isFuturesSymbol(symbol)) {
        data = await fetchFuturesTicker(symbol);
      } else if (isForexSymbol(symbol)) {
        data = await fetchYahooTicker(symbol);
      } else if (exchange === 'bybit') {
        const response = await fetch(
          `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol.toUpperCase()}`
        );
        if (!response.ok) {
          const errorText = await response.text();
          await logSystemError('bybit_ticker', { symbol, status: response.status, errorText });
          return fail('UPSTREAM_ERROR', `Bybit API error: ${response.status}`, response.status);
        }
        const r = await response.json();
        if (r.retCode !== 0 || !r.result?.list?.length) {
          return fail('NOT_FOUND', `No Bybit data for ${symbol}`, 404);
        }
        const ticker = r.result.list[0];
        data = {
          symbol: ticker.symbol,
          lastPrice: ticker.lastPrice,
          priceChangePercent: ticker.price24hPcnt ? (parseFloat(ticker.price24hPcnt) * 100).toFixed(3) : '0',
          highPrice: ticker.highPrice24h,
          lowPrice: ticker.lowPrice24h,
          volume: ticker.volume24h,
          serverTime: new Date().toISOString(),
        };
      } else {
        const response = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}`
        );
        if (!response.ok) {
          const errorText = await response.text();
          await logSystemError('binance_ticker', { symbol, status: response.status, errorText });
          return fail('UPSTREAM_ERROR', `Binance API error: ${response.status}`, response.status);
        }
        data = await response.json();
        data.serverTime = new Date().toISOString();
      }

      // Backwards-compat: keep existing top-level fields, plus envelope helpers.
      return new Response(
        JSON.stringify({ ...data, ok: true, serverTime: data.serverTime }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'tickers' && symbols && Array.isArray(symbols)) {
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
        return typeof s === 'object' && s.exchange === 'bybit';
      });
      const binanceSyms = symbols.filter((s: any) => {
        const sym = typeof s === 'string' ? s : s.symbol;
        if (isFuturesSymbol(sym) || isForexSymbol(sym)) return false;
        if (typeof s === 'object' && s.exchange === 'bybit') return false;
        return true;
      });

      const results: any[] = [];
      const serverTime = new Date().toISOString();

      if (futuresSyms.length > 0) {
        const r = await Promise.allSettled(
          futuresSyms.map((s: any) => fetchFuturesTicker(typeof s === 'string' ? s : s.symbol))
        );
        for (const x of r) if (x.status === 'fulfilled') results.push({ ...x.value, serverTime });
      }

      if (forexSyms.length > 0) {
        const r = await Promise.allSettled(
          forexSyms.map((s: any) => fetchYahooTicker(typeof s === 'string' ? s : s.symbol))
        );
        for (const x of r) if (x.status === 'fulfilled') results.push({ ...x.value, serverTime });
      }

      if (bybitSyms.length > 0) {
        const r = await Promise.allSettled(
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
                serverTime,
              };
            }
            return null;
          })
        );
        for (const x of r) if (x.status === 'fulfilled' && x.value) results.push(x.value);
      }

      if (binanceSyms.length > 0) {
        const symbolsParam = binanceSyms
          .map((s: any) => `"${(typeof s === 'string' ? s : s.symbol).toUpperCase()}"`)
          .join(',');
        const response = await fetch(
          `https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbolsParam}]`
        );
        if (response.ok) {
          const data = await response.json();
          for (const t of data) results.push({ ...t, serverTime });
        } else {
          const errorText = await response.text();
          await logSystemError('binance_tickers', { count: binanceSyms.length, status: response.status, errorText });
        }
      }

      // Keep legacy array shape: many callers expect a plain array.
      return new Response(JSON.stringify(results), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Server-Time': serverTime },
      });
    }

    return fail('BAD_REQUEST', 'Invalid action. Use "ticker" with symbol or "tickers" with symbols array.', 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack : undefined;
    console.error('Price proxy error:', message, stack);
    await logSystemError('unhandled_exception', { message, stack, payload });
    return fail('SERVICE_FAILED', message, 500);
  }
});
