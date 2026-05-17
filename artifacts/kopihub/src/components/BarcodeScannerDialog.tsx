import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ScanLine, Keyboard, CameraOff } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected: (code: string) => void;
  title?: string;
};

/**
 * Buka kamera & scan barcode/QR menggunakan @zxing/browser.
 * Ada fallback input manual untuk perangkat tanpa kamera.
 */
export function BarcodeScannerDialog({ open, onOpenChange, onDetected, title = "Scan Barcode" }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [manual, setManual] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    setStarting(true);

    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled) return;
        const reader = new BrowserMultiFormatReader();
        const video = videoRef.current;
        if (!video) return;
        const controls = await reader.decodeFromVideoDevice(undefined, video, (result, err) => {
          if (cancelled) return;
          if (result) {
            const text = result.getText().trim();
            if (text) {
              controls.stop();
              onDetected(text);
              onOpenChange(false);
            }
          }
          // err lain (NotFoundException) wajar — diam saja
        });
        controlsRef.current = controls;
        setStarting(false);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Tidak bisa mengakses kamera";
        setError(msg);
        setStarting(false);
      }
    })();

    return () => {
      cancelled = true;
      try { controlsRef.current?.stop(); } catch { /* noop */ }
      controlsRef.current = null;
    };
  }, [open, onDetected, onOpenChange]);

  function submitManual() {
    const v = manual.trim();
    if (!v) return;
    onDetected(v);
    setManual("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" /> {title}
          </DialogTitle>
          <DialogDescription>Arahkan kamera ke barcode produk.</DialogDescription>
        </DialogHeader>

        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
          {/* overlay frame */}
          <div className="pointer-events-none absolute inset-6 rounded-md border-2 border-white/70" />
          {starting && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 p-4 text-center text-white">
              <CameraOff className="h-6 w-6" />
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Keyboard className="h-3.5 w-3.5" /> Atau ketik manual:
          </div>
          <div className="flex gap-2">
            <Input
              autoFocus={!!error}
              placeholder="Masukkan kode barcode/SKU"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") submitManual(); }}
            />
            <Button onClick={submitManual} disabled={!manual.trim()}>Cari</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
