
DROP POLICY IF EXISTS "Service can insert system events" ON public.system_events;
DROP POLICY IF EXISTS "Service can update system events" ON public.system_events;
DROP POLICY IF EXISTS "Service can delete system events" ON public.system_events;

CREATE POLICY "Service can insert system events" ON public.system_events
  FOR INSERT TO service_role WITH CHECK (true);

CREATE POLICY "Service can update system events" ON public.system_events
  FOR UPDATE TO service_role USING (true);

CREATE POLICY "Service can delete system events" ON public.system_events
  FOR DELETE TO service_role USING (true);
