import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "textarea" | "number" | "url" | "image";
  required?: boolean;
};

type Row = Record<string, unknown> & { id: string; shop_id: string };

export function SimpleCRUD({
  table, title, subtitle, icon, fields, renderItem, defaults,
}: {
  table: "umroh_facilities" | "umroh_faqs" | "sales_offerings" | "flyers" | "testimonials";
  title: string;
  subtitle: string;
  icon: ReactNode;
  fields: FieldDef[];
  renderItem: (r: Row) => ReactNode;
  defaults?: Record<string, unknown>;
}) {
  const { shop, loading } = useCurrentShop();
  const [items, setItems] = useState<Row[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!shop) return;
    const { data } = await supabase.from(table).select("*").eq("shop_id", shop.id).order("sort_order");
    setItems((data ?? []) as Row[]);
  }
  useEffect(() => { void load(); }, [shop?.id]);

  function startNew() {
    setEditing(null);
    const f: Record<string, string> = {};
    fields.forEach((fd) => { f[fd.key] = ""; });
    setForm(f);
    setOpen(true);
  }
  function startEdit(r: Row) {
    setEditing(r);
    const f: Record<string, string> = {};
    fields.forEach((fd) => { f[fd.key] = (r[fd.key] ?? "").toString(); });
    setForm(f);
    setOpen(true);
  }

  async function save() {
    if (!shop) return;
    for (const fd of fields) if (fd.required && !form[fd.key]?.trim()) { toast.error(`${fd.label} wajib`); return; }
    setSaving(true);
    const payload: Record<string, unknown> = { shop_id: shop.id, ...(defaults ?? {}) };
    fields.forEach((fd) => {
      const v = form[fd.key];
      if (fd.type === "number") payload[fd.key] = v ? Number(v) : null;
      else payload[fd.key] = v?.trim() ? v.trim() : (fd.required ? v : null);
    });
    const { error } = editing
      ? await supabase.from(table).update(payload).eq("id", editing.id)
      : await supabase.from(table).insert(payload as never);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tersimpan");
    setOpen(false);
    void load();
  }

  async function del(r: Row) {
    if (!confirm("Hapus?")) return;
    const { error } = await supabase.from(table).delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dihapus");
    void load();
  }

  if (loading || !shop) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">{icon}{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Belum ada data.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => (
            <Card key={r.id} className="p-4">
              {renderItem(r)}
              <div className="flex gap-2 mt-3">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => startEdit(r)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                <Button size="sm" variant="outline" onClick={() => del(r)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit" : "Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {fields.map((fd) => (
              <div key={fd.key}>
                <Label>{fd.label}{fd.required && <span className="text-destructive"> *</span>}</Label>
                {fd.type === "textarea" ? (
                  <Textarea value={form[fd.key] ?? ""} onChange={(e) => setForm({ ...form, [fd.key]: e.target.value })} />
                ) : (
                  <Input type={fd.type === "number" ? "number" : "text"} value={form[fd.key] ?? ""} onChange={(e) => setForm({ ...form, [fd.key]: e.target.value })} />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
