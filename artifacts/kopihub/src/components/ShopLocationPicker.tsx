import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Navigation, Search, ExternalLink, Loader2, X } from "lucide-react";
import { toast } from "sonner";

// Fix default marker icons not loading via bundler
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Default center: Jakarta
const DEFAULT_CENTER: [number, number] = [-6.2, 106.816];

type LatLng = { lat: number; lng: number };

export type ShopLocationPickerProps = {
  latitude: number | null;
  longitude: number | null;
  address?: string | null;
  onChange: (loc: { latitude: number | null; longitude: number | null }) => void;
  onLocationResolved?: (data: { city?: string; province?: string; postal_code?: string }) => void;
  height?: number;
};

function ClickHandler({ onPick }: { onPick: (ll: LatLng) => void }) {
  useMapEvents({ click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function Recenter({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, Math.max(map.getZoom(), 15), { duration: 0.6 });
  }, [center, map]);
  return null;
}

export function ShopLocationPicker({ latitude, longitude, address, onChange, onLocationResolved, height = 280 }: ShopLocationPickerProps) {
  const hasPin = latitude != null && longitude != null;
  const center: [number, number] = hasPin ? [Number(latitude), Number(longitude)] : DEFAULT_CENTER;
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [manualLat, setManualLat] = useState<string>(latitude != null ? String(latitude) : "");
  const [manualLng, setManualLng] = useState<string>(longitude != null ? String(longitude) : "");
  const lastAddress = useRef(address);

  useEffect(() => {
    setManualLat(latitude != null ? String(latitude) : "");
    setManualLng(longitude != null ? String(longitude) : "");
  }, [latitude, longitude]);

  useEffect(() => {
    // Auto-fill search box when address prop changes (first load)
    if (address && address !== lastAddress.current) {
      setSearchQ(address);
      lastAddress.current = address;
    }
  }, [address]);

  async function reverseGeocode(lat: number, lng: number) {
    if (!onLocationResolved) return;
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=id`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.address) {
        const addr = data.address;
        onLocationResolved({
          city: addr.city ?? addr.city_district ?? addr.town ?? addr.county ?? undefined,
          province: addr.state ?? undefined,
          postal_code: addr.postcode ?? undefined,
        });
      }
    } catch { /* silent — map still works */ }
  }

  function setPin(ll: LatLng) {
    const lat = Number(ll.lat.toFixed(6));
    const lng = Number(ll.lng.toFixed(6));
    onChange({ latitude: lat, longitude: lng });
    setFlyTo([lat, lng]);
    reverseGeocode(lat, lng);
  }

  function clearPin() {
    onChange({ latitude: null, longitude: null });
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Browser tidak mendukung geolocation");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPin({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
        toast.success("Lokasi saat ini dipakai sebagai pin");
      },
      (err) => {
        setLocating(false);
        toast.error(err.code === err.PERMISSION_DENIED ? "Izin lokasi ditolak" : "Gagal mendapatkan lokasi");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function searchAddress() {
    const q = searchQ.trim();
    if (!q) return;
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=id&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setPin({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
        toast.success("Lokasi ditemukan");
      } else {
        toast.error("Alamat tidak ditemukan. Coba lebih spesifik.");
      }
    } catch {
      toast.error("Gagal mencari alamat");
    } finally {
      setSearching(false);
    }
  }

  function applyManual() {
    const lat = parseFloat(manualLat);
    const lng = parseFloat(manualLng);
    if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      toast.error("Koordinat tidak valid");
      return;
    }
    setPin({ lat, lng });
  }

  const gmapsUrl = useMemo(() => (hasPin ? `https://maps.google.com/?q=${latitude},${longitude}` : null), [hasPin, latitude, longitude]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-1 min-w-[220px] gap-2">
          <Input
            placeholder="Cari alamat untuk set pin (mis. Jl. Sudirman No. 1, Jakarta)"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchAddress(); } }}
          />
          <Button type="button" variant="outline" size="sm" onClick={searchAddress} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={useMyLocation} disabled={locating}>
          {locating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Navigation className="h-4 w-4 mr-1.5" />}
          Pakai lokasi saya
        </Button>
      </div>

      <div className="rounded-xl overflow-hidden border border-border" style={{ height }}>
        <MapContainer center={center} zoom={hasPin ? 15 : 11} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onPick={setPin} />
          <Recenter center={flyTo} />
          {hasPin && (
            <Marker
              position={[Number(latitude), Number(longitude)]}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target as L.Marker;
                  const p = m.getLatLng();
                  setPin({ lat: p.lat, lng: p.lng });
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <div>
          <Label className="text-xs">Latitude</Label>
          <Input value={manualLat} onChange={(e) => setManualLat(e.target.value)} placeholder="-6.200000" inputMode="decimal" />
        </div>
        <div>
          <Label className="text-xs">Longitude</Label>
          <Input value={manualLng} onChange={(e) => setManualLng(e.target.value)} placeholder="106.816666" inputMode="decimal" />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={applyManual}>Terapkan</Button>
        {hasPin && (
          <Button type="button" variant="ghost" size="sm" onClick={clearPin} className="text-destructive hover:text-destructive">
            <X className="h-4 w-4 mr-1" /> Hapus pin
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" />
          {hasPin ? `Pin: ${latitude}, ${longitude}` : "Klik peta atau cari alamat untuk menandai lokasi"}
        </span>
        {gmapsUrl && (
          <a href={gmapsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-primary">
            <ExternalLink className="h-3.5 w-3.5" /> Buka di Google Maps
          </a>
        )}
      </div>
    </div>
  );
}

export default ShopLocationPicker;
