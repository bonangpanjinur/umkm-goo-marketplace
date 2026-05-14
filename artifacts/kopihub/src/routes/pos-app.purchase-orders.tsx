import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Loader2, Plus, FileText, Trash2, Search, MoreHorizontal, Eye, Copy, Send,
  X as XIcon, MessageCircle, Download, FileClock, CheckCircle2, ShoppingCart, Package,
  Repeat, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import {
  buildWAMessage, openWA, loadTemplate, saveTemplate, normalizePhone,
  WA_TEMPLATE_LABELS, WA_TEMPLATE_DESC, type WATemplate,
} from "@/lib/po-whatsapp";

export const Route = createFileRoute("/pos-app/purchase-orders")({ component: POPage });

type Supplier = { id: string; name: string; phone?: string | null };
type Ingredient = { id: string; name: string; unit: string; cost_per_unit: number };
type POStatus = "draft" | "ordered" | "received" | "cancelled";
type PO = {
  id: string; po_no: string; status: POStatus;
  supplier_id: string | null; order_date: string; expected_date: string | null;
  received_date: string | null; subtotal: number; tax: number; total: number; note: string | null;
};
type Line = { ingredient_id: string; quantity: string; unit_cost: string };

const STATUS_LABEL: Record<POStatus, string> = {
  draft: "Draft", ordered: "Sudah dipesan", received: "Diterima", cancelled: "Dibatalkan",
};
const STATUS_BADGE: Record<POStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  ordered: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  received: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  cancelled: "bg-destructive/15 text-destructive",
};

function genPONo() {
  return `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 900 + 100)}`;
}

function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const d = raw.replace(/[^\d+]/g, "").replace(/^\+?62/, "0").replace(/\D/g, "");
  return d.startsWith("0") ? `62${d.slice(1)}` : d;
}

function POPage() {
  const nav = useNavigate();
  const { shop, loading: shopLoading } = useCurrentShop();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [pos, setPos] = useState<PO[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState<string>("");
  const [poNo, setPoNo] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [taxStr, setTaxStr] = useState("0");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ingredient_id: "", quantity: "", unit_cost: "" }]);
  const [saving, setSaving] = useState(false);

  const [itemCounts, setItemCounts] = useState<Record<string, number>>({});

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | POStatus>("all");
  const [supplierFilter, setSupplierFilter] = useState<string>("all");

  // Per-row busy state
  const [rowBusy, setRowBusy] = useState<string | null>(null);

  async function load() {
    if (!shop) return;
    setLoading(true);
    const [sup, ing, list] = await Promise.all([
      supabase.from("suppliers").select("id, name, phone").eq("shop_id", shop.id).eq("is_active", true).order("name"),
      supabase.from("ingredients").select("id, name, unit, cost_per_unit").eq("shop_id", shop.id).eq("is_active", true).order("name"),
      supabase.from("purchase_orders").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false }).limit(200),
    ]);
    setSuppliers((sup.data ?? []) as Supplier[]);
    setIngredients((ing.data ?? []) as Ingredient[]);
    setPos((list.data ?? []) as PO[]);
    setLoading(false);
  }
  useEffect(() => { if (shop) load(); /* eslint-disable-next-line */ }, [shop?.id]);

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0), 0),
    [lines]
  );
  const tax = Number(taxStr) || 0;
  const total = subtotal + tax;

  function openNew() {
    setSupplierId("");
    setPoNo(genPONo());
    setExpectedDate("");
    setTaxStr("0");
    setNote("");
    setLines([{ ingredient_id: "", quantity: "", unit_cost: "" }]);
    setOpen(true);
  }

  function updateLine(i: number, patch: Partial<Line>) {
    setLines((arr) => arr.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function addLine() { setLines((arr) => [...arr, { ingredient_id: "", quantity: "", unit_cost: "" }]); }
  function removeLine(i: number) { setLines((arr) => arr.filter((_, idx) => idx !== i)); }

  async function savePO(asOrdered: boolean) {
    if (!shop || !poNo.trim()) return;
    const valid = lines.filter((l) => l.ingredient_id && Number(l.quantity) > 0);
    if (valid.length === 0) { toast.error("Tambahkan minimal 1 item"); return; }
    setSaving(true);
    const { data: poRow, error } = await supabase.from("purchase_orders").insert({
      shop_id: shop.id,
      supplier_id: supplierId || null,
      po_no: poNo.trim(),
      status: asOrdered ? "ordered" : "draft",
      expected_date: expectedDate || null,
      subtotal, tax, total,
      note: note.trim() || null,
    }).select("id").single();
    if (error || !poRow) { toast.error(error?.message ?? "Gagal"); setSaving(false); return; }
    const { error: itErr } = await supabase.from("purchase_order_items").insert(
      valid.map((l) => ({
        po_id: poRow.id,
        ingredient_id: l.ingredient_id,
        quantity: Number(l.quantity),
        unit_cost: Number(l.unit_cost) || 0,
        subtotal: (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0),
      }))
    );
    if (itErr) toast.error(itErr.message);
    else {
      toast.success("PO disimpan", {
        action: { label: "Lihat", onClick: () => nav({ to: "/pos-app/purchase-orders/$poId", params: { poId: poRow.id } }) },
      });
      setOpen(false); load();
    }
    setSaving(false);
  }

  // Load item counts after POs change
  useEffect(() => {
    (async () => {
      if (pos.length === 0) { setItemCounts({}); return; }
      const { data } = await supabase
        .from("purchase_order_items")
        .select("po_id")
        .in("po_id", pos.map((p) => p.id));
      const counts: Record<string, number> = {};
      (data ?? []).forEach((r: { po_id: string }) => { counts[r.po_id] = (counts[r.po_id] ?? 0) + 1; });
      setItemCounts(counts);
    })();
  }, [pos]);

  // Stats
  const stats = useMemo(() => {
    const s = { total: pos.length, draft: 0, ordered: 0, received: 0, value: 0, openValue: 0 };
    pos.forEach((p) => {
      s[p.status]++;
      s.value += Number(p.total) || 0;
      if (p.status === "draft" || p.status === "ordered") s.openValue += Number(p.total) || 0;
    });
    return s;
  }, [pos]);

  // Filtered list
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pos.filter((p) => {
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (supplierFilter !== "all") {
        if (supplierFilter === "__none" ? p.supplier_id !== null : p.supplier_id !== supplierFilter) return false;
      }
      if (q) {
        const sup = suppliers.find((s) => s.id === p.supplier_id)?.name?.toLowerCase() ?? "";
        if (!p.po_no.toLowerCase().includes(q) && !sup.includes(q) && !(p.note ?? "").toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [pos, search, statusFilter, supplierFilter, suppliers]);

  async function quickSetStatus(p: PO, status: POStatus) {
    setRowBusy(p.id);
    const { error } = await supabase.from("purchase_orders").update({ status }).eq("id", p.id);
    if (error) toast.error(error.message);
    else { toast.success(`Status diubah ke ${STATUS_LABEL[status]}`); load(); }
    setRowBusy(null);
  }

  async function quickReceive(p: PO) {
    if (!confirm(`Terima PO ${p.po_no}? Stok akan otomatis bertambah.`)) return;
    setRowBusy(p.id);
    const { error } = await supabase.rpc("receive_purchase_order", { _po_id: p.id });
    if (error) toast.error(error.message);
    else { toast.success("PO diterima — stok diperbarui"); load(); }
    setRowBusy(null);
  }

  async function deletePO(p: PO) {
    if (p.status !== "draft" && p.status !== "cancelled") {
      toast.error("Hanya PO draft atau dibatalkan yang bisa dihapus");
      return;
    }
    if (!confirm(`Hapus PO ${p.po_no}? Tindakan ini tidak bisa dibatalkan.`)) return;
    setRowBusy(p.id);
    await supabase.from("purchase_order_items").delete().eq("po_id", p.id);
    const { error } = await supabase.from("purchase_orders").delete().eq("id", p.id);
    if (error) toast.error(error.message);
    else { toast.success("PO dihapus"); load(); }
    setRowBusy(null);
  }

  async function duplicatePO(p: PO) {
    if (!shop) return;
    setRowBusy(p.id);
    const { data: oldItems, error: itErr } = await supabase
      .from("purchase_order_items").select("ingredient_id, quantity, unit_cost, subtotal").eq("po_id", p.id);
    if (itErr) { toast.error(itErr.message); setRowBusy(null); return; }
    const newPoNo = genPONo();
    const { data: newPo, error } = await supabase.from("purchase_orders").insert({
      shop_id: shop.id,
      supplier_id: p.supplier_id,
      po_no: newPoNo,
      status: "draft",
      subtotal: p.subtotal, tax: p.tax, total: p.total,
      note: p.note,
    }).select("id").single();
    if (error || !newPo) { toast.error(error?.message ?? "Gagal duplikat"); setRowBusy(null); return; }
    if (oldItems && oldItems.length > 0) {
      const { error: insErr } = await supabase.from("purchase_order_items").insert(
        oldItems.map((it) => ({ ...it, po_id: newPo.id }))
      );
      if (insErr) toast.error(insErr.message);
    }
    toast.success(`PO diduplikat sebagai ${newPoNo}`, {
      action: { label: "Buka", onClick: () => nav({ to: "/pos-app/purchase-orders/$poId", params: { poId: newPo.id } }) },
    });
    setRowBusy(null);
    load();
  }

  function sendWhatsApp(p: PO) {
    const sup = suppliers.find((s) => s.id === p.supplier_id);
    if (!sup?.phone) { toast.error("Supplier belum punya nomor WhatsApp"); return; }
    const phone = normalizePhone(sup.phone);
    const msg =
      `Halo ${sup.name},\n\nMohon proses Purchase Order berikut:\n` +
      `No. PO: ${p.po_no}\n` +
      `Tanggal: ${p.order_date}\n` +
      (p.expected_date ? `Kedatangan: ${p.expected_date}\n` : "") +
      `Total: ${formatIDR(p.total)}\n\n` +
      `Terima kasih.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  function exportCSV() {
    const header = ["No PO", "Tanggal", "Supplier", "Item", "Status", "Subtotal", "Pajak", "Total", "Catatan"];
    const rows = filtered.map((p) => [
      p.po_no,
      p.order_date,
      suppliers.find((s) => s.id === p.supplier_id)?.name ?? "",
      String(itemCounts[p.id] ?? 0),
      STATUS_LABEL[p.status],
      String(p.subtotal),
      String(p.tax),
      String(p.total),
      (p.note ?? "").replace(/\n/g, " "),
    ]);
    const csv = [header, ...rows].map((r) =>
      r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `purchase-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${rows.length} PO diexport`);
  }

  if (shopLoading) return <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const hasFilter = search.trim() !== "" || statusFilter !== "all" || supplierFilter !== "all";

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Purchase Order</h1>
          <p className="mt-1 text-sm text-muted-foreground">Buat PO ke supplier; saat diterima, stok &amp; HPP otomatis terupdate.</p>
        </div>
        <div className="flex items-center gap-2">
          {pos.length > 0 && (
            <Button variant="outline" onClick={exportCSV}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button onClick={openNew}><Plus className="mr-2 h-4 w-4" /> PO baru</Button></DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader><DialogTitle>Purchase Order baru</DialogTitle></DialogHeader>
              <div className="space-y-3 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>No. PO</Label>
                    <Input value={poNo} onChange={(e) => setPoNo(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Supplier</Label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger><SelectValue placeholder="Pilih supplier" /></SelectTrigger>
                      <SelectContent>{suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                    </Select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5"><Label>Tanggal kedatangan (opsional)</Label>
                    <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} /></div>
                  <div className="space-y-1.5"><Label>Pajak (Rp)</Label>
                    <Input type="number" value={taxStr} onChange={(e) => setTaxStr(e.target.value)} /></div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between"><Label>Item</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={addLine}><Plus className="h-3.5 w-3.5 mr-1" /> Tambah baris</Button></div>
                  <div className="space-y-2">
                    {lines.map((l, i) => {
                      const ing = ingredients.find((x) => x.id === l.ingredient_id);
                      const sub = (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0);
                      return (
                        <div key={i} className="grid grid-cols-12 gap-2 items-end">
                          <div className="col-span-5">
                            <Select value={l.ingredient_id} onValueChange={(v) => {
                              const ig = ingredients.find((x) => x.id === v);
                              updateLine(i, { ingredient_id: v, unit_cost: l.unit_cost || String(ig?.cost_per_unit ?? "") });
                            }}>
                              <SelectTrigger><SelectValue placeholder="Pilih bahan" /></SelectTrigger>
                              <SelectContent>{ingredients.map((g) => <SelectItem key={g.id} value={g.id}>{g.name} ({g.unit})</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="col-span-2"><Input type="number" placeholder="Qty" value={l.quantity} onChange={(e) => updateLine(i, { quantity: e.target.value })} /></div>
                          <div className="col-span-3"><Input type="number" placeholder="Harga/unit" value={l.unit_cost} onChange={(e) => updateLine(i, { unit_cost: e.target.value })} /></div>
                          <div className="col-span-1 text-right text-xs text-muted-foreground tabular-nums">{ing?.unit ?? ""}</div>
                          <div className="col-span-1 flex justify-end">
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLine(i)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                          <div className="col-span-12 -mt-1 text-right text-xs text-muted-foreground tabular-nums">{sub > 0 ? formatIDR(sub) : ""}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="space-y-1.5"><Label>Catatan</Label>
                  <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></div>
                <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatIDR(subtotal)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Pajak</span><span className="tabular-nums">{formatIDR(tax)}</span></div>
                  <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold"><span>Total</span><span className="tabular-nums">{formatIDR(total)}</span></div>
                </div>
              </div>
              <DialogFooter className="flex-wrap gap-2">
                <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
                <Button variant="outline" onClick={() => savePO(false)} disabled={saving}>Simpan draft</Button>
                <Button onClick={() => savePO(true)} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Order ke supplier
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stat cards */}
      {pos.length > 0 && (
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard icon={<ShoppingCart className="h-4 w-4" />} label="Total PO" value={stats.total.toString()} hint={formatIDR(stats.value)} />
          <StatCard icon={<FileClock className="h-4 w-4" />} label="Draft" value={stats.draft.toString()} tone="muted" />
          <StatCard icon={<Send className="h-4 w-4" />} label="Sudah dipesan" value={stats.ordered.toString()} hint={formatIDR(stats.openValue)} tone="blue" />
          <StatCard icon={<Package className="h-4 w-4" />} label="Diterima" value={stats.received.toString()} tone="emerald" />
        </div>
      )}

      {/* Filter bar */}
      {pos.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Cari no. PO, supplier, catatan…" className="pl-9 h-9"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "all" | POStatus)}>
            <SelectTrigger className="h-9 w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="ordered">Sudah dipesan</SelectItem>
              <SelectItem value="received">Diterima</SelectItem>
              <SelectItem value="cancelled">Dibatalkan</SelectItem>
            </SelectContent>
          </Select>
          <Select value={supplierFilter} onValueChange={setSupplierFilter}>
            <SelectTrigger className="h-9 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua supplier</SelectItem>
              <SelectItem value="__none">— tanpa supplier —</SelectItem>
              {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          {hasFilter && (
            <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatusFilter("all"); setSupplierFilter("all"); }}>
              <XIcon className="mr-1 h-3.5 w-3.5" /> Reset
            </Button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : pos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground"><FileText className="h-6 w-6" /></div>
          <h2 className="text-lg font-semibold">Belum ada PO</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">Buat PO untuk catat pembelian bahan.</p>
          <Button className="mt-4" onClick={openNew}><Plus className="mr-2 h-4 w-4" /> Buat PO pertama</Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <Search className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Tidak ada PO yang cocok dengan filter.</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => { setSearch(""); setStatusFilter("all"); setSupplierFilter("all"); }}>
            Reset filter
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left">No. PO</th>
                <th className="px-4 py-2.5 text-left">Tanggal</th>
                <th className="px-4 py-2.5 text-left">Supplier</th>
                <th className="px-4 py-2.5 text-right">Item</th>
                <th className="px-4 py-2.5 text-left">Status</th>
                <th className="px-4 py-2.5 text-right">Total</th>
                <th className="px-4 py-2.5 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const sup = suppliers.find((s) => s.id === p.supplier_id);
                const goDetail = () => nav({ to: "/pos-app/purchase-orders/$poId", params: { poId: p.id } });
                const isBusy = rowBusy === p.id;
                return (
                  <tr key={p.id} className="hover:bg-muted/30 group">
                    <td className="px-4 py-3 font-medium cursor-pointer" onClick={goDetail}>{p.po_no}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums cursor-pointer" onClick={goDetail}>{p.order_date}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={goDetail}>{sup?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground cursor-pointer" onClick={goDetail}>{itemCounts[p.id] ?? 0}</td>
                    <td className="px-4 py-3 cursor-pointer" onClick={goDetail}>
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                        {STATUS_LABEL[p.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium cursor-pointer" onClick={goDetail}>{formatIDR(p.total)}</td>
                    <td className="px-2 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isBusy} onClick={(e) => e.stopPropagation()}>
                            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem onClick={goDetail}>
                            <Eye className="mr-2 h-4 w-4" /> Lihat detail
                          </DropdownMenuItem>
                          {p.status === "draft" && (
                            <DropdownMenuItem onClick={() => quickSetStatus(p, "ordered")}>
                              <Send className="mr-2 h-4 w-4" /> Kirim ke supplier
                            </DropdownMenuItem>
                          )}
                          {p.status === "ordered" && (
                            <DropdownMenuItem onClick={() => quickReceive(p)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Terima &amp; update stok
                            </DropdownMenuItem>
                          )}
                          {sup?.phone && (p.status === "draft" || p.status === "ordered") && (
                            <DropdownMenuItem onClick={() => sendWhatsApp(p)}>
                              <MessageCircle className="mr-2 h-4 w-4" /> Kirim via WhatsApp
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => duplicatePO(p)}>
                            <Copy className="mr-2 h-4 w-4" /> Duplikat
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {(p.status === "draft" || p.status === "ordered") && p.status !== "draft" && (
                            <DropdownMenuItem onClick={() => quickSetStatus(p, "cancelled")}>
                              <XIcon className="mr-2 h-4 w-4" /> Batalkan
                            </DropdownMenuItem>
                          )}
                          {p.status === "draft" && (
                            <DropdownMenuItem onClick={() => quickSetStatus(p, "cancelled")}>
                              <XIcon className="mr-2 h-4 w-4" /> Batalkan
                            </DropdownMenuItem>
                          )}
                          {(p.status === "draft" || p.status === "cancelled") && (
                            <DropdownMenuItem onClick={() => deletePO(p)} className="text-destructive focus:text-destructive">
                              <Trash2 className="mr-2 h-4 w-4" /> Hapus
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/20 text-xs">
              <tr>
                <td colSpan={5} className="px-4 py-2.5 text-right text-muted-foreground">
                  {filtered.length} PO ditampilkan
                </td>
                <td className="px-4 py-2.5 text-right font-semibold tabular-nums">
                  {formatIDR(filtered.reduce((s, p) => s + (Number(p.total) || 0), 0))}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon, label, value, hint, tone = "default",
}: {
  icon: React.ReactNode; label: string; value: string; hint?: string;
  tone?: "default" | "muted" | "blue" | "emerald";
}) {
  const toneCls = {
    default: "bg-primary/10 text-primary",
    muted: "bg-muted text-muted-foreground",
    blue: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    emerald: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  }[tone];
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="flex items-center gap-2">
        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${toneCls}`}>{icon}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
      <div className="mt-1.5 text-xl font-bold tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-muted-foreground tabular-nums">{hint}</div>}
    </div>
  );
}
