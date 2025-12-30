"use client";

/**
 * EventForm Component for ShareRide
 * 
 * This component provides a form for creating and editing events.
 * 
 * Features:
 * - Create new events
 * - Edit existing events
 * - Form validation using zod
 * - Date/time picker
 * - Optional fields for description, website, and image
 * 
 * Props:
 * - initialValues?: Event data for editing mode
 * - onSuccess?: Callback when form is submitted successfully
 * - onCancel?: Callback when form is cancelled
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { useEvents } from "@/hooks/useEvents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

type Event = Database["public"]["Tables"]["events"]["Row"];

// Zod schema for form validation
const eventFormSchema = z.object({
  name: z.string().min(1, "Event name is required").max(200, "Event name must be less than 200 characters"),
  start_datetime: z.string().min(1, "Start date and time is required").refine(
    (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      return date > now;
    },
    {
      message: "Start date and time must be in the future",
    }
  ),
  address: z.string().min(1, "Address is required").max(500, "Address must be less than 500 characters"),
  description: z.string().optional(),
  website_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  image_url: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  /**
   * Initial values for editing mode
   * If provided, form will be in edit mode
   */
  initialValues?: Event;
  /**
   * Callback when form is submitted successfully
   */
  onSuccess?: () => void;
  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void;
}

export function EventForm({ initialValues, onSuccess, onCancel }: EventFormProps) {
  const router = useRouter();
  const { createEvent, updateEvent } = useEvents();
  const isEditMode = !!initialValues;

  // Initialize form
  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: initialValues?.name || "",
      // Convert ISO datetime to datetime-local format (YYYY-MM-DDTHH:mm)
      start_datetime: initialValues?.start_datetime
        ? format(new Date(initialValues.start_datetime), "yyyy-MM-dd'T'HH:mm")
        : "",
      address: initialValues?.address || "",
      description: initialValues?.description || "",
      website_url: initialValues?.website_url || "",
      image_url: initialValues?.image_url || "",
    },
  });

  // Update form when initialValues change
  useEffect(() => {
    if (initialValues) {
      form.reset({
        name: initialValues.name || "",
        start_datetime: initialValues.start_datetime
          ? format(new Date(initialValues.start_datetime), "yyyy-MM-dd'T'HH:mm")
          : "",
        address: initialValues.address || "",
        description: initialValues.description || "",
        website_url: initialValues.website_url || "",
        image_url: initialValues.image_url || "",
      });
    }
  }, [initialValues, form]);

  /**
   * Handle form submission
   */
  const onSubmit = async (values: EventFormValues) => {
    try {
      // Convert datetime-local format to ISO string
      const startDatetime = new Date(values.start_datetime).toISOString();

      // Prepare event data (remove empty strings for optional fields)
      const eventData = {
        name: values.name,
        start_datetime: startDatetime,
        address: values.address,
        description: values.description || null,
        website_url: values.website_url || null,
        image_url: values.image_url || null,
      };

      if (isEditMode && initialValues) {
        // Update existing event
        const { data, error } = await updateEvent(initialValues.id, eventData);
        
        if (error) {
          throw error;
        }

        toast.success("Event updated successfully!");
        
        if (onSuccess) {
          onSuccess();
        } else {
          router.push(`/events/${initialValues.id}`);
        }
      } else {
        // Create new event
        const { data, error } = await createEvent(eventData);
        
        if (error) {
          throw error;
        }

        toast.success("Event created successfully!");
        
        if (onSuccess) {
          onSuccess();
        } else if (data) {
          router.push(`/events/${data.id}`);
        } else {
          router.push("/events");
        }
      }
    } catch (error) {
      console.error("Error submitting event form:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : isEditMode
          ? "Failed to update event"
          : "Failed to create event"
      );
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditMode ? "Edit Event" : "Create New Event"}</CardTitle>
        <CardDescription>
          {isEditMode
            ? "Update the event information below."
            : "Fill out the event information below to create a new event."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Event Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Event Name <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Bills vs Patriots - December 27"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The name of the event (e.g., concert name, game title, conference name).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Start Date and Time */}
            <FormField
              control={form.control}
              name="start_datetime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Start Date and Time <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    When the event starts. Must be in the future.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Address */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Address <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="123 Main St, City, State 12345"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The full address where the event will take place.
                    {/* TODO: Add Google Maps autocomplete in Stage 2 */}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional details about the event..."
                      disabled={isSubmitting}
                      rows={4}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description providing more details about the event.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Website URL */}
            <FormField
              control={form.control}
              name="website_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/event"
                      disabled={isSubmitting}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional link to the event's official website.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Image URL */}
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input
                      type="url"
                      placeholder="https://example.com/event-image.jpg"
                      disabled={isSubmitting}
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional URL to an image for the event.
                    {/* TODO: Add file upload to Supabase Storage in Stage 2 */}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Form Actions */}
            <div className="flex justify-end gap-4 pt-4">
              {onCancel && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? "Update Event" : "Create Event"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

