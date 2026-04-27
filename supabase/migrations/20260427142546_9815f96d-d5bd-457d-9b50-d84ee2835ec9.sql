-- Remove pre-existing duplicates first (keep earliest by created_at)
DELETE FROM public.alerts_history a
USING public.alerts_history b
WHERE a.alert_id IS NOT NULL
  AND a.alert_id = b.alert_id
  AND a.detected_time_utc = b.detected_time_utc
  AND a.created_at > b.created_at;

-- Unique index to enforce idempotency for backfill / retries
CREATE UNIQUE INDEX IF NOT EXISTS alerts_history_alert_detected_unique
  ON public.alerts_history (alert_id, detected_time_utc)
  WHERE alert_id IS NOT NULL;