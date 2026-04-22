import { useEffect, useRef, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGetMapLocationsQueryKey, getMapLocations } from "@workspace/api-client-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const ALGIERS_CENTER: [number, number] = [36.7525, 3.042];

export default function DistributorMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [tileStatus, setTileStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");

  const { data, isLoading } = useQuery({
    queryKey: getGetMapLocationsQueryKey(),
    queryFn: getMapLocations,
    retry: 1,
  });

  // Get user location
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      () => console.log("Location access denied")
    );
  }, []);

  // Initialize Map (Direct Leaflet - Same as Admin)
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const map = L.map(mapRef.current, {
      center: ALGIERS_CENTER,
      zoom: 13,
      zoomControl: false, // Move it to bottom right later
    });
    
    mapInstanceRef.current = map;

    const tileProviders = [
      {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: "© OpenStreetMap contributors",
      },
      {
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attribution: "© OpenStreetMap contributors © CARTO",
      },
    ];

    let currentProviderIndex = 0;
    let tiles = L.tileLayer(tileProviders[0].url, {
      attribution: tileProviders[0].attribution,
    }).addTo(map);

    tiles.on("loading", () => setTileStatus("loading"));
    tiles.on("load", () => setTileStatus("loaded"));
    tiles.on("tileerror", () => {
      if (currentProviderIndex < tileProviders.length - 1) {
        currentProviderIndex++;
        map.removeLayer(tiles);
        tiles = L.tileLayer(tileProviders[currentProviderIndex].url, {
          attribution: tileProviders[currentProviderIndex].attribution,
        }).addTo(map);
      } else {
        setTileStatus("error");
      }
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Force size calculation - critical fix for white screen
    const timer = setTimeout(() => map.invalidateSize(), 100);
    const timer2 = setTimeout(() => map.invalidateSize(), 1000);

    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(mapRef.current);

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers when data or userPosition changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || isLoading) return;

    // Clear existing markers (simple way: remove and re-add layers)
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Circle) {
        map.removeLayer(layer);
      }
    });

    const storeIcon = L.divIcon({
      html: '<div style="background:#3b82f6;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
      iconSize: [16, 16],
      className: "",
    });

    const userIcon = L.divIcon({
      html: '<div style="background:#22c55e;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 0 4px rgba(34,197,94,0.3)"></div>',
      iconSize: [12, 12],
      className: "animate-pulse",
    });

    // Add Stores
    if (data?.stores) {
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

    // Add User and Recenter
    if (userPosition) {
      L.circle(userPosition, { radius: 100, color: "#22c55e", fillOpacity: 0.2 }).addTo(map);
      L.marker(userPosition, { icon: userIcon }).addTo(map);
      map.setView(userPosition, 14);
    }
  }, [data, userPosition, isLoading]);

  if (isLoading) return <div className="p-20 text-center font-bold text-slate-400">جاري التحميل...</div>;

  return (
    <div dir="rtl" className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between px-2">
        <h1 className="text-xl font-bold text-slate-800">خريطة المحلات</h1>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-slate-600">المحلات</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-slate-600">موقعك الآن</span>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-[500px] bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden relative z-10">
        <div ref={mapRef} className="h-full w-full" />

        {tileStatus === "error" && (
          <div className="absolute bottom-2 left-2 right-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2 z-[1000]">
            فشل تحميل بلاطات الخريطة. تحقق من الاتصال أو مانع الإعلانات.
          </div>
        )}
      </div>
    </div>
  );
}
