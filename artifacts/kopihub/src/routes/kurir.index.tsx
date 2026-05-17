import { createFileRoute } from "@tanstack/react-router";
import { CourierDashboard } from "@/components/courier/CourierDashboard";

export const Route = createFileRoute("/kurir/")({
  component: CourierDashboard,
});
