/**
 * Supabase client for browser/client-side usage
 * 
 * This client is used in:
 * - Client Components ("use client")
 * - Browser-only code
 * - React hooks that run in the browser
 * 
 * It uses createBrowserClient from @supabase/ssr which handles
 * cookie management and session storage automatically in the browser.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}


