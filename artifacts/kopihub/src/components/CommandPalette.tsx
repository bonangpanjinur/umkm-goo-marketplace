import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search, Store, ShoppingBag, Users, LayoutDashboard, Settings,
  FileText, Banknote, BarChart3, ShieldCheck, Megaphone, ScrollText,
  Package, Globe, TicketPercent, AlertOctagon, Palette, Flag,
  Calculator, GitCompare, Mail, Blocks, Loader2, ArrowRight,
  UtensilsCrossed, Layers, Tag, Download
} from "lucide-react";

type CmdItem = {
  id: string;
  label: string;
  description?: string;
  icon: React.FC<{ className?: string }>;
  action: () => void;
  category: string;
  badge?: string;
};

export function CommandPalette({ open, onClose, role }: { open: boolean; onClose: () => void; role: "admin" | "owner" }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigate = (useNavigate as any)();
  const [query, setQuery] = useState("");
  const [shopResults, setShopResults] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [productResults, setProductResults] = useState<{ id: string; name: string; shop_id: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Navigation items for admin
  const adminItems: CmdItem[] = [
    { id: "admin-dashboard", label: "Dashboard Admin", icon: LayoutDashboard, action: () => go("/admin"), category: "Admin" },
    { id: "admin-shops", label: "Manajemen Toko", icon: Store, action: () => go("/admin/shops"), category: "Admin" },
    { id: "admin-kyc", label: "Antrian KYC", icon: ShieldCheck, action: () => go("/admin/kyc"), category: "Admin" },
    { id: "admin-invoices", label: "Tagihan", icon: FileText, action: () => go("/admin/invoices"), category: "Admin" },
    { id: "admin-withdrawals", label: "Penarikan Dana", icon: Banknote, action: () => go("/admin/withdrawals"), category: "Admin" },
    { id: "admin-analytics", label: "Analitik", icon: BarChart3, action: () => go("/admin/analytics"), category: "Admin" },
    { id: "admin-broadcast", label: "Broadcast Notifikasi", icon: Megaphone, action: () => go("/admin/broadcast"), category: "Admin" },
    { id: "admin-audit", label: "Audit Log", icon: ScrollText, action: () => go("/admin/audit"), category: "Admin" },
    { id: "admin-plans", label: "Paket", icon: Package, action: () => go("/admin/plans"), category: "Admin" },
    { id: "admin-catalog", label: "Katalog Fitur & Tema", icon: Blocks, action: () => go("/admin/catalog"), category: "Admin" },
    { id: "admin-domains", label: "Domain Kustom", icon: Globe, action: () => go("/admin/domains"), category: "Admin" },
    { id: "admin-vouchers", label: "Voucher Platform", icon: TicketPercent, action: () => go("/admin/vouchers"), category: "Admin" },
    { id: "admin-disputes", label: "Sengketa", icon: AlertOctagon, action: () => go("/admin/disputes"), category: "Admin" },
    { id: "admin-branding", label: "Branding Platform", icon: Palette, action: () => go("/admin/branding"), category: "Admin" },
    { id: "admin-commission", label: "Konfigurasi Komisi", icon: BarChart3, action: () => go("/admin/commission"), category: "Admin" },
    { id: "admin-payment-config", label: "Payment Gateway", icon: Banknote, action: () => go("/admin/payment-config"), category: "Admin" },
    { id: "admin-feature-flags", label: "Feature Flags", icon: Flag, action: () => go("/admin/feature-flags"), category: "Admin", badge: "Baru" },
    { id: "admin-fee-simulator", label: "Fee Simulator", icon: Calculator, action: () => go("/admin/fee-simulator"), category: "Admin", badge: "Baru" },
    { id: "admin-reconciliation", label: "Rekonsiliasi Gateway", icon: GitCompare, action: () => go("/admin/reconciliation"), category: "Admin", badge: "Baru" },
    { id: "admin-notification-templates", label: "Template Notifikasi", icon: Mail, action: () => go("/admin/notification-templates"), category: "Admin", badge: "Baru" },
    { id: "admin-impersonation", label: "Impersonation Toko", icon: Users, action: () => go("/admin/impersonation"), category: "Admin" },
    { id: "admin-auto-cancel", label: "Auto-cancel Pesanan", icon: Settings, action: () => go("/admin/auto-cancel"), category: "Admin" },
  ];

  const ownerItems: CmdItem[] = [
    { id: "owner-dashboard", label: "Dashboard Toko", icon: LayoutDashboard, action: () => go("/pos-app"), category: "Toko" },
    { id: "owner-orders", label: "Semua Pesanan", icon: ShoppingBag, action: () => go("/pos-app/orders"), category: "Toko" },
    { id: "owner-menu", label: "Menu / Produk", icon: UtensilsCrossed, action: () => go("/pos-app/menu"), category: "Katalog" },
    { id: "owner-stok", label: "Stok Terpadu", icon: Layers, action: () => go("/pos-app/stok"), category: "Katalog" },
    { id: "owner-variants", label: "Varian Produk", icon: Package, action: () => go("/pos-app/variants"), category: "Katalog" },
    { id: "owner-digital", label: "Produk Digital", icon: Download, action: () => go("/pos-app/digital"), category: "Katalog" },
    { id: "owner-atribut", label: "Atribut Produk", icon: Tag, action: () => go("/pos-app/atribut"), category: "Katalog" },
    { id: "owner-promos", label: "Promo & Voucher", icon: TicketPercent, action: () => go("/pos-app/promos"), category: "Pelanggan" },
    { id: "owner-promo-calendar", label: "Kalender Promo", icon: TicketPercent, action: () => go("/pos-app/promo-calendar"), category: "Pelanggan", badge: "Baru" },
    { id: "owner-keuangan", label: "Keuangan", icon: Banknote, action: () => go("/pos-app/keuangan"), category: "Keuangan" },
    { id: "owner-tarik", label: "Tarik Saldo", icon: Banknote, action: () => go("/pos-app/keuangan/tarik"), category: "Keuangan" },
    { id: "owner-reports", label: "Laporan Penjualan", icon: BarChart3, action: () => go("/pos-app/reports"), category: "Keuangan" },
    { id: "owner-kyc", label: "Verifikasi KTP", icon: ShieldCheck, action: () => go("/pos-app/kyc"), category: "Akun" },
    { id: "owner-settings", label: "Pengaturan Toko", icon: Settings, action: () => go("/pos-app/settings"), category: "Pengaturan" },
    { id: "owner-appearance", label: "Tampilan Toko", icon: Palette, action: () => go("/pos-app/appearance"), category: "Pengaturan" },
    { id: "owner-notifikasi", label: "Notifikasi", icon: Megaphone, action: () => go("/pos-app/notifikasi"), category: "Akun" },
    { id: "owner-booking", label: "Booking Jadwal", icon: Settings, action: () => go("/pos-app/booking"), category: "Tim" },
    { id: "owner-analytics", label: "Analitik Marketplace", icon: BarChart3, action: () => go("/pos-app/marketplace-analytics"), category: "Keuangan" },
  ];

  const baseItems = role === "admin" ? adminItems : ownerItems;

  function go(path: string) {
    navigate({ to: path as any });
    onClose();
  }

  const filtered = query.trim()
    ? baseItems.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase()) ||
        item.description?.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase())
      )
    : baseItems.slice(0, 8);

  // Dynamic search from DB
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setShopResults([]);
      setProductResults([]);
      return;
    }
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      setSearching(true);
      if (role === "admin") {
        const { data: shops } = await supabase
          .from("coffee_shops")
          .select("id, name, slug")
          .ilike("name", `%${query}%`)
          .limit(5);
        setShopResults(shops ?? []);
      } else {
        const { data: products } = await supabase
          .from("menu_items")
          .select("id, name, shop_id")
          .ilike("name", `%${query}%`)
          .limit(5);
        setProductResults(products ?? []);
      }
      setSearching(false);
    }, 250);
  }, [query, role]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Group filtered items by category
  const grouped: Record<string, CmdItem[]> = {};
  for (const item of filtered) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="p-0 gap-0 max-w-xl overflow-hidden" onKeyDown={handleKeyDown}>
        <div className="flex items-center gap-2 border-b px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari halaman, fitur, toko..."
            className="border-0 shadow-none focus-visible:ring-0 p-0 h-auto text-sm"
          />
          {searching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
          <kbd className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">ESC</kbd>
        </div>

        <div className="max-h-96 overflow-y-auto py-2">
          {/* Navigation items */}
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">{cat}</div>
              {items.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors text-left"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && <Badge variant="secondary" className="text-xs">{item.badge}</Badge>}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          ))}

          {/* DB search results */}
          {shopResults.length > 0 && (
            <div>
              <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Toko Ditemukan</div>
              {shopResults.map(s => (
                <button
                  key={s.id}
                  onClick={() => { navigate({ to: "/admin/shops/$id" as any, params: { id: s.id } }); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors text-left"
                >
                  <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1">{s.name}</span>
                  <span className="text-xs text-muted-foreground">{s.slug}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {productResults.length > 0 && (
            <div>
              <div className="px-4 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Produk Ditemukan</div>
              {productResults.map(p => (
                <button
                  key={p.id}
                  onClick={() => { navigate({ to: "/pos-app/menu" as any }); onClose(); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-muted transition-colors text-left"
                >
                  <UtensilsCrossed className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1">{p.name}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}

          {query.trim() && filtered.length === 0 && shopResults.length === 0 && productResults.length === 0 && !searching && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              Tidak ada hasil untuk "{query}"
            </div>
          )}
        </div>

        <div className="border-t px-4 py-2 flex items-center gap-4 text-xs text-muted-foreground">
          <span><kbd className="bg-muted px-1 rounded">↑↓</kbd> navigasi</span>
          <span><kbd className="bg-muted px-1 rounded">↵</kbd> pilih</span>
          <span><kbd className="bg-muted px-1 rounded">ESC</kbd> tutup</span>
          <span className="ml-auto">⌘K untuk buka kapan saja</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return { open, setOpen };
}
