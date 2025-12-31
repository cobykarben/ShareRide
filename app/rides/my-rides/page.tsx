"use client";

/**
 * My Rides Page for ShareRide
 * 
 * This page displays all rides where the user is a passenger (has reservations).
 * Shows:
 * - List of upcoming ride reservations
 * - List of past ride reservations (grayed out)
 * - Each card shows: event, driver, departure time, seat number, status
 * - Click to view ride details
 */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow, isPast, isFuture } from "date-fns";
import { Calendar, User, MapPin, Clock, Car, Loader2, AlertCircle } from "lucide-react";
import { useRides } from "@/hooks/useRides";
import { useAuth } from "@/hooks/useAuth";
import { RouteGuard } from "@/components/RouteGuard";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type RideReservation = Database["public"]["Tables"]["ride_reservations"]["Row"];
type Ride = Database["public"]["Tables"]["rides"]["Row"];
type Event = Database["public"]["Tables"]["events"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface ReservationWithDetails extends RideReservation {
  ride?: Ride;
  event?: Event;
  driver?: Profile;
}

export default function MyRidesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { myReservations, loading, error, fetchMyReservations } = useRides();
  const [reservationsWithDetails, setReservationsWithDetails] = useState<ReservationWithDetails[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch reservations on mount
  useEffect(() => {
    if (user) {
      fetchMyReservations();
    }
  }, [user, fetchMyReservations]);

  // Fetch ride, event, and driver details for each reservation
  useEffect(() => {
    if (myReservations.length === 0) {
      setReservationsWithDetails([]);
      return;
    }

    const fetchDetails = async () => {
      setLoadingDetails(true);
      const supabase = createClient();
      const details: ReservationWithDetails[] = [];

      for (const reservation of myReservations) {
        try {
          // Fetch ride
          const { data: ride, error: rideError } = await supabase
            .from("rides")
            .select("*")
            .eq("id", reservation.ride_id)
            .single();

          if (rideError || !ride) continue;

          // Fetch event
          let event: Event | undefined;
          if (ride.event_id) {
            const { data: eventData } = await supabase
              .from("events")
              .select("*")
              .eq("id", ride.event_id)
              .single();
            event = eventData || undefined;
          }

          // Fetch driver profile
          let driver: Profile | undefined;
          if (ride.driver_id) {
            const { data: driverData } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", ride.driver_id)
              .single();
            driver = driverData || undefined;
          }

          details.push({
            ...reservation,
            ride,
            event,
            driver,
          });
        } catch (err) {
          console.error("Error fetching reservation details:", err);
        }
      }

      setReservationsWithDetails(details);
      setLoadingDetails(false);
    };

    fetchDetails();
  }, [myReservations]);

  // Separate upcoming and past reservations
  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const upcomingList: ReservationWithDetails[] = [];
    const pastList: ReservationWithDetails[] = [];

    reservationsWithDetails.forEach((reservation) => {
      if (reservation.ride) {
        const departureTime = new Date(reservation.ride.departure_datetime);
        if (isFuture(departureTime) || reservation.ride.status === "active") {
          upcomingList.push(reservation);
        } else {
          pastList.push(reservation);
        }
      } else {
        // If we can't determine, put in upcoming
        upcomingList.push(reservation);
      }
    });

    // Sort upcoming by departure time (earliest first)
    upcomingList.sort((a, b) => {
      if (!a.ride || !b.ride) return 0;
      return new Date(a.ride.departure_datetime).getTime() - new Date(b.ride.departure_datetime).getTime();
    });

    // Sort past by departure time (most recent first)
    pastList.sort((a, b) => {
      if (!a.ride || !b.ride) return 0;
      return new Date(b.ride.departure_datetime).getTime() - new Date(a.ride.departure_datetime).getTime();
    });

    return { upcoming: upcomingList, past: pastList };
  }, [reservationsWithDetails]);

  /**
   * Get driver display name
   */
  const getDriverName = (driver: Profile | undefined): string => {
    if (!driver) return "Unknown Driver";
    const firstName = driver.preferred_first_name || driver.legal_first_name || "";
    const lastName = driver.legal_last_name || "";
    return `${firstName} ${lastName}`.trim() || "Unknown Driver";
  };

  /**
   * Get driver initials for avatar
   */
  const getDriverInitials = (driver: Profile | undefined): string => {
    if (!driver) return "?";
    const firstName = driver.legal_first_name || driver.preferred_first_name || "";
    const lastName = driver.legal_last_name || "";
    const firstInitial = firstName.charAt(0).toUpperCase();
    const lastInitial = lastName.charAt(0).toUpperCase();
    return firstInitial + lastInitial || "?";
  };

  /**
   * Format departure time
   */
  const formatDepartureTime = (ride: Ride | undefined): string => {
    if (!ride) return "Time TBD";
    const date = new Date(ride.departure_datetime);
    return format(date, "MMM d, yyyy 'at' h:mm a");
  };

  // Loading state
  if (loading || loadingDetails) {
    return (
      <RouteGuard>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading your rides...</p>
          </div>
        </div>
      </RouteGuard>
    );
  }

  // Error state
  if (error) {
    return (
      <RouteGuard>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchMyReservations} variant="outline" className="mt-4">
            Try Again
          </Button>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            My Rides
          </h1>
          <p className="text-muted-foreground">
            View and manage your ride reservations as a passenger.
          </p>
        </div>

        {/* Upcoming Rides */}
        {upcoming.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Upcoming Rides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcoming.map((reservation) => (
                <Card
                  key={reservation.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/rides/${reservation.ride_id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-xl line-clamp-2">
                        {reservation.event?.name || "Event"}
                      </CardTitle>
                      <Badge variant={reservation.status === "confirmed" ? "default" : "secondary"}>
                        {reservation.status}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>{formatDepartureTime(reservation.ride)}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Driver */}
                    {reservation.driver && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {reservation.driver.profile_picture_url && (
                            <AvatarImage
                              src={reservation.driver.profile_picture_url}
                              alt={getDriverName(reservation.driver)}
                            />
                          )}
                          <AvatarFallback className="text-xs">
                            {getDriverInitials(reservation.driver)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {getDriverName(reservation.driver)}
                          </p>
                          <p className="text-xs text-muted-foreground">Driver</p>
                        </div>
                      </div>
                    )}

                    {/* Departure Location */}
                    {reservation.ride?.departure_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {reservation.ride.departure_address}
                        </p>
                      </div>
                    )}

                    {/* Seat Number */}
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        Seat {reservation.seat_number}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Past Rides */}
        {past.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Past Rides</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {past.map((reservation) => (
                <Card
                  key={reservation.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer opacity-75"
                  onClick={() => router.push(`/rides/${reservation.ride_id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-xl line-clamp-2">
                        {reservation.event?.name || "Event"}
                      </CardTitle>
                      <Badge variant="secondary">{reservation.status}</Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>{formatDepartureTime(reservation.ride)}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Driver */}
                    {reservation.driver && (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          {reservation.driver.profile_picture_url && (
                            <AvatarImage
                              src={reservation.driver.profile_picture_url}
                              alt={getDriverName(reservation.driver)}
                            />
                          )}
                          <AvatarFallback className="text-xs">
                            {getDriverInitials(reservation.driver)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {getDriverName(reservation.driver)}
                          </p>
                          <p className="text-xs text-muted-foreground">Driver</p>
                        </div>
                      </div>
                    )}

                    {/* Departure Location */}
                    {reservation.ride?.departure_address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {reservation.ride.departure_address}
                        </p>
                      </div>
                    )}

                    {/* Seat Number */}
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        Seat {reservation.seat_number}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {upcoming.length === 0 && past.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Car className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No rides yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                You haven't reserved any seats on rides yet. Browse events to find rides!
              </p>
              <Button asChild>
                <Link href="/events">
                  Browse Events
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </RouteGuard>
  );
}

