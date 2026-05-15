import { createFileRoute, Outlet, Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useRef } from "react";
import { useLowStockIngredients } from "@/hooks/use-low-stock";
import { useOwnerPaymentPendingCount } from "@/hooks/useAdNotifications";
import { useUnansweredQACount } from "@/hooks/use-unanswered-qa";
import { useRestockPendingCount } from "@/hooks/use-restock-pending-count";
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
  Ticket,
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
  SlidersHorizontal,
  Upload,
  Layers,
  Download,
  Tag,
  CalendarCheck,
  Megaphone,
  QrCode,
  BellRing,
  MessageCircle,
  HelpCircle,
  Star,
  Zap,
  Hash,
  ClipboardCheck,
  GraduationCap,
  ScrollText,
  History,
  Target,
  ImageIcon,
  Stethoscope,
  Scissors,
  Receipt,
  BadgeCheck,
  Camera,
  ClipboardList,
  FolderOpen,
  Sparkles,
  Plane,
  Quote,
  Inbox,
  Briefcase,
  Info,
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
import { CommandPalette, useCommandPalette } from "@/components/CommandPalette";

export const Route = createFileRoute("/pos-app")({
  component: AppLayout,
});

type NavItem = {
  to: string; label: string; icon: typeof LayoutDashboard;
  exact?: boolean; proOnly?: boolean; hint?: string; aliases?: string[];
  /** If set, only show this item when shop's category type is in this list */
  onlyFor?: string[];
  /** If set, only show for these business sub-types (sales-pro: 'umroh' | 'sales') */
  subtypeOnly?: ("umroh" | "sales")[];
};
type NavGroup = { id: string; label: string; items: NavItem[] };

// ─── Map business_categories.slug → simplified type ─────────────────────────
function deriveCategoryType(slug: string | null | undefined): string {
  if (!slug) return "general";
  const s = slug.toLowerCase();
  if (s === "sales-jasa-profesional") return "sales-pro";
  if (/fnb|kuliner|makanan|minuman|cafe|kafe|restoran|bakery|food|kopi|warung|catering|beverage/.test(s)) return "fnb";
  if (/fashion|pakaian|clothing|busana|sepatu|aksesoris/.test(s)) return "fashion";
  if (/digital|software|konten|content|saas|aplikasi|pendidikan/.test(s)) return "digital";
  if (/jasa|laundry|salon|bengkel|beauty|kecantikan|otomotif/.test(s)) return "services";
  if (/kerajinan|handmade|craft|seni|dekorasi|art/.test(s)) return "craft";
  if (/elektronik|gadget|komputer|tech/.test(s)) return "electronics";
  return "general";
}

// Categories that have POS / KDS / Stok / Inventori / Resep / Shift Kasir
const HAS_POS = ["fnb", "fashion", "craft", "electronics", "general"];

// Category type groups for onlyFor references
const FNB         = ["fnb"];
const FNB_SVC     = ["fnb", "services"];
const DIGITAL_SVC = ["digital", "services"];
const SVC         = ["services"];
const SVC_CRAFT   = ["services", "craft"];
const PHYSICAL    = ["fnb", "fashion", "craft", "electronics", "general"];
const FASHION     = ["fashion"];
const FASHION_SVC = ["fashion", "services"];
const CRAFT       = ["craft"];

const NAV_GROUPS: NavGroup[] = [
  {
    id: "dashboard",
    label: "Utama",
    items: [
      { to: "/pos-app",     label: "Dashboard",  icon: LayoutDashboard, exact: true },
      { to: "/pos-app/pos", label: "POS Kasir",  icon: ShoppingBag, onlyFor: HAS_POS },
    ],
  },
  {
    id: "sales_pro",
    label: "Sales / Umroh",
    items: [
      { to: "/pos-app/umroh-packages",   label: "Paket Umroh",       icon: Plane,     onlyFor: ["sales-pro"], subtypeOnly: ["umroh"] },
      { to: "/pos-app/umroh-facilities", label: "Fasilitas",         icon: Star,      onlyFor: ["sales-pro"], subtypeOnly: ["umroh"] },
      { to: "/pos-app/umroh-faq",        label: "FAQ & Dokumen",     icon: HelpCircle,onlyFor: ["sales-pro"], subtypeOnly: ["umroh"] },
      { to: "/pos-app/sales-offerings",  label: "Katalog Layanan",   icon: Briefcase, onlyFor: ["sales-pro"], subtypeOnly: ["sales"] },
      { to: "/pos-app/flyers",           label: "Galeri Flyer",      icon: ImageIcon, onlyFor: ["sales-pro"] },
      { to: "/pos-app/testimonials",     label: "Testimoni",         icon: Quote,     onlyFor: ["sales-pro"] },
      { to: "/pos-app/leads",            label: "Lead / CRM",        icon: Inbox,     onlyFor: ["sales-pro"] },
      { to: "/pos-app/about-page",       label: "Halaman Tentang",   icon: Info,      onlyFor: ["sales-pro"] },
  {
    id: "orders",
    label: "Pesanan",
    items: [
      { to: "/pos-app/orders", label: "Semua Pesanan", icon: ListOrdered, hint: "Kasir, Web Toko, & Marketplace dalam satu halaman dengan tab kategori", aliases: ["/pos-app/online-orders", "/pos-app/marketplace-orders"] },
      { to: "/pos-app/kds",          label: "Kitchen (KDS)",       icon: ChefHat, onlyFor: FNB },
      { to: "/pos-app/kitchen-load", label: "Beban Dapur (KLM)",  icon: Stethoscope, hint: "Pantau estimasi waktu tunggu & beban per slot waktu secara realtime", onlyFor: FNB },
    ],
  },
  {
    id: "catalog",
    label: "Katalog & Stok",
    items: [
      { to: "/pos-app/menu",           label: "Menu / Produk",   icon: UtensilsCrossed },
      { to: "/pos-app/variants",       label: "Varian Produk",   icon: SlidersHorizontal },
      { to: "/pos-app/categories",     label: "Kategori",        icon: Tags },
      { to: "/pos-app/digital",          label: "Produk Digital",  icon: Download, onlyFor: DIGITAL_SVC },
      { to: "/pos-app/digital-licenses", label: "Lisensi Digital", icon: ShieldCheck, hint: "Lacak unduhan pembeli & kelola lisensi per produk digital — anti-sharing", onlyFor: DIGITAL_SVC },
      { to: "/pos-app/digital-version",  label: "Update Versi",    icon: History, hint: "Rilis versi baru produk digital — pembeli lama dapat notifikasi otomatis", onlyFor: DIGITAL_SVC },
      { to: "/pos-app/kursus",           label: "Kursus Online",   icon: GraduationCap, hint: "Kelola kursus video online: modul, pelajaran, dan pantau progress pembeli", onlyFor: DIGITAL_SVC },
      { to: "/pos-app/atribut",        label: "Atribut Produk",  icon: Tag },
      { to: "/pos-app/stok",           label: "Stok Terpadu",    icon: Layers },
      { to: "/pos-app/inventory",      label: "Inventori",       icon: Package },
      { to: "/pos-app/bundles",          label: "Bundle / Paket",       icon: Layers },
      { to: "/pos-app/combo-builder",    label: "Paket & Combo F&B",    icon: UtensilsCrossed, hint: "Buat set hemat dari beberapa menu dengan harga bundel & diskon otomatis", onlyFor: FNB },
      { to: "/pos-app/recipes",          label: "Resep",                icon: ChefHat, onlyFor: FNB },
      { to: "/pos-app/size-guide",       label: "Panduan Ukuran",       icon: SlidersHorizontal, hint: "Kalkulator ukuran interaktif: Tinggi 165cm → pilih M — tampil di halaman produk", onlyFor: FASHION },
      { to: "/pos-app/lookbook",         label: "Lookbook / Foto Model",icon: ImageIcon, hint: "Upload foto model pakai produkmu — tampil di halaman toko & produk", onlyFor: FASHION },
      { to: "/pos-app/skin-quiz",        label: "Quiz Rekomendasi Produk", icon: HelpCircle, hint: "Quiz jenis kulit → rekomendasi produk otomatis untuk pembeli", onlyFor: FASHION_SVC },
      { to: "/pos-app/verified-claims",  label: "Klaim Terverifikasi",  icon: BadgeCheck, hint: "Label klaim uji klinis: 'Dermatologically Tested', 'Hypoallergenic', dll", onlyFor: FASHION_SVC },
      { to: "/pos-app/limited-editions", label: "Edisi Terbatas",       icon: Zap, hint: "Produk limited dengan counter stok visible — ciptakan urgensi pembelian", onlyFor: [...FASHION, ...CRAFT] },
      { to: "/pos-app/wip-gallery",      label: "Galeri Proses Buat",   icon: Layers, hint: "Tampilkan proses pembuatan karya — bangun kepercayaan pembeli", onlyFor: CRAFT },
      { to: "/pos-app/certificates",     label: "Sertifikat Keaslian",  icon: Award, hint: "Certificate of Authenticity digital — dikirim otomatis ke pembeli", onlyFor: CRAFT },
      { to: "/pos-app/suppliers",        label: "Supplier",             icon: Building2 },
      { to: "/pos-app/purchase-orders",  label: "Purchase Order",       icon: FileText },
    ],
  },
  {
    id: "team",
    label: "Tim",
    items: [
      { to: "/pos-app/employees",  label: "Pegawai",       icon: Users },
      { to: "/pos-app/schedule",   label: "Jadwal",        icon: CalendarDays },
      { to: "/pos-app/booking",    label: "Booking Jadwal",icon: CalendarCheck, onlyFor: FNB_SVC },
      { to: "/pos-app/attendance", label: "Absensi",       icon: Clock },
      { to: "/pos-app/shifts",     label: "Shift Kasir",   icon: Wallet },
    ],
  },
  {
    id: "delivery",
    label: "Pengiriman",
    items: [
      { to: "/pos-app/delivery", label: "Delivery",     icon: Truck },
      { to: "/pos-app/couriers", label: "Kurir",        icon: Bike },
      { to: "/pos-app/courier",  label: "Pengantaran",  icon: Navigation },
    ],
  },
  {
    id: "customers",
    label: "Pelanggan",
    items: [
      { to: "/pos-app/customers",          label: "Pelanggan",         icon: UserCheck },
      { to: "/pos-app/inbox",              label: "Inbox Chat",        icon: MessageCircle },
      { to: "/pos-app/promos",             label: "Promo",             icon: TicketPercent },
      { to: "/pos-app/vouchers",           label: "Voucher Toko",      icon: Ticket },
      { to: "/pos-app/promo-calendar",     label: "Kalender Promo",    icon: CalendarDays },
      { to: "/pos-app/loyalty",            label: "Loyalty",           icon: Award },
      { to: "/pos-app/membership",         label: "Membership",        icon: Award, hint: "Tier berlangganan dengan diskon otomatis & perks" },
      { to: "/pos-app/wallet-config",      label: "Top-up Saldo",      icon: Award, hint: "Atur preset top-up saldo dengan bonus" },
      { to: "/pos-app/wallet-approvals",   label: "Approval Top-up",   icon: Award, hint: "Setujui pembayaran top-up pelanggan" },
      { to: "/pos-app/restock-notify",       label: "Notif Stok Kembali", icon: BellRing, hint: "Pelanggan yang menunggu notifikasi saat produk stok habis tersedia kembali — blast WhatsApp 1 klik" },
      { to: "/pos-app/broadcast-wa",         label: "Broadcast WhatsApp", icon: MessageCircle, hint: "Kirim pesan WA serentak ke segmen pelanggan: Churn Risk, VIP, Pelanggan Baru" },
      { to: "/pos-app/email-marketing",    label: "Email Marketing",   icon: Bell, proOnly: true },
      { to: "/pos-app/wishlist-analytics",    label: "Analitik Wishlist",  icon: Award },
      { to: "/pos-app/customer-analytics",   label: "Analitik Pembeli",   icon: BarChart3, hint: "Segmentasi: Pelanggan Setia, Perlu Diaktivasi, Churn Risk, Tidak Responsif" },
      { to: "/pos-app/reviews",              label: "Ulasan Pembeli",     icon: Award, hint: "Balas ulasan, analisis sentimen, moderasi konten tidak relevan" },
      { to: "/pos-app/qa",                 label: "Q&A Produk",        icon: HelpCircle, hint: "Jawab pertanyaan calon pembeli dari halaman produk" },
      { to: "/pos-app/iklan",              label: "Iklan & Promosi",   icon: Megaphone },
      { to: "/pos-app/antrian",            label: "Antrean Digital",   icon: Hash, hint: "Nomor antrian otomatis + estimasi tunggu — cocok untuk klinik, salon, dan loket", onlyFor: FNB_SVC },
      { to: "/pos-app/waitlist",           label: "Antrian Waitlist",  icon: ListOrdered, hint: "Kelola daftar tunggu pelanggan untuk slot booking penuh", onlyFor: FNB_SVC },
      { to: "/pos-app/rental-availability",label: "Ketersediaan Rental",icon: CalendarDays, hint: "Kelola armada unit rental dan cek ketersediaan berdasarkan tanggal", onlyFor: SVC },
      { to: "/pos-app/rental-checklist",   label: "Checklist Kondisi",  icon: ClipboardCheck, hint: "Dokumentasi kondisi unit sebelum & sesudah sewa + tanda tangan digital", onlyFor: SVC },
      { to: "/pos-app/rental-tnc",            label: "Syarat & Ketentuan",  icon: ScrollText, hint: "Kelola T&C sewa: deposit %, denda keterlambatan, dan teks syarat penuh", onlyFor: SVC },
      { to: "/pos-app/rental-deposit-config", label: "Konfigurasi Deposit", icon: Banknote, hint: "Atur deposit otomatis per unit rental — harga × durasi × % — RT-04", onlyFor: SVC },
      { to: "/pos-app/rental-extend",         label: "Perpanjangan Sewa",   icon: CalendarDays, hint: "Kelola permintaan perpanjangan sewa mandiri dari penyewa — RT-05", onlyFor: SVC },
      { to: "/pos-app/rental-fines",          label: "Denda Keterlambatan", icon: Clock, hint: "Hitung & tagih denda keterlambatan pengembalian unit rental — RT-07", onlyFor: SVC },
      { to: "/pos-app/rental-unit-ready",     label: "Notif Unit Siap",     icon: BellRing, hint: "Kirim notifikasi WhatsApp ke penyewa bahwa unit sudah siap diambil — RT-10", onlyFor: SVC },
      { to: "/pos-app/anamnesis",             label: "Anamnesis Digital",   icon: FileText, hint: "Form keluhan & riwayat medis pre-konsultasi — diisi oleh pasien — KL-02", onlyFor: SVC },
      { to: "/pos-app/medical-invoice",       label: "Tagihan & Resep",     icon: Receipt, hint: "Buat tagihan & resep digital per pasien dengan tanda tangan dokter — KL-05", onlyFor: SVC },
      { to: "/pos-app/followup-reminders",    label: "Reminder Kunjungan",  icon: Scissors, hint: "Reminder potong rambut (4 minggu) atau kontrol ulang klinik otomatis — SB-06/KL-07", onlyFor: FNB_SVC },
      { to: "/pos-app/milestones",            label: "Milestone & Escrow",  icon: Target, hint: "Kelola milestone proyek & escrow bayar bertahap untuk jasa digital — JU-06/JU-07", onlyFor: DIGITAL_SVC },
      { to: "/pos-app/contracts",             label: "Kontrak Digital",     icon: ScrollText, hint: "Buat & tanda tangani kontrak freelance digital per order — JU-08", onlyFor: DIGITAL_SVC },
      { to: "/pos-app/booking-reminders",     label: "Reminder Booking",    icon: Bell, hint: "Kirim pengingat H-1 & H-3 via WhatsApp ke pelanggan", onlyFor: FNB_SVC },
      { to: "/pos-app/booking-reviews",   label: "Ulasan Booking",    icon: Star, hint: "Monitor ulasan & kirim pengingat WhatsApp minta ulasan ke pelanggan", onlyFor: FNB_SVC },
      { to: "/pos-app/booking-analytics", label: "Analitik Booking",  icon: BarChart3, hint: "Pantau pendapatan deposit, tingkat pembatalan, jam slot terpopuler & tren booking", onlyFor: FNB_SVC },
      { to: "/pos-app/studio-packages",      label: "Paket Sesi Foto",      icon: Camera, hint: "Buat paket sesi foto (Basic/Standard/Premium) — tampil di halaman booking klien", onlyFor: SVC },
      { to: "/pos-app/studio-addons",        label: "Add-on Sesi Foto",     icon: Sparkles, hint: "Layanan tambahan yang bisa dipilih klien saat booking: editing ekstra, album cetak, video recap — SF-08", onlyFor: SVC },
      { to: "/pos-app/studio-brief",         label: "Brief Form Klien",     icon: ClipboardList, hint: "Kirim link form brief ke klien sebelum sesi — mood, lokasi, outfit, referensi", onlyFor: SVC },
      { to: "/pos-app/studio-delivery",      label: "Kirim Hasil Foto",     icon: FolderOpen, hint: "Kirim link Google Drive/WeTransfer ke klien via WhatsApp setelah sesi selesai", onlyFor: SVC },
      { to: "/pos-app/studio-photo-reviews", label: "Ulasan Foto Klien",    icon: Star, hint: "Minta klien upload foto hasil sesi & tulis ulasan — tampil sebagai social proof di toko", onlyFor: SVC },
    ],
  },
  {
    id: "storefront",
    label: "Tampilan Toko",
    items: [
      { to: "/pos-app/portfolio",     label: "Portofolio / Galeri",    icon: SlidersHorizontal, hint: "Tampilkan foto karya terbaikmu kepada calon pembeli", onlyFor: SVC_CRAFT },
      { to: "/pos-app/flash-sale",    label: "Flash Sale Terjadwal",   icon: Zap, hint: "Atur diskon kilat dengan countdown timer otomatis di marketplace" },
      { to: "/pos-app/happy-hour",    label: "Happy Hour",             icon: Clock, hint: "Atur diskon otomatis berdasarkan hari dan jam", onlyFor: FNB },
      { to: "/pos-app/bulk-pricing",  label: "Harga Grosir / Bulk",    icon: Layers, hint: "Harga bertingkat otomatis: beli lebih banyak, harga lebih murah" },
      { to: "/pos-app/upsell",        label: "Sering Dibeli Bersama",  icon: Layers, hint: "Atur produk rekomendasi 'sering dibeli bersama' — tingkatkan AOV" },
      { to: "/pos-app/pre-orders",    label: "Pre-Order Mode",         icon: CalendarDays, hint: "Buka pesanan di muka — limited drop, catering, custom batch", onlyFor: [...FNB, "craft"] },
      { to: "/pos-app/custom-orders", label: "Permintaan Custom",      icon: FileText, hint: "Kelola permintaan custom order dari pembeli", onlyFor: [...SVC_CRAFT, "fnb"] },
    ],
  },
  {
    id: "finance",
    label: "Keuangan & Laporan",
    items: [
      { to: "/pos-app/keuangan",              label: "Keuangan",              icon: Banknote },
      { to: "/pos-app/keuangan/tarik",        label: "Tarik Saldo",           icon: ArrowDownToLine },
      { to: "/pos-app/rekening-bank",         label: "Rekening Bank",         icon: Building2 },
      { to: "/pos-app/billing",               label: "Plan & Tagihan",        icon: CreditCard },
      { to: "/pos-app/reports",               label: "Laporan Penjualan",     icon: BarChart3 },
      { to: "/pos-app/reports/profit",        label: "Profit & Margin",       icon: BarChart3 },
      { to: "/pos-app/marketplace-analytics", label: "Analitik Marketplace",  icon: BarChart3 },
      { to: "/pos-app/laporan-harian",        label: "Laporan Harian",        icon: BarChart3, hint: "Ringkasan omset, top menu & stok kritis harian. Bagikan via WhatsApp." },
      { to: "/pos-app/invoice",               label: "Invoice PDF",           icon: FileText },
    ],
  },
  {
    id: "delivery_ext",
    label: "Pengiriman Lanjutan",
    items: [
      { to: "/pos-app/rajaongkir",      label: "RajaOngkir",       icon: Truck,    onlyFor: PHYSICAL },
      { to: "/pos-app/shipping-labels", label: "Label Pengiriman",  icon: Printer,  onlyFor: PHYSICAL },
    ],
  },
  {
    id: "verification",
    label: "Akun & Verifikasi",
    items: [
      { to: "/pos-app/kyc",        label: "Verifikasi KTP (KYC)", icon: ShieldCheck },
      { to: "/pos-app/notifikasi", label: "Notifikasi Toko",      icon: Bell },
    ],
  },
  {
    id: "settings",
    label: "Pengaturan Toko",
    items: [
      { to: "/pos-app/table-qr",          label: "QR Code Meja",    icon: QrCode, onlyFor: FNB },
      { to: "/pos-app/printers",          label: "Printer",          icon: Printer },
      { to: "/pos-app/appearance",        label: "Tampilan Toko",    icon: Palette },
      { to: "/pos-app/storefront-builder",label: "Storefront Builder",icon: LayoutDashboard },
      { to: "/pos-app/custom-css",        label: "Custom CSS",       icon: Lock, proOnly: true },
      { to: "/pos-app/outlets",           label: "Multi-Outlet",     icon: Building2 },
      { to: "/pos-app/domain",            label: "Domain Kustom",    icon: Globe, proOnly: true },
      { to: "/pos-app/backup",            label: "Backup Data",      icon: Database },
      { to: "/pos-app/settings",          label: "Pengaturan",       icon: Settings },
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

type ServiceCall = {
  id: string;
  shop_id: string;
  table_id: string;
  table_name: string;
  called_at: string;
  type: string;
};

function AppLayoutInner() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isPro } = usePlan();
  const { isAdmin } = useIsSuperAdmin();
  const staff = useStaffRole();
  const [shop, setShop] = useState<{ id: string; name: string; logo_url: string | null; suspended_at?: string | null; suspended_reason?: string | null } | null>(null);
  const paymentPendingAdCount = useOwnerPaymentPendingCount(shop?.id ?? null);
  const { criticalCount: lowStockCount, emptyCount, items: lowStockItems } = useLowStockIngredients(shop?.id ?? null);
  const unansweredQACount = useUnansweredQACount(shop?.id ?? null);
  const restockPendingCount = useRestockPendingCount(shop?.id ?? null);
  const prevLowStockCountRef = useRef<number>(0);
  const prevRestockCountRef = useRef<number>(-1);
  const [checking, setChecking] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [serviceCalls, setServiceCalls] = useState<ServiceCall[]>([]);
  const [shopCategoryType, setShopCategoryType] = useState<string>("general");

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
        .select("id, name, logo_url, suspended_at, suspended_reason, business_category:business_categories(slug)")
        .eq("owner_id", user.id)
        .maybeSingle();
      if (data) {
        setShop(data as any);
        setShopCategoryType(deriveCategoryType((data as any).business_category?.slug));
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
          .select("name, logo_url, suspended_at, suspended_reason, business_category:business_categories(slug)")
          .eq("id", staff.shopId)
          .maybeSingle();
        if (s) {
          setShop(s as any);
          setShopCategoryType(deriveCategoryType((s as any).business_category?.slug));
          setChecking(false);
          return;
        }
      }
      // Neither owner nor staff
      navigate({ to: "/onboarding" });
    })();
  }, [user, loading, navigate, location.pathname, staff.loading, staff.isStaff, staff.shopId]);

  // F3-2: Toast notification when new low-stock ingredients detected
  useEffect(() => {
    if (!shop?.id || lowStockCount === 0) return;
    if (lowStockCount > prevLowStockCountRef.current) {
      const emptyItems = lowStockItems.filter((i) => i.stock_status === "empty");
      const criticalItems = lowStockItems.filter((i) => i.stock_status === "critical");
      if (emptyItems.length > 0) {
        toast.error(`⚠️ ${emptyItems.length} bahan habis!`, {
          description: emptyItems.map((i) => i.name).slice(0, 3).join(", ")
            + (emptyItems.length > 3 ? ` +${emptyItems.length - 3} lainnya` : ""),
          duration: 8000,
          action: { label: "Cek Inventori", onClick: () => {} },
        });
      } else if (criticalItems.length > 0) {
        toast.warning(`🔴 ${criticalItems.length} bahan stok kritis`, {
          description: criticalItems.map((i) => `${i.name} (${i.current_stock} ${i.unit})`).slice(0, 2).join(", "),
          duration: 6000,
        });
      }
    }
    prevLowStockCountRef.current = lowStockCount;
  }, [lowStockCount, lowStockItems, shop?.id]);

  // Restock pending count toast — fires only when count rises after initial load
  useEffect(() => {
    if (!shop?.id) return;
    if (prevRestockCountRef.current === -1) {
      prevRestockCountRef.current = restockPendingCount;
      return;
    }
    if (restockPendingCount > prevRestockCountRef.current) {
      const diff = restockPendingCount - prevRestockCountRef.current;
      toast.info(
        `🔔 ${diff} pelanggan baru daftar notif stok!`,
        {
          description: `Total ${restockPendingCount} pelanggan menunggu. Blast WhatsApp sekarang.`,
          duration: 8000,
          action: { label: "Lihat", onClick: () => navigate({ to: "/pos-app/restock-notify" }) },
        },
      );
    }
    prevRestockCountRef.current = restockPendingCount;
  }, [restockPendingCount, shop?.id, navigate]);

  // Service call subscription — shows toast on any pos-app page
  useEffect(() => {
    if (!shop?.id) return;
    const ch = supabase
      .channel(`service-calls-layout-${shop.id}`)
      .on("broadcast", { event: "service_call" }, ({ payload }) => {
        const call = payload as ServiceCall;
        setServiceCalls((prev) => {
          const existing = prev.findIndex((c) => c.table_id === call.table_id);
          if (existing >= 0) {
            const next = [...prev];
            next[existing] = call;
            return next;
          }
          return [call, ...prev];
        });
        new Audio("/notification.mp3").play().catch(() => {});
        toast.info(`🔔 ${call.table_name} memanggil pelayan!`, {
          duration: 10000,
          description: "Segera datangi meja tersebut",
          action: {
            label: "Tutup",
            onClick: () => setServiceCalls((p) => p.filter((c) => c.id !== call.id)),
          },
        });
      })
      .on("broadcast", { event: "dismiss_call" }, ({ payload }) => {
        setServiceCalls((prev) => prev.filter((c) => c.id !== payload.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [shop?.id]);

  // Q&A new question subscription — toast on any pos-app page
  useEffect(() => {
    if (!shop?.id) return;
    const ch = supabase
      .channel(`qa-notify-${shop.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "product_qa", filter: `shop_id=eq.${shop.id}` },
        async (payload) => {
          const row = payload.new as { question: string; product_id: string | null };
          let productName = "";
          if (row.product_id) {
            const { data } = await supabase
              .from("menu_items")
              .select("name")
              .eq("id", row.product_id)
              .maybeSingle();
            if (data?.name) productName = data.name;
          }
          toast.info("💬 Pertanyaan baru masuk!", {
            duration: 12000,
            description: [
              productName ? `Produk: ${productName}` : null,
              `"${row.question.slice(0, 80)}${row.question.length > 80 ? "…" : ""}"`,
            ].filter(Boolean).join("\n"),
            action: {
              label: "Jawab",
              onClick: () => navigate({ to: "/pos-app/qa" }),
            },
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [shop?.id, navigate]);

  // Filter nav: by staff permissions AND by shop category type
  const visibleGroups = useMemo(() => {
    const allowed = (it: NavItem) => {
      // Staff permission check
      if (!staff.isOwner && staff.isStaff && !isModuleAllowed(it.to, staff.allowedModules)) return false;
      // Category type check — only filter if onlyFor is specified
      if (it.onlyFor && it.onlyFor.length > 0 && !it.onlyFor.includes(shopCategoryType)) return false;
      return true;
    };
    return NAV_GROUPS
      .map((g) => ({ ...g, items: g.items.filter(allowed) }))
      .filter((g) => g.items.length > 0);
  }, [staff.isOwner, staff.isStaff, staff.allowedModules, shopCategoryType]);

  // Track which group is open; auto-open the group that contains the active route
  const matchItem = (it: NavItem, path: string) => {
    if (it.exact) return path === it.to;
    if (path.startsWith(it.to)) return true;
    return it.aliases?.some((a) => path.startsWith(a)) ?? false;
  };
  const activeGroupId = useMemo(() => {
    for (const g of visibleGroups) {
      if (g.items.some((it) => matchItem(it, location.pathname))) return g.id;
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
        <span className="text-sm font-semibold">UMKMgo</span>
        {shopCategoryType !== "general" && (
          <span className="ml-auto shrink-0 rounded-full bg-sidebar-accent px-2 py-0.5 text-[10px] font-semibold capitalize text-sidebar-accent-foreground">
            {{
              fnb: "F&B",
              fashion: "Fashion",
              digital: "Digital",
              services: "Jasa",
              craft: "Kerajinan",
              electronics: "Elektronik",
            }[shopCategoryType] ?? shopCategoryType}
          </span>
        )}
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
                    const active = matchItem(item, location.pathname);
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
                        {item.to === "/pos-app/iklan" && paymentPendingAdCount > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
                            {paymentPendingAdCount > 9 ? "9+" : paymentPendingAdCount}
                          </span>
                        )}
                        {item.to === "/pos-app/inventory" && lowStockCount > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white animate-pulse">
                            {emptyCount > 0 ? "!" : lowStockCount > 9 ? "9+" : lowStockCount}
                          </span>
                        )}
                        {item.to === "/pos-app/qa" && unansweredQACount > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white animate-pulse">
                            {unansweredQACount > 9 ? "9+" : unansweredQACount}
                          </span>
                        )}
                        {item.to === "/pos-app/restock-notify" && restockPendingCount > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-white animate-pulse">
                            {restockPendingCount > 9 ? "9+" : restockPendingCount}
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
            <span className="truncate text-sm font-semibold">{shop?.name ?? "UMKMgo"}</span>
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
      <CommandPaletteOwner />
    </div>
  );
}

function CommandPaletteOwner() {
  const { open, setOpen } = useCommandPalette();
  return <CommandPalette open={open} onClose={() => setOpen(false)} role="owner" />;
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
