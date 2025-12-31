-- Verification Script: Check tables and RLS status
-- Run this in Supabase SQL Editor to verify current state

-- Check all tables in public schema
SELECT 
    tablename,
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED ✓'
        ELSE 'RLS DISABLED ✗'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check views in public schema
SELECT 
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- List all our current schema tables (should all have RLS enabled)
SELECT 
    'Current Schema Tables' as category,
    tablename,
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED ✓'
        ELSE 'RLS DISABLED ✗ - NEEDS FIX'
    END as rls_status
FROM pg_tables 
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'events', 'car_presets', 'rides', 'ride_reservations')
ORDER BY tablename;

