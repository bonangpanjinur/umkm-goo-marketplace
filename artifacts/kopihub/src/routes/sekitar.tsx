import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { MarketplaceBottomNav } from "@/components/marketplace/MarketplaceBottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigation, MapPin, Loader2, Star, ExternalLink, Search as SearchIcon, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/sekitar")({ component: NearbyPage });

type NearbyShop = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logo_url: string | null;
  address: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  rating_avg: number | null;
  review_count: number | null;
  distance_km: number;
};

type Coords = { lat: number; lng: number };

function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

export default function NearbyPage() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [locating, setLocating] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [radius, setRadius] = useState<number>(5);
  const [shops, setShops] = useState<NearbyShop[]>([]);
  const [loading, setLoading] = useState(false);

  function locate(silent = false) {
    if (!navigator.geolocation) {
      if (!silent) toast.error("Browser tidak mendukung GPS");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPermissionDenied(false);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) setPermissionDenied(true);
        if (!silent) toast.error(err.code === err.PERMISSION_DENIED ? "Izin lokasi ditolak" : "Gagal mendapatkan lokasi");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  useEffect(() => { locate(true); }, []);

  useEffect(() => {
    if (!coords) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await (supabase as any).rpc("shops_nearby", {
        _lat: coords.lat,
        _lng: coords.lng,
        _radius_km: radius,
        _limit: 60,
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
  }, [coords, radius]);

  const subtitle = useMemo(() => {
    if (!coords) return "Aktifkan GPS untuk melihat toko terdekat dari posisi Anda";
    return `Menampilkan toko dalam radius ${radius} km dari lokasi Anda`;
  }, [coords, radius]);

  return (
    <div className="min-h-screen bg-background pb-24">
      <MarketplaceHeader />

      <section className="border-b border-border bg-gradient-to-br from-primary/10 via-background to-emerald-50/40">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:py-10">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary/15 p-3">
              <Navigation className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Toko di sekitar saya</h1>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Button onClick={() => locate(false)} disabled={locating} size="sm">
              {locating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Navigation className="h-4 w-4 mr-1.5" />}
              {coords ? "Perbarui lokasi" : "Aktifkan GPS"}
            </Button>
            {coords && (
              <div className="flex items-center gap-3 rounded-full bg-card border border-border px-4 py-1.5 text-xs">
                <span className="text-muted-foreground">Radius</span>
                <div className="w-32">
                  <Slider value={[radius]} min={1} max={50} step={1} onValueChange={(v) => setRadius(v[0] ?? 5)} />
                </div>
                <span className="font-semibold tabular-nums">{radius} km</span>
              </div>
            )}
            {coords && (
              <Badge variant="secondary" className="text-xs">
                <MapPin className="h-3 w-3 mr-1" /> {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
              </Badge>
            )}
          </div>

          {permissionDenied && (
            <p className="mt-3 text-xs text-destructive">
              Izin lokasi ditolak. Aktifkan dari pengaturan browser, lalu klik "Aktifkan GPS" lagi.
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-6">
        {!coords ? (
          <Card className="p-8 text-center">
            <Navigation className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-3 font-semibold">Aktifkan GPS untuk mulai mencari</p>
            <p className="mt-1 text-sm text-muted-foreground">Kami hanya memakai lokasi Anda untuk mencari toko terdekat.</p>
          </Card>
        ) : loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4"><Skeleton className="h-20 w-full" /></Card>
            ))}
          </div>
        ) : shops.length === 0 ? (
          <Card className="p-8 text-center">
            <SearchIcon className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-3 font-semibold">Tidak ada toko dalam radius {radius} km</p>
            <p className="mt-1 text-sm text-muted-foreground">Coba perbesar radius atau perbarui lokasi.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setRadius(Math.min(50, radius + 5))}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Perbesar radius +5 km
            </Button>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {shops.map((s) => (
              <Card key={s.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  {s.logo_url ? (
                    <img src={s.logo_url} alt={s.name} className="h-14 w-14 rounded-xl object-cover border border-border" loading="lazy" />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {s.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <Link to="/toko/$slug" params={{ slug: s.slug }} className="font-semibold text-sm hover:text-primary line-clamp-1">{s.name}</Link>
                    {s.tagline && <p className="text-xs text-muted-foreground line-clamp-1">{s.tagline}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        <MapPin className="h-3 w-3 mr-1" /> {formatDistance(s.distance_km)}
                      </Badge>
                      {s.rating_avg != null && s.rating_avg > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> {s.rating_avg.toFixed(1)}
                          {s.review_count ? <span className="text-muted-foreground/70"> ({s.review_count})</span> : null}
                        </span>
                      )}
                    </div>
                    {s.address && <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{s.address}</p>}
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button asChild size="sm" variant="outline" className="flex-1">
                    <Link to="/toko/$slug" params={{ slug: s.slug }}>Kunjungi</Link>
                  </Button>
                  <Button asChild size="sm" variant="ghost">
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${s.latitude},${s.longitude}`} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      <MarketplaceFooter />
      <MarketplaceBottomNav />
    </div>
  );
}
