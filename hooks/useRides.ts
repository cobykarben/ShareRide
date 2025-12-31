"use client";

/**
 * useRides Hook for ShareRide
 * 
 * This hook manages ride-related data operations including:
 * - Fetching rides by event
 * - Fetching user's rides (as driver)
 * - Fetching user's reservations (as rider)
 * - Fetching a specific ride with reservations
 * - Creating new rides (requires user can drive)
 * - Updating rides (only driver)
 * - Cancelling rides (only driver)
 * 
 * Uses the Supabase client for all database operations.
 * RLS policies ensure proper access control.
 */

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

// Type aliases for Ride and RideReservation types from database
type Ride = Database["public"]["Tables"]["rides"]["Row"];
type RideInsert = Database["public"]["Tables"]["rides"]["Insert"];
type RideUpdate = Database["public"]["Tables"]["rides"]["Update"];
type RideReservation = Database["public"]["Tables"]["ride_reservations"]["Row"];

// Extended type for ride with reservations
export interface RideWithReservations extends Ride {
  reservations?: RideReservation[];
}

// Return type for the hook
interface UseRidesReturn {
  // Array of rides
  rides: Ride[];
  // Currently selected ride (for detail view)
  currentRide: RideWithReservations | null;
  // User's ride reservations (as rider)
  myReservations: RideReservation[];
  // Loading state
  loading: boolean;
  // Error state
  error: string | null;
  // Fetch all rides for a specific event
  fetchRidesByEvent: (eventId: string) => Promise<void>;
  // Fetch current user's rides (as driver)
  fetchMyRides: () => Promise<void>;
  // Fetch current user's ride reservations (as rider)
  fetchMyReservations: () => Promise<void>;
  // Fetch a specific ride with all details and reservations
  fetchRide: (id: string) => Promise<void>;
  // Create a new ride (requires user can drive)
  createRide: (
    rideData: Omit<RideInsert, "driver_id" | "status">
  ) => Promise<{ data: Ride | null; error: Error | null }>;
  // Update a ride (only driver)
  updateRide: (
    id: string,
    updates: RideUpdate
  ) => Promise<{ data: Ride | null; error: Error | null }>;
  // Cancel a ride (only driver, updates status to 'cancelled')
  cancelRide: (id: string) => Promise<{ error: Error | null }>;
  // Clear rides array
  clearRides: () => void;
}

export function useRides(): UseRidesReturn {
  const [rides, setRides] = useState<Ride[]>([]);
  const [currentRide, setCurrentRide] = useState<RideWithReservations | null>(null);
  const [myReservations, setMyReservations] = useState<RideReservation[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  /**
   * Fetch all rides for a specific event
   * Only returns active rides (filtered by RLS policy)
   * Orders by departure_datetime (earliest first)
   * 
   * @param eventId - Event ID to fetch rides for
   */
  const fetchRidesByEvent = useCallback(
    async (eventId: string) => {
      setLoading(true);
      setError(null);

      try {
        // Fetch active rides for the event
        // RLS policy ensures only active rides are visible to everyone
        const { data, error: fetchError } = await supabase
          .from("rides")
          .select("*")
          .eq("event_id", eventId)
          .eq("status", "active") // Only active rides
          .order("departure_datetime", { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        setRides(data || []);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch rides";
        setError(errorMessage);
        console.error("Error fetching rides by event:", err);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  /**
   * Fetch current user's rides (as driver)
   * Returns all rides the user is driving (any status)
   * Orders by departure_datetime (upcoming first)
   */
  const fetchMyRides = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in to view your rides");
      }

      // Fetch rides where user is the driver
      // RLS policy allows drivers to see their own rides (any status)
      const { data, error: fetchError } = await supabase
        .from("rides")
        .select("*")
        .eq("driver_id", user.id)
        .order("departure_datetime", { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      setRides(data || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch your rides";
      setError(errorMessage);
      console.error("Error fetching my rides:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * Fetch current user's ride reservations (as rider)
   * Returns all reservations where user is the rider
   * Orders by created_at (newest first)
   */
  const fetchMyReservations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in to view your reservations");
      }

      // Fetch reservations where user is the rider
      // RLS policy allows riders to see their own reservations
      const { data, error: fetchError } = await supabase
        .from("ride_reservations")
        .select("*")
        .eq("rider_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setMyReservations(data || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch your reservations";
      setError(errorMessage);
      console.error("Error fetching my reservations:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * Fetch a specific ride with all details and reservations
   * Also fetches associated reservations to show seat availability
   * 
   * @param id - Ride ID
   */
  const fetchRide = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);

      try {
        // Fetch the ride
        const { data: rideData, error: rideError } = await supabase
          .from("rides")
          .select("*")
          .eq("id", id)
          .single();

        if (rideError) {
          throw rideError;
        }

        // Fetch reservations for this ride
        // RLS policies allow:
        // - Riders to see their own reservations
        // - Drivers to see all reservations for their rides
        const { data: reservationsData, error: reservationsError } = await supabase
          .from("ride_reservations")
          .select("*")
          .eq("ride_id", id)
          .eq("status", "confirmed"); // Only show confirmed reservations (exclude cancelled)

        if (reservationsError) {
          console.warn("Error fetching reservations (non-fatal):", reservationsError);
          // Non-fatal - continue without reservations
        }

        // Combine ride with reservations
        const rideWithReservations: RideWithReservations = {
          ...rideData,
          reservations: reservationsData || [],
        };

        setCurrentRide(rideWithReservations);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch ride";
        setError(errorMessage);
        console.error("Error fetching ride:", err);
        setCurrentRide(null);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  /**
   * Create a new ride
   * Automatically sets driver_id to current user
   * 
   * Note: Prerequisites checking (canUserDrive) should ideally be done server-side in API routes
   * for better security. RLS policies provide additional protection, but full validation
   * should be done server-side.
   * 
   * @param rideData - Ride data (driver_id will be set automatically)
   * @returns Created ride data or error
   */
  const createRide = useCallback(
    async (
      rideData: Omit<RideInsert, "driver_id" | "status">
    ): Promise<{ data: Ride | null; error: Error | null }> => {
      setLoading(true);
      setError(null);

      try {
        // Get current user to set driver_id
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("You must be logged in to create a ride");
        }

        // Set driver_id to current user and status to 'active'
        const rideWithDriver = {
          ...rideData,
          driver_id: user.id,
          status: "active" as const,
        };

        // Insert the ride
        // RLS policy ensures users can only create rides for themselves
        const { data, error: createError } = await supabase
          .from("rides")
          .insert(rideWithDriver)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        // Add new ride to the rides array
        setRides((prev) => [data, ...prev]);
        setLoading(false);
        return { data, error: null };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create ride";
        setError(errorMessage);
        console.error("Error creating ride:", err);
        setLoading(false);
        return {
          data: null,
          error: err instanceof Error ? err : new Error(errorMessage),
        };
      }
    },
    [supabase]
  );

  /**
   * Update a ride
   * Only allows update if the current user is the driver
   * 
   * @param id - Ride ID to update
   * @param updates - Fields to update
   * @returns Updated ride data or error
   */
  const updateRide = useCallback(
    async (
      id: string,
      updates: RideUpdate
    ): Promise<{ data: Ride | null; error: Error | null }> => {
      setLoading(true);
      setError(null);

      try {
        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("You must be logged in to update a ride");
        }

        // First, check if user is the driver of this ride
        const { data: existingRide, error: fetchError } = await supabase
          .from("rides")
          .select("driver_id")
          .eq("id", id)
          .single();

        if (fetchError) {
          throw new Error("Ride not found");
        }

        if (existingRide.driver_id !== user.id) {
          throw new Error("You can only update rides you are driving");
        }

        // Update the ride
        // RLS policy provides additional security
        const { data, error: updateError } = await supabase
          .from("rides")
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        // Update the ride in the rides array
        setRides((prev) => prev.map((ride) => (ride.id === id ? data : ride)));
        // Update currentRide if it's the one being updated
        if (currentRide?.id === id) {
          setCurrentRide({ ...data, reservations: currentRide.reservations });
        }
        setLoading(false);
        return { data, error: null };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update ride";
        setError(errorMessage);
        console.error("Error updating ride:", err);
        setLoading(false);
        return {
          data: null,
          error: err instanceof Error ? err : new Error(errorMessage),
        };
      }
    },
    [supabase, currentRide]
  );

  /**
   * Cancel a ride
   * Only allows cancellation if the current user is the driver
   * Updates status to 'cancelled'
   * 
   * @param id - Ride ID to cancel
   * @returns Error if cancellation failed
   */
  const cancelRide = useCallback(
    async (id: string): Promise<{ error: Error | null }> => {
      setLoading(true);
      setError(null);

      try {
        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("You must be logged in to cancel a ride");
        }

        // First, check if user is the driver of this ride
        const { data: existingRide, error: fetchError } = await supabase
          .from("rides")
          .select("driver_id")
          .eq("id", id)
          .single();

        if (fetchError) {
          throw new Error("Ride not found");
        }

        if (existingRide.driver_id !== user.id) {
          throw new Error("You can only cancel rides you are driving");
        }

        // Update status to 'cancelled'
        const { error: updateError } = await supabase
          .from("rides")
          .update({ status: "cancelled" })
          .eq("id", id);

        if (updateError) {
          throw updateError;
        }

        // Update the ride in the rides array
        setRides((prev) =>
          prev.map((ride) =>
            ride.id === id ? { ...ride, status: "cancelled" } : ride
          )
        );
        // Update currentRide if it's the one being cancelled
        if (currentRide?.id === id) {
          setCurrentRide({ ...currentRide, status: "cancelled" });
        }
        setLoading(false);
        return { error: null };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to cancel ride";
        setError(errorMessage);
        console.error("Error cancelling ride:", err);
        setLoading(false);
        return {
          error: err instanceof Error ? err : new Error(errorMessage),
        };
      }
    },
    [supabase, currentRide]
  );

  /**
   * Clear the rides array
   * Useful for resetting state
   */
  const clearRides = useCallback(() => {
    setRides([]);
    setCurrentRide(null);
    setMyReservations([]);
    setError(null);
  }, []);

  return {
    rides,
    currentRide,
    myReservations,
    loading,
    error,
    fetchRidesByEvent,
    fetchMyRides,
    fetchMyReservations,
    fetchRide,
    createRide,
    updateRide,
    cancelRide,
    clearRides,
  };
}

