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

async function fetchYahooTicker(symbol: string): Promise<any> {
  const yahooSymbol = forexSymbolMap[symbol.toUpperCase()];
  if (!yahooSymbol) throw new Error(`Unknown forex symbol: ${symbol}`);

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=2d`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });

  if (!response.ok) throw new Error(`Yahoo Finance API error: ${response.status}`);

  const data = await response.json();
  const result = data.chart?.result?.[0];
  if (!result?.meta?.regularMarketPrice) throw new Error(`No data for ${symbol}`);

  const meta = result.meta;
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
      const { data, error } = await supabase.auth.getClaims(token);
      if (!error && data?.claims?.sub) {
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
    const { action, symbol, symbols } = await req.json();

    if (action === 'ticker' && symbol) {
      // Check if forex/commodity symbol
      if (isForexSymbol(symbol)) {
        const data = await fetchYahooTicker(symbol);
        return new Response(JSON.stringify(data), {
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
      // Separate forex and crypto symbols
      const forexSymbols = symbols.filter((s: string) => isForexSymbol(s));
      const cryptoSymbols = symbols.filter((s: string) => !isForexSymbol(s));

      const results: any[] = [];

      // Fetch forex symbols in parallel
      if (forexSymbols.length > 0) {
        const forexResults = await Promise.allSettled(
          forexSymbols.map((s: string) => fetchYahooTicker(s))
        );
        for (const r of forexResults) {
          if (r.status === 'fulfilled') results.push(r.value);
        }
      }

      // Fetch crypto symbols from Binance
      if (cryptoSymbols.length > 0) {
        const symbolsParam = cryptoSymbols.map((s: string) => `"${s.toUpperCase()}"`).join(',');
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
