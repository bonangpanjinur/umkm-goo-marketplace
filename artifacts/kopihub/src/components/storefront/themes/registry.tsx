import { lazy, Suspense, type ComponentType } from "react";
import type { ThemeHomeProps } from "./types";

const ClassicHome = lazy(() => import("./classic/Home"));
const MinimalHome = lazy(() => import("./minimal/Home"));
const UmrohHome = lazy(() => import("./umroh/Home"));
const SalesProHome = lazy(() => import("./sales-pro/Home"));
const KulinerWarmHome = lazy(() => import("./kuliner-warm/Home"));
const RetailBoldHome = lazy(() => import("./retail-bold/Home"));
const ServiceCleanHome = lazy(() => import("./service-clean/Home"));
const RentalDriveHome = lazy(() => import("./rental-drive/Home"));
const EduBrightHome = lazy(() => import("./edu-bright/Home"));
const BeautySoftHome = lazy(() => import("./beauty-soft/Home"));
const MedicTrustHome = lazy(() => import("./medic-trust/Home"));
const StudioMonoHome = lazy(() => import("./studio-mono/Home"));
const CraftPaperHome = lazy(() => import("./craft-paper/Home"));

const HOMES: Record<string, ComponentType<ThemeHomeProps>> = {
  classic: ClassicHome,
  minimal: MinimalHome,
  umroh: UmrohHome,
  "sales-pro": SalesProHome,
  "kuliner-warm": KulinerWarmHome,
  "retail-bold": RetailBoldHome,
  "service-clean": ServiceCleanHome,
  "rental-drive": RentalDriveHome,
  "edu-bright": EduBrightHome,
  "beauty-soft": BeautySoftHome,
  "medic-trust": MedicTrustHome,
  "studio-mono": StudioMonoHome,
  "craft-paper": CraftPaperHome,
  "dark-luxe": ClassicHome,
  vibrant: ClassicHome,
};

export function ThemedHome({ themeKey, ...props }: ThemeHomeProps & { themeKey: string }) {
  const Comp = HOMES[themeKey] ?? ClassicHome;
  return (
    <Suspense fallback={<p className="text-muted-foreground text-sm">Memuat tema…</p>}>
      <Comp {...props} />
    </Suspense>
  );
}
