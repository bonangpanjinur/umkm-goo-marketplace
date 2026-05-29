import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Megaphone, CheckCircle2, XCircle, Clock, Search, RefreshCw,
  Eye, Store, Package, ChevronDown, ChevronUp, AlertCircle, BadgeCheck,
  Calendar, Banknote, MapPin, CreditCard,
} from "lucide-react";

export const Route = createFileRoute("/admin/ads")({
  head: () => ({ meta: [{ title: "Manajemen Iklan — Admin" }] }),
  component: AdminAdsPage,
});

type AdStatus = "payment_pending" | "pending" | "active" | "rejected" | "expired" | "paused";
type AdPosition = "hero_carousel" | "homepage_middle" | "search_top" | "category_top" | "product_sidebar";
type AdType = "product" | "shop";

type AdRequest = {
  id: string;
  shop_id: string;
  shop_name: string;
  shop_logo: string | null;
  ad_type: AdType;
  target_id: string;
  target_name: string;
  target_image: string | null;
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
  payment_method: string | null;
  payment_tx_id: string | null;
};

const DEMO_ADS: AdRequest[] = [
  { id: "ad-0", shop_id: "s0", shop_name: "Warung Mbok Sri", shop_logo: null, ad_type: "product", target_id: "p0", target_name: "Nasi Gudeg Spesial", target_image: null, position: "homepage_middle", budget_idr: 210000, duration_days: 7, starts_at: null, ends_at: null, status: "payment_pending", reject_reason: null, impressions: 0, clicks: 0, created_at: new Date(Date.now() - 900000).toISOString(), payment_method: "transfer", payment_tx_id: null },
  { id: "ad-1", shop_id: "s1", shop_name: "Batik Nusantara", shop_logo: null, ad_type: "shop", target_id: "s1", target_name: "Batik Nusantara", target_image: null, position: "hero_carousel", budget_idr: 500000, duration_days: 14, starts_at: null, ends_at: null, status: "pending", reject_reason: null, impressions: 0, clicks: 0, created_at: new Date(Date.now() - 3600000).toISOString(), payment_method: "gopay", payment_tx_id: "txn-abc-001" },
  { id: "ad-2", shop_id: "s2", shop_name: "Toko Berkah", shop_logo: null, ad_type: "product", target_id: "p1", target_name: "Produk Unggulan Toko", target_image: null, position: "homepage_middle", budget_idr: 200000, duration_days: 7, starts_at: new Date(Date.now() - 86400000 * 2).toISOString(), ends_at: new Date(Date.now() + 86400000 * 5).toISOString(), status: "active", reject_reason: null, impressions: 1240, clicks: 87, created_at: new Date(Date.now() - 86400000 * 3).toISOString(), payment_method: "transfer", payment_tx_id: "txn-abc-002" },
  { id: "ad-3", shop_id: "s3", shop_name: "Craft Corner", shop_logo: null, ad_type: "product", target_id: "p2", target_name: "Tas Anyam Rotan Premium", target_image: null, position: "search_top", budget_idr: 150000, duration_days: 7, starts_at: null, ends_at: null, status: "pending", reject_reason: null, impressions: 0, clicks: 0, created_at: new Date(Date.now() - 7200000).toISOString(), payment_method: "qris", payment_tx_id: "txn-abc-003" },
  { id: "ad-4", shop_id: "s4", shop_name: "Fashion ID", shop_logo: null, ad_type: "shop", target_id: "s4", target_name: "Fashion ID", target_image: null, position: "category_top", budget_idr: 300000, duration_days: 14, starts_at: new Date(Date.now() - 86400000 * 10).toISOString(), ends_at: new Date(Date.now() - 86400000 * 3).toISOString(), status: "expired", reject_reason: null, impressions: 3200, clicks: 210, created_at: new Date(Date.now() - 86400000 * 15).toISOString(), payment_method: "transfer", payment_tx_id: "txn-abc-004" },
  { id: "ad-5", shop_id: "s5", shop_name: "Digital Hub", shop_logo: null, ad_type: "product", target_id: "p3", target_name: "Template Canva Premium Bundle", target_image: null, position: "product_sidebar", budget_idr: 100000, duration_days: 7, starts_at: null, ends_at: null, status: "rejected", reject_reason: "Konten tidak sesuai dengan kebijakan platform", impressions: 0, clicks: 0, created_at: new Date(Date.now() - 86400000).toISOString(), payment_method: "transfer", payment_tx_id: "txn-abc-005" },
];

const POSITION_LABELS: Record<AdPosition, string> = {
  hero_carousel: "Carousel Hero",
  homepage_middle: "Tengah Homepage",
  search_top: "Atas Pencarian",
  category_top: "Atas Kategori",
  product_sidebar: "Sidebar Produk",
};

const STATUS_CONFIG: Record<AdStatus, { label: string; color: string; icon: typeof Clock }> = {
  payment_pending: { label: "Belum Bayar", color: "bg-orange-100 text-orange-700", icon: Banknote },
  pending:         { label: "Menunggu",    color: "bg-amber-100 text-amber-700",   icon: Clock },
  active:          { label: "Aktif",       color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  rejected:        { label: "Ditolak",     color: "bg-red-100 text-red-700",       icon: XCircle },
  expired:         { label: "Habis",       color: "bg-slate-100 text-slate-600",   icon: Calendar },
  paused:          { label: "Dijeda",      color: "bg-blue-100 text-blue-700",     icon: AlertCircle },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  transfer: "Transfer Bank", qris: "QRIS", gopay: "GoPay",
  ovo: "OVO", shopeepay: "ShopeePay", cc: "Kartu Kredit",
  xendit_invoice: "Xendit Invoice",
};

export default function AdminAdsPage() {
  const [ads, setAds] = useState<AdRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<AdStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);
  const [usingDemo, setUsingDemo] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any).from("ad_requests")
        .select("*, shops(name, logo_url)")
        .order("created_at", { ascending: false });
      if (error || !data) throw new Error();
      setAds(data as AdRequest[]);
    } catch {
      setAds(DEMO_ADS);
      setUsingDemo(true);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function approve(id: string) {
    setProcessing(true);
    try {
      if (usingDemo) {
        const now = new Date();
        setAds(p => p.map(a => a.id === id ? {
          ...a, status: "active" as AdStatus,
          starts_at: now.toISOString(),
          ends_at: new Date(now.getTime() + (a.duration_days * 86400000)).toISOString(),
        } : a));
        toast.success("Iklan disetujui.");
      } else {
        const ad = ads.find(a => a.id === id);
        if (!ad) throw new Error();
        const starts = new Date();
        const ends = new Date(starts.getTime() + ad.duration_days * 86400000);
        const { error } = await (supabase as any).from("ad_requests").update({
          status: "active",
          starts_at: starts.toISOString(),
          ends_at: ends.toISOString(),
        }).eq("id", id);
        if (error) throw error;
        toast.success("Iklan disetujui dan mulai ditayangkan.");
        load();
      }
    } catch { toast.error("Gagal menyetujui iklan."); }
    setProcessing(false);
  }

  async function reject(id: string) {
    if (!rejectReason.trim()) { toast.error("Alasan penolakan wajib diisi."); return; }
    setProcessing(true);
    try {
      if (usingDemo) {
        setAds(p => p.map(a => a.id === id ? { ...a, status: "rejected" as AdStatus, reject_reason: rejectReason } : a));
        toast.success("Iklan ditolak.");
      } else {
        const { error } = await (supabase as any).from("ad_requests").update({ status: "rejected", reject_reason: rejectReason }).eq("id", id);
        if (error) throw error;
        toast.success("Iklan ditolak.");
        load();
      }
    } catch { toast.error("Gagal menolak iklan."); }
    setProcessing(false);
    setRejectId(null);
    setRejectReason("");
  }

  async function pause(id: string) {
    if (usingDemo) {
      setAds(p => p.map(a => a.id === id ? { ...a, status: "paused" as AdStatus } : a));
      toast.success("Iklan dijeda.");
      return;
    }
    await (supabase as any).from("ad_requests").update({ status: "paused" }).eq("id", id);
    toast.success("Iklan dijeda.");
    load();
  }

  const filtered = ads.filter(a => {
    if (filterStatus !== "all" && a.status !== filterStatus) return false;
    if (search && !a.shop_name.toLowerCase().includes(search.toLowerCase()) && !a.target_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const paymentPendingCount = ads.filter(a => a.status === "payment_pending").length;
  const pendingCount = ads.filter(a => a.status === "pending").length;
  const activeCount = ads.filter(a => a.status === "active").length;

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">Manajemen Iklan</h1>
            {pendingCount > 0 && (
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">{pendingCount} pending</span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Verifikasi & kelola iklan yang diajukan oleh pemilik toko.
            {usingDemo && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Mode Demo</span>}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* KPI cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(["payment_pending", "pending", "active", "expired", "rejected"] as AdStatus[]).map(s => {
          const count = ads.filter(a => a.status === s).length;
          const cfg = STATUS_CONFIG[s];
          const Icon = cfg.icon;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}
              className={`flex items-center gap-3 rounded-xl border p-4 text-left transition hover:border-primary/40 ${filterStatus === s ? "border-primary bg-primary/5" : "border-border bg-card"}`}
            >
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xl font-bold">{count}</p>
                <p className="text-xs text-muted-foreground">{cfg.label}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter & search */}
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Cari nama toko atau produk…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Button variant={filterStatus === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterStatus("all")}>Semua</Button>
        {(["payment_pending", "pending", "active", "rejected", "expired"] as AdStatus[]).map(s => (
          <Button key={s} variant={filterStatus === s ? "default" : "outline"} size="sm" onClick={() => setFilterStatus(filterStatus === s ? "all" : s)}>
            {STATUS_CONFIG[s].label}
          </Button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />)
          : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
              <Megaphone className="mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Tidak ada iklan ditemukan</p>
            </div>
          ) : filtered.map(ad => {
            const cfg = STATUS_CONFIG[ad.status];
            const Icon = cfg.icon;
            const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "0.0";
            const isExpanded = expanded === ad.id;
            return (
              <div key={ad.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div
                  className="flex cursor-pointer items-center gap-4 p-4"
                  onClick={() => setExpanded(isExpanded ? null : ad.id)}
                >
                  {/* Shop avatar */}
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {ad.shop_logo ? <img src={ad.shop_logo} alt="" className="h-full w-full rounded-full object-cover" loading="lazy" decoding="async" /> : <Store className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{ad.shop_name}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                        {ad.ad_type === "product" ? "Produk" : "Toko"}
                      </span>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
                        {POSITION_LABELS[ad.position]}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{ad.target_name}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-4 text-right">
                    <div>
                      <p className="text-sm font-semibold">Rp {ad.budget_idr.toLocaleString("id-ID")}</p>
                      <p className="text-xs text-muted-foreground">{ad.duration_days} hari</p>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>

                {/* Detail panel */}
                {isExpanded && (
                  <div className="border-t border-border bg-muted/20 p-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Package className="h-4 w-4" />
                          <span><strong className="text-foreground">Target:</strong> {ad.target_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          <span><strong className="text-foreground">Posisi:</strong> {POSITION_LABELS[ad.position]}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Banknote className="h-4 w-4" />
                          <span><strong className="text-foreground">Budget:</strong> Rp {ad.budget_idr.toLocaleString("id-ID")} / {ad.duration_days} hari</span>
                        </div>
                        {ad.starts_at && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            <span><strong className="text-foreground">Periode:</strong> {new Date(ad.starts_at).toLocaleDateString("id-ID")} — {ad.ends_at ? new Date(ad.ends_at).toLocaleDateString("id-ID") : "?"}</span>
                          </div>
                        )}
                        {ad.payment_method && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CreditCard className="h-4 w-4" />
                            <span><strong className="text-foreground">Metode bayar:</strong> {PAYMENT_METHOD_LABELS[ad.payment_method] ?? ad.payment_method}</span>
                            {ad.status === "payment_pending" && <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-[10px] font-semibold">Belum dibayar</span>}
                            {ad.payment_tx_id && ad.status !== "payment_pending" && <span className="rounded-full bg-emerald-100 text-emerald-700 px-2 py-0.5 text-[10px] font-semibold">Lunas</span>}
                          </div>
                        )}
                        {ad.reject_reason && (
                          <div className="rounded-lg bg-red-50 border border-red-200 p-2 text-sm text-red-700">
                            <strong>Alasan ditolak:</strong> {ad.reject_reason}
                          </div>
                        )}
                      </div>
                      {ad.status === "active" && (
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "Tayangan", value: ad.impressions.toLocaleString("id-ID") },
                            { label: "Klik", value: ad.clicks.toLocaleString("id-ID") },
                            { label: "CTR", value: `${ctr}%` },
                          ].map(stat => (
                            <div key={stat.label} className="rounded-xl border border-border bg-card p-3 text-center">
                              <p className="text-lg font-bold">{stat.value}</p>
                              <p className="text-xs text-muted-foreground">{stat.label}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex flex-wrap gap-2">
                      {ad.status === "pending" && (
                        <>
                          <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700" onClick={() => approve(ad.id)} disabled={processing}>
                            <BadgeCheck className="h-4 w-4" /> Setujui & Aktifkan
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/5"
                            onClick={() => setRejectId(rejectId === ad.id ? null : ad.id)}>
                            <XCircle className="h-4 w-4" /> Tolak
                          </Button>
                        </>
                      )}
                      {ad.status === "active" && (
                        <Button size="sm" variant="outline" onClick={() => pause(ad.id)} disabled={processing}>
                          Jeda Iklan
                        </Button>
                      )}
                      {ad.status === "paused" && (
                        <Button size="sm" variant="outline" className="text-emerald-600" onClick={() => approve(ad.id)} disabled={processing}>
                          Lanjutkan Iklan
                        </Button>
                      )}
                    </div>

                    {/* Reject form */}
                    {rejectId === ad.id && (
                      <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                        <Label className="text-sm font-medium text-red-800">Alasan penolakan (wajib)</Label>
                        <Input
                          className="mt-1.5 border-red-200 bg-white"
                          placeholder="Jelaskan alasan penolakan kepada owner…"
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                        />
                        <div className="mt-2 flex gap-2">
                          <Button size="sm" variant="destructive" onClick={() => reject(ad.id)} disabled={processing || !rejectReason.trim()}>
                            Konfirmasi Tolak
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { setRejectId(null); setRejectReason(""); }}>Batal</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {usingDemo && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold mb-1">SQL untuk tabel ad_requests (jalankan di Supabase SQL Editor):</p>
          <pre className="mt-2 overflow-x-auto rounded bg-amber-100 p-3 text-xs leading-relaxed">{`create table if not exists ad_requests (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid references shops(id),
  ad_type text check (ad_type in ('product','shop')) default 'product',
  target_id uuid,
  target_name text,
  target_image text,
  position text check (position in (
    'hero_carousel','homepage_middle','search_top','category_top','product_sidebar'
  )),
  budget_idr numeric default 0,
  duration_days int default 7,
  starts_at timestamptz,
  ends_at timestamptz,
  status text check (status in (
    'payment_pending','pending','active','rejected','expired','paused'
  )) default 'payment_pending',
  reject_reason text,
  payment_method text,
  payment_tx_id text,
  impressions int default 0,
  clicks int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table ad_requests enable row level security;

-- Owner bisa buat & lihat iklan milik toko mereka
create policy "owner insert" on ad_requests for insert
  with check (shop_id in (
    select id from shops where owner_id = auth.uid()
  ));
create policy "owner select" on ad_requests for select
  using (shop_id in (
    select id from shops where owner_id = auth.uid()
  ));
create policy "owner update payment" on ad_requests for update
  using (shop_id in (
    select id from shops where owner_id = auth.uid()
  ));`}
          </pre>
        </div>
      )}
    </div>
  );
}
