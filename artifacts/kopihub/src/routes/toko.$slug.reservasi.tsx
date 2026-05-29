import { createFileRoute, redirect } from "@tanstack/react-router";

// Konsolidasi: reservasi meja kini dilayani oleh /toko/$slug/booking?type=table.
// File ini hanya melakukan redirect agar URL/bookmark lama tidak 404.
export const Route = createFileRoute("/toko/$slug/reservasi")({
  head: () => ({ meta: [{ title: "Reservasi — UMKMgo" }] }),
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/toko/$slug/booking",
      params: { slug: params.slug },
      search: { type: "table" },
    });
  },
});
