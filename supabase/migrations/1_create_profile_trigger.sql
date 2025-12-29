-- Migration: Create auto-profile trigger
-- This trigger automatically creates a profile record when a new user signs up via Supabase Auth
-- Why: When someone signs up, we want to ensure they have a profile record immediately
-- This eliminates the need for manual profile creation in application code

-- Function: handle_new_user()
-- This function is called automatically when a new user is inserted into auth.users
-- It creates a corresponding profile record with default values
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert a new profile record for the newly created user
  -- All fields start as NULL/default - user will fill them out later via profile setup
  INSERT INTO public.profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;  -- Prevent duplicate if trigger runs twice (safety check)
  
  RETURN NEW;  -- Return the new user record
EXCEPTION
  -- Error handling: If something goes wrong, log it but don't fail the user creation
  WHEN OTHERS THEN
    -- Log the error (you can check Supabase logs if issues occur)
    RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;  -- Still allow user creation even if profile creation fails
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SECURITY DEFINER explanation:
-- This function runs with the privileges of the user who created it (usually postgres/superuser)
-- Why we need it: The function needs to INSERT into the profiles table, which has RLS enabled
-- Without SECURITY DEFINER, the trigger would run with the permissions of the user being created
-- (which doesn't exist yet), causing permission errors
-- With SECURITY DEFINER, it runs with elevated privileges, allowing it to bypass RLS for this specific operation

-- Trigger: Automatically create profile when user signs up
-- This trigger fires AFTER a new row is inserted into auth.users
-- It calls handle_new_user() function to create the profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- What happens when a user signs up:
-- 1. User signs up via Supabase Auth (email/password or OAuth)
-- 2. Supabase creates a row in auth.users table
-- 3. This trigger fires automatically
-- 4. handle_new_user() function runs and creates a row in profiles table
-- 5. User now has both an auth.users record AND a profiles record
-- 6. User can then fill out their profile information via the profile setup page

