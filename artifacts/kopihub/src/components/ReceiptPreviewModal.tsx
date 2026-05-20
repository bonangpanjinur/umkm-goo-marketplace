import { ReactNode, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X, Maximize2 } from "lucide-react";
import type { ReceiptPaper } from "@/lib/receipt-printer";
import { applyReceiptPaper, getReceiptPaper, printThermal, setReceiptPaper } from "@/lib/receipt-printer";

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

/**
 * Modal pratinjau struk thermal yang cantik (mirip aplikasi POS native).
 * - Menampilkan struk di "kertas thermal" dengan shadow & shimmer.
 * - Tombol cetak menggunakan iframe tersembunyi dengan @page size eksplisit
 *   sehingga browser print ukuran 58mm/80mm tanpa membuka dialog full-page A4.
 */
export function ReceiptPreviewModal({ open, onClose, children, scopeKey, title }: Props) {
  const [paper, setPaper] = useState<ReceiptPaper>(() => getReceiptPaper(scopeKey));
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) applyReceiptPaper(paper, scopeKey);
  }, [open, paper, scopeKey]);

  function changePaper(p: ReceiptPaper) {
    setPaper(p);
    setReceiptPaper(p, scopeKey);
    applyReceiptPaper(p, scopeKey);
  }

  function handlePrint() {
    const node = previewRef.current?.querySelector(".receipt-thermal-inner") as HTMLElement | null;
    if (!node) return;

    // Kumpulkan stylesheet aktif agar struk render identik di iframe
    const styles = Array.from(
      document.querySelectorAll('link[rel="stylesheet"], style')
    )
      .map((el) => el.outerHTML)
      .join("\n");

    const widthMm = paper === "80" ? "80mm" : "58mm";

    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Cetak Struk</title>
${styles}
<style>
  @page { size: ${widthMm} auto; margin: 0; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { width: ${widthMm}; font-family: ui-monospace, "Courier New", monospace; color: #000; }
  .receipt-print-root { width: ${widthMm}; padding: 4mm 3mm; font-size: 11px; line-height: 1.35; }
  .receipt-print-root * { color: #000 !important; background: transparent !important; box-shadow: none !important; }
</style>
</head>
<body data-receipt-paper="${paper}">
  <div class="receipt-print-root">${node.outerHTML}</div>
  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        window.focus();
        window.print();
        setTimeout(function() { window.close && window.close(); }, 300);
      }, 200);
    });
  <\/script>
</body>
</html>`;

    // Iframe tersembunyi → print → cleanup
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.setAttribute("aria-hidden", "true");
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();

    // Trigger print dari iframe sendiri, lalu hapus setelah jeda
    const cleanup = () => {
      try { document.body.removeChild(iframe); } catch { /* noop */ }
    };
    iframe.contentWindow?.addEventListener("afterprint", cleanup);
    setTimeout(cleanup, 8000);
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

        {/* Actions */}
        <div className="px-5 py-4 border-t border-slate-800 flex items-center justify-between gap-2 bg-slate-900">
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white hover:bg-slate-800"
            onClick={() => {
              // Open di tab baru sebagai fallback
              const node = previewRef.current?.querySelector(".receipt-thermal-inner") as HTMLElement | null;
              if (!node) return;
              const w = window.open("", "_blank", "width=420,height=700");
              if (!w) return;
              const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(e => e.outerHTML).join("\n");
              const widthMm = paper === "80" ? "80mm" : "58mm";
              w.document.write(`<!doctype html><html><head><meta charset="utf-8">${styles}<style>@page{size:${widthMm} auto;margin:0}body{width:${widthMm};margin:0;padding:4mm 3mm;font-family:ui-monospace,monospace;font-size:11px;color:#000;background:#fff}</style></head><body data-receipt-paper="${paper}">${node.outerHTML}</body></html>`);
              w.document.close();
            }}
          >
            <Maximize2 className="w-4 h-4 mr-1.5" />
            Buka di Tab Baru
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" />
            Cetak Sekarang
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
