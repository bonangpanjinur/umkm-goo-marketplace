import { useRef, useState } from "react";
import { uploadBuilderImage } from "@/server/page-layouts.functions";
import { toast } from "sonner";
import { Upload, Loader2, X } from "lucide-react";

export function ImageUploadField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Ukuran maksimal 5 MB");
      return;
    }
    setBusy(true);
    try {
      const url = await uploadBuilderImage(file);
      onChange(url);
      toast.success("Gambar diunggah");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative rounded-md overflow-hidden border border-border bg-muted">
          <img src={value} alt="preview" className="w-full h-32 object-cover" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute top-1 right-1 p-1 rounded-md bg-background/80 hover:bg-background"
            aria-label="Hapus gambar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : null}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => ref.current?.click()}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md border border-border text-xs hover:bg-muted disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {value ? "Ganti" : "Upload"}
        </button>
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="atau tempel URL gambar"
        className="w-full px-2 py-1.5 text-xs rounded-md border border-border bg-background"
      />
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
