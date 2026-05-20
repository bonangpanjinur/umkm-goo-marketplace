import { createFileRoute, Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useIsSuperAdmin } from "@/lib/use-plan";
import { Loader2, ShieldCheck, LayoutDashboard, Store, FileText, Package, Globe, Settings, ArrowLeft, Activity, Blocks, Megaphone, ScrollText, Menu as MenuIcon, Banknote, Ticket, AlertOctagon, BarChart3, BadgeCheck, CreditCard, Percent, Palette, Clock, UserCog, Flag, Calculator, GitCompare, Mail, Search, Image, Tv2, Users, ShieldAlert, TrendingUp, TrendingDown, FileSpreadsheet, ShieldX, Bell, SearchX, Tags, Sparkles, Trophy, FlaskConical, Link2, Zap, Receipt, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CommandPalette, useCommandPalette } from "@/components/CommandPalette";
import { ErrorBoundary } from "@/components/error-boundary";
import { useAdminPendingAdCount } from "@/hooks/useAdNotifications";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
type NavGroup = { id: string; label: string; items: NavItem[] };

const PINNED: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/analytics", label: "Analitik", icon: BarChart3 },
];

const GROUPS: NavGroup[] = [
  {
    id: "shops",
    label: "Toko & Verifikasi",
    items: [
      { to: "/admin/shops", label: "Toko", icon: Store },
      { to: "/admin/kyc", label: "Verifikasi KYC", icon: BadgeCheck },
      { to: "/admin/domains", label: "Domain", icon: Globe },
      { to: "/admin/moderation", label: "Moderasi Konten", icon: ShieldAlert },
      { to: "/admin/health-score", label: "Health Score Toko", icon: Activity },
      { to: "/admin/merchant-tiers", label: "Program Tier Merchant", icon: Trophy },
    ],
  },
  {
    id: "billing",
    label: "Keuangan & Tagihan",
    items: [
      { to: "/admin/invoices", label: "Tagihan", icon: FileText },
      { to: "/admin/withdrawals", label: "Penarikan", icon: Banknote },
      { to: "/admin/platform-billing", label: "Billing Paket Platform", icon: Receipt },
      { to: "/admin/payment-config", label: "Payment Gateway", icon: CreditCard },
      { to: "/admin/reconciliation", label: "Rekonsiliasi Gateway", icon: GitCompare },
      { to: "/admin/financial-report", label: "Laporan Keuangan", icon: FileSpreadsheet },
      { to: "/admin/tax-report", label: "Laporan Pajak PPh/PPN", icon: FileSpreadsheet },
      { to: "/admin/payout-scheduler", label: "Payout Scheduler", icon: Zap },
      { to: "/admin/revenue", label: "Revenue Intelligence", icon: TrendingUp },
      { to: "/admin/revenue-leakage", label: "Revenue Leakage", icon: SearchX },
      { to: "/admin/churn", label: "Churn & Retensi", icon: TrendingDown },
      { to: "/admin/cohort-analytics", label: "Cohort & LTV Analytics", icon: TrendingUp },
      { to: "/admin/category-revenue", label: "Pendapatan per Kategori", icon: BarChart3 },
    ],
  },
  {
    id: "plans",
    label: "Paket & Komisi",
    items: [
      { to: "/admin/plans", label: "Paket Berlangganan", icon: Package },
      { to: "/admin/commission", label: "Konfigurasi Komisi", icon: Percent },
      { to: "/admin/fee-simulator", label: "Fee Simulator", icon: Calculator },
      { to: "/admin/auto-renewal", label: "Notif Renewal Otomatis", icon: Bell },
      { to: "/admin/expiry-reminders", label: "Reminder Paket Habis", icon: Bell },
      { to: "/admin/shop-reminder-overrides", label: "Override Reminder per Toko", icon: Bell },
    ],
  },
  {
    id: "marketing",
    label: "Pemasaran & Konten",
    items: [
      { to: "/admin/vouchers", label: "Voucher", icon: Ticket },
      { to: "/admin/broadcast", label: "Broadcast", icon: Megaphone },
      { to: "/admin/broadcast-buyers", label: "Broadcast Pembeli", icon: Megaphone },
      { to: "/admin/banners", label: "Banner Carousel", icon: Image },
      { to: "/admin/ads", label: "Kelola Iklan", icon: Tv2 },
      { to: "/admin/branding", label: "Branding Platform", icon: Palette },
      { to: "/admin/notification-templates", label: "Template Notifikasi", icon: Mail },
      { to: "/admin/affiliate", label: "Affiliate & Partner", icon: Link2 },
    ],
  },
  {
    id: "users",
    label: "Pengguna & Pembeli",
    items: [
      { to: "/admin/users", label: "Pengguna Pembeli", icon: Users },
      { to: "/admin/buyer-actions", label: "Manajemen Pembeli", icon: Users },
      { to: "/admin/churn-reengagement", label: "Churn Re-engagement", icon: TrendingDown },
      { to: "/admin/impersonation", label: "Impersonation", icon: UserCog },
      { to: "/admin/multi-admin", label: "Multi-Admin & Role", icon: Users },
    ],
  },
  {
    id: "ops",
    label: "Operasional",
    items: [
      { to: "/admin/disputes", label: "Sengketa", icon: AlertOctagon },
      { to: "/admin/catalog", label: "Katalog", icon: Blocks },
      { to: "/admin/categories", label: "Kategori Usaha", icon: Tags },
      { to: "/admin/booking-config", label: "Konfigurasi Booking", icon: Clock },
      { to: "/admin/auto-cancel", label: "Auto-cancel", icon: Clock },
      { to: "/admin/onboarding-automation", label: "Onboarding Otomatis", icon: Mail },
      { to: "/admin/sla-monitor", label: "SLA Monitor", icon: Activity },
      { to: "/admin/push-config", label: "Push Notification", icon: Bell },
    ],
  },
  {
    id: "security",
    label: "Keamanan & Fraud",
    items: [
      { to: "/admin/fraud", label: "Deteksi Fraud", icon: ShieldX },
      { to: "/admin/fraud-scoring", label: "Fraud ML Scoring", icon: ShieldAlert },
      { to: "/admin/gdpr-tools", label: "GDPR / Data Export", icon: ShieldCheck },
      { to: "/admin/audit", label: "Audit Log", icon: ScrollText },
      { to: "/admin/activity", label: "Aktivitas", icon: Activity },
    ],
  },
  {
    id: "system",
    label: "Sistem & Konfigurasi",
    items: [
      { to: "/admin/settings", label: "Pengaturan", icon: Settings },
      { to: "/admin/feature-flags", label: "Feature Flags", icon: Flag },
      { to: "/admin/ai-settings", label: "Pengaturan AI", icon: Sparkles },
      { to: "/admin/sandbox", label: "Sandbox & Demo Mode", icon: FlaskConical },
    ],
  },
];

function AdminLayout() {
  const { user, loading } = useAuth();
  const { isAdmin, loading: roleLoading } = useIsSuperAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { open: cmdOpen, setOpen: setCmdOpen } = useCommandPalette();
  const pendingAdCount = useAdminPendingAdCount();

  useEffect(() => {
    if (loading || roleLoading) return;
    if (!user) { navigate({ to: "/login" }); return; }
    if (!isAdmin) { navigate({ to: "/pos-app" }); return; }
    setReady(true);
  }, [user, loading, isAdmin, roleLoading, navigate]);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const isItemActive = (item: NavItem) =>
    item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);

  const renderItem = (item: NavItem) => {
    const active = isItemActive(item);
    const Icon = item.icon;
    const badge = item.to === "/admin/ads" && pendingAdCount > 0 ? pendingAdCount : 0;
    return (
      <Link key={item.to} to={item.to}
        className={`flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${active ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}>
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{item.label}</span>
        {badge > 0 && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </Link>
    );
  };

  const SidebarBody = (
    <>
      <div className="flex h-14 items-center gap-2 px-4 border-b border-sidebar-border">
        <ShieldCheck className="h-5 w-5 text-amber-500" />
        <span className="text-sm font-semibold">Super Admin</span>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        <div className="space-y-0.5">
          {PINNED.map(renderItem)}
        </div>
        <div className="my-2 border-t border-sidebar-border/60" />
        {GROUPS.map((group) => {
          const hasActive = group.items.some(isItemActive);
          return (
            <details
              key={group.id}
              open={hasActive}
              className="group [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground">
                <ChevronDown className="h-3 w-3 shrink-0 transition-transform duration-150 -rotate-90 group-open:rotate-0" />
                <span className="flex-1 truncate">{group.label}</span>
                {hasActive && <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary" />}
              </summary>
              <div className="mt-0.5 ml-1.5 space-y-0.5 border-l border-sidebar-border/50 pl-2">
                {group.items.map(renderItem)}
              </div>
            </details>
          );
        })}
      </nav>
      <div className="border-t border-sidebar-border p-3">
        <Link to="/pos-app" className="flex items-center gap-2 text-sm text-sidebar-foreground/80 hover:text-sidebar-foreground">
          <ArrowLeft className="h-4 w-4" /> Kembali ke App
        </Link>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-sidebar-border bg-sidebar">
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
            <SheetContent side="left" className="w-72 p-0 bg-sidebar flex flex-col">
              {SidebarBody}
            </SheetContent>
          </Sheet>
          <ShieldCheck className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-semibold">Super Admin</span>
          <Button variant="ghost" size="sm" className="ml-auto gap-1.5 text-xs text-muted-foreground" onClick={() => setCmdOpen(true)}>
            <Search className="h-3.5 w-3.5" /> Cari <kbd className="bg-muted px-1 rounded text-[10px]">⌘K</kbd>
          </Button>
        </header>

        <main className="flex-1 overflow-auto"><ErrorBoundary withFallback><Outlet /></ErrorBoundary></main>
      </div>
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} role="admin" />
    </div>
  );
}
