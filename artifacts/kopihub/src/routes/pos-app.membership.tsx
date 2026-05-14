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

      <Dialog open={open} onOpenChange={(o) => !saving && setOpen(o)}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              {form.id ? "Edit Tier Membership" : "Tier Membership Baru"}
            </DialogTitle>
            <DialogDescription>
              Atur paket berlangganan yang bisa dibeli pelanggan untuk mendapat diskon & perks khusus.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Section: Basic */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <Tag className="h-3.5 w-3.5" /> Identitas
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-name">Nama Tier <span className="text-destructive">*</span></Label>
                <Input
                  id="tier-name"
                  value={form.name ?? ""}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Gold, Premium, VIP..."
                  maxLength={40}
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-desc">Deskripsi <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                <Textarea
                  id="tier-desc"
                  rows={2}
                  value={form.description ?? ""}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Misal: Untuk pelanggan setia yang sering nongkrong"
                  maxLength={160}
                />
                <p className="text-[11px] text-muted-foreground text-right">{(form.description ?? "").length}/160</p>
              </div>
            </div>

            <Separator />

            {/* Section: Pricing */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <Clock className="h-3.5 w-3.5" /> Harga & Durasi
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="tier-price">Harga <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">Rp</span>
                    <Input
                      id="tier-price"
                      type="number"
                      min={0}
                      step={1000}
                      className="pl-9"
                      value={form.price ?? 0}
                      onChange={e => setForm({ ...form, price: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tier-dur">Durasi (hari) <span className="text-destructive">*</span></Label>
                  <Input
                    id="tier-dur"
                    type="number"
                    min={1}
                    value={form.duration_days ?? 30}
                    onChange={e => setForm({ ...form, duration_days: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { l: "1 bln", v: 30 },
                  { l: "3 bln", v: 90 },
                  { l: "6 bln", v: 180 },
                  { l: "1 thn", v: 365 },
                ].map(p => (
                  <button
                    key={p.v}
                    type="button"
                    onClick={() => setForm({ ...form, duration_days: p.v })}
                    className={`text-xs rounded-full border px-2.5 py-1 transition-colors ${
                      Number(form.duration_days) === p.v
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background hover:bg-accent"
                    }`}
                  >
                    {p.l}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Section: Benefits */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <Sparkles className="h-3.5 w-3.5" /> Keuntungan Member
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tier-disc" className="flex items-center gap-1.5">
                  <Percent className="h-3.5 w-3.5" /> Diskon Otomatis
                </Label>
                <div className="relative">
                  <Input
                    id="tier-disc"
                    type="number"
                    min={0}
                    max={100}
                    className="pr-8"
                    value={form.discount_percent ?? 0}
                    onChange={e => setForm({ ...form, discount_percent: Number(e.target.value) })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">Diberikan otomatis di setiap pesanan member.</p>
              </div>

              <div className="space-y-1.5">
                <Label>Perks Tambahan</Label>
                <Textarea
                  rows={3}
                  value={perkText}
                  onChange={e => setPerkText(e.target.value)}
                  placeholder={"Free delivery\nPrioritas antrian\nGratis 1 kopi tiap bulan"}
                />
                <p className="text-xs text-muted-foreground">Satu baris = satu perk. Akan tampil sebagai badge.</p>
                {perkText.split("\n").map(s => s.trim()).filter(Boolean).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {perkText.split("\n").map(s => s.trim()).filter(Boolean).map((p, i) => (
                      <Badge key={i} variant="outline" className="text-xs gap-1 pr-1">
                        <Check className="h-3 w-3 text-green-600" />
                        {p}
                        <button
                          type="button"
                          onClick={() => {
                            const arr = perkText.split("\n").map(s => s.trim()).filter(Boolean);
                            arr.splice(i, 1);
                            setPerkText(arr.join("\n"));
                          }}
                          className="ml-0.5 rounded-full hover:bg-muted p-0.5"
                          aria-label="Hapus perk"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Section: Status */}
            <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 px-3 py-2.5">
              <div>
                <Label className="cursor-pointer">Aktif</Label>
                <p className="text-xs text-muted-foreground">
                  {form.is_active ? "Tier bisa dibeli pelanggan." : "Tersembunyi dari pelanggan."}
                </p>
              </div>
              <Switch checked={form.is_active ?? true} onCheckedChange={v => setForm({ ...form, is_active: v })} />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t bg-muted/30 sm:justify-between gap-2">
            <div className="text-xs text-muted-foreground hidden sm:block">
              {form.price ? <>Harga: <span className="font-medium text-foreground">{formatIDR(Number(form.price))}</span> / {form.duration_days || 30} hari</> : "Lengkapi harga & durasi"}
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button variant="outline" onClick={() => setOpen(false)} disabled={saving} className="flex-1 sm:flex-none">Batal</Button>
              <Button onClick={save} disabled={saving} className="flex-1 sm:flex-none gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {form.id ? "Simpan Perubahan" : "Buat Tier"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
