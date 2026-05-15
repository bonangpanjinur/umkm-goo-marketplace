// Shared types for builder render context
export type BuilderContext = {
  slug: string;
  shopId?: string;
  onAddToCart?: (item: { id: string; name: string; price: number; image_url: string | null }) => void;
};
