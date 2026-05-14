import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Loader2, Plus, Crown, Trash2, Users, Sparkles, X, Check, Tag, Clock, Percent } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/membership")({
  head: () => ({ meta: [{ title: "Membership Toko" }] }),
  component: MembershipPage,
});

type Tier = {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  discount_percent: number;
  perks: string[];
  is_active: boolean;
  sort_order: number;
};

const EMPTY: Partial<Tier> = {
  name: "",
  description: "",
  price: 50000,
  duration_days: 30,
  discount_percent: 5,
  perks: [],
  is_active: true,
  sort_order: 0,
};

function MembershipPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [members, setMembers] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Tier>>(EMPTY);
  const [perkText, setPerkText] = useState("");

  const load = async () => {
    if (!shop) return;
    setLoading(true);
    const { data } = await supabase
      .from("shop_membership_tiers" as any)
      .select("*")
      .eq("shop_id", shop.id)
      .order("sort_order", { ascending: true });
    setTiers(((data as any) ?? []).map((t: any) => ({ ...t, perks: Array.isArray(t.perks) ? t.perks : [] })));
    const { count } = await supabase
      .from("customer_memberships" as any)
      .select("id", { count: "exact", head: true })
      .eq("shop_id", shop.id)
      .eq("status", "active");
    setMembers(count ?? 0);
    setLoading(false);
  };

  useEffect(() => { if (!shopLoading) load(); }, [shop?.id, shopLoading]);

  const openNew = () => { setForm(EMPTY); setPerkText(""); setOpen(true); };
  const openEdit = (t: Tier) => {
    setForm(t);
    setPerkText((t.perks || []).join("\n"));
    setOpen(true);
  };

  const save = async () => {
    if (!shop || !form.name || !form.price) {
      toast.error("Nama dan harga wajib diisi");
      return;
    }
    setSaving(true);
    const perks = perkText.split("\n").map(s => s.trim()).filter(Boolean);
    const payload = {
      shop_id: shop.id,
      name: form.name,
      description: form.description || null,
      price: Number(form.price),
      duration_days: Number(form.duration_days || 30),
      discount_percent: Number(form.discount_percent || 0),
      perks,
      is_active: form.is_active ?? true,
      sort_order: Number(form.sort_order || 0),
    };
    const q = form.id
      ? supabase.from("shop_membership_tiers" as any).update(payload).eq("id", form.id)
      : supabase.from("shop_membership_tiers" as any).insert(payload);
    const { error } = await q;
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tier tersimpan");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus tier ini?")) return;
    const { error } = await supabase.from("shop_membership_tiers" as any).delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Dihapus"); load(); }
  };

  if (shopLoading || loading) {
    return <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Crown className="h-6 w-6 text-amber-500" /> Membership Toko</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tawarkan paket berlangganan dengan diskon & perks khusus untuk pelanggan setia.</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />Tambah Tier</Button>
      </div>

      <Card className="p-4 flex items-center gap-3">
        <Users className="h-5 w-5 text-primary" />
        <div>
          <p className="text-xs text-muted-foreground">Member aktif saat ini</p>
          <p className="text-xl font-bold">{members}</p>
        </div>
      </Card>

      {tiers.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Belum ada tier membership. Mulai dengan menambahkan tier pertama.
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {tiers.map(t => (
            <Card key={t.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold flex items-center gap-2">{t.name}{!t.is_active && <Badge variant="secondary" className="text-xs">Nonaktif</Badge>}</p>
                  <p className="text-2xl font-bold mt-1">{formatIDR(t.price)}<span className="text-xs font-normal text-muted-foreground">/{t.duration_days} hari</span></p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(t)}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </div>
              {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
              <div className="flex flex-wrap gap-1.5">
                {t.discount_percent > 0 && <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Diskon {t.discount_percent}%</Badge>}
                {t.perks.map((p, i) => <Badge key={i} variant="outline" className="text-xs">{p}</Badge>)}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{form.id ? "Edit Tier" : "Tier Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nama Tier</Label>
              <Input value={form.name ?? ""} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Gold, Premium, VIP..." />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea rows={2} value={form.description ?? ""} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi singkat" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Harga (Rp)</Label>
                <Input type="number" value={form.price ?? 0} onChange={e => setForm({ ...form, price: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Durasi (hari)</Label>
                <Input type="number" value={form.duration_days ?? 30} onChange={e => setForm({ ...form, duration_days: Number(e.target.value) })} />
              </div>
            </div>
            <div>
              <Label>Diskon Otomatis (%)</Label>
              <Input type="number" min={0} max={100} value={form.discount_percent ?? 0} onChange={e => setForm({ ...form, discount_percent: Number(e.target.value) })} />
              <p className="text-xs text-muted-foreground mt-1">Diberikan otomatis di setiap pesanan member.</p>
            </div>
            <div>
              <Label>Perks / Keuntungan (1 baris = 1 perk)</Label>
              <Textarea rows={4} value={perkText} onChange={e => setPerkText(e.target.value)} placeholder={"Free delivery\nPrioritas antrian\nGratis 1 kopi tiap bulan"} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Aktif</Label>
              <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm({ ...form, is_active: v })} />
            </div>
            <Button onClick={save} disabled={saving} className="w-full gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
