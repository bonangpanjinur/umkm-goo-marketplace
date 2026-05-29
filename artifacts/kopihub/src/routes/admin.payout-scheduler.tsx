import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import {
  Zap, Loader2, RefreshCw, Save, Banknote, Clock, CheckCircle2,
  AlertTriangle, Play, Pause, TrendingUp, Calendar,
} from "lucide-react";

export const Route = createFileRoute("/admin/payout-scheduler")({
  head: () => ({ meta: [{ title: "Jadwal Pembayaran — Admin" }] }),
  component: PayoutSchedulerPage,
});

type SchedulerConfig = {
  enabled: boolean;
  schedule: "daily" | "weekly" | "monthly";
  day_of_week: number;
  day_of_month: number;
  hour: number;
  min_amount: number;
  auto_approve_below: number;
  notify_merchant: boolean;
};

type PendingPayout = {
  shop_id: string;
  shop_name: string;
  balance: number;
  last_payout: string | null;
  eligible: boolean;
};

const DEFAULT_CONFIG: SchedulerConfig = {
  enabled: false,
  schedule: "weekly",
  day_of_week: 1,
  day_of_month: 1,
  hour: 9,
  min_amount: 50000,
  auto_approve_below: 500000,
  notify_merchant: true,
};

const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function PayoutSchedulerPage() {
  const [config, setConfig] = useState<SchedulerConfig>(DEFAULT_CONFIG);
  const [pending, setPending] = useState<PendingPayout[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [totalEligible, setTotalEligible] = useState(0);

  const loadPending = async () => {
    setLoading(true);
    try {
      const { data: shops } = await (supabase as any)
        .from("shops")
        .select("id, name")
        .eq("is_active", true)
        .limit(100);

      if (!shops) { setLoading(false); return; }

      const { data: balances } = await (supabase as any)
        .from("wallet_balances" as any)
        .select("shop_id, available_balance, last_payout_at")
        .in("shop_id", shops.map((s: { id: string }) => s.id));

      const rows: PendingPayout[] = shops.map((s: { id: string; name: string }) => {
        const bal = (balances ?? []).find((b: { shop_id: string }) => b.shop_id === s.id);
        const amount = Number(bal?.available_balance ?? 0);
        return {
          shop_id: s.id,
          shop_name: s.name,
          balance: amount,
          last_payout: bal?.last_payout_at ?? null,
          eligible: amount >= config.min_amount,
        };
      });

      setPending(rows.filter(r => r.balance > 0));
      setTotalEligible(rows.filter(r => r.eligible).reduce((s, r) => s + r.balance, 0));
    } catch {
      toast.error("Gagal memuat data saldo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
    const saved = localStorage.getItem("payout_scheduler_config");
    if (saved) {
      try { setConfig(JSON.parse(saved)); } catch { /* ignore */ }
    }
    const last = localStorage.getItem("payout_scheduler_last_run");
    if (last) setLastRun(last);
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    localStorage.setItem("payout_scheduler_config", JSON.stringify(config));
    await new Promise(r => setTimeout(r, 600));
    toast.success("Konfigurasi scheduler disimpan");
    setSaving(false);
  };

  const runNow = async () => {
    if (!config.enabled) { toast.error("Aktifkan scheduler dulu"); return; }
    setRunning(true);
    try {
      const eligible = pending.filter(p => p.eligible);
      let processed = 0;
      for (const shop of eligible) {
        if (shop.balance <= config.auto_approve_below) {
          await (supabase as any)
            .from("withdrawal_requests" as any)
            .insert({
              shop_id: shop.shop_id,
              amount: shop.balance,
              admin_fee: Math.round(shop.balance * 0.01),
              net_amount: Math.round(shop.balance * 0.99),
              bank_name: "Auto-Payout",
              bank_account_no: "AUTO",
              bank_account_name: shop.shop_name,
              status: "approved",
              notes: `Auto-payout terjadwal — ${new Date().toLocaleDateString("id-ID")}`,
            });
          processed++;
        }
      }
      const now = new Date().toISOString();
      localStorage.setItem("payout_scheduler_last_run", now);
      setLastRun(now);
      toast.success(`Payout otomatis selesai: ${processed} toko diproses`);
      loadPending();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setRunning(false);
    }
  };

  const upd = <K extends keyof SchedulerConfig>(k: K, v: SchedulerConfig[K]) =>
    setConfig(c => ({ ...c, [k]: v }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Zap className="h-5 w-5 text-primary" />
            Automated Payout Scheduler
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Payout otomatis terjadwal tanpa approval manual satu-satu.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadPending} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" onClick={runNow} disabled={running || !config.enabled} className="gap-1.5">
            {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
            Jalankan Sekarang
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{pending.filter(p => p.eligible).length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Toko Eligible</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-xl font-bold text-green-600">{formatIDR(totalEligible)}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Total Akan Dibayar</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-sm font-bold">{lastRun ? fmtDate(lastRun) : "—"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Terakhir Dijalankan</p>
        </div>
      </div>

      {/* Config */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Konfigurasi Jadwal
          </h2>
          <div className="flex items-center gap-2">
            <Switch checked={config.enabled} onCheckedChange={v => upd("enabled", v)} />
            <span className="text-sm font-medium">{config.enabled ? "Aktif" : "Nonaktif"}</span>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Frekuensi</Label>
            <Select value={config.schedule} onValueChange={v => upd("schedule", v as SchedulerConfig["schedule"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Harian</SelectItem>
                <SelectItem value="weekly">Mingguan</SelectItem>
                <SelectItem value="monthly">Bulanan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.schedule === "weekly" && (
            <div className="space-y-1.5">
              <Label>Hari dalam Minggu</Label>
              <Select value={String(config.day_of_week)} onValueChange={v => upd("day_of_week", Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DAY_NAMES.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {config.schedule === "monthly" && (
            <div className="space-y-1.5">
              <Label>Tanggal dalam Bulan</Label>
              <Input type="number" min={1} max={28} value={config.day_of_month}
                onChange={e => upd("day_of_month", Number(e.target.value))} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Jam Eksekusi (WIB)</Label>
            <Input type="number" min={0} max={23} value={config.hour}
              onChange={e => upd("hour", Number(e.target.value))} />
          </div>

          <div className="space-y-1.5">
            <Label>Minimum Saldo (Rp)</Label>
            <Input type="number" min={0} value={config.min_amount}
              onChange={e => upd("min_amount", Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Toko dengan saldo di bawah ini tidak akan diproses.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Auto-approve Jika ≤ (Rp)</Label>
            <Input type="number" min={0} value={config.auto_approve_below}
              onChange={e => upd("auto_approve_below", Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">Payout di atas nominal ini butuh review manual.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch checked={config.notify_merchant} onCheckedChange={v => upd("notify_merchant", v)} />
          <Label>Kirim notifikasi ke merchant setelah payout diproses</Label>
        </div>

        <Button onClick={saveConfig} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Konfigurasi
        </Button>
      </div>

      {/* Pending payouts */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Banknote className="h-4 w-4 text-primary" />
          Saldo Menunggu Payout
        </h2>
        {loading ? (
          <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : pending.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Tidak ada saldo yang menunggu payout.</p>
        ) : (
          <div className="divide-y divide-border">
            {pending.sort((a, b) => b.balance - a.balance).map(p => (
              <div key={p.shop_id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium">{p.shop_name}</p>
                  {p.last_payout && (
                    <p className="text-xs text-muted-foreground">Terakhir: {fmtDate(p.last_payout)}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className={`font-bold ${p.eligible ? "text-green-600" : "text-muted-foreground"}`}>
                    {formatIDR(p.balance)}
                  </p>
                  <Badge variant={p.eligible ? "default" : "secondary"} className="text-xs">
                    {p.eligible ? "Eligible" : "< Min"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
