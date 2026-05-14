import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Ruler, Plus, Pencil, Trash2, Loader2, Save, ChevronRight, RefreshCw, Calculator } from "lucide-react";

export const Route = createFileRoute("/pos-app/size-guide")({
  head: () => ({ meta: [{ title: "Panduan Ukuran Interaktif" }] }),
  component: SizeGuidePage,
});

type SizeRow = {
  label: string;
  chest: string;
  waist: string;
  hips: string;
  height_min: string;
  height_max: string;
};

type SizeChart = {
  id: string;
  name: string;
  description: string | null;
  unit: "cm" | "inch";
  is_active: boolean;
  rows: SizeRow[];
};

const SQL_HINT = `CREATE TABLE IF NOT EXISTS public.shop_size_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  unit text NOT NULL DEFAULT 'cm',
  is_active boolean NOT NULL DEFAULT true,
  rows jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);`;

const DEFAULT_ROWS: SizeRow[] = [
  { label: "XS", chest: "80-84",  waist: "60-64",  hips: "85-89",  height_min: "150", height_max: "158" },
  { label: "S",  chest: "84-88",  waist: "64-68",  hips: "89-93",  height_min: "158", height_max: "163" },
  { label: "M",  chest: "88-92",  waist: "68-72",  hips: "93-97",  height_min: "163", height_max: "168" },
  { label: "L",  chest: "92-96",  waist: "72-76",  hips: "97-101", height_min: "168", height_max: "173" },
  { label: "XL", chest: "96-100", waist: "76-80",  hips: "101-105", height_min: "173", height_max: "178" },
];

function suggestSize(height: number, chest: number, rows: SizeRow[]): string | null {
  for (const r of rows) {
    const hMin = Number(r.height_min) || 0;
    const hMax = Number(r.height_max) || 999;
    const cRange = r.chest.split("-").map(Number);
    if (height >= hMin && height <= hMax && chest >= (cRange[0] || 0) && chest <= (cRange[1] || 999)) {
      return r.label;
    }
  }
  return null;
}

export default function SizeGuidePage() {
  const { shop } = useCurrentShop();
  const [charts, setCharts] = useState<SizeChart[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SizeChart | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", unit: "cm" as const, is_active: true });
  const [rows, setRows] = useState<SizeRow[]>(DEFAULT_ROWS);

  // Calculator state
  const [calcHeight, setCalcHeight] = useState("");
  const [calcChest, setCalcChest] = useState("");
  const [calcResult, setCalcResult] = useState<string | null>(null);
  const [calcChartId, setCalcChartId] = useState<string | null>(null);

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("shop_size_charts").select("*").eq("shop_id", shopId).order("created_at");
    if (error?.message?.includes("exist")) setShowSql(true);
    setCharts((data ?? []) as SizeChart[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const openNew = () => { setEditing(null); setForm({ name: "Size Chart Utama", description: "", unit: "cm", is_active: true }); setRows(DEFAULT_ROWS); setOpen(true); };
  const openEdit = (c: SizeChart) => { setEditing(c); setForm({ name: c.name, description: c.description ?? "", unit: c.unit, is_active: c.is_active }); setRows(c.rows); setOpen(true); };

  const save = async () => {
    if (!shop || !form.name.trim()) { toast.error("Nama wajib diisi"); return; }
    setSaving(true);
    try {
      const payload = { shop_id: shop.id, name: form.name, description: form.description || null, unit: form.unit, is_active: form.is_active, rows };
      if (editing) { await (supabase as any).from("shop_size_charts").update(payload).eq("id", editing.id); }
      else { await (supabase as any).from("shop_size_charts").insert(payload); }
      toast.success("Size chart disimpan");
      setOpen(false);
      load(shop.id);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal"); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    await (supabase as any).from("shop_size_charts").delete().eq("id", id);
    setCharts(prev => prev.filter(x => x.id !== id));
    toast.success("Dihapus");
  };

  const calc = () => {
    const chart = charts.find(c => c.id === calcChartId) ?? charts[0];
    if (!chart) return;
    const result = suggestSize(Number(calcHeight), Number(calcChest), chart.rows);
    setCalcResult(result ?? "Tidak ditemukan");
  };

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><Ruler className="h-5 w-5 text-primary" /> Panduan Ukuran Interaktif</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Buat size chart interaktif — pelanggan masukkan tinggi & lingkar dada, sistem sarankan ukuran yang tepat.</p>
        </div>
        <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Buat Size Chart</Button>
      </div>

      {showSql && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Tabel belum ada. Jalankan:</p>
          <pre className="mt-2 text-xs font-mono bg-amber-100 p-2 rounded overflow-x-auto">{SQL_HINT}</pre>
        </div>
      )}

      {/* Calculator demo */}
      {charts.length > 0 && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
          <p className="font-semibold flex items-center gap-2"><Calculator className="h-4 w-4 text-primary" /> Preview Kalkulator Ukuran (tampil di halaman toko)</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs">Tinggi (cm)</Label>
              <Input className="w-24 h-8 text-sm" type="number" value={calcHeight} onChange={e => setCalcHeight(e.target.value)} placeholder="165" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Lingkar Dada (cm)</Label>
              <Input className="w-28 h-8 text-sm" type="number" value={calcChest} onChange={e => setCalcChest(e.target.value)} placeholder="88" />
            </div>
            <Button size="sm" onClick={calc} disabled={!calcHeight || !calcChest}>
              <ChevronRight className="h-3.5 w-3.5 mr-1" /> Cari Ukuran
            </Button>
            {calcResult && (
              <div className="flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-1.5 text-sm font-bold">
                Ukuran Kamu: {calcResult}
              </div>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : charts.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <Ruler className="mx-auto h-10 w-10 opacity-30 mb-3" />
          <p className="font-medium">Belum ada size chart</p>
          <Button className="mt-4 gap-1.5" onClick={openNew}><Plus className="h-4 w-4" /> Buat Size Chart</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {charts.map(c => (
            <div key={c.id} className={`rounded-xl border bg-card overflow-hidden ${!c.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => del(c.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {["Size","Dada","Pinggang","Pinggul","Tinggi Min","Tinggi Max"].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {c.rows.map(r => (
                      <tr key={r.label}>
                        <td className="px-3 py-2 font-bold">{r.label}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.chest} {c.unit}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.waist} {c.unit}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.hips} {c.unit}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.height_min}</td>
                        <td className="px-3 py-2 text-muted-foreground">{r.height_max}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Size Chart" : "Buat Size Chart"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nama <span className="text-destructive">*</span></Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Satuan</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value as "cm" | "inch" }))}>
                  <option value="cm">cm</option>
                  <option value="inch">inch</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data Ukuran</Label>
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50">
                    <tr>
                      {["Size","Dada","Pinggang","Pinggul","Tinggi Min","Tinggi Max",""].map(h => (
                        <th key={h} className="px-2 py-1.5 text-left font-semibold text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {rows.map((r, i) => (
                      <tr key={i}>
                        {(["label","chest","waist","hips","height_min","height_max"] as (keyof SizeRow)[]).map(k => (
                          <td key={k} className="px-1 py-1">
                            <Input className="h-7 text-xs" value={r[k]} onChange={e => { const nr = [...rows]; nr[i] = { ...nr[i], [k]: e.target.value }; setRows(nr); }} />
                          </td>
                        ))}
                        <td className="px-1 py-1">
                          <button onClick={() => setRows(prev => prev.filter((_, j) => j !== i))} className="text-destructive hover:opacity-70 text-xs px-1">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setRows(p => [...p, { label: "", chest: "", waist: "", hips: "", height_min: "", height_max: "" }])} className="gap-1 text-xs">
                <Plus className="h-3 w-3" /> Tambah Baris
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Tampilkan di halaman toko</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
