/**
 * Profile Update API Route for ShareRide
 * 
 * This route handles updating user profile information, including:
 * - Legal first name, last name
 * - Preferred first name (optional)
 * - Phone number
 * - Profile picture upload to Supabase Storage
 * 
 * The profile picture is uploaded to the 'profile-pictures' bucket in Supabase Storage.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse form data (supports file uploads)
    const formData = await request.formData();
    const legalFirstName = formData.get("legal_first_name") as string | null;
    const legalLastName = formData.get("legal_last_name") as string | null;
    const preferredFirstName = formData.get("preferred_first_name") as string | null;
    const phone = formData.get("phone") as string | null;
    const profilePicture = formData.get("profile_picture") as File | null;

    // Validate required fields
    if (!legalFirstName || !legalLastName) {
      return NextResponse.json(
        { error: "Legal first name and last name are required" },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: {
      legal_first_name: string;
      legal_last_name: string;
      preferred_first_name?: string | null;
      phone?: string | null;
      profile_picture_url?: string;
    } = {
      legal_first_name: legalFirstName.trim(),
      legal_last_name: legalLastName.trim(),
    };

    // Add optional fields if provided
    if (preferredFirstName) {
      updateData.preferred_first_name = preferredFirstName.trim();
    } else {
      updateData.preferred_first_name = null;
    }

    if (phone) {
      updateData.phone = phone.trim();
    } else {
      updateData.phone = null;
    }

    // Handle profile picture upload if provided
    if (profilePicture && profilePicture.size > 0) {
      try {
        // Generate unique filename: user-id-timestamp.ext
        const fileExt = profilePicture.name.split(".").pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const filePath = `profile-pictures/${fileName}`;

        // Convert File to ArrayBuffer for upload
        const arrayBuffer = await profilePicture.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("profile-pictures")
          .upload(filePath, buffer, {
            contentType: profilePicture.type,
            upsert: false, // Don't overwrite existing files
          });

        if (uploadError) {
          console.error("Error uploading profile picture:", uploadError);
          return NextResponse.json(
            { error: "Failed to upload profile picture", details: uploadError.message },
            { status: 500 }
          );
        }

        // Get public URL for the uploaded file
        const { data: urlData } = supabase.storage
          .from("profile-pictures")
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          updateData.profile_picture_url = urlData.publicUrl;
        } else {
          console.error("Failed to get public URL for uploaded file");
          return NextResponse.json(
            { error: "Failed to get profile picture URL" },
            { status: 500 }
          );
        }
      } catch (uploadError) {
        console.error("Error processing profile picture upload:", uploadError);
        return NextResponse.json(
          { error: "Failed to process profile picture" },
          { status: 500 }
        );
      }
    }

    // Update profile in database
    const { data: updatedProfile, error: updateError } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", user.id)
      .select()
      .single();

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile", details: updateError.message },
        { status: 500 }
      );
    }

    // Return updated profile data
    return NextResponse.json(
      { profile: updatedProfile },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in profile update:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

