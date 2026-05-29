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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Navigation, MapPin, Loader2, Star, ExternalLink, Search as SearchIcon, RefreshCw, List, Map as MapIcon, Clock, Filter } from "lucide-react";
import { toast } from "sonner";
import { NearbyShopsMap } from "@/components/marketplace/NearbyShopsMap";

export const Route = createFileRoute("/sekitar")({ component: NearbyPage });

const LOCATION_KEY = "umkmgo.userLocation";

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
  business_category_id?: string | null;
  open_hours?: Record<string, { open: string; close: string; closed?: boolean }> | null;
};

type Coords = { lat: number; lng: number };
type Category = { id: string; name: string };

function formatDistance(km: number) {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

function isShopOpenNow(open_hours: NearbyShop["open_hours"]): boolean {
  if (!open_hours) return true;
  const dayNames = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const day = dayNames[new Date().getDay()];
  const todayHours = day ? open_hours[day] : null;
  if (!todayHours || todayHours.closed) return false;
  const [oh = 0, om = 0] = (todayHours.open ?? "00:00").split(":").map(Number);
  const [ch = 23, cm = 59] = (todayHours.close ?? "23:59").split(":").map(Number);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();
  return nowMin >= oh * 60 + om && nowMin < ch * 60 + cm;
}

export default function NearbyPage() {
  const [coords, setCoords] = useState<Coords | null>(() => {
    try {
      const saved = localStorage.getItem(LOCATION_KEY);
      if (saved) return JSON.parse(saved) as Coords;
    } catch {}
    return null;
  });
  const [locating, setLocating] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [radius, setRadius] = useState<number>(5);
  const [shops, setShops] = useState<NearbyShop[]>([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [minRating, setMinRating] = useState<number>(0);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [openNow, setOpenNow] = useState<boolean>(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    supabase
      .from("business_categories")
      .select("id, name")
      .order("name")
      .then(({ data }) => setCategories((data ?? []) as Category[]));
  }, []);

  function locate(silent = false) {
    if (!navigator.geolocation) {
      if (!silent) toast.error("Browser tidak mendukung GPS");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c: Coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(c);
        try { localStorage.setItem(LOCATION_KEY, JSON.stringify(c)); } catch {}
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

  useEffect(() => { if (!coords) locate(true); }, []);

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
        setLoading(false);
        return;
      }
      const baseShops: NearbyShop[] = ((data as any[]) ?? []).map(r => ({
        ...r,
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
        rating_avg: r.rating_avg != null ? Number(r.rating_avg) : null,
        distance_km: Number(r.distance_km),
      }));

      if (baseShops.length > 0) {
        const ids = baseShops.map(s => s.id);
        const { data: extras } = await (supabase as any)
          .from("shops")
          .select("id, business_category_id, open_hours")
          .in("id", ids);
        if (!cancelled && extras) {
          const extMap = new Map<string, { business_category_id: string | null; open_hours: any }>(
            (extras as any[]).map((e: any) => [e.id, e])
          );
          baseShops.forEach(s => {
            const ex = extMap.get(s.id);
            if (ex) {
              s.business_category_id = ex.business_category_id;
              s.open_hours = ex.open_hours;
            }
          });
        }
      }

      if (!cancelled) setShops(baseShops);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [coords, radius]);

  const filteredShops = useMemo(() => {
    return shops.filter(s => {
      if (minRating > 0 && (s.rating_avg == null || s.rating_avg < minRating)) return false;
      if (categoryFilter !== "all" && s.business_category_id !== categoryFilter) return false;
      if (openNow && !isShopOpenNow(s.open_hours)) return false;
      return true;
    });
  }, [shops, minRating, categoryFilter, openNow]);

  const hasActiveFilter = minRating > 0 || categoryFilter !== "all" || openNow;

  const subtitle = useMemo(() => {
    if (!coords) return "Aktifkan GPS untuk melihat toko terdekat dari posisi Anda";
    if (loading) return "Mencari toko terdekat…";
    return `${filteredShops.length} toko dalam radius ${radius} km${hasActiveFilter ? " (difilter)" : ""}`;
  }, [coords, loading, filteredShops.length, radius, hasActiveFilter]);

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

          {coords && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 w-auto min-w-[150px] text-xs">
                  <SelectValue placeholder="Semua kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua kategori</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(minRating)} onValueChange={(v) => setMinRating(Number(v))}>
                <SelectTrigger className="h-8 w-auto min-w-[130px] text-xs">
                  <SelectValue placeholder="Min. rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Semua rating</SelectItem>
                  <SelectItem value="3">★ ≥ 3.0</SelectItem>
                  <SelectItem value="4">★ ≥ 4.0</SelectItem>
                  <SelectItem value="4.5">★ ≥ 4.5</SelectItem>
                </SelectContent>
              </Select>
              <button
                onClick={() => setOpenNow(o => !o)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 h-8 text-xs font-medium transition-colors ${
                  openNow
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Clock className="h-3 w-3" /> Buka Sekarang
              </button>
              {hasActiveFilter && (
                <button
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                  onClick={() => { setMinRating(0); setCategoryFilter("all"); setOpenNow(false); }}
                >
                  Reset filter
                </button>
              )}
            </div>
          )}

          {permissionDenied && (
            <p className="mt-3 text-xs text-destructive">
              Izin lokasi ditolak. Aktifkan dari pengaturan browser, lalu klik "Aktifkan GPS" lagi.
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-6">
        {coords && filteredShops.length > 0 && (
          <div className="mb-4 flex justify-end">
            <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs">
              <button
                onClick={() => setView("list")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <List className="h-3.5 w-3.5" /> Daftar
              </button>
              <button
                onClick={() => setView("map")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
              >
                <MapIcon className="h-3.5 w-3.5" /> Peta
              </button>
            </div>
          </div>
        )}

        {!coords ? (
          <Card className="p-8 text-center">
            <Navigation className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-3 font-semibold">Aktifkan GPS untuk mulai mencari</p>
            <p className="mt-1 text-sm text-muted-foreground">Kami hanya memakai lokasi Anda untuk mencari toko terdekat.</p>
          </Card>
        ) : view === "map" && filteredShops.length > 0 ? (
          <NearbyShopsMap center={coords} shops={filteredShops} radiusKm={radius} height={520} />
        ) : loading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="p-4"><Skeleton className="h-20 w-full" /></Card>
            ))}
          </div>
        ) : filteredShops.length === 0 ? (
          <Card className="p-8 text-center">
            <SearchIcon className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="mt-3 font-semibold">
              {shops.length > 0
                ? "Tidak ada toko yang cocok dengan filter"
                : `Tidak ada toko dalam radius ${radius} km`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {shops.length > 0
                ? "Coba ubah atau reset filter di atas."
                : "Coba perbesar radius atau perbarui lokasi."}
            </p>
            {shops.length > 0 ? (
              <Button variant="outline" size="sm" className="mt-4"
                onClick={() => { setMinRating(0); setCategoryFilter("all"); setOpenNow(false); }}>
                Reset filter
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="mt-4"
                onClick={() => setRadius(Math.min(50, radius + 5))}>
                <RefreshCw className="h-4 w-4 mr-1.5" /> Perbesar radius +5 km
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredShops.map((s) => (
              <Card key={s.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3">
                  {s.logo_url ? (
                    <img src={s.logo_url} alt={s.name} className="h-14 w-14 rounded-xl object-cover border border-border" loading="lazy" />
                  ) : (
                    <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center font-bold text-primary text-lg">
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
                      {s.open_hours && (
                        <span className={`inline-flex items-center gap-0.5 font-medium ${isShopOpenNow(s.open_hours) ? "text-emerald-600" : "text-rose-500"}`}>
                          <Clock className="h-3 w-3" />
                          {isShopOpenNow(s.open_hours) ? "Buka" : "Tutup"}
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
