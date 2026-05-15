import { createFileRoute } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";
import { SimpleCRUD } from "@/components/sales-pro/SimpleCRUD";

export const Route = createFileRoute("/pos-app/sales-offerings")({
  head: () => ({ meta: [{ title: "Katalog Layanan — Merchant" }] }),
  component: () => (
    <SimpleCRUD
      table="sales_offerings"
      title="Katalog Layanan"
      subtitle="Layanan / produk yang ditawarkan ke klien"
      icon={<Briefcase className="h-6 w-6" />}
      fields={[
        { key: "title", label: "Judul Layanan", required: true },
        { key: "short_desc", label: "Deskripsi Singkat" },
        { key: "long_desc", label: "Deskripsi Lengkap", type: "textarea" },
        { key: "price_label", label: "Harga (teks bebas, mis. 'Mulai 5jt')" },
        { key: "category", label: "Kategori" },
        { key: "cover_image_url", label: "URL Gambar Cover" },
      ]}
      renderItem={(r) => (
        <div>
          {r.cover_image_url ? <img src={r.cover_image_url as string} alt="" className="h-24 w-full object-cover rounded mb-2" /> : null}
          <h3 className="font-semibold">{r.title as string}</h3>
          {r.short_desc ? <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.short_desc as string}</p> : null}
          {r.price_label ? <p className="text-sm font-medium mt-1">{r.price_label as string}</p> : null}
        </div>
      )}
    />
  ),
});
