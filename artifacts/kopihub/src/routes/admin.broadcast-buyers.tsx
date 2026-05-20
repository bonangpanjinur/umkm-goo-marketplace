import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/broadcast-buyers")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/broadcast" });
  },
  component: () => null,
});
