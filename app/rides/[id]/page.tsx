"use client";

/**
 * Ride Detail Page for ShareRide
 * 
 * This page displays full ride details including:
 * - Event details (name, date, location)
 * - Driver info (name, avatar)
 * - Car preset info (brand/model/color, license plate)
 * - Departure time (or time range) and location
 * - Pickup mode and radius (if applicable)
 * - Whether ride is free or paid
 * - Current riders (from reservations)
 * - Seat list/display (SeatList component)
 * - Action buttons (Reserve Seat for riders, Edit/Cancel for driver)
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Car,
  User,
  Clock,
  Edit,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useRides } from "@/hooks/useRides";
import { useEvents } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { useCarPresets } from "@/hooks/useCarPresets";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { SeatList } from "@/components/SeatList";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import type { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export default function RideDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rideId = params.id as string;

  const { user } = useAuth();
  const { currentRide, loading, error, fetchRide, cancelRide } = useRides();
  const { currentEvent, fetchEvent } = useEvents();
  const { currentCarPreset, fetchCarPreset } = useCarPresets();
  const [driverProfile, setDriverProfile] = useState<Profile | null>(null);
  const [loadingDriver, setLoadingDriver] = useState(false);

  // Fetch ride on mount
  useEffect(() => {
    if (rideId) {
      fetchRide(rideId);
    }
  }, [rideId, fetchRide]);

  // Fetch event when ride is loaded
  useEffect(() => {
    if (currentRide?.event_id) {
      fetchEvent(currentRide.event_id);
    }
  }, [currentRide?.event_id, fetchEvent]);

  // Fetch car preset when ride is loaded
  useEffect(() => {
    if (currentRide?.car_preset_id) {
      // For car presets, we need to fetch via Supabase directly since we might not own it
      const fetchCarPresetData = async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("car_presets")
          .select("*")
          .eq("id", currentRide.car_preset_id)
          .single();

        if (!error && data) {
          // Store in local state since we can't use the hook's currentCarPreset for other users' presets
          // We'll handle this in the component directly
        }
      };
      fetchCarPresetData();
    }
  }, [currentRide?.car_preset_id]);

  // Fetch driver profile when ride is loaded
  useEffect(() => {
    if (currentRide?.driver_id) {
      const fetchDriverProfile = async () => {
        setLoadingDriver(true);
        try {
          const supabase = createClient();
          const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", currentRide.driver_id)
            .single();

          if (error) {
            console.error("Error fetching driver profile:", error);
          } else {
            setDriverProfile(data);
          }
        } catch (err) {
          console.error("Error fetching driver profile:", err);
        } finally {
          setLoadingDriver(false);
        }
      };
      fetchDriverProfile();
    }
  }, [currentRide?.driver_id]);

  // Fetch car preset data separately (since we might not own it)
  const [carPresetData, setCarPresetData] = useState<any>(null);
  useEffect(() => {
    if (currentRide?.car_preset_id) {
      const fetchCarPresetData = async () => {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("car_presets")
          .select("*")
          .eq("id", currentRide.car_preset_id)
          .single();

        if (!error && data) {
          setCarPresetData(data);
        }
      };
      fetchCarPresetData();
    }
  }, [currentRide?.car_preset_id]);

  const isAuthenticated = !!user;
  const isDriver = user && currentRide?.driver_id === user.id;
  const isRider = currentRide?.reservations?.some((r) => r.rider_id === user?.id);

  /**
   * Handle ride cancellation
   */
  const handleCancelRide = async () => {
    if (!currentRide) return;

    const { error } = await cancelRide(currentRide.id);
    if (!error) {
      toast.success("Ride cancelled successfully");
      router.push("/rides/my-drives");
    } else {
      toast.error(error.message || "Failed to cancel ride");
    }
  };

  /**
   * Format departure datetime for display
   */
  const formatDepartureTime = () => {
    if (!currentRide) return "";
    
    const startTime = new Date(currentRide.departure_datetime);
    const formattedStart = format(startTime, "MMM d, yyyy 'at' h:mm a");

    if (currentRide.is_time_range && currentRide.departure_datetime_end) {
      const endTime = new Date(currentRide.departure_datetime_end);
      const formattedEnd = format(endTime, "h:mm a");
      return `${formattedStart} - ${formattedEnd}`;
    }

    return formattedStart;
  };

  /**
   * Get available seat count
   */
  const getAvailableSeatCount = () => {
    if (!currentRide) return 0;
    const occupiedSeats = currentRide.reservations?.length || 0;
    return currentRide.available_seats.length - occupiedSeats;
  };

  /**
   * Get rider initials for avatar
   */
  const getDriverInitials = (profile: Profile | null): string => {
    if (!profile) return "?";
    
    const firstName = profile.legal_first_name || profile.preferred_first_name || "";
    const lastName = profile.legal_last_name || "";
    
    const firstInitial = firstName.charAt(0).toUpperCase();
    const lastInitial = lastName.charAt(0).toUpperCase();
    
    return firstInitial + lastInitial || "?";
  };

  /**
   * Get driver display name
   */
  const getDriverName = (profile: Profile | null): string => {
    if (!profile) return "Unknown Driver";
    
    const firstName = profile.preferred_first_name || profile.legal_first_name || "";
    const lastName = profile.legal_last_name || "";
    
    return `${firstName} ${lastName}`.trim() || "Unknown Driver";
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading ride details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !currentRide) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/events">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Events
          </Link>
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            {error || "Ride not found"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const availableSeatCount = getAvailableSeatCount();
  const isActive = currentRide.status === "active";

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <Button variant="ghost" asChild className="mb-6">
        <Link href={currentEvent ? `/events/${currentEvent.id}` : "/events"}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {currentEvent ? `Back to ${currentEvent.name}` : "Back to Events"}
        </Link>
      </Button>

      {/* Ride Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-2xl">
                  Ride to {currentEvent?.name || "Event"}
                </CardTitle>
                <Badge variant={isActive ? "default" : "secondary"}>
                  {currentRide.status}
                </Badge>
                {currentRide.is_free && (
                  <Badge variant="outline">Free</Badge>
                )}
              </div>
              {isDriver && isActive && (
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/rides/${rideId}/edit`)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Ride
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive">
                        <X className="mr-2 h-4 w-4" />
                        Cancel Ride
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will cancel the ride and notify all riders.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleCancelRide}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Cancel Ride
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Event Details */}
          {currentEvent && (
            <div>
              <h3 className="font-semibold mb-3">Event Details</h3>
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{currentEvent.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(currentEvent.start_datetime), "EEEE, MMMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
                {currentEvent.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-muted-foreground">{currentEvent.address}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Driver Info */}
          <div>
            <h3 className="font-semibold mb-3">Driver</h3>
            {loadingDriver ? (
              <div className="flex items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="text-muted-foreground">Loading driver info...</p>
              </div>
            ) : driverProfile ? (
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  {driverProfile.profile_picture_url && (
                    <AvatarImage
                      src={driverProfile.profile_picture_url}
                      alt={getDriverName(driverProfile)}
                    />
                  )}
                  <AvatarFallback>
                    {getDriverInitials(driverProfile)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{getDriverName(driverProfile)}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Driver information unavailable</p>
            )}
          </div>

          {/* Car Info */}
          <div>
            <h3 className="font-semibold mb-3">Vehicle</h3>
            {carPresetData ? (
              <div className="flex items-center gap-3">
                <Car className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {carPresetData.brand} {carPresetData.model}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {carPresetData.color} • {carPresetData.license_plate}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Vehicle information unavailable</p>
            )}
          </div>

          {/* Departure Details */}
          <div>
            <h3 className="font-semibold mb-3">Departure</h3>
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{formatDepartureTime()}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(currentRide.departure_datetime), { addSuffix: true })}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-muted-foreground">{currentRide.departure_address}</p>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline">
                  {currentRide.pickup_mode === "meet_at_location"
                    ? "Meet at departure location"
                    : `Pickup within ${currentRide.pickup_radius_miles} miles`}
                </Badge>
              </div>
            </div>
          </div>

          {/* Seat Availability Summary */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Seats</h3>
              <Badge variant={availableSeatCount > 0 ? "default" : "secondary"}>
                {availableSeatCount} of {currentRide.available_seats.length} available
              </Badge>
            </div>
            <SeatList
              availableSeats={currentRide.available_seats}
              reservations={currentRide.reservations?.map((r) => ({
                ...r,
                rider: undefined, // TODO: Fetch rider profiles for reservations
              }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {isAuthenticated && isActive && (
        <Card>
          <CardContent className="pt-6">
            {isDriver ? (
              <div className="text-center text-muted-foreground">
                <p>You are the driver of this ride.</p>
                <p className="text-sm mt-1">Use the buttons above to edit or cancel the ride.</p>
              </div>
            ) : isRider ? (
              <div className="text-center text-muted-foreground">
                <p>You have a reservation for this ride.</p>
                <p className="text-sm mt-1">Visit "My Rides" to manage your reservation.</p>
              </div>
            ) : availableSeatCount > 0 ? (
              <div className="text-center">
                <Button
                  onClick={() => {
                    // TODO: Navigate to reservation/booking flow
                    toast.info("Reservation feature coming soon!");
                  }}
                  className="w-full sm:w-auto"
                >
                  Reserve Seat
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  {availableSeatCount} seat{availableSeatCount !== 1 ? "s" : ""} available
                </p>
              </div>
            ) : (
              <div className="text-center text-muted-foreground">
                <p>All seats are currently reserved.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Info for unauthenticated users */}
      {!isAuthenticated && isActive && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sign in to reserve a seat</AlertTitle>
          <AlertDescription>
            <Link href="/login" className="underline">
              Sign in
            </Link>{" "}
            to reserve a seat on this ride.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

