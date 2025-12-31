-- =====================================================
-- EXECUTE: DROP OLD SCHEMA TABLES
-- This script actually drops the old tables
-- Based on the safe script results, all these tables exist and need to be dropped
-- =====================================================

-- Drop the problematic view (fixes Security Definer View error)
DROP VIEW IF EXISTS public.ride_capacity_summary CASCADE;

-- Drop old tables in dependency order (CASCADE handles dependencies automatically)
-- All of these have RLS DISABLED which is a security risk

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

-- =====================================================
-- VERIFICATION: Show final state after drops
-- =====================================================

-- Show all remaining tables (should only be our new schema tables)
SELECT 
    tablename as "Table Name",
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED ✓'
        ELSE 'RLS DISABLED ✗'
    END as "RLS Status"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Show any remaining views (should be none)
SELECT 
    viewname as "View Name"
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;
