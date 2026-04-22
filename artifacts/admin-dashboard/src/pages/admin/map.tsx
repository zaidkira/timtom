import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { getMapLocations, getGetMapLocationsQueryKey } from "@workspace/api-client-react";

export default function MapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const leafletRef = useRef<any>(null);
  const storesLayerRef = useRef<any>(null);
  const distributorsLayerRef = useRef<any>(null);

  const { data } = useQuery({
    queryKey: getGetMapLocationsQueryKey(),
    queryFn: getMapLocations,
  });

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    let resizeObserver: ResizeObserver | null = null;

    import("leaflet").then((L) => {
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
        if (tileProviderIndex >= tileProviders.length - 1) return;
        tileProviderIndex += 1;
        map.removeLayer(tiles);
        tiles = L.tileLayer(tileProviders[tileProviderIndex].url, {
          attribution: tileProviders[tileProviderIndex].attribution,
          maxZoom: 19,
        }).addTo(map);
      });

      map.whenReady(() => map.invalidateSize());
      setTimeout(() => map.invalidateSize(), 300);

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
      storesLayerRef.current = null;
      distributorsLayerRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const L = leafletRef.current;
    if (!map || !L || !data) return;

    if (storesLayerRef.current) map.removeLayer(storesLayerRef.current);
    if (distributorsLayerRef.current) map.removeLayer(distributorsLayerRef.current);

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

    const storesLayer = L.layerGroup();
    data.stores.forEach((s: any) => {
      L.marker([s.latitude, s.longitude], { icon: storeIcon })
        .bindPopup(`<div dir="rtl"><b>${s.name}</b><br>دين: ${s.debt?.toLocaleString("ar-DZ")} دج</div>`)
        .addTo(storesLayer);
    });

    const distributorsLayer = L.layerGroup();
    data.distributors.forEach((d: any) => {
      if (d.latitude && d.longitude) {
        L.marker([d.latitude, d.longitude], { icon: distIcon })
          .bindPopup(`<div dir="rtl"><b>${d.name}</b><br>الحالة: ${d.isActive ? "نشط" : "غير نشط"}</div>`)
          .addTo(distributorsLayer);
      }
    });

    storesLayer.addTo(map);
    distributorsLayer.addTo(map);
    storesLayerRef.current = storesLayer;
    distributorsLayerRef.current = distributorsLayer;
  }, [data]);

  return (
    <div dir="rtl" className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-800">الخريطة الشاملة</h1>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow" />
            <span className="text-slate-600">المحلات</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full border-2 border-white shadow" />
            <span className="text-slate-600">الموزعون</span>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div ref={mapRef} style={{ height: "600px", width: "100%" }} />
      </div>
      {data && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
            <p className="text-2xl font-bold text-blue-600">{data.stores.length}</p>
            <p className="text-sm text-slate-600">محل</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
            <p className="text-2xl font-bold text-green-600">{data.distributors.filter((d: any) => d.latitude).length}</p>
            <p className="text-sm text-slate-600">موزع نشط في الخريطة</p>
          </div>
        </div>
      )}
    </div>
  );
}
