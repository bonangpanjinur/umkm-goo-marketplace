import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImageDropzone } from "@/components/ImageDropzone";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Link2, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ImageValidationOptions } from "@/lib/image-upload";

export type UploadableImageProps = {
  /** Current image URL (from DB). */
  value: string | null | undefined;
  /** Called with the new URL (public URL after upload, or pasted external URL, or null when cleared). */
  onChange: (url: string | null) => void;
  /** Storage bucket name (must exist). */
  bucket: string;
  /** Folder prefix inside the bucket. For owner-scoped buckets this MUST be the shop id. */
  pathPrefix: string;
  /** Allow user to paste an external URL instead of uploading (default true). */
  allowExternalUrl?: boolean;
  label?: string;
  hint?: string;
  className?: string;
  disabled?: boolean;
  options?: ImageValidationOptions;
};

function extOf(file: File): string {
  const t = file.type;
  if (t.includes("png")) return "png";
  if (t.includes("webp")) return "webp";
  return "jpg";
}

export function UploadableImage({
  value,
  onChange,
  bucket,
  pathPrefix,
  allowExternalUrl = true,
  label = "Unggah gambar",
  hint = "Drag & drop atau klik. JPG/PNG/WebP, maks 5 MB",
  className,
  disabled,
  options,
}: UploadableImageProps) {
  const [uploading, setUploading] = useState(false);
  const [urlMode, setUrlMode] = useState(false);
  const [urlDraft, setUrlDraft] = useState(value ?? "");

  const handleFile = async (file: File) => {
    if (!pathPrefix) {
      toast.error("Tidak dapat unggah: konteks toko belum siap.");
      return;
    }
    setUploading(true);
    const path = `${pathPrefix.replace(/\/+$/, "")}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extOf(file)}`;
    const { error } = await supabase.storage.from(bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) {
      setUploading(false);
      toast.error("Gagal unggah: " + error.message);
      return;
    }
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
    setUploading(false);
    onChange(pub.publicUrl);
    toast.success("Gambar diunggah");
  };

  const clear = () => {
    onChange(null);
    setUrlDraft("");
  };

  const saveUrl = () => {
    const u = urlDraft.trim();
    if (!u) {
      onChange(null);
      return;
    }
    try {
      // basic URL check
      // eslint-disable-next-line no-new
      new URL(u);
    } catch {
      toast.error("URL tidak valid");
      return;
    }
    onChange(u);
    setUrlMode(false);
    toast.success("URL gambar disimpan");
  };

  return (
    <div className={cn("space-y-2", className)}>
      {!urlMode && (
        <ImageDropzone
          value={value ?? undefined}
          uploading={uploading}
          disabled={disabled || uploading}
          onClear={clear}
          label={label}
          hint={hint}
          options={options}
          onFileSelected={(file) => {
            void handleFile(file);
          }}
        />
      )}

      {urlMode && (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <Label className="text-xs">URL gambar eksternal</Label>
          <div className="flex gap-2">
            <Input
              value={urlDraft}
              onChange={(e) => setUrlDraft(e.target.value)}
              placeholder="https://…"
              className="text-xs"
            />
            <Button type="button" size="sm" onClick={saveUrl}>Simpan</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => { setUrlMode(false); setUrlDraft(value ?? ""); }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          {value && (
            <div className="rounded-md border bg-muted/30 p-2">
              <img src={value} alt="preview" className="max-h-32 mx-auto object-contain" />
            </div>
          )}
        </div>
      )}

      {allowExternalUrl && (
        <button
          type="button"
          onClick={() => setUrlMode((m) => !m)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          disabled={disabled}
        >
          {urlMode ? <ImageIcon className="h-3 w-3" /> : <Link2 className="h-3 w-3" />}
          {urlMode ? "Kembali ke upload" : "Pakai URL eksternal"}
        </button>
      )}
    </div>
  );
}
