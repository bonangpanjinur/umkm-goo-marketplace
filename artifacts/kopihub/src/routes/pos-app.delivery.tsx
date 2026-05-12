import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Save, Clock } from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/delivery")({
  component: DeliveryPage,
});

type Settings = {
  shop_id: string;
  mode: "flat" | "zone";
  base_fee: number;
  free_above: number | null;
  min_order: number;
  pickup_enabled: boolean;
  delivery_enabled: boolean;
  open_time: string | null;
  close_time: string | null;
  min_eta_minutes: number;
  max_eta_minutes: number;
  notes: string | null;
};

type Zone = {
  id: string;
  shop_id: string;
  name: string;
  fee: number;
  area_note: string | null;
  is_active: boolean;
  sort_order: number;
  min_eta_minutes: number;
  max_eta_minutes: number;
};

const DEFAULTS: Omit<Settings, "shop_id"> = {
  mode: "flat",
  base_fee: 5000,
  free_above: null,
  min_order: 0,
  pickup_enabled: true,
  delivery_enabled: true,
  open_time: null,
  close_time: null,
  min_eta_minutes: 30,
  max_eta_minutes: 60,
  notes: null,
};

function DeliveryPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shop) return;
    (async () => {
      const [{ data: s }, { data: z }] = await Promise.all([
        supabase.from("delivery_settings").select("*").eq("shop_id", shop.id).maybeSingle(),
        supabase
          .from("delivery_zones")
          .select("*")
          .eq("shop_id", shop.id)
          .order("sort_order"),
      ]);
      setSettings(
        s
          ? (s as Settings)
          : { shop_id: shop.id, ...DEFAULTS },
      );
      setZones((z ?? []) as Zone[]);
    })();
  }, [shop]);

  async function saveSettings() {
    if (!settings || !shop) return;
    setSaving(true);
    const { error } = await supabase
      .from("delivery_settings")
      .upsert({ ...settings, shop_id: shop.id }, { onConflict: "shop_id" });
    setSaving(false);
    if (error) toast.error("Gagal menyimpan");
    else toast.success("Pengaturan disimpan");
  }

  async function addZone() {
    if (!shop) return;
    const { data, error } = await supabase
      .from("delivery_zones")
      .insert({
        shop_id: shop.id,
        name: "Zona baru",
        fee: 5000,
        sort_order: zones.length,
        min_eta_minutes: 30,
        max_eta_minutes: 60,
      })
      .select()
      .single();
    if (error || !data) { toast.error("Gagal"); return; }
    setZones([...zones, data as Zone]);
  }

  async function updateZone(id: string, patch: Partial<Zone>) {
    setZones((zs) => zs.map((z) => (z.id === id ? { ...z, ...patch } : z)));
    const { error } = await supabase.from("delivery_zones").update(patch).eq("id", id);
    if (error) toast.error("Gagal update zona");
  }

  async function deleteZone(id: string) {
    if (!confirm("Hapus zona ini?")) return;
    const { error } = await supabase.from("delivery_zones").delete().eq("id", id);
    if (error) { toast.error("Gagal hapus"); return; }
    setZones((zs) => zs.filter((z) => z.id !== id));
  }

  if (shopLoading || !settings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Delivery</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Atur ongkir, estimasi waktu, dan jam delivery untuk etalase publik.
          </p>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="gap-1">
          <Save className="h-4 w-4" /> {saving ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>

      <section className="space-y-4 rounded-xl border border-border bg-card p-6">
        <h2 className="text-base font-semibold">Mode & ongkir</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Aktifkan Pickup</p>
              <p className="text-xs text-muted-foreground">Ambil di toko</p>
            </div>
            <Switch
              checked={settings.pickup_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, pickup_enabled: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Aktifkan Delivery</p>
              <p className="text-xs text-muted-foreground">Antar ke alamat pelanggan</p>
            </div>
            <Switch
              checked={settings.delivery_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, delivery_enabled: v })}
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Mode ongkir</Label>
          <RadioGroup
            value={settings.mode}
            onValueChange={(v) => setSettings({ ...settings, mode: v as "flat" | "zone" })}
            className="mt-1 grid grid-cols-2 gap-2"
          >
            <label className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 ${settings.mode === "flat" ? "border-primary bg-accent" : "border-border"}`}>
              <RadioGroupItem value="flat" />
              <div>
                <p className="text-sm font-medium">Flat</p>
                <p className="text-xs text-muted-foreground">1 tarif untuk semua alamat</p>
              </div>
            </label>
            <label className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 ${settings.mode === "zone" ? "border-primary bg-accent" : "border-border"}`}>
              <RadioGroupItem value="zone" />
              <div>
                <p className="text-sm font-medium">Per zona</p>
                <p className="text-xs text-muted-foreground">Tarif berbeda per area</p>
              </div>
            </label>
          </RadioGroup>
        </div>

        {settings.mode === "flat" && (
          <div className="space-y-1">
            <Label className="text-xs">Tarif flat (Rp)</Label>
            <Input
              type="number"
              value={settings.base_fee}
              onChange={(e) => setSettings({ ...settings, base_fee: Number(e.target.value) || 0 })}
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Minimum order (Rp)</Label>
            <Input
              type="number"
              value={settings.min_order}
              onChange={(e) => setSettings({ ...settings, min_order: Number(e.target.value) || 0 })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Gratis ongkir di atas (Rp, kosongkan untuk nonaktif)</Label>
            <Input
              type="number"
              value={settings.free_above ?? ""}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  free_above: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Jam buka delivery</Label>
            <Input
              type="time"
              value={settings.open_time ?? ""}
              onChange={(e) => setSettings({ ...settings, open_time: e.target.value || null })}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Jam tutup delivery</Label>
            <Input
              type="time"
              value={settings.close_time ?? ""}
              onChange={(e) => setSettings({ ...settings, close_time: e.target.value || null })}
            />
          </div>
        </div>

        {settings.mode === "flat" && (
          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <Label className="text-sm font-medium">Estimasi Waktu Pengiriman</Label>
            </div>
            <p className="text-xs text-muted-foreground -mt-1">
              Ditampilkan ke pembeli di halaman produk sebelum checkout.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Estimasi minimum (menit)</Label>
                <Input
                  type="number"
                  min={1}
                  value={settings.min_eta_minutes}
                  onChange={(e) =>
                    setSettings({ ...settings, min_eta_minutes: Math.max(1, Number(e.target.value) || 1) })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Estimasi maksimum (menit)</Label>
                <Input
                  type="number"
                  min={1}
                  value={settings.max_eta_minutes}
                  onChange={(e) =>
                    setSettings({ ...settings, max_eta_minutes: Math.max(1, Number(e.target.value) || 1) })
                  }
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Contoh: min 30, maks 60 → pembeli melihat "~30–60 mnt"
            </p>
          </div>
        )}

        <div className="space-y-1">
          <Label className="text-xs">Catatan untuk pelanggan</Label>
          <Textarea
            value={settings.notes ?? ""}
            onChange={(e) => setSettings({ ...settings, notes: e.target.value || null })}
            rows={2}
            placeholder="Mis. estimasi tergantung jarak, hari Minggu libur, dll."
          />
        </div>
      </section>

      {settings.mode === "zone" && (
        <section className="mt-6 space-y-3 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold">Zona pengiriman</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Setiap zona bisa punya estimasi waktu pengiriman sendiri.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={addZone} className="gap-1">
              <Plus className="h-4 w-4" /> Tambah zona
            </Button>
          </div>

          {zones.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada zona. Tambahkan minimal 1 zona supaya pelanggan bisa checkout delivery.
            </p>
          )}

          <div className="space-y-3">
            {zones.map((z) => (
              <div key={z.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="grid gap-2 sm:grid-cols-[1fr_130px_1fr_auto_auto]">
                  <Input
                    value={z.name}
                    placeholder="Nama zona"
                    onChange={(e) => updateZone(z.id, { name: e.target.value })}
                  />
                  <Input
                    type="number"
                    value={z.fee}
                    placeholder="Ongkir (Rp)"
                    onChange={(e) => updateZone(z.id, { fee: Number(e.target.value) || 0 })}
                  />
                  <Input
                    value={z.area_note ?? ""}
                    placeholder="Catatan area (mis. radius < 3 km)"
                    onChange={(e) => updateZone(z.id, { area_note: e.target.value || null })}
                  />
                  <div className="flex items-center gap-2 px-1">
                    <Switch
                      checked={z.is_active}
                      onCheckedChange={(v) => updateZone(z.id, { is_active: v })}
                    />
                    <span className="text-xs text-muted-foreground">{z.is_active ? "Aktif" : "Off"}</span>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteZone(z.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 pl-0.5">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Label className="text-xs text-muted-foreground shrink-0">ETA min (mnt)</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-7 text-xs"
                      value={z.min_eta_minutes ?? 30}
                      onChange={(e) => updateZone(z.id, { min_eta_minutes: Math.max(1, Number(e.target.value) || 1) })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <Label className="text-xs text-muted-foreground shrink-0">ETA maks (mnt)</Label>
                    <Input
                      type="number"
                      min={1}
                      className="h-7 text-xs"
                      value={z.max_eta_minutes ?? 60}
                      onChange={(e) => updateZone(z.id, { max_eta_minutes: Math.max(1, Number(e.target.value) || 1) })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground">
            Contoh fee: {formatIDR(5000)} / {formatIDR(10000)} / {formatIDR(15000)} per zona.
          </p>
        </section>
      )}
    </div>
  );
}
