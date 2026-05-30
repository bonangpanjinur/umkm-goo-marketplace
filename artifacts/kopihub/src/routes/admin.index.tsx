import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Store, Crown, FileText, Coins, ArrowRight, AlertTriangle, Globe,
  BadgeCheck, Banknote, ShoppingCart, TrendingUp, UserX, Clock,
  RefreshCw, Activity, KeyRound, Database, Users,
} from "lucide-react";
import { formatIDR } from "@/lib/format";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type DayStat = { label: string; Pendapatan: number; Pesanan: number };

function AdminDashboard() {
  const [stats, setStats] = useState({
    shops: 0,
    pro: 0,
    pendingInvoices: 0,
    mrr: 0,
    expiringSoon: 0,
    domainOffline: 0,
    kycPending: 0,
    withdrawalPending: 0,
    ordersToday: 0,
    gmvToday: 0,
    newShopsWeek: 0,
    suspended: 0,
    escrowHeld: 0,
    activeDisputes: 0,
    webhookFailures: 0,
    totalEscrowHeldIDR: 0,
  });
  const [trend, setTrend] = useState<DayStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const load = async () => {
    setLoading(true);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const weekStart  = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const sevenDays  = new Date(Date.now() + 7 * 86_400_000).toISOString();
    const now        = new Date().toISOString();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayISO   = todayStart.toISOString();

    const [
      { count: shops },
      { count: pro },
      { count: pendingInvoices },
      { data: paidThisMonth },
      { count: expiringSoon },
      { count: domainOffline },
      { count: kycPending },
      { count: withdrawalPending },
      { data: todayOrders },
      { count: newShopsWeek },
      { count: suspended },
    ] = await Promise.all([
      supabase.from("shops").select("id", { count: "exact", head: true }),
      supabase.from("shops").select("id", { count: "exact", head: true }).eq("plan", "pro"),
      supabase.from("plan_invoices").select("id", { count: "exact", head: true }).eq("status", "awaiting_review"),
      supabase.from("plan_invoices").select("amount_idr").eq("status", "paid").gte("paid_at", monthStart.toISOString()),
      supabase.from("shops").select("id", { count: "exact", head: true }).eq("plan", "pro").gte("plan_expires_at", now).lte("plan_expires_at", sevenDays),
      supabase.from("shops").select("id", { count: "exact", head: true }).not("custom_domain", "is", null).is("custom_domain_verified_at", null),
      (supabase as any).from("shops").select("id", { count: "exact", head: true }).eq("kyc_status", "pending"),
      supabase.from("withdrawal_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("orders").select("id, total").gte("created_at", todayISO).eq("status", "completed"),
      supabase.from("shops").select("id", { count: "exact", head: true }).gte("created_at", weekStart),
      supabase.from("shops").select("id", { count: "exact", head: true }).not("suspended_at", "is", null),
    ]);

    const mrr = (paidThisMonth ?? []).reduce((s: number, r: { amount_idr: number }) => s + Number(r.amount_idr), 0);
    const gmvToday = (todayOrders ?? []).reduce((s: number, r: { total: number }) => s + Number(r.total), 0);

    // Marketplace KPIs
    const [
      { data: escrowData },
      { count: activeDisputes },
      { count: webhookFailures },
    ] = await Promise.all([
      supabase.from("orders").select("net_to_shop").eq("escrow_status", "held"),
      (supabase as any).from("disputes").select("id", { count: "exact", head: true }).in("status", ["open", "under_review"]),
      (supabase as any).from("webhook_logs").select("id", { count: "exact", head: true }).neq("status", "processed").gte("created_at", new Date(Date.now() - 86_400_000).toISOString()),
    ]);
    const totalEscrowHeldIDR = (escrowData ?? []).reduce((s: number, r: any) => s + Number(r.net_to_shop ?? 0), 0);
    const escrowHeld = (escrowData ?? []).length;

    setStats({
      shops:              shops ?? 0,
      pro:                pro ?? 0,
      pendingInvoices:    pendingInvoices ?? 0,
      mrr,
      expiringSoon:       expiringSoon ?? 0,
      domainOffline:      domainOffline ?? 0,
      kycPending:         kycPending ?? 0,
      withdrawalPending:  withdrawalPending ?? 0,
      ordersToday:        (todayOrders ?? []).length,
      gmvToday,
      newShopsWeek:       newShopsWeek ?? 0,
      suspended:          suspended ?? 0,
      escrowHeld,
      activeDisputes:     activeDisputes ?? 0,
      webhookFailures:    webhookFailures ?? 0,
      totalEscrowHeldIDR,
    });

    // Build 14-day revenue trend from paid invoices
    const days14 = Array.from({ length: 14 }, (_, i) => {
      const d = new Date(Date.now() - (13 - i) * 86_400_000);
      return { iso: d.toISOString().slice(0, 10), label: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) };
    });
    const { data: revenueData } = await supabase
      .from("plan_invoices")
      .select("amount_idr, paid_at")
      .eq("status", "paid")
      .gte("paid_at", new Date(Date.now() - 14 * 86_400_000).toISOString());
    const { data: ordersData } = await supabase
      .from("orders")
      .select("created_at")
      .eq("status", "completed")
      .gte("created_at", new Date(Date.now() - 14 * 86_400_000).toISOString());

    const revenueMap: Record<string, number> = {};
    const ordersMap:  Record<string, number> = {};
    (revenueData ?? []).forEach((r: any) => {
      const d = r.paid_at.slice(0, 10);
      revenueMap[d] = (revenueMap[d] ?? 0) + Number(r.amount_idr);
    });
    (ordersData ?? []).forEach((r: any) => {
      const d = r.created_at.slice(0, 10);
      ordersMap[d] = (ordersMap[d] ?? 0) + 1;
    });

    setTrend(days14.map(d => ({
      label:      d.label,
      Pendapatan: revenueMap[d.iso] ?? 0,
      Pesanan:    ordersMap[d.iso]  ?? 0,
    })));

    setLoading(false);
    setLastRefresh(new Date());
  };

  useEffect(() => { load(); }, []);

  const urgent = stats.pendingInvoices + stats.kycPending + stats.withdrawalPending + stats.domainOffline + stats.suspended;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Terakhir diperbarui: {lastRefresh.toLocaleTimeString("id-ID")}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* Alert bar */}
      {urgent > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 text-sm">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="text-amber-800 dark:text-amber-300 font-medium">
            Ada {urgent} item memerlukan perhatian:
            {stats.pendingInvoices > 0 && <> {stats.pendingInvoices} tagihan,</>}
            {stats.kycPending > 0 && <> {stats.kycPending} KYC,</>}
            {stats.withdrawalPending > 0 && <> {stats.withdrawalPending} penarikan,</>}
            {stats.domainOffline > 0 && <> {stats.domainOffline} domain,</>}
            {stats.suspended > 0 && <> {stats.suspended} toko suspend</>}
          </span>
        </div>
      )}

      {/* KPI row 1 — Business */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Bisnis</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={Store}    label="Total Toko"          value={String(stats.shops)}           sub={`+${stats.newShopsWeek} minggu ini`} />
          <Kpi icon={Crown}    label="Toko Pro Aktif"      value={String(stats.pro)}             link="/admin/shops" sub={`${stats.shops > 0 ? Math.round((stats.pro / stats.shops) * 100) : 0}% dari total`} />
          <Kpi icon={Coins}    label="Pendapatan Bln Ini"  value={formatIDR(stats.mrr)}          sub="dari invoice terbayar" />
          <Kpi icon={TrendingUp} label="GMV Hari Ini"      value={formatIDR(stats.gmvToday)}     sub={`${stats.ordersToday} pesanan selesai`} />
        </div>
      </div>

      {/* KPI row 2 — Action needed */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Perlu Tindakan</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={FileText}   label="Tagihan Pending"       value={String(stats.pendingInvoices)}   link="/admin/invoices"    tone={stats.pendingInvoices > 0 ? "warn" : undefined} />
          <Kpi icon={BadgeCheck} label="KYC Menunggu Review"   value={String(stats.kycPending)}        link="/admin/kyc"         tone={stats.kycPending > 0 ? "warn" : undefined} />
          <Kpi icon={Banknote}   label="Penarikan Pending"     value={String(stats.withdrawalPending)} link="/admin/withdrawals"  tone={stats.withdrawalPending > 0 ? "warn" : undefined} />
          <Kpi icon={AlertTriangle} label="Pro Akan Habis (7h)" value={String(stats.expiringSoon)}     link="/admin/shops"        tone={stats.expiringSoon > 0 ? "warn" : undefined} />
        </div>
      </div>

      {/* KPI row 3 — Health */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Kesehatan Platform</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={Globe}      label="Domain Offline"     value={String(stats.domainOffline)} link="/admin/domains"   tone={stats.domainOffline > 0 ? "bad" : undefined} />
          <Kpi icon={UserX}      label="Toko Suspend"       value={String(stats.suspended)}     link="/admin/shops"     tone={stats.suspended > 0 ? "bad" : undefined} />
          <Kpi icon={ShoppingCart} label="Pesanan Selesai Hari Ini" value={String(stats.ordersToday)} />
          <Kpi icon={Activity}   label="Toko Baru (7 hari)" value={String(stats.newShopsWeek)} />
        </div>
      </div>

      {/* KPI row 4 — Marketplace */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Marketplace & Escrow</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi icon={Coins}        label="Dana Escrow Ditahan"   value={formatIDR(stats.totalEscrowHeldIDR)} sub={`${stats.escrowHeld} pesanan menunggu rilis`} />
          <Kpi icon={AlertTriangle} label="Sengketa Aktif"       value={String(stats.activeDisputes)}        link="/admin/disputes"  tone={stats.activeDisputes > 0 ? "warn" : undefined} />
          <Kpi icon={Activity}     label="Webhook Gagal (24j)"   value={String(stats.webhookFailures)}       tone={stats.webhookFailures > 0 ? "bad" : undefined} sub="dari tabel webhook_logs" />
          <Kpi icon={TrendingUp}   label="GMV Hari Ini"          value={formatIDR(stats.gmvToday)}          sub={`${stats.ordersToday} pesanan selesai`} />
        </div>
      </div>

      {/* 14-day trend chart */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">Tren 14 Hari Terakhir</h2>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-primary inline-block" /> Pendapatan (Rp)</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sky-400 inline-block" /> Pesanan Selesai</span>
          </div>
        </div>
        {trend.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trend} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} />
              <YAxis yAxisId="left" tickFormatter={v => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}jt` : v >= 1_000 ? `${(v / 1_000).toFixed(0)}rb` : String(v)} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(val: number, name: string) => name === "Pendapatan" ? formatIDR(val) : val}
                labelStyle={{ fontWeight: 600 }}
                contentStyle={{ border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
              />
              <Bar yAxisId="left"  dataKey="Pendapatan" fill="var(--primary)" radius={[3, 3, 0, 0]} />
              <Bar yAxisId="right" dataKey="Pesanan"    fill="#38bdf8"        radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">{loading ? "Memuat data…" : "Belum ada data."}</div>
        )}
      </div>

      {/* Quick links */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Akses Cepat</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: "/admin/kyc",         label: "Review KYC",            icon: BadgeCheck,  badge: stats.kycPending },
            { to: "/admin/withdrawals", label: "Proses Penarikan",       icon: Banknote,    badge: stats.withdrawalPending },
            { to: "/admin/invoices",    label: "Tagihan Masuk",          icon: FileText,    badge: stats.pendingInvoices },
            { to: "/admin/analytics",   label: "Analitik Marketplace",   icon: TrendingUp,  badge: 0 },
            { to: "/admin/broadcast",   label: "Broadcast ke Owner",     icon: Activity,    badge: 0 },
            { to: "/admin/shops",       label: "Kelola Toko",            icon: Store,       badge: stats.suspended, badgeTone: "bad" as const },
            { to: "/admin/audit",        label: "Audit Log",              icon: Clock,       badge: 0 },
            { to: "/admin/settings",    label: "Pengaturan Platform",    icon: Globe,       badge: 0 },
            { to: "/admin/users",       label: "Manajemen Pengguna",     icon: Users,       badge: 0 },
            { to: "/admin/credentials", label: "Kredensial & API Keys",  icon: KeyRound,    badge: 0 },
            { to: "/admin/migrations",  label: "Database Migrations",    icon: Database,    badge: 0 },
          ].map(item => (
            <Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium hover:border-primary/40 hover:bg-muted/30 transition-colors">
              <item.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge > 0 && (
                <Badge variant={item.badgeTone === "bad" ? "destructive" : "default"} className="text-xs h-5 min-w-5 px-1.5">{item.badge}</Badge>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function Kpi({
  icon: Icon, label, value, link, tone, sub,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  link?: string;
  tone?: "warn" | "bad";
  sub?: string;
}) {
  const toneCls = tone === "warn" ? "border-amber-500/30 bg-amber-500/5"
    : tone === "bad"  ? "border-red-500/30 bg-red-500/5"
    : "";
  const inner = (
    <Card className={`p-4 ${toneCls}`}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Icon className="h-3.5 w-3.5 shrink-0" /> {label}</div>
      <div className="mt-1.5 flex items-end justify-between gap-2">
        <span className="text-xl font-bold tabular-nums leading-tight">{value}</span>
        {link && <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      </div>
      {sub && <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{sub}</p>}
    </Card>
  );
  return link ? <Link to={link}>{inner}</Link> : inner;
}
