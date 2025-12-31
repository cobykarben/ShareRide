-- =====================================================
-- FORCE DROP OLD SCHEMA TABLES
-- Run this directly in Supabase SQL Editor
-- This will check what exists and drop everything
-- =====================================================

-- Step 1: Drop the problematic view
DROP VIEW IF EXISTS public.ride_capacity_summary CASCADE;

-- Step 2: Drop all old schema tables (in dependency order)
-- Using CASCADE to automatically handle dependencies

-- Old ride-related tables (drop first due to dependencies)
DROP TABLE IF EXISTS public.ride_seat CASCADE;
DROP TABLE IF EXISTS public.ride_application CASCADE;
DROP TABLE IF EXISTS public.seat_hold CASCADE;
DROP TABLE IF EXISTS public.ride CASCADE;

-- Old user/role tables
DROP TABLE IF EXISTS public.driver CASCADE;
DROP TABLE IF EXISTS public.rider CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.app_user CASCADE;

-- Old vehicle tables
DROP TABLE IF EXISTS public.vehicle_seat_template CASCADE;
DROP TABLE IF EXISTS public.vehicle CASCADE;

-- Old event table
DROP TABLE IF EXISTS public.event CASCADE;

-- Other old tables
DROP TABLE IF EXISTS public.payment_intent CASCADE;
DROP TABLE IF EXISTS public.cost_quote CASCADE;
DROP TABLE IF EXISTS public.rating CASCADE;
DROP TABLE IF EXISTS public.notification_preference CASCADE;
DROP TABLE IF EXISTS public.notification CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.idempotency_key CASCADE;
DROP TABLE IF EXISTS public.feature_flag CASCADE;

-- Step 3: Verify what tables remain (should only be our new schema tables)
SELECT 
    tablename as "Table Name",
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED ✓'
        ELSE 'RLS DISABLED ✗'
    END as "RLS Status"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

