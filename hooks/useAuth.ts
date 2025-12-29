"use client";

/**
 * useAuth Hook for ShareRide
 * 
 * This hook manages authentication state and provides functions for sign up, sign in, sign out.
 * It listens for auth state changes and fetches the user's profile from the profiles table.
 * 
 * Note: ShareRide uses unified profiles - there's NO distinction between "driver" and "rider" roles.
 * All users have the same profile structure and can both drive and ride (as long as they meet prerequisites).
 */

import { useState, useEffect, useCallback } from "react";
import { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

// Type for Profile (from database types)
type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Return type for the hook
interface UseAuthReturn {
  // User data from Supabase Auth
  user: User | null;
  // Profile data from profiles table
  profile: Profile | null;
  // Loading state (checking auth status, fetching profile)
  loading: boolean;
  // Error state
  error: string | null;
  // Authentication functions
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  // Refresh profile data
  refreshProfile: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  /**
   * Fetch profile data for the current user
   * This gets the extended profile information from the profiles table
   */
  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
        setError(profileError.message);
        setProfile(null);
        return;
      }

      setProfile(data);
      setError(null);
    } catch (err) {
      console.error("Error in fetchProfile:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch profile");
      setProfile(null);
    }
  }, [supabase]);

  /**
   * Get initial session and set up auth state listener
   * This runs on component mount to check if user is already logged in
   */
  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        setLoading(true);
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("Error getting session:", sessionError);
          setError(sessionError.message);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (session?.user) {
          setUser(session.user);
          // Fetch profile data for the authenticated user
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (err) {
        console.error("Error in getInitialSession:", err);
        setError(err instanceof Error ? err.message : "Failed to get session");
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth state changes
    // This fires when user logs in, logs out, or their session changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);

      if (session?.user) {
        setUser(session.user);
        // Fetch profile when user logs in or session refreshes
        await fetchProfile(session.user.id);
      } else {
        // User logged out or session expired
        setUser(null);
        setProfile(null);
      }

      setLoading(false);
    });

    // Cleanup: unsubscribe when component unmounts
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  /**
   * Sign in with email and password
   */
  const signIn = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);
        setError(null);

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) {
          setError(signInError.message);
          return { error: signInError };
        }

        // User will be set via onAuthStateChange listener
        return { error: null };
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Sign in failed");
        setError(error.message);
        return { error };
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  /**
   * Sign up with email and password
   * The auto-profile trigger will create a profile record automatically
   */
  const signUp = useCallback(
    async (email: string, password: string) => {
      try {
        setLoading(true);
        setError(null);

        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) {
          setError(signUpError.message);
          return { error: signUpError };
        }

        // User will be set via onAuthStateChange listener
        // Profile will be created automatically by the trigger
        return { error: null };
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Sign up failed");
        setError(error.message);
        return { error };
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  /**
   * Sign out
   */
  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError(signOutError.message);
        return { error: signOutError };
      }

      // User and profile will be cleared via onAuthStateChange listener
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Sign out failed");
      setError(error.message);
      return { error };
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * Sign in with Google OAuth
   * Note: Make sure Google OAuth is configured in Supabase Dashboard
   */
  const signInWithGoogle = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (oauthError) {
        setError(oauthError.message);
        return { error: oauthError };
      }

      // User will be redirected to Google, then back to /auth/callback
      // The callback route will handle the session setup
      return { error: null };
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("Google sign in failed");
      setError(error.message);
      return { error };
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  /**
   * Refresh profile data (useful after updating profile)
   */
  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user, fetchProfile]);

  return {
    user,
    profile,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    refreshProfile,
  };
}

