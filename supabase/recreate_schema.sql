-- =====================================================
-- RECREATE SCHEMA - Apply All Migrations
-- Run this to recreate all our tables with proper RLS
-- This applies migrations 0-5 in order
-- =====================================================

-- Migration 0: Create profiles table
\i supabase/migrations/0_init_profiles.sql

-- Migration 1: Create profile trigger
\i supabase/migrations/1_create_profile_trigger.sql

-- Migration 2: Create events table
\i supabase/migrations/2_init_events.sql

-- Migration 3: Create car_presets table
\i supabase/migrations/3_init_car_presets.sql

-- Migration 4: Create rides table
\i supabase/migrations/4_init_rides.sql

-- Migration 5: Create ride_reservations table
\i supabase/migrations/5_init_ride_reservations.sql

