import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, Phone, Calendar, ImageIcon, ExternalLink, Search, X, ChevronDown, ChevronUp, History, Upload, Download, PackageCheck, PenLine, ScrollText, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";
import { CustomOrderTimeline, type TimelineEntry } from "@/components/CustomOrderTimeline";

export const Route = createFileRoute("/pos-app/custom-orders")({
  head: () => ({ meta: [{ title: "Permintaan Custom — Merchant" }] }),
  component: CustomOrdersPage,
});

type Req = {
  id: string;
  customer_name: string;
  customer_contact: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  reference_image_url: string | null;
  status: string;
  owner_note: string | null;
  product_id: string | null;
  created_at: string;
  delivery_file_url: string | null;
  delivery_note: string | null;
  contract_id: string | null;
};

type ContractLite = {
  id: string;
  status: string;
  sign_token: string | null;
  signature_url: string | null;
  signed_by_name: string | null;
  signed_at: string | null;
  total_value: number;
  project_name: string;
};

const STATUS = [
  { v: "pending",     l: "Menunggu",    cls: "bg-amber-100 text-amber-700" },
  { v: "accepted",    l: "Diterima",    cls: "bg-emerald-100 text-emerald-700" },
  { v: "in_progress", l: "Dikerjakan",  cls: "bg-blue-100 text-blue-700" },
  { v: "completed",   l: "Selesai",     cls: "bg-green-100 text-green-700" },
  { v: "rejected",    l: "Ditolak",     cls: "bg-rose-100 text-rose-700" },
];

function CustomOrdersPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [deliveryNote, setDeliveryNote] = useState<Record<string, string>>({});
  const [deliveryUrl, setDeliveryUrl] = useState<Record<string, string>>({});
  const [savingDelivery, setSavingDelivery] = useState<string | null>(null);
  const [uploadingDelivery, setUploadingDelivery] = useState<string | null>(null);
  const deliveryFileRef = useRef<HTMLInputElement>(null);

  // Contracts linked to custom orders
  const [contracts, setContracts] = useState<Record<string, ContractLite>>({});
  const [creatingContract, setCreatingContract] = useState<string | null>(null);

  // Search & filter
  const [q, setQ] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "deadline" | "budget">("newest");

  // Timeline expand & history cache
  const [openTimeline, setOpenTimeline] = useState<Record<string, boolean>>({});
  const [historyCache, setHistoryCache] = useState<Record<string, TimelineEntry[]>>({});

  useEffect(() => {
    if (!shop?.id) return;
    load();
    const ch = supabase
      .channel(`cor-merchant-${shop.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "custom_order_requests", filter: `shop_id=eq.${shop.id}` },
        (payload: any) => {
          const row = payload?.new as Req;
          if (row) setItems(prev => [row, ...prev.filter(p => p.id !== row.id)]);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "custom_order_requests", filter: `shop_id=eq.${shop.id}` },
        (payload: any) => {
          const row = payload?.new as Req;
          if (row) setItems(prev => prev.map(p => p.id === row.id ? { ...p, ...row } : p));
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "custom_order_requests", filter: `shop_id=eq.${shop.id}` },
        (payload: any) => {
          const id = payload?.old?.id;
          if (id) setItems(prev => prev.filter(p => p.id !== id));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "custom_order_status_history" },
        (payload: any) => {
          const rid = payload?.new?.request_id;
          if (rid && historyCache[rid]) loadHistory(rid);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id]);

  async function load() {
    if (!shop?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("custom_order_requests")
      .select("*")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    const rows = (data ?? []) as Req[];
    setItems(rows);
    setLoading(false);
    const ids = rows.map(r => r.contract_id).filter(Boolean) as string[];
    if (ids.length) {
      const { data: cs } = await (supabase as any)
        .from("freelance_contracts")
        .select("id,status,sign_token,signature_url,signed_by_name,signed_at,total_value,project_name")
        .in("id", ids);
      const map: Record<string, ContractLite> = {};
      (cs ?? []).forEach((c: ContractLite) => { map[c.id] = c; });
      setContracts(map);
    }
  }

  async function createContractFor(r: Req) {
    if (!shop) return;
    setCreatingContract(r.id);
    try {
      const totalValue = r.budget_max ?? r.budget_min ?? 0;
      const startDate = new Date().toISOString().slice(0, 10);
      const endDate = r.deadline ? r.deadline.slice(0, 10) : new Date(Date.now() + 30 * 86400_000).toISOString().slice(0, 10);
      const { data, error } = await (supabase as any)
        .from("freelance_contracts")
        .insert({
          shop_id: shop.id,
          client_name: r.customer_name,
          client_phone: r.customer_contact,
          project_name: `Custom Order — ${r.customer_name}`,
          project_description: r.description,
          total_value: totalValue,
          start_date: startDate,
          end_date: endDate,
          deliverables: "Sesuai brief custom order pelanggan",
          revision_count: 2,
          payment_terms: "Sesuai kesepakatan",
          status: "draft",
        })
        .select("id,status,sign_token,signature_url,signed_by_name,signed_at,total_value,project_name")
        .single();
      if (error) throw error;
      const { error: linkErr } = await supabase
        .from("custom_order_requests")
        .update({ contract_id: data.id })
        .eq("id", r.id);
      if (linkErr) throw linkErr;
      setItems(prev => prev.map(p => p.id === r.id ? { ...p, contract_id: data.id } : p));
      setContracts(prev => ({ ...prev, [data.id]: data as ContractLite }));
      toast.success("Kontrak dibuat & ditautkan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat kontrak");
    } finally {
      setCreatingContract(null);
    }
  }

  async function copySignLink(c: ContractLite) {
    if (!c.sign_token) { toast.error("Token belum tersedia"); return; }
    const url = `${window.location.origin}/kontrak/${c.sign_token}`;
    try { await navigator.clipboard.writeText(url); toast.success("Link tanda tangan disalin"); }
    catch { toast.error("Gagal menyalin"); }
  }

  async function refreshContract(id: string) {
    const { data } = await (supabase as any)
      .from("freelance_contracts")
      .select("id,status,sign_token,signature_url,signed_by_name,signed_at,total_value,project_name")
      .eq("id", id).maybeSingle();
    if (data) setContracts(prev => ({ ...prev, [data.id]: data as ContractLite }));
  }

  async function loadHistory(requestId: string) {
    const { data, error } = await supabase
      .from("custom_order_status_history")
      .select("from_status,to_status,note,created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });
    if (error) { toast.error(error.message); return; }
    setHistoryCache(c => ({ ...c, [requestId]: (data ?? []) as TimelineEntry[] }));
  }

  async function toggleTimeline(id: string) {
    const next = !openTimeline[id];
    setOpenTimeline(s => ({ ...s, [id]: next }));
    if (next && !historyCache[id]) await loadHistory(id);
  }

  async function updateStatus(id: string, status: string, ownerNote?: string) {
    const patch: { status: string; owner_note?: string } = { status };
    if (typeof ownerNote === "string" && ownerNote.trim()) patch.owner_note = ownerNote.trim();
    // Optimistic update — realtime UPDATE handler akan sync state final.
    setItems(prev => prev.map(p => p.id === id ? { ...p, ...patch } as Req : p));
    const { error } = await supabase.from("custom_order_requests").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status diperbarui");
    setStatusNote("");
    if (historyCache[id]) await loadHistory(id);
  }

  function waLink(contact: string, message: string) {
    const phone = contact.replace(/\D/g, "").replace(/^0/, "62");
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }

  function buildStatusMessage(r: Req, status: string, ownerNote?: string) {
    const labelMap: Record<string,string> = {
      accepted: "✅ *diterima*",
      in_progress: "🛠️ *sedang dikerjakan*",
      completed: "🎉 *selesai*",
      rejected: "❌ *ditolak*",
    };
    const lines = [
      `Halo ${r.customer_name}, update permintaan custom order kamu di ${shop?.name ?? "toko kami"}:`,
      `Status: ${labelMap[status] ?? status}`,
      `Brief: "${r.description.slice(0, 160)}${r.description.length > 160 ? "…" : ""}"`,
    ];
    if (ownerNote?.trim()) lines.push(`Catatan: ${ownerNote.trim()}`);
    if (r.deadline) lines.push(`Deadline: ${new Date(r.deadline).toLocaleDateString("id-ID")}`);
    lines.push("Terima kasih 🙏");
    return lines.join("\n\n");
  }

  async function changeStatus(r: Req, status: string) {
    if (status === "rejected" && !confirm(`Tolak permintaan dari ${r.customer_name}?`)) return;
    await updateStatus(r.id, status, statusNote);
    if (["accepted","in_progress","completed","rejected"].includes(status)) {
      window.open(waLink(r.customer_contact, buildStatusMessage(r, status, statusNote)), "_blank");
    }
  }

  async function uploadDeliveryFile(id: string, file: File) {
    if (!shop) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("Maksimal 20MB per file"); return; }
    setUploadingDelivery(id);
    const ext = file.name.split(".").pop() || "bin";
    const path = `${shop.id}/${id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("custom-deliveries").upload(path, file, { upsert: false });
    if (error) { toast.error(error.message); setUploadingDelivery(null); return; }
    const { data } = supabase.storage.from("custom-deliveries").getPublicUrl(path);
    setDeliveryUrl(prev => ({ ...prev, [id]: data.publicUrl }));
    setUploadingDelivery(null);
    toast.success("File berhasil diunggah — klik Kirim untuk menyimpan.");
  }

  async function saveDelivery(id: string) {
    const url = deliveryUrl[id]?.trim() || items.find(i => i.id === id)?.delivery_file_url || null;
    const dn = deliveryNote[id]?.trim() || null;
    if (!url) { toast.error("Masukkan URL atau upload file terlebih dahulu"); return; }
    setSavingDelivery(id);
    const { error } = await supabase.from("custom_order_requests" as any).update({ delivery_file_url: url, delivery_note: dn }).eq("id", id);
    setSavingDelivery(null);
    if (error) { toast.error(error.message); return; }
    setItems(prev => prev.map(p => p.id === id ? { ...p, delivery_file_url: url, delivery_note: dn } : p));
    toast.success("Hasil kerja berhasil dikirim ke pelanggan!");
  }

  async function saveNote(id: string) {
    setItems(prev => prev.map(p => p.id === id ? { ...p, owner_note: note } : p));
    const { error } = await supabase.from("custom_order_requests").update({ owner_note: note }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Catatan disimpan"); setEditing(null); }
  }

  const filtered = useMemo(() => {
    let arr = items;
    if (filter !== "all") arr = arr.filter(i => i.status === filter);
    if (q.trim()) {
      const needle = q.toLowerCase();
      arr = arr.filter(i =>
        i.customer_name.toLowerCase().includes(needle) ||
        i.customer_contact.toLowerCase().includes(needle) ||
        i.description.toLowerCase().includes(needle)
      );
    }
    const bMin = budgetMin ? Number(budgetMin) : null;
    const bMax = budgetMax ? Number(budgetMax) : null;
    if (bMin !== null) arr = arr.filter(i => (i.budget_max ?? i.budget_min ?? 0) >= bMin);
    if (bMax !== null) arr = arr.filter(i => (i.budget_min ?? i.budget_max ?? Number.MAX_SAFE_INTEGER) <= bMax);
    if (dateFrom) { const d = new Date(dateFrom).getTime(); arr = arr.filter(i => new Date(i.created_at).getTime() >= d); }
    if (dateTo)   { const d = new Date(dateTo).getTime() + 86400000; arr = arr.filter(i => new Date(i.created_at).getTime() <= d); }

    if (sortBy === "deadline") {
      arr = [...arr].sort((a,b) => {
        if (!a.deadline) return 1; if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      });
    } else if (sortBy === "budget") {
      arr = [...arr].sort((a,b) => (b.budget_max ?? b.budget_min ?? 0) - (a.budget_max ?? a.budget_min ?? 0));
    }
    return arr;
  }, [items, filter, q, budgetMin, budgetMax, dateFrom, dateTo, sortBy]);

  function resetFilters() {
    setQ(""); setBudgetMin(""); setBudgetMax(""); setDateFrom(""); setDateTo(""); setFilter("all"); setSortBy("newest");
  }

  if (shopLoading || loading) {
    return <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>;
  }

  const hasFilters = q || budgetMin || budgetMax || dateFrom || dateTo || filter !== "all" || sortBy !== "newest";

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><FileText className="h-5 w-5" /> Permintaan Custom Order</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Brief pesanan khusus dari pembeli untuk produk yang menerima custom order.</p>
      </div>

      {/* Search & filter toolbar */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="grid gap-2 sm:grid-cols-[1fr_auto] items-center">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-8" value={q} onChange={e => setQ(e.target.value)} placeholder="Cari nama, nomor WA, atau brief…" />
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
            className="h-9 rounded-md border border-input bg-transparent px-2 text-sm">
            <option value="newest">Terbaru</option>
            <option value="deadline">Deadline terdekat</option>
            <option value="budget">Budget tertinggi</option>
          </select>
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          <div>
            <label className="text-[11px] text-muted-foreground">Budget min</label>
            <Input type="number" value={budgetMin} onChange={e => setBudgetMin(e.target.value)} placeholder="0" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Budget max</label>
            <Input type="number" value={budgetMax} onChange={e => setBudgetMax(e.target.value)} placeholder="∞" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Dari tanggal</label>
            <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground">Sampai tanggal</label>
            <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setFilter("all")} className={`px-3 py-1 rounded-full text-xs font-medium ${filter==="all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Semua ({items.length})</button>
          {STATUS.map(s => (
            <button key={s.v} onClick={() => setFilter(s.v)} className={`px-3 py-1 rounded-full text-xs font-medium ${filter===s.v ? "bg-primary text-primary-foreground" : s.cls}`}>{s.l} ({items.filter(i => i.status === s.v).length})</button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} hasil</span>
          {hasFilters && (
            <Button size="sm" variant="ghost" onClick={resetFilters}><X className="h-3 w-3 mr-1" /> Reset</Button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Tidak ada permintaan yang cocok dengan filter.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const st = STATUS.find(s => s.v === r.status) ?? STATUS[0];
            const tlOpen = !!openTimeline[r.id];
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-semibold">{r.customer_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <Phone className="h-3 w-3" /> {r.customer_contact}
                      <span>•</span>
                      <span>{new Date(r.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span>
                    </div>
                  </div>
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${st.cls}`}>{st.l}</span>
                </div>

                <p className="text-sm whitespace-pre-wrap">{r.description}</p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {(r.budget_min || r.budget_max) && (
                    <span>Budget: Rp {(r.budget_min ?? 0).toLocaleString("id-ID")} – Rp {(r.budget_max ?? 0).toLocaleString("id-ID")}</span>
                  )}
                  {r.deadline && (
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Deadline: {new Date(r.deadline).toLocaleDateString("id-ID")}</span>
                  )}
                  {r.reference_image_url && (
                    <a href={r.reference_image_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      <ImageIcon className="h-3 w-3" /> Lihat referensi <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {editing === r.id ? (
                  <div className="space-y-2">
                    <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Catatan internal…" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveNote(r.id)}>Simpan</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Batal</Button>
                    </div>
                  </div>
                ) : r.owner_note ? (
                  <div className="text-xs bg-muted/40 rounded-md p-2">
                    <span className="font-medium">Catatan: </span>{r.owner_note}
                    <button className="ml-2 text-primary hover:underline" onClick={() => { setEditing(r.id); setNote(r.owner_note ?? ""); }}>Edit</button>
                  </div>
                ) : (
                  <button className="text-xs text-primary hover:underline" onClick={() => { setEditing(r.id); setNote(""); }}>+ Tambah catatan</button>
                )}

                <div className="border-t border-border pt-3 space-y-2">
                  <Textarea
                    rows={2}
                    placeholder="Catatan untuk pelanggan saat ubah status (opsional, akan dikirim via WA)…"
                    value={statusNote}
                    onChange={e => setStatusNote(e.target.value)}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <a href={waLink(r.customer_contact, `Halo ${r.customer_name}, mengenai brief custom order kamu di ${shop?.name ?? ""}…`)} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="outline">Hubungi WhatsApp</Button>
                    </a>
                    {r.status === "pending" && (
                      <>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => changeStatus(r, "accepted")}>Terima &amp; kirim WA</Button>
                        <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => changeStatus(r, "rejected")}>Tolak &amp; kirim WA</Button>
                      </>
                    )}
                    {r.status === "accepted" && (
                      <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={() => changeStatus(r, "in_progress")}>Mulai dikerjakan &amp; kirim WA</Button>
                    )}
                    {(r.status === "accepted" || r.status === "in_progress") && (
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => changeStatus(r, "completed")}>Tandai selesai &amp; kirim WA</Button>
                    )}
                    {(r.status === "rejected" || r.status === "completed") && (
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(r.id, "pending")}>Buka kembali</Button>
                    )}
                  </div>
                </div>

                {(r.status === "in_progress" || r.status === "completed") && (
                  <div className="border-t border-border pt-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <PackageCheck className="h-4 w-4 text-emerald-600" /> Kirim Hasil Kerja
                    </div>
                    {r.delivery_file_url && (
                      <a href={r.delivery_file_url} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                        <Download className="h-3.5 w-3.5" /> File terkirim — lihat
                      </a>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <Input
                        value={deliveryUrl[r.id] ?? r.delivery_file_url ?? ""}
                        onChange={e => setDeliveryUrl(prev => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="URL file (Google Drive, Dropbox, dll.)"
                        className="flex-1 min-w-0 text-xs h-8"
                      />
                      <Button size="sm" variant="outline" className="h-8 shrink-0"
                        onClick={() => deliveryFileRef.current && (deliveryFileRef.current.dataset.rid = r.id) && deliveryFileRef.current.click()}
                        disabled={uploadingDelivery === r.id}>
                        {uploadingDelivery === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                    <Textarea rows={2} placeholder="Catatan pengiriman untuk pelanggan (opsional)…"
                      value={deliveryNote[r.id] ?? r.delivery_note ?? ""}
                      onChange={e => setDeliveryNote(prev => ({ ...prev, [r.id]: e.target.value }))}
                    />
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => saveDelivery(r.id)} disabled={savingDelivery === r.id}>
                      {savingDelivery === r.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <PackageCheck className="h-3.5 w-3.5 mr-1" />}
                      Kirim Hasil Kerja
                    </Button>
                  </div>
                )}

                <div className="border-t border-border pt-2">
                  <button onClick={() => toggleTimeline(r.id)} className="text-xs flex items-center gap-1 text-primary hover:underline">
                    <History className="h-3 w-3" />
                    {tlOpen ? "Sembunyikan riwayat" : "Lihat riwayat status"}
                    {tlOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {tlOpen && (
                    <div className="mt-3">
                      {historyCache[r.id] ? (
                        <CustomOrderTimeline history={historyCache[r.id]} />
                      ) : (
                        <div className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Memuat riwayat…</div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <input
        ref={deliveryFileRef}
        type="file"
        className="hidden"
        onChange={e => {
          const rid = deliveryFileRef.current?.dataset.rid;
          const file = e.target.files?.[0];
          if (rid && file) uploadDeliveryFile(rid, file);
          if (deliveryFileRef.current) deliveryFileRef.current.value = "";
        }}
      />
    </div>
  );
}
