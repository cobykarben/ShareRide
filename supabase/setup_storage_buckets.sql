-- Setup Storage Buckets for ShareRide
-- 
-- IMPORTANT: This SQL script cannot create storage buckets directly.
-- Storage buckets must be created via the Supabase Dashboard or Storage API.
--
-- To create the buckets:
-- 1. Go to your Supabase Dashboard → Storage
-- 2. Click "New bucket"
-- 3. Create a bucket named "profile-pictures"
-- 4. Set it to "Public bucket" (so profile pictures can be accessed)
-- 5. Set up the following policies (see below)
--
-- Alternatively, you can use the Supabase CLI:
-- supabase storage create profile-pictures --public

-- Storage Policies for profile-pictures bucket
-- These policies allow authenticated users to upload their own profile pictures
-- and allow anyone to view profile pictures (public bucket)
--
-- Files are named: {user_id}-{timestamp}.{ext}
-- Since files are uploaded to bucket root, 'name' is just the filename
-- We check if the filename starts with the user's ID

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can upload their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own profile pictures" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile pictures" ON storage.objects;

-- Policy: Allow authenticated users to upload their own profile pictures
-- Check if filename starts with the user's ID (e.g., "user-uuid-1234567890.jpg")
CREATE POLICY "Users can upload their own profile pictures"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  name LIKE (auth.uid()::text || '-%')
);

-- Policy: Allow authenticated users to update their own profile pictures
CREATE POLICY "Users can update their own profile pictures"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  name LIKE (auth.uid()::text || '-%')
)
WITH CHECK (
  bucket_id = 'profile-pictures' AND
  name LIKE (auth.uid()::text || '-%')
);

-- Policy: Allow authenticated users to delete their own profile pictures
CREATE POLICY "Users can delete their own profile pictures"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-pictures' AND
  name LIKE (auth.uid()::text || '-%')
);

-- Policy: Allow anyone to view profile pictures (public bucket)
CREATE POLICY "Anyone can view profile pictures"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-pictures');

