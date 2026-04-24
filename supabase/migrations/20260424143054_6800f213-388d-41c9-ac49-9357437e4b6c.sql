CREATE POLICY "Public visitors can view temporary alerts"
ON public.alerts
FOR SELECT
TO anon
USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Public visitors can create temporary alerts"
ON public.alerts
FOR INSERT
TO anon
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Public visitors can update temporary alerts"
ON public.alerts
FOR UPDATE
TO anon
USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid)
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Public visitors can delete temporary alerts"
ON public.alerts
FOR DELETE
TO anon
USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Public visitors can view temporary alert history"
ON public.alerts_history
FOR SELECT
TO anon
USING (user_id = '00000000-0000-0000-0000-000000000000'::uuid);

CREATE POLICY "Public visitors can view price cache"
ON public.price_cache
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Public visitors can view system events"
ON public.system_events
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Public visitors can insert client logs"
ON public.system_events
FOR INSERT
TO anon
WITH CHECK (type = ANY (ARRAY['client_error'::text, 'client_warn'::text, 'client_info'::text]));