-- Migration: Create car_presets table
-- Car presets store saved vehicle information that drivers can reuse when creating rides
-- This allows drivers to register their vehicles once and reference them when posting rides
-- Each user can have multiple car presets (e.g., personal car, work car, etc.)

-- Create car_presets table
CREATE TABLE car_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links to the user who owns this car preset
  -- ON DELETE CASCADE means if a user is deleted, their car presets are also deleted
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Vehicle Details (Required)
  brand TEXT NOT NULL,                      -- Vehicle manufacturer, e.g., "Toyota", "Ford", "Tesla"
  model TEXT NOT NULL,                      -- Vehicle model, e.g., "Camry", "F-150", "Model 3"
  color TEXT NOT NULL,                      -- Vehicle color, e.g., "Silver", "Black", "Blue"
  license_plate TEXT NOT NULL,              -- License plate number (unique per user)
  
  -- Seat Configuration (Optional - default available seats for this vehicle)
  -- This is an array of seat numbers that are typically available for passengers
  -- For example, [2, 3, 4, 5] means seats 2-5 are available
  -- Seat 1 is usually the driver's seat, seat 2 is the front passenger
  -- This can be overridden per ride when creating a ride listing
  default_available_seats INTEGER[],        -- Array of seat numbers available by default
  
  -- Metadata
  name TEXT,                                -- Optional nickname for this preset, e.g., "My Toyota", "Work Truck"
  created_at TIMESTAMPTZ DEFAULT NOW(),     -- When this preset was created
  updated_at TIMESTAMPTZ DEFAULT NOW(),     -- When this preset was last updated
  
  -- Ensure users can't have duplicate license plates
  -- This constraint ensures each user can only have one preset per license plate
  -- This prevents accidental duplicates and helps maintain data integrity
  UNIQUE(user_id, license_plate)
);

-- Indexes for faster lookups
-- Index on user_id for quickly finding all car presets for a specific user
-- This is used when displaying "My Cars" or selecting a car when creating a ride
CREATE INDEX idx_car_presets_user_id ON car_presets(user_id);

-- Enable Row Level Security (RLS)
-- RLS adds an extra layer of security by restricting which rows users can access
-- based on policies. This ensures users can only see and manage their own car presets.
ALTER TABLE car_presets ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own car presets
-- Why: Car presets are private to each user. Other users don't need to see what cars you own
-- This policy allows users to SELECT (read) only their own car presets
-- auth.uid() returns the current authenticated user's ID from Supabase Auth
CREATE POLICY "Users can view own car presets" ON car_presets
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can only create car presets for themselves
-- Why: Users should only be able to create car presets with their own user_id
-- This prevents users from creating car presets for other users
-- The WITH CHECK clause ensures the user_id in the INSERT matches the authenticated user
CREATE POLICY "Users can create own car presets" ON car_presets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can only update their own car presets
-- Why: Users should only be able to modify their own car presets
-- This prevents users from editing or deleting other users' car presets
CREATE POLICY "Users can update own car presets" ON car_presets
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Users can only delete their own car presets
-- Why: Users should only be able to delete their own car presets
-- This prevents users from deleting other users' car presets
CREATE POLICY "Users can delete own car presets" ON car_presets
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger: Automatically update updated_at when car preset is modified
-- This ensures we always know when a car preset was last updated
-- Uses the same update_updated_at_column() function created in the profiles migration
CREATE TRIGGER update_car_presets_updated_at 
  BEFORE UPDATE ON car_presets
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- How car presets work in ShareRide:
-- 1. Driver registers a car preset with vehicle details (brand, model, color, license plate)
-- 2. Driver can optionally set default available seats (e.g., seats 2-5 in a 5-seat car)
-- 3. When creating a ride, driver selects a car preset
-- 4. The ride can use the default available seats or override them for that specific ride
-- 5. Drivers can have multiple car presets (e.g., different cars)
-- 6. Each preset is tied to a license plate and is unique per user (can't have duplicate plates)
