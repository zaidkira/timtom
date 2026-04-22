import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getGetMapLocationsQueryKey, getMapLocations } from "@workspace/api-client-react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const ALGIERS_CENTER: [number, number] = [36.7525, 3.042];

function RecenterOnUser({ position }: { position: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (!position) return;
    map.setView(position, 14);
  }, [map, position]);

  return null;
}

export default function DistributorMap() {
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [tileStatus, setTileStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");

  const { data, isLoading } = useQuery({
    queryKey: getGetMapLocationsQueryKey(),
    queryFn: getMapLocations,
    retry: 1,
  });

  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPosition([pos.coords.latitude, pos.coords.longitude]),
      () => {
        // Permission denied or unavailable location should not break map rendering.
      }
    );
  }, []);

  const storeIcon = useMemo(
    () =>
      L.divIcon({
        html: '<div style="background:#3b82f6;width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>',
        iconSize: [16, 16],
        className: "",
      }),
    []
  );

  const userIcon = useMemo(
    () =>
      L.divIcon({
        html: '<div style="background:#22c55e;width:12px;height:12px;border-radius:50%;border:2px solid white;box-shadow:0 0 0 4px rgba(34,197,94,0.3)"></div>',
        iconSize: [12, 12],
        className: "animate-pulse",
      }),
    []
  );

  const stores = (data?.stores ?? []).filter((s: any) => {
    const lat = Number(s.latitude);
    const lng = Number(s.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng);
  });

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
        <MapContainer center={ALGIERS_CENTER} zoom={13} scrollWheelZoom className="h-full w-full">
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="© OpenStreetMap contributors"
            eventHandlers={{
              loading: () => setTileStatus("loading"),
              load: () => setTileStatus("loaded"),
              tileerror: () => setTileStatus("error"),
            }}
          />

          {stores.map((s: any) => (
            <Marker key={s.id} position={[Number(s.latitude), Number(s.longitude)]} icon={storeIcon}>
              <Popup>
                <div dir="rtl" className="font-sans">
                  <b>{s.name}</b>
                  <br />
                  {s.address ?? ""}
                </div>
              </Popup>
            </Marker>
          ))}

          {userPosition && (
            <>
              <Circle center={userPosition} radius={100} pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.3 }} />
              <Marker position={userPosition} icon={userIcon} />
              <RecenterOnUser position={userPosition} />
            </>
          )}
        </MapContainer>

        {tileStatus === "error" && (
          <div className="absolute bottom-2 left-2 right-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg px-3 py-2">
            فشل تحميل بلاطات الخريطة. تحقق من الاتصال أو مانع الإعلانات أو إعدادات المتصفح.
          </div>
        )}
      </div>
    </div>
  );
}
