/**
 * Prerequisites Checking Functions for ShareRide
 * 
 * ShareRide has a prerequisites system - users can browse everything, but need specific
 * information filled out to ride (book seats) or drive (post rides). This enforces
 * data requirements before allowing actions.
 * 
 * These functions check if a user has completed all required profile information
 * and meets the prerequisites for riding or driving.
 * 
 * Note: These functions use the server-side Supabase client, so they should be called
 * from Server Components, API Routes, or Server Actions.
 */

import { createClient } from "@/lib/supabase/server";

/**
 * Result type for prerequisite checks
 */
export interface PrerequisitesCheckResult {
  canRide?: boolean;
  canDrive?: boolean;
  missingRequirements: string[];
}

/**
 * Checks if a user has all required information to ride (book seats on rides)
 * 
 * Requirements to ride:
 * - legal_first_name: Required for identification
 * - legal_last_name: Required for identification
 * - phone_verified: Must be true (phone number verified)
 * - profile_picture_url: Required so other users can see who's riding
 * 
 * @param userId - The user's ID (from auth.users)
 * @returns Object with canRide boolean and list of missing requirements
 */
export async function canUserRide(
  userId: string
): Promise<PrerequisitesCheckResult> {
  const supabase = await createClient();
  const missing: string[] = [];

  try {
    // Fetch user's profile from the profiles table
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("legal_first_name, legal_last_name, phone_verified, profile_picture_url")
      .eq("id", userId)
      .single();

    if (profileError) {
      console.error("Error fetching profile for prerequisites check:", profileError);
      return {
        canRide: false,
        missingRequirements: ["Unable to verify profile information"],
      };
    }

    if (!profile) {
      return {
        canRide: false,
        missingRequirements: ["Profile not found"],
      };
    }

    // Check each requirement
    if (!profile.legal_first_name || profile.legal_first_name.trim() === "") {
      missing.push("Legal first name");
    }

    if (!profile.legal_last_name || profile.legal_last_name.trim() === "") {
      missing.push("Legal last name");
    }

    if (!profile.phone_verified) {
      missing.push("Verified phone number");
    }

    if (!profile.profile_picture_url || profile.profile_picture_url.trim() === "") {
      missing.push("Profile picture");
    }

    return {
      canRide: missing.length === 0,
      missingRequirements: missing,
    };
  } catch (error) {
    console.error("Error in canUserRide:", error);
    return {
      canRide: false,
      missingRequirements: ["Error checking prerequisites"],
    };
  }
}

/**
 * Checks if a user can drive (post rides)
 * 
 * Requirements to drive:
 * - All requirements from canUserRide() (must be able to ride first)
 * - At least one car preset exists (user must have registered at least one vehicle)
 * 
 * @param userId - The user's ID (from auth.users)
 * @returns Object with canDrive boolean and list of missing requirements
 */
export async function canUserDrive(
  userId: string
): Promise<PrerequisitesCheckResult> {
  const supabase = await createClient();
  
  try {
    // First check if user meets ride requirements
    const rideCheck = await canUserRide(userId);
    const missing = [...rideCheck.missingRequirements];

    // Check if user has at least one car preset
    // Note: car_presets table will be created in a later migration (Step 7)
    // This function will work fully once that table exists
    const { data: carPresets, error: carPresetsError } = await supabase
      .from("car_presets")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    // Handle errors - if table doesn't exist yet (42P01), that's expected during development
    if (carPresetsError) {
      if (carPresetsError.code === "42P01") {
        // Table doesn't exist yet - this is expected during development
        // Once car_presets table is created, this check will work properly
        missing.push("At least one car preset");
      } else {
        // Other errors - log but still require car preset
        console.error("Error checking car presets:", carPresetsError);
        missing.push("At least one car preset");
      }
    } else if (!carPresets || carPresets.length === 0) {
      // No car presets found
      missing.push("At least one car preset");
    }

    return {
      canDrive: missing.length === 0,
      missingRequirements: missing,
    };
  } catch (error) {
    console.error("Error in canUserDrive:", error);
    // If it's a table not found error, that's expected during development
    const errorMessage =
      error instanceof Error && error.message.includes("does not exist")
        ? "Car presets table not yet created"
        : "Error checking prerequisites";
    
    return {
      canDrive: false,
      missingRequirements: [errorMessage],
    };
  }
}

/**
 * Helper function to get user-friendly requirement messages
 * Can be used to display what's missing to users
 */
export function getRequirementMessage(requirement: string): string {
  const messages: Record<string, string> = {
    "Legal first name": "Please provide your legal first name in your profile",
    "Legal last name": "Please provide your legal last name in your profile",
    "Verified phone number": "Please verify your phone number in your profile",
    "Profile picture": "Please upload a profile picture",
    "At least one car preset": "Please register at least one vehicle in your profile",
  };

  return messages[requirement] || `Please complete: ${requirement}`;
}

