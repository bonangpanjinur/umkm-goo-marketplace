import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Store } from "lucide-react";

export const Route = createFileRoute("/kategori/")({
  head: () => ({
    meta: [
      { title: "Semua Kategori — Marketplace" },
      { name: "description", content: "Jelajahi semua kategori bisnis di marketplace." },
    ],
  }),
  component: CategoriesIndex,
});

type Category = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  banner_url: string | null;
};

function CategoriesIndex() {
  const [cats, setCats] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("business_categories")
        .select("id, slug, name, description, icon_url, banner_url")
        .eq("is_active", true)
        .order("sort_order");
      const list = (data as Category[]) ?? [];
      setCats(list);

      // Counts of active shops per category
      const shopCountMap: Record<string, number> = {};
      const { data: shopsData } = await supabase
        .from("shops")
        .select("business_category_id")
        .eq("is_active", true);
      for (const r of (shopsData as any[]) ?? []) {
        if (!r.business_category_id) continue;
        shopCountMap[r.business_category_id] = (shopCountMap[r.business_category_id] ?? 0) + 1;
      }
      setCounts(shopCountMap);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight">Semua Kategori</h1>
        <p className="mt-2 text-muted-foreground">Pilih kategori untuk melihat toko & produk.</p>

        {loading ? (
          <div className="mt-8 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-40 rounded-xl bg-muted/40 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {cats.map((c) => (
              <Link
                key={c.id}
                to="/kategori/$slug"
                params={{ slug: c.slug }}
                className="group flex flex-col rounded-xl border border-border bg-card overflow-hidden transition hover:border-primary/50 hover:shadow-md"
              >
                <div className="aspect-[16/9] bg-gradient-to-br from-primary/10 to-primary/5">
                  {c.banner_url ? (
                    <img src={c.banner_url} alt={c.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-primary/60">
                      <Store className="h-10 w-10" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-semibold">{c.name}</h3>
                  {c.description && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{c.description}</p>
                  )}
                  <div className="mt-2 text-xs text-primary">{counts[c.id] ?? 0} toko</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <MarketplaceFooter />
    </div>
  );
}
