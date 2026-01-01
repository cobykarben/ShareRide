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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  formatSeatsForDisplay,
  validateSeatConfiguration,
} from "@/lib/utils/seatConfig";
import {
  getAllBrands,
  getModelsForBrand,
  getAvailableSeatsForModel,
} from "@/lib/utils/carData";

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

// Note: Seat numbers are now dynamically determined based on the selected car model
// Seat 1 is always the driver's seat
// Available seats will be generated based on the model's default_seats value

export function CarPresetForm({ initialValues, onSuccess, onCancel }: CarPresetFormProps) {
  const router = useRouter();
  const { createCarPreset, updateCarPreset } = useCarPresets();
  const isEditMode = !!initialValues;
  const [selectedSeats, setSelectedSeats] = useState<number[]>(
    initialValues?.default_available_seats || []
  );
  const [selectedBrand, setSelectedBrand] = useState<string>(
    initialValues?.brand || ""
  );
  const [selectedModel, setSelectedModel] = useState<string>(
    initialValues?.model || ""
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
      setSelectedBrand(initialValues.brand || "");
      setSelectedModel(initialValues.model || "");
    }
  }, [initialValues, form]);

  // Auto-set seats when model is selected
  useEffect(() => {
    if (selectedBrand && selectedModel && !isEditMode) {
      // Only auto-set seats when creating new preset (not editing)
      const availableSeats = getAvailableSeatsForModel(selectedBrand, selectedModel);
      if (availableSeats.length > 0) {
        setSelectedSeats(availableSeats);
        form.setValue("default_available_seats", availableSeats);
      }
    }
  }, [selectedBrand, selectedModel, isEditMode, form]);

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
                  <Select
                    disabled={isSubmitting}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedBrand(value);
                      // Clear model when brand changes (unless in edit mode and brand hasn't actually changed)
                      if (value !== initialValues?.brand) {
                        form.setValue("model", "");
                        setSelectedModel("");
                        setSelectedSeats([]);
                        form.setValue("default_available_seats", undefined);
                      }
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a brand" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {getAllBrands().map((brand) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the vehicle manufacturer from the list.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Model */}
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => {
                const availableModels = selectedBrand
                  ? getModelsForBrand(selectedBrand)
                  : [];
                
                return (
                  <FormItem>
                    <FormLabel>
                      Model <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      disabled={isSubmitting || !selectedBrand}
                      onValueChange={(value) => {
                        field.onChange(value);
                        setSelectedModel(value);
                        // Auto-set seats when model is selected (only for new presets)
                        if (!isEditMode) {
                          const availableSeats = getAvailableSeatsForModel(selectedBrand, value);
                          if (availableSeats.length > 0) {
                            setSelectedSeats(availableSeats);
                            form.setValue("default_available_seats", availableSeats);
                          }
                        }
                      }}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue 
                            placeholder={
                              selectedBrand 
                                ? "Select a model" 
                                : "Select a brand first"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableModels.length > 0 ? (
                          availableModels.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            {selectedBrand 
                              ? "No models available" 
                              : "Select a brand first"}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {selectedBrand
                        ? `Select the ${selectedBrand} model from the list.`
                        : "Select a brand first to see available models."}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
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
                {selectedBrand && selectedModel
                  ? `Select which seats are available for passengers. All seats for your ${selectedBrand} ${selectedModel} are pre-selected, but you can uncheck any seats that aren't typically available. Seat 1 is the driver's seat. You can override this when creating a ride.`
                  : "Select your car brand and model first to see available seats. You can uncheck any seats that aren't typically available. Seat 1 is the driver's seat. You can override this when creating a ride."}
              </FormDescription>

              {/* Seat Selection */}
              {selectedBrand && selectedModel ? (
                (() => {
                  const availableSeatsForModel = getAvailableSeatsForModel(selectedBrand, selectedModel);
                  return availableSeatsForModel.length > 0 ? (
                    <div className="space-y-2 pt-2">
                      <p className="text-sm font-medium">Select available seats:</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                        {availableSeatsForModel.map((seatNumber) => (
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
                  ) : (
                    <p className="text-sm text-muted-foreground pt-2">
                      No passenger seats available for this vehicle.
                    </p>
                  );
                })()
              ) : (
                <p className="text-sm text-muted-foreground pt-2">
                  Select a car brand and model to configure available seats.
                </p>
              )}

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

