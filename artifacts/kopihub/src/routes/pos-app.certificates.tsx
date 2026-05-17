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
import { Award, Plus, Loader2, Search, Printer, RefreshCw, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/pos-app/certificates")({
  head: () => ({ meta: [{ title: "Certificate of Authenticity" }] }),
  component: CertificatesPage,
});

type Certificate = {
  id: string;
  product_name: string;
  edition: string | null;
  serial_no: string;
  materials: string | null;
  dimensions: string | null;
  creation_year: string | null;
  buyer_name: string | null;
  sale_date: string | null;
  notes: string | null;
  created_at: string;
};

const SQL_HINT = `CREATE TABLE IF NOT EXISTS public.authenticity_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  edition text,
  serial_no text NOT NULL,
  materials text,
  dimensions text,
  creation_year text,
  buyer_name text,
  sale_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);`;

function genSerial() {
  return `COA-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

export default function CertificatesPage() {
  const { shop } = useCurrentShop();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<Certificate | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    product_name: "", edition: "", serial_no: genSerial(), materials: "",
    dimensions: "", creation_year: new Date().getFullYear().toString(),
    buyer_name: "", sale_date: "", notes: "",
  });

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("authenticity_certificates").select("*").eq("shop_id", shopId)
      .order("created_at", { ascending: false });
    if (error?.message?.includes("exist")) setShowSql(true);
    setCerts((data ?? []) as Certificate[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const save = async () => {
    if (!shop || !form.product_name.trim()) { toast.error("Nama produk wajib diisi"); return; }
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("authenticity_certificates").insert({
        shop_id: shop.id,
        product_name: form.product_name.trim(),
        edition: form.edition.trim() || null,
        serial_no: form.serial_no,
        materials: form.materials.trim() || null,
        dimensions: form.dimensions.trim() || null,
        creation_year: form.creation_year.trim() || null,
        buyer_name: form.buyer_name.trim() || null,
        sale_date: form.sale_date || null,
        notes: form.notes.trim() || null,
      });
      if (error) throw error;
      toast.success("Sertifikat COA diterbitkan");
      setOpen(false);
      load(shop.id);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal"); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    await (supabase as any).from("authenticity_certificates").delete().eq("id", id);
    setCerts(prev => prev.filter(x => x.id !== id));
    toast.success("Sertifikat dihapus");
  };

  const filtered = certs.filter(c =>
    !search.trim() || c.product_name.toLowerCase().includes(search.toLowerCase()) || c.serial_no.toLowerCase().includes(search.toLowerCase())
  );

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><Award className="h-5 w-5 text-primary" /> Certificate of Authenticity</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Terbitkan COA digital untuk setiap karya — bukti keaslian & kepemilikan.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load(shop.id)}><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button onClick={() => { setForm(f => ({ ...f, serial_no: genSerial(), product_name: "", buyer_name: "", sale_date: "" })); setOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> Terbitkan COA
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
        <Input className="pl-9" placeholder="Cari nama produk atau nomor COA..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <Award className="mx-auto h-10 w-10 opacity-30 mb-3" />
          <p className="font-medium">Belum ada COA diterbitkan</p>
          <Button className="mt-4 gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Terbitkan COA Pertama</Button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map(c => (
            <div key={c.id} className="rounded-xl border bg-card p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{c.product_name}</p>
                  {c.edition && <Badge variant="secondary" className="text-xs mt-0.5">{c.edition}</Badge>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setPreview(c)}><Printer className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <p className="text-xs font-mono text-muted-foreground">{c.serial_no}</p>
              {c.buyer_name && <p className="text-xs text-muted-foreground">Pembeli: {c.buyer_name}</p>}
              {c.materials && <p className="text-xs text-muted-foreground">Material: {c.materials}</p>}
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Terbitkan COA Baru</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              {([
                ["product_name","Nama Karya/Produk *","Batik Mega Mendung #7"],
                ["edition","Edisi/Seri","Limited Ed. 2024"],
                ["serial_no","Nomor Sertifikat *","COA-..."],
                ["creation_year","Tahun Pembuatan","2024"],
                ["materials","Material","Kain batik sutra"],
                ["dimensions","Dimensi","200cm × 110cm"],
                ["buyer_name","Nama Pembeli","Budi Santoso"],
                ["sale_date","Tanggal Jual",""],
              ] as [string, string, string][]).map(([k, l, p]) => (
                <div key={k} className="space-y-1.5">
                  <Label>{l}</Label>
                  <Input type={k === "sale_date" ? "date" : "text"}
                    value={(form as Record<string, string>)[k]} placeholder={p}
                    onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label>Catatan Tambahan</Label>
              <Textarea rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button disabled={saving} onClick={save}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Award className="h-4 w-4 mr-2" />}
              Terbitkan COA
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {preview && (
        <Dialog open onOpenChange={() => setPreview(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Preview COA</DialogTitle></DialogHeader>
            <div className="text-center space-y-4 py-4 border rounded-xl p-6 bg-gradient-to-br from-amber-50 to-orange-50">
              <Award className="mx-auto h-10 w-10 text-amber-600" />
              <h2 className="text-lg font-bold uppercase tracking-wide">Certificate of Authenticity</h2>
              <p className="text-sm font-semibold text-amber-800">{shop.name}</p>
              <div className="space-y-1 text-sm">
                <p className="text-xl font-bold mt-2">{preview.product_name}</p>
                {preview.edition && <p className="text-muted-foreground">{preview.edition}</p>}
              </div>
              <div className="rounded-lg bg-white/80 p-3 text-xs space-y-1 text-left">
                {preview.materials && <p><span className="font-semibold">Material:</span> {preview.materials}</p>}
                {preview.dimensions && <p><span className="font-semibold">Dimensi:</span> {preview.dimensions}</p>}
                {preview.creation_year && <p><span className="font-semibold">Tahun:</span> {preview.creation_year}</p>}
                {preview.buyer_name && <p><span className="font-semibold">Pemilik:</span> {preview.buyer_name}</p>}
              </div>
              <p className="text-xs font-mono font-bold tracking-widest text-muted-foreground">{preview.serial_no}</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreview(null)}>Tutup</Button>
              <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Cetak</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
