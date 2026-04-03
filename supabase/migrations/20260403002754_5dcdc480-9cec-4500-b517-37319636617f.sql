-- Allow users to delete their own profile
CREATE POLICY "Users can delete own profile"
ON public.profiles
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Add RLS on realtime.messages to restrict channel subscriptions
-- Users can only receive messages on channels that include their user_id
CREATE POLICY "Users can only listen to own channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() LIKE '%' || auth.uid()::text || '%'
);