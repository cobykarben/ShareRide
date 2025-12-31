-- Migration: Create ride_reservations table
-- Ride reservations store seat bookings - when a rider reserves a specific seat on a ride
-- This replaces the old "applications" concept - it's a direct reservation system
-- Each reservation links a rider to a specific seat on a specific ride

-- Create ride_reservations table
CREATE TABLE ride_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links to ride and rider
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  -- ON DELETE CASCADE: If a ride is deleted, all reservations are also deleted
  rider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- ON DELETE CASCADE: If a rider account is deleted, their reservations are deleted
  
  -- Seat Selection
  seat_number INTEGER NOT NULL,             -- Which seat number the rider reserved (e.g., 2, 3, 4)
                                            -- Seat 1 is always the driver's seat
  
  -- Status
  status TEXT NOT NULL DEFAULT 'confirmed', -- 'confirmed', 'cancelled', 'completed'
                                            -- 'confirmed': Rider has reserved the seat
                                            -- 'cancelled': Reservation was cancelled (by rider or driver)
                                            -- 'completed': Ride completed successfully
  
  -- Payment Info (for paid rides in Stage 2 - all fields optional for Stage 1 free rides)
  cost_per_person DECIMAL(10, 2),           -- How much this rider pays (calculated when reserved, for paid rides)
  stripe_payment_intent_id TEXT,            -- Stripe Payment Intent ID (if paid ride, for Stage 2)
  payment_status TEXT DEFAULT 'pending',    -- 'pending', 'paid', 'refunded' (for paid rides, Stage 2)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  -- Ensure one person per seat per ride (no double-booking)
  UNIQUE(ride_id, seat_number),
  
  -- Ensure riders can't reserve multiple seats in the same ride
  UNIQUE(ride_id, rider_id)
);

-- Indexes for faster lookups
-- Index on ride_id: Used when displaying all reservations for a specific ride
CREATE INDEX idx_ride_reservations_ride_id ON ride_reservations(ride_id);

-- Index on rider_id: Used when displaying "My Rides" (rides user is a passenger in)
CREATE INDEX idx_ride_reservations_rider_id ON ride_reservations(rider_id);

-- Index on status: Used to filter confirmed vs cancelled reservations
CREATE INDEX idx_ride_reservations_status ON ride_reservations(status);

-- Composite index for common query: confirmed reservations for a ride
CREATE INDEX idx_ride_reservations_ride_status ON ride_reservations(ride_id, status);

-- Composite index for common query: user's reservations
CREATE INDEX idx_ride_reservations_rider_status ON ride_reservations(rider_id, status);

-- RLS Policies
ALTER TABLE ride_reservations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Riders can view their own reservations
-- Why: Riders need to see their own reservations (in "My Rides" page)
-- This allows riders to see which seats they've reserved on which rides
CREATE POLICY "Riders can view own reservations" ON ride_reservations
  FOR SELECT USING (auth.uid() = rider_id);

-- RLS Policy: Drivers can view reservations for their rides
-- Why: Drivers need to see who has reserved seats on their rides
-- This allows drivers to see all reservations for rides they're driving
CREATE POLICY "Drivers can view reservations for own rides" ON ride_reservations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rides 
      WHERE rides.id = ride_reservations.ride_id 
      AND rides.driver_id = auth.uid()
    )
  );

-- RLS Policy: Riders can create reservations
-- Why: Riders need to be able to reserve seats on rides
-- The WITH CHECK ensures users can only create reservations for themselves
-- Additional validation (seat availability, prerequisites) is handled in application logic
CREATE POLICY "Riders can create reservations" ON ride_reservations
  FOR INSERT WITH CHECK (auth.uid() = rider_id);

-- RLS Policy: Riders can update their own reservations (cancel, etc.)
-- Why: Riders need to be able to cancel their own reservations
-- Drivers may also need to update reservations (mark as completed), but that will be handled via service role or triggers
CREATE POLICY "Riders can update own reservations" ON ride_reservations
  FOR UPDATE USING (auth.uid() = rider_id);

-- Trigger: Automatically update updated_at when reservation is modified
CREATE TRIGGER update_ride_reservations_updated_at 
  BEFORE UPDATE ON ride_reservations
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- How reservations work in ShareRide:
-- 1. Rider views available rides for an event
-- 2. Rider selects a ride and sees available seats
-- 3. Rider reserves a specific seat (creates a reservation with status 'confirmed')
-- 4. Seat becomes unavailable (enforced by UNIQUE constraint on ride_id, seat_number)
-- 5. Rider can cancel their reservation (updates status to 'cancelled')
-- 6. When ride completes, status changes to 'completed'
-- 7. Driver can see all reservations for their rides
-- 8. Rider can see all their reservations in "My Rides"
--
-- Constraints:
-- - One person per seat per ride (UNIQUE on ride_id, seat_number)
-- - One reservation per rider per ride (UNIQUE on ride_id, rider_id)
-- - Rider must meet prerequisites (handled in application logic, not in database)

