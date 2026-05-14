import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/use-shop";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";
import {
  Loader2, BarChart2, TrendingDown, TrendingUp,
  CalendarCheck, Banknote, XCircle, CheckCircle2, RefreshCw, Download,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, LineChart, Line, PieChart, Pie, Cell, Sector,
} from "recharts";

export const Route = createFileRoute("/pos-app/booking-analytics")({
  head: () => ({ meta: [{ title: "Analitik Booking — Merchant" }] }),
  component: BookingAnalyticsPage,
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("id-ID", {
    day: "numeric", month: "short",
  });
}

function formatHour(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

// ── Types ────────────────────────────────────────────────────────────────────

type RawBooking = {
  id: string;
  status: string;
  deposit_required: boolean;
  deposit_amount: number;
  deposit_status: string | null;
  created_at: string;
  booking_slots: {
    slot_date: string;
    slot_time: string;
    service_name: string;
    price: number;
  } | null;
};

type KPIs = {
  total: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  pending: number;
  depositRevenue: number;
  cancellationRate: number;
  completionRate: number;
};

// ── Chart colour palette ──────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  confirmed: "#10b981",
  completed: "#3b82f6",
  cancelled: "#f43f5e",
  pending: "#f59e0b",
};

const PIE_COLORS = ["#10b981", "#3b82f6", "#f43f5e", "#f59e0b"];
const HOUR_COLOR = "#6366f1";
const DEPOSIT_COLOR = "#0ea5e9";
const TREND_COLOR = "#8b5cf6";
const SERVICE_COLOR = "#f97316";

// ── Custom tooltip ───────────────────────────────────────────────────────────

function CurrencyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.name.toLowerCase().includes("pendapatan") || p.name.toLowerCase().includes("deposit")
            ? formatIDR(p.value)
            : p.value}
        </p>
      ))}
    </div>
  );
}

// ── Active pie sector ─────────────────────────────────────────────────────────

function renderActiveShape(props: any) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props;
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" fill={fill} className="text-sm font-bold" fontSize={14}>
        {payload.name}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fill="#6b7280" fontSize={12}>
        {value} booking
      </text>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} />
    </g>
  );
}

// ── CSV Export ───────────────────────────────────────────────────────────────

function exportBookingsCSV(bookings: RawBooking[], from: string, to: string) {
  const headers = [
    "ID",
    "Status",
    "Nama Layanan",
    "Tanggal Slot",
    "Jam Slot",
    "Harga",
    "DP Wajib",
    "Jumlah DP",
    "Status DP",
    "Dibuat",
  ];
  const rows = bookings.map(b => [
    b.id,
    b.status,
    b.booking_slots?.service_name ?? "",
    b.booking_slots?.slot_date ?? "",
    b.booking_slots?.slot_time ?? "",
    b.booking_slots?.price ?? 0,
    b.deposit_required ? "Ya" : "Tidak",
    b.deposit_amount ?? 0,
    b.deposit_status ?? "",
    b.created_at.slice(0, 19).replace("T", " "),
  ]);
  const csvContent = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `analitik-booking_${from}_${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main page ────────────────────────────────────────────────────────────────

function BookingAnalyticsPage() {
  const { shop } = useShop();
  const [from, setFrom] = useState(todayISO(-29));
  const [to, setTo] = useState(todayISO());
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<RawBooking[]>([]);
  const [activeStatusIdx, setActiveStatusIdx] = useState(0);

  const load = async () => {
    if (!shop?.id) return;
    setLoading(true);
    try {
      const fromTs = new Date(from + "T00:00:00").toISOString();
      const toTs   = new Date(to + "T23:59:59").toISOString();

      const { data, error } = await (supabase as any)
        .from("bookings")
        .select(`
          id, status, deposit_required, deposit_amount, deposit_status, created_at,
          booking_slots!inner(slot_date, slot_time, service_name, price)
        `)
        .eq("booking_slots.shop_id", shop.id)
        .gte("created_at", fromTs)
        .lte("created_at", toTs)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setBookings((data ?? []) as RawBooking[]);
    } catch (e: any) {
      toast.error(e.message ?? "Gagal memuat analitik booking");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [shop?.id]);

  // ── KPIs ───────────────────────────────────────────────────────────────────

  const kpis = useMemo<KPIs>(() => {
    const total     = bookings.length;
    const confirmed = bookings.filter(b => b.status === "confirmed").length;
    const cancelled = bookings.filter(b => b.status === "cancelled").length;
    const completed = bookings.filter(b => b.status === "completed" || b.status === "done").length;
    const pending   = bookings.filter(b => b.status === "pending").length;
    const depositRevenue = bookings.reduce((sum, b) => {
      if (b.deposit_status === "paid" || b.deposit_status === "verified") {
        return sum + (Number(b.deposit_amount) || 0);
      }
      return sum;
    }, 0);
    return {
      total, confirmed, cancelled, completed, pending, depositRevenue,
      cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
      completionRate:   total > 0 ? Math.round((completed / total) * 100) : 0,
    };
  }, [bookings]);

  // ── Daily deposit revenue chart ─────────────────────────────────────────────

  const depositByDay = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach(b => {
      if (b.deposit_status !== "paid" && b.deposit_status !== "verified") return;
      const day = b.created_at.slice(0, 10);
      map[day] = (map[day] || 0) + (Number(b.deposit_amount) || 0);
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, amt]) => ({ day: formatDate(day), "Deposit Terkumpul": amt }));
  }, [bookings]);

  // ── Booking trend (total per day) ───────────────────────────────────────────

  const trendByDay = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach(b => {
      const day = b.created_at.slice(0, 10);
      map[day] = (map[day] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, count]) => ({ day: formatDate(day), "Jumlah Booking": count }));
  }, [bookings]);

  // ── Status breakdown (pie) ──────────────────────────────────────────────────

  const statusPie = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach(b => {
      const s = b.status === "done" ? "completed" : b.status;
      map[s] = (map[s] || 0) + 1;
    });
    const labels: Record<string, string> = {
      confirmed: "Dikonfirmasi",
      completed: "Selesai",
      cancelled: "Dibatalkan",
      pending:   "Menunggu",
    };
    return Object.entries(map).map(([key, value]) => ({
      name: labels[key] ?? key,
      value,
      fill: STATUS_COLORS[key] ?? "#94a3b8",
    }));
  }, [bookings]);

  // ── Popular time slots (by hour) ────────────────────────────────────────────

  const hourBuckets = useMemo(() => {
    const map: Record<number, number> = {};
    bookings.forEach(b => {
      const time = b.booking_slots?.slot_time;
      if (!time) return;
      const hour = parseInt(time.split(":")[0], 10);
      map[hour] = (map[hour] || 0) + 1;
    });
    return Array.from({ length: 24 }, (_, h) => ({
      jam: formatHour(h),
      "Jumlah Booking": map[h] || 0,
    })).filter(r => r["Jumlah Booking"] > 0);
  }, [bookings]);

  // ── Popular services ─────────────────────────────────────────────────────────

  const serviceRanking = useMemo(() => {
    const map: Record<string, number> = {};
    bookings.forEach(b => {
      const svc = b.booking_slots?.service_name;
      if (!svc) return;
      map[svc] = (map[svc] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ Layanan: name, "Jumlah Booking": count }));
  }, [bookings]);

  // ── Cancellation rate by day ────────────────────────────────────────────────

  const cancelTrend = useMemo(() => {
    const map: Record<string, { total: number; cancelled: number }> = {};
    bookings.forEach(b => {
      const day = b.created_at.slice(0, 10);
      if (!map[day]) map[day] = { total: 0, cancelled: 0 };
      map[day].total++;
      if (b.status === "cancelled") map[day].cancelled++;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, { total, cancelled }]) => ({
        day: formatDate(day),
        "Tingkat Pembatalan (%)": total > 0 ? Math.round((cancelled / total) * 100) : 0,
      }));
  }, [bookings]);

  // ─────────────────────────────────────────────────────────────────────────────

  const isEmpty = !loading && bookings.length === 0;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Analitik Booking</h1>
            <p className="text-xs text-muted-foreground">
              Pantau performa booking: pendapatan deposit, tingkat pembatalan, dan jam favorit pelanggan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportBookingsCSV(bookings, from, to)}
            disabled={bookings.length === 0}
          >
            <Download className="h-4 w-4 mr-1.5" />
            Ekspor CSV
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Date filter ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 pt-5 pb-4">
          <div className="space-y-1.5">
            <Label htmlFor="ba-from">Dari</Label>
            <Input id="ba-from" type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-40" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ba-to">Sampai</Label>
            <Input id="ba-to" type="date" value={to} onChange={e => setTo(e.target.value)} className="w-40" />
          </div>
          <Button onClick={load} disabled={loading} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tampilkan"}
          </Button>
          <div className="flex gap-1.5 ml-auto">
            {([7, 30, 90] as const).map(n => (
              <button
                key={n}
                onClick={() => { setFrom(todayISO(-(n - 1))); setTo(todayISO()); setTimeout(load, 0); }}
                className="text-xs px-2.5 py-1 rounded-md border border-border hover:bg-muted transition-colors"
              >
                {n}h
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── KPI cards ───────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <KPICard
              icon={<CalendarCheck className="h-4 w-4 text-violet-600" />}
              label="Total Booking"
              value={kpis.total.toString()}
              sub={`${kpis.confirmed} dikonfirmasi`}
              accent="violet"
            />
            <KPICard
              icon={<Banknote className="h-4 w-4 text-sky-600" />}
              label="Pendapatan Deposit"
              value={formatIDR(kpis.depositRevenue)}
              sub="DP terkumpul"
              accent="sky"
            />
            <KPICard
              icon={<XCircle className="h-4 w-4 text-rose-600" />}
              label="Tingkat Batal"
              value={`${kpis.cancellationRate}%`}
              sub={`${kpis.cancelled} booking dibatalkan`}
              accent="rose"
            />
            <KPICard
              icon={<CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              label="Tingkat Selesai"
              value={`${kpis.completionRate}%`}
              sub={`${kpis.completed} booking selesai`}
              accent="emerald"
            />
          </div>

          {isEmpty ? (
            <EmptyState from={from} to={to} />
          ) : (
            <div className="space-y-5">

              {/* ── Row 1: Deposit revenue + Trend ─────────────── */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <ChartCard
                  title="Pendapatan Deposit per Hari"
                  subtitle="Jumlah DP yang berhasil dikumpulkan"
                  icon={<TrendingUp className="h-4 w-4 text-sky-600" />}
                  empty={depositByDay.length === 0}
                  emptyMsg="Belum ada DP yang dibayar dalam rentang ini"
                >
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={depositByDay} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip content={<CurrencyTooltip />} />
                      <Bar dataKey="Deposit Terkumpul" fill={DEPOSIT_COLOR} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title="Tren Booking Harian"
                  subtitle="Jumlah booking masuk per hari"
                  icon={<CalendarCheck className="h-4 w-4 text-violet-600" />}
                  empty={trendByDay.length === 0}
                  emptyMsg="Belum ada booking dalam rentang ini"
                >
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={trendByDay} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip content={<CurrencyTooltip />} />
                      <Line
                        type="monotone" dataKey="Jumlah Booking"
                        stroke={TREND_COLOR} strokeWidth={2}
                        dot={{ r: 3, fill: TREND_COLOR }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* ── Row 2: Status pie + Cancellation trend ──────── */}
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <ChartCard
                  title="Distribusi Status Booking"
                  subtitle="Proporsi status selama periode"
                  icon={<BarChart2 className="h-4 w-4 text-indigo-600" />}
                  empty={statusPie.length === 0}
                  emptyMsg="Belum ada data status"
                >
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={statusPie}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={85}
                        activeIndex={activeStatusIdx}
                        activeShape={renderActiveShape}
                        onMouseEnter={(_, index) => setActiveStatusIdx(index)}
                        dataKey="value"
                      >
                        {statusPie.map((entry, i) => (
                          <Cell key={i} fill={entry.fill ?? PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Legend
                        formatter={(value, entry: any) => (
                          <span className="text-xs text-foreground">{value} ({entry.payload.value})</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title="Tingkat Pembatalan per Hari"
                  subtitle="Persentase booking yang dibatalkan"
                  icon={<TrendingDown className="h-4 w-4 text-rose-600" />}
                  empty={cancelTrend.length === 0}
                  emptyMsg="Belum ada data pembatalan"
                >
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={cancelTrend} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                      <Tooltip content={<CurrencyTooltip />} />
                      <Bar dataKey="Tingkat Pembatalan (%)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              </div>

              {/* ── Row 3: Popular time slots ────────────────────── */}
              <ChartCard
                title="Jam Slot Terpopuler"
                subtitle="Distribusi booking berdasarkan jam mulai — temukan waktu tersibuk"
                icon={<CalendarCheck className="h-4 w-4 text-indigo-600" />}
                empty={hourBuckets.length === 0}
                emptyMsg="Belum ada data jam slot"
              >
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={hourBuckets} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="jam" tick={{ fontSize: 10 }} interval={0} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip content={<CurrencyTooltip />} />
                    <Bar dataKey="Jumlah Booking" fill={HOUR_COLOR} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* ── Row 4: Popular services ──────────────────────── */}
              {serviceRanking.length > 0 && (
                <ChartCard
                  title="Layanan Paling Diminati"
                  subtitle="Top 10 layanan berdasarkan jumlah booking"
                  icon={<TrendingUp className="h-4 w-4 text-orange-500" />}
                  empty={false}
                  emptyMsg=""
                >
                  <ResponsiveContainer width="100%" height={Math.max(200, serviceRanking.length * 36)}>
                    <BarChart
                      data={serviceRanking}
                      layout="vertical"
                      margin={{ top: 5, right: 20, bottom: 5, left: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <YAxis
                        type="category" dataKey="Layanan"
                        tick={{ fontSize: 11 }} width={140}
                        tickFormatter={v => v.length > 18 ? v.slice(0, 18) + "…" : v}
                      />
                      <Tooltip content={<CurrencyTooltip />} />
                      <Bar dataKey="Jumlah Booking" fill={SERVICE_COLOR} radius={[0, 4, 4, 0]} barSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

type Accent = "violet" | "sky" | "rose" | "emerald";
const ACCENT_MAP: Record<Accent, { bg: string; border: string; text: string }> = {
  violet:  { bg: "bg-violet-50 dark:bg-violet-950/20",  border: "border-violet-200/70", text: "text-violet-700" },
  sky:     { bg: "bg-sky-50 dark:bg-sky-950/20",        border: "border-sky-200/70",    text: "text-sky-700" },
  rose:    { bg: "bg-rose-50 dark:bg-rose-950/20",      border: "border-rose-200/70",   text: "text-rose-700" },
  emerald: { bg: "bg-emerald-50 dark:bg-emerald-950/20",border: "border-emerald-200/70",text: "text-emerald-700" },
};

function KPICard({
  icon, label, value, sub, accent,
}: {
  icon: React.ReactNode; label: string; value: string; sub: string; accent: Accent;
}) {
  const cls = ACCENT_MAP[accent];
  return (
    <div className={`rounded-xl border p-4 ${cls.bg} ${cls.border}`}>
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${cls.text}`}>{value}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}

function ChartCard({
  title, subtitle, icon, children, empty, emptyMsg,
}: {
  title: string; subtitle: string; icon: React.ReactNode;
  children: React.ReactNode; empty: boolean; emptyMsg: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          {icon} {title}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="flex items-center justify-center h-[140px] text-sm text-muted-foreground">
            {emptyMsg}
          </div>
        ) : children}
      </CardContent>
    </Card>
  );
}

function EmptyState({ from, to }: { from: string; to: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center gap-3">
      <BarChart2 className="h-10 w-10 text-muted-foreground/40" />
      <div>
        <p className="font-medium text-muted-foreground">Belum ada booking</p>
        <p className="text-sm text-muted-foreground/70 mt-1">
          Tidak ada data booking dari {from} hingga {to}.<br />
          Coba perluas rentang tanggal atau pastikan toko sudah menerima booking.
        </p>
      </div>
    </div>
  );
}
