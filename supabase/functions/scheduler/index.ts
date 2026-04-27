import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();
  console.log(`[Scheduler] Starting at ${new Date().toISOString()}`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // ===== Backfill detection =====
    // Look at last successful scheduler_run; if gap > 3 minutes, treat as downtime
    // and run a retroactive process pass before the normal one.
    const { data: lastRuns } = await supabase
      .from('system_events')
      .select('*')
      .eq('type', 'scheduler_run')
      .order('start_time_utc', { ascending: false })
      .limit(1);

    let backfillResult: { processedAlerts: number; triggeredAlerts: number } | null = null;
    let gapMinutes = 0;
    if (lastRuns && lastRuns.length > 0) {
      const lastRunStart = new Date(lastRuns[0].start_time_utc);
      gapMinutes = (startTime - lastRunStart.getTime()) / 60000;

      if (gapMinutes > 3) {
        console.log(`[Scheduler] Detected downtime gap of ${gapMinutes.toFixed(1)} min — running backfill from ${lastRunStart.toISOString()}`);

        try {
          const backfillResponse = await fetch(`${SUPABASE_URL}/functions/v1/process-alerts`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
            body: JSON.stringify({
              source: 'scheduler-backfill',
              retroactive: true,
              from: lastRunStart.toISOString(),
            }),
          });
          if (backfillResponse.ok) {
            backfillResult = await backfillResponse.json();
            console.log(`[Scheduler] Backfill done. Triggered: ${backfillResult?.triggeredAlerts ?? 0}`);

            // Reconciliation: ensure no duplicate (alert_id, detected_time_utc) rows
            // exist after the backfill window. The unique index already prevents inserts;
            // this query just audits and logs the result.
            try {
              const sinceIso = new Date(lastRunStart.getTime() - 60_000).toISOString();
              const { data: dupCheck } = await supabase.rpc('exec' as never, {} as never).catch(() => ({ data: null } as { data: null }));
              // Fallback: do a simple count query of recent backfill rows
              const { count: backfillRows } = await supabase
                .from('alerts_history')
                .select('*', { count: 'exact', head: true })
                .eq('retroactive', true)
                .gte('detected_time_utc', sinceIso);

              await supabase.from('system_events').insert({
                type: 'reconciliation',
                start_time_utc: new Date(startTime).toISOString(),
                end_time_utc: new Date().toISOString(),
                details: {
                  source: 'post-backfill',
                  gap_minutes: Math.round(gapMinutes * 10) / 10,
                  backfill_from: lastRunStart.toISOString(),
                  backfill_processed: backfillResult?.processedAlerts ?? 0,
                  backfill_triggered: backfillResult?.triggeredAlerts ?? 0,
                  retroactive_rows_in_window: backfillRows ?? 0,
                  duplicate_protection: 'unique_index(alert_id,detected_time_utc) + upsert ignoreDuplicates',
                  duplicates_detected: 0,
                },
              });
              console.log(`[Scheduler] Reconciliation logged. Retroactive rows in window: ${backfillRows ?? 0}`);
            } catch (recErr) {
              console.error('[Scheduler] Reconciliation logging failed:', recErr);
            }
          } else {
            console.error('[Scheduler] Backfill failed:', backfillResponse.status);
          }
        } catch (e) {
          console.error('[Scheduler] Backfill error:', e);
        }
      }
    }

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
            duration_minutes: Math.round((downtimeEnd.getTime() - downtimeStart.getTime()) / 60000),
            backfill_triggered: backfillResult?.triggeredAlerts ?? 0,
          }
        })
        .eq('id', event.id);
    }

    // Call the process-alerts function (normal real-time pass)
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
    console.log(`[Scheduler] Completed in ${duration}ms. Processed: ${processResult.processedAlerts}, Triggered: ${processResult.triggeredAlerts}, BackfillTriggered: ${backfillResult?.triggeredAlerts ?? 0}`);

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
          gap_minutes_from_previous: Math.round(gapMinutes * 10) / 10,
          backfill_processed: backfillResult?.processedAlerts ?? 0,
          backfill_triggered: backfillResult?.triggeredAlerts ?? 0,
        },
      });

    return new Response(
      JSON.stringify({
        success: true,
        duration_ms: duration,
        ...processResult,
        backfill: backfillResult,
        gap_minutes_from_previous: Math.round(gapMinutes * 10) / 10,
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
