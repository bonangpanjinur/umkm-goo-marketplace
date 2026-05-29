/**
 * F2-6: Halaman Laci Kas — /pos-app/cash-drawer
 * Menampilkan saldo laci kas terkini, riwayat pergerakan kas,
 * dan ringkasan shift aktif. Menggunakan tabel cash_shifts + cash_movements.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Banknote,
  History,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/cash-drawer")({
  head: () => ({ meta: [{ title: "Laci Kas — Merchant" }] }),
  component: CashDrawerPage,
});

type CashShift = {
  id: string;
  outlet_id: string;
  opened_by: string | null;
  opened_at: string;
  closed_at: string | null;
  opening_cash: number;
  closing_cash: number | null;
  notes: string | null;
};

type CashMovement = {
  id: string;
  shift_id: string;
  type: "in" | "out" | "refund";
  amount: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
};

type MoveType = "in" | "out";

const TYPE_COLORS: Record<string, string> = {
  in:     "text-emerald-600",
  out:    "text-destructive",
  refund: "text-amber-600",
};

const TYPE_LABELS: Record<string, string> = {
  in:     "Kas Masuk",
  out:    "Kas Keluar",
  refund: "Refund",
};

function StatCard({ label, value, icon: Icon, colorClass }: {
  label: string; value: string; icon: any; colorClass?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs text-muted-foreground font-medium">{label}</p>
          <Icon className={`h-4 w-4 ${colorClass ?? "text-muted-foreground"}`} />
        </div>
        <p className={`text-xl font-bold ${colorClass ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

export default function CashDrawerPage() {
  const { shop, outlet, loading: shopLoading } = useCurrentShop();
  const [activeShift, setActiveShift] = useState<CashShift | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [recentShifts, setRecentShifts] = useState<CashShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [moveDlg, setMoveDlg] = useState<MoveType | null>(null);
  const [moveAmount, setMoveAmount] = useState("");
  const [moveNote, setMoveNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!outlet?.id) return;
    setLoading(true);
    try {
      const { data: shifts } = await supabase
        .from("cash_shifts" as any)
        .select("*")
        .eq("outlet_id", outlet.id)
        .order("opened_at", { ascending: false })
        .limit(10);

      const all = (shifts ?? []) as CashShift[];
      const active = all.find(s => !s.closed_at) ?? null;
      setActiveShift(active);
      setRecentShifts(all.filter(s => s.closed_at).slice(0, 5));

      if (active) {
        const { data: mvs } = await supabase
          .from("cash_movements" as any)
          .select("*")
          .eq("shift_id", active.id)
          .order("created_at", { ascending: false });
        setMovements((mvs ?? []) as CashMovement[]);
      } else {
        setMovements([]);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (outlet) load();
  }, [outlet?.id]);

  async function addMovement() {
    if (!activeShift || !moveDlg) return;
    const amount = parseFloat(moveAmount.replace(/[^0-9.]/g, ""));
    if (!amount || amount <= 0) { toast.error("Nominal tidak valid"); return; }
    setSaving(true);
    const { error } = await (supabase as any).from("cash_movements").insert({
      shift_id: activeShift.id,
      type: moveDlg,
      amount,
      note: moveNote.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(moveDlg === "in" ? "Kas masuk dicatat" : "Kas keluar dicatat");
    setMoveDlg(null); setMoveAmount(""); setMoveNote("");
    load();
  }

  const cashIn  = movements.filter(m => m.type === "in").reduce((s, m) => s + Number(m.amount), 0);
  const cashOut = movements.filter(m => m.type === "out").reduce((s, m) => s + Number(m.amount), 0);
  const refunds = movements.filter(m => m.type === "refund").reduce((s, m) => s + Number(m.amount), 0);
  const currentBalance = activeShift
    ? Number(activeShift.opening_cash) + cashIn - cashOut - refunds
    : 0;

  if (shopLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!outlet || !shop) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Outlet belum terpilih.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" /> Laci Kas
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{shop.name} · {outlet.name}</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      {/* Status shift */}
      {!activeShift ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="font-medium text-amber-800 text-sm">Tidak ada shift aktif</p>
              <p className="text-xs text-amber-700 mt-0.5">Buka shift terlebih dahulu di halaman <strong>Shift Kasir</strong> untuk mencatat pergerakan kas.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Saldo Saat Ini"   value={formatIDR(currentBalance)}                    icon={Banknote}      colorClass="text-primary" />
            <StatCard label="Modal Awal"        value={formatIDR(Number(activeShift.opening_cash))} icon={Wallet} />
            <StatCard label="Total Kas Masuk"   value={formatIDR(cashIn)}                           icon={TrendingUp}    colorClass="text-emerald-600" />
            <StatCard label="Total Kas Keluar"  value={formatIDR(cashOut + refunds)}                icon={TrendingDown}  colorClass="text-destructive" />
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setMoveDlg("in")} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              <ArrowDownCircle className="h-4 w-4" /> Kas Masuk
            </Button>
            <Button variant="outline" onClick={() => setMoveDlg("out")} className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/5">
              <ArrowUpCircle className="h-4 w-4" /> Kas Keluar
            </Button>
          </div>

          {/* Shift info */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Info Shift Aktif</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Dibuka pada</span><span>{new Date(activeShift.opened_at).toLocaleString("id-ID")}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Shift ID</span><span className="font-mono text-xs">{activeShift.id.slice(0, 8)}…</span></div>
              {activeShift.notes && <div className="flex justify-between"><span className="text-muted-foreground">Catatan</span><span className="text-right max-w-[60%]">{activeShift.notes}</span></div>}
            </CardContent>
          </Card>

          {/* Movements list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" /> Riwayat Pergerakan Kas
                <Badge variant="secondary" className="ml-auto">{movements.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {movements.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Belum ada pergerakan kas pada shift ini.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {movements.map(m => (
                    <li key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        {m.type === "in"
                          ? <ArrowDownCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                          : m.type === "out"
                          ? <ArrowUpCircle className="h-4 w-4 text-destructive shrink-0" />
                          : <RefreshCw className="h-4 w-4 text-amber-600 shrink-0" />}
                        <div className="min-w-0">
                          <p className="font-medium">{TYPE_LABELS[m.type]}</p>
                          {m.note && <p className="text-xs text-muted-foreground truncate">{m.note}</p>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`font-semibold ${TYPE_COLORS[m.type]}`}>
                          {m.type === "in" ? "+" : "-"}{formatIDR(Number(m.amount))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(m.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Riwayat shift sebelumnya */}
      {recentShifts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4" /> Shift Sebelumnya
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="divide-y divide-border">
              {recentShifts.map(s => {
                const dur = s.closed_at
                  ? Math.round((new Date(s.closed_at).getTime() - new Date(s.opened_at).getTime()) / 60000)
                  : null;
                return (
                  <li key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div>
                      <p className="font-medium">{new Date(s.opened_at).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.opened_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                        {s.closed_at && ` → ${new Date(s.closed_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`}
                        {dur !== null && ` (${dur} mnt)`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{s.closing_cash != null ? formatIDR(s.closing_cash) : "—"}</p>
                      <p className="text-xs text-muted-foreground">Tutup kasir</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Dialog Kas Masuk / Keluar */}
      <Dialog open={moveDlg !== null} onOpenChange={open => { if (!open) { setMoveDlg(null); setMoveAmount(""); setMoveNote(""); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {moveDlg === "in"
                ? <><ArrowDownCircle className="h-5 w-5 text-emerald-600" /> Catat Kas Masuk</>
                : <><ArrowUpCircle className="h-5 w-5 text-destructive" /> Catat Kas Keluar</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <div>
              <Label>Nominal (Rp) *</Label>
              <Input
                className="mt-1 text-lg font-semibold"
                type="number"
                min={0}
                placeholder="Contoh: 50000"
                value={moveAmount}
                onChange={e => setMoveAmount(e.target.value)}
                autoFocus
              />
            </div>
            <div>
              <Label>Keterangan <span className="text-muted-foreground text-xs">(opsional)</span></Label>
              <Textarea
                className="mt-1 resize-none"
                rows={2}
                placeholder={moveDlg === "in" ? "cth: Titipan dari kasir 1" : "cth: Bayar listrik, bensin motor"}
                value={moveNote}
                onChange={e => setMoveNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setMoveDlg(null); setMoveAmount(""); setMoveNote(""); }}>Batal</Button>
            <Button
              onClick={addMovement}
              disabled={saving || !moveAmount}
              className={moveDlg === "in" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-destructive hover:bg-destructive/90"}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
