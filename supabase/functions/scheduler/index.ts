import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET');

function isAuthorizedInternal(req: Request): boolean {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  // Accept service_role_key, anon_key (for pg_cron), or cron secret
  if (token === SUPABASE_SERVICE_ROLE_KEY) return true;
  if (token === SUPABASE_ANON_KEY) return true;
  if (CRON_SECRET && token === CRON_SECRET) return true;
  return false;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!isAuthorizedInternal(req)) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const startTime = Date.now();
  console.log(`[Scheduler] Starting at ${new Date().toISOString()}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Check for any ongoing downtime events and close them
    const { data: activeEvents } = await supabase
      .from('system_events')
      .select('*')
      .is('end_time_utc', null)
      .eq('type', 'downtime')
      .order('start_time_utc', { ascending: false })
      .limit(1);

    if (activeEvents && activeEvents.length > 0) {
      const event = activeEvents[0];
      const downtimeStart = new Date(event.start_time_utc);
      const downtimeEnd = new Date();
      
      console.log(`[Scheduler] Ending downtime event from ${downtimeStart.toISOString()}`);
      
      await supabase
        .from('system_events')
        .update({ 
          end_time_utc: downtimeEnd.toISOString(),
          details: { 
            ...(event.details as Record<string, unknown> || {}),
            duration_minutes: Math.round((downtimeEnd.getTime() - downtimeStart.getTime()) / 60000)
          }
        })
        .eq('id', event.id);
    }

    // Call the process-alerts function
    const processResponse = await fetch(`${SUPABASE_URL}/functions/v1/process-alerts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ source: 'scheduler' }),
    });

    let processResult = { processedAlerts: 0, triggeredAlerts: 0 };
    try {
      processResult = await processResponse.json();
    } catch (e) {
      console.error('[Scheduler] Failed to parse process-alerts response:', e);
    }
    
    const duration = Date.now() - startTime;
    console.log(`[Scheduler] Completed in ${duration}ms. Processed: ${processResult.processedAlerts}, Triggered: ${processResult.triggeredAlerts}`);

    // Record scheduler run
    await supabase
      .from('system_events')
      .insert({
        type: 'scheduler_run',
        start_time_utc: new Date(startTime).toISOString(),
        end_time_utc: new Date().toISOString(),
        details: {
          duration_ms: duration,
          processed_alerts: processResult.processedAlerts,
          triggered_alerts: processResult.triggeredAlerts,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        duration_ms: duration,
        ...processResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Scheduler] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Record downtime
    try {
      await supabase
        .from('system_events')
        .insert({
          type: 'downtime',
          start_time_utc: new Date().toISOString(),
          details: { error: message },
        });
    } catch (dbError) {
      console.error('[Scheduler] Failed to record downtime:', dbError);
    }

    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
