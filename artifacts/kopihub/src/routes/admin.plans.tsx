import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import { Grid3X3, Plus, Trash2, Package, Sparkles, Check, Star, Wand2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/plans")({
  head: () => ({ meta: [{ title: "Paket Langganan — Admin" }] }), component: AdminPlans });

type PlanFeatures = {
  description?: string;
  bullets?: string[];
  highlight?: boolean;
  badge?: string;
  [k: string]: unknown;
};
type Plan = {
  id: string;
  code: string;
  name: string;
  price_idr: number;
  duration_days: number;
  features: PlanFeatures;
  is_active: boolean;
  sort_order: number;
};

const DEFAULT_PLANS: Array<Omit<Plan, "id">> = [
  {
    code: "free", name: "Free", price_idr: 0, duration_days: 36500, is_active: true, sort_order: 0,
    features: { description: "Cocok untuk coba-coba.", bullets: ["1 outlet", "Maks 30 menu", "Order online basic", "Tanpa custom domain"] },
  },
  {
    code: "starter", name: "Starter", price_idr: 99000, duration_days: 30, is_active: true, sort_order: 1,
    features: { description: "Untuk usaha kecil yang baru mulai.", bullets: ["1 outlet", "Menu tanpa batas", "Laporan harian", "WhatsApp notifikasi"] },
  },
  {
    code: "pro", name: "Pro", price_idr: 249000, duration_days: 30, is_active: true, sort_order: 2,
    features: { description: "Paling populer untuk toko berkembang.", highlight: true, badge: "Populer", bullets: ["3 outlet", "Multi staff + role", "Custom domain", "Marketplace listing", "Loyalty & promo"] },
  },
  {
    code: "business", name: "Business", price_idr: 599000, duration_days: 30, is_active: true, sort_order: 3,
    features: { description: "Skala besar dengan dukungan prioritas.", bullets: ["Outlet tanpa batas", "API integrasi", "Branding white-label", "Support prioritas 24/7", "Backup harian"] },
  },
];

function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: "", name: "", price_idr: 0, duration_days: 30, sort_order: 0,
    description: "", bullets: "", highlight: false, badge: "",
  });

  const reload = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("plans").select("*").order("sort_order");
    if (error) toast.error(error.message);
    setPlans(((data as Plan[]) ?? []).map((p) => ({ ...p, features: (p.features ?? {}) as PlanFeatures })));
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  const save = async (p: Plan) => {
    const { error } = await supabase.from("plans").update({
      name: p.name,
      price_idr: p.price_idr,
      duration_days: p.duration_days,
      is_active: p.is_active,
      sort_order: p.sort_order,
      features: p.features ?? {},
    }).eq("id", p.id);
    if (error) toast.error(error.message); else toast.success("Tersimpan");
    await reload();
  };

  const createPlan = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Kode dan nama paket wajib diisi");
      return;
    }
    setCreating(true);
    const bullets = form.bullets.split("\n").map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase.from("plans").insert({
      code: form.code.trim().toLowerCase(),
      name: form.name.trim(),
      price_idr: form.price_idr,
      duration_days: form.duration_days,
      sort_order: form.sort_order,
      is_active: true,
      features: {
        description: form.description.trim() || undefined,
        bullets: bullets.length ? bullets : undefined,
        highlight: form.highlight || undefined,
        badge: form.badge.trim() || undefined,
      },
    });
    setCreating(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Paket dibuat");
    setOpenCreate(false);
    setForm({ code: "", name: "", price_idr: 0, duration_days: 30, sort_order: 0, description: "", bullets: "", highlight: false, badge: "" });
    await reload();
  };

  const deletePlan = async (p: Plan) => {
    const { error } = await supabase.from("plans").delete().eq("id", p.id);
    if (error) { toast.error(error.message); return; }
    toast.success(`Paket ${p.name} dihapus`);
    await reload();
  };

  const seedDefaults = async () => {
    setSeeding(true);
    const existingCodes = new Set(plans.map((p) => p.code));
    const rows = DEFAULT_PLANS.filter((p) => !existingCodes.has(p.code)).map((p) => ({
      code: p.code, name: p.name, price_idr: p.price_idr, duration_days: p.duration_days,
      sort_order: p.sort_order, is_active: p.is_active, features: p.features,
    }));
    if (rows.length === 0) {
      toast.info("Semua paket bawaan sudah ada");
      setSeeding(false);
      return;
    }
    const { error } = await supabase.from("plans").insert(rows);
    setSeeding(false);
    if (error) toast.error(error.message);
    else toast.success(`${rows.length} paket bawaan dibuat`);
    await reload();
  };

  const updateLocal = (id: string, patch: Partial<Plan> | ((p: Plan) => Partial<Plan>)) => {
    setPlans((arr) => arr.map((x) => {
      if (x.id !== id) return x;
      const p = typeof patch === "function" ? patch(x) : patch;
      return { ...x, ...p };
    }));
  };
  const updateFeatures = (id: string, patch: Partial<PlanFeatures>) => {
    updateLocal(id, (x) => ({ features: { ...(x.features ?? {}), ...patch } }));
  };

  const stats = useMemo(() => ({
    total: plans.length,
    active: plans.filter((p) => p.is_active).length,
    highlighted: plans.filter((p) => p.features?.highlight).length,
  }), [plans]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Package className="h-6 w-6 text-primary" />Paket Berlangganan</h1>
          <p className="text-sm text-muted-foreground mt-1">Kelola paket yang ditawarkan kepada toko. {stats.total > 0 && (<><span className="font-medium">{stats.active}</span> aktif dari <span className="font-medium">{stats.total}</span> paket.</>)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {plans.length === 0 && (
            <Button variant="outline" onClick={seedDefaults} disabled={seeding}>
              <Wand2 className="h-4 w-4 mr-1" /> {seeding ? "Membuat…" : "Pakai Paket Bawaan"}
            </Button>
          )}
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" /> Buat Paket Baru</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Buat Paket Baru</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-2 max-h-[60vh] overflow-y-auto pr-1">
              <div>
                <Label>Kode (huruf kecil, unik)</Label>
                <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="contoh: starter" />
              </div>
              <div>
                <Label>Nama Paket</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="contoh: Starter" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Harga (IDR)</Label>
                  <Input type="number" value={form.price_idr} onChange={(e) => setForm((f) => ({ ...f, price_idr: Number(e.target.value) }))} />
                  <div className="text-xs text-muted-foreground mt-1">{formatIDR(form.price_idr)}</div>
                </div>
                <div>
                  <Label>Durasi (hari)</Label>
                  <Input type="number" value={form.duration_days} onChange={(e) => setForm((f) => ({ ...f, duration_days: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <Label>Deskripsi singkat</Label>
                <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="contoh: Cocok untuk toko yang baru mulai" />
              </div>
              <div>
                <Label>Fitur (satu baris satu fitur)</Label>
                <Textarea rows={5} value={form.bullets} onChange={(e) => setForm((f) => ({ ...f, bullets: e.target.value }))} placeholder={"1 outlet\nMenu tanpa batas\nLaporan harian"} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 mt-5">
                  <Switch checked={form.highlight} onCheckedChange={(v) => setForm((f) => ({ ...f, highlight: v }))} />
                  <Label>Tandai populer</Label>
                </div>
                <div>
                  <Label>Label badge (opsional)</Label>
                  <Input value={form.badge} onChange={(e) => setForm((f) => ({ ...f, badge: e.target.value }))} placeholder="contoh: Populer" />
                </div>
              </div>
              <div>
                <Label>Urutan tampil</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpenCreate(false)}>Batal</Button>
              <Button onClick={createPlan} disabled={creating}>{creating ? "Menyimpan…" : "Simpan"}</Button>
            </DialogFooter>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">Memuat paket…</Card>
      ) : plans.length === 0 ? (
        <Card className="p-10 text-center">
          <Sparkles className="h-10 w-10 mx-auto text-primary mb-3" />
          <h2 className="font-semibold mb-1">Belum ada paket</h2>
          <p className="text-sm text-muted-foreground mb-4">Mulai dengan paket bawaan (Free / Starter / Pro / Business) atau buat dari nol.</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button onClick={seedDefaults} disabled={seeding}><Wand2 className="h-4 w-4 mr-1" /> {seeding ? "Membuat…" : "Pakai Paket Bawaan"}</Button>
            <Button variant="outline" onClick={() => setOpenCreate(true)}><Plus className="h-4 w-4 mr-1" /> Buat Manual</Button>
          </div>
        </Card>
      ) : null}

      {plans.length > 0 && (
        <>
          {/* Preview kartu paket */}
          <div className="grid gap-4 mb-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {plans.map((p) => (
              <Card key={`prev-${p.id}`} className={`p-5 relative ${p.features?.highlight ? "border-primary ring-1 ring-primary/40" : ""} ${!p.is_active ? "opacity-60" : ""}`}>
                {p.features?.badge && (
                  <Badge className="absolute -top-2 right-3"><Star className="h-3 w-3 mr-1" />{p.features.badge}</Badge>
                )}
                <div className="font-semibold text-lg">{p.name}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wide">{p.code}</div>
                <div className="mt-3 text-2xl font-bold tabular-nums">{p.price_idr === 0 ? "Gratis" : formatIDR(p.price_idr)}</div>
                <div className="text-xs text-muted-foreground">/ {p.duration_days} hari</div>
                {p.features?.description && (<p className="text-sm mt-3 text-muted-foreground">{p.features.description}</p>)}
                {Array.isArray(p.features?.bullets) && p.features!.bullets!.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {p.features!.bullets!.map((b, i) => (
                      <li key={i} className="text-sm flex gap-2"><Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />{b}</li>
                    ))}
                  </ul>
                )}
                {!p.is_active && <div className="mt-3 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">Nonaktif — tidak ditawarkan</div>}
              </Card>
            ))}
          </div>

          {/* Editor lengkap */}
          <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">Edit Detail Paket</h2>
          <div className="space-y-4">
            {plans.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div><Label>Kode</Label><Input value={p.code} disabled /></div>
                  <div><Label>Nama</Label><Input value={p.name} onChange={(e) => updateLocal(p.id, { name: e.target.value })} /></div>
                  <div>
                    <Label>Harga (IDR)</Label>
                    <Input type="number" value={p.price_idr} onChange={(e) => updateLocal(p.id, { price_idr: Number(e.target.value) })} />
                    <div className="text-xs text-muted-foreground mt-1">{formatIDR(p.price_idr)}</div>
                  </div>
                  <div><Label>Durasi (hari)</Label><Input type="number" value={p.duration_days} onChange={(e) => updateLocal(p.id, { duration_days: Number(e.target.value) })} /></div>
                  <div className="flex items-center gap-2"><Switch checked={p.is_active} onCheckedChange={(v) => updateLocal(p.id, { is_active: v })} /><Label>Aktif</Label></div>
                  <div><Label>Urutan</Label><Input type="number" value={p.sort_order} onChange={(e) => updateLocal(p.id, { sort_order: Number(e.target.value) })} /></div>
                  <div className="sm:col-span-2">
                    <Label>Deskripsi</Label>
                    <Input value={p.features?.description ?? ""} onChange={(e) => updateFeatures(p.id, { description: e.target.value })} placeholder="Ringkasan paket untuk halaman pricing" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Fitur (satu baris satu)</Label>
                    <Textarea rows={4}
                      value={(p.features?.bullets ?? []).join("\n")}
                      onChange={(e) => updateFeatures(p.id, { bullets: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
                      placeholder={"1 outlet\nMenu tanpa batas"} />
                  </div>
                  <div className="flex items-center gap-2"><Switch checked={!!p.features?.highlight} onCheckedChange={(v) => updateFeatures(p.id, { highlight: v })} /><Label>Tandai populer (highlight)</Label></div>
                  <div><Label>Badge</Label><Input value={p.features?.badge ?? ""} onChange={(e) => updateFeatures(p.id, { badge: e.target.value })} placeholder="contoh: Populer" /></div>
                </div>
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button onClick={() => save(p)}>Simpan</Button>
                  <Link to="/admin/plans/$id/matrix" params={{ id: p.id }}>
                    <Button variant="outline" size="sm"><Grid3X3 className="h-3.5 w-3.5 mr-1" />Matrix Fitur & Tema</Button>
                  </Link>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="ml-auto text-destructive hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5 mr-1" />Hapus
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus paket {p.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Toko yang sudah pakai paket ini tidak otomatis berubah, tapi paket tidak bisa dipilih lagi. Tindakan tidak bisa dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletePlan(p)}>Hapus</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
