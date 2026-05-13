import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RefreshCcw, PackageX, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/akun/returns")({
  head: () => ({ meta: [{ title: "Pengembalian — Akun" }] }),
  component: ReturnsPage,
});

const RETURN_SQL = `-- Jalankan di Supabase SQL Editor untuk mengaktifkan fitur pengembalian:
create table if not exists public.return_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  reason text not null,
  description text,
  status text not null default 'pending'
    check (status in ('pending','approved','rejected','completed')),
  shop_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.return_requests enable row level security;
create policy "user_own_rr" on public.return_requests
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "shop_view_rr" on public.return_requests for select
  using (order_id in (
    select o.id from orders o
    join coffee_shops cs on cs.id = o.shop_id
    where cs.owner_id = auth.uid()
  ));`;

const REASONS = [
  "Produk rusak / cacat",
  "Produk tidak sesuai deskripsi",
  "Produk salah dikirim",
  "Produk tidak diterima",
  "Kualitas tidak sesuai",
  "Lainnya",
];

const STATUS_LABEL: Record<string, string> = {
  pending:   "Menunggu Review",
  approved:  "Disetujui",
  rejected:  "Ditolak",
  completed: "Selesai",
};
const STATUS_COLOR: Record<string, string> = {
  pending:   "bg-amber-100 text-amber-800",
  approved:  "bg-blue-100 text-blue-800",
  rejected:  "bg-red-100 text-red-800",
  completed: "bg-green-100 text-green-800",
};

type Order = { id: string; order_no: string; created_at: string; total: number };
type ReturnReq = { id: string; order_id: string; reason: string; description: string | null; status: string; shop_note: string | null; created_at: string };

function ReturnsPage() {
  const { user } = useAuth();
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [orders, setOrders]   = useState<Order[]>([]);
  const [returns, setReturns] = useState<ReturnReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selOrderId, setSelOrderId] = useState("");
  const [reason, setReason]   = useState(REASONS[0]);
  const [desc, setDesc]       = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied]   = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { error: tblErr } = await (supabase as any)
        .from("return_requests")
        .select("id")
        .limit(1);
      if (tblErr?.message?.includes("relation") || tblErr?.message?.includes("does not exist")) {
        setTableExists(false);
        setLoading(false);
        return;
      }
      setTableExists(true);
      const [ordRes, retRes] = await Promise.all([
        supabase
          .from("orders" as any)
          .select("id, order_no, created_at, total")
          .eq("customer_id", user.id)
          .like("order_no", "MKT-%")
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(50),
        (supabase as any)
          .from("return_requests")
          .select("id, order_id, reason, description, status, shop_note, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      setOrders((ordRes.data ?? []) as Order[]);
      setReturns((retRes.data ?? []) as ReturnReq[]);
      setLoading(false);
    })();
  }, [user]);

  const returnedOrderIds = new Set(returns.map(r => r.order_id));
  const eligibleOrders   = orders.filter(o => !returnedOrderIds.has(o.id));

  async function submitReturn() {
    if (!selOrderId || !reason) { toast.error("Pilih pesanan dan alasan."); return; }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("return_requests").insert({
        order_id:    selOrderId,
        user_id:     user!.id,
        reason,
        description: desc.trim() || null,
      });
      if (error) throw error;
      toast.success("Permintaan pengembalian berhasil dikirim!");
      setShowDialog(false);
      setSelOrderId(""); setReason(REASONS[0]); setDesc("");
      const { data } = await (supabase as any)
        .from("return_requests")
        .select("id, order_id, reason, description, status, shop_note, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      setReturns(data ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Memuat…</div>;

  if (tableExists === false) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold">Pengembalian Barang</h2>
          <p className="mt-1 text-sm text-muted-foreground">Fitur ini memerlukan tabel tambahan di database.</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-800 mb-2">Tabel belum tersedia. Jalankan SQL berikut di Supabase:</p>
          <pre className="overflow-x-auto rounded-lg bg-white border border-border p-3 text-[11px] text-foreground whitespace-pre-wrap">{RETURN_SQL}</pre>
          <Button
            size="sm"
            variant="outline"
            className="mt-2 gap-1.5"
            onClick={() => { navigator.clipboard.writeText(RETURN_SQL); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          >
            {copied ? <><Check className="h-3.5 w-3.5" /> Disalin!</> : <><Copy className="h-3.5 w-3.5" /> Salin SQL</>}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Pengembalian Barang</h2>
          <p className="mt-1 text-sm text-muted-foreground">Kelola permintaan pengembalian produk dari pesananmu.</p>
        </div>
        {eligibleOrders.length > 0 && (
          <Button size="sm" className="gap-1.5 shrink-0" onClick={() => setShowDialog(true)}>
            <RefreshCcw className="h-3.5 w-3.5" />
            Ajukan Pengembalian
          </Button>
        )}
      </div>

      {returns.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <PackageX className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">Belum ada permintaan pengembalian.</p>
          {eligibleOrders.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">Kamu belum punya pesanan yang bisa dikembalikan.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {returns.map(r => {
            const ord = orders.find(o => o.id === r.order_id);
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <button
                  className="w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors"
                  onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <PackageX className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{ord?.order_no ?? r.order_id.slice(0, 8)}</span>
                      <Badge className={`text-[10px] px-2 py-0 ${STATUS_COLOR[r.status] ?? "bg-muted text-muted-foreground"}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{r.reason}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("id-ID")}</p>
                  </div>
                  {expanded === r.id ? <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground mt-1" /> : <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-1" />}
                </button>
                {expanded === r.id && (
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-2 text-sm">
                    {r.description && (
                      <div><Label className="text-xs text-muted-foreground">Deskripsi</Label><p>{r.description}</p></div>
                    )}
                    {r.shop_note && (
                      <div className="rounded-lg bg-muted/40 p-3">
                        <Label className="text-xs text-muted-foreground">Catatan Toko</Label>
                        <p>{r.shop_note}</p>
                      </div>
                    )}
                    {ord && (
                      <div><Label className="text-xs text-muted-foreground">Total Pesanan</Label>
                      <p className="font-medium">Rp {Number(ord.total).toLocaleString("id-ID")}</p></div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajukan Pengembalian</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Pilih Pesanan</Label>
              <Select value={selOrderId} onValueChange={setSelOrderId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih pesanan yang ingin dikembalikan…" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleOrders.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.order_no} — Rp {Number(o.total).toLocaleString("id-ID")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Alasan Pengembalian</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Keterangan Tambahan (opsional)</Label>
              <Textarea
                className="mt-1 resize-none"
                rows={3}
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Jelaskan kondisi produk yang ingin dikembalikan…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={submitReturn} disabled={submitting || !selOrderId}>
              {submitting ? "Mengirim…" : "Kirim Permintaan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
