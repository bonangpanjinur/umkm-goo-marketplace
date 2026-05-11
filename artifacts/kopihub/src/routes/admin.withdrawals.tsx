import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import {
  Banknote, CheckCircle2, XCircle, RefreshCw, Download,
  Clock, AlertTriangle, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/admin/withdrawals")({
  component: AdminWithdrawals,
});

type WR = {
  id: string;
  created_at: string;
  amount: number;
  admin_fee: number;
  net_amount: number;
  bank_name: string;
  bank_account_no: string;
  bank_account_name: string;
  notes: string | null;
  status: string;
  reject_reason: string | null;
  reviewed_at: string | null;
  paid_at: string | null;
  shop: { name: string; slug: string } | null;
};

const FILTERS = ["pending", "approved", "paid", "rejected", "all"] as const;
type Filter = typeof FILTERS[number];

const STATUS_META: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending:  { label: "Menunggu",  variant: "default" },
  approved: { label: "Disetujui", variant: "secondary" },
  paid:     { label: "Lunas",     variant: "outline" },
  rejected: { label: "Ditolak",   variant: "destructive" },
};

function AdminWithdrawals() {
  const [list,    setList]    = useState<WR[]>([]);
  const [filter,  setFilter]  = useState<Filter>("pending");
  const [loading, setLoading] = useState(false);
  const [totals,  setTotals]  = useState({ pending: 0, approved: 0, paid: 0 });

  const [rejectId,     setRejectId]     = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy,         setBusy]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("withdrawal_requests")
      .select("*, shop:coffee_shops(name, slug)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q;
    setList((data as WR[]) ?? []);

    const { data: all } = await supabase
      .from("withdrawal_requests")
      .select("status, amount");
    const t = { pending: 0, approved: 0, paid: 0 };
    (all ?? []).forEach((r: any) => {
      if (r.status in t) t[r.status as keyof typeof t] += Number(r.amount);
    });
    setTotals(t);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: string, status: string, reject_reason?: string) => {
    setBusy(true);
    const patch: Record<string, unknown> = { status, reviewed_at: new Date().toISOString() };
    if (status === "rejected" && reject_reason) patch.reject_reason = reject_reason;
    if (status === "paid") patch.paid_at = new Date().toISOString();
    const { error } = await supabase.from("withdrawal_requests").update(patch as any).eq("id", id);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Status diperbarui");
    setList(prev => prev.map(w => w.id === id ? { ...w, ...patch } as WR : w));
  };

  const submitReject = async () => {
    if (!rejectId || !rejectReason.trim()) { toast.error("Isi alasan penolakan"); return; }
    await setStatus(rejectId, "rejected", rejectReason.trim());
    setRejectId(null);
    setRejectReason("");
  };

  const exportCSV = () => {
    const rows = [
      ["Tanggal", "Toko", "Jumlah", "Biaya Admin", "Net", "Bank", "No Rek", "Atas Nama", "Status", "Alasan Tolak", "Direview", "Dibayar"],
      ...list.map(w => [
        new Date(w.created_at).toLocaleString("id-ID"),
        w.shop?.name ?? "",
        w.amount,
        w.admin_fee,
        w.net_amount,
        w.bank_name,
        w.bank_account_no,
        w.bank_account_name,
        w.status,
        w.reject_reason ?? "",
        w.reviewed_at ? new Date(w.reviewed_at).toLocaleString("id-ID") : "",
        w.paid_at     ? new Date(w.paid_at).toLocaleString("id-ID")     : "",
      ]),
    ];
    const csv = rows.map(r => r.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `penarikan_${filter}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Banknote className="h-6 w-6 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold">Permohonan Penarikan</h1>
            <p className="text-sm text-muted-foreground">Review & proses pencairan dana toko.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4">
          <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium mb-1"><Clock className="h-3.5 w-3.5" /> Menunggu</div>
          <p className="text-2xl font-bold tabular-nums text-amber-800 dark:text-amber-300">{formatIDR(totals.pending)}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-800 p-4">
          <div className="flex items-center gap-1.5 text-xs text-sky-700 font-medium mb-1"><CheckCircle2 className="h-3.5 w-3.5" /> Disetujui</div>
          <p className="text-2xl font-bold tabular-nums text-sky-800 dark:text-sky-300">{formatIDR(totals.approved)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-4">
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium mb-1"><Banknote className="h-3.5 w-3.5" /> Lunas</div>
          <p className="text-2xl font-bold tabular-nums text-emerald-800 dark:text-emerald-300">{formatIDR(totals.paid)}</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors capitalize ${
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary/40"
            }`}
          >
            {f === "all" ? "Semua" : f === "pending" ? "Menunggu" : f === "approved" ? "Disetujui" : f === "paid" ? "Lunas" : "Ditolak"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2.5 text-left">Tanggal</th>
              <th className="px-4 py-2.5 text-left">Toko</th>
              <th className="px-4 py-2.5 text-right">Jumlah</th>
              <th className="px-4 py-2.5 text-right">Biaya</th>
              <th className="px-4 py-2.5 text-right font-semibold">Net</th>
              <th className="px-4 py-2.5 text-left">Rekening</th>
              <th className="px-4 py-2.5 text-center">Status</th>
              <th className="px-4 py-2.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="p-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></td></tr>
            ) : list.length === 0 ? (
              <tr><td colSpan={8} className="p-10 text-center text-muted-foreground">Tidak ada data.</td></tr>
            ) : list.map(w => (
              <tr key={w.id} className="border-t border-border align-top hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                  <div>{new Date(w.created_at).toLocaleDateString("id-ID")}</div>
                  <div>{new Date(w.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
                </td>
                <td className="px-4 py-3 font-medium max-w-[140px]">
                  <p className="truncate">{w.shop?.name ?? "-"}</p>
                  {w.notes && <p className="text-xs text-muted-foreground truncate">{w.notes}</p>}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{formatIDR(w.amount)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-xs text-muted-foreground">-{formatIDR(w.admin_fee)}</td>
                <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-700">{formatIDR(w.net_amount)}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{w.bank_name}</p>
                  <p className="text-xs text-muted-foreground">{w.bank_account_no}</p>
                  <p className="text-xs text-muted-foreground">{w.bank_account_name}</p>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge variant={STATUS_META[w.status]?.variant ?? "outline"} className="text-xs">
                    {STATUS_META[w.status]?.label ?? w.status}
                  </Badge>
                  {w.reject_reason && (
                    <p className="mt-1 text-[10px] text-destructive max-w-[100px] line-clamp-2">{w.reject_reason}</p>
                  )}
                  {w.paid_at && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(w.paid_at).toLocaleDateString("id-ID")}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    {w.status === "pending" && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => { setRejectId(w.id); setRejectReason(""); }}>
                          <XCircle className="h-3.5 w-3.5 mr-1" /> Tolak
                        </Button>
                        <Button size="sm" className="h-7 text-xs"
                          onClick={() => setStatus(w.id, "approved")} disabled={busy}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Setujui
                        </Button>
                      </>
                    )}
                    {w.status === "approved" && (
                      <Button size="sm" className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => setStatus(w.id, "paid")} disabled={busy}>
                        <Banknote className="h-3.5 w-3.5 mr-1" /> Tandai Lunas
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Reject dialog */}
      <Dialog open={!!rejectId} onOpenChange={open => !open && setRejectId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Tolak Permohonan
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Sertakan alasan penolakan agar owner bisa melakukan perbaikan.</p>
            <div>
              <Label>Alasan Penolakan *</Label>
              <Textarea
                className="mt-1"
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Mis. rekening tidak valid, data tidak lengkap..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectId(null)}>Batal</Button>
            <Button variant="destructive" onClick={submitReject} disabled={busy || !rejectReason.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null} Tolak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
