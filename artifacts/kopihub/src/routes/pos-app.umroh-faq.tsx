import { createFileRoute } from "@tanstack/react-router";
import { HelpCircle } from "lucide-react";
import { SimpleCRUD } from "@/components/sales-pro/SimpleCRUD";

export const Route = createFileRoute("/pos-app/umroh-faq")({
  head: () => ({ meta: [{ title: "FAQ Umroh — Merchant" }] }),
  component: () => (
    <SimpleCRUD
      table="umroh_faqs"
      title="FAQ & Syarat Dokumen"
      subtitle="Pertanyaan umum & syarat dokumen jamaah"
      icon={<HelpCircle className="h-6 w-6" />}
      fields={[
        { key: "question", label: "Pertanyaan", required: true },
        { key: "answer", label: "Jawaban", type: "textarea", required: true },
        { key: "category", label: "Kategori (general / documents)" },
      ]}
      defaults={{ category: "general" }}
      renderItem={(r) => (
        <div>
          <p className="font-semibold text-sm">{r.question as string}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{r.answer as string}</p>
        </div>
      )}
    />
  ),
});
