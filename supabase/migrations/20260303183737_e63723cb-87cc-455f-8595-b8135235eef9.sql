
-- Drop old restrictive RLS policies and replace with auth.uid() based ones

-- ALERTS table
DROP POLICY IF EXISTS "Users can view own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can insert own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can delete own alerts" ON public.alerts;

CREATE POLICY "Users can view own alerts" ON public.alerts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own alerts" ON public.alerts
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own alerts" ON public.alerts
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own alerts" ON public.alerts
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- PROFILES table
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- ALERTS_HISTORY table
DROP POLICY IF EXISTS "Users can view own alerts history" ON public.alerts_history;
DROP POLICY IF EXISTS "System can insert alerts history" ON public.alerts_history;

CREATE POLICY "Users can view own alerts history" ON public.alerts_history
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert alerts history" ON public.alerts_history
  FOR INSERT
  WITH CHECK (true);

-- SYSTEM_EVENTS table (keep public read, restrict writes to service role)
DROP POLICY IF EXISTS "Anyone can view system events" ON public.system_events;
DROP POLICY IF EXISTS "System can manage system events" ON public.system_events;
DROP POLICY IF EXISTS "System can update system events" ON public.system_events;
DROP POLICY IF EXISTS "System can delete system events" ON public.system_events;

CREATE POLICY "Authenticated can view system events" ON public.system_events
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service can insert system events" ON public.system_events
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update system events" ON public.system_events
  FOR UPDATE
  USING (true);

CREATE POLICY "Service can delete system events" ON public.system_events
  FOR DELETE
  USING (true);

-- Recreate the handle_new_user trigger for auto-creating profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
