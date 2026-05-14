import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
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
import { FileText, Plus, Loader2, RefreshCw, Printer, Search, X, CheckCircle2, Trash2 } from "lucide-react";

export const Route = createFileRoute("/pos-app/medical-invoice")({
  head: () => ({ meta: [{ title: "Tagihan & Resep Digital" }] }),
  component: MedicalInvoicePage,
});

type MedItem = { name: string; qty: string; unit: string; price: string; notes: string };
type MedInvoice = {
  id: string;
  patient_name: string;
  patient_dob: string | null;
  doctor_name: string | null;
  visit_date: string;
  diagnosis: string | null;
  prescription: string | null;
  items: MedItem[];
  total: number;
  paid: boolean;
  created_at: string;
};

const SQL_HINT = `CREATE TABLE IF NOT EXISTS public.medical_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  patient_dob date,
  doctor_name text,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  diagnosis text,
  prescription text,
  items jsonb NOT NULL DEFAULT '[]',
  total numeric(12,2) NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);`;

function fmtDate(d: string) { return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }); }

export default function MedicalInvoicePage() {
  const { shop } = useCurrentShop();
  const [invoices, setInvoices] = useState<MedInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [printing, setPrinting] = useState<MedInvoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patient_name: "", patient_dob: "", doctor_name: "", visit_date: new Date().toISOString().split("T")[0],
    diagnosis: "", prescription: "",
  });
  const [items, setItems] = useState<MedItem[]>([{ name: "", qty: "1", unit: "kali", price: "", notes: "" }]);

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("medical_invoices").select("*").eq("shop_id", shopId)
      .order("created_at", { ascending: false }).limit(100);
    if (error?.message?.includes("exist")) setShowSql(true);
    setInvoices((data ?? []) as MedInvoice[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const total = items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 1), 0);

  const save = async () => {
    if (!shop || !form.patient_name.trim()) { toast.error("Nama pasien wajib diisi"); return; }
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("medical_invoices").insert({
        shop_id: shop.id, ...form,
        patient_dob: form.patient_dob || null,
        doctor_name: form.doctor_name.trim() || null,
        diagnosis: form.diagnosis.trim() || null,
        prescription: form.prescription.trim() || null,
        items: items.filter(i => i.name.trim()),
        total,
      });
      if (error) throw error;
      toast.success("Tagihan disimpan");
      setOpen(false);
      load(shop.id);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal"); }
    finally { setSaving(false); }
  };

  const markPaid = async (id: string) => {
    await (supabase as any).from("medical_invoices").update({ paid: true }).eq("id", id);
    setInvoices(prev => prev.map(x => x.id === id ? { ...x, paid: true } : x));
    toast.success("Tagihan ditandai lunas");
  };

  const filtered = invoices.filter(inv =>
    !search.trim() || inv.patient_name.toLowerCase().includes(search.toLowerCase())
  );

  const PrintModal = printing ? (
    <Dialog open onOpenChange={() => setPrinting(null)}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Preview Tagihan & Resep</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2 text-sm" id="print-area">
          <div className="text-center border-b pb-3">
            <p className="font-bold text-lg">{shop?.name}</p>
            <p className="text-xs text-muted-foreground">Tagihan & Resep Digital</p>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div><span className="text-muted-foreground">Pasien:</span> <span className="font-medium">{printing.patient_name}</span></div>
            <div><span className="text-muted-foreground">Tanggal:</span> <span>{fmtDate(printing.visit_date)}</span></div>
            {printing.doctor_name && <div><span className="text-muted-foreground">Dokter:</span> <span>{printing.doctor_name}</span></div>}
          </div>
          {printing.diagnosis && (
            <div className="rounded-lg bg-muted/30 border p-2.5 text-xs">
              <p className="font-semibold text-muted-foreground mb-1">Diagnosis</p>
              <p>{printing.diagnosis}</p>
            </div>
          )}
          {printing.prescription && (
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-2.5 text-xs">
              <p className="font-semibold text-blue-700 mb-1">R/ Resep</p>
              <pre className="font-sans whitespace-pre-wrap">{printing.prescription}</pre>
            </div>
          )}
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Rincian Tagihan</p>
            {printing.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span>{item.qty} {item.unit} {item.name} {item.notes && <span className="text-muted-foreground">({item.notes})</span>}</span>
                <span>{formatIDR(Number(item.price) * Number(item.qty))}</span>
              </div>
            ))}
            <div className="flex justify-between font-bold border-t pt-1">
              <span>Total</span>
              <span>{formatIDR(printing.total)}</span>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPrinting(null)}>Tutup</Button>
          <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Cetak</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><FileText className="h-5 w-5 text-primary" /> Tagihan & Resep Digital</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Buat tagihan dan resep digital untuk pasien — dapat dicetak atau dikirim via WA.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load(shop.id)}><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button onClick={() => { setForm({ patient_name: "", patient_dob: "", doctor_name: "", visit_date: new Date().toISOString().split("T")[0], diagnosis: "", prescription: "" }); setItems([{ name: "", qty: "1", unit: "kali", price: "", notes: "" }]); setOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> Buat Tagihan
          </Button>
        </div>
      </div>

      {showSql && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Tabel belum ada:</p>
          <pre className="mt-2 text-xs font-mono bg-amber-100 p-2 rounded overflow-x-auto">{SQL_HINT}</pre>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cari nama pasien..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <FileText className="mx-auto h-8 w-8 opacity-30 mb-2" />
          <p className="text-sm">Belum ada tagihan. Buat tagihan pertama untuk pasien.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(inv => (
            <div key={inv.id} className="flex items-center gap-4 rounded-xl border bg-card p-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{inv.patient_name}</span>
                  {inv.paid ? (
                    <Badge className="bg-green-100 text-green-700 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" /> Lunas</Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700 text-xs">Belum Lunas</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{fmtDate(inv.visit_date)}{inv.doctor_name && ` · Dr. ${inv.doctor_name}`} · {formatIDR(inv.total)}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                {!inv.paid && (
                  <Button size="sm" variant="outline" className="text-green-700 border-green-300 h-7 text-xs" onClick={() => markPaid(inv.id)}>
                    Lunas
                  </Button>
                )}
                <Button size="sm" variant="outline" className="h-7" onClick={() => setPrinting(inv)}>
                  <Printer className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Buat Tagihan & Resep</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nama Pasien *</Label>
                <Input value={form.patient_name} onChange={e => setForm(f => ({ ...f, patient_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Lahir</Label>
                <Input type="date" value={form.patient_dob} onChange={e => setForm(f => ({ ...f, patient_dob: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Nama Dokter/Terapis</Label>
                <Input value={form.doctor_name} onChange={e => setForm(f => ({ ...f, doctor_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Kunjungan</Label>
                <Input type="date" value={form.visit_date} onChange={e => setForm(f => ({ ...f, visit_date: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Diagnosis</Label>
              <Input value={form.diagnosis} onChange={e => setForm(f => ({ ...f, diagnosis: e.target.value }))} placeholder="Hipertensi, ISPA, dll." />
            </div>
            <div className="space-y-1.5">
              <Label>R/ Resep</Label>
              <Textarea rows={3} value={form.prescription} onChange={e => setForm(f => ({ ...f, prescription: e.target.value }))} placeholder="Amoxicillin 500mg 3x1&#10;Paracetamol 500mg 3x1 prn" />
            </div>
            <div className="space-y-2">
              <Label>Rincian Tagihan</Label>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-1.5 items-center">
                  <Input className="col-span-4 text-sm" value={item.name} onChange={e => { const ni = [...items]; ni[i].name = e.target.value; setItems(ni); }} placeholder="Nama layanan" />
                  <Input className="col-span-1 text-sm text-center" type="number" min={1} value={item.qty} onChange={e => { const ni = [...items]; ni[i].qty = e.target.value; setItems(ni); }} />
                  <Input className="col-span-2 text-sm" value={item.unit} onChange={e => { const ni = [...items]; ni[i].unit = e.target.value; setItems(ni); }} placeholder="kali" />
                  <Input className="col-span-4 text-sm" type="number" value={item.price} onChange={e => { const ni = [...items]; ni[i].price = e.target.value; setItems(ni); }} placeholder="Harga" />
                  <button onClick={() => setItems(prev => prev.filter((_, j) => j !== i))} className="col-span-1 text-destructive hover:opacity-70 text-sm flex justify-center">✕</button>
                </div>
              ))}
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setItems(p => [...p, { name: "", qty: "1", unit: "kali", price: "", notes: "" }])} className="gap-1 text-xs">
                  <Plus className="h-3 w-3" /> Tambah Item
                </Button>
                <span className="text-sm font-bold">Total: {formatIDR(total)}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-2" />}
              Simpan Tagihan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {PrintModal}
    </div>
  );
}
