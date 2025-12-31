-- Force Drop Old Schema Tables
-- Run this directly in Supabase SQL Editor to force-drop any old tables that exist
-- This will handle cases where migrations might not be applying correctly

-- First, let's see what actually exists
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Check and drop the view
    IF EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'ride_capacity_summary') THEN
        DROP VIEW public.ride_capacity_summary CASCADE;
        RAISE NOTICE 'Dropped view: ride_capacity_summary';
    ELSE
        RAISE NOTICE 'View ride_capacity_summary does not exist';
    END IF;

    -- List of old tables to check and drop
    FOR r IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name IN (
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
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS public.%I CASCADE', r.table_name);
        RAISE NOTICE 'Dropped table: %', r.table_name;
    END LOOP;
END $$;

-- Verify what tables exist now (should only show our new schema tables)
SELECT 
    tablename as "Table Name",
    CASE 
        WHEN rowsecurity THEN 'RLS ENABLED ✓'
        ELSE 'RLS DISABLED ✗'
    END as "RLS Status"
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- Verify views
SELECT 
    viewname as "View Name"
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

