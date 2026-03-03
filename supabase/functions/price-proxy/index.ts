import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Validate authentication - require authenticated user or service role
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  let authorized = false;

  if (token === SUPABASE_SERVICE_ROLE_KEY) {
    authorized = true;
  } else {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));
        if (payload.iss === 'supabase' && payload.sub && (payload.role === 'authenticated' || payload.role === 'anon')) {
          authorized = true;
        }
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
      // Single symbol 24hr ticker
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
      // Multiple symbols 24hr ticker
      const symbolsParam = symbols.map((s: string) => `"${s.toUpperCase()}"`).join(',');
      const response = await fetch(
        `https://api.binance.com/api/v3/ticker/24hr?symbols=[${symbolsParam}]`
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
