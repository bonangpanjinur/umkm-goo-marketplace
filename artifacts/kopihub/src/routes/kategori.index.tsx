import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { getCategoryStyle } from "@/lib/category-colors";
import { ArrowRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

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

function CategoryCardSkeleton() {
  return (
    <div className="flex flex-col items-center p-5 rounded-2xl bg-card border border-border animate-pulse">
      <div className="h-20 w-20 rounded-[24px] bg-muted mb-4" />
      <div className="h-3.5 w-24 rounded bg-muted mb-2" />
      <div className="h-3 w-16 rounded bg-muted" />
    </div>
  );
}

function CategoriesIndex() {
  const [cats, setCats] = useState<Category[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("business_categories")
        .select("id, slug, name, description, icon_url, banner_url")
        .eq("is_active", true)
        .order("sort_order");
      const list = (data as Category[]) ?? [];
      setCats(list);

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

  const filtered = cats.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />

      {/* ── Hero Banner ── */}
      <div className="bg-gradient-to-br from-primary via-emerald-600 to-teal-700 py-12 px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Jelajahi Semua Kategori
          </h1>
          <p className="mt-2 text-sm text-white/80">
            Temukan ribuan produk & toko UMKM Indonesia di satu tempat.
          </p>
          <div className="mt-6 relative mx-auto max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari kategori..."
              className="pl-10 rounded-full bg-white/95 border-0 shadow-lg text-sm h-11 placeholder:text-muted-foreground/70"
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10">
        {loading ? (
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 15 }).map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            <p className="text-lg font-medium">Kategori tidak ditemukan</p>
            <p className="text-sm mt-1">Coba kata kunci lain</p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-muted-foreground">
              {filtered.length} kategori tersedia
            </p>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filtered.map((c) => {
                const style = getCategoryStyle(c.slug);
                const count = counts[c.id] ?? 0;
                return (
                  <Link
                    key={c.id}
                    to="/kategori/$slug"
                    params={{ slug: c.slug }}
                    className="group flex flex-col items-center rounded-2xl border border-border/60 bg-card p-5 text-center shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-xl hover:border-transparent"
                  >
                    {/* Colorful squircle icon */}
                    <div
                      className={`relative mb-4 flex h-[72px] w-[72px] items-center justify-center rounded-[22px] bg-gradient-to-br ${style.gradient} shadow-md ${style.shadow} transition-transform duration-200 group-hover:scale-110`}
                    >
                      {c.icon_url ? (
                        <img
                          src={c.icon_url}
                          alt={c.name}
                          className="h-10 w-10 object-contain drop-shadow"
                        />
                      ) : (
                        <span className="text-[34px] leading-none select-none drop-shadow">
                          {style.emoji}
                        </span>
                      )}
                      {/* Shine overlay */}
                      <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-gradient-to-b from-white/20 to-transparent" />
                    </div>

                    <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {c.name}
                    </h3>

                    <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">
                      {count > 0 ? `${count.toLocaleString("id")}+ toko` : "Segera hadir"}
                    </p>

                    <span className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Jelajahi <ArrowRight className="h-3 w-3" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </div>

      <MarketplaceFooter />
    </div>
  );
}
