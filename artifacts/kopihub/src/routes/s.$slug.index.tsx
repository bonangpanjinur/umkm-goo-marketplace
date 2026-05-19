import { createFileRoute, Link, useParams, getRouteApi } from "@tanstack/react-router";
import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { addToCart } from "@/lib/customer-cart";
import { toast } from "sonner";
import { shopStatus } from "@/lib/shop-hours";
import { ThemedHome } from "@/components/storefront/themes/registry";
import type { StorefrontItem } from "@/components/storefront/themes/types";
import { getPublishedLayoutForShop, type PageLayout } from "@/lib/api/page-layouts.functions";
import { BuilderProvider } from "@/builder/BuilderContext";
import { builderConfig } from "@/builder/config";

const PuckRender = lazy(() => import("@measured/puck").then((m) => ({ default: m.Render })));

export const Route = createFileRoute("/s/$slug/")({
  component: ShopHome,
});

const parentRoute = getRouteApi("/s/$slug");

type Cat = { id: string; name: string };
type Item = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  is_available: boolean;
};

function ShopHome() {
  const { slug } = useParams({ from: "/s/$slug/" });
  const { shop } = parentRoute.useLoaderData();
  const [cats, setCats] = useState<Cat[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [q, setQ] = useState("");
  const [hideUnavailable] = useState(true);
  const [customLayout, setCustomLayout] = useState<PageLayout | null>(null);
  const [layoutChecked, setLayoutChecked] = useState(false);

  useEffect(() => {
    if (!slug) return;
    getPublishedLayoutForShop({ slug, page_type: "home" })
      .then((l) => setCustomLayout(l))
      .catch(() => setCustomLayout(null))
      .finally(() => setLayoutChecked(true));
  }, [slug]);

  useEffect(() => {
    if (!shop) return;
    (async () => {
      const [{ data: c }, { data: m }] = await Promise.all([
        supabase
          .from("categories")
          .select("id,name")
          .eq("shop_id", shop.id)
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("menu_items")
          .select("id,name,description,price,image_url,category_id,is_available")
          .eq("shop_id", shop.id)
          .order("sort_order"),
      ]);
      setCats(c ?? []);
      setItems((m ?? []) as Item[]);
    })();
  }, [shop]);

  const status = useMemo(() => (shop ? shopStatus(shop.open_hours) : null), [shop]);

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (hideUnavailable && !i.is_available) return false;
      if (activeCat !== "all" && i.category_id !== activeCat) return false;
      if (q && !i.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, activeCat, q, hideUnavailable]);

  if (!shop) return <p className="text-muted-foreground text-sm">Memuat menu…</p>;

  // If a published custom layout exists, render it instead of the theme.
  if (layoutChecked && customLayout) {
    return (
      <BuilderProvider value={{ slug, shopId: shop.id }}>
        <Suspense fallback={<p className="text-muted-foreground text-sm">Memuat halaman…</p>}>
          <PuckRender config={builderConfig as never} data={customLayout.puck_data as never} />
        </Suspense>
      </BuilderProvider>
    );
  }

  const shopAny = shop as unknown as { active_theme_key?: string; business_subtype?: string | null; business_category?: { slug?: string | null } | null };
  const catSlug = (shopAny.business_category?.slug ?? "").toLowerCase();
  const subtype = shopAny.business_subtype ?? null;
  let themeKey = shopAny.active_theme_key ?? "classic";
  if (catSlug === "sales-jasa-profesional") {
    themeKey = subtype === "umroh" ? "umroh" : "sales-pro";
  }
  // Theme preview override (?theme=key) — used by owner appearance page
  if (typeof window !== "undefined") {
    const override = new URLSearchParams(window.location.search).get("theme");
    if (override) themeKey = override;
  }
  const onAdd = (i: StorefrontItem) => {
    addToCart(slug, { menu_item_id: i.id, name: i.name, price: Number(i.price), image_url: i.image_url });
    toast.success(`${i.name} ditambahkan`);
  };
  const renderItemLink = (i: StorefrontItem, children: React.ReactNode) => (
    <Link to="/s/$slug/menu/$menuId" params={{ slug, menuId: i.id }}>{children}</Link>
  );
  return (
    <ThemedHome
      themeKey={themeKey}
      slug={slug}
      shop={shop as never}
      cats={cats}
      items={items as StorefrontItem[]}
      filtered={filtered as StorefrontItem[]}
      activeCat={activeCat}
      setActiveCat={setActiveCat}
      q={q}
      setQ={setQ}
      status={status}
      onAdd={onAdd}
      renderItemLink={renderItemLink}
    />
  );
}
