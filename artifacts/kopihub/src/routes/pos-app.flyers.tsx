import { createFileRoute } from "@tanstack/react-router";
import { ImageIcon } from "lucide-react";
import { SimpleCRUD } from "@/components/sales-pro/SimpleCRUD";

export const Route = createFileRoute("/pos-app/flyers")({
  head: () => ({ meta: [{ title: "Galeri Flyer — Merchant" }] }),
  component: () => (
    <SimpleCRUD
      table="flyers"
      title="Galeri Flyer & Brosur"
      subtitle="Upload flyer/brosur untuk ditampilkan di storefront"
      icon={<ImageIcon className="h-6 w-6" />}
      fields={[
        { key: "title", label: "Judul", required: true },
        { key: "image_url", label: "URL Gambar", required: true },
        { key: "description", label: "Deskripsi", type: "textarea" },
        { key: "file_url", label: "URL PDF (opsional)" },
      ]}
      renderItem={(r) => (
        <div>
          <img src={r.image_url as string} alt="" className="h-32 w-full object-cover rounded mb-2" />
          <p className="font-semibold text-sm">{r.title as string}</p>
        </div>
      )}
    />
  ),
});
