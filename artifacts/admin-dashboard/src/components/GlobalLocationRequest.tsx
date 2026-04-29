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

    return () => clearTimeout(timer);
  }, [user]);

  return null;
}
