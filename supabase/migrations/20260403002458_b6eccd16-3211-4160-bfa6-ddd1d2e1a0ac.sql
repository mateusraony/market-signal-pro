CREATE POLICY "Authenticated can read price cache"
ON public.price_cache
FOR SELECT
TO authenticated
USING (true);