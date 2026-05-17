import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Navigation, Clock, Phone, Globe, ChevronLeft, ExternalLink, Loader2 } from "lucide-react";

export const Route = createFileRoute("/toko/$slug/map")({ component: ShopMapPage });

type ShopInfo = {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  logo_url: string | null;
  latitude: number | null;
  longitude: number | null;
  open_hours: any;
  kyc_status: string | null;
};

export default function ShopMapPage() {
  const { slug } = Route.useParams();
  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    supabase
      .from("shops")
      .select("id, name, address, city, phone, logo_url, latitude, longitude, open_hours, kyc_status")
      .eq("slug", slug)
      .maybeSingle()
      .then(({ data }) => {
        setShop(data as any);
        setLoading(false);
      });
  }, [slug]);

  function getMyLocation() {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => { setLocating(false); },
      { timeout: 10000 }
    );
  }

  function openGoogleMaps() {
    if (!shop) return;
    const query = shop.latitude && shop.longitude
      ? `${shop.latitude},${shop.longitude}`
      : encodeURIComponent(`${shop.name} ${shop.address ?? ""} ${shop.city ?? ""}`);
    window.open(`https://maps.google.com/?q=${query}`, "_blank");
  }

  function openDirections() {
    if (!shop) return;
    const dest = shop.latitude && shop.longitude
      ? `${shop.latitude},${shop.longitude}`
      : encodeURIComponent(`${shop.name} ${shop.address ?? ""}`);
    const origin = userLocation ? `${userLocation.lat},${userLocation.lng}` : "";
    window.open(`https://maps.google.com/maps?saddr=${origin}&daddr=${dest}`, "_blank");
  }

  const DAYS = ["Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"];
  const today = new Date().getDay();
  const todayIdx = today === 0 ? 6 : today - 1;

  const mapUrl = shop?.latitude && shop?.longitude
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${shop.longitude - 0.005},${shop.latitude - 0.005},${shop.longitude + 0.005},${shop.latitude + 0.005}&layer=mapnik&marker=${shop.latitude},${shop.longitude}`
    : null;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );

  if (!shop) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      <div className="text-center">
        <MapPin className="h-10 w-10 mx-auto mb-3 opacity-30" />
        <p>Toko tidak ditemukan</p>
        <Button asChild className="mt-4" variant="outline"><Link to="/">Kembali</Link></Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/toko/$slug" params={{ slug }}><ChevronLeft className="h-4 w-4 mr-1" /> Kembali</Link>
        </Button>
        <h1 className="font-semibold truncate">{shop.name} — Lokasi</h1>
      </div>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {mapUrl ? (
          <div className="rounded-xl overflow-hidden border border-border h-64">
            <iframe
              title="Lokasi Toko"
              src={mapUrl}
              className="w-full h-full"
              style={{ border: "none" }}
            />
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border h-64 flex flex-col items-center justify-center text-muted-foreground bg-muted/30">
            <MapPin className="h-10 w-10 mb-2 opacity-30" />
            <p className="text-sm">Koordinat belum diatur oleh toko</p>
            <p className="text-xs mt-1">Cari di Google Maps menggunakan alamat di bawah</p>
          </div>
        )}

        <Card className="p-4 space-y-3">
          <div className="flex items-start gap-3">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="w-12 h-12 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold">{shop.name}</p>
                {shop.kyc_status === "approved" && (
                  <Badge className="text-xs h-5 bg-green-600 hover:bg-green-600">✓ Terverifikasi</Badge>
                )}
              </div>
              {(shop.address || shop.city) && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {[shop.address, shop.city].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
          </div>

          {shop.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <a href={`tel:${shop.phone}`} className="text-primary hover:underline">{shop.phone}</a>
            </div>
          )}

          {shop.open_hours && typeof shop.open_hours === "object" && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Jam Operasional
              </p>
              <div className="space-y-1">
                {DAYS.map((day, idx) => {
                  const hours = (shop.open_hours as any)[day.toLowerCase()] ?? (shop.open_hours as any)[String(idx + 1)];
                  return (
                    <div key={day} className={`flex justify-between text-sm ${idx === todayIdx ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                      <span>{day} {idx === todayIdx && <Badge variant="secondary" className="text-xs h-4 ml-1">Hari ini</Badge>}</span>
                      <span>{hours ?? "—"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        <div className="grid gap-2 sm:grid-cols-3">
          <Button variant="outline" onClick={getMyLocation} disabled={locating}>
            <Navigation className="h-4 w-4 mr-1.5" />
            {locating ? "Mencari..." : "Lokasiku"}
          </Button>
          <Button variant="outline" onClick={openGoogleMaps}>
            <Globe className="h-4 w-4 mr-1.5" /> Google Maps
          </Button>
          <Button onClick={openDirections}>
            <ExternalLink className="h-4 w-4 mr-1.5" /> Petunjuk Arah
          </Button>
        </div>
      </div>
    </div>
  );
}
