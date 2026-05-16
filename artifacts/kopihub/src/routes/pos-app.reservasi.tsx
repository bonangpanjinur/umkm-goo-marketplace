import { createFileRoute, redirect } from "@tanstack/react-router";

// Konsolidasi: reservasi meja kini dikelola dari /pos-app/booking (tab "Meja").
// Halaman lama mengacu ke tabel yang tidak digunakan lagi, jadi diganti redirect.
export const Route = createFileRoute("/pos-app/reservasi")({
  beforeLoad: () => {
    throw redirect({
      to: "/pos-app/booking",
      search: { type: "table" },
    });
  },
});
