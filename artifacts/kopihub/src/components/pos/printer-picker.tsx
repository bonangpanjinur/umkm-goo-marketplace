import { useEffect, useState } from "react";
import {
  getOutletPrinters,
  getActivePrinterId,
  setActivePrinterId,
  setReceiptPaper,
  type Printer,
} from "@/lib/receipt-printer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Printer as PrinterIcon } from "lucide-react";

/** Dropdown for selecting the active printer for this outlet+user.
 * Remembers the choice in localStorage and syncs the paper size to it. */
export function PrinterPicker({
  outletId,
  scopeKey,
  className,
}: {
  outletId?: string | null;
  scopeKey?: string;
  className?: string;
}) {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    if (!outletId) return;
    let cancelled = false;
    getOutletPrinters(outletId).then((list) => {
      if (cancelled) return;
      setPrinters(list);
      const saved = getActivePrinterId(scopeKey);
      const exists = saved && list.find((p) => p.id === saved);
      setActive(exists ? saved! : list[0]?.id ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, [outletId, scopeKey]);

  function pick(id: string) {
    setActive(id);
    setActivePrinterId(id, scopeKey);
    const p = printers.find((x) => x.id === id);
    if (p?.paper_size) setReceiptPaper(p.paper_size, scopeKey);
  }

  if (!outletId || printers.length === 0) return null;

  return (
    <div className={"inline-flex items-center gap-1.5 " + (className ?? "")}>
      <PrinterIcon className="h-3.5 w-3.5 text-muted-foreground" />
      <Select value={active} onValueChange={pick}>
        <SelectTrigger className="h-8 w-[160px] text-xs">
          <SelectValue placeholder="Pilih printer" />
        </SelectTrigger>
        <SelectContent>
          {printers.map((p) => (
            <SelectItem key={p.id} value={p.id} className="text-xs">
              {p.name} · {p.paper_size}mm
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
