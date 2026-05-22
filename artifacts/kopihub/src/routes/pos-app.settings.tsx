import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Loader2, Upload, Trash2, Store, Phone, MapPin, Clock, Share2, Save, Image as ImageIcon, QrCode, CreditCard, Receipt as ReceiptIcon, Bell, MessageSquare, Printer, Bot } from "lucide-react";
import { toast } from "sonner";
import { NotificationSettings } from "@/components/NotificationSettings";
import { ShopLocationPicker } from "@/components/ShopLocationPicker";

export const Route = createFileRoute("/pos-app/settings")({
  component: SettingsPage,
});

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type DayHours = { open: string; close: string; closed: boolean };
type OpenHours = Record<DayKey, DayHours>;

const DAYS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "Senin" },
  { key: "tue", label: "Selasa" },
  { key: "wed", label: "Rabu" },
  { key: "thu", label: "Kamis" },
  { key: "fri", label: "Jumat" },
  { key: "sat", label: "Sabtu" },
  { key: "sun", label: "Minggu" },
];

const DEFAULT_HOURS: OpenHours = {
  mon: { open: "08:00", close: "22:00", closed: false },
  tue: { open: "08:00", close: "22:00", closed: false },
  wed: { open: "08:00", close: "22:00", closed: false },
  thu: { open: "08:00", close: "22:00", closed: false },
  fri: { open: "08:00", close: "22:00", closed: false },
  sat: { open: "08:00", close: "22:00", closed: false },
  sun: { open: "08:00", close: "22:00", closed: false },
};

const AUTO_PRINT_KEY = "umkmgo.auto_print_online_orders";

export function getAutoPrintEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(AUTO_PRINT_KEY) === "true";
}

export function setAutoPrintEnabled(v: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTO_PRINT_KEY, v ? "true" : "false");
}

type PaymentMethod = "cash" | "qris" | "transfer";

type ShopRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tagline: string | null;
  logo_url: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  instagram: string | null;
  whatsapp: string | null;
  open_hours: OpenHours | null;
  qris_image_url: string | null;
  qris_merchant_name: string | null;
  payment_methods_enabled: PaymentMethod[];
  tax_percent: number;
  service_charge_percent: number;
  tax_inclusive: boolean;
  receipt_header: string | null;
  receipt_footer: string | null;
  auto_reply_enabled: boolean;
  auto_reply_message: string | null;
  deposit_enabled: boolean;
  deposit_percentage: number;
  deposit_min_total: number;
};

function SettingsPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const qrisFileRef = useRef<HTMLInputElement>(null);
  const [uploadingQris, setUploadingQris] = useState(false);
  const [form, setForm] = useState<ShopRow | null>(null);
  const [autoPrint, setAutoPrint] = useState(false);

  useEffect(() => {
    setAutoPrint(getAutoPrintEnabled());
  }, []);

  useEffect(() => {
    if (!shop) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("shops")
        .select("id, name, slug, description, tagline, logo_url, phone, email, address, instagram, whatsapp, open_hours, qris_image_url, qris_merchant_name, payment_methods_enabled, tax_percent, service_charge_percent, tax_inclusive, receipt_header, receipt_footer, auto_reply_enabled, auto_reply_message, deposit_enabled, deposit_percentage, deposit_min_total")
        .eq("id", shop.id)
        .maybeSingle();
      if (data) {
        setForm({
          ...data,
          open_hours: (data.open_hours as OpenHours | null) ?? DEFAULT_HOURS,
          payment_methods_enabled: (data.payment_methods_enabled ?? ["cash", "qris"]) as PaymentMethod[],
          tax_percent: Number(data.tax_percent ?? 0),
          service_charge_percent: Number(data.service_charge_percent ?? 0),
          tax_inclusive: Boolean(data.tax_inclusive ?? false),
          receipt_header: data.receipt_header ?? null,
          receipt_footer: data.receipt_footer ?? null,
          auto_reply_enabled: Boolean((data as any).auto_reply_enabled ?? false),
          auto_reply_message: (data as any).auto_reply_message ?? null,
          deposit_enabled: Boolean((data as any).deposit_enabled ?? false),
          deposit_percentage: Number((data as any).deposit_percentage ?? 30),
          deposit_min_total: Number((data as any).deposit_min_total ?? 0),
        } as ShopRow);
      }
      setLoading(false);
    })();
  }, [shop]);

  if (shopLoading || loading || !form) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const update = <K extends keyof ShopRow>(k: K, v: ShopRow[K]) =>
    setForm((f) => (f ? { ...f, [k]: v } : f));

  const updateHour = (day: DayKey, patch: Partial<DayHours>) =>
    setForm((f) =>
      f
        ? {
            ...f,
            open_hours: {
              ...(f.open_hours ?? DEFAULT_HOURS),
              [day]: { ...(f.open_hours ?? DEFAULT_HOURS)[day], ...patch },
            },
          }
        : f
    );

  const onUpload = async (file: File) => {
    if (!shop) return;
    if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Ukuran maksimal 2MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${shop.id}/logo-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("shop-logos").upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data: pub } = supabase.storage.from("shop-logos").getPublicUrl(path);
    update("logo_url", pub.publicUrl);
    setUploading(false);
    toast.success("Logo terunggah, simpan untuk menerapkan");
  };

  const onRemoveLogo = () => update("logo_url", null);

  const onUploadQris = async (file: File) => {
    if (!shop) return;
    if (!file.type.startsWith("image/")) { toast.error("File harus berupa gambar"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Ukuran maksimal 2MB"); return; }
    setUploadingQris(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${shop.id}/qris-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("shop-logos").upload(path, file, { cacheControl: "3600", upsert: false });
    if (upErr) { toast.error(upErr.message); setUploadingQris(false); return; }
    const { data: pub } = supabase.storage.from("shop-logos").getPublicUrl(path);
    update("qris_image_url", pub.publicUrl);
    setUploadingQris(false);
    toast.success("QRIS terunggah, simpan untuk menerapkan");
  };

  const togglePayment = (m: PaymentMethod) => {
    setForm((f) => {
      if (!f) return f;
      const enabled = f.payment_methods_enabled ?? [];
      const next = enabled.includes(m) ? enabled.filter((x) => x !== m) : [...enabled, m];
      return { ...f, payment_methods_enabled: next.length ? next : ["cash"] };
    });
  };

  const handleAutoPrintChange = (v: boolean) => {
    setAutoPrint(v);
    setAutoPrintEnabled(v);
    toast.success(v ? "Auto-print struk aktif untuk perangkat ini" : "Auto-print struk dinonaktifkan");
  };

  const onSave = async () => {
    if (!shop || !form) return;
    setSaving(true);

    type BrandField = "name" | "logo_url" | "address" | "phone";
    const brandFields: BrandField[] = ["name", "logo_url", "address", "phone"];
    const current = shop as unknown as Record<BrandField, string | null>;
    const next = form as unknown as Record<BrandField, string | null>;
    const changes = brandFields
      .map((f) => ({ field: f, oldVal: (current[f] ?? "") || null, newVal: (next[f] ?? "") || null }))
      .filter((c) => (c.oldVal ?? "") !== (c.newVal ?? ""));

    const { error } = await supabase
      .from("shops")
      .update({
        name: form.name,
        description: form.description,
        tagline: form.tagline,
        logo_url: form.logo_url,
        phone: form.phone,
        email: form.email,
        address: form.address,
        instagram: form.instagram,
        whatsapp: form.whatsapp,
        open_hours: form.open_hours as never,
        qris_image_url: form.qris_image_url,
        qris_merchant_name: form.qris_merchant_name,
        payment_methods_enabled: form.payment_methods_enabled,
        tax_percent: form.tax_percent,
        service_charge_percent: form.service_charge_percent,
        tax_inclusive: form.tax_inclusive,
        receipt_header: form.receipt_header,
        receipt_footer: form.receipt_footer,
        auto_reply_enabled: form.auto_reply_enabled,
        auto_reply_message: form.auto_reply_message,
        deposit_enabled: form.deposit_enabled,
        deposit_percentage: form.deposit_percentage,
        deposit_min_total: form.deposit_min_total,
      } as never)
      .eq("id", shop.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }

    if (changes.length > 0) {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (uid) {
        const rows = changes.map((c) => ({
          shop_id: shop.id,
          changed_by: uid,
          field: c.field,
          old_value: c.oldVal,
          new_value: c.newVal,
        }));
        await supabase.from("branding_audit").insert(rows);
      }
    }

    toast.success(changes.length > 0
      ? `Pengaturan tersimpan (${changes.length} perubahan branding tercatat)`
      : "Pengaturan tersimpan",
    );
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 lg:px-8 lg:py-10">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengaturan Toko</h1>
          <p className="mt-1 text-sm text-muted-foreground">Identitas, kontak, dan jam operasional toko Anda.</p>
        </div>
        <Button onClick={onSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Simpan perubahan
        </Button>
      </div>

      {/* Identitas */}
      <Section icon={Store} title="Identitas Toko" desc="Nama, logo, dan deskripsi toko di etalase publik.">
        <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
          <div>
            <Label className="mb-2 block">Logo</Label>
            <div className="relative h-32 w-32 overflow-hidden rounded-xl border border-dashed border-border bg-muted/30 flex items-center justify-center">
              {form.logo_url
                ? <img src={form.logo_url} alt="Logo" className="h-full w-full object-cover" />
                : <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
              }
            </div>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              </Button>
              {form.logo_url && (
                <Button size="sm" variant="outline" onClick={onRemoveLogo}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Maks 2MB</p>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="name">Nama toko</Label>
              <Input id="name" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="tagline">Tagline</Label>
              <Input id="tagline" placeholder="Mis. Produk berkualitas, harga sahabat" value={form.tagline ?? ""}
                onChange={(e) => update("tagline", e.target.value)} />
            </div>
            <div>
              <Label htmlFor="desc">Deskripsi</Label>
              <Textarea id="desc" rows={3} value={form.description ?? ""}
                onChange={(e) => update("description", e.target.value)} />
            </div>
            <div className="text-xs text-muted-foreground">
              URL etalase: <code className="rounded bg-muted px-1.5 py-0.5">/s/{form.slug}</code>
            </div>
          </div>
        </div>
      </Section>

      {/* Kontak */}
      <Section icon={Phone} title="Kontak" desc="Cara pelanggan menghubungi toko.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="No. telepon" value={form.phone ?? ""} onChange={(v) => update("phone", v)} placeholder="0812..." />
          <Field label="WhatsApp" value={form.whatsapp ?? ""} onChange={(v) => update("whatsapp", v)} placeholder="62812..." />
          <Field label="Email" value={form.email ?? ""} onChange={(v) => update("email", v)} placeholder="kontak@toko.com" />
          <Field label="Instagram" value={form.instagram ?? ""} onChange={(v) => update("instagram", v)} placeholder="@toko" />
        </div>
      </Section>

      {/* Alamat */}
      <Section icon={MapPin} title="Alamat" desc="Lokasi fisik toko.">
        <Textarea rows={2} value={form.address ?? ""}
          onChange={(e) => update("address", e.target.value)} placeholder="Jl. Contoh No. 123, Kota..." />
      </Section>

      {/* Jam operasional */}
      <Section icon={Clock} title="Jam Operasional" desc="Atur jam buka per hari. Auto-reply akan aktif di luar jam ini.">
        <div className="space-y-2">
          {DAYS.map(({ key, label }) => {
            const h = (form.open_hours ?? DEFAULT_HOURS)[key];
            return (
              <div key={key} className="grid grid-cols-[80px_1fr_auto_1fr_auto] items-center gap-2 sm:gap-3">
                <span className="text-sm font-medium">{label}</span>
                <Input type="time" value={h.open} disabled={h.closed}
                  onChange={(e) => updateHour(key, { open: e.target.value })} />
                <span className="text-xs text-muted-foreground">–</span>
                <Input type="time" value={h.close} disabled={h.closed}
                  onChange={(e) => updateHour(key, { close: e.target.value })} />
                <label className="flex items-center gap-1.5 text-xs">
                  <Switch checked={!h.closed} onCheckedChange={(v) => updateHour(key, { closed: !v })} />
                  <span className="text-muted-foreground">{h.closed ? "Tutup" : "Buka"}</span>
                </label>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Auto-reply (F5-1) */}
      <Section icon={Bot} title="Auto-Reply di Luar Jam Buka" desc="Kirim pesan otomatis ke customer saat toko sedang tutup.">
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <Switch
              checked={form.auto_reply_enabled}
              onCheckedChange={(v) => update("auto_reply_enabled", v)}
            />
            <div>
              <p className="text-sm font-medium">Aktifkan auto-reply</p>
              <p className="text-xs text-muted-foreground">
                Pesan otomatis dikirim ke customer yang order di luar jam operasional.
              </p>
            </div>
          </label>
          {form.auto_reply_enabled && (
            <div>
              <Label>Pesan auto-reply</Label>
              <Textarea
                rows={3}
                maxLength={500}
                placeholder="Halo! Toko kami sedang tutup. Kami akan memproses pesananmu segera saat buka kembali. Terima kasih! 🙏"
                value={form.auto_reply_message ?? ""}
                onChange={(e) => update("auto_reply_message", e.target.value || null)}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Pesan ini akan tampil di detail pesanan customer jika order masuk di luar jam buka.
              </p>
            </div>
          )}
        </div>
      </Section>

      {/* Auto Print Struk (F5-4) — per device, stored in localStorage */}
      <Section icon={Printer} title="Auto-Print Struk" desc="Cetak struk otomatis saat pesanan online masuk (hanya berlaku untuk perangkat ini).">
        <label className="flex items-center gap-3">
          <Switch
            checked={autoPrint}
            onCheckedChange={handleAutoPrintChange}
          />
          <div>
            <p className="text-sm font-medium">Cetak struk otomatis</p>
            <p className="text-xs text-muted-foreground">
              Saat ada pesanan online baru, struk langsung dicetak tanpa klik manual.
              Pastikan printer terkoneksi di perangkat ini.
            </p>
          </div>
        </label>
        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
          <p className="text-xs text-amber-800">
            ⚠️ Pengaturan ini disimpan per perangkat. Aktifkan di kasir/komputer yang terhubung printer.
          </p>
        </div>
      </Section>

      {/* Pembayaran */}
      <Section icon={CreditCard} title="Pembayaran" desc="Metode pembayaran yang ditawarkan ke pelanggan online.">
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {(["cash", "qris", "transfer"] as PaymentMethod[]).map((m) => {
              const active = (form.payment_methods_enabled ?? []).includes(m);
              const labels: Record<PaymentMethod, string> = {
                cash: "Cash di tempat",
                qris: "QRIS (statis)",
                transfer: "Transfer bank",
              };
              return (
                <button key={m} type="button" onClick={() => togglePayment(m)}
                  className={`rounded-lg border px-3 py-2.5 text-sm text-left transition-colors ${
                    active ? "border-primary bg-primary/5 font-medium" : "border-border hover:bg-accent"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{labels[m]}</span>
                    {active && <span className="text-primary text-xs">✓</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {(form.payment_methods_enabled ?? []).includes("qris") && (
            <div className="rounded-lg border border-border bg-muted/20 p-4">
              <div className="mb-2 flex items-center gap-2">
                <QrCode className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">QRIS statis</h3>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Upload gambar QR code statis dari merchant Anda. Pelanggan akan scan & upload bukti bayar untuk verifikasi manual.
              </p>
              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <div>
                  <div className="relative h-40 w-40 overflow-hidden rounded-lg border border-dashed border-border bg-background flex items-center justify-center">
                    {form.qris_image_url
                      ? <img src={form.qris_image_url} alt="QRIS" className="h-full w-full object-contain" />
                      : <QrCode className="h-10 w-10 text-muted-foreground/40" />
                    }
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="outline" disabled={uploadingQris} onClick={() => qrisFileRef.current?.click()}>
                      {uploadingQris ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                    </Button>
                    {form.qris_image_url && (
                      <Button size="sm" variant="outline" onClick={() => update("qris_image_url", null)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <input ref={qrisFileRef} type="file" accept="image/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadQris(f); e.target.value = ""; }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <Label>Nama merchant</Label>
                    <Input placeholder="Mis. Toko Berkah Sahabat" value={form.qris_merchant_name ?? ""}
                      onChange={(e) => update("qris_merchant_name", e.target.value)} />
                    <p className="mt-1 text-xs text-muted-foreground">Tampil di halaman pembayaran pelanggan.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </Section>

      {/* Down Payment / DP */}
      <Section icon={CreditCard} title="Down Payment (DP)" desc="Aktifkan untuk meminta pelanggan bayar uang muka saat checkout. Sisa dilunasi setelah pesanan diterima.">
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
            <div>
              <div className="text-sm font-medium">Aktifkan DP otomatis</div>
              <p className="text-xs text-muted-foreground">Order yang memenuhi minimum total akan otomatis dihitung DP-nya.</p>
            </div>
            <Switch
              checked={form.deposit_enabled}
              onCheckedChange={(v) => update("deposit_enabled", Boolean(v))}
            />
          </div>

          {form.deposit_enabled && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Persentase DP (%)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  value={form.deposit_percentage}
                  onChange={(e) => update("deposit_percentage", Math.max(1, Math.min(100, Number(e.target.value || 0))))}
                  placeholder="30"
                />
                <p className="mt-1 text-xs text-muted-foreground">Mis. 30 = pelanggan bayar 30% di awal.</p>
              </div>
              <div>
                <Label>Minimum total (Rp)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={form.deposit_min_total}
                  onChange={(e) => update("deposit_min_total", Math.max(0, Number(e.target.value || 0)))}
                  placeholder="0"
                />
                <p className="mt-1 text-xs text-muted-foreground">DP berlaku jika total ≥ nilai ini. Isi 0 untuk semua order.</p>
              </div>
            </div>
          )}
        </div>
      </Section>


      <Section icon={ReceiptIcon} title="Pajak & Service Charge" desc="Diterapkan otomatis saat checkout POS dan online.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Pajak (%)</Label>
            <Input type="number" inputMode="decimal" value={form.tax_percent}
              onChange={(e) => update("tax_percent", Number(e.target.value || 0))} placeholder="0" />
            <p className="mt-1 text-xs text-muted-foreground">Mis. PB1 10%. Isi 0 jika tidak pakai.</p>
          </div>
          <div>
            <Label>Service charge (%)</Label>
            <Input type="number" inputMode="decimal" value={form.service_charge_percent}
              onChange={(e) => update("service_charge_percent", Number(e.target.value || 0))} placeholder="0" />
            <p className="mt-1 text-xs text-muted-foreground">Mis. 5%. Dihitung sebelum pajak.</p>
          </div>
          <label className="flex items-center gap-2 sm:col-span-2 mt-1">
            <Switch checked={form.tax_inclusive} onCheckedChange={(v) => update("tax_inclusive", v)} />
            <span className="text-sm">Harga sudah termasuk pajak (tax inclusive)</span>
          </label>
        </div>
      </Section>

      {/* Struk / Receipt */}
      <Section icon={ReceiptIcon} title="Kustomisasi Struk" desc="Teks header & footer yang dicetak di struk.">
        <div className="grid gap-4">
          <div>
            <Label>Header struk</Label>
            <Textarea rows={2} placeholder="Mis. Terima kasih sudah berkunjung!"
              value={form.receipt_header ?? ""}
              onChange={(e) => update("receipt_header", e.target.value || null)} />
            <p className="mt-1 text-xs text-muted-foreground">Ditampilkan di atas struk setelah nama toko.</p>
          </div>
          <div>
            <Label>Footer struk</Label>
            <Textarea rows={2} placeholder="Mis. Follow IG @tokokopi untuk promo terbaru"
              value={form.receipt_footer ?? ""}
              onChange={(e) => update("receipt_footer", e.target.value || null)} />
            <p className="mt-1 text-xs text-muted-foreground">Ditampilkan di bawah struk setelah total.</p>
          </div>
        </div>
      </Section>

      {/* Share */}
      <Section icon={Share2} title="Bagikan etalase" desc="Salin link untuk dibagikan ke pelanggan.">
        <div className="flex gap-2">
          <Input readOnly
            value={typeof window !== "undefined" ? `${window.location.origin}/s/${form.slug}` : `/s/${form.slug}`} />
          <Button variant="outline" onClick={() => {
            const url = `${window.location.origin}/s/${form.slug}`;
            navigator.clipboard.writeText(url);
            toast.success("Link disalin");
          }}>
            Salin
          </Button>
        </div>
      </Section>

      <Section icon={Bell} title="Notifikasi" desc="Aktifkan suara & notifikasi browser untuk pesanan masuk.">
        <NotificationSettings shopId={shop?.id} />
      </Section>
    </div>
  );
}

function Section({
  icon: Icon, title, desc, children,
}: {
  icon: React.ElementType;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-5 rounded-xl border border-border bg-card p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label, value, onChange, placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}
