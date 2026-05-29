import { useEffect, useRef, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapContainer, Marker, Popup, TileLayer, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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

function clusterIcon(count: number) {
  const size = count > 10 ? 44 : count > 5 ? 38 : 30;
  const bg = count > 10 ? "#ef4444" : count > 5 ? "#f97316" : "#10b981";
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${count > 99 ? 10 : 13}px;font-family:sans-serif">${count}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

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

type Cluster = { key: string; lat: number; lng: number; shops: Shop[] };

function buildClusters(shops: Shop[], zoom: number): Cluster[] {
  const gridSize = zoom >= 15 ? 0.002 : zoom >= 13 ? 0.007 : zoom >= 11 ? 0.03 : 0.12;
  const grid: Record<string, Shop[]> = {};
  for (const shop of shops) {
    const gx = Math.floor(shop.latitude / gridSize);
    const gy = Math.floor(shop.longitude / gridSize);
    const key = `${gx}:${gy}`;
    if (!grid[key]) grid[key] = [];
    grid[key].push(shop);
  }
  return Object.entries(grid).map(([key, items]) => ({
    key,
    lat: items.reduce((s, i) => s + i.latitude, 0) / items.length,
    lng: items.reduce((s, i) => s + i.longitude, 0) / items.length,
    shops: items,
  }));
}

function FitBounds({ center, shops, radiusKm }: { center: [number, number]; shops: Shop[]; radiusKm: number }) {
  const map = useMap();
  const lastKey = useRef<string>("");
  useEffect(() => {
    const key = `${center.join(",")}|${shops.length}|${radiusKm}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    if (shops.length === 0) { map.setView(center, 14); return; }
    const pts = [center, ...shops.map(s => [s.latitude, s.longitude] as [number, number])];
    map.fitBounds(L.latLngBounds(pts.map(([a, b]) => L.latLng(a, b))), { padding: [40, 40], maxZoom: 15 });
  }, [center, shops, radiusKm, map]);
  return null;
}

function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  useMapEvents({
    zoomend: (e) => onZoom(e.target.getZoom()),
    zoom: (e) => onZoom(e.target.getZoom()),
  });
  return null;
}

function ClusteredMarkers({ shops, zoom }: { shops: Shop[]; zoom: number }) {
  const map = useMap();
  const clusters = useMemo(() => buildClusters(shops, zoom), [shops, zoom]);

  return (
    <>
      {clusters.map(cluster => {
        if (cluster.shops.length === 1) {
          const s = cluster.shops[0];
          return (
            <Marker key={s.id} position={[s.latitude, s.longitude]}>
              <Popup>
                <div className="space-y-1 min-w-[180px]">
                  <div className="flex items-center gap-2">
                    {s.logo_url && <img src={s.logo_url} alt="" className="h-8 w-8 rounded object-cover" />}
                    <Link to="/toko/$slug" params={{ slug: s.slug }} className="font-semibold text-sm hover:underline">{s.name}</Link>
                  </div>
                  {typeof s.distance_km === "number" && (
                    <p className="text-xs text-emerald-700">
                      {s.distance_km < 1 ? `${Math.round(s.distance_km * 1000)} m` : `${s.distance_km.toFixed(1)} km`} dari Anda
                    </p>
                  )}
                  {s.address && <p className="text-xs text-muted-foreground line-clamp-2">{s.address}</p>}
                  {s.rating_avg != null && <p className="text-xs">★ {Number(s.rating_avg).toFixed(1)}</p>}
                  <div className="flex gap-2 pt-1">
                    <Link to="/toko/$slug" params={{ slug: s.slug }} className="text-xs text-primary hover:underline">Kunjungi →</Link>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Rute</a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        }
        return (
          <Marker
            key={cluster.key}
            position={[cluster.lat, cluster.lng]}
            icon={clusterIcon(cluster.shops.length)}
            eventHandlers={{
              click: () => {
                const bounds = L.latLngBounds(cluster.shops.map(s => [s.latitude, s.longitude] as [number, number]));
                map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
              },
            }}
          >
            <Popup>
              <div className="min-w-[160px] max-h-48 overflow-y-auto space-y-1">
                <p className="font-semibold text-xs mb-2">{cluster.shops.length} toko di area ini</p>
                {cluster.shops.map(s => (
                  <Link key={s.id} to="/toko/$slug" params={{ slug: s.slug }} className="flex items-center gap-1.5 text-xs hover:underline text-primary py-0.5">
                    {s.logo_url && <img src={s.logo_url} alt="" className="h-5 w-5 rounded object-cover shrink-0" />}
                    {s.name}
                  </Link>
                ))}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
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
  const [zoom, setZoom] = useState(14);

  return (
    <div className="rounded-xl overflow-hidden border border-border" style={{ height }}>
      <MapContainer center={[center.lat, center.lng]} zoom={14} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ZoomTracker onZoom={setZoom} />
        <FitBounds center={[center.lat, center.lng]} shops={shops} radiusKm={radiusKm} />
        <Circle
          center={[center.lat, center.lng]}
          radius={radiusKm * 1000}
          pathOptions={{ color: "#10b981", weight: 1, fillColor: "#10b981", fillOpacity: 0.06 }}
        />
        <Marker position={[center.lat, center.lng]} icon={userIcon}>
          <Popup>Posisi Anda</Popup>
        </Marker>
        <ClusteredMarkers shops={shops} zoom={zoom} />
      </MapContainer>
    </div>
  );
}
