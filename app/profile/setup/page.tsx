"use client";

/**
 * Profile Setup Page for ShareRide
 * 
 * This page allows users to complete their profile information after signing up.
 * Users need to provide required information (legal name, phone, profile picture)
 * before they can ride or drive.
 * 
 * Fields:
 * - legal_first_name (required)
 * - legal_last_name (required)
 * - preferred_first_name (optional)
 * - phone (required for riding)
 * - profile_picture (required for riding)
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { RouteGuard } from "@/components/RouteGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

// Zod schema for form validation
const profileSetupSchema = z.object({
  legal_first_name: z.string().min(1, "Legal first name is required"),
  legal_last_name: z.string().min(1, "Legal last name is required"),
  preferred_first_name: z.string().optional(),
  phone: z.string().optional(),
  profile_picture: z.instanceof(File).nullable().optional(),
});

type ProfileSetupFormValues = z.infer<typeof profileSetupSchema>;

export default function ProfileSetupPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Initialize form with existing profile data if available
  const form = useForm<ProfileSetupFormValues>({
    resolver: zodResolver(profileSetupSchema),
    defaultValues: {
      legal_first_name: profile?.legal_first_name || "",
      legal_last_name: profile?.legal_last_name || "",
      preferred_first_name: profile?.preferred_first_name || "",
      phone: profile?.phone || "",
    },
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profile && !authLoading) {
      form.reset({
        legal_first_name: profile.legal_first_name || "",
        legal_last_name: profile.legal_last_name || "",
        preferred_first_name: profile.preferred_first_name || "",
        phone: profile.phone || "",
      });
      if (profile.profile_picture_url) {
        setPreviewUrl(profile.profile_picture_url);
      }
    }
  }, [profile, authLoading, form]);

  /**
   * Handle file selection for profile picture
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      // Set file in form
      form.setValue("profile_picture", file, { shouldValidate: false });

      // Create preview URL
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  /**
   * Handle form submission
   */
  const onSubmit = async (values: ProfileSetupFormValues) => {
    if (!user) {
      toast.error("You must be logged in to update your profile");
      return;
    }

    setIsSubmitting(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("legal_first_name", values.legal_first_name);
      formData.append("legal_last_name", values.legal_last_name);
      if (values.preferred_first_name) {
        formData.append("preferred_first_name", values.preferred_first_name);
      }
      if (values.phone) {
        formData.append("phone", values.phone);
      }
      if (values.profile_picture) {
        formData.append("profile_picture", values.profile_picture);
      }

      // Submit to API route
      const response = await fetch("/api/profile/update", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      // Refresh profile data in useAuth hook
      await refreshProfile();

      toast.success("Profile updated successfully!");
      
      // Redirect to homepage after successful update
      router.push("/");
      router.refresh();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to update profile"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <RouteGuard>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
            <CardDescription>
              Fill out your profile information to start using ShareRide. All
              fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                {/* Profile Picture Upload */}
                <div className="space-y-4">
                  <FormLabel>Profile Picture *</FormLabel>
                  <div className="flex items-center gap-6">
                    <Avatar className="h-24 w-24">
                      {previewUrl && (
                        <AvatarImage src={previewUrl} alt="Profile preview" />
                      )}
                      <AvatarFallback className="text-lg">
                        {form.watch("legal_first_name")?.charAt(0) ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={isSubmitting}
                        className="cursor-pointer"
                      />
                      <FormDescription className="mt-2">
                        Upload a profile picture (max 5MB). This helps other
                        users identify you.
                      </FormDescription>
                    </div>
                  </div>
                </div>

                {/* Legal First Name */}
                <FormField
                  control={form.control}
                  name="legal_first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Legal First Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="John"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Your legal first name as it appears on official documents.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Legal Last Name */}
                <FormField
                  control={form.control}
                  name="legal_last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Legal Last Name <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Doe"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Your legal last name as it appears on official documents.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Preferred First Name (Optional) */}
                <FormField
                  control={form.control}
                  name="preferred_first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred First Name (Optional)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Johnny"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        The name you'd like others to call you. If not provided, your legal first name will be used.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone Number */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Phone Number <span className="text-muted-foreground">(Optional for now)</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+1 (555) 123-4567"
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Your phone number. Phone verification will be added later.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Button */}
                <div className="flex gap-4">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    {isSubmitting ? "Saving..." : "Save Profile"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push("/")}
                    disabled={isSubmitting}
                  >
                    Skip for Now
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </RouteGuard>
  );
}

