import { useEffect } from "react";
import { initSubscriptionCache } from "@/hooks/useSubscriptionFeatures";

/**
 * Initializes global caches on app startup
 * This ensures synchronous utility functions have access to latest database values
 */
export function GlobalCacheInitializer() {
  useEffect(() => {
    // Initialize subscription features cache from database
    initSubscriptionCache();
  }, []);

  return null;
}
