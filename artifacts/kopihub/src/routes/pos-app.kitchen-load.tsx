import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChefHat, Loader2, RefreshCw, Clock, AlertTriangle, CheckCircle2, TrendingUp, Settings2, Save, Zap } from "lucide-react";

export const Route = createFileRoute("/pos-app/kitchen-load")({
  head: () => ({ meta: [{ title: "Kitchen Load Monitor" }] }),
  component: KitchenLoadPage,
});

type OrderItem = { id: string; name: string; qty: number; prep_time: number };
type PendingOrder = {
  id: string;
  order_number: string | null;
  created_at: string;
  items: OrderItem[];
  total_prep_minutes: number;
  status: string;
};

function waitMinutes(createdAt: string) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
}

const LOAD_LEVELS = [
  { max: 15, label: "Santai", cls: "bg-green-100 text-green-700 border-green-200", color: "bg-green-500" },
  { max: 30, label: "Normal", cls: "bg-blue-100 text-blue-700 border-blue-200", color: "bg-blue-500" },
  { max: 45, label: "Sibuk", cls: "bg-amber-100 text-amber-700 border-amber-200", color: "bg-amber-500" },
  { max: Infinity, label: "Overload", cls: "bg-red-100 text-red-700 border-red-200", color: "bg-red-500" },
];

function getLoad(minutes: number) {
  return LOAD_LEVELS.find(l => minutes <= l.max) ?? LOAD_LEVELS[LOAD_LEVELS.length - 1];
}

export default function KitchenLoadPage() {
  const { shop } = useCurrentShop();
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [avgPrepMin, setAvgPrepMin] = useState(10);
  const [showSettings, setShowSettings] = useState(false);
  const [savedAvg, setSavedAvg] = useState(10);
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (shopId: string) => {
    const { data } = await (supabase as any)
      .from("orders")
      .select("id, order_no, created_at, status, order_items(id, name, quantity, note)")
      .eq("shop_id", shopId)
      .in("status", ["confirmed", "processing"])
      .order("created_at");

    const rows: PendingOrder[] = (data ?? []).map((o: Record<string, unknown>) => {
      const items: OrderItem[] = ((o.order_items ?? []) as Record<string, unknown>[]).map((i: Record<string, unknown>) => ({
        id: String(i.id),
        name: String(i.name),
        qty: Number(i.quantity) || 1,
        prep_time: savedAvg,
      }));
      const total = items.reduce((s, i) => s + i.prep_time * i.qty, 0);
      return { id: String(o.id), order_number: (o.order_no as string | null) ?? null, created_at: String(o.created_at), items, total_prep_minutes: total, status: String(o.status) };
    });
    setOrders(rows);
    setLoading(false);
  }, [savedAvg]);

  useEffect(() => {
    if (!shop?.id) return;
    load(shop.id);
    if (autoRefresh) {
      refreshRef.current = setInterval(() => load(shop.id), 30000);
    }
    return () => { if (refreshRef.current) clearInterval(refreshRef.current); };
  }, [shop?.id, autoRefresh, load]);

  const totalLoad = orders.reduce((s, o) => s + Math.max(0, o.total_prep_minutes - waitMinutes(o.created_at)), 0);
  const estWait = Math.max(5, Math.ceil(totalLoad / Math.max(1, 2)));
  const loadLevel = getLoad(estWait);

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><ChefHat className="h-5 w-5 text-primary" /> Kitchen Load Monitor</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Monitor beban dapur dan estimasi waktu tunggu pelanggan secara realtime.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
            <span className="text-muted-foreground">Auto refresh 30d</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => load(shop.id)} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowSettings(!showSettings)} className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {showSettings && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="text-sm font-semibold">Konfigurasi</p>
          <div className="flex items-center gap-3">
            <Label className="shrink-0">Rata-rata waktu masak (menit/item)</Label>
            <Input type="number" min={1} max={60} value={avgPrepMin} onChange={e => setAvgPrepMin(Number(e.target.value))} className="w-20" />
            <Button size="sm" onClick={() => { setSavedAvg(avgPrepMin); setShowSettings(false); toast.success("Disimpan"); }}>
              <Save className="h-3.5 w-3.5 mr-1" /> Simpan
            </Button>
          </div>
        </div>
      )}

      {/* Load indicator */}
      <div className={`rounded-xl border p-6 text-center ${loadLevel.cls}`}>
        <div className="flex items-center justify-center gap-3 mb-2">
          <ChefHat className="h-8 w-8" />
          <div>
            <p className="text-3xl font-bold">{estWait} menit</p>
            <p className="text-sm font-semibold">Estimasi Tunggu Saat Ini</p>
          </div>
        </div>
        <Badge className={`${loadLevel.cls} border text-sm font-semibold px-4 py-1`}>{loadLevel.label}</Badge>
        <div className="mt-3 h-3 bg-white/40 rounded-full overflow-hidden">
          <div className={`h-full ${loadLevel.color} rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(100, (estWait / 60) * 100)}%` }} />
        </div>
        <p className="mt-2 text-xs opacity-80">{orders.length} pesanan sedang diproses dapur</p>
      </div>

      {/* Orders queue */}
      {loading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <CheckCircle2 className="mx-auto h-8 w-8 opacity-30 mb-2" />
          <p className="text-sm">Dapur bersih — tidak ada pesanan sedang diproses.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground">Antrian Dapur ({orders.length})</h2>
          {orders.map(o => {
            const waited = waitMinutes(o.created_at);
            const remaining = Math.max(0, o.total_prep_minutes - waited);
            const isLate = waited > o.total_prep_minutes + 5;
            return (
              <div key={o.id} className={`rounded-xl border bg-card p-4 ${isLate ? "border-red-200" : ""}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">#{o.order_number ?? o.id.slice(0, 6)}</span>
                      {isLate && <Badge className="bg-red-100 text-red-700 text-xs"><AlertTriangle className="h-2.5 w-2.5 mr-0.5" /> Terlambat</Badge>}
                    </div>
                    <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
                      {o.items.slice(0, 3).map(i => (
                        <li key={i.id}>{i.qty}× {i.name}</li>
                      ))}
                      {o.items.length > 3 && <li>+{o.items.length - 3} item lainnya</li>}
                    </ul>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-muted-foreground text-xs justify-end">
                      <Clock className="h-3 w-3" /> {waited}m menunggu
                    </div>
                    <p className={`text-sm font-bold mt-0.5 ${isLate ? "text-red-600" : remaining < 5 ? "text-amber-600" : "text-primary"}`}>
                      {remaining > 0 ? `~${remaining}m lagi` : "Segera"}
                    </p>
                  </div>
                </div>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${isLate ? "bg-red-500" : "bg-primary"}`}
                    style={{ width: `${Math.min(100, (waited / Math.max(1, o.total_prep_minutes)) * 100)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-lg bg-muted/30 border p-3 flex gap-2 text-xs text-muted-foreground">
        <Zap className="h-3.5 w-3.5 shrink-0 text-amber-500" />
        <span>Estimasi waktu tunggu ditampilkan otomatis di halaman menu pelanggan jika beban dapur &gt; 20 menit.</span>
      </div>
    </div>
  );
}
