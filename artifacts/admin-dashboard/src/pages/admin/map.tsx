import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMapLocations, getGetMapLocationsQueryKey } from "@workspace/api-client-react";

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: getGetMapLocationsQueryKey(),
    queryFn: getMapLocations,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      leafletRef.current = L;
      
      // Fix default marker icons (they sometimes don't load in Vite)
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      const map = L.map(mapRef.current!).setView([36.7525, 3.042], 12);
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
    if (!map || !L || !layer || !data) return;

    layer.clearLayers();

    // Add Stores
    data.stores.forEach((s: any) => {
      const lat = parseFloat(String(s.latitude));
      const lng = parseFloat(String(s.longitude));
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
        L.marker([lat, lng])
          .bindPopup(`<div dir="rtl"><b>🏠 ${s.name}</b><br>دين: ${s.debt?.toLocaleString("ar-DZ")} دج</div>`)
          .addTo(layer);
      }
    });

    // Add Distributors
    data.distributors.forEach((d: any) => {
      const lat = parseFloat(String(d.latitude));
      const lng = parseFloat(String(d.longitude));
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
        // Use a different color for distributors if possible, or just a custom icon
        const distIcon = L.divIcon({
          html: '<div style="background:#22c55e;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 5px rgba(0,0,0,0.5)"></div>',
          className: ''
        });
        L.marker([lat, lng], { icon: distIcon })
          .bindPopup(`<div dir="rtl"><b>🚚 ${d.name}</b></div>`)
          .addTo(layer);
      }
    });

    if (data.stores.length > 0) {
       // Optional: Auto-fit to all markers on first load
       // const bounds = layer.getBounds();
       // if (bounds.isValid()) map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [data]);

  return (
    <div dir="rtl" className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">الخريطة الشاملة</h1>
        <div className="flex gap-4 text-sm font-medium">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">
              المحلات
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-slate-600">الموزعون</span>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden" style={{ minHeight: "600px" }}>
        <div ref={mapRef} style={{ height: "600px", width: "100%" }} />
      </div>
    </div>
  );
}
