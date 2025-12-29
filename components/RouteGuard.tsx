"use client";

/**
 * RouteGuard Component for ShareRide
 * 
 * This component protects routes by ensuring only authenticated users can access them.
 * It wraps protected pages/components and checks authentication status before rendering.
 * 
 * Usage:
 * ```tsx
 * <RouteGuard>
 *   <ProtectedPageContent />
 * </RouteGuard>
 * ```
 * 
 * How it works:
 * 1. Uses useAuth hook to check if user is authenticated
 * 2. Shows loading state while checking authentication
 * 3. Redirects to homepage (/) if user is not authenticated
 * 4. Only renders children if user is authenticated
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface RouteGuardProps {
  /**
   * Child components to render if user is authenticated
   */
  children: React.ReactNode;
  
  /**
   * Optional: Custom redirect URL if user is not authenticated
   * Defaults to "/"
   */
  redirectTo?: string;
  
  /**
   * Optional: Show a loading spinner while checking authentication
   * Defaults to true
   */
  showLoading?: boolean;
}

export function RouteGuard({
  children,
  redirectTo = "/",
  showLoading = true,
}: RouteGuardProps) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Wait for auth check to complete
    if (loading) {
      return;
    }

    // If user is not authenticated, redirect to specified URL (default: homepage)
    if (!user) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo]);

  // Show loading state while checking authentication
  if (loading) {
    if (showLoading) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </div>
      );
    }
    // If showLoading is false, don't render anything while loading
    return null;
  }

  // If user is not authenticated, don't render children
  // (redirect will happen via useEffect, but we don't want to flash content)
  if (!user) {
    return null;
  }

  // User is authenticated, render children
  return <>{children}</>;
}

