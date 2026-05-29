import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { ProductCard } from "./index";
import { Sparkles, Ticket, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { useSeo } from "@/lib/use-seo";

export const Route = createFileRoute("/promo")({
  head: () => ({ meta: [{ title: "Promo & Diskon — UMKMgo" }] }),
  component: PromoPage,
});

type FlashProduct = {
  id: string;
  shop_id: string;
  name: string;
  price: number;
  image_url: string | null;
  slug: string | null;
  rating_avg: number | null;
  flash_price: number | null;
  flash_starts_at: string | null;
  flash_ends_at: string | null;
  shop?: { slug: string; name: string };
};

type PlatformVoucher = {
  code: string;
  description: string | null;
  discount_type: string;
  value: number;
  min_order: number | null;
  max_discount: number | null;
  expires_at: string | null;
};

function PromoPage() {
  const [flash, setFlash] = useState<FlashProduct[]>([]);
  const [vouchers, setVouchers] = useState<PlatformVoucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  useSeo({
    title: "Promo & Flash Sale — UMKMgo",
    description: "Promo terbaru, flash sale produk pilihan, dan voucher hemat dari UMKMgo.",
  });

  useEffect(() => {
    (async () => {
      const nowIso = new Date().toISOString();
      const [fp, pv] = await Promise.all([
        supabase
          .from("menu_items")
          .select("id, shop_id, name, price, image_url, slug, rating_avg, flash_price, flash_starts_at, flash_ends_at, shop:shops!inner(slug, name, is_active)")
          .eq("is_available", true)
          .not("flash_price", "is", null)
          .or(`flash_starts_at.is.null,flash_starts_at.lte.${nowIso}`)
          .or(`flash_ends_at.is.null,flash_ends_at.gt.${nowIso}`)
          .limit(36),
        supabase
          .from("platform_vouchers")
          .select("code, description, discount_type, value, min_order, max_discount, expires_at")
          .eq("is_active", true)
          .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
          .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);
      const items = ((fp.data as any[]) ?? []).filter(
        (p) => p.shop?.is_active && Number(p.flash_price) < Number(p.price),
      );
      setFlash(items as FlashProduct[]);
      setVouchers((pv.data as PlatformVoucher[]) ?? []);
      setLoading(false);
    })();
  }, []);

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    toast.success(`Kode "${code}" disalin`);
    setTimeout(() => setCopied((c) => (c === code ? null : c)), 1500);
  }

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />

      <section className="border-b border-border bg-gradient-to-b from-destructive/10 to-background">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-destructive">
            <Sparkles className="h-3 w-3" /> Promo aktif
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            Hemat lebih banyak hari ini
          </h1>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Flash sale terbatas dan voucher seluruh marketplace. Pakai kode di halaman checkout.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="mb-4 flex items-center gap-2">
          <Ticket className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight">Voucher UMKMgo</h2>
        </div>
        {vouchers.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada voucher aktif.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {vouchers.map((v) => {
              const valueLabel =
                v.discount_type === "percent"
                  ? `${v.value}%`
                  : `Rp ${Number(v.value).toLocaleString("id-ID")}`;
              return (
                <div key={v.code} className="flex overflow-hidden rounded-xl border border-border bg-card">
                  <div className="flex w-24 flex-col items-center justify-center bg-primary/10 p-3 text-center">
                    <div className="text-lg font-bold text-primary">{valueLabel}</div>
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Diskon</div>
                  </div>
                  <div className="flex-1 p-3">
                    <div className="text-sm font-semibold">{v.code}</div>
                    {v.description && (
                      <div className="line-clamp-2 text-[11px] text-muted-foreground">{v.description}</div>
                    )}
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {v.min_order ? `Min. Rp ${Number(v.min_order).toLocaleString("id-ID")}` : "Tanpa minimum"}
                      {v.max_discount ? ` · Maks. Rp ${Number(v.max_discount).toLocaleString("id-ID")}` : ""}
                    </div>
                    <button
                      onClick={() => copyCode(v.code)}
                      className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed border-primary/50 bg-primary/5 px-2 py-1 text-xs font-mono font-semibold text-primary transition hover:bg-primary/10"
                    >
                      {copied === v.code ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      {v.code}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-destructive" />
          <h2 className="text-xl font-bold tracking-tight">Flash Sale</h2>
        </div>
        {loading ? (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : flash.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada flash sale yang berjalan.</p>
        ) : (
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 lg:grid-cols-6">
            {flash.map((p) => <ProductCard key={p.id} product={p as any} />)}
          </div>
        )}
      </section>

      <MarketplaceFooter />
    </div>
  );
}
