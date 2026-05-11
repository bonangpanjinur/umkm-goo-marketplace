import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Clock,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Bell,
  Settings,
  Save,
  Ban,
} from "lucide-react";

export const Route = createFileRoute("/admin/auto-cancel")({ component: AdminAutoCancel });

type PendingOrder = {
  id: string;
  order_number: string;
  created_at: string;
  status: string;
  payment_method: string | null;
  total_amount: number;
  shop_name: string;
  buyer_name: string;
  minutes_elapsed: number;
  deadline_minutes: number;
  pct: number;
};

function AdminAutoCancel() {
  const [deadlineHours, setDeadlineHours] = useState(24);
  const [reminderHours, setReminderHours] = useState(1);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const loadSettings = async () => {
    const { data } = await supabase
      .from("platform_settings")
      .select("key, value")
      .in("key", ["auto_cancel_hours", "auto_cancel_enabled", "reminder_hours", "reminder_enabled"]);
    for (const row of data ?? []) {
      if (row.key === "auto_cancel_hours") setDeadlineHours(Number(row.value) || 24);
      if (row.key === "auto_cancel_enabled") setAutoEnabled(row.value !== "false");
      if (row.key === "reminder_hours") setReminderHours(Number(row.value) || 1);
      if (row.key === "reminder_enabled") setReminderEnabled(row.value !== "false");
    }
  };

  const loadPending = async () => {
    setLoading(true);
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          id, order_number, created_at, status, payment_method, total_amount,
          coffee_shops!inner(name),
          customer_profiles(display_name)
        `)
        .in("status", ["pending", "awaiting_payment"])
        .order("created_at", { ascending: true })
        .limit(50) as any;
      if (error) throw error;

      const now = Date.now();
      const deadline = deadlineHours * 60;
      const enriched: PendingOrder[] = (orders ?? []).map((o: any) => {
        const elapsed = (now - new Date(o.created_at).getTime()) / 60000;
        const pct = Math.min(100, (elapsed / deadline) * 100);
        return {
          id: o.id,
          order_number: o.order_number,
          created_at: o.created_at,
          status: o.status,
          payment_method: o.payment_method,
          total_amount: Number(o.total_amount),
          shop_name: o.coffee_shops?.name ?? "—",
          buyer_name: o.customer_profiles?.display_name ?? "Pembeli",
          minutes_elapsed: Math.round(elapsed),
          deadline_minutes: deadline,
          pct,
        };
      });
      setPendingOrders(enriched);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings().then(() => loadPending());
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    const upserts = [
      { key: "auto_cancel_hours", value: String(deadlineHours) },
      { key: "auto_cancel_enabled", value: String(autoEnabled) },
      { key: "reminder_hours", value: String(reminderHours) },
      { key: "reminder_enabled", value: String(reminderEnabled) },
    ];
    for (const u of upserts) {
      await supabase
        .from("platform_settings")
        .upsert({ key: u.key, value: u.value }, { onConflict: "key" });
    }
    setSaving(false);
    toast.success("Konfigurasi disimpan");
  };

  const cancelOrder = async (orderId: string, orderNumber: string) => {
    if (!confirm(`Batalkan pesanan ${orderNumber}?`)) return;
    setCancelling(orderId);
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled" })
      .eq("id", orderId);
    setCancelling(null);
    if (error) toast.error(error.message);
    else { toast.success(`Pesanan ${orderNumber} dibatalkan`); loadPending(); }
  };

  const fmtElapsed = (min: number) => {
    if (min < 60) return `${min} menit`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}j ${m}m` : `${h} jam`;
  };

  const urgency = (pct: number) => {
    if (pct >= 90) return "red";
    if (pct >= 60) return "amber";
    return "green";
  };

  const overdue = pendingOrders.filter((o) => o.pct >= 100).length;
  const nearDeadline = pendingOrders.filter((o) => o.pct >= 80 && o.pct < 100).length;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Clock className="h-6 w-6" /> Auto-cancel & Reminder Bayar
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pesanan tidak dibayar otomatis dibatalkan sesuai batas waktu
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => { loadSettings(); loadPending(); }}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary/70" />
          <div>
            <p className="text-2xl font-bold">{pendingOrders.length}</p>
            <p className="text-xs text-muted-foreground">Menunggu bayar</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3 border-amber-200 bg-amber-50/30">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <div>
            <p className="text-2xl font-bold text-amber-700">{nearDeadline}</p>
            <p className="text-xs text-muted-foreground">Mendekati batas</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3 border-red-200 bg-red-50/30">
          <XCircle className="h-8 w-8 text-red-500" />
          <div>
            <p className="text-2xl font-bold text-red-700">{overdue}</p>
            <p className="text-xs text-muted-foreground">Melewati batas</p>
          </div>
        </Card>
      </div>

      <Card className="p-5 space-y-5">
        <h2 className="font-semibold flex items-center gap-2">
          <Settings className="h-4 w-4" /> Konfigurasi
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium">Auto-cancel aktif</Label>
              <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">
                Batas waktu bayar (jam)
              </Label>
              <Input
                type="number"
                min={1}
                max={168}
                className="mt-1 w-32"
                value={deadlineHours}
                onChange={(e) => setDeadlineHours(Number(e.target.value))}
                disabled={!autoEnabled}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Pesanan otomatis dibatalkan setelah {deadlineHours} jam jika belum dibayar
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-medium flex items-center gap-1.5">
                <Bell className="h-4 w-4" /> Reminder aktif
              </Label>
              <Switch checked={reminderEnabled} onCheckedChange={setReminderEnabled} />
            </div>
            <div>
              <Label className="text-sm text-muted-foreground">
                Kirim reminder sebelum (jam)
              </Label>
              <Input
                type="number"
                min={0}
                max={24}
                className="mt-1 w-32"
                value={reminderHours}
                onChange={(e) => setReminderHours(Number(e.target.value))}
                disabled={!reminderEnabled}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Notifikasi dikirim {reminderHours} jam sebelum deadline ke pembeli
              </p>
            </div>
          </div>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="w-full sm:w-auto">
          <Save className="h-4 w-4 mr-1.5" />
          {saving ? "Menyimpan…" : "Simpan Konfigurasi"}
        </Button>
      </Card>

      <div>
        <h2 className="font-semibold mb-3">Pesanan Menunggu Pembayaran</h2>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : pendingOrders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
            Tidak ada pesanan menunggu pembayaran
          </div>
        ) : (
          <div className="space-y-3">
            {pendingOrders.map((o) => {
              const urg = urgency(o.pct);
              return (
                <Card
                  key={o.id}
                  className={`p-4 ${urg === "red" ? "border-red-200 bg-red-50/30" : urg === "amber" ? "border-amber-200 bg-amber-50/30" : ""}`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{o.order_number}</span>
                        <Badge
                          className={`text-[10px] ${
                            urg === "red"
                              ? "bg-red-500 hover:bg-red-500"
                              : urg === "amber"
                              ? "bg-amber-500 hover:bg-amber-500"
                              : "bg-green-500 hover:bg-green-500"
                          }`}
                        >
                          {o.pct >= 100 ? "Melewati batas" : `${Math.round(o.pct)}%`}
                        </Badge>
                        {o.payment_method && (
                          <Badge variant="outline" className="text-[10px]">
                            {o.payment_method}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {o.buyer_name} · {o.shop_name} ·{" "}
                        <strong>Rp {o.total_amount.toLocaleString("id-ID")}</strong>
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              urg === "red" ? "bg-red-500" : urg === "amber" ? "bg-amber-400" : "bg-green-500"
                            }`}
                            style={{ width: `${Math.min(100, o.pct)}%` }}
                          />
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {fmtElapsed(o.minutes_elapsed)} / {deadlineHours}j
                        </span>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => cancelOrder(o.id, o.order_number)}
                      disabled={cancelling === o.id}
                    >
                      <Ban className="h-3.5 w-3.5 mr-1" />
                      {cancelling === o.id ? "…" : "Batalkan"}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
