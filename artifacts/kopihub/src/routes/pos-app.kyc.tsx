import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2, ShieldCheck, ShieldX, Clock, Upload,
  CheckCircle2, XCircle, AlertCircle, FileImage, RefreshCw
} from "lucide-react";

export const Route = createFileRoute("/pos-app/kyc")({
  component: KycPage,
});

type KycStatus = "not_submitted" | "pending" | "in_review" | "approved" | "rejected" | "expired";

type ShopKyc = {
  kyc_status: KycStatus | null;
  kyc_document_url: string | null;
  kyc_submitted_at: string | null;
  kyc_reviewed_at: string | null;
  kyc_reject_reason: string | null;
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

const STATUS_INFO: Record<string, { icon: typeof ShieldCheck; title: string; desc: string; color: string }> = {
  not_submitted: {
    icon: AlertCircle,
    title: "Belum Upload KTP",
    desc: "Upload foto KTP Anda agar toko bisa aktif dan dipercaya pembeli.",
    color: "text-amber-500",
  },
  pending: {
    icon: Clock,
    title: "Menunggu Review",
    desc: "Dokumen Anda sudah diterima dan sedang antri untuk diverifikasi.",
    color: "text-amber-500",
  },
  in_review: {
    icon: Clock,
    title: "Sedang Ditinjau",
    desc: "Tim admin sedang memeriksa dokumen identitas Anda. Biasanya selesai dalam 1×24 jam.",
    color: "text-blue-500",
  },
  approved: {
    icon: ShieldCheck,
    title: "KYC Terverifikasi",
    desc: "Identitas Anda telah diverifikasi. Toko Anda mendapat badge Terverifikasi.",
    color: "text-green-500",
  },
  rejected: {
    icon: ShieldX,
    title: "KYC Ditolak",
    desc: "Dokumen Anda tidak memenuhi syarat. Silakan upload ulang.",
    color: "text-red-500",
  },
  expired: {
    icon: AlertCircle,
    title: "Dokumen Kadaluarsa",
    desc: "Verifikasi Anda perlu diperbarui. Upload dokumen baru.",
    color: "text-orange-500",
  },
};

function KycPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [kyc, setKyc] = useState<ShopKyc | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!shop) return;
    setLoading(true);
    const { data } = await (supabase as any)
      .from("shops")
      .select("kyc_status, kyc_document_url, kyc_submitted_at, kyc_reviewed_at, kyc_reject_reason")
      .eq("id", shop.id)
      .maybeSingle();
    setKyc((data as ShopKyc) ?? { kyc_status: null, kyc_document_url: null, kyc_submitted_at: null, kyc_reviewed_at: null, kyc_reject_reason: null });
    setLoading(false);
  };

  useEffect(() => { if (shop) load(); }, [shop?.id]);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !shop) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Maksimal 10MB"); return; }
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowed.includes(file.type)) { toast.error("Format harus JPG, PNG, atau WebP"); return; }

    // Local preview
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `kyc/${shop.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("shop-assets").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("shop-assets").getPublicUrl(path);
      const docUrl = urlData.publicUrl;

      const { error: dbErr } = await supabase
        .from("shops")
        .update({
          kyc_document_url: docUrl,
          kyc_status: "pending",
          kyc_submitted_at: new Date().toISOString(),
          kyc_reject_reason: null,
        } as any)
        .eq("id", shop.id);
      if (dbErr) throw dbErr;

      toast.success("Dokumen berhasil diupload! Kami akan meninjau dalam 1×24 jam.");
      await load();
      setPreview(null);
    } catch (err: any) {
      toast.error(err.message ?? "Gagal upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  if (shopLoading || loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const status = (kyc?.kyc_status ?? "not_submitted") as KycStatus;
  const info = STATUS_INFO[status] ?? STATUS_INFO.not_submitted;
  const Icon = info.icon;
  const canUpload = status === "not_submitted" || status === "rejected" || status === "expired";

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Verifikasi Identitas (KYC)</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Verifikasi KTP membantu pembeli mempercayai toko Anda dan diperlukan sebelum toko bisa dipublish.
        </p>
      </div>

      {/* Status Card */}
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <div className={`mt-0.5 ${info.color}`}>
            <Icon className="h-8 w-8" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-semibold">{info.title}</h2>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                status === "approved" ? "bg-green-100 text-green-700" :
                status === "pending" || status === "in_review" ? "bg-blue-100 text-blue-700" :
                status === "rejected" ? "bg-red-100 text-red-700" :
                "bg-amber-100 text-amber-700"
              }`}>
                {status === "not_submitted" ? "Belum Submit" :
                 status === "pending" ? "Pending" :
                 status === "in_review" ? "Ditinjau" :
                 status === "approved" ? "Terverifikasi" :
                 status === "rejected" ? "Ditolak" : "Kadaluarsa"}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{info.desc}</p>

            {status === "rejected" && kyc?.kyc_reject_reason && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-xs font-medium text-red-700">Alasan penolakan:</p>
                <p className="mt-0.5 text-sm text-red-600">{kyc.kyc_reject_reason}</p>
              </div>
            )}

            {kyc?.kyc_submitted_at && (
              <p className="mt-2 text-xs text-muted-foreground">
                Disubmit: {fmtDate(kyc.kyc_submitted_at)}
                {kyc.kyc_reviewed_at && ` · Direview: ${fmtDate(kyc.kyc_reviewed_at)}`}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Document preview if already uploaded */}
      {kyc?.kyc_document_url && status !== "not_submitted" && (
        <Card className="p-4">
          <p className="mb-3 text-sm font-medium text-muted-foreground">Dokumen yang diupload</p>
          <img
            src={kyc.kyc_document_url}
            alt="Dokumen KYC"
            className="max-h-64 w-full rounded-lg border border-border object-contain bg-muted/30"
          />
        </Card>
      )}

      {/* Upload area */}
      {canUpload && (
        <Card className="p-5">
          <p className="mb-1 text-sm font-medium">{status === "rejected" ? "Upload ulang dokumen" : "Upload dokumen identitas"}</p>
          <p className="mb-4 text-xs text-muted-foreground">
            Foto KTP atau SIM yang jelas dan terbaca. Format JPG/PNG/WebP, maks. 10MB.
          </p>

          {preview ? (
            <div className="space-y-3">
              <img src={preview} alt="Preview" className="max-h-56 w-full rounded-lg border border-border object-contain bg-muted/30" />
              <p className="text-center text-xs text-muted-foreground">Uploading...</p>
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
                <p className="text-sm font-medium">Klik untuk pilih foto</p>
                <p className="mt-0.5 text-xs text-muted-foreground">atau seret & lepas di sini</p>
              </div>
            </div>
          )}

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />

          <Button
            className="mt-3 w-full gap-2"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Mengupload..." : status === "rejected" ? "Upload Ulang Dokumen" : "Pilih & Upload Dokumen"}
          </Button>
        </Card>
      )}

      {/* Steps guide */}
      {canUpload && (
        <Card className="p-5 bg-muted/30">
          <p className="mb-3 text-sm font-semibold">Panduan foto KTP yang baik</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" /> Semua teks pada KTP terbaca jelas</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" /> Foto tidak blur atau terpotong</li>
            <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" /> Gunakan pencahayaan yang cukup</li>
            <li className="flex items-center gap-2"><XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" /> Jangan foto dari layar komputer/HP lain</li>
            <li className="flex items-center gap-2"><XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" /> Jangan sembunyikan bagian apapun</li>
          </ul>
        </Card>
      )}

      {(status === "pending" || status === "in_review") && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={load} className="gap-1.5 text-xs text-muted-foreground">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh status
          </Button>
        </div>
      )}
    </div>
  );
}
