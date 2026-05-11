import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export function ResolveDisputeDialog({
  open,
  onOpenChange,
  dispute,
  onResolved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  dispute: { id: string; reason: string; description?: string | null; refund_amount?: number | null } | null;
  onResolved?: () => void;
}) {
  const [resolution, setResolution] = useState("");
  const [refund, setRefund] = useState<string>("");
  const [busy, setBusy] = useState<string | null>(null);

  async function submit(status: "resolved" | "rejected" | "under_review") {
    if (!dispute) return;
    setBusy(status);
    const refundNum = status === "resolved" ? Number(refund || 0) : null;
    const { error } = await supabase.rpc("resolve_dispute", {
      _dispute_id: dispute.id,
      _status: status,
      _resolution: resolution.trim() || undefined,
      _refund_amount: refundNum ?? undefined,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(
      status === "resolved" ? `Sengketa diselesaikan${refundNum ? ` · refund ${formatIDR(refundNum)}` : ""}` :
      status === "rejected" ? "Sengketa ditolak" : "Status diperbarui",
    );
    onResolved?.();
    onOpenChange(false);
    setResolution(""); setRefund("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Tanggapi Sengketa</DialogTitle></DialogHeader>
        {dispute && (
          <div className="space-y-3 text-sm">
            <div className="rounded-md border border-border bg-muted/40 p-2">
              <div className="font-medium">Alasan: {dispute.reason}</div>
              {dispute.description && <div className="mt-1 text-muted-foreground">"{dispute.description}"</div>}
            </div>
            <div className="space-y-1">
              <Label>Catatan resolusi</Label>
              <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} rows={3} placeholder="Penjelasan untuk pelanggan..." />
            </div>
            <div className="space-y-1">
              <Label>Jumlah refund (Rp)</Label>
              <Input type="number" min={0} value={refund} onChange={(e) => setRefund(e.target.value)} placeholder="0 = tanpa refund" />
              <p className="text-xs text-muted-foreground">Isi hanya jika menerima sengketa dengan refund.</p>
            </div>
          </div>
        )}
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button variant="outline" disabled={!!busy} onClick={() => submit("under_review")}>
            {busy === "under_review" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tinjau"}
          </Button>
          <Button variant="destructive" disabled={!!busy} onClick={() => submit("rejected")}>
            {busy === "rejected" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Tolak"}
          </Button>
          <Button disabled={!!busy} onClick={() => submit("resolved")}>
            {busy === "resolved" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Selesaikan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
