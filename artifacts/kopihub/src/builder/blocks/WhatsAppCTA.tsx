import type { ComponentConfig } from "@measured/puck";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBuilderCtx } from "../BuilderContext";
import { MessageCircle } from "lucide-react";

export type WhatsAppCTAProps = { label: string; message: string; align: "left" | "center" | "right" };
const align = { left: "justify-start", center: "justify-center", right: "justify-end" };

function Render({ label, message, align: a }: WhatsAppCTAProps) {
  const ctx = useBuilderCtx();
  const [wa, setWa] = useState<string>("");
  useEffect(() => {
    if (!ctx.slug) return;
    supabase.from("shops").select("whatsapp,phone").eq("slug", ctx.slug).maybeSingle()
      .then(({ data }) => setWa((data?.whatsapp || data?.phone || "").replace(/\D/g, "")));
  }, [ctx.slug]);
  const href = wa ? `https://wa.me/${wa.startsWith("0") ? "62" + wa.slice(1) : wa}?text=${encodeURIComponent(message)}` : "#";
  return (
    <div className={`flex ${align[a]} my-4`}>
      <a href={href} target="_blank" rel="noopener" className="inline-flex items-center gap-2 bg-[#25D366] text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:opacity-90 transition">
        <MessageCircle className="size-4" />
        {label}
      </a>
    </div>
  );
}

export const WhatsAppCTA: ComponentConfig<WhatsAppCTAProps> = {
  fields: {
    label: { type: "text" },
    message: { type: "textarea" },
    align: { type: "select", options: [{ label: "Kiri", value: "left" }, { label: "Tengah", value: "center" }, { label: "Kanan", value: "right" }] },
  },
  defaultProps: { label: "Chat WhatsApp", message: "Halo, saya mau pesan dari website Anda.", align: "center" },
  render: Render,
};
