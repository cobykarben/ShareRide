/**
 * Seat Configuration Utilities for ShareRide
 * 
 * These utilities help with managing seat configurations for vehicles.
 * For Stage 1, we use simple arrays of seat numbers.
 * Visual seat maps will be added in Stage 2.
 * 
 * Seat numbering convention:
 * - Seat 1: Driver's seat (never available)
 * - Seat 2: Front passenger seat
 * - Seats 3+: Back seats, etc.
 */

/**
 * Common vehicle types and their typical seat configurations
 * These can be used as defaults when creating car presets
 */
export const VEHICLE_TYPE_SEATS: Record<string, number[]> = {
  // Sedan (4-5 seats): driver + 3-4 passengers
  sedan: [2, 3, 4, 5],
  
  // SUV (7-8 seats): driver + 6-7 passengers
  suv: [2, 3, 4, 5, 6, 7, 8],
  
  // Van (8-15 seats): driver + 7-14 passengers
  van: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  
  // Truck (2-3 seats): driver + 1-2 passengers
  truck: [2, 3],
  
  // Coupe (2-4 seats): driver + 1-3 passengers
  coupe: [2, 3, 4],
};

/**
 * Gets default available seats for a vehicle type
 * 
 * @param vehicleType - Type of vehicle (sedan, suv, van, truck, coupe)
 * @returns Array of default available seat numbers
 */
export function getDefaultSeatsForVehicleType(vehicleType: string): number[] {
  return VEHICLE_TYPE_SEATS[vehicleType.toLowerCase()] || [];
}

/**
 * Generates a seat array for a given total seat count
 * Assumes seat 1 is the driver (always excluded)
 * 
 * @param totalSeats - Total number of seats in the vehicle
 * @returns Array of passenger seat numbers (seats 2 through totalSeats)
 */
export function generateSeatsForTotalCount(totalSeats: number): number[] {
  if (totalSeats < 2) {
    return [];
  }
  
  // Generate array from 2 to totalSeats
  return Array.from({ length: totalSeats - 1 }, (_, i) => i + 2);
}

/**
 * Validates a seat configuration
 * 
 * @param seats - Array of seat numbers
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateSeatConfiguration(seats: number[] | null | undefined): {
  isValid: boolean;
  error?: string;
} {
  if (!seats || seats.length === 0) {
    // Empty array is valid (no default seats set)
    return { isValid: true };
  }

  // Check for duplicates
  const uniqueSeats = new Set(seats);
  if (uniqueSeats.size !== seats.length) {
    return {
      isValid: false,
      error: "Duplicate seat numbers are not allowed",
    };
  }

  // Check that seat 1 (driver) is not included
  if (seats.includes(1)) {
    return {
      isValid: false,
      error: "Seat 1 is the driver's seat and cannot be available",
    };
  }

  // Check that all seats are positive integers
  if (seats.some((seat) => !Number.isInteger(seat) || seat < 2)) {
    return {
      isValid: false,
      error: "All seat numbers must be positive integers starting from 2",
    };
  }

  // Check for reasonable maximum (prevent unrealistic seat numbers)
  if (seats.some((seat) => seat > 20)) {
    return {
      isValid: false,
      error: "Seat numbers cannot exceed 20",
    };
  }

  return { isValid: true };
}

/**
 * Formats seat numbers for display
 * 
 * @param seats - Array of seat numbers
 * @param options - Formatting options
 * @returns Formatted string representation
 */
export function formatSeatsForDisplay(
  seats: number[] | null | undefined,
  options?: {
    emptyMessage?: string;
    maxSeats?: number; // If provided, show "and X more" if exceeds max
  }
): string {
  if (!seats || seats.length === 0) {
    return options?.emptyMessage || "No seats set";
  }

  const sortedSeats = [...seats].sort((a, b) => a - b);

  // If maxSeats is set and we have more seats, show subset
  if (options?.maxSeats && sortedSeats.length > options.maxSeats) {
    const displayed = sortedSeats.slice(0, options.maxSeats);
    const remaining = sortedSeats.length - options.maxSeats;
    return `Seats ${displayed.join(", ")} and ${remaining} more`;
  }

  // Format consecutive ranges (e.g., "Seats 2-5" instead of "Seats 2, 3, 4, 5")
  const ranges: string[] = [];
  let rangeStart = sortedSeats[0];
  let rangeEnd = sortedSeats[0];

  for (let i = 1; i < sortedSeats.length; i++) {
    if (sortedSeats[i] === rangeEnd + 1) {
      // Consecutive, extend range
      rangeEnd = sortedSeats[i];
    } else {
      // Gap found, save current range and start new one
      if (rangeStart === rangeEnd) {
        ranges.push(rangeStart.toString());
      } else {
        ranges.push(`${rangeStart}-${rangeEnd}`);
      }
      rangeStart = sortedSeats[i];
      rangeEnd = sortedSeats[i];
    }
  }

  // Add last range
  if (rangeStart === rangeEnd) {
    ranges.push(rangeStart.toString());
  } else {
    ranges.push(`${rangeStart}-${rangeEnd}`);
  }

  return `Seats ${ranges.join(", ")}`;
}

/**
 * Checks if a seat is available in a given seat configuration
 * 
 * @param seatNumber - The seat number to check
 * @param availableSeats - Array of available seat numbers
 * @returns True if seat is available, false otherwise
 */
export function isSeatAvailable(
  seatNumber: number,
  availableSeats: number[] | null | undefined
): boolean {
  if (!availableSeats || availableSeats.length === 0) {
    return false;
  }
  return availableSeats.includes(seatNumber);
}

/**
 * Gets the count of available seats
 * 
 * @param availableSeats - Array of available seat numbers
 * @returns Number of available seats
 */
export function getAvailableSeatCount(
  availableSeats: number[] | null | undefined
): number {
  if (!availableSeats) {
    return 0;
  }
  return availableSeats.length;
}

