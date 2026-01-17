-- Add volume_spike to alert_type enum
ALTER TYPE public.alert_type ADD VALUE IF NOT EXISTS 'volume_spike';

-- Add tags column to alerts table for organization
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Add priority column for sorting
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS priority integer DEFAULT 0;