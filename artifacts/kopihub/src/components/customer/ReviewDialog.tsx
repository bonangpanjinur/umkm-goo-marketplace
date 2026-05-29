/**
 * ReviewDialog (POS mode) — wrapper tipis ke UnifiedReviewDialog.
 * Dipakai di konteks POS → menu_reviews (tanpa foto).
 */
import { UnifiedReviewDialog } from "@/components/shared/ReviewDialog";

type Item = { menu_item_id: string; name: string };

export function ReviewDialog({
  open,
  onOpenChange,
  orderId,
  shopId,
  userId,
  items,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  shopId: string;
  userId: string;
  items: Item[];
}) {
  return (
    <UnifiedReviewDialog
      mode="pos"
      open={open}
      onOpenChange={onOpenChange}
      orderId={orderId}
      shopId={shopId}
      userId={userId}
      items={items.map((it) => ({ id: it.menu_item_id, name: it.name }))}
    />
  );
}
