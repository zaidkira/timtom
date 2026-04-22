import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGetMapLocationsQueryKey, getMapLocations, getGetTasksQueryKey, getTasks } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";

const ALGIERS_CENTER: [number, number] = [36.7525, 3.042];

export default function DistributorMap() {
  const { user } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);

  // 1. Fetch all locations (Stores & Distributors)
  const { data: locations, isLoading: isLocationsLoading } = useQuery({
    queryKey: getGetMapLocationsQueryKey(),
    queryFn: getMapLocations,
    refetchInterval: 5000,
  });

  // 2. Fetch current user's tasks
  const { data: tasks } = useQuery({
    queryKey: getGetTasksQueryKey({ distributorId: user?.id }),
    queryFn: () => getTasks({ distributorId: user?.id }),
    refetchInterval: 10000,
    enabled: !!user?.id,
  });

  // Find the active store target
  const activeTask = useMemo(() => {
    return tasks?.find(t => t.status === "pending" || t.status === "in_progress");
  }, [tasks]);

  // Get user location
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      () => console.log("Location access denied - centering on Algiers"),
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let resizeObserver: ResizeObserver | null = null;

    import("leaflet").then((L) => {
      leafletRef.current = L;
      const map = L.map(mapRef.current!).setView(ALGIERS_CENTER, 13);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      map.whenReady(() => map.invalidateSize());
      setTimeout(() => map.invalidateSize(), 300);

      resizeObserver = new ResizeObserver(() => map.invalidateSize());
      resizeObserver.observe(mapRef.current!);
    });

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      leafletRef.current = null;
    };
  }, []);

  // Update Markers and Route
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = leafletRef.current;
    if (!map || !L || isLocationsLoading || !locations) return;

    // Clear existing markers/lines
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    const storeIcon = L.divIcon({
      html: '<div style="background:#3b82f6;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
      iconSize: [16, 16],
      className: "",
    });

    const targetStoreIcon = L.divIcon({
      html: '<div style="background:#ef4444;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(239,68,68,0.5);display:flex;align-items:center;justify-center;font-weight:bold;color:white;font-size:10px">GO</div>',
      iconSize: [24, 24],
      className: "animate-bounce",
    });

    const distIcon = L.divIcon({
      html: '<div style="background:#64748b;width:12px;height:12px;border-radius:50%;border:2px solid white"></div>',
      iconSize: [12, 12],
      className: "",
    });

    const userIcon = L.divIcon({
      html: '<div style="background:#22c55e;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 0 4px rgba(34,197,94,0.3)"></div>',
      iconSize: [14, 14],
      className: "animate-pulse",
    });

    // 1. Add All Stores
    locations.stores.forEach((s: any) => {
      const lat = Number(s.latitude);
      const lng = Number(s.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const isTarget = activeTask?.storeId === s.id;
      L.marker([lat, lng], { icon: isTarget ? targetStoreIcon : storeIcon })
        .bindPopup(`<div dir="rtl"><b>${isTarget ? "📍 وجهتك الحالية: " : ""}${s.name}</b><br>${s.address || ""}</div>`)
        .addTo(map);
    });

    // 2. Add Other Distributors
    locations.distributors.forEach((d: any) => {
      if (d.id === user?.distributorId) return; // Skip self
      const lat = Number(d.latitude);
      const lng = Number(d.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        L.marker([lat, lng], { icon: distIcon })
          .bindPopup(`<div dir="rtl"><b>موزع آخر: ${d.name}</b></div>`)
          .addTo(map);
      }
    });

    // 3. Add User and Draw Line to Target
    if (userPosition) {
      L.marker(userPosition, { icon: userIcon }).bindPopup("أنت هنا").addTo(map);

      if (activeTask) {
        const targetPos: [number, number] = [Number(activeTask.storeLatitude), Number(activeTask.storeLongitude)];
        if (Number.isFinite(targetPos[0]) && Number.isFinite(targetPos[1])) {
          // Draw line from user to store
          L.polyline([userPosition, targetPos], { color: "#3b82f6", weight: 3, dashArray: "10, 10", opacity: 0.7 }).addTo(map);
          
          // Auto-zoom to show both user and target
          const bounds = L.latLngBounds([userPosition, targetPos]);
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      }
    }
  }, [locations, tasks, userPosition, isLocationsLoading, activeTask]);

  if (isLocationsLoading) return <div className="p-20 text-center font-bold text-slate-400">جاري التحميل...</div>;

  return (
    <div dir="rtl" className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between px-2">
        <div>
          <h1 className="text-xl font-bold text-slate-800">الخريطة الذكية</h1>
          {activeTask && (
            <p className="text-xs text-blue-600 font-bold">المهمة الحالية: {activeTask.storeName}</p>
          )}
        </div>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-slate-600">وجهتك</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-slate-600">المحلات</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative">
        <div ref={mapRef} style={{ height: "600px", width: "100%" }} />
      </div>
    </div>
  );
}
