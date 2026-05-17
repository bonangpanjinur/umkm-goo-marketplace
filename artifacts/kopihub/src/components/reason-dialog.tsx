import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export type ReasonDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
  /** Judul dialog, mis. "Void order" atau "Cancel 3 order". */
  title: string;
  /** Penjelasan singkat di bawah judul. */
  description?: string;
  /** Label tombol konfirmasi. Default: "Konfirmasi". */
  confirmLabel?: string;
  /** Varian tombol konfirmasi. Default: "destructive". */
  confirmVariant?: "destructive" | "default";
  /** Placeholder textarea. */
  placeholder?: string;
  /** Daftar preset alasan agar staf cepat memilih. */
  presets?: string[];
};

/**
 * Modal input alasan untuk aksi sensitif (void / cancel / refund / delete).
 * Menggantikan `prompt()` JS agar lebih aksesibel + konsisten visual.
 *
 * Alasan WAJIB diisi (tidak boleh kosong) supaya audit log selalu lengkap.
 */
export function ReasonDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Konfirmasi",
  confirmVariant = "destructive",
  placeholder = "Mis. salah input, stok habis, pelanggan batal…",
  presets,
}: ReasonDialogProps) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReason("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  async function handleSubmit() {
    const r = reason.trim();
    if (r.length < 3) {
      setError("Alasan minimal 3 karakter agar audit jelas.");
      return;
    }
    setBusy(true);
    try {
      await onConfirm(r);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memproses");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && (
            <DialogDescription>{description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-3 py-1">
          {presets && presets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setReason(p)}
                  className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent"
                >
                  {p}
                </button>
              ))}
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="reason-input">Alasan (wajib)</Label>
            <Textarea
              id="reason-input"
              rows={3}
              autoFocus
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder={placeholder}
            />
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Batal
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleSubmit}
            disabled={busy}
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
