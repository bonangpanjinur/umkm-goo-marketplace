/**
 * MarketplaceReviewDialog — wrapper tipis ke UnifiedReviewDialog.
 * Dipakai di konteks marketplace → product_reviews (dengan foto, verified purchase).
 */
import { UnifiedReviewDialog } from "@/components/shared/ReviewDialog";

type Item = { product_id: string; name: string };

export function MarketplaceReviewDialog({
  open,
  onOpenChange,
  orderId,
  shopId,
  userId,
  items,
  onSubmitted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  shopId: string;
  userId: string;
  items: Item[];
  onSubmitted?: () => void;
}) {
  return (
    <UnifiedReviewDialog
      mode="marketplace"
      open={open}
      onOpenChange={onOpenChange}
      orderId={orderId}
      shopId={shopId}
      userId={userId}
      items={items.map((it) => ({ id: it.product_id, name: it.name }))}
      onSubmitted={onSubmitted}
    />
  );
}
