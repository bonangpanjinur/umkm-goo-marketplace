import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/daftar")({
  head: () => ({ meta: [{ title: "Daftar Akun — UMKMgo" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/signup" });
  },
});
