import type { ComponentConfig } from "@measured/puck";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useBuilderCtx } from "../BuilderContext";
import { MapPin, Phone, Clock } from "lucide-react";

export type ShopInfoProps = { showAddress: boolean; showPhone: boolean; showHours: boolean };

function ShopInfoRender({ showAddress, showPhone, showHours }: ShopInfoProps) {
  const ctx = useBuilderCtx();
  const [shop, setShop] = useState<{ name: string; address: string | null; phone: string | null; tagline: string | null } | null>(null);

  useEffect(() => {
    if (!ctx.slug) {
      setShop({ name: "Toko Contoh", address: "Jl. Contoh No. 123", phone: "08123456789", tagline: "Tagline contoh" });
      return;
    }
    supabase.from("shops").select("name,address,phone,tagline").eq("slug", ctx.slug).maybeSingle()
      .then(({ data }) => setShop(data as never));
  }, [ctx.slug]);

  if (!shop) return null;
  return (
    <div className="my-6 space-y-3">
      <h3 className="text-2xl font-semibold">{shop.name}</h3>
      {shop.tagline ? <p className="text-muted-foreground">{shop.tagline}</p> : null}
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        {showAddress && shop.address ? (
          <div className="flex gap-2"><MapPin className="size-4 mt-0.5 shrink-0 text-primary" /><span>{shop.address}</span></div>
        ) : null}
        {showPhone && shop.phone ? (
          <div className="flex gap-2"><Phone className="size-4 mt-0.5 shrink-0 text-primary" /><span>{shop.phone}</span></div>
        ) : null}
        {showHours ? (
          <div className="flex gap-2"><Clock className="size-4 mt-0.5 shrink-0 text-primary" /><span>Buka setiap hari</span></div>
        ) : null}
      </div>
    </div>
  );
}

export const ShopInfo: ComponentConfig<ShopInfoProps> = {
  fields: {
    showAddress: { type: "radio", options: [{ label: "Ya", value: true }, { label: "Tidak", value: false }] },
    showPhone: { type: "radio", options: [{ label: "Ya", value: true }, { label: "Tidak", value: false }] },
    showHours: { type: "radio", options: [{ label: "Ya", value: true }, { label: "Tidak", value: false }] },
  },
  defaultProps: { showAddress: true, showPhone: true, showHours: true },
  render: ShopInfoRender,
};
