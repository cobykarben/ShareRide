"use client";

/**
 * useReservations Hook for ShareRide
 *
 * This hook manages ride reservation operations including:
 * - Creating reservations (when riders reserve seats on rides)
 * - Canceling reservations (riders can cancel their own)
 * - Fetching reservations for a specific ride
 *
 * For Stage 1, all rides are free. Payment processing will be added in Stage 2.
 * Friend system requirement will also be added in Stage 2.
 *
 * Uses the Supabase client for all database operations.
 * RLS policies ensure proper access control.
 */

import { useState, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

// Type aliases for Reservation types from database
type RideReservation = Database["public"]["Tables"]["ride_reservations"]["Row"];
type RideReservationInsert = Database["public"]["Tables"]["ride_reservations"]["Insert"];
type Ride = Database["public"]["Tables"]["rides"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Extended type for reservation with related data
export interface ReservationWithDetails extends RideReservation {
  rider?: Profile | null;
  ride?: Ride | null;
}

// Return type for the hook
interface UseReservationsReturn {
  // Array of reservations (for a specific ride or user's reservations)
  reservations: ReservationWithDetails[];
  // Loading state
  loading: boolean;
  // Error state
  error: string | null;
  // Create a new reservation
  createReservation: (
    rideId: string,
    seatNumber: number
  ) => Promise<{ data: RideReservation | null; error: Error | null }>;
  // Cancel a reservation
  cancelReservation: (reservationId: string) => Promise<{ error: Error | null }>;
  // Fetch all reservations for a specific ride
  fetchReservationsForRide: (rideId: string) => Promise<void>;
  // Clear reservations array
  clearReservations: () => void;
}

export function useReservations(): UseReservationsReturn {
  const [reservations, setReservations] = useState<ReservationWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Use singleton Supabase client - memoized to ensure stable reference
  const supabase = useMemo(() => createClient(), []);

  /**
   * Fetch all reservations for a specific ride
   * Includes rider profile information for display
   *
   * @param rideId - The ID of the ride to fetch reservations for
   */
  const fetchReservationsForRide = useCallback(
    async (rideId: string) => {
      setLoading(true);
      setError(null);

      try {
        // Fetch reservations with rider profile information
        // RLS policies allow:
        // - Drivers to see all reservations for their rides
        // - Riders to see their own reservations
        // - Anyone to see confirmed reservations for active rides (to see which seats are taken)
        const { data, error: fetchError } = await supabase
          .from("ride_reservations")
          .select(
            `
            *,
            rider:rider_id (id, legal_first_name, legal_last_name, preferred_first_name, profile_picture_url)
          `
          )
          .eq("ride_id", rideId)
          .eq("status", "confirmed") // Only show confirmed reservations
          .order("created_at", { ascending: true });

        if (fetchError) {
          throw fetchError;
        }

        setReservations(data || []);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to fetch reservations";
        setError(errorMessage);
        console.error("Error fetching reservations:", err);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  /**
   * Create a new reservation
   * Validates prerequisites, seat availability, and constraints before creating
   *
   * Note: Prerequisites checking (canUserRide) should ideally be done server-side in API routes
   * for better security. RLS policies provide additional protection, but full validation
   * should be done server-side.
   *
   * @param rideId - The ID of the ride to reserve a seat on
   * @param seatNumber - The seat number to reserve
   * @returns Created reservation data or error
   */
  const createReservation = useCallback(
    async (
      rideId: string,
      seatNumber: number
    ): Promise<{ data: RideReservation | null; error: Error | null }> => {
      setLoading(true);
      setError(null);

      try {
        // Get current user to ensure they're authenticated
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("You must be logged in to reserve a seat");
        }

        // Step 1: Fetch the ride to validate it exists and get available seats
        const { data: ride, error: rideError } = await supabase
          .from("rides")
          .select("*")
          .eq("id", rideId)
          .eq("status", "active") // Only allow reservations on active rides
          .single();

        if (rideError || !ride) {
          throw new Error("Ride not found or no longer accepting reservations");
        }

        // Step 2: Validate seat number is in available_seats array
        if (!ride.available_seats || !ride.available_seats.includes(seatNumber)) {
          throw new Error(`Seat ${seatNumber} is not available for this ride`);
        }

        // Step 3: Check if seat is already reserved
        const { data: existingReservation, error: checkError } = await supabase
          .from("ride_reservations")
          .select("id")
          .eq("ride_id", rideId)
          .eq("seat_number", seatNumber)
          .eq("status", "confirmed")
          .single();

        if (checkError && checkError.code !== "PGRST116") {
          // PGRST116 is "not found" which is fine - seat is available
          throw new Error("Error checking seat availability");
        }

        if (existingReservation) {
          throw new Error(`Seat ${seatNumber} is already reserved`);
        }

        // Step 4: Check if user already has a reservation on this ride
        // (enforced by UNIQUE constraint, but check here for better error message)
        const { data: userReservation, error: userCheckError } = await supabase
          .from("ride_reservations")
          .select("id")
          .eq("ride_id", rideId)
          .eq("rider_id", user.id)
          .eq("status", "confirmed")
          .single();

        if (userCheckError && userCheckError.code !== "PGRST116") {
          throw new Error("Error checking existing reservations");
        }

        if (userReservation) {
          throw new Error("You already have a reservation on this ride");
        }

        // Step 5: Check if user is trying to reserve a seat on their own ride
        if (ride.driver_id === user.id) {
          throw new Error("You cannot reserve a seat on your own ride");
        }

        // Step 6: Create the reservation
        // For Stage 1, all rides are free, so no payment processing needed
        // cost_per_person, stripe_payment_intent_id are NULL
        // payment_status can be NULL for free rides (the DEFAULT 'pending' is for paid rides)
        const { data: newReservation, error: createError } = await supabase
          .from("ride_reservations")
          .insert({
            ride_id: rideId,
            rider_id: user.id,
            seat_number: seatNumber,
            status: "confirmed", // Default status
            // For Stage 1 (free rides), payment fields are NULL
            cost_per_person: null,
            stripe_payment_intent_id: null,
            payment_status: null, // NULL for free rides
          })
          .select()
          .single();

        if (createError) {
          // Log full error details for debugging
          console.error("[reservations] Create error details:", {
            code: createError.code,
            message: createError.message,
            details: createError.details,
            hint: createError.hint,
            error: createError,
          });

          // Handle unique constraint violations
          if (createError.code === "23505") {
            if (createError.message?.includes("ride_id, seat_number") || 
                createError.details?.includes("seat_number")) {
              throw new Error(`Seat ${seatNumber} is already reserved`);
            } else if (createError.message?.includes("ride_id, rider_id") ||
                       createError.details?.includes("rider_id")) {
              throw new Error("You already have a reservation on this ride");
            }
          }

          // Handle RLS policy violations
          if (createError.code === "42501" || createError.message?.includes("row-level security")) {
            throw new Error("You don't have permission to create this reservation. Please make sure you're logged in and meet all prerequisites.");
          }

          // Create a more descriptive error message
          const errorMessage = createError.message || 
                               createError.details || 
                               createError.hint ||
                               "Failed to create reservation";
          throw new Error(errorMessage);
        }

        setLoading(false);
        return { data: newReservation, error: null };
      } catch (err) {
        // Enhanced error logging
        console.error("[reservations] Error creating reservation:", {
          error: err,
          errorType: typeof err,
          errorMessage: err instanceof Error ? err.message : String(err),
          errorStack: err instanceof Error ? err.stack : undefined,
          errorString: JSON.stringify(err, Object.getOwnPropertyNames(err)),
        });

        const errorMessage =
          err instanceof Error 
            ? err.message 
            : typeof err === "string"
            ? err
            : "Failed to create reservation";
        
        setError(errorMessage);
        setLoading(false);
        return { data: null, error: err instanceof Error ? err : new Error(errorMessage) };
      }
    },
    [supabase]
  );

  /**
   * Cancel a reservation
   * Only allows cancellation if the current user is the rider
   * Updates the reservation status to 'cancelled'
   *
   * @param reservationId - The ID of the reservation to cancel
   * @returns An error if cancellation failed
   */
  const cancelReservation = useCallback(
    async (reservationId: string): Promise<{ error: Error | null }> => {
      setLoading(true);
      setError(null);

      try {
        // Get current user to verify rider_id
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("You must be logged in to cancel a reservation.");
        }

        // Update the reservation status to 'cancelled'
        // RLS policy ensures only the rider can update their own reservations
        const { error: cancelError } = await supabase
          .from("ride_reservations")
          .update({ status: "cancelled" })
          .eq("id", reservationId)
          .eq("rider_id", user.id); // Ensure user owns this reservation

        if (cancelError) {
          throw cancelError;
        }

        // Remove the reservation from the local state
        setReservations((prev) => prev.filter((res) => res.id !== reservationId));
        setLoading(false);
        return { error: null };
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to cancel reservation";
        setError(errorMessage);
        console.error("Error cancelling reservation:", err);
        setLoading(false);
        return { error: err instanceof Error ? err : new Error(errorMessage) };
      }
    },
    [supabase]
  );

  /**
   * Clear the reservations array.
   * Useful for resetting state.
   */
  const clearReservations = useCallback(() => {
    setReservations([]);
    setError(null);
  }, []);

  return {
    reservations,
    loading,
    error,
    createReservation,
    cancelReservation,
    fetchReservationsForRide,
    clearReservations,
  };
}

