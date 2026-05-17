import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/studio-photographers")({
  head: () => ({ meta: [{ title: "Tim Fotografer — Studio" }] }),
  component: Page,
});

type Photographer = {
  id: string; name: string; email: string | null; phone: string | null;
  role: string; color: string; is_active: boolean; notes: string | null;
};

const ROLES = [
  { v: "photographer", l: "Fotografer" },
  { v: "videographer", l: "Videografer" },
  { v: "editor", l: "Editor" },
  { v: "assistant", l: "Asisten" },
  { v: "stylist", l: "Stylist/MUA" },
];

const COLORS = ["#6366f1","#ec4899","#f59e0b","#10b981","#06b6d4","#8b5cf6","#ef4444","#84cc16"];

const EMPTY = { name: "", email: "", phone: "", role: "photographer", color: "#6366f1", is_active: true, notes: "" };

function Page() {
  const { shop, loading } = useCurrentShop();
  const [items, setItems] = useState<Photographer[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Photographer | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!shop) return;
    const { data } = await supabase.from("studio_photographers" as never)
      .select("*").eq("shop_id", shop.id).order("name");
    setItems((data ?? []) as Photographer[]);
  }
  useEffect(() => { void load(); }, [shop?.id]);

  function startNew() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function startEdit(p: Photographer) {
    setEditing(p);
    setForm({
      name: p.name, email: p.email ?? "", phone: p.phone ?? "",
      role: p.role, color: p.color, is_active: p.is_active, notes: p.notes ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!shop) return;
    if (!form.name.trim()) { toast.error("Nama wajib"); return; }
    setSaving(true);
    const payload = {
      shop_id: shop.id, name: form.name.trim(),
      email: form.email || null, phone: form.phone || null,
      role: form.role, color: form.color, is_active: form.is_active,
      notes: form.notes || null,
    };
    const { error } = editing
      ? await supabase.from("studio_photographers" as never).update(payload).eq("id", editing.id)
      : await supabase.from("studio_photographers" as never).insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tersimpan"); setOpen(false); void load();
  }

  async function del(p: Photographer) {
    if (!confirm(`Hapus ${p.name}?`)) return;
    const { error } = await supabase.from("studio_photographers" as never).delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dihapus"); void load();
  }

  async function toggleActive(p: Photographer) {
    const { error } = await supabase.from("studio_photographers" as never)
      .update({ is_active: !p.is_active }).eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    void load();
  }

  if (loading || !shop) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Users className="h-6 w-6" />Tim Fotografer</h1>
          <p className="text-sm text-muted-foreground">Kelola fotografer/videografer studio dan tugaskan ke galeri/booking</p>
        </div>
        <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
      </div>

      {items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">Belum ada anggota tim.</Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {items.map(p => (
            <Card key={p.id} className={`p-4 ${!p.is_active ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
                  style={{ background: p.color }}>{p.name.charAt(0).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold truncate">{p.name}</h3>
                    <Badge variant="outline" className="text-xs">{ROLES.find(r=>r.v===p.role)?.l ?? p.role}</Badge>
                  </div>
                  {p.phone && <p className="text-xs text-muted-foreground">{p.phone}</p>}
                  {p.email && <p className="text-xs text-muted-foreground truncate">{p.email}</p>}
                  {p.notes && <p className="text-xs mt-1">{p.notes}</p>}
                </div>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <label className="flex items-center gap-2 text-xs">
                  <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p)} />
                  {p.is_active ? "Aktif" : "Nonaktif"}
                </label>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => startEdit(p)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => del(p)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Anggota Tim" : "Tambah Anggota Tim"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Nama *</Label><Input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telepon</Label><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} /></div>
              <div><Label>Email</Label><Input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} /></div>
            </div>
            <div>
              <Label>Peran</Label>
              <Select value={form.role} onValueChange={v=>setForm({...form,role:v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map(r=><SelectItem key={r.v} value={r.v}>{r.l}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Warna Label</Label>
              <div className="flex gap-2 flex-wrap mt-1">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={()=>setForm({...form,color:c})}
                    className={`h-8 w-8 rounded-full border-2 ${form.color===c?"border-foreground":"border-transparent"}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
            <div><Label>Catatan</Label><Textarea rows={2} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} /></div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={form.is_active} onCheckedChange={v=>setForm({...form,is_active:v})} />Aktif
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving?"Menyimpan...":"Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
