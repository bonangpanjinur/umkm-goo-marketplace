// Starter templates — pre-built Puck data trees owners can import as a starting point.
// All blocks reference dynamic shop data via context, so they work for every shop.

export type StarterTemplate = {
  id: string;
  name: string;
  description: string;
  emoji: string;
  data: unknown;
};

const cls = (s: string) => s; // no-op tag for clarity

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
        {
          type: "Section",
          props: { id: "s1", padding: "lg", bg: "muted", maxWidth: "lg" },
        },
        {
          type: "ShopInfo",
          props: { id: "i1", showLogo: true, showAddress: true, showHours: true },
        },
        {
          type: "Heading",
          props: { id: "h1", text: "Menu Pilihan Kami", level: "h2", align: "center" },
        },
        {
          type: "MenuGrid",
          props: { id: "m1", columns: 3, limit: 9, categoryFilter: "" },
        },
        {
          type: "WhatsAppCTA",
          props: { id: "w1", label: cls("Pesan via WhatsApp"), message: "Halo, saya ingin pesan." },
        },
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
        {
          type: "Section",
          props: { id: "s1", padding: "xl", bg: "primary", maxWidth: "md" },
        },
        {
          type: "Heading",
          props: { id: "h1", text: "Promo Spesial Hari Ini!", level: "h1", align: "center" },
        },
        {
          type: "Text",
          props: {
            id: "t1",
            content: "Diskon menarik untuk semua menu favorit. Berlaku terbatas — pesan sekarang juga.",
            align: "center",
            size: "lg",
          },
        },
        {
          type: "Button",
          props: { id: "b1", label: "Lihat Menu", href: "#menu", variant: "primary", size: "lg" },
        },
        {
          type: "Heading",
          props: { id: "h2", text: "Menu Unggulan", level: "h2", align: "center" },
        },
        {
          type: "MenuGrid",
          props: { id: "m1", columns: 2, limit: 6, categoryFilter: "" },
        },
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
        {
          type: "Heading",
          props: { id: "h1", text: "Selamat Datang", level: "h1", align: "left" },
        },
        {
          type: "Text",
          props: {
            id: "t1",
            content: "Kami menyajikan kopi terbaik dengan harga ramah. Silakan jelajahi menu kami.",
            align: "left",
            size: "md",
          },
        },
        {
          type: "MenuGrid",
          props: { id: "m1", columns: 3, limit: 12, categoryFilter: "" },
        },
        {
          type: "ShopInfo",
          props: { id: "i1", showLogo: false, showAddress: true, showHours: true },
        },
      ],
    },
  },
];
