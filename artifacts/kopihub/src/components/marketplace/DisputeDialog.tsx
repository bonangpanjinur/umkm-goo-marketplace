import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertOctagon } from "lucide-react";
import { toast } from "sonner";

const REASONS = [
  { value: "not_received", label: "Pesanan tidak diterima" },
  { value: "damaged", label: "Barang rusak/cacat" },
  { value: "wrong_item", label: "Barang salah / tidak sesuai" },
  { value: "missing_item", label: "Ada item yang kurang" },
  { value: "quality", label: "Kualitas mengecewakan" },
  { value: "other", label: "Lainnya" },
];

export function DisputeDialog({
  open,
  onOpenChange,
  orderId,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  onCreated?: () => void;
}) {
  const [reason, setReason] = useState("not_received");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (description.trim().length < 10) {
      toast.error("Tulis deskripsi minimal 10 karakter");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("open_dispute", {
      _order_id: orderId,
      _reason: reason,
      _description: description.trim(),
      _photos: [],
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Sengketa dibuka. Penjual akan diberitahu.");
    onOpenChange(false);
    setDescription("");
    onCreated?.();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertOctagon className="h-4 w-4 text-destructive" /> Lapor Masalah
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <div className="space-y-1.5">
            <Label>Alasan</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REASONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Detail kejadian</Label>
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              placeholder="Jelaskan masalah, kapan terjadi, dan harapan Anda."
            />
            <p className="text-[11px] text-muted-foreground">
              Dana akan ditahan sementara hingga kasus diselesaikan.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Kirim laporan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
