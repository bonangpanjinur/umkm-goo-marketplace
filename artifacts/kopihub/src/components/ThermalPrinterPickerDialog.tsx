import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Usb, Bluetooth, Loader2, CheckCircle2, X } from "lucide-react";
import { toast } from "sonner";
import {
  isWebSerialSupported,
  isWebBluetoothSupported,
  pickSerialPort,
  pickBluetoothPrinter,
  getPreferredMode,
  forgetPrinter,
  getBaudRate,
  setBaudRate,
} from "@/lib/escpos-printer";

type Props = {
  open: boolean;
  onClose: () => void;
  onPaired?: () => void;
};

export function ThermalPrinterPickerDialog({ open, onClose, onPaired }: Props) {
  const [busy, setBusy] = useState<"serial" | "bt" | null>(null);
  const [mode, setMode] = useState(getPreferredMode());
  const [baud, setBaudState] = useState<number>(getBaudRate());

  useEffect(() => {
    if (open) {
      setMode(getPreferredMode());
      setBaudState(getBaudRate());
    }
  }, [open]);

  async function handleSerial() {
    setBusy("serial");
    try {
      setBaudRate(baud);
      const ok = await pickSerialPort();
      if (ok) {
        toast.success("Printer USB-Serial siap. Cetak selanjutnya akan langsung tanpa dialog.");
        setMode("serial");
        onPaired?.();
        onClose();
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal pilih printer");
    } finally {
      setBusy(null);
    }
  }

  async function handleBluetooth() {
    setBusy("bt");
    try {
      const ok = await pickBluetoothPrinter();
      if (ok) {
        toast.success("Printer Bluetooth terhubung. Cetak selanjutnya langsung tanpa dialog.");
        setMode("bluetooth");
        onPaired?.();
        onClose();
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal pairing printer");
    } finally {
      setBusy(null);
    }
  }

  function handleForget() {
    forgetPrinter();
    setMode("none");
    toast.message("Printer dilepas. Cetak akan kembali pakai dialog browser.");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pilih Printer Thermal</DialogTitle>
        </DialogHeader>

        {mode !== "none" && (
          <div className="flex items-center justify-between rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm">
            <span className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
              Aktif: {mode === "serial" ? "USB-Serial" : "Bluetooth"}
            </span>
            <button onClick={handleForget} className="text-xs text-muted-foreground hover:text-foreground underline">
              Lepas
            </button>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Setelah printer dipilih sekali, klik <b>Cetak Sekarang</b> akan langsung kirim ke printer thermal — tanpa
          dialog cetak browser.
        </p>

        <div className="space-y-3">
          <div>
            <button
              disabled={!isWebSerialSupported() || busy !== null}
              onClick={handleSerial}
              className="w-full rounded-lg border border-border bg-card p-4 text-left hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  {busy === "serial" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Usb className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <div className="font-medium">USB / Serial</div>
                  <div className="text-xs text-muted-foreground">
                    {isWebSerialSupported()
                      ? "Printer thermal USB (Epson TM, Xprinter, dll). Chrome/Edge desktop."
                      : "Tidak didukung di browser ini. Pakai Chrome/Edge desktop."}
                  </div>
                </div>
              </div>
            </button>
            {isWebSerialSupported() && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <label className="text-muted-foreground">Baud rate:</label>
                <select
                  className="rounded border border-border bg-background px-2 py-1"
                  value={baud}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setBaudState(v);
                    setBaudRate(v);
                  }}
                >
                  {[9600, 19200, 38400, 57600, 115200].map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
                <span className="text-muted-foreground">(default 9600)</span>
              </div>
            )}
          </div>

          <button
            disabled={!isWebBluetoothSupported() || busy !== null}
            onClick={handleBluetooth}
            className="w-full rounded-lg border border-border bg-card p-4 text-left hover:border-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-md bg-primary/10 p-2 text-primary">
                {busy === "bt" ? <Loader2 className="h-5 w-5 animate-spin" /> : <Bluetooth className="h-5 w-5" />}
              </div>
              <div className="flex-1">
                <div className="font-medium">Bluetooth</div>
                <div className="text-xs text-muted-foreground">
                  {isWebBluetoothSupported()
                    ? "Printer thermal Bluetooth (RPP, MPT-II, dll). Chrome desktop/Android."
                    : "Tidak didukung di browser ini."}
                </div>
              </div>
            </div>
          </button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            <X className="mr-1.5 h-4 w-4" /> Tutup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
