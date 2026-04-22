import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGetMapLocationsQueryKey, getMapLocations } from "@workspace/api-client-react";

const ALGIERS_CENTER: [number, number] = [36.7525, 3.042];

export default function DistributorMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: getGetMapLocationsQueryKey(),
    queryFn: getMapLocations,
    refetchInterval: 5000, // Refresh every 5 seconds
    retry: 1,
  });

  // Get user location
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      () => {
        console.log("Location access denied - centering on Algiers");
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView(ALGIERS_CENTER, 13);
        }
      }
    );
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
      setTimeout(() => map.invalidateSize(), 1000);

      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
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

  // Update Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = leafletRef.current;
    if (!map || !L || isLoading || !data) return;

    // Clear existing markers
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    const storeIcon = L.divIcon({
      html: '<div style="background:#3b82f6;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
      iconSize: [16, 16],
      className: "",
    });

    const distIcon = L.divIcon({
      html: '<div style="background:#22c55e;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
      iconSize: [16, 16],
      className: "",
    });

    const userIcon = L.divIcon({
      html: '<div style="background:#22c55e;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 0 4px rgba(34,197,94,0.3)"></div>',
      iconSize: [12, 12],
      className: "animate-pulse",
    });

    // Add Stores
    if (data.stores) {
      data.stores.forEach((s: any) => {
        const lat = Number(s.latitude);
        const lng = Number(s.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          L.marker([lat, lng], { icon: storeIcon })
            .bindPopup(`<div dir="rtl"><b>${s.name}</b><br>${s.address || ""}</div>`)
            .addTo(map);
        }
      });
    }

    // Add Other Distributors
    if (data.distributors) {
      data.distributors.forEach((d: any) => {
        const lat = Number(d.latitude);
        const lng = Number(d.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          L.marker([lat, lng], { icon: distIcon })
            .bindPopup(`<div dir="rtl"><b>${d.name}</b><br>الحالة: ${d.isActive ? "نشط" : "غير نشط"}</div>`)
            .addTo(map);
        }
      });
    }

    // Add User (Current Position)
    if (userPosition) {
      L.circle(userPosition, { radius: 100, color: "#22c55e", fillOpacity: 0.2 }).addTo(map);
      L.marker(userPosition, { icon: userIcon }).addTo(map);
    }
  }, [data, userPosition, isLoading]);

  if (isLoading) return <div className="p-20 text-center font-bold text-slate-400">جاري التحميل...</div>;

  return (
    <div dir="rtl" className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between px-2">
        <h1 className="text-xl font-bold text-slate-800">خريطة المحلات والموزعين</h1>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-slate-600">المحلات</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-slate-600">الموزعون</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        <div ref={mapRef} style={{ height: "600px", width: "100%" }} />
      </div>
    </div>
  );
}
