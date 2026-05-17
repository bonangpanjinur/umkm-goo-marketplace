import { supabase } from "@/integrations/supabase/client";

/**
 * Contoh data per kategori untuk membantu user baru mengenal aplikasi.
 * Aman dijalankan berkali-kali (akan duplikat data, jadi panggil sekali saat onboarding).
 */

type MenuSeed = { name: string; price: number; description?: string };
type CategorySeed = { name: string; items: MenuSeed[] };
type BundleSeed = { name: string; description?: string; price: number; duration_min: number };

type Template = {
  categories?: CategorySeed[];
  bundles?: BundleSeed[];
};

const TEMPLATES: Record<string, Template> = {
  fnb: {
    categories: [
      {
        name: "Minuman",
        items: [
          { name: "Es Kopi Susu", price: 18000, description: "Espresso, susu segar, gula aren" },
          { name: "Americano", price: 20000, description: "Espresso double + air panas" },
          { name: "Matcha Latte", price: 25000, description: "Matcha premium + susu" },
        ],
      },
      {
        name: "Makanan",
        items: [
          { name: "Nasi Goreng Spesial", price: 28000 },
          { name: "Mie Ayam", price: 22000 },
          { name: "Roti Bakar Coklat", price: 15000 },
        ],
      },
    ],
  },
  retail: {
    categories: [
      {
        name: "Produk Unggulan",
        items: [
          { name: "Kaos Polos Hitam", price: 75000, description: "Cotton combed 30s" },
          { name: "Tote Bag Canvas", price: 55000 },
          { name: "Topi Baseball", price: 65000 },
        ],
      },
    ],
  },
  jasa: {
    bundles: [
      { name: "Service Reguler", description: "Pengerjaan standar 1-2 hari", price: 150000, duration_min: 60 },
      { name: "Service Express", description: "Selesai hari yang sama", price: 250000, duration_min: 30 },
    ],
  },
  rental: {
    categories: [
      {
        name: "Unit Rental",
        items: [
          { name: "Sewa Harian", price: 200000, description: "Tarif per hari" },
          { name: "Sewa Mingguan", price: 1200000, description: "Tarif per 7 hari" },
        ],
      },
    ],
  },
  kursus: {
    bundles: [
      { name: "Trial Class", description: "1 sesi percobaan", price: 50000, duration_min: 60 },
      { name: "Paket 8 Sesi", description: "Berlaku 2 bulan", price: 800000, duration_min: 90 },
    ],
  },
  salon: {
    bundles: [
      { name: "Potong Rambut", price: 50000, duration_min: 30 },
      { name: "Cuci + Blow", price: 75000, duration_min: 45 },
      { name: "Hair Spa", description: "Treatment lengkap", price: 150000, duration_min: 90 },
    ],
  },
  klinik: {
    bundles: [
      { name: "Konsultasi Dokter Umum", price: 100000, duration_min: 20 },
      { name: "Medical Check-up Dasar", description: "Cek tensi, gula darah, kolesterol", price: 350000, duration_min: 45 },
    ],
  },
  "studio-foto": {
    bundles: [
      { name: "Paket Foto Keluarga", description: "1 jam, 20 foto edit", price: 500000, duration_min: 60 },
      { name: "Pas Foto Express", description: "10 menit jadi", price: 35000, duration_min: 10 },
    ],
  },
  travel: {
    categories: [
      {
        name: "Paket Tour",
        items: [
          { name: "Wisata Bromo 2D1N", price: 850000, description: "Termasuk transport + homestay" },
          { name: "Open Trip Bali 4D3N", price: 1750000 },
        ],
      },
    ],
  },
  "custom-order": {
    categories: [
      {
        name: "Layanan Custom",
        items: [
          { name: "Custom Order Reguler", price: 0, description: "Harga menyesuaikan brief — DP 50%" },
          { name: "Revisi Tambahan", price: 50000, description: "Per revisi di luar paket" },
        ],
      },
    ],
  },
  lainnya: {
    categories: [
      {
        name: "Produk / Layanan",
        items: [
          { name: "Item Contoh A", price: 50000 },
          { name: "Item Contoh B", price: 100000 },
        ],
      },
    ],
  },
};

export type SeedResult = { items: number; bundles: number };

export async function seedSampleData(shopId: string, categorySlug: string): Promise<SeedResult> {
  const tpl = TEMPLATES[categorySlug] ?? TEMPLATES.lainnya;
  let totalItems = 0;
  let totalBundles = 0;

  // Categories + menu_items
  for (const [idx, cat] of (tpl.categories ?? []).entries()) {
    const { data: catRow, error: catErr } = await supabase
      .from("categories")
      .insert({ shop_id: shopId, name: cat.name, sort_order: idx } as any)
      .select("id")
      .single();
    if (catErr || !catRow) continue;

    const rows = cat.items.map((it, i) => ({
      shop_id: shopId,
      category_id: catRow.id,
      name: it.name,
      description: it.description ?? null,
      price: it.price,
      sort_order: i,
    }));
    const { error: itemErr } = await supabase.from("menu_items").insert(rows as any);
    if (!itemErr) totalItems += rows.length;
  }

  // Service bundles
  if (tpl.bundles?.length) {
    const rows = tpl.bundles.map((b, i) => ({
      shop_id: shopId,
      name: b.name,
      description: b.description ?? null,
      total_price_idr: b.price,
      original_price_idr: b.price,
      duration_min: b.duration_min,
      sort_order: i,
    }));
    const { error } = await supabase.from("service_bundles").insert(rows as any);
    if (!error) totalBundles += rows.length;
  }

  return { items: totalItems, bundles: totalBundles };
}
