import { createFileRoute } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { SimpleCRUD } from "@/components/sales-pro/SimpleCRUD";

export const Route = createFileRoute("/pos-app/umroh-facilities")({
  head: () => ({ meta: [{ title: "Fasilitas Umroh — Merchant" }] }),
  component: () => (
    <SimpleCRUD
      table="umroh_facilities"
      title="Fasilitas Umroh"
      subtitle="Daftar fasilitas yang ditampilkan di storefront"
      icon={<Star className="h-6 w-6" />}
      fields={[
        { key: "title", label: "Judul Fasilitas", required: true },
        { key: "icon", label: "Icon (emoji atau teks pendek)" },
        { key: "description", label: "Deskripsi", type: "textarea" },
      ]}
      renderItem={(r) => (
        <div>
          <div className="flex items-center gap-2"><span className="text-xl">{(r.icon as string) || "✓"}</span><h3 className="font-semibold">{r.title as string}</h3></div>
          {r.description ? <p className="text-xs text-muted-foreground mt-1">{r.description as string}</p> : null}
        </div>
      )}
    />
  ),
});
