-- Remove foreign key constraints that reference auth.users
-- This is necessary for single-user mode without authentication

-- Drop foreign key from alerts table
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_user_id_fkey;

-- Drop foreign key from alerts_history table  
ALTER TABLE public.alerts_history DROP CONSTRAINT IF EXISTS alerts_history_user_id_fkey;

-- Drop foreign key from profiles table
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;