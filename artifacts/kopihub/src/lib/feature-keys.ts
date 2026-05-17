/**
 * Feature keys kanonik — single source of truth.
 *
 * Seed via `business_categories.enabled_features` (lihat migration F-17).
 * Owner toko bisa override via `shops.feature_overrides = {enable:[],disable:[]}`.
 * View `v_shop_capabilities` menggabungkan keduanya.
 *
 * Cara pakai:
 *   const { has, hasAny, ready } = useShopCapabilities(shopId);
 *   if (!ready) return <Loading/>;
 *   if (!has("RENTAL")) return <NotAvailableForCategory feature="RENTAL"/>;
 */
export const FEATURE_KEYS = [
  // POS / Retail / F&B
  "POS","MENU","KDS","TABLES","INVENTORY","VARIANTS","RECIPES","COMBO_BUILDER",
  "SUPPLIERS","SHIFTS","SIZE_GUIDE","LOOKBOOK","LIMITED_EDITIONS","BUNDLES",
  "RESERVASI",
  // Booking sesi (T3)
  "BOOKING","STAFF_PICKER","SERVICE_BUNDLES","FOLLOWUP_REMINDERS",
  "ANTRIAN","WAITLIST",
  // Rental (T4)
  "RENTAL","RENTAL_AVAILABILITY","RENTAL_DEPOSIT","RENTAL_FINES",
  "RENTAL_CHECKLIST","RENTAL_TNC","RENTAL_EXTEND","RENTAL_UNIT_READY",
  // Digital (T2)
  "DIGITAL","DIGITAL_LICENSES","DIGITAL_VERSION","KURSUS",
  // Klinik
  "ANAMNESIS","MEDICAL_INVOICE","PATIENT_RECORDS",
  // Studio foto
  "PORTFOLIO","STUDIO_PACKAGES","STUDIO_DELIVERY","STUDIO_BRIEF","STUDIO_ADDONS",
  // Travel / Sales-pro
  "UMROH_PACKAGES","UMROH_FACILITIES","UMROH_FAQ","FLYERS","TESTIMONIALS",
  "LEADS","ABOUT_PAGE","TRAVEL_MANIFEST","TRAVEL_INSTALLMENTS",
  // Custom order (T5) & jasa digital
  "CUSTOM_ORDER","CUSTOM_ORDER_QUOTES","MILESTONES","CONTRACTS",
  "JOB_DELIVERABLES","PRE_ORDERS",
  // Fase A/B baru
  "RENTAL_KYC","RENTAL_INSPECTIONS","MEDICATIONS","PRESCRIPTIONS",
  "PRODUCT_RETURNS","CUSTOMER_TREATMENTS","SESSION_MEMBERSHIP","STUDIO_GALLERY",
] as const;

export type FeatureKey = typeof FEATURE_KEYS[number];

export type FlowType = "T1" | "T2" | "T3" | "T4" | "T5";

export const FLOW_TYPE_LABEL: Record<FlowType, string> = {
  T1: "Produk Fisik",
  T2: "Produk Digital",
  T3: "Booking Sesi",
  T4: "Rental Sewa",
  T5: "Pre-order / Custom Order",
};

/** Label ramah pengguna untuk ringkasan kapabilitas di onboarding. */
export const FEATURE_LABEL: Partial<Record<FeatureKey, string>> = {
  POS: "Kasir POS",
  MENU: "Menu / Produk",
  KDS: "Kitchen Display",
  TABLES: "Meja & QR",
  INVENTORY: "Inventori",
  VARIANTS: "Varian Produk",
  RECIPES: "Resep",
  SIZE_GUIDE: "Panduan Ukuran",
  BOOKING: "Booking Jadwal",
  STAFF_PICKER: "Pilih Staf",
  SERVICE_BUNDLES: "Paket Layanan",
  ANTRIAN: "Antrean Digital",
  WAITLIST: "Waitlist",
  RENTAL: "Manajemen Rental",
  RENTAL_DEPOSIT: "Deposit Otomatis",
  RENTAL_FINES: "Denda Keterlambatan",
  RENTAL_CHECKLIST: "Checklist Kondisi",
  DIGITAL: "Produk Digital",
  KURSUS: "Kursus Online",
  DIGITAL_LICENSES: "Lisensi Digital",
  ANAMNESIS: "Anamnesis Digital",
  MEDICAL_INVOICE: "Tagihan & Resep",
  PATIENT_RECORDS: "Rekam Medis",
  PORTFOLIO: "Portofolio",
  STUDIO_PACKAGES: "Paket Foto",
  STUDIO_DELIVERY: "Kirim Hasil Foto",
  UMROH_PACKAGES: "Paket Umroh",
  LEADS: "Lead / CRM",
  CUSTOM_ORDER: "Custom Order",
  MILESTONES: "Milestone Proyek",
  CONTRACTS: "Kontrak Digital",
  TRAVEL_MANIFEST: "Manifest Jamaah",
  TRAVEL_INSTALLMENTS: "Cicilan Travel",
  RENTAL_KYC: "Verifikasi Penyewa",
  RENTAL_INSPECTIONS: "Inspeksi Unit",
  MEDICATIONS: "Stok Obat",
  PRESCRIPTIONS: "Resep Digital",
  PRODUCT_RETURNS: "Retur Barang",
  CUSTOMER_TREATMENTS: "Riwayat Treatment",
  SESSION_MEMBERSHIP: "Paket Sesi",
  STUDIO_GALLERY: "Galeri Klien",
};
