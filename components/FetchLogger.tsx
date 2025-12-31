"use client";

/**
 * FetchLogger - Global fetch interceptor for debugging (dev-only)
 * Logs all Supabase network requests to help diagnose loading issues
 */
export function FetchLogger() {
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    // Only run once
    if (!(window as any).__fetchLoggerInstalled) {
      (window as any).__fetchLoggerInstalled = true;
      
      const origFetch = window.fetch;
      window.fetch = async (...args) => {
        const url = String(args[0]);
        const start = performance.now();
        try {
          const res = await origFetch(...args);
          const ms = Math.round(performance.now() - start);
          if (url.includes("supabase")) {
            console.log("[fetch]", res.status, ms + "ms", url);
          }
          return res;
        } catch (e) {
          const ms = Math.round(performance.now() - start);
          if (url.includes("supabase")) {
            console.log("[fetch] ERROR", ms + "ms", url, e);
          }
          throw e;
        }
      };
    }
  }

  return null;
}

