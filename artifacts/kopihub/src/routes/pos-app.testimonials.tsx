import { createFileRoute } from "@tanstack/react-router";
import { Quote } from "lucide-react";
import { SimpleCRUD } from "@/components/sales-pro/SimpleCRUD";

export const Route = createFileRoute("/pos-app/testimonials")({
  head: () => ({ meta: [{ title: "Testimoni — Merchant" }] }),
  component: () => (
    <SimpleCRUD
      table="testimonials"
      title="Testimoni"
      subtitle="Testimoni jamaah / klien"
      icon={<Quote className="h-6 w-6" />}
      fields={[
        { key: "name", label: "Nama", required: true },
        { key: "quote", label: "Testimoni", type: "textarea", required: true },
        { key: "role_or_trip", label: "Peran / Paket / Perjalanan" },
        { key: "rating", label: "Rating (1-5)", type: "number" },
        { key: "photo_url", label: "URL Foto" },
      ]}
      renderItem={(r) => (
        <div>
          <p className="font-semibold text-sm">{r.name as string}</p>
          {r.role_or_trip ? <p className="text-xs text-muted-foreground">{r.role_or_trip as string}</p> : null}
          <p className="text-sm mt-2 italic line-clamp-3">"{r.quote as string}"</p>
        </div>
      )}
    />
  ),
});
