import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useStaffRole, isModuleAllowed } from "@/lib/use-staff";
import {
  Coffee,
  LayoutDashboard,
  ShoppingBag,
  ListOrdered,
  UtensilsCrossed,
  Tags,
  UserCheck,
  Package,
  ChefHat,
  Users,
  CalendarDays,
  Clock,
  Truck,
  Bike,
  Wallet,
  Bell,
  Navigation,
  BarChart3,
  Settings,
  LogOut,
  Loader2,
  Store,
  TicketPercent,
  Award,
  Menu as MenuIcon,
  Building2,
  FileText,
  CreditCard,
  Globe,
  ShieldCheck,
  Lock,
  Palette,
  Database,
  Printer,
  Banknote,
  ArrowDownToLine,
  ShoppingCart,
} from "lucide-react";
import { usePlan, useIsSuperAdmin } from "@/lib/use-plan";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { toast } from "sonner";
import { OwnerReminderBanner } from "@/components/owner-reminder-banner";
import { ErrorBoundary } from "@/components/error-boundary";
import { OutletProvider, useOutletContext } from "@/lib/outlet-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NotificationBell } from "@/components/NotificationBell";

export const Route = createFileRoute("/pos-app")({
  component: AppLayout,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean; proOnly?: boolean; hint?: string; aliases?: string[] };
type NavGroup = { id: string; label: string; items: NavItem[] };

const NAV_GROUPS: NavGroup[] = [
  {
    id: "dashboard",
    label: "Utama",
    items: [
      { to: "/pos-app", label: "Dashboard", icon: LayoutDashboard, exact: true },
      { to: "/pos-app/pos", label: "POS Kasir", icon: ShoppingBag },
    ],
  },
  {
    id: "orders",
    label: "Pesanan",
    items: [
      { to: "/pos-app/orders", label: "Semua Pesanan", icon: ListOrdered, hint: "Kasir, Web Toko, & Marketplace dalam satu halaman dengan tab kategori" },
      { to: "/pos-app/kds", label: "Kitchen (KDS)", icon: ChefHat },
    ],
  },
  {
    id: "catalog",
    label: "Katalog & Stok",
    items: [
      { to: "/pos-app/menu", label: "Menu", icon: UtensilsCrossed },
      { to: "/pos-app/categories", label: "Kategori", icon: Tags },
      { to: "/pos-app/inventory", label: "Inventori", icon: Package },
      { to: "/pos-app/recipes", label: "Resep", icon: ChefHat },
      { to: "/pos-app/suppliers", label: "Supplier", icon: Building2 },
      { to: "/pos-app/purchase-orders", label: "Purchase Order", icon: FileText },
    ],
  },
  {
    id: "team",
    label: "Tim",
    items: [
      { to: "/pos-app/employees", label: "Pegawai", icon: Users },
      { to: "/pos-app/schedule", label: "Jadwal", icon: CalendarDays },
      { to: "/pos-app/attendance", label: "Absensi", icon: Clock },
      { to: "/pos-app/shifts", label: "Shift Kasir", icon: Wallet },
    ],
  },
  {
    id: "delivery",
    label: "Pengiriman",
    items: [
      { to: "/pos-app/delivery", label: "Delivery", icon: Truck },
      { to: "/pos-app/couriers", label: "Kurir", icon: Bike },
      { to: "/pos-app/courier", label: "Pengantaran", icon: Navigation },
    ],
  },
  {
    id: "customers",
    label: "Pelanggan",
    items: [
      { to: "/pos-app/customers", label: "Pelanggan", icon: UserCheck },
      { to: "/pos-app/promos", label: "Promo", icon: TicketPercent },
      { to: "/pos-app/loyalty", label: "Loyalty", icon: Award },
      { to: "/pos-app/reviews", label: "Ulasan", icon: Award },
    ],
  },
  {
    id: "finance",
    label: "Keuangan & Laporan",
    items: [
      { to: "/pos-app/keuangan", label: "Keuangan", icon: Banknote },
      { to: "/pos-app/keuangan/tarik", label: "Tarik Saldo", icon: ArrowDownToLine },
      { to: "/pos-app/billing", label: "Plan & Tagihan", icon: CreditCard },
      { to: "/pos-app/reports", label: "Laporan Penjualan", icon: BarChart3 },
      { to: "/pos-app/reports/profit", label: "Profit & Margin", icon: BarChart3 },
      { to: "/pos-app/marketplace-analytics", label: "Analitik Marketplace", icon: BarChart3 },
    ],
  },
  {
    id: "settings",
    label: "Pengaturan Toko",
    items: [
      { to: "/pos-app/printers", label: "Printer", icon: Printer },
      { to: "/pos-app/appearance", label: "Tampilan Toko", icon: Palette },
      { to: "/pos-app/domain", label: "Domain Kustom", icon: Globe, proOnly: true },
      { to: "/pos-app/backup", label: "Backup Data", icon: Database },
      { to: "/pos-app/settings", label: "Pengaturan", icon: Settings },
    ],
  },
];



function AppLayout() {
  return (
    <OutletProvider>
      <AppLayoutInner />
    </OutletProvider>
  );
}

function AppLayoutInner() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isPro } = usePlan();
  const { isAdmin } = useIsSuperAdmin();
  const staff = useStaffRole();
  const [shop, setShop] = useState<{ name: string; logo_url: string | null; suspended_at?: string | null; suspended_reason?: string | null } | null>(null);
  const [checking, setChecking] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    (async () => {
      // Owner flow
      const { data } = await supabase
        .from("coffee_shops")
        .select("name, logo_url, suspended_at, suspended_reason")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (data) {
        setShop(data);
        setChecking(false);
        if (data.suspended_at && location.pathname !== "/pos-app/billing") {
          toast.error("Toko Anda dinonaktifkan oleh admin. Hubungi admin.");
          navigate({ to: "/pos-app/billing" });
        }
        return;
      }
      // Staff flow — find shop via staff_permissions
      if (staff.loading) return;
      if (staff.isStaff && staff.shopId) {
        const { data: s } = await supabase
          .from("coffee_shops")
          .select("name, logo_url, suspended_at, suspended_reason")
          .eq("id", staff.shopId)
          .maybeSingle();
        if (s) {
          setShop(s);
          setChecking(false);
          return;
        }
      }
      // Neither owner nor staff
      navigate({ to: "/onboarding" });
    })();
  }, [user, loading, navigate, location.pathname, staff.loading, staff.isStaff, staff.shopId]);

  // Filter nav for staff (per-item allowed modules)
  const visibleGroups = useMemo(() => {
    const allowed = (it: NavItem) =>
      staff.isOwner || !staff.isStaff ? true : isModuleAllowed(it.to, staff.allowedModules);
    return NAV_GROUPS
      .map((g) => ({ ...g, items: g.items.filter(allowed) }))
      .filter((g) => g.items.length > 0);
  }, [staff.isOwner, staff.isStaff, staff.allowedModules]);

  // Track which group is open; auto-open the group that contains the active route
  const activeGroupId = useMemo(() => {
    for (const g of visibleGroups) {
      if (g.items.some((it) => (it.exact ? location.pathname === it.to : location.pathname.startsWith(it.to)))) {
        return g.id;
      }
    }
    return visibleGroups[0]?.id ?? null;
  }, [visibleGroups, location.pathname]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  useEffect(() => {
    if (activeGroupId) setOpenGroups((p) => ({ ...p, [activeGroupId]: true }));
  }, [activeGroupId]);


  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Request notification permission once
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      // Defer prompting until user interacts; just leave permission as-is
    }
  }, []);

  if (loading || checking) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const SidebarBody = (
    <>
      <div className="flex h-14 items-center gap-2 px-4 border-b border-sidebar-border">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground overflow-hidden">
          {shop?.logo_url ? (
            <img src={shop.logo_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <Coffee className="h-4 w-4" />
          )}
        </div>
        <span className="text-sm font-semibold">KopiHub</span>
      </div>

      <OutletSwitcher shopName={shop?.name} />

      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {visibleGroups.map((group) => {
          const isOpen = openGroups[group.id] ?? group.id === activeGroupId;
          return (
            <div key={group.id} className="mb-1">
              <button
                type="button"
                onClick={() => setOpenGroups((p) => ({ ...p, [group.id]: !isOpen }))}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground/80 transition-colors"
              >
                <span>{group.label}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "" : "-rotate-90"}`} />
              </button>
              {isOpen && (
                <div className="space-y-0.5 mt-0.5">
                  {group.items.map((item) => {
                    const active = item.exact
                      ? location.pathname === item.to
                      : location.pathname.startsWith(item.to);
                    const Icon = item.icon;
                    const locked = item.proOnly && !isPro;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        title={item.hint}
                        className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors ${
                          active
                            ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.proOnly && (
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${isPro ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                            {locked ? <Lock className="h-3 w-3 inline" /> : "PRO"}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {isAdmin && (
          <Link
            to="/admin"
            className="mt-3 flex items-center gap-2.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-2 text-sm font-medium text-amber-700 hover:bg-amber-500/20"
          >
            <ShieldCheck className="h-4 w-4" /> Super Admin
          </Link>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 px-1 text-xs text-sidebar-foreground/60 truncate">
          {user?.email}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={async () => {
            await signOut();
            toast.success("Anda keluar");
            navigate({ to: "/" });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" /> Keluar
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col border-r border-sidebar-border bg-sidebar">
        {SidebarBody}
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        {/* Mobile topbar */}
        <header className="lg:hidden sticky top-0 z-20 flex h-12 items-center gap-2 border-b border-border bg-background/95 backdrop-blur px-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MenuIcon className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 bg-sidebar flex flex-col">
              {SidebarBody}
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-primary text-primary-foreground overflow-hidden shrink-0">
              {shop?.logo_url ? (
                <img src={shop.logo_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <Coffee className="h-3.5 w-3.5" />
              )}
            </div>
            <span className="truncate text-sm font-semibold">{shop?.name ?? "KopiHub"}</span>
          </div>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          <ErrorBoundary>
            <OwnerReminderBanner />
          </ErrorBoundary>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function OutletSwitcher({ shopName }: { shopName?: string }) {
  const { outlets, current, setCurrent } = useOutletContext();
  if (outlets.length <= 1) {
    return (
      <div className="border-b border-sidebar-border px-3 py-3">
        <div className="flex items-center gap-2 rounded-md bg-sidebar-accent/50 px-2.5 py-2">
          <Store className="h-4 w-4 text-sidebar-accent-foreground shrink-0" />
          <div className="min-w-0">
            <div className="text-xs text-sidebar-foreground/60">Toko aktif</div>
            <div className="truncate text-sm font-medium text-sidebar-foreground">{shopName}</div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="border-b border-sidebar-border px-3 py-3 space-y-1.5">
      <div className="text-xs text-sidebar-foreground/60 px-1">Outlet</div>
      <Select value={current?.id ?? ""} onValueChange={(v) => { const o = outlets.find((x) => x.id === v); if (o) setCurrent(o); }}>
        <SelectTrigger className="h-8 text-xs bg-sidebar-accent/50 border-sidebar-border">
          <SelectValue placeholder="Pilih outlet" />
        </SelectTrigger>
        <SelectContent>
          {outlets.map((o) => (
            <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
