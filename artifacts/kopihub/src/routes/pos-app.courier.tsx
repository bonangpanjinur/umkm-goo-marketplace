import { createFileRoute } from "@tanstack/react-router";
import { CourierDashboard } from "@/components/courier/CourierDashboard";

export const Route = createFileRoute("/pos-app/courier")({
  head: () => ({ meta: [{ title: "Pengaturan Kurir — Merchant" }] }),
  component: CourierDashboard,
});
