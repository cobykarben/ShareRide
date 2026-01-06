/**
 * Auth Callback Route for ShareRide OAuth
 * 
 * This route handles OAuth callbacks from providers like Google.
 * When a user signs in with OAuth, the provider redirects back to this route
 * with a 'code' query parameter. This route exchanges that code for a session.
 * 
 * OAuth Flow:
 * 1. User clicks "Sign in with Google" in AuthForm
 * 2. User is redirected to Google for authentication
 * 3. Google redirects back to this route with a 'code' parameter
 * 4. This route exchanges the code for a session using Supabase
 * 5. User is redirected to the rides page
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  // Get the next URL to redirect to after authentication (optional)
  // If not specified, defaults to /rides
  const next = requestUrl.searchParams.get("next");

  // If there's no code parameter, redirect to home (or login page)
  // This can happen if someone navigates directly to /auth/callback
  if (!code) {
    console.error("OAuth callback: No code parameter found");
    return NextResponse.redirect(new URL("/", requestUrl.origin));
  }

  try {
    // Create Supabase client on the server
    const supabase = await createClient();

    // Exchange the authorization code for a session
    // This sets the session cookies automatically
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("OAuth callback error:", error);
      // Redirect to home with an error message
      // In a production app, you might want to redirect to a login page
      // with an error message displayed
      return NextResponse.redirect(
        new URL(`/?error=oauth_callback_error&message=${encodeURIComponent(error.message)}`, requestUrl.origin)
      );
    }

    // Success! User is now authenticated
    // Redirect to rides page (or next URL if specified)
    const redirectUrl = next || "/rides";
    return NextResponse.redirect(new URL(redirectUrl, requestUrl.origin));
  } catch (error) {
    console.error("Unexpected error in OAuth callback:", error);
    // Handle unexpected errors
    return NextResponse.redirect(
      new URL(
        `/?error=unexpected_error&message=${encodeURIComponent(
          error instanceof Error ? error.message : "An unexpected error occurred"
        )}`,
        requestUrl.origin
      )
    );
  }
}

