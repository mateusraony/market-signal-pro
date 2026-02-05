-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow all access to alerts" ON public.alerts;
DROP POLICY IF EXISTS "Allow all access to alerts_history" ON public.alerts_history;
DROP POLICY IF EXISTS "Allow all access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all access to system_events" ON public.system_events;

-- Fixed user ID for single-user mode
-- User ID: 00000000-0000-0000-0000-000000000001

-- ============================================
-- ALERTS TABLE - Restricted RLS Policies
-- ============================================

-- Users can view only their own alerts
CREATE POLICY "Users can view own alerts"
ON public.alerts FOR SELECT
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Users can insert only their own alerts
CREATE POLICY "Users can insert own alerts"
ON public.alerts FOR INSERT
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Users can update only their own alerts
CREATE POLICY "Users can update own alerts"
ON public.alerts FOR UPDATE
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Users can delete only their own alerts
CREATE POLICY "Users can delete own alerts"
ON public.alerts FOR DELETE
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- ============================================
-- ALERTS_HISTORY TABLE - Restricted RLS Policies
-- ============================================

-- Users can view only their own history
CREATE POLICY "Users can view own alerts history"
ON public.alerts_history FOR SELECT
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- System can insert history (for edge functions via service role)
CREATE POLICY "System can insert alerts history"
ON public.alerts_history FOR INSERT
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- ============================================
-- PROFILES TABLE - Restricted RLS Policies
-- ============================================

-- Users can view only their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Users can insert only their own profile
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- Users can update only their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (user_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- ============================================
-- SYSTEM_EVENTS TABLE - Read-only for users
-- ============================================

-- Everyone can view system events (public status info)
CREATE POLICY "Anyone can view system events"
ON public.system_events FOR SELECT
USING (true);

-- Only system (service role) can insert/update/delete
CREATE POLICY "System can manage system events"
ON public.system_events FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update system events"
ON public.system_events FOR UPDATE
USING (true);

CREATE POLICY "System can delete system events"
ON public.system_events FOR DELETE
USING (true);