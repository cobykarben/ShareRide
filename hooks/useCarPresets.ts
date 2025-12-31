"use client";

/**
 * useCarPresets Hook for ShareRide
 * 
 * This hook manages car preset-related data operations including:
 * - Fetching user's car presets
 * - Fetching a specific car preset
 * - Creating new car presets (requires authentication and prerequisites)
 * - Updating car presets (only if user owns them)
 * - Deleting car presets (only if user owns them)
 * 
 * Uses the Supabase client for all database operations.
 * RLS policies ensure users can only access their own car presets.
 */

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

// Type aliases for CarPreset types from database
type CarPreset = Database["public"]["Tables"]["car_presets"]["Row"];
type CarPresetInsert = Database["public"]["Tables"]["car_presets"]["Insert"];
type CarPresetUpdate = Database["public"]["Tables"]["car_presets"]["Update"];

// Return type for the hook
interface UseCarPresetsReturn {
  // Array of user's car presets
  carPresets: CarPreset[];
  // Currently selected car preset (for detail/edit view)
  currentCarPreset: CarPreset | null;
  // Loading state
  loading: boolean;
  // Error state
  error: string | null;
  // Fetch all car presets for current user
  fetchMyCarPresets: () => Promise<void>;
  // Fetch a specific car preset by ID
  fetchCarPreset: (id: string) => Promise<void>;
  // Create a new car preset (requires authentication)
  createCarPreset: (
    carPresetData: Omit<CarPresetInsert, "user_id">
  ) => Promise<{ data: CarPreset | null; error: Error | null }>;
  // Update a car preset (only if user owns it)
  updateCarPreset: (
    id: string,
    updates: CarPresetUpdate
  ) => Promise<{ data: CarPreset | null; error: Error | null }>;
  // Delete a car preset (only if user owns it)
  deleteCarPreset: (id: string) => Promise<{ error: Error | null }>;
  // Clear car presets array
  clearCarPresets: () => void;
}

export function useCarPresets(): UseCarPresetsReturn {
  const [carPresets, setCarPresets] = useState<CarPreset[]>([]);
  const [currentCarPreset, setCurrentCarPreset] = useState<CarPreset | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  /**
   * Fetch all car presets for the current authenticated user
   * Orders by created_at (newest first)
   */
  const fetchMyCarPresets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get current user to ensure they're authenticated
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be logged in to view car presets");
      }

      // Fetch car presets for the current user
      // RLS policies ensure users can only see their own presets
      const { data, error: fetchError } = await supabase
        .from("car_presets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw fetchError;
      }

      setCarPresets(data || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch car presets";
      setError(errorMessage);
      console.error("Error fetching car presets:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * Fetch a specific car preset by ID
   * Only works if the current user owns the preset (enforced by RLS)
   * 
   * @param id - Car preset ID
   */
  const fetchCarPreset = useCallback(
    async (id: string) => {
      setLoading(true);
      setError(null);

      try {
        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("You must be logged in to view car presets");
        }

        // Fetch the specific car preset
        // RLS policies ensure users can only see their own presets
        const { data, error: fetchError } = await supabase
          .from("car_presets")
          .select("*")
          .eq("id", id)
          .eq("user_id", user.id) // Extra check to ensure ownership
          .single();

        if (fetchError) {
          throw fetchError;
        }

        setCurrentCarPreset(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to fetch car preset";
        setError(errorMessage);
        console.error("Error fetching car preset:", err);
        setCurrentCarPreset(null);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  /**
   * Create a new car preset
   * Automatically sets user_id to current user
   * 
   * Note: While prerequisites checking (canUserDrive) should ideally be done server-side,
   * RLS policies ensure only authenticated users can create presets for themselves.
   * Full prerequisites validation should be done in API routes or Server Actions.
   * 
   * @param carPresetData - Car preset data (user_id will be set automatically)
   * @returns Created car preset data or error
   */
  const createCarPreset = useCallback(
    async (
      carPresetData: Omit<CarPresetInsert, "user_id">
    ): Promise<{ data: CarPreset | null; error: Error | null }> => {
      setLoading(true);
      setError(null);

      try {
        // Get current user to set user_id
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("You must be logged in to create a car preset");
        }

        // Set user_id to current user
        const presetWithUser = {
          ...carPresetData,
          user_id: user.id,
        };

        // Insert the car preset
        // RLS policies ensure users can only create presets for themselves
        const { data, error: createError } = await supabase
          .from("car_presets")
          .insert(presetWithUser)
          .select()
          .single();

        if (createError) {
          // Check if it's a unique constraint violation (duplicate license plate)
          if (createError.code === "23505") {
            throw new Error(
              "A car preset with this license plate already exists. Please use a different license plate."
            );
          }
          throw createError;
        }

        // Add new preset to the carPresets array
        setCarPresets((prev) => [data, ...prev]);
        setLoading(false);
        return { data, error: null };
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to create car preset";
        setError(errorMessage);
        console.error("Error creating car preset:", err);
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
   * Update a car preset
   * Only allows update if the current user owns the preset
   * 
   * @param id - Car preset ID to update
   * @param updates - Fields to update
   * @returns Updated car preset data or error
   */
  const updateCarPreset = useCallback(
    async (
      id: string,
      updates: CarPresetUpdate
    ): Promise<{ data: CarPreset | null; error: Error | null }> => {
      setLoading(true);
      setError(null);

      try {
        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          throw new Error("You must be logged in to update a car preset");
        }

        // First, check if user owns this preset
        const { data: existingPreset, error: fetchError } = await supabase
          .from("car_presets")
          .select("user_id")
          .eq("id", id)
          .single();

        if (fetchError) {
          throw new Error("Car preset not found");
        }

        if (existingPreset.user_id !== user.id) {
          throw new Error("You can only update car presets you own");
        }

        // Update the car preset
        // RLS policies provide additional security
        const { data, error: updateError } = await supabase
          .from("car_presets")
          .update(updates)
          .eq("id", id)
          .select()
          .single();

        if (updateError) {
          // Check if it's a unique constraint violation (duplicate license plate)
          if (updateError.code === "23505") {
            throw new Error(
              "A car preset with this license plate already exists. Please use a different license plate."
            );
          }
          throw updateError;
        }

        // Update the preset in the carPresets array
        setCarPresets((prev) =>
          prev.map((preset) => (preset.id === id ? data : preset))
        );
        // Update currentCarPreset if it's the one being updated
        if (currentCarPreset?.id === id) {
          setCurrentCarPreset(data);
        }
        setLoading(false);
        return { data, error: null };
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to update car preset";
        setError(errorMessage);
        console.error("Error updating car preset:", err);
        setLoading(false);
        return {
          data: null,
          error: err instanceof Error ? err : new Error(errorMessage),
        };
      }
    },
    [supabase, currentCarPreset]
  );

  /**
   * Delete a car preset
   * Only allows deletion if the current user owns the preset
   * 
   * @param id - Car preset ID to delete
   * @returns Error if deletion failed
   */
  const deleteCarPreset = useCallback(
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
          throw new Error("You must be logged in to delete a car preset");
        }

        // First, check if user owns this preset
        const { data: existingPreset, error: fetchError } = await supabase
          .from("car_presets")
          .select("user_id")
          .eq("id", id)
          .single();

        if (fetchError) {
          throw new Error("Car preset not found");
        }

        if (existingPreset.user_id !== user.id) {
          throw new Error("You can only delete car presets you own");
        }

        // Delete the car preset
        // RLS policies provide additional security
        const { error: deleteError } = await supabase
          .from("car_presets")
          .delete()
          .eq("id", id);

        if (deleteError) {
          throw deleteError;
        }

        // Remove the preset from the carPresets array
        setCarPresets((prev) => prev.filter((preset) => preset.id !== id));
        // Clear currentCarPreset if it's the one being deleted
        if (currentCarPreset?.id === id) {
          setCurrentCarPreset(null);
        }
        setLoading(false);
        return { error: null };
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to delete car preset";
        setError(errorMessage);
        console.error("Error deleting car preset:", err);
        setLoading(false);
        return {
          error: err instanceof Error ? err : new Error(errorMessage),
        };
      }
    },
    [supabase, currentCarPreset]
  );

  /**
   * Clear the car presets array
   * Useful for resetting state
   */
  const clearCarPresets = useCallback(() => {
    setCarPresets([]);
    setCurrentCarPreset(null);
    setError(null);
  }, []);

  return {
    carPresets,
    currentCarPreset,
    loading,
    error,
    fetchMyCarPresets,
    fetchCarPreset,
    createCarPreset,
    updateCarPreset,
    deleteCarPreset,
    clearCarPresets,
  };
}

