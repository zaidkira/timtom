import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMapLocations, getGetMapLocationsQueryKey } from "@workspace/api-client-react";
import "leaflet/dist/leaflet.css";

export default function DistributorMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const storesLayerRef = useRef<any>(null);
  const userLayerRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: getGetMapLocationsQueryKey(),
    queryFn: getMapLocations,
    retry: 1,
  });

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let resizeObserver: ResizeObserver | null = null;

    import("leaflet")
      .then((L) => {
        const map = L.map(mapRef.current!).setView([36.7525, 3.042], 13);
        mapInstanceRef.current = map;
        leafletRef.current = L;

        let tileProviderIndex = 0;
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

        let tiles = L.tileLayer(tileProviders[0].url, {
          attribution: tileProviders[0].attribution,
          maxZoom: 19,
        }).addTo(map);

        tiles.on("tileerror", () => {
          if (tileProviderIndex < tileProviders.length - 1) {
            tileProviderIndex += 1;
            map.removeLayer(tiles);
            tiles = L.tileLayer(tileProviders[tileProviderIndex].url, {
              attribution: tileProviders[tileProviderIndex].attribution,
              maxZoom: 19,
            }).addTo(map);
            return;
          }

          setMapError("Unable to load map tiles. Check network or browser restrictions.");
        });

        if ("geolocation" in navigator) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude } = pos.coords;

              if (userLayerRef.current) {
                map.removeLayer(userLayerRef.current);
              }

              const userLayer = L.layerGroup();
              L.circle([latitude, longitude], {
                radius: 100,
                color: "#22c55e",
                fillColor: "#22c55e",
                fillOpacity: 0.3,
              }).addTo(userLayer);

              L.marker([latitude, longitude], {
                icon: L.divIcon({
                  html: '<div style="background:#22c55e;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 0 4px rgba(34,197,94,0.3)"></div>',
                  iconSize: [12, 12],
                  className: "animate-pulse",
                }),
              }).addTo(userLayer);

              userLayer.addTo(map);
              userLayerRef.current = userLayer;
              map.setView([latitude, longitude], 14);
            },
            () => {
              // Permission denied should not break rendering.
            }
          );
        }

        map.whenReady(() => map.invalidateSize());
        setTimeout(() => map.invalidateSize(), 300);

        resizeObserver = new ResizeObserver(() => {
          map.invalidateSize();
        });
        resizeObserver.observe(mapRef.current!);
      })
      .catch((error) => {
        console.error("Leaflet import failed", error);
        setMapError("Unable to initialize map.");
      });

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      storesLayerRef.current = null;
      userLayerRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = leafletRef.current;
    if (!map || !L || !data) return;

    if (storesLayerRef.current) {
      map.removeLayer(storesLayerRef.current);
    }

    const storeIcon = L.divIcon({
      html: '<div style="background:#3b82f6;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
      iconSize: [16, 16],
      className: "",
    });

    const storesLayer = L.layerGroup();

    (data.stores ?? []).forEach((s: any) => {
      const lat = Number(s.latitude);
      const lng = Number(s.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      L.marker([lat, lng], { icon: storeIcon })
        .bindPopup(`<div dir="rtl" class="font-sans"><b>${s.name}</b><br>${s.address ?? ""}</div>`)
        .addTo(storesLayer);
    });

    storesLayer.addTo(map);
    storesLayerRef.current = storesLayer;
  }, [data]);

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
        <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
        {mapError && (
          <div className="absolute bottom-2 left-2 right-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2">
            {mapError}
          </div>
        )}
      </div>
    </div>
  );
}
