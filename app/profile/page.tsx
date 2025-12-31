"use client";

/**
 * Profile Page for ShareRide
 * 
 * This page allows users to view and edit their profile information.
 * Users can update:
 * - Legal first name, last name
 * - Preferred first name (optional)
 * - Phone number (optional)
 * - Profile picture
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RouteGuard } from "@/components/RouteGuard";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, User, Upload, Camera } from "lucide-react";
import { toast } from "sonner";
import { useRef, useState } from "react";

// Form validation schema
const profileFormSchema = z.object({
  legal_first_name: z.string().min(1, "Legal first name is required"),
  legal_last_name: z.string().min(1, "Legal last name is required"),
  preferred_first_name: z.string().optional(),
  phone: z.string().optional(),
  profile_picture: z.instanceof(File).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      legal_first_name: "",
      legal_last_name: "",
      preferred_first_name: "",
      phone: "",
    },
  });

  // Load profile data into form when profile is loaded
  useEffect(() => {
    if (profile) {
      form.reset({
        legal_first_name: profile.legal_first_name || "",
        legal_last_name: profile.legal_last_name || "",
        preferred_first_name: profile.preferred_first_name || "",
        phone: profile.phone || "",
      });
      if (profile.profile_picture_url) {
        setPreviewImage(profile.profile_picture_url);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]); // Only depend on profile, not form (form.reset is stable)

  /**
   * Handle profile picture file selection
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
        toast.error("Image size must be less than 5MB");
        return;
      }

      form.setValue("profile_picture", file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  /**
   * Handle form submission
   */
  const onSubmit = async (values: ProfileFormValues) => {
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
        const errorMessage = data.error || "Failed to update profile";
        const details = data.details ? ` (${data.details})` : "";
        throw new Error(errorMessage + details);
      }

      // Refresh profile data in useAuth hook
      await refreshProfile();

      toast.success("Profile updated successfully!");
      
      // Refresh the page to show updated data
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

  // Get initials for avatar fallback
  const getInitials = () => {
    if (profile?.preferred_first_name || profile?.legal_first_name) {
      const firstName = profile?.preferred_first_name || profile?.legal_first_name || "";
      const lastName = profile?.legal_last_name || "";
      const initials = lastName 
        ? `${firstName.charAt(0)}${lastName.charAt(0)}`
        : firstName.charAt(0);
      return initials.toUpperCase() || "U";
    }
    return user?.email?.charAt(0).toUpperCase() || "U";
  };

  return (
    <RouteGuard>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
            Profile
          </h1>
          <p className="text-muted-foreground">
            Manage your profile information and preferences.
          </p>
        </div>

        {/* Profile Picture Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Profile Picture</CardTitle>
            <CardDescription>
              Upload a profile picture so other users can recognize you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                {previewImage && (
                  <AvatarImage src={previewImage} alt="Profile picture" />
                )}
                <AvatarFallback className="text-2xl">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="mr-2 h-4 w-4" />
                  {previewImage ? "Change Picture" : "Upload Picture"}
                </Button>
                <p className="text-sm text-muted-foreground mt-2">
                  JPG, PNG or GIF. Max size 5MB.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information Form */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Update your personal information. Legal name is required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        <Input {...field} placeholder="John" />
                      </FormControl>
                      <FormDescription>
                        Your legal first name as it appears on identification.
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
                        <Input {...field} placeholder="Doe" />
                      </FormControl>
                      <FormDescription>
                        Your legal last name as it appears on identification.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Preferred First Name */}
                <FormField
                  control={form.control}
                  name="preferred_first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred First Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Johnny" />
                      </FormControl>
                      <FormDescription>
                        Optional. A name you prefer to be called by (will be shown to other users).
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
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+1 (555) 123-4567" type="tel" />
                      </FormControl>
                      <FormDescription>
                        Optional. Your phone number for contact purposes.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Email (Read-only) */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    value={user?.email || ""}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-sm text-muted-foreground">
                    Your email address cannot be changed here.
                  </p>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Changes
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

