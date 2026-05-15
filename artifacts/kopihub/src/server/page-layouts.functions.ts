import { supabase } from "@/integrations/supabase/client";

export type PageLayout = {
  id: string;
  shop_id: string;
  page_type: "home" | "menu_detail" | "cart" | "checkout" | "custom";
  slug: string | null;
  title: string;
  puck_data: unknown;
  is_published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const EMPTY_PUCK = { content: [], root: { props: {} } };

async function requireShopId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");
  const { data: shop, error } = await supabase
    .from("coffee_shops")
    .select("id")
    .eq("owner_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!shop) throw new Error("shop_not_found");
  return shop.id;
}

export async function listMyLayouts(): Promise<PageLayout[]> {
  const shopId = await requireShopId();
  const { data, error } = await supabase
    .from("page_layouts")
    .select("*")
    .eq("shop_id", shopId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PageLayout[];
}

export async function getLayout(id: string): Promise<PageLayout | null> {
  const { data, error } = await supabase.from("page_layouts").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as PageLayout) ?? null;
}

export async function createLayout(input: {
  page_type: PageLayout["page_type"];
  slug?: string | null;
  title: string;
}): Promise<PageLayout> {
  const shopId = await requireShopId();
  const { data, error } = await supabase
    .from("page_layouts")
    .insert({
      shop_id: shopId,
      page_type: input.page_type,
      slug: input.slug ?? null,
      title: input.title,
      puck_data: EMPTY_PUCK,
    })
    .select()
    .single();
  if (error) throw error;
  return data as PageLayout;
}

export async function saveLayout(id: string, puck_data: unknown, title?: string): Promise<void> {
  const patch: Record<string, unknown> = { puck_data };
  if (title !== undefined) patch.title = title;
  const { error } = await supabase.from("page_layouts").update(patch).eq("id", id);
  if (error) throw error;
}

export async function publishLayout(id: string, publish: boolean): Promise<void> {
  const { error } = await supabase
    .from("page_layouts")
    .update({ is_published: publish, published_at: publish ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteLayout(id: string): Promise<void> {
  const { error } = await supabase.from("page_layouts").delete().eq("id", id);
  if (error) throw error;
}

// Public — used by storefront
export async function getPublishedLayoutForShop(opts: {
  slug: string;
  page_type: PageLayout["page_type"];
  pageSlug?: string | null;
}): Promise<PageLayout | null> {
  const { data: shop } = await supabase.from("coffee_shops").select("id").eq("slug", opts.slug).maybeSingle();
  if (!shop) return null;
  let q = supabase
    .from("page_layouts")
    .select("*")
    .eq("shop_id", shop.id)
    .eq("page_type", opts.page_type)
    .eq("is_published", true)
    .limit(1);
  if (opts.pageSlug) q = q.eq("slug", opts.pageSlug);
  else q = q.is("slug", null);
  const { data } = await q.maybeSingle();
  return (data as PageLayout) ?? null;
}
