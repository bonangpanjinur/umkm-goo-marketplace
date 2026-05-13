import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COURIERS, getCourierTrackUrl } from "@/lib/tracking";
import { toast } from "sonner";
import { Loader2, Truck } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  orderNo?: string;
  initialCourier?: string | null;
  initialAwb?: string | null;
  onSaved?: () => void;
};

export function TrackingDialog({ open, onOpenChange, orderId, orderNo, initialCourier, initialAwb, onSaved }: Props) {
  const [courier, setCourier] = useState<string>(initialCourier ?? "jne");
  const [awb, setAwb] = useState<string>(initialAwb ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const trimmed = awb.trim();
    if (!trimmed) { toast.error("Nomor resi wajib diisi"); return; }
    setSaving(true);
    const url = getCourierTrackUrl(courier, trimmed);
    const { error } = await supabase
      .from("orders")
      .update({
        tracking_number: trimmed,
        courier_name: courier,
        tracking_url: url,
        tracking_set_at: new Date().toISOString(),
      } as any)
      .eq("id", orderId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Resi tersimpan");
    onOpenChange(false);
    onSaved?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-4 w-4" /> Input Resi {orderNo ? `· ${orderNo}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Kurir / Jasa Kirim</Label>
            <Select value={courier} onValueChange={setCourier}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {COURIERS.map(c => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nomor Resi (AWB)</Label>
            <Input value={awb} onChange={e => setAwb(e.target.value)} placeholder="contoh: JP1234567890" autoFocus />
            <p className="text-[11px] text-muted-foreground">Pembeli akan melihat resi & link pelacakan otomatis.</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={save} disabled={saving} className="gap-1.5">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Simpan Resi
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
