"use client";

/**
 * SeatList Component for ShareRide (Basic - Stage 1)
 * 
 * This component displays seat availability for a ride in a simple list format.
 * For Stage 1, we use a basic list/checkboxes display.
 * Visual seat maps (airplane-style) will be added in Stage 2.
 * 
 * Props:
 * - availableSeats: Array of seat numbers available for the ride
 * - reservations: Array of confirmed reservations (to show which seats are taken)
 * - onSeatSelect?: Optional callback when a seat is selected (for booking)
 * - showSelectable?: Whether to show seats as selectable (for booking flow)
 */

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CheckCircle2, XCircle } from "lucide-react";
import type { Database } from "@/types/database.types";
import { isSeatAvailable, formatSeatsForDisplay } from "@/lib/utils/seatConfig";

type RideReservation = Database["public"]["Tables"]["ride_reservations"]["Row"];
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

interface SeatListProps {
  /**
   * Array of seat numbers available for this ride
   */
  availableSeats: number[];
  
  /**
   * Array of confirmed reservations (to determine which seats are taken)
   * Each reservation should include rider information if available
   */
  reservations?: (RideReservation & { rider?: Profile | null })[];
  
  /**
   * Optional callback when a seat is clicked/selected
   * If not provided, seats are not clickable
   */
  onSeatSelect?: (seatNumber: number) => void;
  
  /**
   * Whether to show seats as selectable (for booking flow)
   * Default: false
   */
  showSelectable?: boolean;
  
  /**
   * Optional: Highlight a specific seat number
   */
  highlightedSeat?: number;
}

interface SeatStatus {
  seatNumber: number;
  isAvailable: boolean;
  isOccupied: boolean;
  reservation?: RideReservation & { rider?: Profile | null };
}

export function SeatList({
  availableSeats,
  reservations = [],
  onSeatSelect,
  showSelectable = false,
  highlightedSeat,
}: SeatListProps) {
  /**
   * Calculate seat status for each available seat
   */
  const seatStatuses = useMemo<SeatStatus[]>(() => {
    // Create a map of reservations by seat number for quick lookup
    const reservationsBySeat = new Map<number, RideReservation & { rider?: Profile | null }>();
    reservations.forEach((reservation) => {
      if (reservation.status === "confirmed") {
        reservationsBySeat.set(reservation.seat_number, reservation);
      }
    });

    // Sort available seats
    const sortedSeats = [...availableSeats].sort((a, b) => a - b);

    // Create status object for each seat
    return sortedSeats.map((seatNumber) => {
      const reservation = reservationsBySeat.get(seatNumber);
      return {
        seatNumber,
        isAvailable: isSeatAvailable(seatNumber, availableSeats),
        isOccupied: !!reservation,
        reservation,
      };
    });
  }, [availableSeats, reservations]);

  /**
   * Get rider initials for avatar
   */
  const getRiderInitials = (rider: Profile | null | undefined): string => {
    if (!rider) return "?";
    
    const firstName = rider.legal_first_name || rider.preferred_first_name || "";
    const lastName = rider.legal_last_name || "";
    
    const firstInitial = firstName.charAt(0).toUpperCase();
    const lastInitial = lastName.charAt(0).toUpperCase();
    
    return firstInitial + lastInitial || "?";
  };

  /**
   * Get rider display name
   */
  const getRiderName = (rider: Profile | null | undefined): string => {
    if (!rider) return "Unknown Rider";
    
    const firstName = rider.preferred_first_name || rider.legal_first_name || "";
    const lastName = rider.legal_last_name || "";
    
    return `${firstName} ${lastName}`.trim() || "Unknown Rider";
  };

  if (availableSeats.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No seats available for this ride.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-medium">Seat Availability ({formatSeatsForDisplay(availableSeats)})</div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {seatStatuses.map((seatStatus) => {
          const isHighlighted = highlightedSeat === seatStatus.seatNumber;
          const isClickable = showSelectable && !seatStatus.isOccupied && onSeatSelect;

          return (
            <div
              key={seatStatus.seatNumber}
              className={`
                flex items-center gap-3 p-3 rounded-lg border transition-colors
                ${seatStatus.isOccupied 
                  ? "bg-muted border-muted-foreground/20" 
                  : "bg-background border-border hover:border-primary"
                }
                ${isHighlighted ? "ring-2 ring-primary" : ""}
                ${isClickable ? "cursor-pointer hover:bg-accent" : "cursor-default"}
              `}
              onClick={() => {
                if (isClickable) {
                  onSeatSelect(seatStatus.seatNumber);
                }
              }}
            >
              {/* Seat Number */}
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                {seatStatus.seatNumber}
              </div>

              {/* Seat Status and Rider Info */}
              <div className="flex-1 min-w-0">
                {seatStatus.isOccupied && seatStatus.reservation ? (
                  <div className="flex items-center gap-2">
                    {/* Rider Avatar */}
                    <Avatar className="h-8 w-8">
                      {seatStatus.reservation.rider?.profile_picture_url && (
                        <AvatarImage
                          src={seatStatus.reservation.rider.profile_picture_url}
                          alt={getRiderName(seatStatus.reservation.rider)}
                        />
                      )}
                      <AvatarFallback className="text-xs">
                        {getRiderInitials(seatStatus.reservation.rider)}
                      </AvatarFallback>
                    </Avatar>

                    {/* Rider Name */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">
                        {getRiderName(seatStatus.reservation.rider)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Reserved
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <div className="text-sm font-medium text-muted-foreground">
                      Available
                    </div>
                  </div>
                )}
              </div>

              {/* Status Badge */}
              <div className="flex-shrink-0">
                {seatStatus.isOccupied ? (
                  <Badge variant="secondary" className="bg-muted">
                    <XCircle className="h-3 w-3 mr-1" />
                    Occupied
                  </Badge>
                ) : (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Available
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="text-xs text-muted-foreground pt-2 border-t">
        {seatStatuses.filter((s) => s.isOccupied).length} of {seatStatuses.length} seats occupied
      </div>
    </div>
  );
}

