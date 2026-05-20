import { Link, useRouterState } from "@tanstack/react-router";
import { Palette, LayoutDashboard, Sparkles, Code2, Lock } from "lucide-react";
import { useEntitlements } from "@/lib/use-entitlements";
import { cn } from "@/lib/utils";

type TabDef = {
  to: string;
  label: string;
  icon: typeof Palette;
  /** Feature key yang harus aktif. Kalau null = selalu boleh. */
  feature: string | null;
};

const TABS: (TabDef & { hint?: string })[] = [
  { to: "/pos-app/appearance",         label: "Tema",               icon: Palette,         feature: null,                hint: "Pilih tampilan instan (cepat & mudah)" },
  { to: "/pos-app/storefront-builder", label: "Section Storefront", icon: LayoutDashboard, feature: "storefront_builder", hint: "Atur urutan section di halaman toko" },
  { to: "/pos-app/website-builder",    label: "Website Builder",    icon: Sparkles,        feature: "website_builder",    hint: "Bangun halaman bebas drag-and-drop" },
  { to: "/pos-app/custom-css",         label: "Custom CSS",         icon: Code2,           feature: "custom_css",         hint: "Tambah CSS kustom (advanced)" },
];

export function TampilanTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { hasFeature, loading } = useEntitlements();

  return (
    <div className="border-b mb-6 -mx-6 px-6">
      <nav className="flex gap-1 overflow-x-auto" aria-label="Tampilan Toko">
        {TABS.map((t) => {
          const active = pathname === t.to || pathname.startsWith(t.to + "/");
          const locked = !loading && t.feature !== null && !hasFeature(t.feature);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
              {locked && <Lock className="h-3 w-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
