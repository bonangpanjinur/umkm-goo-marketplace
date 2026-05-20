// Starter templates — pre-built Puck data trees owners can import as a starting point.
// All blocks reference dynamic shop data via context, so they work for every shop.

export type StarterTemplate = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  data: unknown;
};

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "blank",
    name: "Kosong",
    description: "Mulai dari kanvas kosong tanpa block apa pun.",
    emoji: "⬜",
    data: { content: [], root: { props: {} } },
  },
  {
    id: "classic-cafe",
    name: "Kafe Klasik",
    description: "Hero, info toko, daftar menu, dan tombol WhatsApp.",
    emoji: "☕",
    data: {
      root: { props: {} },
      content: [
        { type: "Heading", props: { id: "h1", text: "Selamat Datang di Toko Kami", level: "h1", align: "center" } },
        { type: "ShopInfo", props: { id: "i1", showAddress: true, showPhone: true, showHours: true } },
        { type: "Heading", props: { id: "h2", text: "Menu Pilihan", level: "h2", align: "center" } },
        { type: "MenuGrid", props: { id: "m1", title: "", columns: 3, limit: 9, showPrice: true } },
        { type: "WhatsAppCTA", props: { id: "w1", label: "Pesan via WhatsApp", message: "Halo, saya ingin pesan.", align: "center" } },
      ],
    },
  },
  {
    id: "promo-landing",
    name: "Landing Promo",
    description: "Headline besar, deskripsi, tombol CTA, dan menu unggulan.",
    emoji: "🎉",
    data: {
      root: { props: {} },
      content: [
        { type: "Heading", props: { id: "h1", text: "Promo Spesial Hari Ini!", level: "h1", align: "center" } },
        { type: "Text", props: { id: "t1", text: "Diskon menarik untuk semua menu favorit. Berlaku terbatas — pesan sekarang juga.", align: "center" } },
        { type: "Button", props: { id: "b1", label: "Lihat Menu", href: "#menu", variant: "primary", align: "center" } },
        { type: "Heading", props: { id: "h2", text: "Menu Unggulan", level: "h2", align: "center" } },
        { type: "MenuGrid", props: { id: "m1", title: "", columns: 2, limit: 6, showPrice: true } },
      ],
    },
  },
  {
    id: "minimal-portfolio",
    name: "Toko Minimalis",
    description: "Tampilan bersih: judul singkat, info, dan grid menu.",
    emoji: "✨",
    data: {
      root: { props: {} },
      content: [
        { type: "Heading", props: { id: "h1", text: "Selamat Datang", level: "h1", align: "left" } },
        { type: "Text", props: { id: "t1", text: "Kami menyajikan produk terbaik dengan harga ramah. Silakan jelajahi katalog kami.", align: "left" } },
        { type: "MenuGrid", props: { id: "m1", title: "", columns: 3, limit: 12, showPrice: true } },
        { type: "ShopInfo", props: { id: "i1", showAddress: true, showPhone: true, showHours: true } },
      ],
    },
  },
  {
    id: "fnb-coffee-shop",
    name: "F&B — Coffee Shop",
    description: "Hero hangat khas kafe, menu signature, jam buka, dan CTA WhatsApp. Cocok untuk coffee shop / kafe.",
    emoji: "☕",
    data: {
      root: { props: {} },
      content: [
        { type: "Section", props: { id: "s1", background: "#faf8f5", padding: "xl" } },
        { type: "Heading", props: { id: "h1", text: "Secangkir Hangat untuk Hari Anda", level: "h1", align: "center" } },
        { type: "Text", props: { id: "t1", text: "Diseduh segar dari biji pilihan. Dine-in, take-away, atau pesan antar — pilih sesuai mood Anda hari ini.", align: "center" } },
        { type: "Button", props: { id: "b1", label: "Lihat Menu", href: "#menu", variant: "primary", align: "center" } },
        { type: "Heading", props: { id: "h2", text: "Menu Signature", level: "h2", align: "center" } },
        { type: "MenuGrid", props: { id: "m1", title: "", columns: 3, limit: 9, showPrice: true } },
        { type: "Section", props: { id: "s2", background: "#f0ebe3", padding: "lg" } },
        { type: "Heading", props: { id: "h3", text: "Mampir Yuk", level: "h2", align: "center" } },
        { type: "ShopInfo", props: { id: "i1", showAddress: true, showPhone: true, showHours: true } },
        { type: "WhatsAppCTA", props: { id: "w1", label: "Pesan via WhatsApp", message: "Halo, saya ingin pesan kopi.", align: "center" } },
      ],
    },
  },
  {
    id: "fnb-produce",
    name: "F&B — Buah & Sayur Segar",
    description: "Tampilan bersih untuk toko buah/sayur: katalog harian, info pengiriman, dan WhatsApp untuk pesan cepat.",
    emoji: "🥬",
    data: {
      root: { props: {} },
      content: [
        { type: "Section", props: { id: "s1", background: "#f5f7f2", padding: "xl" } },
        { type: "Heading", props: { id: "h1", text: "Segar Tiap Pagi, Sampai ke Dapur Anda", level: "h1", align: "center" } },
        { type: "Text", props: { id: "t1", text: "Buah dan sayur pilihan langsung dari petani. Pesan sebelum jam 10 pagi untuk pengantaran hari yang sama.", align: "center" } },
        { type: "Button", props: { id: "b1", label: "Pesan Sekarang", href: "#menu", variant: "primary", align: "center" } },
        { type: "Heading", props: { id: "h2", text: "Pilihan Hari Ini", level: "h2", align: "center" } },
        { type: "MenuGrid", props: { id: "m1", title: "", columns: 3, limit: 12, showPrice: true } },
        { type: "Section", props: { id: "s2", background: "#ffffff", padding: "lg" } },
        { type: "Heading", props: { id: "h3", text: "Info Toko & Pengiriman", level: "h2", align: "center" } },
        { type: "ShopInfo", props: { id: "i1", showAddress: true, showPhone: true, showHours: true } },
        { type: "WhatsAppCTA", props: { id: "w1", label: "Tanya Stok via WhatsApp", message: "Halo, saya mau cek stok buah/sayur hari ini.", align: "center" } },
      ],
    },
  },
];
