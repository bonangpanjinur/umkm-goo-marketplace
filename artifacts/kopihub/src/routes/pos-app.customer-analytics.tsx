import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { formatIDR } from "@/lib/format";
import {
  Users, Star, TrendingDown, TrendingUp, RefreshCw, Loader2,
  BellOff, Zap, CalendarDays, MessageSquare, Phone, ChevronDown, ChevronUp,
  Download, BadgeCheck, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/customer-analytics")({
  head: () => ({ meta: [{ title: "Analitik Pembeli — Merchant" }] }),
  component: CustomerAnalyticsPage,
});

// ── Types ──────────────────────────────────────────────────────────────────────

type Segment = "setia" | "baru" | "perlu-aktivasi" | "churn-risk" | "tidak-responsif";

type CustomerEntry = {
  phone: string;
  name: string;
  booking_count: number;
  total_value: number;
  review_count: number;
  is_unresponsive: boolean;
  days_since_last: number;
  last_booking_at: string;
  segment: Segment;
};

// ── Segment metadata ───────────────────────────────────────────────────────────

const SEG: Record<Segment, {
  label: string;
  color: string;
  bg: string;
  border: string;
  barColor: string;
  Icon: React.ElementType;
  desc: string;
  tip: string;
}> = {
  "setia": {
    label: "Pelanggan Setia",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    barColor: "bg-emerald-500",
    Icon: Star,
    desc: "≥ 3 booking, aktif dalam 90 hari terakhir",
    tip: "Berikan apresiasi: voucher khusus, akses prioritas, atau pesan personal.",
  },
  "baru": {
    label: "Pelanggan Baru",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    barColor: "bg-blue-500",
    Icon: Users,
    desc: "1 booking, ≤ 30 hari lalu",
    tip: "Kesan pertama penting. Pastikan pengalaman mereka luar biasa agar balik lagi.",
  },
  "perlu-aktivasi": {
    label: "Perlu Diaktivasi",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    barColor: "bg-amber-500",
    Icon: Zap,
    desc: "Terakhir booking 90–180 hari lalu",
    tip: "Kirim WA reaktivasi — tawarkan sesuatu yang personal untuk mendorong booking ulang.",
  },
  "churn-risk": {
    label: "Churn Risk",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    barColor: "bg-red-500",
    Icon: TrendingDown,
    desc: "Terakhir booking > 180 hari lalu",
    tip: "Pelanggan ini hampir hilang. Kirim pesan win-back sekarang sebelum terlambat.",
  },
  "tidak-responsif": {
    label: "Tidak Responsif",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    barColor: "bg-orange-500",
    Icon: BellOff,
    desc: "Blacklisted dari notif review otomatis",
    tip: "Pendekatan manual via WA lebih efektif dari notif otomatis untuk segmen ini.",
  },
};

// ── Helper functions ───────────────────────────────────────────────────────────

function computeSegment(c: Omit<CustomerEntry, "segment">): Segment {
  if (c.booking_count >= 3 && c.days_since_last <= 90) return "setia";
  if (c.is_unresponsive && c.review_count === 0)         return "tidak-responsif";
  if (c.days_since_last > 180)                           return "churn-risk";
  if (c.days_since_last > 90)                            return "perlu-aktivasi";
  if (c.booking_count === 1 && c.days_since_last <= 30)  return "baru";
  return "perlu-aktivasi";
}

function buildWaMsg(name: string, shopName: string, segment: Segment): string {
  const hi = name ? `Halo ${name} 👋` : "Halo Kak 👋";
  if (segment === "perlu-aktivasi")
    return encodeURIComponent(`${hi}\n\nSudah lama tidak ketemu di *${shopName}*! 😊 Kami kangen nih.\n\nAda slot dan layanan terbaru yang mungkin cocok buat kamu. Yuk booking lagi! Kami siap melayani.\n\n🙏 Terima kasih`);
  if (segment === "churn-risk")
    return encodeURIComponent(`${hi}\n\nKami kangen kamu! ❤️ Sudah lama banget tidak booking di *${shopName}*.\n\nYuk balik lagi — ada yang baru dan spesial menunggu kamu! Jangan sampai kita kehilangan pelanggan seperti kamu.\n\n🙏 Terima kasih sudah pernah mempercayai layanan kami.`);
  if (segment === "tidak-responsif")
    return encodeURIComponent(`${hi}\n\nTerima kasih sudah booking di *${shopName}*! 🙏\n\nKalau berkenan, boleh bagikan pengalaman kamu dengan memberikan ulasan? Ulasanmu sangat berarti bagi kami dan pembeli lain.\n\nSatu bintang sudah cukup — kami hargai kejujuranmu! ⭐`);
  return encodeURIComponent(`${hi}\n\nTerima kasih sudah setia booking di *${shopName}*! 🌟\n\nKami selalu senang melayani kamu.`);
}

function fmtDays(days: number): string {
  if (days === 0) return "Hari ini";
  if (days === 1) return "Kemarin";
  if (days < 30)  return `${days} hari lalu`;
  if (days < 365) return `${Math.round(days / 30)} bln lalu`;
  return `${Math.round(days / 365)} thn lalu`;
}

function downloadCSV(rows: CustomerEntry[]) {
  const header = ["Nama", "Telepon", "Segmen", "Total Booking", "Nilai Total (Rp)", "Ulasan", "Tidak Responsif", "Terakhir Booking (hari lalu)"];
  const lines = rows.map(r => [
    r.name || "-", r.phone, SEG[r.segment].label,
    r.booking_count, r.total_value, r.review_count,
    r.is_unresponsive ? "Ya" : "Tidak", r.days_since_last,
  ].join(","));
  const csv = [header.join(","), ...lines].join("\n");
  const a = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: "analitik-pembeli.csv",
  });
  a.click();
}

// ── Main page ──────────────────────────────────────────────────────────────────

function CustomerAnalyticsPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [customers, setCustomers]   = useState<CustomerEntry[]>([]);
  const [loading, setLoading]       = useState(true);
  const [segment, setSegment]       = useState<Segment | "all">("all");
  const [sortBy, setSortBy]         = useState<"last" | "count" | "value">("last");
  const [sortDir, setSortDir]       = useState<"asc" | "desc">("asc");
  const [expanded, setExpanded]     = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!shop?.id) return;
    setLoading(true);
    try {
      // 1. All completed bookings for this shop (via booking_slots.shop_id)
      const { data: bkData, error: bkErr } = await (supabase as any)
        .from("bookings")
        .select("id, customer_name, customer_phone, created_at, booking_slots(shop_id, price)")
        .eq("booking_slots.shop_id", shop.id)
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(2000);
      if (bkErr) throw bkErr;

      const bookings: any[] = (bkData ?? []).filter((b: any) => b.booking_slots);
      if (bookings.length === 0) { setCustomers([]); setLoading(false); return; }

      const bookingIds = bookings.map((b: any) => b.id);

      // 2. Review requests (for unresponsive flag)
      const [reqRes, revRes] = await Promise.all([
        (supabase as any)
          .from("booking_review_requests")
          .select("booking_id, is_unresponsive")
          .in("booking_id", bookingIds),
        (supabase as any)
          .from("booking_reviews")
          .select("booking_id")
          .in("booking_id", bookingIds),
      ]);

      const unresponsiveSet = new Set<string>(
        ((reqRes.data ?? []) as any[])
          .filter((r: any) => r.is_unresponsive)
          .map((r: any) => r.booking_id)
      );
      const reviewedSet = new Set<string>(
        ((revRes.data ?? []) as any[]).map((r: any) => r.booking_id)
      );

      // 3. Group by phone
      const phoneMap: Record<string, {
        name: string;
        booking_ids: string[];
        total_value: number;
        last_booking_at: string;
        has_unresponsive: boolean;
        review_count: number;
      }> = {};

      for (const b of bookings) {
        const phone = b.customer_phone ?? "__unknown__";
        if (!phoneMap[phone]) {
          phoneMap[phone] = {
            name: b.customer_name ?? "",
            booking_ids: [],
            total_value: 0,
            last_booking_at: b.created_at,
            has_unresponsive: false,
            review_count: 0,
          };
        }
        const entry = phoneMap[phone];
        entry.booking_ids.push(b.id);
        entry.total_value += Number(b.booking_slots?.price ?? 0);
        if (b.created_at > entry.last_booking_at) {
          entry.last_booking_at = b.created_at;
          if (b.customer_name) entry.name = b.customer_name;
        }
        if (unresponsiveSet.has(b.id)) entry.has_unresponsive = true;
        if (reviewedSet.has(b.id)) entry.review_count++;
      }

      const now = Date.now();
      const entries: CustomerEntry[] = Object.entries(phoneMap).map(([phone, d]) => {
        const days = Math.floor((now - new Date(d.last_booking_at).getTime()) / 86_400_000);
        const partial: Omit<CustomerEntry, "segment"> = {
          phone,
          name: d.name,
          booking_count: d.booking_ids.length,
          total_value: d.total_value,
          review_count: d.review_count,
          is_unresponsive: d.has_unresponsive,
          days_since_last: days,
          last_booking_at: d.last_booking_at,
        };
        return { ...partial, segment: computeSegment(partial) };
      });

      setCustomers(entries);
    } catch (e: any) {
      toast.error("Gagal memuat: " + e.message);
    } finally {
      setLoading(false);
    }
  }, [shop?.id]);

  useEffect(() => { if (shop?.id) load(); }, [shop?.id, load]);

  // ── Derived ──────────────────────────────────────────────────────────────────
  const segCounts = useMemo(() => {
    const acc: Record<string, number> = { all: customers.length };
    for (const seg of Object.keys(SEG) as Segment[]) {
      acc[seg] = customers.filter(c => c.segment === seg).length;
    }
    return acc;
  }, [customers]);

  const displayed = useMemo(() => {
    let list = segment === "all" ? customers : customers.filter(c => c.segment === segment);
    list = [...list].sort((a, b) => {
      let diff = 0;
      if (sortBy === "last")  diff = a.days_since_last - b.days_since_last;
      if (sortBy === "count") diff = a.booking_count - b.booking_count;
      if (sortBy === "value") diff = a.total_value - b.total_value;
      return sortDir === "asc" ? diff : -diff;
    });
    return list;
  }, [customers, segment, sortBy, sortDir]);

  const totalValue = useMemo(() => customers.reduce((s, c) => s + c.total_value, 0), [customers]);
  const avgBookings = customers.length > 0
    ? (customers.reduce((s, c) => s + c.booking_count, 0) / customers.length).toFixed(1)
    : "0";

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("desc"); }
  }

  if (shopLoading) {
    return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" /> Analitik Pembeli
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Segmentasi pembeli booking berdasarkan frekuensi, nilai transaksi, dan responsivitas ulasan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => downloadCSV(displayed)} disabled={customers.length === 0}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Pembeli",     value: customers.length,                        sub: "unik berdasarkan nomor",       color: "" },
          { label: "Pelanggan Setia",   value: segCounts["setia"] ?? 0,                sub: "aktif & loyal",                color: "text-emerald-600" },
          { label: "Churn Risk",        value: segCounts["churn-risk"] ?? 0,           sub: "> 180 hari tidak booking",     color: "text-red-600" },
          { label: "Tidak Responsif",   value: segCounts["tidak-responsif"] ?? 0,      sub: "blacklist notif review",       color: "text-orange-600" },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Secondary KPIs */}
      {customers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Total Nilai Booking</p>
            <p className="text-lg font-bold mt-0.5">{formatIDR(totalValue)}</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Rata-rata Booking/Pembeli</p>
            <p className="text-lg font-bold mt-0.5">{avgBookings}×</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs text-muted-foreground">Tingkat Ulasan</p>
            <p className="text-lg font-bold mt-0.5">
              {customers.length > 0
                ? `${Math.round((customers.reduce((s, c) => s + c.review_count, 0) / customers.reduce((s, c) => s + c.booking_count, 0)) * 100)}%`
                : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Segment breakdown bars */}
      {customers.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-2.5">
          <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Distribusi Segmen</p>
          {(Object.entries(SEG) as [Segment, typeof SEG[Segment]][]).map(([key, cfg]) => {
            const count = segCounts[key] ?? 0;
            const pct = customers.length > 0 ? Math.round((count / customers.length) * 100) : 0;
            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <button
                    onClick={() => setSegment(s => s === key ? "all" : key)}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                      segment === key ? cfg.color : "text-foreground hover:" + cfg.color
                    }`}
                  >
                    <cfg.Icon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </button>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {count} ({pct}%)
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${cfg.barColor}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Segment filter tabs */}
      <div className="flex gap-1 flex-wrap rounded-lg border border-border bg-muted/30 p-1 w-fit">
        {([["all", "Semua", customers.length], ...Object.entries(SEG).map(([k, v]) => [k, v.label, segCounts[k] ?? 0])] as [string, string, number][]).map(([key, label, count]) => (
          <button
            key={key}
            onClick={() => setSegment(key as Segment | "all")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap ${
              segment === key ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
              segment === key ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
            }`}>{count}</span>
          </button>
        ))}
      </div>

      {/* Segment tip */}
      {segment !== "all" && (
        <div className={`rounded-lg border px-4 py-3 flex items-start gap-3 ${SEG[segment].bg} ${SEG[segment].border}`}>
          {(() => { const { Icon } = SEG[segment]; return <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${SEG[segment].color}`} />; })()}
          <div>
            <p className={`text-xs font-semibold ${SEG[segment].color}`}>{SEG[segment].label} — {SEG[segment].desc}</p>
            <p className={`text-xs mt-0.5 ${SEG[segment].color} opacity-80`}>{SEG[segment].tip}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-14 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground">
            {customers.length === 0
              ? "Belum ada data booking selesai dari toko ini."
              : `Tidak ada pembeli di segmen "${segment !== "all" ? SEG[segment as Segment].label : "ini"}".`}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 border-b border-border bg-muted/30 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            <span>Pembeli</span>
            <button onClick={() => toggleSort("count")} className="flex items-center gap-1 hover:text-foreground transition-colors">
              Booking {sortBy === "count" ? (sortDir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />) : null}
            </button>
            <button onClick={() => toggleSort("value")} className="flex items-center gap-1 hover:text-foreground transition-colors">
              Nilai {sortBy === "value" ? (sortDir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />) : null}
            </button>
            <button onClick={() => toggleSort("last")} className="flex items-center gap-1 hover:text-foreground transition-colors">
              Terakhir {sortBy === "last" ? (sortDir === "desc" ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />) : null}
            </button>
            <span>Aksi</span>
          </div>

          <ul className="divide-y divide-border">
            {displayed.map(c => {
              const cfg = SEG[c.segment];
              const isExpanded = expanded === c.phone;
              const waPhone = c.phone.replace(/\D/g, "").replace(/^0/, "62");
              const waUrl = `https://wa.me/${waPhone}?text=${buildWaMsg(c.name, shop?.name ?? "", c.segment)}`;
              const reviewRate = c.booking_count > 0 ? Math.round((c.review_count / c.booking_count) * 100) : 0;

              return (
                <li key={c.phone}>
                  <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center px-4 py-3 hover:bg-accent/40 transition-colors">
                    {/* Name + segment */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{c.name || "(Nama tidak ada)"}</p>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cfg.color} ${cfg.bg} ${cfg.border}`}>
                          <cfg.Icon className="h-2.5 w-2.5" />
                          {cfg.label}
                        </span>
                        {c.is_unresponsive && c.segment !== "tidak-responsif" && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] text-orange-600">
                            <BellOff className="h-2.5 w-2.5" /> Notif Diblok
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {c.phone !== "__unknown__" && (
                          <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {c.phone}
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {c.review_count} ulasan ({reviewRate}%)
                        </span>
                      </div>
                    </div>

                    {/* Booking count */}
                    <div className="text-center">
                      <p className="text-sm font-bold">{c.booking_count}×</p>
                      <p className="text-[10px] text-muted-foreground">booking</p>
                    </div>

                    {/* Total value */}
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatIDR(c.total_value)}</p>
                      <p className="text-[10px] text-muted-foreground">total</p>
                    </div>

                    {/* Last booking */}
                    <div className="text-right">
                      <p className="text-sm font-medium flex items-center gap-1 justify-end">
                        <CalendarDays className="h-3 w-3 text-muted-foreground" />
                        {fmtDays(c.days_since_last)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">booking terakhir</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      {(c.segment === "perlu-aktivasi" || c.segment === "churn-risk" || c.segment === "tidak-responsif") && c.phone !== "__unknown__" && (
                        <a href={waUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="outline" className="h-7 gap-1 px-2 text-[10px] border-green-300 text-green-700 hover:bg-green-50 whitespace-nowrap">
                            <MessageSquare className="h-3 w-3" />
                            WA
                          </Button>
                        </a>
                      )}
                      <button
                        onClick={() => setExpanded(e => e === c.phone ? null : c.phone)}
                        className="rounded-md p-1 text-muted-foreground hover:bg-muted transition-colors"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className={`px-4 pb-3 pt-0 ${cfg.bg} border-t ${cfg.border}`}>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                        {[
                          { label: "Total Booking",      value: `${c.booking_count}×` },
                          { label: "Nilai Total",        value: formatIDR(c.total_value) },
                          { label: "Ulasan Ditulis",     value: `${c.review_count} (${reviewRate}%)` },
                          { label: "Tidak Responsif",    value: c.is_unresponsive ? "Ya" : "Tidak" },
                        ].map(({ label, value }) => (
                          <div key={label} className="rounded-lg bg-white/60 border border-white px-3 py-2">
                            <p className={`text-[10px] ${cfg.color} opacity-70`}>{label}</p>
                            <p className={`text-sm font-bold mt-0.5 ${cfg.color}`}>{value}</p>
                          </div>
                        ))}
                      </div>
                      <div className={`mt-2.5 rounded-lg border px-3 py-2 flex items-start gap-2 bg-white/40 ${cfg.border}`}>
                        <AlertTriangle className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${cfg.color}`} />
                        <p className={`text-xs ${cfg.color} opacity-80`}>{cfg.tip}</p>
                      </div>
                      {c.phone !== "__unknown__" && (
                        <div className="mt-2.5 flex items-center gap-2">
                          <a href={waUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className={`h-8 gap-1.5 text-xs ${
                              c.segment === "setia" || c.segment === "baru"
                                ? "border-green-200 text-green-700 hover:bg-green-50"
                                : "border-green-300 text-green-700 hover:bg-green-50"
                            }`}>
                              <MessageSquare className="h-3.5 w-3.5" />
                              {c.segment === "perlu-aktivasi" ? "Kirim WA Reaktivasi" :
                               c.segment === "churn-risk"     ? "Kirim WA Win-back" :
                               c.segment === "tidak-responsif"? "Minta Ulasan via WA" :
                               "Kirim Pesan WA"}
                            </Button>
                          </a>
                          {c.segment === "setia" && (
                            <span className="text-xs text-emerald-600 flex items-center gap-1">
                              <BadgeCheck className="h-3.5 w-3.5" /> Pertimbangkan voucher apresiasi untuk pembeli setia ini.
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="border-t border-border bg-muted/20 px-4 py-2 text-[11px] text-muted-foreground">
            Menampilkan {displayed.length} dari {customers.length} pembeli unik.
            {segment !== "all" && ` Filter: ${SEG[segment as Segment].label}.`}
          </div>
        </div>
      )}
    </div>
  );
}
