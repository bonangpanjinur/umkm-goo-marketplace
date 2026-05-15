import { supabase } from "@/integrations/supabase/client";
import { STARTER_TEMPLATES, type StarterTemplate } from "@/builder/starter-templates";

export type PageLayout = {
  id: string;
  shop_id: string;
  page_type: "home" | "menu_detail" | "cart" | "checkout" | "custom";
  slug: string | null;
  title: string;
  puck_data: unknown;
  is_published: boolean;
  published_at: string | null;
  scheduled_publish_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PageLayoutVersion = {
  id: string;
  layout_id: string;
  shop_id: string;
  puck_data: unknown;
  title: string | null;
  is_published_snapshot: boolean;
  reason: string | null;
  created_at: string;
};

const EMPTY_PUCK = { content: [], root: { props: {} } };
const MAX_VERSIONS = 30;

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
  puck_data?: unknown;
}): Promise<PageLayout> {
  const shopId = await requireShopId();
  const { data, error } = await supabase
    .from("page_layouts")
    .insert({
      shop_id: shopId,
      page_type: input.page_type,
      slug: input.slug ?? null,
      title: input.title,
      puck_data: input.puck_data ?? EMPTY_PUCK,
    })
    .select()
    .single();
  if (error) throw error;
  return data as PageLayout;
}

async function snapshotVersion(layout: PageLayout, reason: string, isPublishedSnap: boolean) {
  await supabase.from("page_layout_versions").insert({
    layout_id: layout.id,
    shop_id: layout.shop_id,
    puck_data: layout.puck_data,
    title: layout.title,
    is_published_snapshot: isPublishedSnap,
    reason,
  });
  // Trim to MAX_VERSIONS (keep newest)
  const { data: olds } = await supabase
    .from("page_layout_versions")
    .select("id")
    .eq("layout_id", layout.id)
    .order("created_at", { ascending: false })
    .range(MAX_VERSIONS, MAX_VERSIONS + 200);
  const ids = (olds ?? []).map((r: { id: string }) => r.id);
  if (ids.length) await supabase.from("page_layout_versions").delete().in("id", ids);
}

export async function saveLayout(id: string, puck_data: unknown, title?: string): Promise<void> {
  // snapshot current first
  const current = await getLayout(id);
  if (current) await snapshotVersion(current, "auto-save", current.is_published);
  const patch: Record<string, unknown> = { puck_data };
  if (title !== undefined) patch.title = title;
  const { error } = await supabase.from("page_layouts").update(patch).eq("id", id);
  if (error) throw error;
}

export async function publishLayout(id: string, publish: boolean): Promise<void> {
  const current = await getLayout(id);
  if (current) await snapshotVersion(current, publish ? "publish" : "unpublish", publish);
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

export async function listVersions(layoutId: string): Promise<PageLayoutVersion[]> {
  const { data, error } = await supabase
    .from("page_layout_versions")
    .select("*")
    .eq("layout_id", layoutId)
    .order("created_at", { ascending: false })
    .limit(MAX_VERSIONS);
  if (error) throw error;
  return (data ?? []) as PageLayoutVersion[];
}

export async function restoreVersion(layoutId: string, versionId: string): Promise<unknown> {
  const { data: v, error } = await supabase
    .from("page_layout_versions").select("*").eq("id", versionId).maybeSingle();
  if (error) throw error;
  if (!v) throw new Error("version_not_found");
  const current = await getLayout(layoutId);
  if (current) await snapshotVersion(current, "before-restore", current.is_published);
  const { error: e2 } = await supabase
    .from("page_layouts").update({ puck_data: v.puck_data }).eq("id", layoutId);
  if (e2) throw e2;
  return v.puck_data;
}

export async function getVersion(versionId: string): Promise<PageLayoutVersion | null> {
  const { data, error } = await supabase
    .from("page_layout_versions").select("*").eq("id", versionId).maybeSingle();
  if (error) throw error;
  return (data as PageLayoutVersion) ?? null;
}

export async function schedulePublish(id: string, when: string | null): Promise<void> {
  const { error } = await supabase
    .from("page_layouts")
    .update({ scheduled_publish_at: when })
    .eq("id", id);
  if (error) throw error;
}

export function listStarterTemplates(): StarterTemplate[] {
  return STARTER_TEMPLATES;
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

// Image upload
export async function uploadBuilderImage(file: File): Promise<string> {
  const shopId = await requireShopId();
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${shopId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("builder-assets").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from("builder-assets").getPublicUrl(path);
  return data.publicUrl;
}
