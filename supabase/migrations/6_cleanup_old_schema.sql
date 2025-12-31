-- Migration: Cleanup old schema tables
-- This migration removes old/unused tables from a previous schema design
-- that are no longer needed since we're using the new schema:
-- - profiles (not app_user, driver, rider)
-- - events (not event)
-- - car_presets (not vehicle)
-- - rides (not ride)
-- - ride_reservations (not ride_seat)
--
-- This fixes Security Advisor errors for RLS Disabled and Security Definer View

-- Drop views first (they depend on tables)
-- Fixes: Security Definer View error for ride_capacity_summary
DROP VIEW IF EXISTS public.ride_capacity_summary CASCADE;

-- Drop old tables in dependency order (CASCADE drops dependent objects automatically)
-- Fixes: RLS Disabled errors for all old schema tables

-- Step 1: Drop tables that have foreign key dependencies first
DROP TABLE IF EXISTS public.ride_seat CASCADE;
DROP TABLE IF EXISTS public.ride_application CASCADE;
DROP TABLE IF EXISTS public.seat_hold CASCADE;
DROP TABLE IF EXISTS public.rating CASCADE;
DROP TABLE IF EXISTS public.notification_preference CASCADE;
DROP TABLE IF EXISTS public.notification CASCADE;
DROP TABLE IF EXISTS public.payment_intent CASCADE;
DROP TABLE IF EXISTS public.cost_quote CASCADE;

-- Step 2: Drop the main ride table (may have dependencies)
DROP TABLE IF EXISTS public.ride CASCADE;

-- Step 3: Drop user/role tables
DROP TABLE IF EXISTS public.driver CASCADE;
DROP TABLE IF EXISTS public.rider CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.app_user CASCADE;

-- Step 4: Drop vehicle tables
DROP TABLE IF EXISTS public.vehicle_seat_template CASCADE;
DROP TABLE IF EXISTS public.vehicle CASCADE;

-- Step 5: Drop old event table (we use 'events' now)
DROP TABLE IF EXISTS public.event CASCADE;

-- Step 6: Drop utility/metadata tables
DROP TABLE IF EXISTS public.idempotency_key CASCADE;
DROP TABLE IF EXISTS public.feature_flag CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;

-- Note: We keep the new schema tables (all have RLS enabled):
-- - profiles (from migration 0_init_profiles.sql)
-- - events (from migration 2_init_events.sql)
-- - car_presets (from migration 3_init_car_presets.sql)
-- - rides (from migration 4_init_rides.sql)
-- - ride_reservations (from migration 5_init_ride_reservations.sql)

