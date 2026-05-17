import { Link } from "@tanstack/react-router";
import { Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useShopCapabilities } from "@/lib/use-shop-capabilities";
import { FEATURE_LABEL, type FeatureKey } from "@/lib/feature-keys";

/**
 * Guard halaman pos-app yang vertikal (rental, klinik, studio, kursus, dll).
 * Tampilkan child hanya jika kategori toko punya fitur tersebut.
 *
 *   <CategoryGuard shopId={shop.id} feature="RENTAL">
 *     <RentalPage/>
 *   </CategoryGuard>
 */
export function CategoryGuard({
  shopId,
  feature,
  anyOf,
  children,
}: {
  shopId: string | null | undefined;
  feature?: FeatureKey;
  anyOf?: FeatureKey[];
  children: React.ReactNode;
}) {
  const caps = useShopCapabilities(shopId);

  if (!caps.ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ok = feature
    ? caps.has(feature)
    : anyOf && anyOf.length > 0
      ? caps.hasAny(anyOf)
      : true;

  if (ok) return <>{children}</>;

  const featLabel = feature
    ? (FEATURE_LABEL[feature] ?? feature)
    : (anyOf?.map(k => FEATURE_LABEL[k] ?? k).join(" / ") ?? "");

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-xl border border-dashed bg-card p-8 text-center">
      <div className="rounded-full bg-muted p-3"><Lock className="h-5 w-5 text-muted-foreground" /></div>
      <div className="space-y-1">
        <h2 className="text-base font-semibold">Fitur tidak tersedia untuk kategori toko Anda</h2>
        <p className="text-sm text-muted-foreground">
          Halaman <strong>{featLabel}</strong> tidak relevan untuk kategori
          {caps.data?.categoryName ? <> <em>{caps.data.categoryName}</em></> : ""}.
          Owner dapat mengaktifkan fitur ini lewat pengaturan toko bila diperlukan.
        </p>
      </div>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <Link to="/pos-app">Kembali ke Dashboard</Link>
        </Button>
        <Button asChild size="sm">
          <Link to="/pos-app/settings">Pengaturan Toko</Link>
        </Button>
      </div>
    </div>
  );
}
