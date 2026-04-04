-- Drop the weak LIKE-based policy
DROP POLICY IF EXISTS "Users can only listen to own channels" ON realtime.messages;

-- Create a strict policy using exact suffix match
CREATE POLICY "Users can only listen to own channels"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  realtime.topic() = ('alerts-realtime-' || auth.uid()::text)
);