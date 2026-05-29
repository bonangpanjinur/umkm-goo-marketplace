import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/masuk")({
  head: () => ({ meta: [{ title: "Masuk — UMKMgo" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/login" });
  },
});
