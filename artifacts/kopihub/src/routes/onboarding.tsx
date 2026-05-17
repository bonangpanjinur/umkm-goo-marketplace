import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
   Loader2, Store, ChevronRight, ChevronLeft,
  Check, Upload, FileImage, ShoppingBag, Shirt, Laptop,
  Sparkles, Hammer, Zap, Package, ArrowRight,
  Wrench, Car, GraduationCap, Stethoscope, Camera, Plane, Scissors,
  type LucideIcon
} from "lucide-react";
import { slugify } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding")({
  component: OnboardingPage,
});

// Icon mapping by category slug (slug = business_categories.slug di DB)
const CATEGORY_ICON: Record<string, LucideIcon> = {
  fnb: Store,
  retail: ShoppingBag,
  jasa: Wrench,
  rental: Car,
  kursus: GraduationCap,
  salon: Scissors,
  klinik: Stethoscope,
  "studio-foto": Camera,
  travel: Plane,
  "custom-order": Hammer,
  lainnya: Package,
  // legacy / fallback
  fashion: Shirt,
  digital: Laptop,
  beauty: Sparkles,
  craft: Hammer,
  electronics: Zap,
  general: ShoppingBag,
  other: Package,
};

type CategoryRow = { id: string; slug: string; name: string; description: string | null };

const STEPS = [
  { id: 1, label: "Profil Toko" },
  { id: 2, label: "Kategori Bisnis" },
  { id: 3, label: "Outlet Pertama" },
  { id: 4, label: "Verifikasi KTP" },
  { id: 5, label: "Selesai" },
];

function OnboardingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);

  // Step 1
  const [shopName, setShopName] = useState("");
  const [description, setDescription] = useState("");

  // Step 2
  const [categoryId, setCategoryId] = useState<string>("");

  // Step 3
  const [outletName, setOutletName] = useState("Outlet Pusat");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");

  // Step 4 — KYC
  const [kycFile, setKycFile] = useState<File | null>(null);
  const [kycPreview, setKycPreview] = useState<string | null>(null);
  const [kycUploading, setKycUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Created IDs
  const [shopId, setShopId] = useState<string | null>(null);

  // Kategori bisnis dari DB
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  useEffect(() => {
    supabase
      .from("business_categories")
      .select("id, slug, name, description")
      .eq("is_active", true)
      .order("sort_order")
      .then(({ data }) => setCategories((data as CategoryRow[]) ?? []));
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    (async () => {
      const { data } = await supabase
        .from("shops")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (data) { navigate({ to: "/pos-app" }); return; }
      setChecking(false);
    })();
  }, [user, loading, navigate]);

  const handleKycFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Maksimal 10MB"); return; }
    setKycFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setKycPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const submitStep1 = () => {
    if (!shopName.trim()) { toast.error("Nama toko harus diisi"); return; }
    setStep(2);
  };

  const submitStep2 = () => {
    if (categories.length === 0) {
      toast.error("Daftar kategori belum siap, mohon tunggu sebentar");
      return;
    }
    if (!categoryId) { toast.error("Pilih kategori bisnis"); return; }
    const valid = categories.some(c => c.slug === categoryId);
    if (!valid) {
      toast.error("Kategori tidak valid, pilih dari daftar yang tersedia");
      setCategoryId("");
      return;
    }
    setStep(3);
  };

  const submitStep3 = async () => {
    if (!outletName.trim()) { toast.error("Nama outlet harus diisi"); return; }
    setBusy(true);
    try {
      const baseSlug = slugify(shopName) || `shop-${user!.id.slice(0, 6)}`;
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

      // Resolve category slug → UUID (business_category_id is a UUID FK)
      const { data: cat } = await supabase
        .from("business_categories")
        .select("id")
        .eq("slug", categoryId)
        .eq("is_active", true)
        .maybeSingle();
      if (!cat?.id) {
        setBusy(false);
        setStep(2);
        setCategoryId("");
        toast.error("Kategori tidak ditemukan, silakan pilih ulang");
        return;
      }

      const { data: shop, error: shopErr } = await supabase
        .from("shops")
        .insert({
          owner_id: user!.id,
          name: shopName.trim(),
          slug,
          description: description.trim() || null,
          business_category_id: cat.id,
        } as any)
        .select("id")
        .single();
      if (shopErr || !shop) throw shopErr ?? new Error("Gagal membuat toko");
      setShopId(shop.id);

      const { data: outlet, error: outletErr } = await supabase
        .from("outlets")
        .insert({
          shop_id: shop.id,
          name: outletName.trim(),
          address: address.trim() || null,
          phone: phone.trim() || null,
        })
        .select("id")
        .single();
      if (outletErr || !outlet) throw outletErr ?? new Error("Gagal membuat outlet");

      await Promise.all([
        supabase.from("user_roles").insert({ user_id: user!.id, role: "owner", shop_id: shop.id }),
        supabase.from("user_preferences").upsert({ user_id: user!.id, default_outlet_id: outlet.id }),
      ]);

      setStep(4);
    } catch (err: any) {
      toast.error(err.message ?? "Terjadi kesalahan");
    } finally {
      setBusy(false);
    }
  };

  const submitStep4 = async (skip = false) => {
    if (!skip && !kycFile) { setStep(5); return; }
    if (skip || !kycFile) { setStep(5); return; }
    if (!shopId) { setStep(5); return; }

    setKycUploading(true);
    try {
      const ext = kycFile.name.split(".").pop() || "jpg";
      const path = `${shopId}/kyc-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("shop-verifications").upload(path, kycFile, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("shop-verifications").getPublicUrl(path);

      await (supabase as any).from("shops").update({
        kyc_document_url: urlData.publicUrl,
        kyc_status: "pending",
        kyc_submitted_at: new Date().toISOString(),
      }).eq("id", shopId);

      toast.success("Dokumen KTP berhasil diupload!");
      setStep(5);
    } catch (err: any) {
      toast.error(err.message ?? "Gagal upload KTP");
    } finally {
      setKycUploading(false);
    }
  };

  const goToDashboard = () => navigate({ to: "/pos-app" });

  if (loading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pct = ((step - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Brand */}
        <div className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="h-4 w-4" />
          </div>
          <span className="text-sm font-bold tracking-tight">UMKMgo</span>
        </div>

        {/* Step indicator */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex flex-1 flex-col items-center">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all ${
                  step > s.id ? "border-primary bg-primary text-primary-foreground" :
                  step === s.id ? "border-primary bg-background text-primary" :
                  "border-muted-foreground/30 bg-background text-muted-foreground/50"
                }`}>
                  {step > s.id ? <Check className="h-4 w-4" /> : s.id}
                </div>
                <span className={`mt-1 hidden text-[10px] font-medium sm:block ${step === s.id ? "text-foreground" : "text-muted-foreground/60"}`}>
                  {s.label}
                </span>
                {i < STEPS.length - 1 && (
                  <div className="absolute" />
                )}
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div className="h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Langkah {step} dari {STEPS.length}</p>
        </div>

        {/* Step 1 — Profil Toko */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Ceritakan tentang toko Anda</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Info dasar yang akan tampil di halaman toko Anda.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div>
                <Label htmlFor="shop">Nama toko *</Label>
                <Input id="shop" className="mt-1.5" required value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  placeholder="mis. Toko Berkah, Butik Arisa, Toko Digital Kreatif" />
              </div>
              <div>
                <Label htmlFor="desc">Deskripsi singkat <span className="text-muted-foreground">(opsional)</span></Label>
                <Textarea id="desc" className="mt-1.5" rows={3} value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Gambarkan produk/layanan Anda dalam 1-2 kalimat" />
              </div>
            </div>
            <Button className="h-11 w-full gap-2" onClick={submitStep1} disabled={!shopName.trim()}>
              Lanjut <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Step 2 — Kategori Bisnis */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Kategori bisnis Anda?</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Ini membantu kami menyesuaikan fitur dan tampilan toko Anda.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {categories.map(cat => {
                const Icon = CATEGORY_ICON[cat.slug] ?? Package;
                const active = categoryId === cat.slug;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryId(cat.slug)}
                    className={`relative flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all ${
                      active ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/50 hover:bg-accent"
                    }`}
                  >
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{cat.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{cat.description ?? ""}</p>
                    </div>
                    {active && <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="h-11 flex-1 gap-2" onClick={() => setStep(1)}>
                <ChevronLeft className="h-4 w-4" /> Kembali
              </Button>
              <Button className="h-11 flex-1 gap-2" onClick={submitStep2} disabled={!categoryId}>
                Lanjut <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3 — Outlet Pertama */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Lokasi outlet pertama</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Bisa ditambah lebih banyak outlet nanti dari dashboard.</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              <div>
                <Label htmlFor="outlet">Nama outlet *</Label>
                <Input id="outlet" className="mt-1.5" required value={outletName}
                  onChange={e => setOutletName(e.target.value)} placeholder="mis. Pusat, Cabang BSD" />
              </div>
              <div>
                <Label htmlFor="address">Alamat <span className="text-muted-foreground">(opsional)</span></Label>
                <Input id="address" className="mt-1.5" value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Jl. Asia Afrika No.1, Bandung" />
              </div>
              <div>
                <Label htmlFor="phone">Nomor telepon <span className="text-muted-foreground">(opsional)</span></Label>
                <Input id="phone" className="mt-1.5" type="tel" value={phone}
                  onChange={e => setPhone(e.target.value)} placeholder="0812-3456-7890" />
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="h-11 flex-1 gap-2" onClick={() => setStep(2)} disabled={busy}>
                <ChevronLeft className="h-4 w-4" /> Kembali
              </Button>
              <Button className="h-11 flex-1 gap-2" onClick={submitStep3} disabled={busy || !outletName.trim()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ChevronRight className="h-4 w-4" /></>}
                {busy ? "Membuat toko..." : "Lanjut"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4 — Upload KTP */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Verifikasi identitas (KTP)</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Opsional sekarang, tapi diperlukan sebelum toko bisa aktif penuh. Bisa diupload nanti dari dashboard.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
              {kycPreview ? (
                <div className="space-y-3">
                  <img src={kycPreview} alt="Preview KTP" className="max-h-52 w-full rounded-lg border border-border object-contain bg-muted/30" />
                  <Button variant="outline" size="sm" className="w-full" onClick={() => { setKycFile(null); setKycPreview(null); }}>
                    Ganti foto
                  </Button>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 transition-colors hover:bg-accent"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background border border-border">
                    <FileImage className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Klik untuk pilih foto KTP</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">JPG/PNG/WebP, maks. 10MB</p>
                  </div>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleKycFile} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="h-11 flex-1 gap-2" onClick={() => submitStep4(true)} disabled={kycUploading}>
                Lewati untuk sekarang
              </Button>
              <Button className="h-11 flex-1 gap-2" onClick={() => submitStep4(false)} disabled={!kycFile || kycUploading}>
                {kycUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {kycUploading ? "Mengupload..." : "Upload & Lanjut"}
              </Button>
            </div>
          </div>
        )}

        {/* Step 5 — Selesai */}
        {step === 5 && (
          <div className="space-y-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
              <Store className="h-10 w-10 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Toko <span className="text-primary">{shopName}</span> siap!</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Selamat bergabung di UMKMgo. Mulai tambahkan produk dan kelola toko Anda dari dashboard.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-left">
              {[
                { icon: "🛍️", title: "Tambah produk pertama", desc: "Dari menu Produk / Menu" },
                { icon: "🖼️", title: "Atur tampilan toko", desc: "Logo, banner, warna brand" },
                { icon: "🔗", title: "Bagikan link toko", desc: "Share ke media sosial" },
                { icon: "📦", title: "Terima pesanan", desc: "Pantau dari dashboard" },
              ].map(item => (
                <div key={item.title} className="rounded-xl border border-border bg-card p-3">
                  <p className="text-lg">{item.icon}</p>
                  <p className="mt-1 text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
            {!kycFile && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-left">
                <p className="text-sm font-medium text-amber-800">Jangan lupa verifikasi KTP</p>
                <p className="mt-0.5 text-xs text-amber-600">Upload KTP di menu Verifikasi KYC agar toko bisa aktif penuh dan mendapat badge Terverifikasi.</p>
              </div>
            )}
            <Button className="h-12 w-full gap-2 text-base" onClick={goToDashboard}>
              Masuk Dashboard <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
