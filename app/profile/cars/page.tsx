"use client";

/**
 * Car Presets Management Page for ShareRide
 * 
 * This page allows users to view, edit, and delete their car presets.
 * Car presets are saved vehicle information that drivers can reuse when creating rides.
 * 
 * Features:
 * - List of user's car presets
 * - Create new car preset
 * - Edit existing car preset
 * - Delete car preset (with confirmation)
 * - Empty state when no presets exist
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useCarPresets } from "@/hooks/useCarPresets";
import { useAuth } from "@/hooks/useAuth";
import { RouteGuard } from "@/components/RouteGuard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Plus, Edit, Trash2, Car } from "lucide-react";
import type { Database } from "@/types/database.types";
import { formatSeatsForDisplay } from "@/lib/utils/seatConfig";
import { getAvailableSeatsForModel } from "@/lib/utils/carData";

type CarPreset = Database["public"]["Tables"]["car_presets"]["Row"];

export default function CarPresetsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const {
    carPresets,
    loading,
    error,
    fetchMyCarPresets,
    deleteCarPreset,
  } = useCarPresets();

  // Fetch car presets on mount
  useEffect(() => {
    if (user && !authLoading) {
      fetchMyCarPresets();
    }
  }, [user, authLoading, fetchMyCarPresets]);

  /**
   * Handle delete car preset
   */
  const handleDelete = async (id: string) => {
    try {
      const { error: deleteError } = await deleteCarPreset(id);

      if (deleteError) {
        throw deleteError;
      }

      toast.success("Car preset deleted successfully");
      // Refresh the list
      fetchMyCarPresets();
    } catch (err) {
      console.error("Error deleting car preset:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Failed to delete car preset"
      );
    }
  };

  /**
   * Format car preset display name
   */
  const getCarDisplayName = (preset: CarPreset): string => {
    if (preset.name) {
      return preset.name;
    }
    return `${preset.brand} ${preset.model}`;
  };

  /**
   * Format available seats display (using utility function)
   * If the car model has a known default seat configuration, use that as the reference.
   * Otherwise, show what's saved in the database.
   */
  const formatAvailableSeats = (preset: CarPreset): string => {
    // First, try to get expected seats from the model data
    const expectedSeats = getAvailableSeatsForModel(preset.brand, preset.model);
    
    // If we have expected seats from the model, use those for display
    // This ensures consistency with the car type
    if (expectedSeats.length > 0) {
      // If the saved seats match the expected (or are close), show the expected format
      // Otherwise, show what's actually saved (user customized it)
      const savedSeats = preset.default_available_seats || [];
      const savedSeatsSet = new Set(savedSeats);
      const expectedSeatsSet = new Set(expectedSeats);
      
      // Check if saved seats are a subset of expected (user unselected some)
      const isSubset = savedSeats.every(seat => expectedSeatsSet.has(seat));
      
      // If saved seats match expected or are a subset, show in the nice format
      // Otherwise, show what's actually saved
      if (savedSeats.length === 0 || isSubset) {
        // Show expected seats (what should be available for this model)
        return formatSeatsForDisplay(expectedSeats, { emptyMessage: "No default seats set" });
      } else {
        // User has customized beyond expected, show what's saved
        return formatSeatsForDisplay(savedSeats, { emptyMessage: "No default seats set" });
      }
    }
    
    // Fallback to showing what's saved in the database
    return formatSeatsForDisplay(preset.default_available_seats, { emptyMessage: "No default seats set" });
  };

  // Show loading state while checking auth or fetching
  if (authLoading || (user && loading && carPresets.length === 0 && !error)) {
    return (
      <RouteGuard>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading car presets...</p>
            </div>
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              My Car Presets
            </h1>
            <p className="text-muted-foreground">
              Manage your registered vehicles. Use these presets when creating rides.
            </p>
          </div>
          <Button asChild>
            <Link href="/profile/cars/new">
              <Plus className="mr-2 h-4 w-4" />
              Add New Car
            </Link>
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="border-destructive mb-6">
            <CardHeader>
              <CardTitle className="text-destructive">Error</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={fetchMyCarPresets} variant="outline">
                Try Again
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && carPresets.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Car className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No car presets yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add your first car preset to start creating rides. You'll need at least one
                car preset to drive.
              </p>
              <Button asChild>
                <Link href="/profile/cars/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Car
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Car Presets Grid */}
        {!loading && !error && carPresets.length > 0 && (
          <>
            {/* Results count */}
            <div className="mb-4 text-sm text-muted-foreground">
              {carPresets.length} {carPresets.length === 1 ? "car preset" : "car presets"}
            </div>

            {/* Grid of car preset cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {carPresets.map((preset) => (
                <Card key={preset.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-xl">{getCarDisplayName(preset)}</CardTitle>
                    </div>
                    <CardDescription className="space-y-1">
                      <div>{preset.brand} {preset.model}</div>
                      <div className="flex items-center gap-2">
                        <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: preset.color.toLowerCase() }}></span>
                        <span>{preset.color}</span>
                      </div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-2">
                    {/* License Plate */}
                    <div>
                      <span className="text-sm font-medium">License Plate: </span>
                      <span className="text-sm text-muted-foreground font-mono">
                        {preset.license_plate}
                      </span>
                    </div>

                    {/* Available Seats */}
                    <div>
                      <span className="text-sm font-medium">Default Seats: </span>
                      <span className="text-sm text-muted-foreground">
                        {formatAvailableSeats(preset)}
                      </span>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    {/* Edit Button */}
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => router.push(`/profile/cars/${preset.id}/edit`)}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>

                    {/* Delete Button with Confirmation */}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the car
                            preset &quot;{getCarDisplayName(preset)}&quot;. If you have any active
                            rides using this preset, you may need to update them.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(preset.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </RouteGuard>
  );
}

