import { createFileRoute } from "@tanstack/react-router";
import { CourierDashboard } from "@/components/courier/CourierDashboard";

export const Route = createFileRoute("/pos-app/courier")({
  component: CourierDashboard,
});
