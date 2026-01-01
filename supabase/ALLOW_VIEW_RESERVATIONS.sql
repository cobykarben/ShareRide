-- SQL to run directly in Supabase SQL Editor
-- This allows authenticated users to view confirmed reservations for any active ride
-- This fixes the issue where passengers can't see which seats are already taken

-- Drop the policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Anyone can view confirmed reservations for active rides" ON ride_reservations;

-- RLS Policy: Anyone can view confirmed reservations for rides
-- This allows passengers to see which seats are taken on any ride
-- Only shows confirmed reservations (not cancelled)
-- Combined with other policies, users can see:
-- - Their own reservations (from existing "Riders can view own reservations" policy)
-- - All reservations for rides they drive (from existing "Drivers can view reservations for own rides" policy)
-- - Confirmed reservations for any active ride (this new policy)
CREATE POLICY "Anyone can view confirmed reservations for active rides" ON ride_reservations
  FOR SELECT 
  USING (
    status = 'confirmed' AND
    EXISTS (
      SELECT 1 FROM rides 
      WHERE rides.id = ride_reservations.ride_id 
      AND rides.status = 'active'
    )
  );

-- Note: The policies combine using OR logic, so if ANY policy matches, the row is visible.
-- This means:
-- - Passengers can see confirmed reservations for active rides (this policy)
-- - Drivers can see all reservations for their rides regardless of status (existing policy)
-- - Riders can see their own reservations regardless of status (existing policy)

