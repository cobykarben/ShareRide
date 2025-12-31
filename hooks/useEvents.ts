"use client";

/**
 * useEvents Hook for ShareRide
 * 
 * This hook manages event-related data operations including:
 * - Fetching all events
 * - Searching events by name (fuzzy search)
 * - Filtering events by date
 * - Creating new events (requires authentication)
 * - Updating events (only if user created them)
 * - Deleting events (only if user created them)
 * 
 * Uses the Supabase client for all database operations.
 */

import { useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

// Type aliases for Event types from database
type Event = Database["public"]["Tables"]["events"]["Row"];
type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

// Date filter options
export type DateFilter = "all" | "upcoming" | "past" | "today" | "this_week" | "this_month";

// Return type for the hook
interface UseEventsReturn {
  // Array of events
  events: Event[];
  // Currently selected event (for detail view)
  currentEvent: Event | null;
  // Loading state
  loading: boolean;
  // Error state
  error: string | null;
  // Fetch all events
  fetchEvents: () => Promise<void>;
  // Search events by name (fuzzy search using full-text search)
  searchEvents: (query: string) => Promise<void>;
  // Filter events by date range
  filterEventsByDate: (filter: DateFilter) => Promise<void>;
  // Create a new event (requires authentication)
  createEvent: (eventData: EventInsert) => Promise<{ data: Event | null; error: Error | null }>;
  // Update an event (only if user created it)
  updateEvent: (id: string, updates: EventUpdate) => Promise<{ data: Event | null; error: Error | null }>;
  // Delete an event (only if user created it)
  deleteEvent: (id: string) => Promise<{ error: Error | null }>;
  // Fetch a single event by ID
  fetchEvent: (id: string) => Promise<void>;
  // Clear events array
  clearEvents: () => void;
}

export function useEvents(): UseEventsReturn {
  const [events, setEvents] = useState<Event[]>([]);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Use singleton Supabase client - memoized to ensure stable reference
  const supabase = useMemo(() => createClient(), []);

  /**
   * Fetch all events from the database
   * Orders by start_datetime (upcoming first)
   */
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("events")
        .select("*")
        .order("start_datetime", { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setEvents(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch events";
      setError(errorMessage);
      console.error("Error fetching events:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * Search events by name using PostgreSQL full-text search
   * Uses the GIN index on name for efficient fuzzy search
   * 
   * @param query - Search term (event name)
   */
  const searchEvents = useCallback(async (query: string) => {
    if (!query.trim()) {
      // If query is empty, fetch all events
      await fetchEvents();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use PostgreSQL full-text search with to_tsvector
      // This leverages the GIN index we created in the migration
      const { data, error: searchError } = await supabase
        .from("events")
        .select("*")
        .textSearch("name", query, {
          type: "websearch", // Modern PostgreSQL websearch syntax
          config: "english", // English language configuration
        })
        .order("start_datetime", { ascending: true });

      if (searchError) {
        // Fallback to ILIKE if full-text search fails
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("events")
          .select("*")
          .ilike("name", `%${query}%`)
          .order("start_datetime", { ascending: true });

        if (fallbackError) {
          throw fallbackError;
        }

        setEvents(fallbackData || []);
      } else {
        setEvents(data || []);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to search events";
      setError(errorMessage);
      console.error("Error searching events:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, fetchEvents]);

  /**
   * Filter events by date range
   * 
   * @param filter - Date filter option:
   *   - "all": All events
   *   - "upcoming": Events with start_datetime in the future
   *   - "past": Events with start_datetime in the past
   *   - "today": Events starting today
   *   - "this_week": Events starting this week
   *   - "this_month": Events starting this month
   */
  const filterEventsByDate = useCallback(async (filter: DateFilter) => {
    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      let query = supabase.from("events").select("*");

      switch (filter) {
        case "all":
          // No filter, get all events
          break;
        case "upcoming":
          // Events with start_datetime >= now
          query = query.gte("start_datetime", now.toISOString());
          break;
        case "past":
          // Events with start_datetime < now
          query = query.lt("start_datetime", now.toISOString());
          break;
        case "today": {
          // Events starting today (start of day to end of day)
          const startOfDay = new Date(now);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(now);
          endOfDay.setHours(23, 59, 59, 999);
          query = query
            .gte("start_datetime", startOfDay.toISOString())
            .lte("start_datetime", endOfDay.toISOString());
          break;
        }
        case "this_week": {
          // Events starting this week (today to end of week)
          const startOfWeek = new Date(now);
          startOfWeek.setHours(0, 0, 0, 0);
          const endOfWeek = new Date(now);
          endOfWeek.setDate(now.getDate() + (7 - now.getDay())); // End of week (Sunday)
          endOfWeek.setHours(23, 59, 59, 999);
          query = query
            .gte("start_datetime", startOfWeek.toISOString())
            .lte("start_datetime", endOfWeek.toISOString());
          break;
        }
        case "this_month": {
          // Events starting this month
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          startOfMonth.setHours(0, 0, 0, 0);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          endOfMonth.setHours(23, 59, 59, 999);
          query = query
            .gte("start_datetime", startOfMonth.toISOString())
            .lte("start_datetime", endOfMonth.toISOString());
          break;
        }
      }

      const { data, error: filterError } = await query.order("start_datetime", { ascending: true });

      if (filterError) {
        throw filterError;
      }

      setEvents(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to filter events";
      setError(errorMessage);
      console.error("Error filtering events:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * Create a new event
   * Requires authentication - sets created_by to current user's ID
   * 
   * @param eventData - Event data to insert (name, start_datetime, address are required)
   * @returns Created event data or error
   */
  const createEvent = useCallback(async (eventData: EventInsert) => {
    setLoading(true);
    setError(null);

    try {
      // Get current user to set created_by
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to create an event");
      }

      // Set created_by to current user's ID
      const eventWithCreator = {
        ...eventData,
        created_by: user.id,
      };

      const { data, error: createError } = await supabase
        .from("events")
        .insert(eventWithCreator)
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Add new event to the events array
      setEvents((prev) => [data, ...prev]);
      setLoading(false);
      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create event";
      setError(errorMessage);
      console.error("Error creating event:", err);
      setLoading(false);
      return { data: null, error: err instanceof Error ? err : new Error(errorMessage) };
    }
  }, [supabase]);

  /**
   * Update an event
   * Only allows update if the current user created the event
   * 
   * @param id - Event ID to update
   * @param updates - Fields to update
   * @returns Updated event data or error
   */
  const updateEvent = useCallback(async (id: string, updates: EventUpdate) => {
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to update an event");
      }

      // First, check if user created this event
      const { data: existingEvent, error: fetchError } = await supabase
        .from("events")
        .select("created_by")
        .eq("id", id)
        .single();

      if (fetchError) {
        throw new Error("Event not found");
      }

      if (existingEvent.created_by !== user.id) {
        throw new Error("You can only update events you created");
      }

      // Update the event
      const { data, error: updateError } = await supabase
        .from("events")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        throw updateError;
      }

      // Update the event in the events array
      setEvents((prev) => prev.map((event) => (event.id === id ? data : event)));
      // Update currentEvent if it's the one being updated
      if (currentEvent?.id === id) {
        setCurrentEvent(data);
      }
      setLoading(false);
      return { data, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to update event";
      setError(errorMessage);
      console.error("Error updating event:", err);
      setLoading(false);
      return { data: null, error: err instanceof Error ? err : new Error(errorMessage) };
    }
  }, [supabase, currentEvent]);

  /**
   * Delete an event
   * Only allows deletion if the current user created the event
   * 
   * @param id - Event ID to delete
   * @returns Error if deletion failed
   */
  const deleteEvent = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to delete an event");
      }

      // First, check if user created this event
      const { data: existingEvent, error: fetchError } = await supabase
        .from("events")
        .select("created_by")
        .eq("id", id)
        .single();

      if (fetchError) {
        throw new Error("Event not found");
      }

      if (existingEvent.created_by !== user.id) {
        throw new Error("You can only delete events you created");
      }

      // Delete the event
      const { error: deleteError } = await supabase
        .from("events")
        .delete()
        .eq("id", id);

      if (deleteError) {
        throw deleteError;
      }

      // Remove the event from the events array
      setEvents((prev) => prev.filter((event) => event.id !== id));
      // Clear currentEvent if it's the one being deleted
      if (currentEvent?.id === id) {
        setCurrentEvent(null);
      }
      setLoading(false);
      return { error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete event";
      setError(errorMessage);
      console.error("Error deleting event:", err);
      setLoading(false);
      return { error: err instanceof Error ? err : new Error(errorMessage) };
    }
  }, [supabase, currentEvent]);

  /**
   * Fetch a single event by ID
   * Sets it as the currentEvent
   * 
   * @param id - Event ID to fetch
   */
  const fetchEvent = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      setCurrentEvent(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to fetch event";
      setError(errorMessage);
      console.error("Error fetching event:", err);
      setCurrentEvent(null);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * Clear the events array
   * Useful for resetting state
   */
  const clearEvents = useCallback(() => {
    setEvents([]);
    setCurrentEvent(null);
    setError(null);
  }, []);

  return {
    events,
    currentEvent,
    loading,
    error,
    fetchEvents,
    searchEvents,
    filterEventsByDate,
    createEvent,
    updateEvent,
    deleteEvent,
    fetchEvent,
    clearEvents,
  };
}

