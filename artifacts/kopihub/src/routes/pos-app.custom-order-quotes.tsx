import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import { Calculator, Plus, Trash2, Loader2, Send, FileText, Copy, X } from "lucide-react";

export const Route = createFileRoute("/pos-app/custom-order-quotes")({
  head: () => ({ meta: [{ title: "Estimasi Biaya Custom Order" }] }),
  component: QuotesPage,
});

type Req = { id: string; customer_name: string; customer_contact: string; description: string; status: string; created_at: string };
type LineItem = { name: string; qty: number; price: number };
type Quote = {
  id: string; request_id: string; total: number;
  breakdown: LineItem[]; notes: string | null; valid_until: string | null;
  status: "draft" | "sent" | "accepted" | "rejected" | "expired";
  sent_at: string | null; created_at: string;
  request?: Req;
};

const STATUS_META: Record<Quote["status"], { label: string; color: string }> = {
  draft:    { label: "Draft",    color: "bg-muted text-muted-foreground" },
  sent:     { label: "Terkirim", color: "bg-blue-100 text-blue-700" },
  accepted: { label: "Disetujui", color: "bg-emerald-100 text-emerald-700" },
  rejected: { label: "Ditolak",   color: "bg-red-100 text-red-700" },
  expired:  { label: "Expired",   color: "bg-amber-100 text-amber-700" },
};

function QuotesPage() {
  const { shop } = useCurrentShop();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<Quote | null>(null);
  const [requestId, setRequestId] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ name: "", qty: 1, price: 0 }]);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const [{ data: q }, { data: r }] = await Promise.all([
      (supabase as any).from("custom_order_quotes")
        .select("*, request:custom_order_requests(id, customer_name, customer_contact, description, status, created_at)")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false }),
      (supabase as any).from("custom_order_requests")
        .select("id, customer_name, customer_contact, description, status, created_at")
        .eq("shop_id", shopId)
        .in("status", ["pending", "in_review", "in_progress", "quoted"])
        .order("created_at", { ascending: false }),
    ]);
    setQuotes((q ?? []) as Quote[]);
    setRequests((r ?? []) as Req[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const total = useMemo(() => items.reduce((s, i) => s + (i.qty * i.price), 0), [items]);

  const openNew = (preReqId?: string) => {
    setEditing(null);
    setRequestId(preReqId ?? "");
    setItems([{ name: "", qty: 1, price: 0 }]);
    setNotes("");
    setValidUntil("");
    setOpen(true);
  };

  const openEdit = (q: Quote) => {
    setEditing(q);
    setRequestId(q.request_id);
    setItems(q.breakdown.length > 0 ? q.breakdown : [{ name: "", qty: 1, price: 0 }]);
    setNotes(q.notes ?? "");
    setValidUntil(q.valid_until ?? "");
    setOpen(true);
  };

  const save = async (sendNow: boolean) => {
    if (!shop || !requestId) { toast.error("Pilih permintaan custom order"); return; }
    const cleanItems = items.filter(i => i.name.trim() && i.price >= 0);
    if (cleanItems.length === 0) { toast.error("Minimal 1 item"); return; }
    setSaving(true);
    const totalAmt = cleanItems.reduce((s, i) => s + (i.qty * i.price), 0);
    const payload: any = {
      shop_id: shop.id,
      request_id: requestId,
      total: totalAmt,
      breakdown: cleanItems,
      notes: notes.trim() || null,
      valid_until: validUntil || null,
      status: sendNow ? "sent" : "draft",
      sent_at: sendNow ? new Date().toISOString() : null,
    };
    try {
      let saved: Quote;
      if (editing) {
        const { data, error } = await (supabase as any).from("custom_order_quotes").update(payload).eq("id", editing.id).select().single();
        if (error) throw error;
        saved = data as Quote;
      } else {
        const { data, error } = await (supabase as any).from("custom_order_quotes").insert(payload).select().single();
        if (error) throw error;
        saved = data as Quote;
      }
      toast.success(sendNow ? "Quote terkirim" : "Draft tersimpan");
      setOpen(false);
      if (sendNow) sendWA(saved);
      load(shop.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally { setSaving(false); }
  };

  const sendWA = (q: Quote) => {
    const req = requests.find(r => r.id === q.request_id) ?? quotes.find(x => x.id === q.id)?.request;
    if (!req) return;
    const link = `${window.location.origin}/quote/${q.id}`;
    const lines = q.breakdown.map(i => `- ${i.name} (${i.qty}× ${formatIDR(i.price)})`).join("\n");
    const msg = encodeURIComponent(
      `Hai ${req.customer_name}, berikut estimasi biaya untuk permintaan Anda:\n\n${lines}\n\nTotal: ${formatIDR(q.total)}\n\nDetail lengkap: ${link}`
    );
    const phone = req.customer_contact.replace(/\D/g, "").replace(/^0/, "62");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
  };

  const setStatus = async (q: Quote, status: Quote["status"]) => {
    await (supabase as any).from("custom_order_quotes").update({ status, responded_at: new Date().toISOString() }).eq("id", q.id);
    toast.success(`Status: ${STATUS_META[status].label}`);
    load(shop!.id);
  };

  const remove = async (q: Quote) => {
    if (!confirm("Hapus quote ini?")) return;
    await (supabase as any).from("custom_order_quotes").delete().eq("id", q.id);
    setQuotes(prev => prev.filter(x => x.id !== q.id));
  };

  const copyLink = (id: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/quote/${id}`);
    toast.success("Link disalin");
  };

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Calculator className="h-5 w-5 text-primary" /> Estimasi Biaya Custom Order
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Buat penawaran biaya rinci untuk permintaan custom order, kirim ke pembeli, dan track persetujuan.
          </p>
        </div>
        <Button onClick={() => openNew()} className="gap-1.5"><Plus className="h-4 w-4" /> Buat Quote Baru</Button>
      </div>

      {requests.length > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <div className="text-sm font-semibold">Permintaan menunggu estimasi ({requests.length})</div>
          <div className="mt-2 space-y-2">
            {requests.slice(0, 5).map(r => {
              const hasQuote = quotes.some(q => q.request_id === r.id && q.status !== "expired" && q.status !== "rejected");
              return (
                <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.customer_name} — {r.description.slice(0, 60)}{r.description.length > 60 ? "…" : ""}</div>
                    <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("id-ID")}</div>
                  </div>
                  {hasQuote ? <Badge variant="secondary">Sudah ada quote</Badge> :
                    <Button size="sm" variant="outline" onClick={() => openNew(r.id)}>Buat Quote</Button>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : quotes.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          <Calculator className="mx-auto h-10 w-10 opacity-30 mb-3" />
          <p className="font-medium">Belum ada quote</p>
        </div>
      ) : (
        <div className="space-y-3">
          {quotes.map(q => {
            const meta = STATUS_META[q.status];
            return (
              <div key={q.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{q.request?.customer_name ?? "—"}</span>
                      <Badge className={`text-xs ${meta.color}`}>{meta.label}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{q.request?.description}</p>
                    <div className="mt-2 space-y-0.5 text-xs">
                      {q.breakdown.map((it, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{it.name} × {it.qty}</span>
                          <span>{formatIDR(it.qty * it.price)}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm font-bold">
                      <span>Total</span>
                      <span className="text-primary">{formatIDR(q.total)}</span>
                    </div>
                    {q.valid_until && <p className="mt-1 text-xs text-amber-600">Berlaku s.d. {new Date(q.valid_until).toLocaleDateString("id-ID")}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    {q.status === "draft" && (
                      <Button size="sm" onClick={async () => { await (supabase as any).from("custom_order_quotes").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", q.id); sendWA(q); load(shop.id); }} className="gap-1.5">
                        <Send className="h-3.5 w-3.5" /> Kirim WA
                      </Button>
                    )}
                    {q.status === "sent" && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => setStatus(q, "accepted")}>Disetujui</Button>
                        <Button size="sm" variant="outline" onClick={() => setStatus(q, "rejected")}>Ditolak</Button>
                      </div>
                    )}
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Salin link" onClick={() => copyLink(q.id)}><Copy className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(q)}><FileText className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => remove(q)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Quote" : "Buat Quote Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Permintaan Custom Order <span className="text-destructive">*</span></Label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={requestId} onChange={e => setRequestId(e.target.value)}>
                <option value="">— Pilih —</option>
                {requests.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.customer_name} — {r.description.slice(0, 50)}{r.description.length > 50 ? "…" : ""}
                  </option>
                ))}
                {editing && !requests.some(r => r.id === requestId) && (
                  <option value={requestId}>{editing.request?.customer_name ?? "(permintaan terkait)"}</option>
                )}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Rincian Biaya</Label>
                <Button size="sm" variant="outline" onClick={() => setItems(prev => [...prev, { name: "", qty: 1, price: 0 }])} className="gap-1 h-7">
                  <Plus className="h-3.5 w-3.5" /> Item
                </Button>
              </div>
              {items.map((it, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input className="flex-1" placeholder="Nama item (mis. Material kain)" value={it.name} onChange={e => setItems(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  <Input className="w-20" type="number" min={1} value={it.qty} onChange={e => setItems(prev => prev.map((x, j) => j === i ? { ...x, qty: Number(e.target.value) || 1 } : x))} />
                  <Input className="w-32" type="number" min={0} value={it.price} onChange={e => setItems(prev => prev.map((x, j) => j === i ? { ...x, price: Number(e.target.value) || 0 } : x))} placeholder="Harga" />
                  <Button size="sm" variant="ghost" className="h-9 w-9 p-0 text-destructive" onClick={() => setItems(prev => prev.filter((_, j) => j !== i))} disabled={items.length === 1}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex justify-between border-t pt-2 text-sm font-semibold">
                <span>Total</span>
                <span className="text-primary">{formatIDR(total)}</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Berlaku Sampai (opsional)</Label>
                <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Catatan / Syarat</Label>
              <Textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Pembayaran 50% di muka, sisanya saat selesai. Estimasi pengerjaan 7-10 hari kerja." />
            </div>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setOpen(false)} className="sm:mr-auto">Batal</Button>
            <Button variant="outline" onClick={() => save(false)} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}Simpan Draft</Button>
            <Button onClick={() => save(true)} disabled={saving} className="gap-1.5">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Simpan & Kirim</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
