-- Migration: Force cleanup old schema tables
-- This migration aggressively removes old/unused tables that are causing Security Advisor errors.
-- Based on Security Advisor CSV export showing these tables exist without RLS enabled.
--
-- We use the new schema:
-- - profiles (not app_user, driver, rider)
-- - events (not event)
-- - car_presets (not vehicle)
-- - rides (not ride)
-- - ride_reservations (not ride_seat)

-- Fix ERROR: Security Definer View
DROP VIEW IF EXISTS public.ride_capacity_summary CASCADE;

-- Fix ERROR: RLS Disabled in Public - drop all old schema tables
-- Using CASCADE to handle any dependencies automatically

-- Old user/role tables
DROP TABLE IF EXISTS public.app_user CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.driver CASCADE;
DROP TABLE IF EXISTS public.rider CASCADE;

-- Old event table (we use 'events')
DROP TABLE IF EXISTS public.event CASCADE;

-- Old vehicle tables (we use 'car_presets')
DROP TABLE IF EXISTS public.vehicle CASCADE;
DROP TABLE IF EXISTS public.vehicle_seat_template CASCADE;

-- Old ride tables (we use 'rides' and 'ride_reservations')
DROP TABLE IF EXISTS public.ride CASCADE;
DROP TABLE IF EXISTS public.ride_seat CASCADE;
DROP TABLE IF EXISTS public.ride_application CASCADE;
DROP TABLE IF EXISTS public.seat_hold CASCADE;

-- Other old tables
DROP TABLE IF EXISTS public.payment_intent CASCADE;
DROP TABLE IF EXISTS public.cost_quote CASCADE;
DROP TABLE IF EXISTS public.rating CASCADE;
DROP TABLE IF EXISTS public.notification CASCADE;
DROP TABLE IF EXISTS public.notification_preference CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.idempotency_key CASCADE;
DROP TABLE IF EXISTS public.feature_flag CASCADE;

-- Verify our current schema tables have RLS enabled (they should from previous migrations):
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('profiles', 'events', 'car_presets', 'rides', 'ride_reservations');

