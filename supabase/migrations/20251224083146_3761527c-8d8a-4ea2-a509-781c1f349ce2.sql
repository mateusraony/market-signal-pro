-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can create own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can delete own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can view own history" ON public.alerts_history;
DROP POLICY IF EXISTS "Users can insert own history" ON public.alerts_history;
DROP POLICY IF EXISTS "Authenticated users can view system events" ON public.system_events;

-- Create open policies for single-user app
CREATE POLICY "Allow all access to profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to alerts" ON public.alerts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to alerts_history" ON public.alerts_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access to system_events" ON public.system_events FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime for alerts_history to get live notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts_history;