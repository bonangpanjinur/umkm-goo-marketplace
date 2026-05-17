import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { useShopCapabilities } from "@/lib/use-shop-capabilities";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plane, Plus, Pencil, Trash2, Loader2, MapPin } from "lucide-react";
import { UploadableImage } from "@/components/UploadableImage";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/umroh-packages")({
  head: () => ({ meta: [{ title: "Paket Travel — Merchant" }] }),
  component: Page,
});

type PackageType = "umroh" | "hajj" | "tour-domestic" | "tour-international" | "event";

const PACKAGE_TYPE_OPTIONS: Array<{ value: PackageType; label: string }> = [
  { value: "umroh", label: "Umroh" },
  { value: "hajj", label: "Haji" },
  { value: "tour-domestic", label: "Wisata Domestik" },
  { value: "tour-international", label: "Wisata Internasional" },
  { value: "event", label: "Event/Gathering" },
];

const TYPE_LABELS: Record<PackageType, string> = {
  umroh: "Umroh",
  hajj: "Haji",
  "tour-domestic": "Wisata Domestik",
  "tour-international": "Wisata Internasional",
  event: "Event",
};

function isUmrohLike(t: PackageType) {
  return t === "umroh" || t === "hajj";
}

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  package_type: PackageType;
  departure_date: string | null;
  return_date: string | null;
  duration_days: number | null;
  hotel_makkah: string | null;
  hotel_madinah: string | null;
  airline: string | null;
  price_quad: number | null;
  price_triple: number | null;
  price_double: number | null;
  price_single: number | null;
  cover_image_url: string | null;
  quota_total: number | null;
  quota_filled: number;
  is_active: boolean;
  sort_order: number;
  includes: string[] | null;
  excludes: string[] | null;
};

const empty = {
  name: "",
  description: "",
  package_type: "umroh" as PackageType,
  departure_date: "",
  return_date: "",
  duration_days: "",
  hotel_makkah: "",
  hotel_madinah: "",
  airline: "",
  price_quad: "",
  price_triple: "",
  price_double: "",
  price_single: "",
  cover_image_url: "",
  quota_total: "",
  is_active: true,
  includes: "",
  excludes: "",
};

/** Tebak default package_type dari subtype shop */
function defaultTypeFromSubtype(subtype: string | null): PackageType {
  if (!subtype) return "umroh";
  const s = subtype.toLowerCase();
  if (s.includes("haji")) return "hajj";
  if (s.includes("umroh")) return "umroh";
  if (s.includes("wisata-int") || s.includes("internasional")) return "tour-international";
  if (s.includes("wisata") || s.includes("tour") || s.includes("domestik")) return "tour-domestic";
  if (s.includes("event")) return "event";
  return "umroh";
}

function Page() {
  const { shop, loading } = useCurrentShop();
  const caps = useShopCapabilities(shop?.id ?? null);
  const defaultType = useMemo(
    () => defaultTypeFromSubtype(caps.data?.subtype ?? null),
    [caps.data?.subtype],
  );

  const [items, setItems] = useState<Pkg[]>([]);
  const [filterType, setFilterType] = useState<"all" | PackageType>("all");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [form, setForm] = useState({ ...empty, package_type: defaultType });
  const [saving, setSaving] = useState(false);

  // Sinkronkan default type ketika caps termuat
  useEffect(() => {
    setForm((f) => (editing ? f : { ...f, package_type: defaultType }));
  }, [defaultType, editing]);

  async function load() {
    if (!shop) return;
    const { data } = await supabase
      .from("umroh_packages")
      .select("*")
      .eq("shop_id", shop.id)
      .order("sort_order");
    setItems((data ?? []) as Pkg[]);
  }
  useEffect(() => {
    void load();
  }, [shop?.id]);

  function startNew() {
    setEditing(null);
    setForm({ ...empty, package_type: defaultType });
    setOpenForm(true);
  }
  function startEdit(p: Pkg) {
    setEditing(p);
    setForm({
      name: p.name,
      description: p.description ?? "",
      package_type: p.package_type,
      departure_date: p.departure_date ?? "",
      return_date: p.return_date ?? "",
      duration_days: p.duration_days?.toString() ?? "",
      hotel_makkah: p.hotel_makkah ?? "",
      hotel_madinah: p.hotel_madinah ?? "",
      airline: p.airline ?? "",
      price_quad: p.price_quad?.toString() ?? "",
      price_triple: p.price_triple?.toString() ?? "",
      price_double: p.price_double?.toString() ?? "",
      price_single: p.price_single?.toString() ?? "",
      cover_image_url: p.cover_image_url ?? "",
      quota_total: p.quota_total?.toString() ?? "",
      is_active: p.is_active,
      includes: (p.includes ?? []).join("\n"),
      excludes: (p.excludes ?? []).join("\n"),
    });
    setOpenForm(true);
  }

  async function save() {
    if (!shop) return;
    if (!form.name.trim()) {
      toast.error("Nama paket wajib");
      return;
    }
    setSaving(true);
    const umrohish = isUmrohLike(form.package_type);
    const includesArr = form.includes
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const excludesArr = form.excludes
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      shop_id: shop.id,
      name: form.name.trim(),
      description: form.description || null,
      package_type: form.package_type,
      departure_date: form.departure_date || null,
      return_date: form.return_date || null,
      duration_days: form.duration_days ? Number(form.duration_days) : null,
      // umroh-only
      hotel_makkah: umrohish ? form.hotel_makkah || null : null,
      hotel_madinah: umrohish ? form.hotel_madinah || null : null,
      airline: form.airline || null,
      // pricing: umroh pakai quad/triple/double, tour/event pakai single
      price_quad: umrohish && form.price_quad ? Number(form.price_quad) : null,
      price_triple: umrohish && form.price_triple ? Number(form.price_triple) : null,
      price_double: umrohish && form.price_double ? Number(form.price_double) : null,
      price_single: !umrohish && form.price_single ? Number(form.price_single) : null,
      cover_image_url: form.cover_image_url || null,
      quota_total: form.quota_total ? Number(form.quota_total) : null,
      is_active: form.is_active,
      includes: includesArr,
      excludes: excludesArr,
    };
    const { error } = editing
      ? await supabase.from("umroh_packages").update(payload).eq("id", editing.id)
      : await supabase.from("umroh_packages").insert(payload);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Tersimpan");
    setOpenForm(false);
    void load();
  }

  async function del(p: Pkg) {
    if (!confirm(`Hapus paket "${p.name}"?`)) return;
    const { error } = await supabase.from("umroh_packages").delete().eq("id", p.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Dihapus");
    void load();
  }

  const filteredItems = useMemo(
    () => (filterType === "all" ? items : items.filter((p) => p.package_type === filterType)),
    [items, filterType],
  );

  if (loading || !shop)
    return (
      <div className="p-6">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );

  const umrohish = isUmrohLike(form.package_type);
  const showHeaderIcon = caps.data?.subtype?.toLowerCase().includes("wisata") || filterType.startsWith("tour");
  const pageTitle = showHeaderIcon ? "Paket Wisata" : "Paket Travel";

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {showHeaderIcon ? <MapPin className="h-6 w-6" /> : <Plane className="h-6 w-6" />}
            {pageTitle}
          </h1>
          <p className="text-sm text-muted-foreground">
            Kelola paket umroh, haji, wisata, dan event
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterType} onValueChange={(v) => setFilterType(v as "all" | PackageType)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tipe</SelectItem>
              {PACKAGE_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={startNew}>
            <Plus className="h-4 w-4 mr-1" />
            Paket Baru
          </Button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          Belum ada paket. Klik "Paket Baru" untuk mulai.
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((p) => {
            const displayPrice = isUmrohLike(p.package_type)
              ? p.price_quad
              : p.price_single ?? p.price_quad;
            const priceLabel = isUmrohLike(p.package_type) ? "/ quad" : "/ orang";
            return (
              <Card key={p.id} className="overflow-hidden">
                {p.cover_image_url && (
                  <img src={p.cover_image_url} alt={p.name} className="h-36 w-full object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{p.name}</h3>
                    <Badge variant={p.is_active ? "default" : "secondary"}>
                      {p.is_active ? "Aktif" : "Nonaktif"}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {TYPE_LABELS[p.package_type] ?? p.package_type}
                    </Badge>
                    {p.departure_date && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(p.departure_date).toLocaleDateString("id-ID")}
                        {p.duration_days ? ` · ${p.duration_days} hari` : ""}
                      </span>
                    )}
                  </div>
                  {displayPrice != null && (
                    <p className="text-sm mt-2 font-medium">
                      {formatIDR(displayPrice)}{" "}
                      <span className="text-xs text-muted-foreground">{priceLabel}</span>
                    </p>
                  )}
                  {p.quota_total != null && (
                    <p className="text-xs text-muted-foreground">
                      Kuota: {p.quota_filled}/{p.quota_total}
                    </p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => startEdit(p)}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => del(p)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={openForm} onOpenChange={setOpenForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Paket" : "Paket Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Tipe Paket</Label>
                <Select
                  value={form.package_type}
                  onValueChange={(v) => setForm({ ...form, package_type: v as PackageType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGE_TYPE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nama Paket</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={
                    umrohish
                      ? "Umroh Reguler 12 Hari"
                      : "Wisata Bali 4D3N All-in"
                  }
                />
              </div>
            </div>

            <div>
              <Label>Deskripsi</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={
                  umrohish
                    ? "Highlight ibadah, jadwal kunjungan, dll."
                    : "Destinasi (mis: Bali — Ubud, Tanah Lot, Pantai Kuta), gambaran perjalanan."
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Berangkat</Label>
                <Input
                  type="date"
                  value={form.departure_date}
                  onChange={(e) => setForm({ ...form, departure_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Pulang</Label>
                <Input
                  type="date"
                  value={form.return_date}
                  onChange={(e) => setForm({ ...form, return_date: e.target.value })}
                />
              </div>
              <div>
                <Label>Durasi (hari)</Label>
                <Input
                  type="number"
                  value={form.duration_days}
                  onChange={(e) => setForm({ ...form, duration_days: e.target.value })}
                />
              </div>
              <div>
                <Label>{umrohish ? "Maskapai" : "Transportasi"}</Label>
                <Input
                  value={form.airline}
                  onChange={(e) => setForm({ ...form, airline: e.target.value })}
                  placeholder={umrohish ? "Saudia, Garuda…" : "Pesawat / Bus / Kereta"}
                />
              </div>
            </div>

            {umrohish ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Hotel Mekkah</Label>
                    <Input
                      value={form.hotel_makkah}
                      onChange={(e) => setForm({ ...form, hotel_makkah: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Hotel Madinah</Label>
                    <Input
                      value={form.hotel_madinah}
                      onChange={(e) => setForm({ ...form, hotel_madinah: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Harga Quad</Label>
                    <Input
                      type="number"
                      value={form.price_quad}
                      onChange={(e) => setForm({ ...form, price_quad: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Harga Triple</Label>
                    <Input
                      type="number"
                      value={form.price_triple}
                      onChange={(e) => setForm({ ...form, price_triple: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Harga Double</Label>
                    <Input
                      type="number"
                      value={form.price_double}
                      onChange={(e) => setForm({ ...form, price_double: e.target.value })}
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Harga per Orang</Label>
                  <Input
                    type="number"
                    value={form.price_single}
                    onChange={(e) => setForm({ ...form, price_single: e.target.value })}
                    placeholder="2500000"
                  />
                </div>
                <div>
                  <Label>Kuota Total</Label>
                  <Input
                    type="number"
                    value={form.quota_total}
                    onChange={(e) => setForm({ ...form, quota_total: e.target.value })}
                  />
                </div>
              </div>
            )}

            {umrohish && (
              <div>
                <Label>Kuota Total Jamaah</Label>
                <Input
                  type="number"
                  value={form.quota_total}
                  onChange={(e) => setForm({ ...form, quota_total: e.target.value })}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Termasuk (1 per baris)</Label>
                <Textarea
                  rows={4}
                  value={form.includes}
                  onChange={(e) => setForm({ ...form, includes: e.target.value })}
                  placeholder={
                    umrohish
                      ? "Tiket pesawat\nVisa\nHotel bintang 4\nMakan 3x"
                      : "Tiket masuk wisata\nMakan 3x\nPemandu lokal\nAsuransi perjalanan"
                  }
                />
              </div>
              <div>
                <Label>Tidak Termasuk (1 per baris)</Label>
                <Textarea
                  rows={4}
                  value={form.excludes}
                  onChange={(e) => setForm({ ...form, excludes: e.target.value })}
                  placeholder={
                    umrohish
                      ? "Perlengkapan pribadi\nLaundry"
                      : "Pengeluaran pribadi\nTipping pemandu"
                  }
                />
              </div>
            </div>

            <div>
              <Label>Foto Cover Paket</Label>
              <UploadableImage
                value={form.cover_image_url || null}
                onChange={(url) => setForm({ ...form, cover_image_url: url ?? "" })}
                bucket="umroh-covers"
                pathPrefix={`${shop?.id ?? ""}/packages`}
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              <span className="text-sm">Aktif (tampilkan di storefront)</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenForm(false)}>
              Batal
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
