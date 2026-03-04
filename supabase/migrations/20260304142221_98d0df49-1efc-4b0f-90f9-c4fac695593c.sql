CREATE TABLE public.price_cache (
  symbol_exchange text PRIMARY KEY,
  last_price numeric NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.price_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can manage price cache" ON public.price_cache
  FOR ALL TO service_role USING (true) WITH CHECK (true);
