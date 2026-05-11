import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Flag, Plus, Pencil, Trash2, RefreshCw, Store, Loader2, FlaskConical } from "lucide-react";

export const Route = createFileRoute("/admin/feature-flags")({ component: FeatureFlags });

type FeatureFlag = {
  id: string;
  key: string;
  label: string;
  description: string | null;
  enabled_global: boolean;
  enabled_for_plans: string[];
  enabled_for_shop_ids: string[];
  is_beta: boolean;
  created_at: string;
};

const PLAN_OPTIONS = ["free", "starter", "growth", "pro"];

const DEFAULT_FLAGS: Omit<FeatureFlag, "id" | "created_at">[] = [
  { key: "bulk_import_csv", label: "Bulk Import CSV", description: "Upload produk massal via CSV", enabled_global: true, enabled_for_plans: ["starter","growth","pro"], enabled_for_shop_ids: [], is_beta: false },
  { key: "digital_products", label: "Produk Digital", description: "Jual file digital dengan auto-deliver", enabled_global: true, enabled_for_plans: ["growth","pro"], enabled_for_shop_ids: [], is_beta: false },
  { key: "custom_domain", label: "Domain Kustom", description: "Hubungkan domain sendiri ke toko", enabled_global: false, enabled_for_plans: ["pro"], enabled_for_shop_ids: [], is_beta: false },
  { key: "storefront_builder", label: "Storefront Builder", description: "Drag-drop susun halaman toko", enabled_global: false, enabled_for_plans: ["pro"], enabled_for_shop_ids: [], is_beta: true },
  { key: "booking_system", label: "Sistem Booking", description: "Terima booking jadwal (untuk jasa)", enabled_global: true, enabled_for_plans: ["starter","growth","pro"], enabled_for_shop_ids: [], is_beta: false },
  { key: "rajaongkir_integration", label: "Integrasi RajaOngkir", description: "Ongkir real-time dari RajaOngkir", enabled_global: false, enabled_for_plans: ["growth","pro"], enabled_for_shop_ids: [], is_beta: true },
  { key: "command_palette", label: "Command Palette (⌘K)", description: "Pencarian cepat lintas modul", enabled_global: true, enabled_for_plans: ["free","starter","growth","pro"], enabled_for_shop_ids: [], is_beta: false },
  { key: "email_marketing", label: "Email Marketing", description: "Kirim promo ke daftar pelanggan toko", enabled_global: false, enabled_for_plans: ["pro"], enabled_for_shop_ids: [], is_beta: true },
];

const EMPTY: Omit<FeatureFlag, "id" | "created_at"> = {
  key: "",
  label: "",
  description: "",
  enabled_global: false,
  enabled_for_plans: [],
  enabled_for_shop_ids: [],
  is_beta: false,
};

export default function FeatureFlags() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<Partial<FeatureFlag> | null>(null);
  const [shopSearch, setShopSearch] = useState("");
  const [shopResults, setShopResults] = useState<{ id: string; name: string }[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "feature_flags")
      .maybeSingle();
    if (data?.value) {
      try { setFlags(JSON.parse(data.value as string)); } catch {}
    } else {
      // Seed defaults
      const seeds = DEFAULT_FLAGS.map((f, i) => ({ ...f, id: `default-${i}`, created_at: new Date().toISOString() }));
      setFlags(seeds);
    }
    setLoading(false);
  }

  async function persist(updated: FeatureFlag[]) {
    await supabase.from("platform_settings").upsert(
      { key: "feature_flags", value: JSON.stringify(updated) },
      { onConflict: "key" }
    );
  }

  useEffect(() => { load(); }, []);

  async function toggleGlobal(id: string, value: boolean) {
    const updated = flags.map(f => f.id === id ? { ...f, enabled_global: value } : f);
    setFlags(updated);
    setSaving(id);
    await persist(updated);
    setSaving(null);
    toast.success("Flag diperbarui");
  }

  async function save() {
    if (!editItem?.key || !editItem?.label) { toast.error("Key dan label wajib diisi"); return; }
    setSaving("dialog");
    const isNew = !editItem.id;
    const newFlag: FeatureFlag = {
      id: editItem.id ?? crypto.randomUUID(),
      created_at: editItem.created_at ?? new Date().toISOString(),
      key: editItem.key!,
      label: editItem.label!,
      description: editItem.description ?? null,
      enabled_global: editItem.enabled_global ?? false,
      enabled_for_plans: editItem.enabled_for_plans ?? [],
      enabled_for_shop_ids: editItem.enabled_for_shop_ids ?? [],
      is_beta: editItem.is_beta ?? false,
    };
    const updated = isNew ? [...flags, newFlag] : flags.map(f => f.id === newFlag.id ? newFlag : f);
    await persist(updated);
    setFlags(updated);
    setSaving(null);
    setDialogOpen(false);
    toast.success(isNew ? "Feature flag ditambahkan" : "Feature flag diperbarui");
  }

  async function doDelete() {
    if (!deleteId) return;
    const updated = flags.filter(f => f.id !== deleteId);
    await persist(updated);
    setFlags(updated);
    setDeleteId(null);
    toast.success("Flag dihapus");
  }

  async function searchShops(q: string) {
    if (!q.trim()) { setShopResults([]); return; }
    const { data } = await supabase.from("coffee_shops").select("id,name").ilike("name", `%${q}%`).limit(5);
    setShopResults(data ?? []);
  }

  function togglePlan(plan: string) {
    const plans = editItem?.enabled_for_plans ?? [];
    setEditItem(e => ({ ...e, enabled_for_plans: plans.includes(plan) ? plans.filter(p => p !== plan) : [...plans, plan] }));
  }

  function addShop(shop: { id: string; name: string }) {
    const ids = editItem?.enabled_for_shop_ids ?? [];
    if (!ids.includes(shop.id)) {
      setEditItem(e => ({ ...e, enabled_for_shop_ids: [...ids, shop.id] }));
    }
    setShopSearch("");
    setShopResults([]);
  }

  function removeShop(shopId: string) {
    setEditItem(e => ({ ...e, enabled_for_shop_ids: (e?.enabled_for_shop_ids ?? []).filter(id => id !== shopId) }));
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Flag className="h-5 w-5 text-primary" /> Feature Flags
          </h1>
          <p className="text-sm text-muted-foreground">Aktifkan / nonaktifkan fitur per paket atau per toko individual</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button size="sm" onClick={() => { setEditItem({ ...EMPTY }); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1.5" /> Tambah Flag
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-3">
          {flags.map(flag => (
            <Card key={flag.id} className="p-4">
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">{flag.label}</span>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{flag.key}</code>
                    {flag.is_beta && <Badge variant="secondary" className="text-xs"><FlaskConical className="h-3 w-3 mr-1" />Beta</Badge>}
                    {flag.enabled_global && <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Global Aktif</Badge>}
                  </div>
                  {flag.description && <p className="text-sm text-muted-foreground mt-0.5">{flag.description}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {flag.enabled_for_plans.map(p => (
                      <Badge key={p} variant="outline" className="text-xs capitalize">{p}</Badge>
                    ))}
                    {flag.enabled_for_shop_ids.length > 0 && (
                      <Badge variant="outline" className="text-xs">
                        <Store className="h-3 w-3 mr-1" />+{flag.enabled_for_shop_ids.length} toko khusus
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5">
                    {saving === flag.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                    <Switch
                      checked={flag.enabled_global}
                      onCheckedChange={v => toggleGlobal(flag.id, v)}
                      disabled={saving === flag.id}
                    />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8"
                    onClick={() => { setEditItem({ ...flag }); setDialogOpen(true); }}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(flag.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit / Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem?.id ? "Edit Feature Flag" : "Tambah Feature Flag"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Key (snake_case) *</Label>
              <Input placeholder="contoh: email_marketing" value={editItem?.key ?? ""} onChange={e => setEditItem(x => ({ ...x, key: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Label *</Label>
              <Input placeholder="Nama fitur" value={editItem?.label ?? ""} onChange={e => setEditItem(x => ({ ...x, label: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi</Label>
              <Textarea placeholder="Jelaskan apa yang dilakukan fitur ini..." value={editItem?.description ?? ""} onChange={e => setEditItem(x => ({ ...x, description: e.target.value }))} rows={2} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editItem?.enabled_global ?? false} onCheckedChange={v => setEditItem(x => ({ ...x, enabled_global: v }))} />
              <Label>Aktif untuk semua toko (global)</Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={editItem?.is_beta ?? false} onCheckedChange={v => setEditItem(x => ({ ...x, is_beta: v }))} />
              <Label>Tandai sebagai fitur Beta</Label>
            </div>
            <div className="space-y-2">
              <Label>Aktifkan untuk Paket</Label>
              <div className="flex flex-wrap gap-2">
                {PLAN_OPTIONS.map(plan => (
                  <Button key={plan} size="sm" variant={(editItem?.enabled_for_plans ?? []).includes(plan) ? "default" : "outline"}
                    onClick={() => togglePlan(plan)} className="capitalize">{plan}</Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Store className="h-3.5 w-3.5" />Toko Individual (override)</Label>
              <div className="flex gap-2">
                <Input placeholder="Cari nama toko..." value={shopSearch}
                  onChange={e => { setShopSearch(e.target.value); searchShops(e.target.value); }} />
              </div>
              {shopResults.length > 0 && (
                <div className="rounded-md border bg-background shadow-sm">
                  {shopResults.map(s => (
                    <button key={s.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted" onClick={() => addShop(s)}>
                      {s.name}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {(editItem?.enabled_for_shop_ids ?? []).map(id => (
                  <Badge key={id} variant="secondary" className="gap-1 text-xs">
                    <Store className="h-3 w-3" />{id.slice(0, 8)}…
                    <button onClick={() => removeShop(id)} className="ml-1 hover:text-destructive">×</button>
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving === "dialog"}>
              {saving === "dialog" && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Hapus Feature Flag?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Tindakan ini tidak bisa dibatalkan.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Batal</Button>
            <Button variant="destructive" onClick={doDelete}>Hapus</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
