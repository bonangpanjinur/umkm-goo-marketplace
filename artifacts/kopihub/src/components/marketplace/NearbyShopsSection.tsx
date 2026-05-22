import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigation, MapPin, Loader2, Star, ExternalLink } from "lucide-react";
import { toast } from "sonner";

type NearbyShop = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  rating_avg: number | null;
  review_count: number | null;
  distance_km: number;
};

type Props = {
  categoryId?: string | null;
  title?: string;
  defaultRadius?: number;
  limit?: number;
  collapsible?: boolean;
};

function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export function NearbyShopsSection({
  categoryId = null,
  title = "Toko di sekitar saya",
  defaultRadius = 5,
  limit = 12,
  collapsible = true,
}: Props) {
  const [enabled, setEnabled] = useState(!collapsible);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  const [radius, setRadius] = useState(defaultRadius);
  const [shops, setShops] = useState<NearbyShop[]>([]);
  const [loading, setLoading] = useState(false);

  function locate() {
    if (!navigator.geolocation) {
      toast.error("Browser tidak mendukung GPS");
      return;
    }
    setLocating(true);
    setEnabled(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setDenied(false);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) setDenied(true);
        toast.error(err.code === err.PERMISSION_DENIED ? "Izin lokasi ditolak" : "Gagal mendapatkan lokasi");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  useEffect(() => {
    if (!enabled || !coords) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("shops_nearby", {
        _lat: coords.lat,
        _lng: coords.lng,
        _radius_km: radius,
        _limit: limit,
        _category_id: categoryId ?? null,
      });
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setShops([]);
      } else {
        setShops(((data as any[]) ?? []).map(r => ({
          ...r,
          latitude: Number(r.latitude),
          longitude: Number(r.longitude),
          rating_avg: r.rating_avg != null ? Number(r.rating_avg) : null,
          distance_km: Number(r.distance_km),
        })));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [enabled, coords, radius, categoryId, limit]);

  if (collapsible && !enabled) {
    return (
      <Card className="p-4 mb-4 border-dashed bg-gradient-to-br from-primary/5 to-emerald-50/30">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="rounded-xl bg-primary/15 p-2.5"><Navigation className="h-4 w-4 text-primary" /></div>
            <div className="min-w-0">
              <p className="font-semibold text-sm">{title}</p>
              <p className="text-xs text-muted-foreground">Aktifkan GPS untuk melihat toko terdekat.</p>
            </div>
          </div>
          <Button size="sm" onClick={locate} disabled={locating}>
            {locating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Navigation className="h-4 w-4 mr-1.5" />}
            Aktifkan GPS
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <section className="mb-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold flex items-center gap-1.5">
          <Navigation className="h-4 w-4 text-primary" /> {title}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {coords && (
            <div className="flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1 text-xs">
              <span className="text-muted-foreground">Radius</span>
              <div className="w-24"><Slider value={[radius]} min={1} max={50} step={1} onValueChange={(v) => setRadius(v[0] ?? 5)} /></div>
              <span className="font-semibold tabular-nums">{radius} km</span>
            </div>
          )}
          <Button size="sm" variant="outline" onClick={locate} disabled={locating}>
            {locating ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Navigation className="h-3.5 w-3.5 mr-1" />}
            {coords ? "Perbarui" : "Aktifkan GPS"}
          </Button>
        </div>
      </div>

      {denied ? (
        <p className="text-xs text-destructive">Izin lokasi ditolak. Aktifkan di pengaturan browser, lalu klik "Perbarui".</p>
      ) : !coords ? (
        <p className="text-xs text-muted-foreground">Menunggu izin GPS…</p>
      ) : loading ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
      ) : shops.length === 0 ? (
        <p className="text-xs text-muted-foreground">Tidak ada toko dalam radius {radius} km. Coba perbesar radius.</p>
      ) : (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {shops.map((s) => (
            <Card key={s.id} className="p-3 hover:shadow-md transition">
              <div className="flex items-start gap-2.5">
                {s.logo_url ? (
                  <img src={s.logo_url} alt={s.name} className="h-10 w-10 rounded-lg object-cover border border-border" loading="lazy" />
                ) : (
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">{s.name.charAt(0)}</div>
                )}
                <div className="min-w-0 flex-1">
                  <Link to="/toko/$slug" params={{ slug: s.slug }} className="font-semibold text-xs hover:text-primary line-clamp-1">{s.name}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px]">
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 px-1.5 py-0">
                      <MapPin className="h-2.5 w-2.5 mr-0.5" /> {formatDistance(s.distance_km)}
                    </Badge>
                    {s.rating_avg != null && s.rating_avg > 0 && (
                      <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                        <Star className="h-2.5 w-2.5 fill-amber-400 text-amber-400" /> {s.rating_avg.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-primary"
                  aria-label="Buka rute"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
