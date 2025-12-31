-- Migration: Create rides table
-- Rides are the core feature of ShareRide - drivers post rides to events
-- Each ride links to an event, a driver, and a car preset
-- For Stage 1, all rides are free (paid rides will be added in Stage 2)

-- Create rides table
CREATE TABLE rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links to event and driver
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  car_preset_id UUID NOT NULL REFERENCES car_presets(id) ON DELETE RESTRICT,
  -- ON DELETE RESTRICT: Prevent deletion of car preset if it's being used in active rides
  
  -- Departure Information
  departure_address TEXT NOT NULL,          -- Starting point address (e.g., "123 Main St, Buffalo, NY")
  departure_latitude DECIMAL(10, 8),        -- Latitude for map display (optional for Stage 1)
  departure_longitude DECIMAL(11, 8),       -- Longitude for map display (optional for Stage 1)
  
  -- Departure Time
  departure_datetime TIMESTAMPTZ NOT NULL,  -- Exact departure time OR start of time range
  departure_datetime_end TIMESTAMPTZ,       -- End of departure time range (if is_time_range = true)
  is_time_range BOOLEAN DEFAULT FALSE,      -- Whether departure is a time range (e.g., "between 3pm and 4pm")
  
  -- Pickup Options
  pickup_mode TEXT NOT NULL DEFAULT 'meet_at_location',  -- 'meet_at_location' or 'pickup_within_radius'
  pickup_radius_miles DECIMAL(5, 2),        -- Radius in miles (if pickup_mode = 'pickup_within_radius')
  
  -- Seat Configuration (which seats are available for THIS specific ride)
  available_seats INTEGER[] NOT NULL,       -- Array of seat numbers available for this ride
                                            -- This overrides the car_preset's default_available_seats
                                            -- Example: [2, 3, 4, 5] means seats 2-5 are available
  
  -- Payment Settings
  is_free BOOLEAN DEFAULT TRUE,             -- Whether ride is free or paid (Stage 1: always true)
  total_expected_cost DECIMAL(10, 2),       -- Total expected expenses (for paid rides in Stage 2, calculated from ride_expenses)
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active',    -- 'active', 'in_progress', 'completed', 'cancelled'
  started_at TIMESTAMPTZ,                   -- When ride actually started (when driver marks it as started)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster lookups
-- Index on event_id: Used when displaying rides for a specific event
CREATE INDEX idx_rides_event_id ON rides(event_id);

-- Index on driver_id: Used when displaying "My Drives" (rides user is driving)
CREATE INDEX idx_rides_driver_id ON rides(driver_id);

-- Index on status: Used to filter active rides (most common query)
CREATE INDEX idx_rides_status ON rides(status);

-- Index on departure_datetime: Used to sort rides by departure time
CREATE INDEX idx_rides_departure_datetime ON rides(departure_datetime);

-- Composite index for common query: active rides for an event, ordered by departure time
CREATE INDEX idx_rides_event_status_datetime ON rides(event_id, status, departure_datetime);

-- RLS Policies
ALTER TABLE rides ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view active rides
-- Why: Users need to see available rides when browsing events or searching for rides
-- Active rides are public information that everyone should be able to view
CREATE POLICY "Anyone can view active rides" ON rides
  FOR SELECT USING (status = 'active');

-- RLS Policy: Drivers can view their own rides (any status)
-- Why: Drivers need to see their own rides regardless of status (active, completed, cancelled)
-- This allows drivers to manage and view their ride history
CREATE POLICY "Drivers can view own rides" ON rides
  FOR SELECT USING (auth.uid() = driver_id);

-- RLS Policy: Authenticated users can create rides
-- Why: Any authenticated user should be able to post a ride (as long as they meet prerequisites)
-- The WITH CHECK ensures users can only create rides with themselves as the driver
CREATE POLICY "Authenticated users can create rides" ON rides
  FOR INSERT WITH CHECK (auth.uid() = driver_id);

-- RLS Policy: Drivers can update their own rides
-- Why: Drivers need to be able to edit their ride details (departure time, available seats, etc.)
-- Only the driver who created the ride should be able to update it
CREATE POLICY "Drivers can update own rides" ON rides
  FOR UPDATE USING (auth.uid() = driver_id);

-- Trigger: Automatically update updated_at when ride is modified
-- Uses the same update_updated_at_column() function created in the profiles migration
CREATE TRIGGER update_rides_updated_at 
  BEFORE UPDATE ON rides
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- How rides work in ShareRide:
-- 1. Driver creates a ride for a specific event
-- 2. Driver selects a car preset (their vehicle)
-- 3. Driver sets departure location and time
-- 4. Driver specifies which seats are available for this ride (can override car preset default)
-- 5. Driver sets pickup mode (meet at location or pickup within radius)
-- 6. Ride is posted as 'active'
-- 7. Riders can view and reserve seats on active rides
-- 8. Driver can update ride details, mark ride as started, or cancel ride
-- 9. After ride completes, status changes to 'completed'

