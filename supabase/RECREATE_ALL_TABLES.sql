-- =====================================================
-- RECREATE ALL TABLES WITH PROPER RLS
-- Run this script in Supabase SQL Editor to recreate
-- all tables from our migrations with RLS enabled
-- =====================================================

-- =====================================================
-- MIGRATION 0: Create profiles table
-- =====================================================

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  legal_first_name TEXT,
  legal_last_name TEXT,
  preferred_first_name TEXT,
  phone TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  profile_picture_url TEXT,
  stripe_customer_id TEXT,
  stripe_payment_method_id TEXT,
  stripe_connect_account_id TEXT,
  stripe_connect_onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_connect ON profiles(stripe_connect_account_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION 1: Create profile trigger
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- MIGRATION 2: Create events table
-- =====================================================

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_datetime TIMESTAMPTZ NOT NULL,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  description TEXT,
  website_url TEXT,
  image_url TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_name ON events(name);
CREATE INDEX IF NOT EXISTS idx_events_start_datetime ON events(start_datetime);
CREATE INDEX IF NOT EXISTS idx_events_name_search ON events USING gin(to_tsvector('english', name));

-- GIN index for full-text search on event names
CREATE INDEX IF NOT EXISTS idx_events_name_gin ON events USING gin(to_tsvector('english', name));

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view events" ON events;
CREATE POLICY "Anyone can view events" ON events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create events" ON events;
CREATE POLICY "Authenticated users can create events" ON events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Creators can update events" ON events;
CREATE POLICY "Creators can update events" ON events
  FOR UPDATE USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creators can delete events" ON events;
CREATE POLICY "Creators can delete events" ON events
  FOR DELETE USING (auth.uid() = created_by);

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at 
  BEFORE UPDATE ON events
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION 3: Create car_presets table
-- =====================================================

CREATE TABLE IF NOT EXISTS car_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  color TEXT NOT NULL,
  license_plate TEXT NOT NULL,
  default_available_seats INTEGER[],
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, license_plate)
);

CREATE INDEX IF NOT EXISTS idx_car_presets_user_id ON car_presets(user_id);

ALTER TABLE car_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own car presets" ON car_presets;
CREATE POLICY "Users can view own car presets" ON car_presets
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own car presets" ON car_presets;
CREATE POLICY "Users can create own car presets" ON car_presets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own car presets" ON car_presets;
CREATE POLICY "Users can update own car presets" ON car_presets
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own car presets" ON car_presets;
CREATE POLICY "Users can delete own car presets" ON car_presets
  FOR DELETE USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_car_presets_updated_at ON car_presets;
CREATE TRIGGER update_car_presets_updated_at 
  BEFORE UPDATE ON car_presets
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION 4: Create rides table
-- =====================================================

CREATE TABLE IF NOT EXISTS rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  car_preset_id UUID NOT NULL REFERENCES car_presets(id) ON DELETE RESTRICT,
  departure_address TEXT NOT NULL,
  departure_latitude DECIMAL(10, 8),
  departure_longitude DECIMAL(11, 8),
  departure_datetime TIMESTAMPTZ NOT NULL,
  departure_datetime_end TIMESTAMPTZ,
  is_time_range BOOLEAN DEFAULT FALSE,
  pickup_mode TEXT NOT NULL DEFAULT 'meet_at_location',
  pickup_radius_miles DECIMAL(5, 2),
  available_seats INTEGER[] NOT NULL,
  is_free BOOLEAN DEFAULT TRUE,
  total_expected_cost DECIMAL(10, 2),
  status TEXT NOT NULL DEFAULT 'active',
  started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rides_event_id ON rides(event_id);
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides(driver_id);
CREATE INDEX IF NOT EXISTS idx_rides_status ON rides(status);
CREATE INDEX IF NOT EXISTS idx_rides_departure_datetime ON rides(departure_datetime);
CREATE INDEX IF NOT EXISTS idx_rides_event_status_datetime ON rides(event_id, status, departure_datetime);

ALTER TABLE rides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view active rides" ON rides;
CREATE POLICY "Anyone can view active rides" ON rides
  FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Drivers can view own rides" ON rides;
CREATE POLICY "Drivers can view own rides" ON rides
  FOR SELECT USING (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Authenticated users can create rides" ON rides;
CREATE POLICY "Authenticated users can create rides" ON rides
  FOR INSERT WITH CHECK (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Drivers can update own rides" ON rides;
CREATE POLICY "Drivers can update own rides" ON rides
  FOR UPDATE USING (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Drivers can delete own rides" ON rides;
CREATE POLICY "Drivers can delete own rides" ON rides
  FOR DELETE USING (auth.uid() = driver_id);

DROP POLICY IF EXISTS "Drivers can delete own rides" ON rides;
CREATE POLICY "Drivers can delete own rides" ON rides
  FOR DELETE USING (auth.uid() = driver_id);

DROP TRIGGER IF EXISTS update_rides_updated_at ON rides;
CREATE TRIGGER update_rides_updated_at 
  BEFORE UPDATE ON rides
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- MIGRATION 5: Create ride_reservations table
-- =====================================================

CREATE TABLE IF NOT EXISTS ride_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  cost_per_person DECIMAL(10, 2),
  stripe_payment_intent_id TEXT,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ride_id, seat_number),
  UNIQUE(ride_id, rider_id)
);

CREATE INDEX IF NOT EXISTS idx_ride_reservations_ride_id ON ride_reservations(ride_id);
CREATE INDEX IF NOT EXISTS idx_ride_reservations_rider_id ON ride_reservations(rider_id);
CREATE INDEX IF NOT EXISTS idx_ride_reservations_status ON ride_reservations(status);
CREATE INDEX IF NOT EXISTS idx_ride_reservations_ride_status ON ride_reservations(ride_id, status);
CREATE INDEX IF NOT EXISTS idx_ride_reservations_rider_status ON ride_reservations(rider_id, status);

ALTER TABLE ride_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Riders can view own reservations" ON ride_reservations;
CREATE POLICY "Riders can view own reservations" ON ride_reservations
  FOR SELECT USING (auth.uid() = rider_id);

DROP POLICY IF EXISTS "Drivers can view reservations for own rides" ON ride_reservations;
CREATE POLICY "Drivers can view reservations for own rides" ON ride_reservations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rides WHERE rides.id = ride_reservations.ride_id AND rides.driver_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Riders can create reservations" ON ride_reservations;
CREATE POLICY "Riders can create reservations" ON ride_reservations
  FOR INSERT WITH CHECK (auth.uid() = rider_id);

DROP POLICY IF EXISTS "Riders can update own reservations" ON ride_reservations;
CREATE POLICY "Riders can update own reservations" ON ride_reservations
  FOR UPDATE USING (auth.uid() = rider_id);

DROP POLICY IF EXISTS "Riders can delete own reservations" ON ride_reservations;
CREATE POLICY "Riders can delete own reservations" ON ride_reservations
  FOR DELETE USING (auth.uid() = rider_id);

DROP TRIGGER IF EXISTS update_ride_reservations_updated_at ON ride_reservations;
CREATE TRIGGER update_ride_reservations_updated_at 
  BEFORE UPDATE ON ride_reservations
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VERIFICATION: Check all tables and RLS status
-- =====================================================

SELECT 
    tablename as "Table Name",
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED ✓'
        ELSE 'RLS DISABLED ✗'
    END as "RLS Status"
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'events', 'car_presets', 'rides', 'ride_reservations')
ORDER BY tablename;

