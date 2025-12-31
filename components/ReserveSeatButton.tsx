"use client";

/**
 * ReserveSeatButton Component for ShareRide
 *
 * This component allows riders to reserve a seat on a ride.
 * It integrates with the SeatList component to show available seats
 * and handles the reservation creation process.
 *
 * Features:
 * - Displays available seats using SeatList component
 * - Allows rider to select a seat
 * - Creates reservation using useReservations hook
 * - Validates prerequisites (can user ride)
 * - Shows loading states and success/error toasts
 * - Redirects to profile setup if prerequisites not met
 *
 * For Stage 1, all rides are free. Payment processing will be added in Stage 2.
 * Friend system requirement will be added in Stage 2.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2, Ticket } from "lucide-react";
import { SeatList } from "@/components/SeatList";
import { useReservations } from "@/hooks/useReservations";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import type { Database } from "@/types/database.types";

type Ride = Database["public"]["Tables"]["rides"]["Row"];
type RideReservation = Database["public"]["Tables"]["ride_reservations"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface ReserveSeatButtonProps {
  /**
   * The ride to reserve a seat on
   */
  ride: Ride;
  
  /**
   * Current reservations for this ride (to show which seats are taken)
   */
  reservations?: (RideReservation & { rider?: Profile | null })[];
  
  /**
   * Callback when reservation is successfully created
   */
  onReservationCreated?: () => void;
  
  /**
   * Whether the current user is the driver of this ride
   * (drivers cannot reserve seats on their own rides)
   */
  isDriver?: boolean;
}

export function ReserveSeatButton({
  ride,
  reservations = [],
  onReservationCreated,
  isDriver = false,
}: ReserveSeatButtonProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { createReservation, loading: reservationLoading } = useReservations();
  
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [canRide, setCanRide] = useState<boolean | null>(null);
  const [missingPrerequisites, setMissingPrerequisites] = useState<string[]>([]);
  const [checkingPrerequisites, setCheckingPrerequisites] = useState(false);

  // Check prerequisites when user or ride changes
  // Note: This is a client-side check using the browser client
  // Full server-side validation is done in the API/hook when creating reservation
  useEffect(() => {
    const checkPrereqs = async () => {
      if (!user || authLoading || isDriver) {
        setCanRide(false);
        if (isDriver) {
          setMissingPrerequisites(["You are the driver of this ride"]);
        }
        return;
      }

      setCheckingPrerequisites(true);
      try {
        const supabase = createClient();
        
        // Fetch user's profile to check prerequisites
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("legal_first_name, legal_last_name, profile_picture_url")
          .eq("id", user.id)
          .single();

        if (profileError || !profile) {
          setCanRide(false);
          setMissingPrerequisites(["Profile not found"]);
          setCheckingPrerequisites(false);
          return;
        }

        const missing: string[] = [];
        
        // Check each requirement
        if (!profile.legal_first_name || profile.legal_first_name.trim() === "") {
          missing.push("Legal first name");
        }
        
        if (!profile.legal_last_name || profile.legal_last_name.trim() === "") {
          missing.push("Legal last name");
        }
        
        if (!profile.profile_picture_url || profile.profile_picture_url.trim() === "") {
          missing.push("Profile picture");
        }

        setCanRide(missing.length === 0);
        setMissingPrerequisites(missing);
      } catch (error) {
        console.error("Error checking prerequisites:", error);
        setCanRide(false);
        setMissingPrerequisites(["Unable to verify prerequisites"]);
      } finally {
        setCheckingPrerequisites(false);
      }
    };

    checkPrereqs();
  }, [user, authLoading, isDriver]);

  /**
   * Handle seat selection from SeatList component
   */
  const handleSeatSelect = (seatNumber: number) => {
    if (!canRide) {
      toast.error("You do not meet the prerequisites to reserve a seat.");
      return;
    }

    if (reservationLoading) {
      return; // Prevent multiple selections while processing
    }

    // Check if seat is already reserved
    const isReserved = reservations.some(
      (res) => res.seat_number === seatNumber && res.status === "confirmed"
    );

    if (isReserved) {
      toast.error(`Seat ${seatNumber} is already reserved`);
      return;
    }

    // Check if seat is in available_seats array
    if (!ride.available_seats || !ride.available_seats.includes(seatNumber)) {
      toast.error(`Seat ${seatNumber} is not available for this ride`);
      return;
    }

    setSelectedSeat(seatNumber);
  };

  /**
   * Handle reservation creation
   */
  const handleReserveSeat = async () => {
    if (!selectedSeat) {
      toast.error("Please select a seat first");
      return;
    }

    if (!user) {
      toast.error("Please sign in to reserve a seat");
      router.push("/login");
      return;
    }

    if (!canRide) {
      toast.error("You do not meet the prerequisites to reserve a seat. Please complete your profile.");
      router.push("/profile/setup");
      return;
    }

    if (isDriver) {
      toast.error("You cannot reserve a seat on your own ride");
      return;
    }

    // Create the reservation
    const { data, error } = await createReservation(ride.id, selectedSeat);

    if (error) {
      toast.error(error.message || "Failed to reserve seat");
      return;
    }

    if (data) {
      toast.success(`Successfully reserved seat ${selectedSeat}!`);
      setSelectedSeat(null);
      
      // Call callback if provided (e.g., to refresh ride data)
      if (onReservationCreated) {
        onReservationCreated();
      } else {
        // Default: refresh the page to show updated reservation
        router.refresh();
      }
    }
  };

  // Don't show component if user is the driver
  if (isDriver) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>You are the driver</AlertTitle>
        <AlertDescription>
          You cannot reserve a seat on your own ride.
        </AlertDescription>
      </Alert>
    );
  }

  // Show loading state while checking prerequisites
  if (checkingPrerequisites || authLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Checking prerequisites...</span>
      </div>
    );
  }

  // Show login prompt if not authenticated
  if (!user) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Sign in required</AlertTitle>
        <AlertDescription>
          <Link href="/login" className="underline">
            Sign in
          </Link>{" "}
          to reserve a seat on this ride.
        </AlertDescription>
      </Alert>
    );
  }

  // Show prerequisites error if user cannot ride
  if (!canRide) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Prerequisites Not Met</AlertTitle>
        <AlertDescription>
          You cannot reserve a seat because you are missing the following:
          <ul className="list-disc list-inside mt-2">
            {missingPrerequisites.map((req, index) => (
              <li key={index}>{req}</li>
            ))}
          </ul>
          <Link href="/profile/setup" className="underline mt-2 inline-block">
            Go to Profile Setup
          </Link>
        </AlertDescription>
      </Alert>
    );
  }

  // Calculate available seats (seats in available_seats that aren't reserved)
  const reservedSeatNumbers = new Set(
    reservations
      .filter((res) => res.status === "confirmed")
      .map((res) => res.seat_number)
  );

  const availableSeatsCount = ride.available_seats
    ? ride.available_seats.filter((seat) => !reservedSeatNumbers.has(seat)).length
    : 0;

  // Don't show component if no seats available
  if (availableSeatsCount === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Seats Available</AlertTitle>
        <AlertDescription>
          All seats on this ride have been reserved.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold mb-2">Reserve a Seat</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select an available seat to reserve your spot on this ride.
        </p>
      </div>

      {/* Seat List - shows available/occupied seats */}
      <SeatList
        availableSeats={ride.available_seats || []}
        reservations={reservations}
        showSelectable={true}
        onSeatSelect={handleSeatSelect}
        highlightedSeat={selectedSeat || undefined}
      />

      {/* Selected Seat Display */}
      {selectedSeat && (
        <div className="rounded-lg border p-4 bg-muted/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Selected Seat: {selectedSeat}</p>
              <p className="text-sm text-muted-foreground">
                {ride.is_free ? "Free ride" : `Cost: $${ride.total_expected_cost || 0}`}
              </p>
            </div>
            <Button
              onClick={handleReserveSeat}
              disabled={reservationLoading}
              size="lg"
            >
              {reservationLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reserving...
                </>
              ) : (
                <>
                  <Ticket className="mr-2 h-4 w-4" />
                  Reserve Seat {selectedSeat}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Helper text if no seat selected */}
      {!selectedSeat && (
        <p className="text-sm text-muted-foreground text-center">
          Click on an available seat above to select it, then click "Reserve Seat" to confirm your reservation.
        </p>
      )}
    </div>
  );
}

