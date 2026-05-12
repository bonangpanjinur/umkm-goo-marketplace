import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import {
  Bell, RefreshCw, Loader2, Play, Clock, CheckCircle2,
  Crown, Store, Calendar, Zap, Settings, History, Eye,
  AlertTriangle, SkipForward,
} from "lucide-react";

export const Route = createFileRoute("/admin/auto-renewal")({
  component: AdminAutoRenewalPage,
});

type PreviewShop = {
  id: string;
  name: string;
  slug: string;
  plan_expires_at: string;
  days_remaining: number;
};

type RunHistory = {
  id: string;
  ran_at: string;
  total_found: number;
  total_sent: number;
  total_skipped: number;
  triggered_by: string;
};

type RecentNotif = {
  id: string;
  shop_id: string;
  title: string;
  body: string;
  severity: string;
  created_at: string;
  shop: { name: string } | null;
};

const WINDOW_OPTIONS = [
  { days: 1,  label: "1 hari",  desc: "Hari H ekspiry — urgensi tertinggi",  color: "text-red-600" },
  { days: 3,  label: "3 hari",  desc: "3 hari sebelum expired",              color: "text-orange-500" },
  { days: 7,  label: "7 hari",  desc: "1 minggu sebelum expired (default)",  color: "text-amber-500" },
  { days: 14, label: "14 hari", desc: "2 minggu sebelum expired",            color: "text-blue-500" },
];

function getApiBase() {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      return "http://localhost:3001/api";
    }
    // Replit dev environment — use the API artifact URL
    return `${window.location.protocol}//${host.replace(/^[^.]+/, m => m.replace(/\d+$/, "3001"))}/api`;
  }
  return "/api";
}

export default function AdminAutoRenewalPage() {
  const [enabledWindows, setEnabledWindows] = useState<Set<number>>(new Set([7]));
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{
    total_found: number; total_sent: number; total_skipped: number; ran_at: string;
  } | null>(null);

  const [preview, setPreview] = useState<PreviewShop[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  const [history, setHistory] = useState<RunHistory[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  const [recentNotifs, setRecentNotifs] = useState<RecentNotif[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(false);

  // Load preview — which shops will be notified
  const loadPreview = useCallback(async () => {
    setPreviewLoading(true);
    const maxDays = Math.max(...Array.from(enabledWindows));
    try {
      const res = await fetch(`${getApiBase()}/cron/renewal-preview?days=${maxDays}`);
      const data = await res.json() as { shops: PreviewShop[]; error?: string };
      setPreview(data.shops ?? []);
    } catch {
      // Fallback: query Supabase directly
      const cutoff = new Date(Date.now() + maxDays * 86_400_000).toISOString();
      const { data } = await supabase
        .from("coffee_shops")
        .select("id, name, slug, plan_expires_at")
        .eq("plan", "pro")
        .gte("plan_expires_at", new Date().toISOString())
        .lte("plan_expires_at", cutoff)
        .order("plan_expires_at")
        .limit(100);
      setPreview((data ?? []).map((s: any) => ({
        ...s,
        days_remaining: Math.ceil((new Date(s.plan_expires_at).getTime() - Date.now()) / 86_400_000),
      })));
    }
    setPreviewLoading(false);
  }, [enabledWindows]);

  // Load run history
  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      const res = await fetch(`${getApiBase()}/cron/renewal-history`);
      const data = await res.json() as { runs: RunHistory[] };
      setHistory(data.runs ?? []);
    } catch {
      setHistory([]);
    }
    setHistLoading(false);
  }, []);

  // Load recent renewal notifications sent
  const loadRecentNotifs = useCallback(async () => {
    setNotifsLoading(true);
    const { data } = await (supabase as any)
      .from("owner_notifications")
      .select("id, shop_id, title, body, severity, created_at, shop:coffee_shops(name)")
      .eq("type", "renewal_reminder")
      .order("created_at", { ascending: false })
      .limit(20);
    setRecentNotifs(data ?? []);
    setNotifsLoading(false);
  }, []);

  useEffect(() => {
    loadPreview();
    loadHistory();
    loadRecentNotifs();
  }, [loadPreview, loadHistory, loadRecentNotifs]);

  const toggleWindow = (days: number) => {
    setEnabledWindows(prev => {
      const next = new Set(prev);
      if (next.has(days)) { if (next.size > 1) next.delete(days); }
      else next.add(days);
      return next;
    });
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const windows = Array.from(enabledWindows);
      const res = await fetch(`${getApiBase()}/cron/renewal-notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ day_windows: windows }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as {
        ok: boolean; total_found: number; total_sent: number; total_skipped: number; ran_at: string; error?: string;
      };
      if (!data.ok) throw new Error(data.error ?? "Gagal menjalankan job");

      setLastResult({ total_found: data.total_found, total_sent: data.total_sent, total_skipped: data.total_skipped, ran_at: data.ran_at });
      toast.success(`${data.total_sent} notifikasi terkirim${data.total_skipped > 0 ? `, ${data.total_skipped} dilewati (deduplikasi)` : ""}`);
      await Promise.all([loadHistory(), loadRecentNotifs()]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error tidak diketahui";
      toast.error(`Gagal: ${msg}`);
    } finally {
      setRunning(false);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const urgencyColor = (days: number) => {
    if (days <= 1) return "text-red-600 font-bold";
    if (days <= 3) return "text-orange-500 font-semibold";
    if (days <= 7) return "text-amber-500";
    return "text-muted-foreground";
  };

  const urgencyBadge = (days: number) => {
    if (days <= 1) return <Badge variant="destructive" className="text-[10px]">Hari ini</Badge>;
    if (days <= 3) return <Badge className="text-[10px] bg-orange-500">3 hari</Badge>;
    if (days <= 7) return <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-400">{days} hari</Badge>;
    return <Badge variant="secondary" className="text-[10px]">{days} hari</Badge>;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" /> Notifikasi Renewal Otomatis
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Sistem otomatis kirim pengingat perpanjangan paket Pro ke owner — setiap hari jam 09.00 WIB.
          </p>
        </div>
        <Button
          onClick={runNow}
          disabled={running}
          className="gap-2"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {running ? "Sedang berjalan…" : "Jalankan Sekarang"}
        </Button>
      </div>

      {/* Last result banner */}
      {lastResult && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
              Job selesai — {new Date(lastResult.ran_at).toLocaleTimeString("id-ID")}
            </p>
            <p className="text-xs text-emerald-700 dark:text-emerald-400">
              {lastResult.total_found} toko ditemukan · {lastResult.total_sent} notifikasi dikirim · {lastResult.total_skipped} dilewati (sudah dikirim hari ini)
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Config */}
        <div className="space-y-4">
          {/* Toggle auto */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Settings className="h-4 w-4" /> Konfigurasi Scheduler
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Jalankan Otomatis Harian</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Setiap hari jam 09.00 WIB</p>
              </div>
              <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} />
            </div>

            {autoEnabled && (
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                <Zap className="h-3.5 w-3.5" />
                Scheduler aktif — berjalan setiap 10 menit untuk memeriksa jadwal
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              Deduplication aktif — tidak akan kirim ulang pada hari yang sama
            </div>
          </Card>

          {/* Window selector */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Calendar className="h-4 w-4" /> Jendela Notifikasi
            </div>
            <p className="text-xs text-muted-foreground">
              Pilih berapa hari sebelum expired untuk mengirim reminder. Bisa pilih lebih dari satu.
            </p>
            <div className="space-y-2">
              {WINDOW_OPTIONS.map(opt => (
                <button
                  key={opt.days}
                  onClick={() => toggleWindow(opt.days)}
                  className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    enabledWindows.has(opt.days)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                    enabledWindows.has(opt.days) ? "border-primary bg-primary" : "border-muted-foreground/40"
                  }`}>
                    {enabledWindows.has(opt.days) && (
                      <CheckCircle2 className="h-3 w-3 text-primary-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${opt.color}`}>{opt.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{opt.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* How it works */}
          <Card className="p-4 space-y-3">
            <div className="text-sm font-semibold flex items-center gap-2">
              <Eye className="h-4 w-4" /> Cara Kerja
            </div>
            <ol className="space-y-2 text-xs text-muted-foreground list-none">
              {[
                "Scheduler berjalan setiap 10 menit, cek jam 09.00 WIB",
                "Query toko Pro yang expire sesuai window yang dipilih",
                "Kirim notifikasi ke `owner_notifications` (masuk ke inbox owner)",
                "Dedupe key mencegah duplikat pada hari yang sama",
                "Log disimpan di `renewal_notification_runs`",
              ].map((s, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-0.5 h-4 w-4 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">{i+1}</span>
                  {s}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* Center + Right: Preview + History */}
        <div className="lg:col-span-2 space-y-4">
          {/* Preview */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Eye className="h-4 w-4" />
                Preview — Toko yang Akan Dinotifikasi
                {!previewLoading && (
                  <Badge variant="secondary" className="text-xs">{preview.length} toko</Badge>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={loadPreview} disabled={previewLoading} className="h-7">
                <RefreshCw className={`h-3.5 w-3.5 ${previewLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {previewLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : preview.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Crown className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Tidak ada toko Pro yang akan expired dalam periode yang dipilih</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Toko</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Expired Pada</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Sisa</th>
                      <th className="px-4 py-2.5 text-center text-xs font-medium text-muted-foreground">Window</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {preview.map(s => (
                      <tr key={s.id} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <Store className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <div>
                              <p className="font-medium text-sm leading-tight">{s.name}</p>
                              <p className="text-xs text-muted-foreground">/{s.slug}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-muted-foreground text-xs">
                          {new Date(s.plan_expires_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className={`px-4 py-2.5 text-center text-sm ${urgencyColor(s.days_remaining)}`}>
                          {s.days_remaining} hari
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {urgencyBadge(s.days_remaining)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Run History */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <History className="h-4 w-4" /> Riwayat Eksekusi
              </div>
              <Button variant="ghost" size="sm" onClick={loadHistory} disabled={histLoading} className="h-7">
                <RefreshCw className={`h-3.5 w-3.5 ${histLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {histLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : history.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <AlertTriangle className="h-6 w-6 mx-auto mb-2 opacity-30" />
                Belum ada riwayat eksekusi. Tabel `renewal_notification_runs` mungkin belum dibuat.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Waktu</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Ditemukan</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-emerald-600">Terkirim</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">Dilewati</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-muted-foreground">Dipicu oleh</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {history.map(r => (
                      <tr key={r.id} className="hover:bg-muted/20">
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{fmt(r.ran_at)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums">{r.total_found}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-600">{r.total_sent}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{r.total_skipped}</td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge variant={r.triggered_by === "auto" ? "secondary" : "outline"} className="text-[10px]">
                            {r.triggered_by === "auto" ? "Otomatis" : "Manual"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Recent notifications sent */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Bell className="h-4 w-4" /> 20 Notifikasi Renewal Terakhir Terkirim
              </div>
              <Button variant="ghost" size="sm" onClick={loadRecentNotifs} disabled={notifsLoading} className="h-7">
                <RefreshCw className={`h-3.5 w-3.5 ${notifsLoading ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {notifsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : recentNotifs.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Belum ada notifikasi renewal yang pernah dikirim
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {recentNotifs.map(n => (
                  <div key={n.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20">
                    <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${
                      n.severity === "error" ? "bg-red-500" :
                      n.severity === "warning" ? "bg-amber-500" : "bg-blue-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground">
                          → <span className="font-medium">{(n.shop as any)?.name ?? n.shop_id.slice(0,8)}</span>
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.body}</p>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                      {new Date(n.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* SQL migration hint */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 px-4 py-3 text-sm">
        <p className="font-semibold text-blue-800 dark:text-blue-300 mb-1">SQL yang diperlukan (sekali jalan di Supabase SQL Editor):</p>
        <pre className="text-xs text-blue-700 dark:text-blue-400 overflow-x-auto whitespace-pre-wrap">{`CREATE TABLE IF NOT EXISTS renewal_notification_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  total_found int NOT NULL DEFAULT 0,
  total_sent int NOT NULL DEFAULT 0,
  total_skipped int NOT NULL DEFAULT 0,
  triggered_by text NOT NULL DEFAULT 'auto'
);`}</pre>
      </div>
    </div>
  );
}
