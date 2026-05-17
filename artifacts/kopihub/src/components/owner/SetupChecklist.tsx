import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Circle, ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type Step = {
  id: string;
  label: string;
  to: string;
  done: boolean;
  required: boolean;
};

/**
 * Widget "Setup wajib" untuk dashboard owner. Hilang otomatis kalau semua
 * langkah wajib selesai (atau di-dismiss user lewat localStorage flag).
 */
export function SetupChecklist({ shopId }: { shopId: string }) {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const dismissKey = `setup-checklist-dismissed:${shopId}`;
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(dismissKey) === "1";
  });

  useEffect(() => {
    if (!shopId) return;
    (async () => {
      const [shop, outlets, menu] = await Promise.all([
        supabase
          .from("shops")
          .select("name, logo_url, business_category_id, open_hours, payment_methods_enabled")
          .eq("id", shopId)
          .maybeSingle(),
        supabase.from("outlets").select("id", { count: "exact", head: true }).eq("shop_id", shopId),
        supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("shop_id", shopId).limit(1),
      ]);
      const s = (shop.data ?? {}) as {
        name?: string;
        logo_url?: string;
        business_category_id?: string;
        open_hours?: unknown;
        payment_methods_enabled?: unknown[];
      };
      const hasHours = Boolean(
        s.open_hours && typeof s.open_hours === "object" && Object.keys(s.open_hours as object).length > 0,
      );
      const hasPayment = Array.isArray(s.payment_methods_enabled) && s.payment_methods_enabled.length > 0;
      const list: Step[] = [
        { id: "shop", label: "Lengkapi info toko & logo", to: "/pos-app/settings", done: Boolean(s.name && s.logo_url), required: true },
        { id: "category", label: "Pilih kategori usaha", to: "/pos-app/settings", done: Boolean(s.business_category_id), required: true },
        { id: "outlet", label: "Tambahkan minimal 1 outlet", to: "/pos-app/outlets", done: (outlets.count ?? 0) > 0, required: true },
        { id: "hours", label: "Atur jam buka", to: "/pos-app/settings", done: hasHours, required: true },
        { id: "menu", label: "Tambahkan produk/menu pertama", to: "/pos-app/menu", done: (menu.count ?? 0) > 0, required: true },
        { id: "payment", label: "Aktifkan metode pembayaran", to: "/pos-app/settings", done: hasPayment, required: true },
      ];
      setSteps(list);
    })();
  }, [shopId]);

  if (!steps || dismissed) return null;

  const requiredSteps = steps.filter((s) => s.required);
  const doneRequired = requiredSteps.filter((s) => s.done).length;
  const allRequiredDone = doneRequired === requiredSteps.length;
  if (allRequiredDone) return null;

  const pct = Math.round((doneRequired / requiredSteps.length) * 100);

  return (
    <div className="mb-6 rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold">Setup toko Anda</h2>
            <p className="text-xs text-muted-foreground">
              {doneRequired} dari {requiredSteps.length} langkah wajib selesai · {pct}%
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            localStorage.setItem(dismissKey, "1");
            setDismissed(true);
          }}
          aria-label="Sembunyikan"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>

      <ul className="space-y-1.5">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              to={step.to}
              className="group flex items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-muted/50"
            >
              <span className="flex items-center gap-2.5">
                {step.done ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={step.done ? "text-muted-foreground line-through" : ""}>
                  {step.label}
                  {!step.required && <span className="ml-1.5 text-xs text-muted-foreground">(opsional)</span>}
                </span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>

      {allRequiredDone && (
        <Button asChild size="sm" className="mt-4 w-full">
          <Link to="/pos-app/pos">Mulai transaksi pertama</Link>
        </Button>
      )}
    </div>
  );
}
