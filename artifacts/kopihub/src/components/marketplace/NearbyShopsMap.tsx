import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { MapContainer, Marker, Popup, TileLayer, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Default icon fix
(L.Icon.Default as any).mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 2px #3b82f6,0 2px 6px rgba(0,0,0,.3)"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

type Shop = {
  id: string;
  slug: string;
  name: string;
  logo_url?: string | null;
  latitude: number;
  longitude: number;
  distance_km?: number;
  rating_avg?: number | null;
  address?: string | null;
};

function FitBounds({ center, shops, radiusKm }: { center: [number, number]; shops: Shop[]; radiusKm: number }) {
  const map = useMap();
  const lastKey = useRef<string>("");
  useEffect(() => {
    const key = `${center.join(",")}|${shops.length}|${radiusKm}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    if (shops.length === 0) {
      map.setView(center, 14);
      return;
    }
    const pts = [center, ...shops.map(s => [s.latitude, s.longitude] as [number, number])];
    const b = L.latLngBounds(pts.map(([a, b]) => L.latLng(a, b)));
    map.fitBounds(b, { padding: [40, 40], maxZoom: 15 });
  }, [center, shops, radiusKm, map]);
  return null;
}

export function NearbyShopsMap({
  center,
  shops,
  radiusKm,
  height = 480,
}: {
  center: { lat: number; lng: number };
  shops: Shop[];
  radiusKm: number;
  height?: number;
}) {
  return (
    <div className="rounded-xl overflow-hidden border border-border" style={{ height }}>
      <MapContainer center={[center.lat, center.lng]} zoom={14} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds center={[center.lat, center.lng]} shops={shops} radiusKm={radiusKm} />
        <Circle
          center={[center.lat, center.lng]}
          radius={radiusKm * 1000}
          pathOptions={{ color: "#10b981", weight: 1, fillColor: "#10b981", fillOpacity: 0.06 }}
        />
        <Marker position={[center.lat, center.lng]} icon={userIcon}>
          <Popup>Posisi Anda</Popup>
        </Marker>
        {shops.map(s => (
          <Marker key={s.id} position={[s.latitude, s.longitude]}>
            <Popup>
              <div className="space-y-1 min-w-[180px]">
                <div className="flex items-center gap-2">
                  {s.logo_url && <img src={s.logo_url} alt="" className="h-8 w-8 rounded object-cover" />}
                  <Link to="/toko/$slug" params={{ slug: s.slug }} className="font-semibold text-sm hover:underline">
                    {s.name}
                  </Link>
                </div>
                {typeof s.distance_km === "number" && (
                  <p className="text-xs text-emerald-700">
                    {s.distance_km < 1 ? `${Math.round(s.distance_km * 1000)} m` : `${s.distance_km.toFixed(1)} km`} dari Anda
                  </p>
                )}
                {s.address && <p className="text-xs text-muted-foreground line-clamp-2">{s.address}</p>}
                <div className="flex gap-2 pt-1">
                  <Link to="/toko/$slug" params={{ slug: s.slug }} className="text-xs text-primary hover:underline">
                    Kunjungi →
                  </Link>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    Rute
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
