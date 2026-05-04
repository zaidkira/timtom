import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { initializeLocationServices } from "@/lib/median-utils";

/**
 * This component handles the initial location permission request
 * to "warm up" the browser permission early in the session.
 */
export function GlobalLocationRequest() {
  const { user } = useAuth();

  useEffect(() => {
    // Only ask if user is logged in
    if (!user) return;
    
    // Median.co specific: Initialize native location services
    initializeLocationServices();

    if (!navigator.geolocation) return;

    // Small delay to ensure UI is ready and avoid blocking initial render
    const timer = setTimeout(() => {
      navigator.geolocation.getCurrentPosition(
        () => {
          console.log("Location permission granted/confirmed early");
        },
        (err) => {
          console.warn("Initial location warmup failed or denied:", err);
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: Infinity }
      );
    }, 2000);

    // Median.co specific: iOS Bridge ready callback
    (window as any).median_geolocation_ready = () => {
      console.log("Median.co Native iOS Geolocation is ready");
    };

    return () => clearTimeout(timer);
  }, [user]);

  return null;
}
