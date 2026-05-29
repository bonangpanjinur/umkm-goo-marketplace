import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Truck, Loader2, Plus, Pencil, Trash2, MapPin, Calculator } from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/outlet-shipping")({
  head: () => ({ meta: [{ title: "Pengiriman Outlet — Merchant" }] }),
  component: OutletShippingPage,
});

type Outlet = { id: string; name: string };
type OutletCourier = {
  id: string;
  shop_id: string;
  outlet_id: string;
  courier_name: string;
  service_type: string;
  base_fee: number;
  per_km_fee: number;
  min_order: number;
  free_above: number | null;
  max_distance_km: number | null;
  eta_min_minutes: number;
  eta_max_minutes: number;
  is_active: boolean;
  sort_order: number;
  note: string | null;
};

const SERVICE_OPTIONS = ["regular", "express", "same_day", "instant", "economy"];

const formSchema = z.object({
  courier_name: z.string().trim().min(1, "Wajib diisi").max(80),
  service_type: z.string().trim().min(1).max(40),
  base_fee: z.number().min(0).max(10_000_000),
  per_km_fee: z.number().min(0).max(1_000_000),
  min_order: z.number().min(0).max(1_000_000_000),
  free_above: z.number().min(0).max(1_000_000_000).nullable(),
  max_distance_km: z.number().min(0).max(1000).nullable(),
  eta_min_minutes: z.number().int().min(0).max(10_000),
  eta_max_minutes: z.number().int().min(0).max(10_000),
  note: z.string().max(500).optional().nullable(),
});

type FormState = {
  id?: string;
  courier_name: string;
  service_type: string;
  base_fee: string;
  per_km_fee: string;
  min_order: string;
  free_above: string;
  max_distance_km: string;
  eta_min_minutes: string;
  eta_max_minutes: string;
  note: string;
};

const EMPTY_FORM: FormState = {
  courier_name: "",
  service_type: "regular",
  base_fee: "10000",
  per_km_fee: "2000",
  min_order: "0",
  free_above: "",
  max_distance_km: "",
  eta_min_minutes: "30",
  eta_max_minutes: "90",
  note: "",
};

function OutletShippingPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [activeOutletId, setActiveOutletId] = useState<string>("");
  const [items, setItems] = useState<OutletCourier[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Test calculator
  const [testDistance, setTestDistance] = useState("3");
  const [testOrder, setTestOrder] = useState("50000");

  useEffect(() => {
    if (!shop) return;
    (async () => {
      const { data } = await supabase
        .from("outlets")
        .select("id, name")
        .eq("shop_id", shop.id)
        .eq("is_active", true)
        .order("created_at");
      const list = (data ?? []) as Outlet[];
      setOutlets(list);
      if (list.length && !activeOutletId) setActiveOutletId(list[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id]);

  const reload = async () => {
    if (!activeOutletId) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("outlet_couriers")
      .select("*")
      .eq("outlet_id", activeOutletId)
      .order("sort_order")
      .order("courier_name");
    setItems((data ?? []) as OutletCourier[]);
    setLoading(false);
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeOutletId]);

  const startAdd = () => {
    setForm({ ...EMPTY_FORM });
    setOpen(true);
  };
  const startEdit = (it: OutletCourier) => {
    setForm({
      id: it.id,
      courier_name: it.courier_name,
      service_type: it.service_type,
      base_fee: String(it.base_fee ?? 0),
      per_km_fee: String(it.per_km_fee ?? 0),
      min_order: String(it.min_order ?? 0),
      free_above: it.free_above != null ? String(it.free_above) : "",
      max_distance_km: it.max_distance_km != null ? String(it.max_distance_km) : "",
      eta_min_minutes: String(it.eta_min_minutes ?? 30),
      eta_max_minutes: String(it.eta_max_minutes ?? 90),
      note: it.note ?? "",
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!shop || !activeOutletId) return;
    const parsed = formSchema.safeParse({
      courier_name: form.courier_name,
      service_type: form.service_type,
      base_fee: Number(form.base_fee || 0),
      per_km_fee: Number(form.per_km_fee || 0),
      min_order: Number(form.min_order || 0),
      free_above: form.free_above === "" ? null : Number(form.free_above),
      max_distance_km: form.max_distance_km === "" ? null : Number(form.max_distance_km),
      eta_min_minutes: Number(form.eta_min_minutes || 0),
      eta_max_minutes: Number(form.eta_max_minutes || 0),
      note: form.note || null,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Form tidak valid");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...parsed.data, shop_id: shop.id, outlet_id: activeOutletId };
      let err;
      if (form.id) {
        ({ error: err } = await (supabase as any).from("outlet_couriers").update(payload).eq("id", form.id));
      } else {
        ({ error: err } = await (supabase as any).from("outlet_couriers").insert(payload));
      }
      if (err) throw err;
      toast.success(form.id ? "Tarif diperbarui" : "Tarif ditambahkan");
      setOpen(false);
      reload();
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (it: OutletCourier) => {
    const { error } = await (supabase as any)
      .from("outlet_couriers")
      .update({ is_active: !it.is_active })
      .eq("id", it.id);
    if (error) toast.error(error.message);
    else reload();
  };

  const remove = async (it: OutletCourier) => {
    if (!window.confirm(`Hapus tarif "${it.courier_name} - ${it.service_type}"?`)) return;
    const { error } = await (supabase as any).from("outlet_couriers").delete().eq("id", it.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Tarif dihapus");
      reload();
    }
  };

  const calcFee = (it: OutletCourier, distance: number, orderTotal: number) => {
    if (it.max_distance_km != null && distance > it.max_distance_km) return null;
    if (it.min_order > orderTotal) return null;
    if (it.free_above != null && orderTotal >= it.free_above) return 0;
    return Math.round(it.base_fee + it.per_km_fee * distance);
  };

  if (shopLoading) {
    return (
      <div className="flex h-full items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Truck className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Kurir & Tarif Ongkir per Outlet</h1>
            <p className="text-sm text-muted-foreground">
              Atur opsi kurir dan rumus ongkir per outlet — otomatis dipakai POS & checkout.
            </p>
          </div>
        </div>
        <Button onClick={startAdd} disabled={!activeOutletId} className="gap-1.5">
          <Plus className="h-4 w-4" /> Tambah Tarif
        </Button>
      </div>

      <Card className="p-4 mb-4">
        <Label className="text-xs text-muted-foreground">Outlet</Label>
        <Select value={activeOutletId} onValueChange={setActiveOutletId}>
          <SelectTrigger className="mt-1.5 max-w-md"><SelectValue placeholder="Pilih outlet" /></SelectTrigger>
          <SelectContent>
            {outlets.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Calculator */}
      <Card className="p-4 mb-4 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Simulasi Ongkir</h3>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Jarak (km)</Label>
            <Input type="number" min={0} step="0.1" value={testDistance} onChange={(e) => setTestDistance(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Total order</Label>
            <Input type="number" min={0} value={testOrder} onChange={(e) => setTestOrder(e.target.value)} />
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Truck className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>Belum ada tarif kurir di outlet ini.</p>
          <p className="text-xs mt-1">Tambahkan kurir & tarif untuk auto-hitung ongkir.</p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map((it) => {
            const distance = Number(testDistance || 0);
            const order = Number(testOrder || 0);
            const fee = calcFee(it, distance, order);
            return (
              <Card key={it.id} className={`p-4 ${!it.is_active ? "opacity-60" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{it.courier_name}</h3>
                      <Badge variant="outline" className="text-xs uppercase">{it.service_type}</Badge>
                      {!it.is_active && <Badge variant="secondary" className="text-xs">Nonaktif</Badge>}
                    </div>
                    <div className="mt-1.5 grid sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span>Tarif dasar: <b className="text-foreground">{formatIDR(it.base_fee)}</b></span>
                      <span>Per km: <b className="text-foreground">{formatIDR(it.per_km_fee)}</b></span>
                      {it.min_order > 0 && <span>Min order: {formatIDR(it.min_order)}</span>}
                      {it.free_above != null && <span>Gratis di atas: {formatIDR(it.free_above)}</span>}
                      {it.max_distance_km != null && <span><MapPin className="inline h-3 w-3" /> Max: {it.max_distance_km} km</span>}
                      <span>ETA: {it.eta_min_minutes}–{it.eta_max_minutes} mnt</span>
                    </div>
                    {it.note && <p className="text-xs text-muted-foreground mt-1.5 italic">{it.note}</p>}
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1 text-xs">
                      <Calculator className="h-3 w-3 text-primary" />
                      <span className="text-muted-foreground">Estimasi:</span>
                      {fee == null ? (
                        <span className="font-medium text-destructive">Tidak tersedia</span>
                      ) : fee === 0 ? (
                        <span className="font-semibold text-emerald-600">GRATIS</span>
                      ) : (
                        <span className="font-semibold tabular-nums">{formatIDR(fee)}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Switch checked={it.is_active} onCheckedChange={() => toggleActive(it)} />
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => startEdit(it)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(it)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Tarif" : "Tambah Tarif Kurir"}</DialogTitle>
            <DialogDescription>
              Rumus ongkir: <b>tarif dasar + (per km × jarak)</b>. Gratis ongkir aktif jika total order ≥ ambang batas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2 max-h-[65vh] overflow-y-auto pr-2">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Nama Kurir</Label>
                <Input value={form.courier_name} onChange={(e) => setForm({ ...form, courier_name: e.target.value })} placeholder="GoSend / Grab / Internal" />
              </div>
              <div>
                <Label>Tipe Layanan</Label>
                <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SERVICE_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Tarif Dasar (Rp)</Label>
                <Input type="number" min={0} value={form.base_fee} onChange={(e) => setForm({ ...form, base_fee: e.target.value })} />
              </div>
              <div>
                <Label>Per km (Rp)</Label>
                <Input type="number" min={0} value={form.per_km_fee} onChange={(e) => setForm({ ...form, per_km_fee: e.target.value })} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Min. Order (Rp)</Label>
                <Input type="number" min={0} value={form.min_order} onChange={(e) => setForm({ ...form, min_order: e.target.value })} />
              </div>
              <div>
                <Label>Gratis Ongkir di atas (Rp)</Label>
                <Input type="number" min={0} value={form.free_above} onChange={(e) => setForm({ ...form, free_above: e.target.value })} placeholder="Kosongkan jika tidak ada" />
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <div>
                <Label>Max jarak (km)</Label>
                <Input type="number" min={0} step="0.1" value={form.max_distance_km} onChange={(e) => setForm({ ...form, max_distance_km: e.target.value })} placeholder="Opsional" />
              </div>
              <div>
                <Label>ETA Min (menit)</Label>
                <Input type="number" min={0} value={form.eta_min_minutes} onChange={(e) => setForm({ ...form, eta_min_minutes: e.target.value })} />
              </div>
              <div>
                <Label>ETA Max (menit)</Label>
                <Input type="number" min={0} value={form.eta_max_minutes} onChange={(e) => setForm({ ...form, eta_max_minutes: e.target.value })} />
              </div>
            </div>
            <div>
              <Label>Catatan (opsional)</Label>
              <Textarea rows={2} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Misal: hanya area tertentu, syarat khusus..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}