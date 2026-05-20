import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const THEMES = [
  { key: "classic",       name: "Classic",        component_id: "classic",       tier_hint: "free",     sort_order: 1,  description: "Tampilan default klasik untuk semua jenis usaha." },
  { key: "minimal",       name: "Minimal",        component_id: "minimal",       tier_hint: "free",     sort_order: 2,  description: "Bersih, sederhana, fokus pada produk." },
  { key: "kuliner-warm",  name: "Kuliner Warm",   component_id: "kuliner-warm",  tier_hint: "pro",      sort_order: 10, description: "Hangat & menggugah selera untuk F&B." },
  { key: "retail-bold",   name: "Retail Bold",    component_id: "retail-bold",   tier_hint: "pro",      sort_order: 11, description: "Tegas & berani untuk toko retail." },
  { key: "service-clean", name: "Service Clean",  component_id: "service-clean", tier_hint: "pro",      sort_order: 12, description: "Profesional untuk usaha jasa." },
  { key: "rental-drive",  name: "Rental Drive",   component_id: "rental-drive",  tier_hint: "pro",      sort_order: 13, description: "Dinamis untuk rental kendaraan." },
  { key: "edu-bright",    name: "Edu Bright",     component_id: "edu-bright",    tier_hint: "pro",      sort_order: 14, description: "Cerah & ramah untuk edukasi." },
  { key: "beauty-soft",   name: "Beauty Soft",    component_id: "beauty-soft",   tier_hint: "pro",      sort_order: 15, description: "Lembut & elegan untuk kecantikan." },
  { key: "medic-trust",   name: "Medic Trust",    component_id: "medic-trust",   tier_hint: "pro",      sort_order: 16, description: "Tepercaya untuk layanan medis." },
  { key: "studio-mono",   name: "Studio Mono",    component_id: "studio-mono",   tier_hint: "business", sort_order: 20, description: "Monokrom untuk studio kreatif." },
  { key: "craft-paper",   name: "Craft Paper",    component_id: "craft-paper",   tier_hint: "business", sort_order: 21, description: "Tekstur kertas untuk produk artisan." },
  { key: "umroh",         name: "Umroh & Travel", component_id: "umroh",         tier_hint: "business", sort_order: 22, description: "Tema untuk biro umroh/travel." },
  { key: "sales-pro",     name: "Sales Pro",      component_id: "sales-pro",     tier_hint: "business", sort_order: 23, description: "Tema konversi tinggi untuk landing." },
];

export const seedThemesIfEmpty = createServerFn({ method: "POST" }).handler(async () => {
  const { count, error: countError } = await supabaseAdmin
    .from("themes")
    .select("*", { count: "exact", head: true });
  if (countError) throw countError;

  if ((count ?? 0) > 0) {
    return { seeded: false, total: count ?? 0, message: "Tabel themes sudah berisi data, tidak perlu di-seed." };
  }

  const { error: upsertError } = await supabaseAdmin
    .from("themes")
    .upsert(THEMES.map((t) => ({ ...t, is_active: true })), { onConflict: "key" });
  if (upsertError) throw upsertError;

  return { seeded: true, total: THEMES.length, message: `Berhasil seed ${THEMES.length} tema.` };
});
