"use client";

/**
 * My Rides Page for ShareRide
 * 
 * This unified page displays all rides where the user is either a driver or a rider.
 * Features:
 * - Tabs to switch between "Upcoming" and "Past" rides
 * - Icons to differentiate driver (steering wheel) vs rider (passenger) rides
 * - Chronologically sorted with most upcoming at top
 * - Clear visual distinction between roles
 */

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, isFuture, isPast } from "date-fns";
import { Calendar, MapPin, Users, Car, Loader2, AlertCircle, Gauge, User } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { Database } from "@/types/database.types";

type Ride = Database["public"]["Tables"]["rides"]["Row"];
type RideReservation = Database["public"]["Tables"]["ride_reservations"]["Row"];
type Event = Database["public"]["Tables"]["events"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface RideWithDetails extends Ride {
  event?: Event;
  reservationCount?: number;
  role: "driver" | "rider";
  seatNumber?: number; // For rider reservations
  reservationStatus?: string; // For rider reservations
}

export default function RidesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { rides, myReservations, loading, error, fetchMyRides, fetchMyReservations } = useRides();
  const [allRides, setAllRides] = useState<RideWithDetails[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  // Fetch both driver rides and rider reservations on mount
  useEffect(() => {
    if (user) {
      fetchMyRides();
      fetchMyReservations();
    }
  }, [user, fetchMyRides, fetchMyReservations]);

  // Combine driver rides and rider reservations into a unified list
  useEffect(() => {
    const combineRides = async () => {
      if (rides.length === 0 && myReservations.length === 0) {
        setAllRides([]);
        return;
      }

      setLoadingDetails(true);
      const supabase = createClient();
      const combined: RideWithDetails[] = [];

      // Add driver rides
      for (const ride of rides) {
        try {
          let event: Event | undefined;
          if (ride.event_id) {
            const { data: eventData } = await supabase
              .from("events")
              .select("*")
              .eq("id", ride.event_id)
              .single();
            event = eventData || undefined;
          }

          const { count } = await supabase
            .from("ride_reservations")
            .select("*", { count: "exact", head: true })
            .eq("ride_id", ride.id)
            .eq("status", "confirmed");

          combined.push({
            ...ride,
            event,
            reservationCount: count || 0,
            role: "driver",
          });
        } catch (err) {
          console.error("Error fetching ride details:", err);
          combined.push({
            ...ride,
            role: "driver",
          });
        }
      }

      // Add rider reservations
      for (const reservation of myReservations) {
        try {
          const { data: ride } = await supabase
            .from("rides")
            .select("*")
            .eq("id", reservation.ride_id)
            .single();

          if (!ride) continue;

          let event: Event | undefined;
          if (ride.event_id) {
            const { data: eventData } = await supabase
              .from("events")
              .select("*")
              .eq("id", ride.event_id)
              .single();
            event = eventData || undefined;
          }

          // Check if this ride is already in the list (user is both driver and rider)
          const existingIndex = combined.findIndex((r) => r.id === ride.id);
          if (existingIndex >= 0) {
            // User is both driver and rider for this ride - mark it as driver (primary role)
            // We'll show both roles in the UI if needed
            continue;
          }

          combined.push({
            ...ride,
            event,
            role: "rider",
            seatNumber: reservation.seat_number,
            reservationStatus: reservation.status,
          });
        } catch (err) {
          console.error("Error fetching reservation details:", err);
        }
      }

      // Sort by departure time (most upcoming first)
      combined.sort((a, b) => {
        return new Date(a.departure_datetime).getTime() - new Date(b.departure_datetime).getTime();
      });

      setAllRides(combined);
      setLoadingDetails(false);
    };

    combineRides();
  }, [rides, myReservations]);

  // Separate upcoming and past rides
  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const upcomingList: RideWithDetails[] = [];
    const pastList: RideWithDetails[] = [];

    allRides.forEach((ride) => {
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
  }, [allRides]);

  const displayRides = activeTab === "upcoming" ? upcoming : past;


  /**
   * Format departure time
   */
  const formatDepartureTime = (ride: RideWithDetails): string => {
    const date = new Date(ride.departure_datetime);
    return format(date, "MMM d, yyyy 'at' h:mm a");
  };

  /**
   * Get available seat count for driver rides
   */
  const getAvailableSeats = (ride: RideWithDetails): number => {
    if (ride.role !== "driver") return 0;
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
          <Button 
            onClick={() => {
              fetchMyRides();
              fetchMyReservations();
            }} 
            variant="outline" 
            className="mt-4"
          >
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
            View all your rides as a driver or passenger.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === "upcoming"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Upcoming Rides ({upcoming.length})
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === "past"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Past Rides ({past.length})
          </button>
        </div>

        {/* Rides List */}
        {displayRides.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Car className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                No {activeTab === "upcoming" ? "upcoming" : "past"} rides
              </h3>
              <p className="text-muted-foreground text-center mb-4">
                {activeTab === "upcoming"
                  ? "You don't have any upcoming rides. Browse events to find rides!"
                  : "You don't have any past rides yet."}
              </p>
              {activeTab === "upcoming" && (
                <Button asChild>
                  <Link href="/events">Browse Events</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayRides.map((ride) => (
              <Card
                key={`${ride.id}-${ride.role}`}
                className={cn(
                  "hover:shadow-lg transition-shadow cursor-pointer",
                  activeTab === "past" && "opacity-75"
                )}
                onClick={() => router.push(`/rides/${ride.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Role Icon */}
                      {ride.role === "driver" ? (
                        <Gauge className="h-5 w-5 text-primary flex-shrink-0" />
                      ) : (
                        <User className="h-5 w-5 text-blue-500 flex-shrink-0" />
                      )}
                      <CardTitle className="text-xl line-clamp-2 flex-1">
                        {ride.event?.name || "Event"}
                      </CardTitle>
                    </div>
                    <Badge 
                      variant={
                        ride.status === "active" || ride.reservationStatus === "confirmed"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {ride.role === "driver" ? ride.status : ride.reservationStatus}
                    </Badge>
                  </div>
                  
                  {/* Role Badge */}
                  <div className="mb-2">
                    <Badge 
                      variant="outline"
                      className={cn(
                        ride.role === "driver"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-blue-500/10 text-blue-600 border-blue-500/20 dark:text-blue-400"
                      )}
                    >
                      {ride.role === "driver" ? (
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

                  {/* Role-specific details */}
                  {ride.role === "driver" ? (
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
                  ) : (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">
                        Seat {ride.seatNumber}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </RouteGuard>
  );
}

