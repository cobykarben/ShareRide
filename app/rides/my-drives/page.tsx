"use client";

/**
 * My Drives Page for ShareRide
 * 
 * This page displays all rides where the user is the driver.
 * Shows:
 * - List of upcoming drives
 * - List of past drives (grayed out)
 * - Each card shows: event, departure time, number of riders, status
 * - Click to view/manage ride
 */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, isPast, isFuture } from "date-fns";
import { Calendar, MapPin, Users, Car, Loader2, AlertCircle, Plus } from "lucide-react";
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
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

type Ride = Database["public"]["Tables"]["rides"]["Row"];
type Event = Database["public"]["Tables"]["events"]["Row"];
type RideReservation = Database["public"]["Tables"]["ride_reservations"]["Row"];

interface RideWithDetails extends Ride {
  event?: Event;
  reservationCount?: number;
}

export default function MyDrivesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { rides, loading, error, fetchMyRides } = useRides();
  const [ridesWithDetails, setRidesWithDetails] = useState<RideWithDetails[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch rides on mount
  useEffect(() => {
    if (user) {
      fetchMyRides();
    }
  }, [user, fetchMyRides]);

  // Fetch event details and reservation counts for each ride
  useEffect(() => {
    if (rides.length === 0) {
      setRidesWithDetails([]);
      return;
    }

    const fetchDetails = async () => {
      setLoadingDetails(true);
      const supabase = createClient();
      const details: RideWithDetails[] = [];

      for (const ride of rides) {
        try {
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

          // Count confirmed reservations
          const { count } = await supabase
            .from("ride_reservations")
            .select("*", { count: "exact", head: true })
            .eq("ride_id", ride.id)
            .eq("status", "confirmed");

          details.push({
            ...ride,
            event,
            reservationCount: count || 0,
          });
        } catch (err) {
          console.error("Error fetching ride details:", err);
          details.push({ ...ride });
        }
      }

      setRidesWithDetails(details);
      setLoadingDetails(false);
    };

    fetchDetails();
  }, [rides]);

  // Separate upcoming and past rides
  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const upcomingList: RideWithDetails[] = [];
    const pastList: RideWithDetails[] = [];

    ridesWithDetails.forEach((ride) => {
      const departureTime = new Date(ride.departure_datetime);
      if (isFuture(departureTime) || ride.status === "active") {
        upcomingList.push(ride);
      } else {
        pastList.push(ride);
      }
    });

    // Sort upcoming by departure time (earliest first)
    upcomingList.sort((a, b) => {
      return new Date(a.departure_datetime).getTime() - new Date(b.departure_datetime).getTime();
    });

    // Sort past by departure time (most recent first)
    pastList.sort((a, b) => {
      return new Date(b.departure_datetime).getTime() - new Date(a.departure_datetime).getTime();
    });

    return { upcoming: upcomingList, past: pastList };
  }, [ridesWithDetails]);

  /**
   * Format departure time
   */
  const formatDepartureTime = (ride: Ride): string => {
    const date = new Date(ride.departure_datetime);
    return format(date, "MMM d, yyyy 'at' h:mm a");
  };

  /**
   * Get available seat count
   */
  const getAvailableSeats = (ride: RideWithDetails): number => {
    const reserved = ride.reservationCount || 0;
    return ride.available_seats.length - reserved;
  };

  // Loading state
  if (loading || loadingDetails) {
    return (
      <RouteGuard>
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Loading your drives...</p>
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
          <Button onClick={fetchMyRides} variant="outline" className="mt-4">
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
              My Drives
            </h1>
            <p className="text-muted-foreground">
              View and manage the rides you're driving.
            </p>
          </div>
          <Button asChild>
            <Link href="/rides/new">
              <Plus className="mr-2 h-4 w-4" />
              Create New Ride
            </Link>
          </Button>
        </div>

        {/* Upcoming Drives */}
        {upcoming.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Upcoming Drives</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {upcoming.map((ride) => (
                <Card
                  key={ride.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => router.push(`/rides/${ride.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-xl line-clamp-2">
                        {ride.event?.name || "Event"}
                      </CardTitle>
                      <Badge variant={ride.status === "active" ? "default" : "secondary"}>
                        {ride.status}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>{formatDepartureTime(ride)}</span>
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

                    {/* Rider Count and Seats */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          {ride.reservationCount || 0} rider{ride.reservationCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {getAvailableSeats(ride)} of {ride.available_seats.length} available
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Past Drives */}
        {past.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">Past Drives</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {past.map((ride) => (
                <Card
                  key={ride.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer opacity-75"
                  onClick={() => router.push(`/rides/${ride.id}`)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <CardTitle className="text-xl line-clamp-2">
                        {ride.event?.name || "Event"}
                      </CardTitle>
                      <Badge variant="secondary">{ride.status}</Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 flex-shrink-0" />
                      <span>{formatDepartureTime(ride)}</span>
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

                    {/* Rider Count and Seats */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm font-medium">
                          {ride.reservationCount || 0} rider{ride.reservationCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Car className="h-4 w-4 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          {ride.available_seats.length} total seats
                        </p>
                      </div>
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
              <h3 className="text-lg font-semibold mb-2">No drives yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                You haven't created any rides yet. Create your first ride to start offering rides to events!
              </p>
              <Button asChild>
                <Link href="/rides/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Ride
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </RouteGuard>
  );
}

