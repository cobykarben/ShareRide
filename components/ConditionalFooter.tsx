"use client";

import { useAuth } from "@/hooks/useAuth";
import { Footer } from "@/components/Footer";

/**
 * Conditionally renders the Footer component based on authentication status.
 * Footer is only shown when user is not authenticated.
 */
export function ConditionalFooter() {
  const { user, loading } = useAuth();

  // Show footer only if user is not authenticated
  if (loading || user) {
    return null;
  }

  return <Footer />;
}

