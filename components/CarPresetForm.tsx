"use client";

/**
 * CarPresetForm Component for ShareRide
 * 
 * This component provides a form for creating and editing car presets.
 * Car presets store saved vehicle information that drivers can reuse when creating rides.
 * 
 * Features:
 * - Create new car presets
 * - Edit existing car presets
 * - Form validation using zod
 * - Seat selection using checkboxes (basic - Stage 1)
 * - License plate uniqueness validation
 * 
 * Props:
 * - initialValues?: Car preset data for editing mode
 * - onSuccess?: Callback when form is submitted successfully
 * - onCancel?: Callback when form is cancelled
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import type { Database } from "@/types/database.types";
import {
  VEHICLE_TYPE_SEATS,
  getDefaultSeatsForVehicleType,
  formatSeatsForDisplay,
  validateSeatConfiguration,
} from "@/lib/utils/seatConfig";

type CarPreset = Database["public"]["Tables"]["car_presets"]["Row"];

// Zod schema for form validation
const carPresetFormSchema = z.object({
  brand: z.string().min(1, "Brand is required").max(100, "Brand must be less than 100 characters"),
  model: z.string().min(1, "Model is required").max(100, "Model must be less than 100 characters"),
  color: z.string().min(1, "Color is required").max(50, "Color must be less than 50 characters"),
  license_plate: z
    .string()
    .min(1, "License plate is required")
    .max(20, "License plate must be less than 20 characters")
    .transform((val) => val.toUpperCase().trim()), // Normalize to uppercase
  name: z.string().max(100, "Name must be less than 100 characters").optional().or(z.literal("")),
  default_available_seats: z.array(z.number().int().positive()).optional(),
});

type CarPresetFormValues = z.infer<typeof carPresetFormSchema>;

interface CarPresetFormProps {
  /**
   * Initial values for editing mode
   * If provided, form will be in edit mode
   */
  initialValues?: CarPreset;
  /**
   * Callback when form is submitted successfully
   */
  onSuccess?: () => void;
  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void;
}

// Common seat numbers (most cars have seats 2-8, with seat 1 being the driver)
// For Stage 1, we use checkboxes for simplicity
// Visual seat maps will be added in Stage 2
const AVAILABLE_SEAT_NUMBERS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

export function CarPresetForm({ initialValues, onSuccess, onCancel }: CarPresetFormProps) {
  const router = useRouter();
  const { createCarPreset, updateCarPreset } = useCarPresets();
  const isEditMode = !!initialValues;
  const [selectedSeats, setSelectedSeats] = useState<number[]>(
    initialValues?.default_available_seats || []
  );

  // Initialize form
  const form = useForm<CarPresetFormValues>({
    resolver: zodResolver(carPresetFormSchema),
    defaultValues: {
      brand: initialValues?.brand || "",
      model: initialValues?.model || "",
      color: initialValues?.color || "",
      license_plate: initialValues?.license_plate || "",
      name: initialValues?.name || "",
      default_available_seats: initialValues?.default_available_seats || [],
    },
  });

  // Update form when initialValues change
  useEffect(() => {
    if (initialValues) {
      form.reset({
        brand: initialValues.brand || "",
        model: initialValues.model || "",
        color: initialValues.color || "",
        license_plate: initialValues.license_plate || "",
        name: initialValues.name || "",
        default_available_seats: initialValues.default_available_seats || [],
      });
      setSelectedSeats(initialValues.default_available_seats || []);
    }
  }, [initialValues, form]);

  /**
   * Handle seat checkbox changes
   */
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
    form.setValue("default_available_seats", newSeats.length > 0 ? newSeats : undefined);
  };

  /**
   * Quick-select seats for common vehicle types
   */
  const handleQuickSelect = (vehicleType: keyof typeof VEHICLE_TYPE_SEATS) => {
    const defaultSeats = getDefaultSeatsForVehicleType(vehicleType);
    // Filter to only show seats that are in our available range
    const filteredSeats = defaultSeats.filter((seat) =>
      AVAILABLE_SEAT_NUMBERS.includes(seat)
    );
    
    // Validate before setting
    const validation = validateSeatConfiguration(filteredSeats);
    if (!validation.isValid && validation.error) {
      toast.error(validation.error);
      return;
    }

    setSelectedSeats(filteredSeats);
    form.setValue("default_available_seats", filteredSeats.length > 0 ? filteredSeats : undefined);
  };

  /**
   * Handle form submission
   */
  const onSubmit = async (values: CarPresetFormValues) => {
    try {
      // Prepare car preset data
      // Convert empty string to null for optional fields
      const carPresetData = {
        brand: values.brand.trim(),
        model: values.model.trim(),
        color: values.color.trim(),
        license_plate: values.license_plate.trim(),
        name: values.name?.trim() || null,
        default_available_seats: selectedSeats.length > 0 ? selectedSeats : null,
      };

      if (isEditMode && initialValues) {
        // Update existing car preset
        const { data, error } = await updateCarPreset(initialValues.id, carPresetData);

        if (error) {
          throw error;
        }

        toast.success("Car preset updated successfully!");

        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/profile/cars");
        }
      } else {
        // Create new car preset
        const { data, error } = await createCarPreset(carPresetData);

        if (error) {
          throw error;
        }

        toast.success("Car preset created successfully!");

        if (onSuccess) {
          onSuccess();
        } else {
          router.push("/profile/cars");
        }
      }
    } catch (error) {
      console.error("Error submitting car preset form:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : isEditMode
          ? "Failed to update car preset"
          : "Failed to create car preset"
      );
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? "Edit Car Preset" : "Create New Car Preset"}</CardTitle>
        <CardDescription>
          {isEditMode
            ? "Update your car preset information below."
            : "Register your vehicle below. You can use this preset when creating rides."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Brand */}
            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Brand <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Toyota, Ford, Tesla"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The vehicle manufacturer (e.g., Toyota, Ford, Honda).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Model */}
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Model <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Camry, F-150, Model 3"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The vehicle model name (e.g., Camry, F-150, Model 3).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Color <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Silver, Black, Blue"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The vehicle color (e.g., Silver, Black, Blue, White).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* License Plate */}
            <FormField
              control={form.control}
              name="license_plate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    License Plate <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., ABC-1234"
                      disabled={isSubmitting}
                      {...field}
                      onChange={(e) => {
                        // Automatically convert to uppercase
                        field.onChange(e.target.value.toUpperCase());
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    Your vehicle's license plate number. Must be unique per user.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Name (Optional Nickname) */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nickname (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., My Toyota, Work Truck"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    An optional nickname for this car preset (e.g., "My Toyota", "Work Truck").
                    This helps you identify the car when creating rides.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Default Available Seats */}
            <div className="space-y-3">
              <FormLabel>Default Available Seats (Optional)</FormLabel>
              <FormDescription>
                Select which seats are typically available for passengers by default.
                Seat 1 is usually the driver's seat. You can override this when creating a ride.
              </FormDescription>
              
              {/* Quick Select Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-sm text-muted-foreground self-center mr-2">Quick select:</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect("sedan")}
                  disabled={isSubmitting}
                >
                  Sedan (4-5 seats)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect("suv")}
                  disabled={isSubmitting}
                >
                  SUV (7-8 seats)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect("van")}
                  disabled={isSubmitting}
                >
                  Van (8-15 seats)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect("truck")}
                  disabled={isSubmitting}
                >
                  Truck (2-3 seats)
                </Button>
              </div>

              {/* Manual Seat Selection */}
              <div className="space-y-2 pt-2">
                <p className="text-sm font-medium">Or select manually:</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
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
              </div>

              {/* Selected Seats Display */}
              {selectedSeats.length > 0 && (
                <p className="text-sm text-muted-foreground pt-2">
                  {formatSeatsForDisplay(selectedSeats)}
                </p>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Update Car Preset" : "Create Car Preset"}
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

