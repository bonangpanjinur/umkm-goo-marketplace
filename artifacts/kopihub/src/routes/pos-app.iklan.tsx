import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Megaphone, Plus, X, Clock, CheckCircle2, XCircle, Calendar,
  TrendingUp, Eye, MousePointerClick, BarChart2, RefreshCw,
  Package, Store, MapPin, Banknote, Info, AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/pos-app/iklan")({
  component: IklanPage,
});

type AdStatus = "pending" | "active" | "rejected" | "expired" | "paused";
type AdPosition = "hero_carousel" | "homepage_middle" | "search_top" | "category_top" | "product_sidebar";
type AdType = "product" | "shop";

type AdRequest = {
  id: string;
  ad_type: AdType;
  target_id: string;
  target_name: string;
  position: AdPosition;
  budget_idr: number;
  duration_days: number;
  starts_at: string | null;
  ends_at: string | null;
  status: AdStatus;
  reject_reason: string | null;
  impressions: number;
  clicks: number;
  created_at: string;
};

type MenuItem = { id: string; name: string; price: number };

const POSITIONS: { value: AdPosition; label: string; desc: string; price_per_day: number; badge?: string }[] = [
  { value: "hero_carousel", label: "Banner Hero (Carousel)", desc: "Tampil di slider utama halaman depan — visibilitas tertinggi", price_per_day: 50000, badge: "Populer" },
  { value: "homepage_middle", label: "Tengah Homepage", desc: "Slot iklan di antara flash sale dan kategori", price_per_day: 30000 },
  { value: "search_top", label: "Atas Halaman Pencarian", desc: "Tampil saat pembeli mencari produk", price_per_day: 25000 },
  { value: "category_top", label: "Atas Halaman Kategori", desc: "Tampil di halaman kategori relevan", price_per_day: 20000 },
  { value: "product_sidebar", label: "Sidebar Produk", desc: "Tampil di samping detail produk lain", price_per_day: 15000 },
];

const DURATIONS = [
  { days: 7, label: "7 hari" },
  { days: 14, label: "14 hari", badge: "Hemat 10%" },
  { days: 30, label: "30 hari", badge: "Hemat 20%" },
];

const STATUS_CONFIG: Record<AdStatus, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Menunggu Verifikasi", color: "bg-amber-100 text-amber-700", icon: Clock },
  active: { label: "Aktif Ditayangkan", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  rejected: { label: "Ditolak", color: "bg-red-100 text-red-700", icon: XCircle },
  expired: { label: "Masa Habis", color: "bg-slate-100 text-slate-600", icon: Calendar },
  paused: { label: "Dijeda", color: "bg-blue-100 text-blue-700", icon: AlertCircle },
};

const POSITION_LABELS: Record<AdPosition, string> = {
  hero_carousel: "Banner Hero",
  homepage_middle: "Tengah Homepage",
  search_top: "Atas Pencarian",
  category_top: "Atas Kategori",
  product_sidebar: "Sidebar Produk",
};

const DEMO_ADS: AdRequest[] = [
  { id: "ad-demo-1", ad_type: "product", target_id: "p1", target_name: "Kopi Arabika Gayo Premium", position: "homepage_middle", budget_idr: 210000, duration_days: 7, starts_at: new Date(Date.now() - 86400000).toISOString(), ends_at: new Date(Date.now() + 86400000 * 6).toISOString(), status: "active", reject_reason: null, impressions: 842, clicks: 53, created_at: new Date(Date.now() - 86400000 * 2).toISOString() },
  { id: "ad-demo-2", ad_type: "shop", target_id: "s1", target_name: "Toko Kamu", position: "hero_carousel", budget_idr: 700000, duration_days: 14, starts_at: null, ends_at: null, status: "pending", reject_reason: null, impressions: 0, clicks: 0, created_at: new Date(Date.now() - 3600000 * 2).toISOString() },
];

export default function IklanPage() {
  const { user } = useAuth();
  const [ads, setAds] = useState<AdRequest[]>([]);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [usingDemo, setUsingDemo] = useState(false);

  const [adType, setAdType] = useState<AdType>("product");
  const [targetId, setTargetId] = useState("");
  const [targetName, setTargetName] = useState("");
  const [position, setPosition] = useState<AdPosition>("homepage_middle");
  const [durationDays, setDurationDays] = useState(7);

  const selectedPos = POSITIONS.find(p => p.value === position)!;
  const discountFactor = durationDays >= 30 ? 0.8 : durationDays >= 14 ? 0.9 : 1;
  const totalBudget = Math.round(selectedPos.price_per_day * durationDays * discountFactor);

  async function load() {
    setLoading(true);
    try {
      if (!user) throw new Error();
      const { data: shopData } = await supabase.from("coffee_shops").select("id, name").eq("owner_id", user.id).maybeSingle();
      if (!shopData) throw new Error();
      setShopId(shopData.id);
      setShopName(shopData.name);

      const { data: menuData } = await supabase.from("menu_items").select("id, name, price").eq("shop_id", shopData.id).eq("is_available", true).order("name");
      setProducts((menuData as MenuItem[]) ?? []);

      const { data: adData, error } = await (supabase as any).from("ad_requests").select("*").eq("shop_id", shopData.id).order("created_at", { ascending: false });
      if (error) throw error;
      setAds((adData as AdRequest[]) ?? []);
    } catch {
      setAds(DEMO_ADS);
      setUsingDemo(true);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, [user]);

  async function submitAd() {
    if (adType === "product" && !targetId) { toast.error("Pilih produk yang ingin diiklankan."); return; }
    setSubmitting(true);
    try {
      const payload = {
        shop_id: shopId,
        ad_type: adType,
        target_id: adType === "product" ? targetId : shopId,
        target_name: adType === "product" ? targetName : shopName,
        position,
        budget_idr: totalBudget,
        duration_days: durationDays,
        status: "pending",
      };
      if (usingDemo) {
        setAds(p => [{
          ...payload,
          id: `ad-new-${Date.now()}`,
          target_id: payload.target_id ?? "",
          shop_id: undefined,
          starts_at: null,
          ends_at: null,
          reject_reason: null,
          impressions: 0,
          clicks: 0,
          created_at: new Date().toISOString(),
        } as AdRequest, ...p]);
        toast.success("Iklan diajukan! Menunggu verifikasi admin.", { description: "Kami akan meninjau iklan Anda dalam 1×24 jam." });
      } else {
        const { error } = await (supabase as any).from("ad_requests").insert([payload]);
        if (error) throw error;
        toast.success("Iklan berhasil diajukan!", { description: "Admin akan memverifikasi dalam 1×24 jam." });
        load();
      }
      setShowForm(false);
      setTargetId(""); setTargetName(""); setAdType("product"); setPosition("homepage_middle"); setDurationDays(7);
    } catch { toast.error("Gagal mengajukan iklan."); }
    setSubmitting(false);
  }

  const totalImpressions = ads.filter(a => a.status === "active").reduce((sum, a) => sum + a.impressions, 0);
  const totalClicks = ads.filter(a => a.status === "active").reduce((sum, a) => sum + a.clicks, 0);
  const activeCount = ads.filter(a => a.status === "active").length;

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" /> Iklan & Promosi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pasang iklan produk atau toko Anda di halaman utama marketplace untuk menjangkau lebih banyak pembeli.
            {usingDemo && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Demo</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
            {showForm ? "Batal" : "Pasang Iklan"}
          </Button>
        </div>
      </div>

      {/* KPI */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Iklan Aktif", value: activeCount, icon: TrendingUp, color: "text-emerald-500" },
          { label: "Total Tayangan", value: totalImpressions.toLocaleString("id-ID"), icon: Eye, color: "text-blue-500" },
          { label: "Total Klik", value: totalClicks.toLocaleString("id-ID"), icon: MousePointerClick, color: "text-violet-500" },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-sm text-muted-foreground">{item.label}</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{item.value}</p>
            </div>
          );
        })}
      </div>

      {/* Form buat iklan */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-card p-6">
          <h2 className="mb-5 font-semibold text-base">Buat Iklan Baru</h2>

          {/* Tipe iklan */}
          <div className="mb-4">
            <Label className="mb-2 block">Jenis Iklan</Label>
            <div className="flex gap-3">
              {([["product", "Iklan Produk", Package], ["shop", "Iklan Toko", Store]] as const).map(([val, lbl, Icon]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => { setAdType(val); setTargetId(""); setTargetName(""); }}
                  className={`flex flex-1 items-center gap-2.5 rounded-xl border p-3.5 transition ${adType === val ? "border-primary bg-primary/5 text-primary" : "border-border hover:border-primary/30"}`}
                >
                  <Icon className="h-5 w-5" />
                  <div className="text-left">
                    <p className="text-sm font-medium">{lbl}</p>
                    <p className="text-xs text-muted-foreground">{val === "product" ? "Promosikan 1 produk spesifik" : "Promosikan profil toko Anda"}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Pilih produk */}
          {adType === "product" && (
            <div className="mb-4">
              <Label>Pilih Produk *</Label>
              {products.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">Tidak ada produk aktif. Tambahkan produk dulu di halaman Menu.</p>
              ) : (
                <select
                  className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={targetId}
                  onChange={e => {
                    const p = products.find(p => p.id === e.target.value);
                    setTargetId(e.target.value);
                    setTargetName(p?.name ?? "");
                  }}
                >
                  <option value="">-- Pilih produk --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} — Rp {Number(p.price).toLocaleString("id-ID")}</option>
                  ))}
                </select>
              )}
            </div>
          )}
          {adType === "shop" && (
            <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3 text-sm">
              <span className="font-medium">{shopName || "Toko Anda"}</span> akan dipromosikan di posisi yang dipilih.
            </div>
          )}

          {/* Posisi */}
          <div className="mb-4">
            <Label className="mb-2 block">Posisi Iklan</Label>
            <div className="space-y-2">
              {POSITIONS.map(pos => (
                <button
                  key={pos.value}
                  type="button"
                  onClick={() => setPosition(pos.value)}
                  className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition ${position === pos.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/20"}`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{pos.label}</span>
                      {pos.badge && <span className="rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-semibold">{pos.badge}</span>}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{pos.desc}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-semibold">Rp {pos.price_per_day.toLocaleString("id-ID")}/hari</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Durasi */}
          <div className="mb-5">
            <Label className="mb-2 block">Durasi Tayang</Label>
            <div className="flex gap-2">
              {DURATIONS.map(dur => (
                <button
                  key={dur.days}
                  type="button"
                  onClick={() => setDurationDays(dur.days)}
                  className={`flex-1 rounded-xl border p-3 text-center transition ${durationDays === dur.days ? "border-primary bg-primary/5" : "border-border hover:border-primary/20"}`}
                >
                  <p className="text-sm font-semibold">{dur.label}</p>
                  {dur.badge && <p className="mt-0.5 text-[10px] text-emerald-600 font-medium">{dur.badge}</p>}
                </button>
              ))}
            </div>
          </div>

          {/* Ringkasan biaya */}
          <div className="mb-5 rounded-xl border border-border bg-muted/30 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Harga per hari</span>
              <span>Rp {selectedPos.price_per_day.toLocaleString("id-ID")}</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-1">
              <span className="text-muted-foreground">Durasi</span>
              <span>{durationDays} hari</span>
            </div>
            {discountFactor < 1 && (
              <div className="flex items-center justify-between text-sm mt-1 text-emerald-600">
                <span>Diskon paket</span>
                <span>-{Math.round((1 - discountFactor) * 100)}%</span>
              </div>
            )}
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <span className="font-semibold">Total Pembayaran</span>
              <span className="text-lg font-bold text-primary">Rp {totalBudget.toLocaleString("id-ID")}</span>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700 mb-4">
            <Info className="h-4 w-4 shrink-0 mt-0.5" />
            <span>Iklan akan ditayangkan setelah diverifikasi oleh admin (1×24 jam). Pembayaran akan dikonfirmasi sebelum iklan aktif.</span>
          </div>

          <Button onClick={submitAd} disabled={submitting || (adType === "product" && !targetId)} className="w-full">
            {submitting ? "Mengajukan…" : `Ajukan Iklan — Rp ${totalBudget.toLocaleString("id-ID")}`}
          </Button>
        </div>
      )}

      {/* Daftar iklan */}
      <div className="space-y-3">
        {loading ? Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />)
          : ads.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
              <Megaphone className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Belum ada iklan aktif</p>
              <p className="mt-1 text-sm text-muted-foreground">Pasang iklan untuk menjangkau lebih banyak pembeli di marketplace.</p>
              <Button className="mt-4" size="sm" onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> Pasang Iklan Pertama</Button>
            </div>
          ) : ads.map(ad => {
            const cfg = STATUS_CONFIG[ad.status];
            const Icon = cfg.icon;
            const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "—";
            const daysLeft = ad.ends_at ? Math.ceil((new Date(ad.ends_at).getTime() - Date.now()) / 86400000) : null;
            return (
              <div key={ad.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {ad.ad_type === "product" ? <Package className="h-5 w-5" /> : <Store className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{ad.target_name}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>
                          {cfg.label}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{POSITION_LABELS[ad.position]}</span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><Banknote className="h-3 w-3" />Rp {ad.budget_idr.toLocaleString("id-ID")}</span>
                        {ad.ends_at && daysLeft !== null && daysLeft > 0 && (
                          <><span>·</span><span className="text-emerald-600 font-medium">{daysLeft} hari tersisa</span></>
                        )}
                      </div>
                      {ad.reject_reason && (
                        <p className="mt-1 text-xs text-destructive">Ditolak: {ad.reject_reason}</p>
                      )}
                    </div>
                  </div>
                  {ad.status === "active" && (
                    <div className="shrink-0 flex gap-3 text-right">
                      {[
                        { label: "Tayangan", value: ad.impressions.toLocaleString("id-ID"), icon: Eye },
                        { label: "Klik", value: ad.clicks.toLocaleString("id-ID"), icon: MousePointerClick },
                        { label: "CTR", value: `${ctr}%`, icon: BarChart2 },
                      ].map(stat => {
                        const SIcon = stat.icon;
                        return (
                          <div key={stat.label} className="text-center">
                            <p className="font-bold text-sm">{stat.value}</p>
                            <p className="flex items-center gap-0.5 text-[10px] text-muted-foreground justify-center">
                              <SIcon className="h-2.5 w-2.5" />{stat.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
