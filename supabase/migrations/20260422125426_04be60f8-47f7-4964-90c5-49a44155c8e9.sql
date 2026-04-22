CREATE POLICY "Authenticated can insert client logs"
ON public.system_events
FOR INSERT
TO authenticated
WITH CHECK (type IN ('client_error', 'client_warn', 'client_info'));