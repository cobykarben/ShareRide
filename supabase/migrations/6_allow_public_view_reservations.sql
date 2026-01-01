-- Migration: Allow authenticated users to view confirmed reservations for any ride
-- This allows passengers to see which seats are already taken when selecting a seat
--
-- Why this is needed:
-- - Passengers need to see seat availability when choosing which seat to reserve
-- - Drivers need to see all reservations (already covered by existing policy)
-- - Only confirmed reservations are visible (cancelled ones are hidden)
-- - This improves transparency and helps passengers make informed decisions

-- Drop the policy if it exists (for idempotency)
DROP POLICY IF EXISTS "Anyone can view confirmed reservations for active rides" ON ride_reservations;

-- RLS Policy: Anyone can view confirmed reservations for rides
-- This allows passengers to see which seats are taken on any ride
-- Only shows confirmed reservations (not cancelled)
-- Combined with other policies, users can see:
-- - Their own reservations (from existing "Riders can view own reservations" policy)
-- - All reservations for rides they drive (from existing "Drivers can view reservations for own rides" policy)
-- - Confirmed reservations for any ride (this new policy)
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

