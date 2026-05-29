import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Upload, ImageIcon, Save, RefreshCw, Globe, Palette, Type, FileImage } from "lucide-react";

export const Route = createFileRoute("/admin/branding")({
  head: () => ({ meta: [{ title: "Branding Platform — Admin" }] }),
  component: AdminBranding,
});

type BrandingConfig = {
  platform_name: string;
  platform_tagline: string;
  support_email: string;
  support_whatsapp: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string;
  secondary_color: string;
  footer_text: string;
  meta_title: string;
  meta_description: string;
  og_image_url: string | null;
  announcement_text: string;
  announcement_enabled: boolean;
};

const DEFAULTS: BrandingConfig = {
  platform_name: "UMKMgo",
  platform_tagline: "Marketplace & POS untuk semua bisnis Indonesia",
  support_email: "support@umkmgo.id",
  support_whatsapp: "",
  logo_url: null,
  favicon_url: null,
  primary_color: "#18181b",
  secondary_color: "#f59e0b",
  footer_text: "© 2026 UMKMgo. Semua hak dilindungi.",
  meta_title: "UMKMgo — Marketplace & POS",
  meta_description: "Platform marketplace dan point-of-sale terpadu untuk bisnis F&B, fashion, digital, dan lebih banyak lagi.",
  og_image_url: null,
  announcement_text: "",
  announcement_enabled: false,
};

function ImageUploader({ label, value, onUpload, bucket, path }: {
  label: string; value: string | null; onUpload: (url: string) => void; bucket: string; path: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handle = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Maksimal 5MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() || "png";
    const fullPath = `${path}.${ext}`;
    const { error } = await supabase.storage.from(bucket).upload(fullPath, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from(bucket).getPublicUrl(fullPath);
    onUpload(data.publicUrl + `?v=${Date.now()}`);
    setUploading(false);
    if (ref.current) ref.current.value = "";
  };

  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1.5 flex items-center gap-3">
        {value ? (
          <img src={value} alt={label} className="h-12 w-12 rounded-lg border border-border object-contain bg-muted/30" loading="lazy" decoding="async" />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => ref.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? "Uploading..." : "Upload"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground" onClick={() => onUpload("")}>
              Hapus
            </Button>
          )}
        </div>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handle} />
      </div>
    </div>
  );
}

function AdminBranding() {
  const [cfg, setCfg] = useState<BrandingConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("platform_settings" as any)
      .select("value")
      .eq("key", "branding")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCfg({ ...DEFAULTS, ...(data as any).value });
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings" as any)
      .upsert({ key: "branding", value: cfg, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) toast.error(error.message);
    else toast.success("Branding platform tersimpan");
    setSaving(false);
  };

  const set = (patch: Partial<BrandingConfig>) => setCfg(c => ({ ...c, ...patch }));

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Branding Platform</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Nama, logo, warna, dan identitas platform yang tampil ke pengguna.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="shrink-0 gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan
        </Button>
      </div>

      {/* Identity */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Type className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Identitas Platform</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Nama Platform *</Label>
            <Input className="mt-1.5" value={cfg.platform_name} onChange={e => set({ platform_name: e.target.value })} placeholder="UMKMgo" />
          </div>
          <div>
            <Label>Support Email</Label>
            <Input className="mt-1.5" type="email" value={cfg.support_email} onChange={e => set({ support_email: e.target.value })} placeholder="support@platform.id" />
          </div>
        </div>
        <div>
          <Label>Tagline</Label>
          <Input className="mt-1.5" value={cfg.platform_tagline} onChange={e => set({ platform_tagline: e.target.value })} placeholder="Marketplace & POS terpadu" />
        </div>
        <div>
          <Label>WhatsApp Support <span className="text-muted-foreground">(opsional)</span></Label>
          <Input className="mt-1.5" value={cfg.support_whatsapp} onChange={e => set({ support_whatsapp: e.target.value })} placeholder="628123456789" />
        </div>
      </Card>

      {/* Logo & favicon */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <FileImage className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Logo & Favicon</p>
        </div>
        <ImageUploader label="Logo Platform (PNG transparan direkomendasikan)" value={cfg.logo_url} onUpload={url => set({ logo_url: url || null })} bucket="shop-assets" path="platform/logo" />
        <ImageUploader label="Favicon (32×32 atau 64×64 px)" value={cfg.favicon_url} onUpload={url => set({ favicon_url: url || null })} bucket="shop-assets" path="platform/favicon" />
        <ImageUploader label="Open Graph Image (untuk share link di sosmed)" value={cfg.og_image_url} onUpload={url => set({ og_image_url: url || null })} bucket="shop-assets" path="platform/og-image" />
      </Card>

      {/* Colors */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Palette className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">Warna Brand</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Warna Primer</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <input type="color" value={cfg.primary_color} onChange={e => set({ primary_color: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border border-border p-0.5" />
              <Input value={cfg.primary_color} onChange={e => set({ primary_color: e.target.value })} className="font-mono text-sm" placeholder="#18181b" />
            </div>
          </div>
          <div>
            <Label>Warna Sekunder (Aksen)</Label>
            <div className="mt-1.5 flex items-center gap-2">
              <input type="color" value={cfg.secondary_color} onChange={e => set({ secondary_color: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border border-border p-0.5" />
              <Input value={cfg.secondary_color} onChange={e => set({ secondary_color: e.target.value })} className="font-mono text-sm" placeholder="#f59e0b" />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-border p-3 text-center text-xs text-muted-foreground">
          Preview: <span className="font-medium" style={{ color: cfg.primary_color }}>{cfg.platform_name}</span>
          <span className="mx-1">·</span>
          <span className="font-medium" style={{ color: cfg.secondary_color }}>Warna aksen</span>
        </div>
      </Card>

      {/* SEO */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="h-4 w-4 text-primary" />
          <p className="text-sm font-semibold">SEO & Meta</p>
        </div>
        <div>
          <Label>Meta Title (tab browser)</Label>
          <Input className="mt-1.5" value={cfg.meta_title} onChange={e => set({ meta_title: e.target.value })} maxLength={70} />
          <p className="mt-1 text-xs text-muted-foreground">{cfg.meta_title.length}/70 karakter</p>
        </div>
        <div>
          <Label>Meta Description</Label>
          <Textarea className="mt-1.5" rows={2} value={cfg.meta_description} onChange={e => set({ meta_description: e.target.value })} maxLength={160} />
          <p className="mt-1 text-xs text-muted-foreground">{cfg.meta_description.length}/160 karakter</p>
        </div>
        <div>
          <Label>Teks Footer</Label>
          <Input className="mt-1.5" value={cfg.footer_text} onChange={e => set({ footer_text: e.target.value })} placeholder="© 2026 Platform. Semua hak dilindungi." />
        </div>
      </Card>

      {/* Announcement banner */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">Banner Pengumuman</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tampil di bagian atas semua halaman marketplace</p>
          </div>
          <input type="checkbox" checked={cfg.announcement_enabled} onChange={e => set({ announcement_enabled: e.target.checked })}
            className="h-4 w-4 accent-primary cursor-pointer" />
        </div>
        {cfg.announcement_enabled && (
          <div>
            <Label>Teks Pengumuman</Label>
            <Input className="mt-1.5" value={cfg.announcement_text} onChange={e => set({ announcement_text: e.target.value })}
              placeholder="🎉 Promo peluncuran! Gratis ongkos kirim untuk 1000 pembeli pertama." />
          </div>
        )}
      </Card>
    </div>
  );
}
