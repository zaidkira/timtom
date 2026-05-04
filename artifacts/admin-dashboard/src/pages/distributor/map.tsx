import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGetMapLocationsQueryKey, getMapLocations, getGetTasksQueryKey, getTasks, MapLocations, Task } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { requestLocationPermission } from "@/lib/median-utils";

const ALGIERS_CENTER: [number, number] = [36.7525, 3.042];

export default function DistributorMap() {
  const { user } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);

  const { data: locations, isLoading: isLocationsLoading } = useQuery<MapLocations>({
    queryKey: getGetMapLocationsQueryKey(),
    queryFn: () => getMapLocations(),
    refetchInterval: 5000,
  });

  const { data: tasks } = useQuery<Task[]>({
    queryKey: getGetTasksQueryKey({ distributorId: user?.id }),
    queryFn: () => getTasks({ distributorId: user?.id }),
    refetchInterval: 10000,
    enabled: !!user?.id,
  });

  const activeTask = useMemo(() => tasks?.find((t: any) => t.status === "pending" || t.status === "in_progress"), [tasks]);

  useEffect(() => {
    // Median.co specific: Proactively request native permission dialog
    requestLocationPermission();

    if (!("geolocation" in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      undefined,
      { enableHighAccuracy: true }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      leafletRef.current = L;

      // Icon Fix for Vite
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!).setView(ALGIERS_CENTER, 13);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      map.whenReady(() => setTimeout(() => map.invalidateSize(), 500));
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = leafletRef.current;
    const layer = markersLayerRef.current;
    if (!map || !L || !layer || isLocationsLoading || !locations) return;

    layer.clearLayers();

    // 1. Add Stores
    locations.stores.forEach((s: any) => {
      const lat = parseFloat(s.latitude);
      const lng = parseFloat(s.longitude);
      if (isNaN(lat) || isNaN(lng) || lat === 0) return;

      const isTarget = activeTask?.storeId === s.id;
      
      if (isTarget) {
        // Highlight target store with a special marker
        const targetIcon = L.divIcon({
            html: '<div style="background:#ef4444;width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 0 10px rgba(239,68,68,0.5);display:flex;align-items:center;justify-content:center;font-weight:bold;color:white;font-size:10px">GO</div>',
            className: 'animate-bounce'
        });
        L.marker([lat, lng], { icon: targetIcon }).bindPopup(`<b> وجهتك: ${s.name}</b>`).addTo(layer);
      } else {
        L.marker([lat, lng]).bindPopup(`<b>${s.name}</b>`).addTo(layer);
      }
    });

    // 2. Add Other Distributors
    locations.distributors.forEach((d: any) => {
      if (d.id === user?.distributorId) return;
      const lat = parseFloat(d.latitude);
      const lng = parseFloat(d.longitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
        const distIcon = L.divIcon({
          html: '<div style="background:#22c55e;width:12px;height:12px;border-radius:50%;border:2px solid white"></div>',
          className: ''
        });
        L.marker([lat, lng], { icon: distIcon }).bindPopup(`<b>موزع: ${d.name}</b>`).addTo(layer);
      }
    });

    // 3. Add User and Navigation
    if (userPosition) {
      const userIcon = L.divIcon({
        html: '<div style="background:#22c55e;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 0 4px rgba(34,197,94,0.3)"></div>',
        className: 'animate-pulse'
      });
      L.marker(userPosition, { icon: userIcon }).bindPopup("أنت هنا").addTo(layer);

      if (activeTask) {
        const tLat = parseFloat(String(activeTask.storeLatitude));
        const tLng = parseFloat(String(activeTask.storeLongitude));
        if (!isNaN(tLat) && !isNaN(tLng) && tLat !== 0) {
          L.polyline([userPosition, [tLat, tLng]], { color: "#3b82f6", weight: 4, dashArray: "10, 15" }).addTo(layer);
          
          // Auto-zoom only on first discovery of target
          const mapWithFlag = map as any;
          if (!mapWithFlag._initialZoomDone) {
            map.fitBounds(L.latLngBounds([userPosition, [tLat, tLng]]), { padding: [70, 70] });
            mapWithFlag._initialZoomDone = true;
          }
        }
      }
    } else if (activeTask) {
        const mapWithFlag = map as any;
        if (!mapWithFlag._initialZoomDone) {
            const tLat = parseFloat(String(activeTask.storeLatitude));
            const tLng = parseFloat(String(activeTask.storeLongitude));
            if (!isNaN(tLat) && !isNaN(tLng) && tLat !== 0) {
                map.setView([tLat, tLng], 15);
                mapWithFlag._initialZoomDone = true;
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
          {activeTask && <p className="text-xs text-blue-600 font-bold">المهمة: {activeTask.storeName}</p>}
        </div>
      </div>
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div ref={mapRef} style={{ height: "600px", width: "100%" }} />
      </div>
    </div>
  );
}
