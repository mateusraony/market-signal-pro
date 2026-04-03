-- Fix alerts_history: replace public INSERT with service_role only
DROP POLICY IF EXISTS "System can insert alerts history" ON public.alerts_history;

CREATE POLICY "Service can insert alerts history"
ON public.alerts_history
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "Service can update alerts history"
ON public.alerts_history
FOR UPDATE
TO service_role
USING (true);

CREATE POLICY "Service can delete alerts history"
ON public.alerts_history
FOR DELETE
TO service_role
USING (true);