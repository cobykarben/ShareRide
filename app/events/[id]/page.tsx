"use client";

/**
 * Event Detail Page for ShareRide
 * 
 * This page displays full event details including:
 * - Event information (name, date/time, location, description)
 * - List of rides going to this event
 * - "Create Ride" button (if user can drive)
 * - Ability to edit/delete event (if user is the creator)
 */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  MapPin,
  ExternalLink,
  Edit,
  Trash2,
  Car,
  AlertCircle,
  Clock,
  Users,
  Loader2,
  Gauge,
  User,
} from "lucide-react";
import { useEvents } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { useRides } from "@/hooks/useRides";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
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

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const { user } = useAuth();
  const {
    currentEvent,
    loading,
    error,
    fetchEvent,
    deleteEvent,
  } = useEvents();
  const {
    rides,
    loading: ridesLoading,
    fetchRidesByEvent,
  } = useRides();
  
  // Track reservations for each ride to calculate available seats
  const [rideReservations, setRideReservations] = useState<Record<string, number>>({});
  
  // Track user's role for each ride (driver, rider, or none)
  const [userRideRoles, setUserRideRoles] = useState<Record<string, "driver" | "rider" | null>>({});

  const isAuthenticated = !!user;
  const isEventCreator = user && currentEvent?.created_by === user.id;

  // Fetch reservations and determine user's role for each ride
  useEffect(() => {
    const fetchAllReservationsAndRoles = async () => {
      if (rides.length === 0) {
        setRideReservations({});
        setUserRideRoles({});
        return;
      }

      if (!user) {
        // No user logged in, just fetch reservation counts
        const supabase = createClient();
        const reservationsMap: Record<string, number> = {};
        
        await Promise.all(
          rides.map(async (ride) => {
            try {
              const { data, error } = await supabase
                .from("ride_reservations")
                .select("id")
                .eq("ride_id", ride.id)
                .eq("status", "confirmed");

              if (!error && data) {
                reservationsMap[ride.id] = data.length;
              } else {
                reservationsMap[ride.id] = 0;
              }
            } catch (err) {
              console.error(`Error fetching reservations for ride ${ride.id}:`, err);
              reservationsMap[ride.id] = 0;
            }
          })
        );

        setRideReservations(reservationsMap);
        setUserRideRoles({});
        return;
      }

      const supabase = createClient();
      const reservationsMap: Record<string, number> = {};
      const rolesMap: Record<string, "driver" | "rider" | null> = {};

      // Fetch reservations and check user's role for each ride
      await Promise.all(
        rides.map(async (ride) => {
          try {
            // Check if user is driver
            const isDriver = ride.driver_id === user.id;

            // Fetch reservations to count them and check if user is a rider
            const { data: reservations, error } = await supabase
              .from("ride_reservations")
              .select("rider_id, status")
              .eq("ride_id", ride.id);

            if (!error && reservations) {
              const confirmedReservations = reservations.filter((r) => r.status === "confirmed");
              reservationsMap[ride.id] = confirmedReservations.length;

              // Check if user is a rider
              const isRider = confirmedReservations.some((r) => r.rider_id === user.id);

              // Determine role (driver takes priority)
              if (isDriver) {
                rolesMap[ride.id] = "driver";
              } else if (isRider) {
                rolesMap[ride.id] = "rider";
              } else {
                rolesMap[ride.id] = null;
              }
            } else {
              reservationsMap[ride.id] = 0;
              rolesMap[ride.id] = isDriver ? "driver" : null;
            }
          } catch (err) {
            console.error(`Error fetching data for ride ${ride.id}:`, err);
            reservationsMap[ride.id] = 0;
            rolesMap[ride.id] = ride.driver_id === user.id ? "driver" : null;
          }
        })
      );

      setRideReservations(reservationsMap);
      setUserRideRoles(rolesMap);
    };

    fetchAllReservationsAndRoles();
  }, [rides, user]);

  /**
   * Calculate available seats for a ride
   */
  const getAvailableSeatCount = (ride: typeof rides[0]) => {
    const reservedCount = rideReservations[ride.id] || 0;
    const totalSeats = ride.available_seats?.length || 0;
    return Math.max(0, totalSeats - reservedCount);
  };

  // Fetch event on mount
  useEffect(() => {
    if (eventId) {
      fetchEvent(eventId);
    }
  }, [eventId, fetchEvent]);

  // Fetch rides for this event
  useEffect(() => {
    if (eventId) {
      fetchRidesByEvent(eventId);
    }
  }, [eventId, fetchRidesByEvent]);

  /**
   * Handle event deletion
   */
  const handleDeleteEvent = async () => {
    if (!currentEvent) return;

    const { error } = await deleteEvent(currentEvent.id);
    if (!error) {
      router.push("/events");
    }
  };

  /**
   * Format event datetime for display
   */
  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();

    // If event is in the future, show relative time
    if (date > now) {
      return formatDistanceToNow(date, { addSuffix: true });
    }

    // Otherwise show formatted date
    return format(date, "MMM d, yyyy 'at' h:mm a");
  };

  /**
   * Format full date for display
   */
  const formatFullDate = (dateString: string) => {
    return format(new Date(dateString), "EEEE, MMMM d, yyyy 'at' h:mm a");
  };

  /**
   * Get event status (upcoming/past)
   */
  const getEventStatus = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    return date > now ? "upcoming" : "past";
  };

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted-foreground">Loading event details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !currentEvent) {
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
            {error || "Event not found"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const isUpcoming = getEventStatus(currentEvent.start_datetime) === "upcoming";

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <Button variant="ghost" asChild className="mb-6">
        <Link href="/events">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Events
        </Link>
      </Button>

      {/* Event Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <CardTitle className="text-3xl">{currentEvent.name}</CardTitle>
                <Badge variant={isUpcoming ? "default" : "secondary"}>
                  {isUpcoming ? "Upcoming" : "Past"}
                </Badge>
              </div>
              {isEventCreator && (
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/events/${eventId}/edit`)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Event
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Event
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the event
                          and all associated rides.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteEvent}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Date and Time */}
          <div className="flex items-start gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">{formatFullDate(currentEvent.start_datetime)}</p>
              <p className="text-sm text-muted-foreground">
                {formatEventDate(currentEvent.start_datetime)}
              </p>
            </div>
          </div>

          {/* Location */}
          {currentEvent.address && (
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Location</p>
                <p className="text-muted-foreground">{currentEvent.address}</p>
                {/* TODO: Show map in Stage 2 when Google Maps is integrated */}
                {currentEvent.latitude && currentEvent.longitude && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Coordinates: {currentEvent.latitude.toFixed(6)}, {currentEvent.longitude.toFixed(6)}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {currentEvent.description && (
            <div className="pt-2">
              <p className="font-medium mb-2">Description</p>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {currentEvent.description}
              </p>
            </div>
          )}

          {/* Website */}
          {currentEvent.website_url && (
            <div className="pt-2">
              <a
                href={currentEvent.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:underline"
              >
                <ExternalLink className="h-4 w-4" />
                Visit event website
              </a>
            </div>
          )}

          {/* Event Image */}
          {currentEvent.image_url && (
            <div className="pt-4">
              <img
                src={currentEvent.image_url}
                alt={currentEvent.name}
                className="w-full h-auto rounded-lg object-cover max-h-96"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rides Section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Rides to This Event</h2>
          {isAuthenticated && isUpcoming && (
            <Button asChild>
              <Link href={`/rides/new?eventId=${eventId}`}>
                <Car className="mr-2 h-4 w-4" />
                Create Ride
              </Link>
            </Button>
          )}
        </div>

        {/* Rides List */}
        {ridesLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-muted-foreground">Loading rides...</p>
              </div>
            </CardContent>
          </Card>
        ) : rides.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Car className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No rides yet</h3>
                <p className="text-muted-foreground mb-4">
                  Be the first to create a ride to this event!
                </p>
                {isAuthenticated && isUpcoming && (
                  <Button asChild>
                    <Link href={`/rides/new?eventId=${eventId}`}>
                      <Car className="mr-2 h-4 w-4" />
                      Create First Ride
                    </Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rides.map((ride) => {
              const userRole = userRideRoles[ride.id] || null;
              
              return (
                <Card
                  key={ride.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/rides/${ride.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Role Icon */}
                        {userRole === "driver" && (
                          <Gauge className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                        {userRole === "rider" && (
                          <User className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        )}
                        <CardTitle className="text-lg line-clamp-2 flex-1">
                          Departure Details
                        </CardTitle>
                      </div>
                      <Badge variant={ride.status === "active" ? "default" : "secondary"}>
                        {ride.status}
                      </Badge>
                    </div>
                    
                    {/* Role Badge */}
                    {userRole && (
                      <div className="mb-2">
                        <Badge 
                          variant="outline"
                          className={cn(
                            userRole === "driver"
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400"
                          )}
                        >
                          {userRole === "driver" ? (
                            <>
                              <Gauge className="h-3 w-3 mr-1" />
                              Driver
                            </>
                          ) : (
                            <>
                              <User className="h-3 w-3 mr-1" />
                              Passenger
                            </>
                          )}
                        </Badge>
                      </div>
                    )}
                    
                    <CardDescription className="flex items-center gap-2">
                      <Clock className="h-4 w-4 flex-shrink-0" />
                      <span>
                        {format(new Date(ride.departure_datetime), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Departure Location */}
                    {ride.departure_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {ride.departure_address}
                        </p>
                      </div>
                    )}

                    {/* Available Seats */}
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        {getAvailableSeatCount(ride)} seat{getAvailableSeatCount(ride) !== 1 ? "s" : ""} available
                      </p>
                    </div>

                    {/* Pickup Mode */}
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">
                        {ride.pickup_mode === "meet_at_location"
                          ? "Meet at departure location"
                          : `Pickup within ${ride.pickup_radius_miles} miles`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Info for unauthenticated users */}
      {!isAuthenticated && isUpcoming && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sign in to create a ride</AlertTitle>
          <AlertDescription>
            <Link href="/login" className="underline">
              Sign in
            </Link>{" "}
            to create a ride to this event or reserve a seat on an existing ride.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

