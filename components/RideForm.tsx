"use client";

/**
 * RideForm Component for ShareRide
 * 
 * This component provides a form for creating rides.
 * Drivers use this form to post rides to events.
 * 
 * Features:
 * - Select event (with search)
 * - Select car preset (user's car presets)
 * - Set departure address and time
 * - Set pickup mode (meet at location or pickup within radius)
 * - Configure available seats (uses car preset default, can override)
 * - Form validation using zod
 * 
 * Props:
 * - eventId?: Pre-selected event ID (optional)
 * - onSuccess?: Callback when form is submitted successfully
 * - onCancel?: Callback when form is cancelled
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRides } from "@/hooks/useRides";
import { useEvents } from "@/hooks/useEvents";
import { useCarPresets } from "@/hooks/useCarPresets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Plus, AlertCircle } from "lucide-react";
import type { Database } from "@/types/database.types";
import {
  validateSeatConfiguration,
  formatSeatsForDisplay,
} from "@/lib/utils/seatConfig";

type Event = Database["public"]["Tables"]["events"]["Row"];
type CarPreset = Database["public"]["Tables"]["car_presets"]["Row"];

// Zod schema for form validation
const rideFormSchema = z.object({
  event_id: z.string().min(1, "Event is required"),
  car_preset_id: z.string().min(1, "Car preset is required"),
  departure_address: z
    .string()
    .min(1, "Departure address is required")
    .max(500, "Address must be less than 500 characters"),
  departure_datetime: z.string().min(1, "Departure time is required"),
  departure_datetime_end: z.string().optional(),
  is_time_range: z.boolean().default(false),
  pickup_mode: z.enum(["meet_at_location", "pickup_within_radius"]).default("meet_at_location"),
  pickup_radius_miles: z.number().min(0.5).max(50).optional(),
  available_seats: z.array(z.number().int().positive()).min(1, "At least one seat must be available"),
  is_free: z.boolean().default(true),
}).refine(
  (data) => {
    // If time range is selected, departure_datetime_end is required
    if (data.is_time_range && !data.departure_datetime_end) {
      return false;
    }
    return true;
  },
  {
    message: "End time is required when using a time range",
    path: ["departure_datetime_end"],
  }
).refine(
  (data) => {
    // If pickup_within_radius, pickup_radius_miles is required
    if (data.pickup_mode === "pickup_within_radius" && !data.pickup_radius_miles) {
      return false;
    }
    return true;
  },
  {
    message: "Pickup radius is required when using pickup within radius",
    path: ["pickup_radius_miles"],
  }
).refine(
  (data) => {
    // End time must be after start time
    if (data.is_time_range && data.departure_datetime_end) {
      const start = new Date(data.departure_datetime);
      const end = new Date(data.departure_datetime_end);
      return end > start;
    }
    return true;
  },
  {
    message: "End time must be after start time",
    path: ["departure_datetime_end"],
  }
);

type RideFormValues = z.infer<typeof rideFormSchema>;

interface RideFormProps {
  /**
   * Pre-selected event ID (optional)
   * If provided, event field will be pre-filled and disabled
   */
  eventId?: string;
  /**
   * Callback when form is submitted successfully
   */
  onSuccess?: () => void;
  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void;
}

// Common seat numbers for selection
const AVAILABLE_SEAT_NUMBERS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export function RideForm({ eventId, onSuccess, onCancel }: RideFormProps) {
  const router = useRouter();
  const { createRide } = useRides();
  const { events, fetchEvents } = useEvents();
  const { carPresets, fetchMyCarPresets } = useCarPresets();

  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [selectedCarPreset, setSelectedCarPreset] = useState<CarPreset | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Fetch events and car presets on mount
  useEffect(() => {
    fetchEvents();
    fetchMyCarPresets();
  }, [fetchEvents, fetchMyCarPresets]);

  // Pre-select event if eventId is provided
  useEffect(() => {
    if (eventId && events.length > 0) {
      const event = events.find((e) => e.id === eventId);
      if (event) {
        setSelectedEvent(event);
      }
    }
  }, [eventId, events]);

  // Initialize form
  const form = useForm<RideFormValues>({
    resolver: zodResolver(rideFormSchema),
    defaultValues: {
      event_id: eventId || "",
      car_preset_id: "",
      departure_address: "",
      departure_datetime: "",
      departure_datetime_end: "",
      is_time_range: false,
      pickup_mode: "meet_at_location",
      pickup_radius_miles: undefined,
      available_seats: [],
      is_free: true,
    },
  });

  // Handle car preset selection - populate default seats
  const handleCarPresetChange = (carPresetId: string) => {
    form.setValue("car_preset_id", carPresetId);
    const preset = carPresets.find((p) => p.id === carPresetId);
    setSelectedCarPreset(preset || null);

    if (preset?.default_available_seats && preset.default_available_seats.length > 0) {
      const defaultSeats = preset.default_available_seats;
      setSelectedSeats(defaultSeats);
      form.setValue("available_seats", defaultSeats);
    } else {
      setSelectedSeats([]);
      form.setValue("available_seats", []);
    }
  };

  // Handle seat checkbox changes
  const handleSeatToggle = (seatNumber: number) => {
    const newSeats = selectedSeats.includes(seatNumber)
      ? selectedSeats.filter((s) => s !== seatNumber)
      : [...selectedSeats, seatNumber].sort((a, b) => a - b);

    // Validate the seat configuration
    const validation = validateSeatConfiguration(newSeats);
    if (!validation.isValid && validation.error) {
      toast.error(validation.error);
      return;
    }

    setSelectedSeats(newSeats);
    form.setValue("available_seats", newSeats);
  };

  // Handle event selection
  const handleEventChange = (eventId: string) => {
    form.setValue("event_id", eventId);
    const event = events.find((e) => e.id === eventId);
    setSelectedEvent(event || null);
  };

  /**
   * Handle form submission
   */
  const onSubmit = async (values: RideFormValues) => {
    try {
      // Convert datetime-local format to ISO string
      const departureDatetime = new Date(values.departure_datetime).toISOString();
      const departureDatetimeEnd = values.departure_datetime_end
        ? new Date(values.departure_datetime_end).toISOString()
        : null;

      // Validate departure time is before event time
      if (selectedEvent) {
        const departureTime = new Date(departureDatetime);
        const eventTime = new Date(selectedEvent.start_datetime);
        if (departureTime >= eventTime) {
          toast.error("Departure time must be before the event start time");
          return;
        }
      }

      // Prepare ride data
      const rideData = {
        event_id: values.event_id,
        car_preset_id: values.car_preset_id,
        departure_address: values.departure_address.trim(),
        departure_datetime: departureDatetime,
        departure_datetime_end: departureDatetimeEnd,
        is_time_range: values.is_time_range,
        pickup_mode: values.pickup_mode,
        pickup_radius_miles:
          values.pickup_mode === "pickup_within_radius" ? values.pickup_radius_miles : null,
        available_seats: selectedSeats,
        is_free: values.is_free,
      };

      const { data, error } = await createRide(rideData);

      if (error) {
        throw error;
      }

      toast.success("Ride created successfully!");

      if (onSuccess) {
        onSuccess();
      } else if (data) {
        router.push(`/rides/${data.id}`);
      } else {
        router.push("/events");
      }
    } catch (error) {
      console.error("Error submitting ride form:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create ride"
      );
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Ride</CardTitle>
        <CardDescription>
          Post a ride to an event. Fill out the details below to create your ride listing.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Event Selection */}
            <FormField
              control={form.control}
              name="event_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Event <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      handleEventChange(value);
                    }}
                    disabled={isSubmitting || !!eventId}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an event" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {events.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No events available.{" "}
                          <Link href="/events/new" className="text-primary hover:underline">
                            Create one
                          </Link>
                        </div>
                      ) : (
                        events.map((event) => (
                          <SelectItem key={event.id} value={event.id}>
                            {event.name} - {format(new Date(event.start_datetime), "MMM d, yyyy")}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the event this ride is for.{" "}
                    <Link href="/events/new" className="text-primary hover:underline">
                      Create new event
                    </Link>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Car Preset Selection */}
            <FormField
              control={form.control}
              name="car_preset_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Vehicle <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={handleCarPresetChange}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your vehicle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {carPresets.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No car presets available.{" "}
                          <Link href="/profile/cars/new" className="text-primary hover:underline">
                            Register a vehicle
                          </Link>
                        </div>
                      ) : (
                        carPresets.map((preset) => (
                          <SelectItem key={preset.id} value={preset.id}>
                            {preset.name || `${preset.brand} ${preset.model}`} - {preset.license_plate}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select which vehicle you'll be using for this ride.{" "}
                    <Link href="/profile/cars/new" className="text-primary hover:underline">
                      Add new vehicle
                    </Link>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Departure Address */}
            <FormField
              control={form.control}
              name="departure_address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Departure Address <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 123 Main St, Buffalo, NY"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The address where you'll be departing from.
                    {/* TODO: Add Google Maps autocomplete in Stage 2 */}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Departure Time - Single or Range */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="is_time_range"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(checked);
                          if (!checked) {
                            form.setValue("departure_datetime_end", "");
                          }
                        }}
                        disabled={isSubmitting}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Use time range</FormLabel>
                      <FormDescription>
                        Check if you have a flexible departure time (e.g., "between 3pm and 4pm")
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Departure Time Start */}
                <FormField
                  control={form.control}
                  name="departure_datetime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {form.watch("is_time_range") ? "Departure Time Start" : "Departure Time"}{" "}
                        <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Departure Time End (if time range) */}
                {form.watch("is_time_range") && (
                  <FormField
                    control={form.control}
                    name="departure_datetime_end"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Departure Time End <span className="text-destructive">*</span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="datetime-local"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </div>

            {/* Pickup Mode */}
            <FormField
              control={form.control}
              name="pickup_mode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Pickup Mode <span className="text-destructive">*</span></FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      if (value === "meet_at_location") {
                        form.setValue("pickup_radius_miles", undefined);
                      }
                    }}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="meet_at_location">Meet at departure location</SelectItem>
                      <SelectItem value="pickup_within_radius">Pickup within radius</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose how riders will join the ride.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Pickup Radius (if pickup_within_radius) */}
            {form.watch("pickup_mode") === "pickup_within_radius" && (
              <FormField
                control={form.control}
                name="pickup_radius_miles"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Pickup Radius (miles) <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={field.value?.toString() || ""}
                      onValueChange={(value) => field.onChange(parseFloat(value))}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select radius" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 mile</SelectItem>
                        <SelectItem value="2">2 miles</SelectItem>
                        <SelectItem value="3">3 miles</SelectItem>
                        <SelectItem value="5">5 miles</SelectItem>
                        <SelectItem value="10">10 miles</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Maximum distance from departure location for pickup.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Available Seats */}
            <div className="space-y-3">
              <FormLabel>
                Available Seats <span className="text-destructive">*</span>
              </FormLabel>
              <FormDescription>
                Select which seats are available for this ride. Default seats from your car preset
                are pre-selected, but you can override them here.
              </FormDescription>
              {selectedCarPreset?.default_available_seats && selectedCarPreset.default_available_seats.length > 0 && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4" />
                  Using default seats from {selectedCarPreset.name || `${selectedCarPreset.brand} ${selectedCarPreset.model}`}:{" "}
                  {formatSeatsForDisplay(selectedCarPreset.default_available_seats)}
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-2">
                {AVAILABLE_SEAT_NUMBERS.map((seatNumber) => (
                  <div key={seatNumber} className="flex items-center space-x-2">
                    <Checkbox
                      id={`seat-${seatNumber}`}
                      checked={selectedSeats.includes(seatNumber)}
                      onCheckedChange={() => handleSeatToggle(seatNumber)}
                      disabled={isSubmitting}
                    />
                    <label
                      htmlFor={`seat-${seatNumber}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Seat {seatNumber}
                    </label>
                  </div>
                ))}
              </div>
              {selectedSeats.length > 0 && (
                <p className="text-sm text-muted-foreground pt-2">
                  Selected: {formatSeatsForDisplay(selectedSeats)}
                </p>
              )}
              {form.formState.errors.available_seats && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.available_seats.message}
                </p>
              )}
            </div>

            {/* Is Free (Stage 1: always true, but include for future) */}
            <FormField
              control={form.control}
              name="is_free"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting || true} // Disabled for Stage 1 (all rides are free)
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>Free ride</FormLabel>
                    <FormDescription>
                      This ride is free. Paid rides will be available in Stage 2.
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Ride
              </Button>
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

