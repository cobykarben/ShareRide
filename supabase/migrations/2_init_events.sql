-- Migration: Create events table
-- Events are central to ShareRide - every ride is tied to an event (concerts, games, conferences, etc.)
-- Users can create events, search for events, and view event details

-- Create events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event Details (Required)
  name TEXT NOT NULL,                       -- e.g., "Bills vs Patriots - December 27"
  start_datetime TIMESTAMPTZ NOT NULL,      -- When the event starts
  address TEXT NOT NULL,                    -- Event location address
  
  -- Location Coordinates (Optional - for map display in Stage 2)
  latitude DECIMAL(10, 8),                  -- Latitude for map display
  longitude DECIMAL(11, 8),                 -- Longitude for map display
  
  -- Optional Details
  description TEXT,                         -- Event description
  website_url TEXT,                         -- Link to event website
  image_url TEXT,                           -- Event image (stored in Supabase Storage)
  
  -- Metadata
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,  -- Who created the event
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for search and filtering performance
-- Index for filtering by date (common query: "show upcoming events")
CREATE INDEX idx_events_start_datetime ON events(start_datetime);

-- Index for searching by name (exact matches and sorting)
CREATE INDEX idx_events_name ON events(name);

-- Index for filtering by creator (show events I created)
CREATE INDEX idx_events_created_by ON events(created_by);

-- Full-text search index for event names (fuzzy search)
-- This enables efficient text search for event names
-- Uses PostgreSQL's GIN index with tsvector for fast full-text search
CREATE INDEX idx_events_name_search ON events USING gin(to_tsvector('english', name));

-- Enable Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Anyone can view events (public read)
-- Why: Users need to browse and search events without logging in
-- This allows public access to event listings
CREATE POLICY "Anyone can view events" ON events
  FOR SELECT USING (true);

-- RLS Policy: Authenticated users can create events
-- Why: Any logged-in user should be able to create events
-- The created_by field will be set to the current user's ID
CREATE POLICY "Authenticated users can create events" ON events
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- RLS Policy: Event creators can update their own events
-- Why: Only the user who created an event should be able to modify it
-- This prevents unauthorized edits
CREATE POLICY "Creators can update events" ON events
  FOR UPDATE USING (auth.uid() = created_by);

-- RLS Policy: Event creators can delete their own events
-- Why: Users should be able to delete events they created
CREATE POLICY "Creators can delete events" ON events
  FOR DELETE USING (auth.uid() = created_by);

-- Trigger: Automatically update updated_at timestamp when event is modified
CREATE TRIGGER update_events_updated_at 
  BEFORE UPDATE ON events
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

