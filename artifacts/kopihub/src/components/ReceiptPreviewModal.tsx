import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, Settings2 } from "lucide-react";
import { toast } from "sonner";
import type { ReceiptPaper } from "@/lib/receipt-printer";
import { applyReceiptPaper, getReceiptPaper, printThermal, setReceiptPaper } from "@/lib/receipt-printer";
import { buildReceiptLines, getPreferredMode, printReceiptEscPos, type ReceiptTextLine } from "@/lib/escpos-printer";
import { ThermalPrinterPickerDialog } from "@/components/ThermalPrinterPickerDialog";

type Props = {
  open: boolean;
  onClose: () => void;
  /** ReactNode struk — biasanya komponen <Receipt ... /> dari proyek */
  children: ReactNode;
  /** Optional scope (outlet:user) untuk preset paper per device */
  scopeKey?: string;
  /** Title modal — default "Pratinjau Struk" */
  title?: string;
};

export function ReceiptPreviewModal({ open, onClose, children, scopeKey, title }: Props) {
  const [paper, setPaper] = useState<ReceiptPaper>(() => getReceiptPaper(scopeKey));
  const previewRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [mode, setMode] = useState(getPreferredMode());
  const [view, setView] = useState<"visual" | "mono">("visual");
  const [monoLines, setMonoLines] = useState<ReceiptTextLine[]>([]);

  useEffect(() => {
    if (open) {
      applyReceiptPaper(paper, scopeKey);
      setMode(getPreferredMode());
    }
  }, [open, paper, scopeKey]);

  // Recompute mono preview whenever view toggles to mono, paper changes, or DOM updates.
  useEffect(() => {
    if (!open) return;
    const node = previewRef.current?.querySelector(".receipt-thermal-inner > *") as HTMLElement | null
      ?? previewRef.current?.querySelector(".receipt-thermal-inner") as HTMLElement | null;
    if (!node) { setMonoLines([]); return; }
    // Defer one frame so child receipt is fully rendered.
    const id = requestAnimationFrame(() => setMonoLines(buildReceiptLines(node, paper)));
    return () => cancelAnimationFrame(id);
  }, [open, paper, view, children]);

  const monoCols = useMemo(() => (paper === "80" ? 48 : 32), [paper]);

  function changePaper(p: ReceiptPaper) {
    setPaper(p);
    setReceiptPaper(p, scopeKey);
    applyReceiptPaper(p, scopeKey);
  }

  async function handlePrint() {
    const node = previewRef.current?.querySelector(".receipt-thermal-inner > *") as HTMLElement | null
      ?? previewRef.current?.querySelector(".receipt-thermal-inner") as HTMLElement | null;
    if (!node) return;
    setPrinting(true);
    try {
      if (getPreferredMode() !== "none") {
        const res = await printReceiptEscPos(node, paper);
        if (res === "ok") {
          toast.success("Struk terkirim ke printer thermal");
          onClose();
          return;
        }
        if (typeof res === "object" && "error" in res) {
          toast.error(`Gagal cetak: ${res.error}`);
          return;
        }
        if (res === "no-device") {
          toast.message("Printer belum dipilih — buka 'Pilih Printer Thermal' dulu.");
          setPickerOpen(true);
          return;
        }
      }
      // Tidak ada thermal printer terpilih → fallback ke print dialog browser
      printThermal({ node, paper, scopeKey, title: "Cetak Struk" });
    } finally {
      setPrinting(false);
    }
  }


  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden bg-slate-900 border-slate-800 text-white">
        <DialogHeader className="px-5 py-4 border-b border-slate-800 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-white text-base">{title ?? "Pratinjau Struk"}</DialogTitle>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-slate-800 transition-colors"
            aria-label="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </DialogHeader>

        {/* Toolbar paper size */}
        <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-400 uppercase tracking-wider">Ukuran Kertas</span>
          <div className="inline-flex rounded-md border border-slate-700 overflow-hidden text-xs font-medium">
            <button
              onClick={() => changePaper("58")}
              className={`px-3 py-1.5 transition-colors ${paper === "58" ? "bg-primary text-primary-foreground" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              58 mm
            </button>
            <button
              onClick={() => changePaper("80")}
              className={`px-3 py-1.5 transition-colors ${paper === "80" ? "bg-primary text-primary-foreground" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}
            >
              80 mm
            </button>
          </div>
        </div>

        {/* Preview area — kertas thermal cantik */}
        <div className="px-5 py-6 bg-gradient-to-b from-slate-900 to-slate-950 max-h-[60vh] overflow-y-auto flex justify-center">
          <div
            ref={previewRef}
            className="receipt-thermal-paper"
            style={{
              width: paper === "80" ? "300px" : "220px",
              background: "#fff",
              color: "#000",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)",
              borderRadius: "2px",
              padding: "14px 12px",
              fontFamily: 'ui-monospace, "Courier New", monospace',
              fontSize: "11px",
              lineHeight: 1.4,
              position: "relative",
            }}
          >
            {/* Edge perforations */}
            <div style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: -6,
              height: 12,
              backgroundImage: "radial-gradient(circle, #0f172a 3px, transparent 3px)",
              backgroundSize: "10px 12px",
              backgroundRepeat: "repeat-x",
              backgroundPosition: "center",
            }} />
            <div style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: -6,
              height: 12,
              backgroundImage: "radial-gradient(circle, #0f172a 3px, transparent 3px)",
              backgroundSize: "10px 12px",
              backgroundRepeat: "repeat-x",
              backgroundPosition: "center",
            }} />
            <div className="receipt-thermal-inner">
              {children}
            </div>
          </div>
        </div>

        {/* Status printer thermal */}
        <div className="px-5 py-2 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
          <span className="text-slate-400">
            {mode === "serial" && <span className="text-emerald-400">● Printer USB siap — cetak langsung</span>}
            {mode === "bluetooth" && <span className="text-emerald-400">● Printer Bluetooth siap — cetak langsung</span>}
            {mode === "none" && <span>Belum ada printer thermal terpilih → akan pakai dialog browser</span>}
          </span>
          <button
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <Settings2 className="w-3 h-3" /> Pilih Printer
          </button>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-between gap-2 bg-slate-900">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={onClose}
          >
            <X className="w-4 h-4 mr-1.5" />
            Tutup
          </Button>
          <Button onClick={handlePrint} disabled={printing} className="gap-2">
            <Printer className="w-4 h-4" />
            {printing ? "Mencetak…" : "Cetak Sekarang"}
          </Button>
        </div>
      </DialogContent>

      <ThermalPrinterPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onPaired={() => setMode(getPreferredMode())}
      />
    </Dialog>
  );
}
