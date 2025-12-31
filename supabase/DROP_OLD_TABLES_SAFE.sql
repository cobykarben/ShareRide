-- =====================================================
-- SAFE DROP OLD SCHEMA TABLES - READ FIRST
-- This script first shows you what exists, then drops
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: CHECK WHAT OLD TABLES/VIEWS EXIST
-- Run this section first to see what will be dropped
-- =====================================================

-- Check for the problematic view
SELECT 
    'VIEW' as "Type",
    viewname as "Name",
    'Will be DROPPED' as "Action"
FROM pg_views
WHERE schemaname = 'public'
AND viewname = 'ride_capacity_summary'

UNION ALL

-- Check for old tables
SELECT 
    'TABLE' as "Type",
    tablename as "Name",
    CASE 
        WHEN rowsecurity THEN 'Will be DROPPED (RLS was enabled)'
        ELSE 'Will be DROPPED (RLS was DISABLED - SECURITY RISK)'
    END as "Action"
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN (
    'app_user',
    'user_roles',
    'driver',
    'rider',
    'event',
    'vehicle',
    'vehicle_seat_template',
    'ride',
    'ride_seat',
    'ride_application',
    'seat_hold',
    'payment_intent',
    'cost_quote',
    'rating',
    'notification',
    'notification_preference',
    'audit_log',
    'idempotency_key',
    'feature_flag'
)
ORDER BY "Type", "Name";

-- =====================================================
-- STEP 2: VERIFY OUR NEW SCHEMA TABLES (should remain)
-- These are the tables we WANT to keep
-- =====================================================

SELECT 
    'KEEPING' as "Status",
    tablename as "Table Name",
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED ✓'
        ELSE 'RLS DISABLED ✗ - NEEDS ATTENTION'
    END as "RLS Status"
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'events', 'car_presets', 'rides', 'ride_reservations')
ORDER BY tablename;

-- =====================================================
-- STEP 3: REVIEW THE RESULTS ABOVE
-- If the old tables shown in STEP 1 should be dropped, proceed to STEP 4
-- =====================================================

-- =====================================================
-- STEP 4: DROP OLD TABLES/VIEWS
-- UNCOMMENT AND RUN THIS SECTION ONLY AFTER REVIEWING STEPS 1 & 2
-- =====================================================

/*
-- Drop the problematic view
DROP VIEW IF EXISTS public.ride_capacity_summary CASCADE;

-- Drop old tables (in dependency order)
DROP TABLE IF EXISTS public.ride_seat CASCADE;
DROP TABLE IF EXISTS public.ride_application CASCADE;
DROP TABLE IF EXISTS public.seat_hold CASCADE;
DROP TABLE IF EXISTS public.ride CASCADE;
DROP TABLE IF EXISTS public.driver CASCADE;
DROP TABLE IF EXISTS public.rider CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.app_user CASCADE;
DROP TABLE IF EXISTS public.vehicle_seat_template CASCADE;
DROP TABLE IF EXISTS public.vehicle CASCADE;
DROP TABLE IF EXISTS public.event CASCADE;
DROP TABLE IF EXISTS public.payment_intent CASCADE;
DROP TABLE IF EXISTS public.cost_quote CASCADE;
DROP TABLE IF EXISTS public.rating CASCADE;
DROP TABLE IF EXISTS public.notification_preference CASCADE;
DROP TABLE IF EXISTS public.notification CASCADE;
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.idempotency_key CASCADE;
DROP TABLE IF EXISTS public.feature_flag CASCADE;

-- Verification: Show what tables remain
SELECT 
    'FINAL STATE' as "Status",
    tablename as "Table Name",
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED ✓'
        ELSE 'RLS DISABLED ✗'
    END as "RLS Status"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
*/

