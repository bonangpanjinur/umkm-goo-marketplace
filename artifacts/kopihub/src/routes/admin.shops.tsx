import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Star, Pencil, Map as MapIcon, List } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";

const NearbyShopsMap = lazy(() =>
  import("@/components/marketplace/NearbyShopsMap").then(m => ({ default: m.NearbyShopsMap }))
);

export const Route = createFileRoute("/admin/shops")({
  component: AdminShops,
});

type Shop = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  plan_expires_at: string | null;
  custom_domain: string | null;
  custom_domain_verified_at: string | null;
  created_at: string;
  suspended_at: string | null;
  is_featured: boolean;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  rating_avg?: number | null;
  logo_url?: string | null;
};

type PlanOption = { code: string; name: string; duration_days: number };

type StatusFilter = "all" | "pro_active" | "expiring" | "expired" | "free" | "domain_offline";

function getPlanStatus(s: Shop): { label: string; tone: "ok" | "warn" | "bad" | "muted" } {
  if (s.plan !== "pro") return { label: "Free", tone: "muted" };
  if (!s.plan_expires_at) return { label: "Pro", tone: "ok" };
  const days = Math.ceil((new Date(s.plan_expires_at).getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: "Expired", tone: "bad" };
  if (days <= 7) return { label: `Expiring ${days}h`, tone: "warn" };
  return { label: "Pro Active", tone: "ok" };
}

function AdminShops() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [planOptions, setPlanOptions] = useState<PlanOption[]>([]);
  const [editing, setEditing] = useState<Shop | null>(null);
  const [editPlan, setEditPlan] = useState<string>("free");
  const [editExpiry, setEditExpiry] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("shops").select("id, name, slug, plan, plan_expires_at, custom_domain, custom_domain_verified_at, created_at, suspended_at, is_featured, latitude, longitude, address, rating_avg, logo_url").order("is_featured", { ascending: false }).order("created_at", { ascending: false })
      .then(({ data }) => setShops((data as Shop[]) ?? []));
    supabase.from("plans").select("code, name, duration_days").eq("is_active", true).order("sort_order")
      .then(({ data }) => {
        const opts: PlanOption[] = (data as PlanOption[]) ?? [];
        // Pastikan "free" selalu tersedia sebagai pilihan
        if (!opts.find((o) => o.code === "free")) opts.unshift({ code: "free", name: "Free", duration_days: 0 });
        setPlanOptions(opts);
      });
  }, []);

  const openEdit = (e: React.MouseEvent, s: Shop) => {
    e.preventDefault();
    e.stopPropagation();
    setEditing(s);
    setEditPlan(s.plan || "free");
    setEditExpiry(s.plan_expires_at ? s.plan_expires_at.slice(0, 10) : "");
  };

  const onPlanChange = (code: string) => {
    setEditPlan(code);
    const opt = planOptions.find((o) => o.code === code);
    if (opt && opt.duration_days > 0) {
      const d = new Date();
      d.setDate(d.getDate() + opt.duration_days);
      setEditExpiry(d.toISOString().slice(0, 10));
    } else if (code === "free") {
      setEditExpiry("");
    }
  };

  const savePlan = async () => {
    if (!editing) return;
    setSaving(true);
    const prevPlan = editing.plan;
    const prevExp = editing.plan_expires_at;
    const newExp = editPlan === "free" ? null : (editExpiry ? new Date(editExpiry + "T23:59:59").toISOString() : null);
    const patch: Record<string, unknown> = {
      plan: editPlan,
      plan_expires_at: newExp,
    };
    if (prevPlan !== editPlan && editPlan !== "free") {
      patch.plan_started_at = new Date().toISOString();
    }
    const { error } = await supabase.from("shops").update(patch).eq("id", editing.id);
    if (error) { setSaving(false); toast.error(error.message); return; }

    // Audit log
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("staff_audit_logs").insert({
      shop_id: editing.id,
      actor_id: u.user?.id ?? null,
      action: "shop.plan_change",
      meta: {
        from_plan: prevPlan,
        to_plan: editPlan,
        from_expires_at: prevExp,
        to_expires_at: newExp,
        source: "super_admin",
      },
    });

    setShops((arr) => arr.map((x) => x.id === editing.id ? { ...x, plan: editPlan, plan_expires_at: newExp } : x));
    toast.success(`Paket toko ${editing.name} diubah ke ${editPlan}`);
    setEditing(null);
    setSaving(false);
  };

  const toggleFeatured = async (e: React.MouseEvent, s: Shop) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !s.is_featured;
    const { error } = await supabase.from("shops").update({ is_featured: next }).eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    setShops((prev) => prev.map((x) => x.id === s.id ? { ...x, is_featured: next } : x));
    toast.success(next ? "Ditandai unggulan" : "Dihapus dari unggulan");
  };

  const filtered = useMemo(() => {
    return shops.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q.toLowerCase()) && !s.slug.toLowerCase().includes(q.toLowerCase())) return false;
      if (filter === "all") return true;
      const st = getPlanStatus(s);
      if (filter === "pro_active") return st.label === "Pro Active" || st.label === "Pro";
      if (filter === "expiring") return st.label.startsWith("Expiring");
      if (filter === "expired") return st.label === "Expired";
      if (filter === "free") return s.plan === "free";
      if (filter === "domain_offline") return !!s.custom_domain && !s.custom_domain_verified_at;
      return true;
    });
  }, [shops, q, filter]);

  const FILTERS: Array<{ key: StatusFilter; label: string }> = [
    { key: "all", label: "Semua" },
    { key: "pro_active", label: "Pro Aktif" },
    { key: "expiring", label: "Akan Habis" },
    { key: "expired", label: "Expired" },
    { key: "free", label: "Free" },
    { key: "domain_offline", label: "Domain Offline" },
  ];

  const shopsWithCoords = useMemo(() =>
    shops.filter(s => s.latitude != null && s.longitude != null).map(s => ({
      id: s.id, slug: s.slug, name: s.name, logo_url: s.logo_url ?? null,
      latitude: s.latitude!, longitude: s.longitude!,
      address: s.address ?? null, rating_avg: s.rating_avg ?? null,
    })),
    [shops]
  );
  const mapCenter = useMemo(() => {
    if (shopsWithCoords.length === 0) return { lat: -6.2088, lng: 106.8456 };
    return {
      lat: shopsWithCoords.reduce((s, i) => s + i.latitude, 0) / shopsWithCoords.length,
      lng: shopsWithCoords.reduce((s, i) => s + i.longitude, 0) / shopsWithCoords.length,
    };
  }, [shopsWithCoords]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <h1 className="text-2xl font-bold mb-4">Daftar Toko</h1>

      <Tabs defaultValue="list">
        <TabsList className="mb-4">
          <TabsTrigger value="list"><List className="h-4 w-4 mr-1.5" />Daftar</TabsTrigger>
          <TabsTrigger value="map"><MapIcon className="h-4 w-4 mr-1.5" />Peta Sebaran ({shopsWithCoords.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="map">
          {shopsWithCoords.length === 0 ? (
            <Card className="flex flex-col items-center py-14 text-center gap-3">
              <MapIcon className="h-10 w-10 text-muted-foreground/40" />
              <p className="font-semibold">Belum ada toko dengan koordinat</p>
              <p className="text-sm text-muted-foreground">Tambahkan latitude/longitude ke toko melalui SQL migration F7-1.</p>
            </Card>
          ) : (
            <Suspense fallback={<div className="flex items-center justify-center py-12 text-sm text-muted-foreground">Memuat peta...</div>}>
              <NearbyShopsMap center={mapCenter} shops={shopsWithCoords} radiusKm={100} height={500} />
              <p className="text-xs text-muted-foreground mt-2">{shopsWithCoords.length} dari {shops.length} toko memiliki koordinat lokasi.</p>
            </Suspense>
          )}
        </TabsContent>

        <TabsContent value="list">
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <Input placeholder="Cari nama atau slug…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
        <div className="flex flex-wrap gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-md px-2.5 py-1 text-xs ${filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">{filtered.length} toko</span>
      </div>
      <div className="space-y-2">
        {filtered.map((s) => {
          const st = getPlanStatus(s);
          const toneCls = st.tone === "ok" ? "bg-green-500/15 text-green-700"
            : st.tone === "warn" ? "bg-amber-500/15 text-amber-700"
            : st.tone === "bad" ? "bg-red-500/15 text-red-700"
            : "bg-muted text-muted-foreground";
          const domainOffline = s.custom_domain && !s.custom_domain_verified_at;
          return (
            <Link key={s.id} to="/admin/shops/$id" params={{ id: s.id }} className="block">
            <Card className="p-4 hover:bg-accent/40 transition-colors">
              <div className="flex items-start justify-between flex-wrap gap-2">
                <div>
                  <div className="font-semibold flex items-center gap-2">
                    {s.name}
                    {s.suspended_at && <Badge variant="destructive" className="text-[10px]">Nonaktif</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    /s/{s.slug}
                    {s.custom_domain && (
                      <> · <span className={domainOffline ? "text-red-600" : ""}>{s.custom_domain}{s.custom_domain_verified_at ? " ✓" : " ✗"}</span></>
                    )}
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => toggleFeatured(e, s)}
                      title={s.is_featured ? "Hapus dari unggulan" : "Tandai unggulan"}
                      className={`rounded-md p-1 transition ${s.is_featured ? "text-amber-500 hover:bg-amber-500/10" : "text-muted-foreground hover:bg-muted"}`}
                    >
                      <Star className={`h-4 w-4 ${s.is_featured ? "fill-amber-500" : ""}`} />
                    </button>
                    <button
                      onClick={(e) => openEdit(e, s)}
                      title="Ubah paket"
                      className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${toneCls}`}>{st.label}</span>
                  </div>
                  {s.plan_expires_at && <div className="text-xs text-muted-foreground">s/d {new Date(s.plan_expires_at).toLocaleDateString("id-ID")}</div>}
                  {domainOffline && <div><Badge variant="destructive" className="text-[10px]">Domain Offline</Badge></div>}
                </div>
              </div>
            </Card>
            </Link>
          );
        })}
      </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah Paket {editing?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label>Paket</Label>
              <Select value={editPlan} onValueChange={onPlanChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {planOptions.map((p) => (
                    <SelectItem key={p.code} value={p.code}>{p.name} ({p.code})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tanggal Kadaluarsa</Label>
              <Input
                type="date"
                value={editExpiry}
                onChange={(e) => setEditExpiry(e.target.value)}
                disabled={editPlan === "free"}
              />
              <div className="text-xs text-muted-foreground mt-1">
                {editPlan === "free" ? "Paket Free tidak memerlukan tanggal kadaluarsa." : "Kosongkan untuk paket tanpa batas waktu."}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Batal</Button>
            <Button onClick={savePlan} disabled={saving}>{saving ? "Menyimpan…" : "Simpan & Catat Audit"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
