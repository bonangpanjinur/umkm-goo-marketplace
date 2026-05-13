import { useRef, useState, useCallback } from "react";
import { Upload, X, ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { validateImageUpload, type ImageValidationOptions } from "@/lib/image-upload";
import { cn } from "@/lib/utils";

type Props = {
  value?: string | null;            // existing URL preview
  onFileSelected: (file: File, previewUrl: string, dims: { w: number; h: number }) => void;
  onClear?: () => void;
  options?: ImageValidationOptions;
  label?: string;
  hint?: string;
  className?: string;
  disabled?: boolean;
  uploading?: boolean;
};

export function ImageDropzone({
  value,
  onFileSelected,
  onClear,
  options,
  label = "Unggah gambar",
  hint = "JPG/PNG/WebP, maks 5 MB",
  className,
  disabled,
  uploading,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(async (file: File | undefined | null) => {
    if (!file) return;
    setError(null);
    setValidating(true);
    const res = await validateImageUpload(file, options);
    setValidating(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    onFileSelected(res.file, res.previewUrl, { w: res.width, h: res.height });
  }, [onFileSelected, options]);

  return (
    <div className={cn("space-y-2", className)}>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled) return;
          handleFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 cursor-pointer transition",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/60",
          disabled && "opacity-60 cursor-not-allowed",
          value && "p-2",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        {value ? (
          <div className="relative w-full">
            <img src={value} alt="Preview" className="rounded-md w-full max-h-48 object-cover" />
            {onClear && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onClear(); setError(null); }}
                className="absolute top-1 right-1 bg-background/90 rounded-full p-1 hover:bg-background shadow"
                aria-label="Hapus"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ) : validating || uploading ? (
          <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground py-4">
            <Loader2 className="h-5 w-5 animate-spin" />
            {uploading ? "Mengunggah…" : "Memvalidasi…"}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground py-4">
            <Upload className="h-5 w-5" />
            <span className="font-medium text-foreground">{label}</span>
            <span>{hint}</span>
          </div>
        )}
      </div>
      {error && (
        <div className="flex items-start gap-1 text-xs text-rose-600">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export function ImagePreviewBadge({ url, label }: { url?: string | null; label: string }) {
  if (!url) {
    return (
      <div className="flex items-center justify-center h-24 rounded-md border border-dashed text-xs text-muted-foreground gap-1">
        <ImageIcon className="h-4 w-4" /> {label}
      </div>
    );
  }
  return <img src={url} alt={label} className="h-24 w-full object-cover rounded-md" />;
}
