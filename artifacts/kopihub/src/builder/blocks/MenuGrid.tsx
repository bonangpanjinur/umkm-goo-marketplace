import type { ComponentConfig } from "@measured/puck";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBuilderCtx } from "../BuilderContext";
import { formatIDR } from "@/lib/format";

export type MenuGridProps = {
  title: string;
  limit: number;
  columns: 2 | 3 | 4;
  showPrice: boolean;
};

type Item = { id: string; name: string; price: number; image_url: string | null; description: string | null };

function MenuGridRender({ title, limit, columns, showPrice }: MenuGridProps) {
  const ctx = useBuilderCtx();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ctx.slug) {
      // Editor preview: show placeholder
      setItems(Array.from({ length: limit }).map((_, i) => ({
        id: `p${i}`,
        name: `Menu Contoh ${i + 1}`,
        price: 25000 + i * 5000,
        image_url: null,
        description: "Preview di editor",
      })));
      setLoading(false);
      return;
    }
    (async () => {
      const { data: shop } = await supabase.from("coffee_shops").select("id").eq("slug", ctx.slug).maybeSingle();
      if (!shop) { setLoading(false); return; }
      const { data } = await supabase
        .from("menu_items")
        .select("id,name,price,image_url,description")
        .eq("shop_id", shop.id)
        .eq("is_available", true)
        .order("sort_order")
        .limit(limit);
      setItems((data ?? []) as Item[]);
      setLoading(false);
    })();
  }, [ctx.slug, limit]);

  const colClass = columns === 2 ? "sm:grid-cols-2" : columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-4";

  return (
    <div className="my-6">
      {title ? <h3 className="text-2xl font-semibold mb-4">{title}</h3> : null}
      {loading ? (
        <p className="text-muted-foreground text-sm">Memuat menu…</p>
      ) : items.length === 0 ? (
        <p className="text-muted-foreground text-sm">Belum ada menu.</p>
      ) : (
        <div className={`grid grid-cols-1 ${colClass} gap-4`}>
          {items.map((it) => (
            <a
              key={it.id}
              href={ctx.slug ? `/s/${ctx.slug}/menu/${it.id}` : "#"}
              className="block rounded-xl border border-border bg-card overflow-hidden hover:shadow-md transition"
            >
              {it.image_url ? (
                <img src={it.image_url} alt={it.name} loading="lazy" className="aspect-video w-full object-cover" />
              ) : (
                <div className="aspect-video w-full bg-muted" />
              )}
              <div className="p-3">
                <p className="font-medium text-card-foreground line-clamp-1">{it.name}</p>
                {it.description ? <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{it.description}</p> : null}
                {showPrice ? <p className="text-primary font-semibold mt-2">{formatIDR(it.price)}</p> : null}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export const MenuGrid: ComponentConfig<MenuGridProps> = {
  fields: {
    title: { type: "text" },
    limit: { type: "number", min: 1, max: 24 },
    columns: { type: "select", options: [{ label: "2 kolom", value: 2 }, { label: "3 kolom", value: 3 }, { label: "4 kolom", value: 4 }] },
    showPrice: { type: "radio", options: [{ label: "Tampilkan", value: true }, { label: "Sembunyikan", value: false }] },
  },
  defaultProps: { title: "Menu Pilihan", limit: 6, columns: 3, showPrice: true },
  render: MenuGridRender,
};
