-- Migration: Create profiles table
-- This table extends Supabase's built-in auth.users table
-- ShareRide uses unified profiles - there's NO distinction between "driver" and "rider" profiles
-- Everyone has the same profile structure and can both drive and ride (as long as they meet prerequisites)

-- Create profiles table
CREATE TABLE profiles (
  -- Links to Supabase auth.users.id (primary key)
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Info (Required for riding)
  legal_first_name TEXT,                    -- Required to ride/drive
  legal_last_name TEXT,                     -- Required to ride/drive
  preferred_first_name TEXT,                -- Optional display name
  phone TEXT,                               -- Phone number (verified separately)
  phone_verified BOOLEAN DEFAULT FALSE,     -- Whether phone is verified
  profile_picture_url TEXT,                 -- URL to profile picture (stored in Supabase Storage)
  
  -- Payment Info (Required for paid rides - Stage 2)
  stripe_customer_id TEXT,                  -- Stripe customer ID (for riders to pay)
  stripe_payment_method_id TEXT,            -- Default payment method ID
  
  -- Driver Payment Info (Required to receive payments as driver - Stage 2)
  stripe_connect_account_id TEXT,           -- Stripe Connect Express account ID
  stripe_connect_onboarding_complete BOOLEAN DEFAULT FALSE,  -- Whether Stripe onboarding is done
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster lookups
CREATE INDEX idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX idx_profiles_stripe_connect ON profiles(stripe_connect_account_id);

-- Enable Row Level Security (RLS)
-- RLS is a PostgreSQL feature that adds an extra layer of security by restricting
-- which rows users can access based on policies. This ensures users can only
-- access data they're authorized to see.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view all profiles
-- Why: When viewing rides, we need to see driver and rider info (names, avatars, etc.)
-- This allows public read access while still protecting writes
CREATE POLICY "Users can view all profiles" ON profiles
  FOR SELECT USING (true);

-- RLS Policy: Users can only update their own profile
-- Why: Users should only be able to modify their own information
-- auth.uid() returns the current authenticated user's ID from Supabase Auth
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policy: Users can insert their own profile
-- Why: Needed for the auto-profile trigger to work (creates profile on signup)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to automatically update updated_at timestamp
-- This function is called by a trigger before any UPDATE operation
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Automatically update updated_at when profile is modified
-- This ensures we always know when a profile was last updated
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

