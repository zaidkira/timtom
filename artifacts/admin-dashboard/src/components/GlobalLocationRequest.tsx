import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

/**
 * This component handles the initial location permission request
 * to "warm up" the browser permission early in the session.
 */
export function GlobalLocationRequest() {
  const { user } = useAuth();

  useEffect(() => {
    // Only ask if user is logged in
    if (!user) return;
    
    if (!navigator.geolocation) return;

    // Small delay to ensure UI is ready and avoid blocking initial render
    const timer = setTimeout(() => {
      // Median.co specific: Prompt for Android permission via Bridge
      // This ensures the native permission dialog shows up on Android
      if (typeof (window as any).median !== 'undefined' && (window as any).median.android) {
        (window as any).median.android.geoLocation.promptLocationServices();
      }

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
