import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatIDR } from "@/lib/format";
import { Users, Minus, Plus, Copy, Check } from "lucide-react";
import { toast } from "sonner";

type Item = {
  name: string;
  quantity: number;
  subtotal: number;
  note?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  total: number;
  orderNo?: string;
  items?: Item[];
  tableLabel?: string;
};

export function SplitBillDialog({ open, onClose, total, orderNo, items, tableLabel }: Props) {
  const [people, setPeople] = useState(2);
  const [itemSplit, setItemSplit] = useState<Record<number, number>>({});
  const [copied, setCopied] = useState(false);

  const clamp = (n: number) => Math.max(2, Math.min(20, n));

  const perPerson = Math.ceil(total / people);
  const remainder = total - perPerson * (people - 1);

  const copyText = () => {
    const lines = [
      `🧾 Split Bill${orderNo ? ` — Order #${orderNo}` : ""}${tableLabel ? ` (${tableLabel})` : ""}`,
      `Total: ${formatIDR(total)}`,
      `Dibagi ${people} orang`,
      "",
      ...Array.from({ length: people }, (_, i) => {
        const amt = i === people - 1 ? remainder : perPerson;
        return `Orang ${i + 1}: ${formatIDR(amt)}`;
      }),
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      toast.success("Teks split bill disalin");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Split Bill
            {tableLabel && <span className="text-muted-foreground font-normal text-sm">— {tableLabel}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Total */}
          <div className="rounded-xl bg-muted/60 p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total tagihan</p>
            <p className="text-3xl font-bold">{formatIDR(total)}</p>
            {orderNo && <p className="text-xs text-muted-foreground mt-1">Order #{orderNo}</p>}
          </div>

          {/* Number of people */}
          <div className="space-y-2">
            <Label>Jumlah orang</Label>
            <div className="flex items-center gap-3 justify-center">
              <Button
                size="icon"
                variant="outline"
                onClick={() => setPeople((p) => clamp(p - 1))}
                disabled={people <= 2}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min={2}
                max={20}
                value={people}
                onChange={(e) => setPeople(clamp(Number(e.target.value)))}
                className="w-16 text-center text-lg font-bold h-10"
              />
              <Button
                size="icon"
                variant="outline"
                onClick={() => setPeople((p) => clamp(p + 1))}
                disabled={people >= 20}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Per-person breakdown */}
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="bg-primary/5 border-b border-border px-4 py-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground uppercase">Bagian per orang</span>
              <span className="text-xs font-semibold text-primary">{people} orang</span>
            </div>
            <div className="divide-y divide-border max-h-48 overflow-y-auto">
              {Array.from({ length: people }, (_, i) => {
                const amt = i === people - 1 ? remainder : perPerson;
                return (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm">
                      Orang {i + 1}
                      {i === people - 1 && remainder !== perPerson && (
                        <span className="ml-1.5 text-[10px] text-muted-foreground rounded bg-muted px-1.5 py-0.5">sisa</span>
                      )}
                    </span>
                    <span className="font-semibold">{formatIDR(amt)}</span>
                  </div>
                );
              })}
            </div>
            <div className="bg-muted/30 border-t border-border px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Masing-masing</span>
              <span className="text-sm font-bold text-primary">{formatIDR(perPerson)}</span>
            </div>
          </div>

          {/* Menu breakdown (optional) */}
          {items && items.length > 0 && (
            <details className="rounded-lg border border-border">
              <summary className="px-4 py-2.5 text-xs font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                Lihat detail pesanan ({items.length} item)
              </summary>
              <div className="divide-y divide-border border-t border-border">
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between px-4 py-2 text-sm">
                    <span className="text-muted-foreground">{it.quantity}× {it.name}</span>
                    <span>{formatIDR(Number(it.subtotal))}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" size="sm" onClick={copyText} className="flex-1">
            {copied ? <Check className="h-4 w-4 mr-1.5 text-emerald-500" /> : <Copy className="h-4 w-4 mr-1.5" />}
            {copied ? "Tersalin!" : "Salin teks"}
          </Button>
          <Button size="sm" onClick={onClose} className="flex-1">
            Selesai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
