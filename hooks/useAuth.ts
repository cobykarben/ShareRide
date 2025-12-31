"use client";

/**
 * useAuth Hook for ShareRide
 * 
 * This hook manages authentication state and provides functions for sign up, sign in, sign out.
 * It listens for auth state changes and fetches the user's profile from the profiles table.
 * 
 * Note: ShareRide uses unified profiles - there's NO distinction between "driver" and "rider" roles.
 * All users have the same profile structure and can both drive and ride (as long as they meet prerequisites).
 * 
 * IMPLEMENTATION NOTE: Uses module-level singleton for auth subscription to prevent duplicates
 * in React Strict Mode double-mount scenarios. Each hook instance registers callbacks that are
 * called when auth state changes, ensuring consistent state across all instances.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { User, type AuthChangeEvent, type Session } from "@supabase/supabase-js";
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

// Module-level singleton for auth subscription
// This ensures only one subscription exists, even in React Strict Mode
type AuthStateCallback = (user: User | null, profile: Profile | null, loading: boolean, error: string | null) => void;

class AuthManager {
  private supabase = createClient();
  private subscription: ReturnType<typeof this.supabase.auth.onAuthStateChange>["data"]["subscription"] | null = null;
  private callbacks = new Set<AuthStateCallback>();
  private currentUser: User | null = null;
  private currentProfile: Profile | null = null;
  private isLoading = true;
  private error: string | null = null;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    if (process.env.NODE_ENV !== "production") {
      console.log("[auth-manager] created singleton instance");
    }
    this.initialize();
  }

  private async initialize() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        if (process.env.NODE_ENV !== "production") {
          console.log("[auth-manager] initializing");
        }

        // Get initial session
        const {
          data: { session },
          error: sessionError,
        } = await this.supabase.auth.getSession();

        if (sessionError) {
          console.error("[auth-manager] Error getting session:", sessionError);
          this.error = sessionError.message;
          this.currentUser = null;
          this.currentProfile = null;
          this.isLoading = false;
          this.notifyAll();
          return;
        }

        if (session?.user) {
          this.currentUser = session.user;
          await this.fetchProfile(session.user.id);
        } else {
          this.currentUser = null;
          this.currentProfile = null;
        }

        this.isLoading = false;
        this.notifyAll();

        // Set up auth state change listener (only once)
        if (!this.subscription) {
          const { data: { subscription } } = this.supabase.auth.onAuthStateChange(
            async (event: AuthChangeEvent, session: Session | null) => {
              if (process.env.NODE_ENV !== "production") {
                console.log("[auth-manager] auth state changed:", event, "user:", session?.user?.id ?? null);
              }

              if (session?.user) {
                this.currentUser = session.user;
                this.isLoading = true;
                this.notifyAll();
                await this.fetchProfile(session.user.id);
                this.isLoading = false;
              } else {
                this.currentUser = null;
                this.currentProfile = null;
                this.isLoading = false;
              }

              this.notifyAll();
            }
          );
          this.subscription = subscription;
        }
      } catch (err) {
        console.error("[auth-manager] Initialization error:", err);
        this.error = err instanceof Error ? err.message : "Failed to initialize auth";
        this.isLoading = false;
        this.notifyAll();
      }
    })();

    return this.initializationPromise;
  }

  private async fetchProfile(userId: string): Promise<void> {
    try {
      if (process.env.NODE_ENV !== "production") {
        const { data: sessionData } = await this.supabase.auth.getSession();
        console.log("[profile] fetchProfile start", {
          requestedUserId: userId,
          hasSession: !!sessionData.session,
          sessionUserId: sessionData.session?.user?.id ?? null,
          tokenPrefix: sessionData.session?.access_token?.slice(0, 12) ?? null,
          t: new Date().toISOString(),
        });
      }

      const { data, error: profileError } = await this.supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (process.env.NODE_ENV !== "production") {
        console.log("[profile] fetchProfile result", {
          ok: !profileError,
          error: profileError?.message ?? null,
          found: !!data,
          t: new Date().toISOString(),
        });
      }

      if (profileError) {
        console.error("[auth-manager] Error fetching profile:", profileError);
        this.error = profileError.message;
        this.currentProfile = null;
        return;
      }

      this.currentProfile = data;
      this.error = null;
    } catch (err) {
      console.error("[auth-manager] Error in fetchProfile:", err);
      this.error = err instanceof Error ? err.message : "Failed to fetch profile";
      this.currentProfile = null;
    }
  }

  private notifyAll() {
    this.callbacks.forEach((callback) => {
      try {
        callback(this.currentUser, this.currentProfile, this.isLoading, this.error);
      } catch (err) {
        console.error("[auth-manager] Error in callback:", err);
      }
    });
  }

  subscribe(callback: AuthStateCallback): () => void {
    this.callbacks.add(callback);
    // Immediately notify with current state
    callback(this.currentUser, this.currentProfile, this.isLoading, this.error);

    if (process.env.NODE_ENV !== "production") {
      console.log("[auth-manager] callback subscribed, total callbacks:", this.callbacks.size);
    }

    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
      if (process.env.NODE_ENV !== "production") {
        console.log("[auth-manager] callback unsubscribed, total callbacks:", this.callbacks.size);
      }
    };
  }

  getSupabase() {
    return this.supabase;
  }

  async refreshProfile() {
    if (this.currentUser) {
      await this.fetchProfile(this.currentUser.id);
      this.notifyAll();
    }
  }
}

// Module-level singleton instance
const authManager = new AuthManager();

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use ref to track if component is mounted (cleanup-safe)
  const isMountedRef = useRef(true);
  const mountIdRef = useRef(Math.random().toString(36).slice(2, 7));

  // Get supabase client from auth manager
  const supabase = useMemo(() => authManager.getSupabase(), []);

  // Subscribe to auth state changes
  useEffect(() => {
    isMountedRef.current = true;
    const mountId = mountIdRef.current; // Capture for cleanup

    if (process.env.NODE_ENV !== "production") {
      console.log("[auth] hook mount", mountId);
    }

    // Subscribe to auth manager updates
    const unsubscribe = authManager.subscribe((newUser, newProfile, newLoading, newError) => {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setUser(newUser);
        setProfile(newProfile);
        setLoading(newLoading);
        setError(newError);
      }
    });

    // Cleanup: unsubscribe and mark as unmounted
    return () => {
      if (process.env.NODE_ENV !== "production") {
        console.log("[auth] hook unmount", mountId);
      }
      isMountedRef.current = false;
      unsubscribe();
    };
  }, []);

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

        // User will be set via auth manager listener
        return { error: null };
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Sign in failed");
        setError(error.message);
        return { error };
      } finally {
        // Loading will be updated by auth manager
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

        // User will be set via auth manager listener
        // Profile will be created automatically by the trigger
        return { error: null };
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Sign up failed");
        setError(error.message);
        return { error };
      } finally {
        // Loading will be updated by auth manager
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

      // User and profile will be cleared via auth manager listener
      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Sign out failed");
      setError(error.message);
      return { error };
    } finally {
      // Loading will be updated by auth manager
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
      // Loading will be updated by auth manager
    }
  }, [supabase]);

  /**
   * Refresh profile data (useful after updating profile)
   */
  const refreshProfile = useCallback(async () => {
    await authManager.refreshProfile();
  }, []);

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
