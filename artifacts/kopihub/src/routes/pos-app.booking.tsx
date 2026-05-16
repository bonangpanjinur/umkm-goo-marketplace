import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/use-shop";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  CalendarCheck,
  Plus,
  RefreshCw,
  Clock,
  User,
  Users,
  Phone,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Banknote,
  Save,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Ticket,
  Trash2,
  Tag,
  BarChart2,
  TrendingDown,
  Percent,
  ShoppingBag,
  BellRing,
  ChevronDown,
  ChevronUp,
  Package,
  Star,
  GripVertical,
  Edit2,
  ArrowRightLeft,
  CalendarClock,
  History,
  FileText,
  Download,
} from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/booking")({
  validateSearch: (search: Record<string, unknown>) => ({
    type: (search.type === "table" ? "table" : "service") as "service" | "table",
  }),
  component: BookingPage,
});

/*
-- SB-07: Catatan pelanggan per kunjungan (jalankan di Supabase SQL Editor):
alter table public.bookings
  add column if not exists merchant_notes text;
*/

type Slot = {
  id: string;
  service_name: string;
  slot_date: string;
  slot_time: string;
  duration_min: number;
  max_capacity: number;
  booked_count: number;
  price: number;
  notes: string | null;
};

type WaitlistEntry = {
  id: string;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  notes: string | null;
  notified_at: string | null;
  created_at: string;
};

type Booking = {
  id: string;
  slot_id: string;
  customer_name: string;
  customer_phone: string;
  party_size: number;
  status: "pending" | "confirmed" | "cancelled" | "done";
  notes: string | null;
  merchant_notes: string | null;
  created_at: string;
  slot?: Slot;
  deposit_required?: boolean;
  deposit_amount?: number;
  deposit_status?: string;
  voucher_code?: string | null;
  voucher_discount?: number | null;
};

type BookingVoucher = {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  min_slot_price: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_until: string | null;
  is_active: boolean;
  description: string | null;
  created_at: string;
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Menunggu",   cls: "bg-amber-500/15 text-amber-700" },
  confirmed: { label: "Dikonfirmasi", cls: "bg-green-500/15 text-green-700" },
  cancelled: { label: "Dibatalkan", cls: "bg-red-500/15 text-red-700" },
  done:      { label: "Selesai",    cls: "bg-muted text-muted-foreground" },
};

type ServicePackage = {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  sort_order: number;
  color: string;
  created_at: string;
};

type BookingAddon = {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

type RescheduleLog = {
  id: string;
  booking_id: string;
  old_slot_id: string;
  new_slot_id: string;
  note: string | null;
  created_at: string;
  old_slot?: { service_name: string; slot_date: string; slot_time: string };
  new_slot?: { service_name: string; slot_date: string; slot_time: string };
};

const PKG_COLORS = [
  { value: "blue",   label: "Biru"   },
  { value: "green",  label: "Hijau"  },
  { value: "purple", label: "Ungu"   },
  { value: "amber",  label: "Kuning" },
  { value: "rose",   label: "Merah"  },
];

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "/api";

/** Shown on cancelled bookings where deposit was paid via gateway.
 *  Fetches the gateway TX ID and lets the owner mark the refund as processed. */
function RefundPanel({ bookingId, onRefunded }: { bookingId: string; onRefunded: () => void }) {
  const [tx, setTx] = useState<{
    gateway: string;
    gateway_transaction_id: string | null;
    amount: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [marking, setMarking] = useState(false);

  const fetchTx = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/payments/booking-${bookingId}/status`);
      if (res.ok) {
        const data = await res.json();
        setTx({ gateway: data.gateway ?? "gateway", gateway_transaction_id: data.gateway_transaction_id ?? null, amount: data.amount ?? null });
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const markRefunded = async () => {
    setMarking(true);
    try {
      await (supabase as any).from("bookings").update({ deposit_status: "refunded" }).eq("id", bookingId);
      toast.success("DP ditandai sudah di-refund");
      onRefunded();
    } catch {
      toast.error("Gagal memperbarui status refund");
    }
    setMarking(false);
  };

  return (
    <div className="rounded-lg border border-rose-200 bg-rose-50/40 dark:bg-rose-950/10 p-2.5 space-y-2">
      <p className="text-[10px] font-semibold text-rose-700 flex items-center gap-1.5">
        <Banknote className="h-3 w-3" /> Refund DP Diminta oleh Pelanggan
      </p>
      {!tx ? (
        <button
          onClick={fetchTx}
          disabled={loading}
          className="text-[10px] text-rose-700 hover:underline flex items-center gap-1 font-medium"
        >
          {loading ? <><Loader2 className="h-3 w-3 animate-spin" /> Memuat TX ID…</> : "Lihat TX ID Gateway →"}
        </button>
      ) : (
        <div className="space-y-1.5">
          {tx.gateway_transaction_id ? (
            <div className="flex items-center gap-1.5">
              <code className="flex-1 text-[10px] font-mono bg-white dark:bg-card border border-rose-200 px-1.5 py-0.5 rounded text-rose-800 truncate">
                {tx.gateway_transaction_id}
              </code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(tx.gateway_transaction_id!);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="shrink-0 text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-rose-300 text-rose-700 hover:bg-rose-100 transition-colors"
              >
                {copied ? <><Check className="h-3 w-3" /> Disalin</> : <><Copy className="h-3 w-3" /> Salin</>}
              </button>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground italic">TX ID tidak tersedia</p>
          )}
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="capitalize">{tx.gateway}</span>
            {tx.amount && <span>· Rp {Number(tx.amount).toLocaleString("id-ID")}</span>}
          </div>
          <p className="text-[10px] text-muted-foreground">Gunakan TX ID ini untuk mengajukan refund melalui dashboard {tx.gateway === "midtrans" ? "Midtrans" : "Xendit"}.</p>
        </div>
      )}
      <button
        onClick={markRefunded}
        disabled={marking}
        className="text-[10px] flex items-center gap-1 px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-60 font-medium"
      >
        {marking ? <><Loader2 className="h-3 w-3 animate-spin" /> Menyimpan…</> : <><Check className="h-3 w-3" /> Tandai Refunded</>}
      </button>
    </div>
  );
}

function BookingPage() {
  const { shop } = useShop();
  const { type: bookingType } = Route.useSearch();
  const navigate = Route.useNavigate();
  const isTableMode = bookingType === "table";
  const [view, setView] = useState<"bookings" | "slots" | "packages">("bookings");
  const [date, setDate] = useState(isoDate(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [waitlistMap, setWaitlistMap] = useState<Record<string, WaitlistEntry[]>>({});
  const [expandedWaitlist, setExpandedWaitlist] = useState<Record<string, boolean>>({});

  const [slotOpen, setSlotOpen] = useState(false);
  const [slotForm, setSlotForm] = useState({ service_name: "", slot_date: isoDate(new Date()), slot_time: "09:00", duration_min: "60", max_capacity: "1", price: "0", notes: "" });
  const [savingSlot, setSavingSlot] = useState(false);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<Slot | null>(null);
  const [bookingForm, setBookingForm] = useState({ customer_name: "", customer_phone: "", party_size: "1", notes: "" });
  const [savingBooking, setSavingBooking] = useState(false);

  const [statusUpdating, setStatusUpdating] = useState<string | null>(null);

  // ── F-17: Reschedule Mandiri Booking ───────────────────────────────
  const [rescheduleOpen, setRescheduleOpen]   = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate]   = useState(isoDate(new Date()));
  const [rescheduleSlots, setRescheduleSlots] = useState<Slot[]>([]);
  const [rescheduleSlot, setRescheduleSlot]   = useState<string>("");
  const [rescheduleNote, setRescheduleNote]   = useState("");
  const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
  const [savingReschedule, setSavingReschedule] = useState(false);
  const [rescheduleHistory, setRescheduleHistory] = useState<RescheduleLog[]>([]);
  const [historyOpen, setHistoryOpen]         = useState(false);
  const [historyBookingId, setHistoryBookingId] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory]   = useState(false);

  // ── SB-07: Catatan kunjungan merchant ──────────────────────────────
  const [editingMerchantNotesId, setEditingMerchantNotesId] = useState<string | null>(null);
  const [merchantNotesDraft, setMerchantNotesDraft] = useState("");
  const [savingMerchantNotes, setSavingMerchantNotes] = useState(false);

  const saveMerchantNotes = async (bookingId: string) => {
    setSavingMerchantNotes(true);
    try {
      const { error } = await (supabase as any)
        .from("bookings")
        .update({ merchant_notes: merchantNotesDraft.trim() || null })
        .eq("id", bookingId);
      if (error) {
        if (error.code === "42703") {
          toast.error("Kolom merchant_notes belum ada. Jalankan migrasi SQL dulu.");
        } else {
          throw error;
        }
      } else {
        setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, merchant_notes: merchantNotesDraft.trim() || null } : b));
        toast.success("Catatan kunjungan tersimpan");
        setEditingMerchantNotesId(null);
      }
    } catch (e: any) {
      toast.error(e.message ?? "Gagal menyimpan catatan");
    } finally {
      setSavingMerchantNotes(false);
    }
  };

  // ── Packages & Add-ons management (M-17) ───────────────────────────
  const [pkgList, setPkgList]             = useState<ServicePackage[]>([]);
  const [addonList, setAddonList]         = useState<BookingAddon[]>([]);
  const [pkgLoading, setPkgLoading]       = useState(false);
  const [pkgDialogOpen, setPkgDialogOpen] = useState(false);
  const [addonDialogOpen, setAddonDialogOpen] = useState(false);
  const [savingPkg, setSavingPkg]         = useState(false);
  const [savingAddon, setSavingAddon]     = useState(false);
  const [editingPkg, setEditingPkg]       = useState<ServicePackage | null>(null);
  const [editingAddon, setEditingAddon]   = useState<BookingAddon | null>(null);
  const [pkgForm, setPkgForm] = useState({
    name: "", description: "", price: "0", sort_order: "0", color: "blue",
  });
  const [addonForm, setAddonForm] = useState({
    name: "", description: "", price: "0", sort_order: "0",
  });

  const loadPkgData = useCallback(async () => {
    if (!shop?.id) return;
    setPkgLoading(true);
    try {
      const [pkgs, ads] = await Promise.all([
        (supabase as any).from("booking_service_packages").select("*").eq("shop_id", shop.id).order("sort_order").order("created_at"),
        (supabase as any).from("booking_addons").select("*").eq("shop_id", shop.id).order("sort_order").order("created_at"),
      ]);
      setPkgList((pkgs.data ?? []) as ServicePackage[]);
      setAddonList((ads.data ?? []) as BookingAddon[]);
    } finally {
      setPkgLoading(false);
    }
  }, [shop?.id]);

  useEffect(() => { if (view === "packages") loadPkgData(); }, [view, loadPkgData]);

  // F-17: Auto-load slot saat dialog reschedule dibuka dengan tanggal awal
  useEffect(() => {
    if (rescheduleOpen && rescheduleDate && rescheduleBooking) {
      loadRescheduleSlots(rescheduleDate);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rescheduleOpen, rescheduleBooking?.id]);

  const openNewPkg = () => {
    setEditingPkg(null);
    setPkgForm({ name: "", description: "", price: "0", sort_order: String(pkgList.length), color: "blue" });
    setPkgDialogOpen(true);
  };
  const openEditPkg = (pkg: ServicePackage) => {
    setEditingPkg(pkg);
    setPkgForm({ name: pkg.name, description: pkg.description ?? "", price: String(pkg.price), sort_order: String(pkg.sort_order), color: pkg.color });
    setPkgDialogOpen(true);
  };

  const savePkg = async () => {
    if (!shop?.id) return;
    if (!pkgForm.name.trim()) { toast.error("Nama paket wajib diisi"); return; }
    setSavingPkg(true);
    const payload = {
      shop_id: shop.id,
      name: pkgForm.name.trim(),
      description: pkgForm.description.trim() || null,
      price: Number(pkgForm.price) || 0,
      sort_order: Number(pkgForm.sort_order) || 0,
      color: pkgForm.color,
    };
    const { error } = editingPkg
      ? await (supabase as any).from("booking_service_packages").update(payload).eq("id", editingPkg.id)
      : await (supabase as any).from("booking_service_packages").insert(payload);
    setSavingPkg(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingPkg ? "Paket diperbarui" : "Paket ditambahkan");
    setPkgDialogOpen(false);
    loadPkgData();
  };

  const togglePkg = async (pkg: ServicePackage) => {
    await (supabase as any).from("booking_service_packages").update({ is_active: !pkg.is_active }).eq("id", pkg.id);
    toast.success(pkg.is_active ? "Paket dinonaktifkan" : "Paket diaktifkan");
    loadPkgData();
  };

  const deletePkg = async (pkg: ServicePackage) => {
    if (!confirm(`Hapus paket "${pkg.name}"?`)) return;
    await (supabase as any).from("booking_service_packages").delete().eq("id", pkg.id);
    toast.success("Paket dihapus");
    loadPkgData();
  };

  const openNewAddon = () => {
    setEditingAddon(null);
    setAddonForm({ name: "", description: "", price: "0", sort_order: String(addonList.length) });
    setAddonDialogOpen(true);
  };
  const openEditAddon = (addon: BookingAddon) => {
    setEditingAddon(addon);
    setAddonForm({ name: addon.name, description: addon.description ?? "", price: String(addon.price), sort_order: String(addon.sort_order) });
    setAddonDialogOpen(true);
  };

  const saveAddon = async () => {
    if (!shop?.id) return;
    if (!addonForm.name.trim()) { toast.error("Nama add-on wajib diisi"); return; }
    setSavingAddon(true);
    const payload = {
      shop_id: shop.id,
      name: addonForm.name.trim(),
      description: addonForm.description.trim() || null,
      price: Number(addonForm.price) || 0,
      sort_order: Number(addonForm.sort_order) || 0,
    };
    const { error } = editingAddon
      ? await (supabase as any).from("booking_addons").update(payload).eq("id", editingAddon.id)
      : await (supabase as any).from("booking_addons").insert(payload);
    setSavingAddon(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingAddon ? "Add-on diperbarui" : "Add-on ditambahkan");
    setAddonDialogOpen(false);
    loadPkgData();
  };

  const toggleAddon = async (addon: BookingAddon) => {
    await (supabase as any).from("booking_addons").update({ is_active: !addon.is_active }).eq("id", addon.id);
    toast.success(addon.is_active ? "Add-on dinonaktifkan" : "Add-on diaktifkan");
    loadPkgData();
  };

  const deleteAddon = async (addon: BookingAddon) => {
    if (!confirm(`Hapus add-on "${addon.name}"?`)) return;
    await (supabase as any).from("booking_addons").delete().eq("id", addon.id);
    toast.success("Add-on dihapus");
    loadPkgData();
  };

  // Voucher management
  const [vouchers, setVouchers] = useState<BookingVoucher[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [savingVoucher, setSavingVoucher] = useState(false);
  const [voucherForm, setVoucherForm] = useState({
    code: "",
    discount_type: "percent" as "percent" | "fixed",
    discount_value: "",
    min_slot_price: "0",
    max_uses: "",
    valid_from: "",
    valid_until: "",
    description: "",
  });

  // ── Voucher analytics ──────────────────────────────────────────────
  type VoucherStat = {
    code: string;
    redemptions: number;
    totalDiscount: number;
    totalOriginalPrice: number;
  };
  const [analyticsRange, setAnalyticsRange] = useState<"7" | "30" | "90" | "all">("30");
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [voucherStats, setVoucherStats] = useState<VoucherStat[]>([]);
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

  const loadAnalytics = useCallback(async () => {
    if (!shop?.id) return;
    setAnalyticsLoading(true);
    try {
      let query = (supabase as any)
        .from("bookings")
        .select("voucher_code, voucher_discount, booking_slots!inner(shop_id, price, slot_date)")
        .eq("booking_slots.shop_id", shop.id)
        .not("voucher_code", "is", null);

      if (analyticsRange !== "all") {
        const from = new Date();
        from.setDate(from.getDate() - Number(analyticsRange));
        query = query.gte("booking_slots.slot_date", from.toISOString().split("T")[0]);
      }

      const { data } = await query;
      const rows = (data ?? []) as Array<{
        voucher_code: string;
        voucher_discount: number;
        booking_slots: { price: number; slot_date: string };
      }>;

      const map = new Map<string, VoucherStat>();
      for (const r of rows) {
        const code = r.voucher_code;
        const existing = map.get(code) ?? { code, redemptions: 0, totalDiscount: 0, totalOriginalPrice: 0 };
        existing.redemptions += 1;
        existing.totalDiscount += Number(r.voucher_discount ?? 0);
        existing.totalOriginalPrice += Number(r.booking_slots?.price ?? 0);
        map.set(code, existing);
      }

      setVoucherStats(Array.from(map.values()).sort((a, b) => b.redemptions - a.redemptions));
      setAnalyticsLoaded(true);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [shop?.id, analyticsRange]);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  const totalRedemptions = voucherStats.reduce((s, v) => s + v.redemptions, 0);
  const totalDiscount    = voucherStats.reduce((s, v) => s + v.totalDiscount, 0);
  const totalOriginal    = voucherStats.reduce((s, v) => s + v.totalOriginalPrice, 0);

  const loadVouchers = useCallback(async () => {
    if (!shop?.id) return;
    setVouchersLoading(true);
    const { data } = await (supabase as any)
      .from("booking_vouchers")
      .select("*")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false });
    setVouchers((data ?? []) as BookingVoucher[]);
    setVouchersLoading(false);
  }, [shop?.id]);

  useEffect(() => { loadVouchers(); }, [loadVouchers]);

  const saveVoucher = async () => {
    if (!shop?.id) return;
    if (!voucherForm.code.trim()) { toast.error("Kode voucher wajib diisi"); return; }
    if (!voucherForm.discount_value || Number(voucherForm.discount_value) <= 0) {
      toast.error("Nilai diskon harus lebih dari 0"); return;
    }
    if (voucherForm.discount_type === "percent" && Number(voucherForm.discount_value) > 100) {
      toast.error("Diskon persen tidak boleh lebih dari 100%"); return;
    }
    setSavingVoucher(true);
    const { error } = await (supabase as any).from("booking_vouchers").insert({
      shop_id: shop.id,
      code: voucherForm.code.trim().toUpperCase(),
      discount_type: voucherForm.discount_type,
      discount_value: Number(voucherForm.discount_value),
      min_slot_price: Number(voucherForm.min_slot_price) || 0,
      max_uses: voucherForm.max_uses ? Number(voucherForm.max_uses) : null,
      valid_from: voucherForm.valid_from || null,
      valid_until: voucherForm.valid_until || null,
      description: voucherForm.description.trim() || null,
    });
    setSavingVoucher(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Voucher berhasil dibuat");
    setVoucherOpen(false);
    setVoucherForm({ code: "", discount_type: "percent", discount_value: "", min_slot_price: "0", max_uses: "", valid_from: "", valid_until: "", description: "" });
    loadVouchers();
  };

  const toggleVoucher = async (v: BookingVoucher) => {
    await (supabase as any).from("booking_vouchers").update({ is_active: !v.is_active }).eq("id", v.id);
    toast.success(v.is_active ? "Voucher dinonaktifkan" : "Voucher diaktifkan");
    loadVouchers();
  };

  const deleteVoucher = async (v: BookingVoucher) => {
    if (!confirm(`Hapus voucher "${v.code}"?`)) return;
    await (supabase as any).from("booking_vouchers").delete().eq("id", v.id);
    toast.success("Voucher dihapus");
    loadVouchers();
  };

  // Deposit settings
  const [depositEnabled, setDepositEnabled] = useState(false);
  const [depositPercent, setDepositPercent] = useState("50");
  const [depositNotes, setDepositNotes] = useState("");
  const [savingDeposit, setSavingDeposit] = useState(false);
  const [depositLoaded, setDepositLoaded] = useState(false);

  // Load deposit settings when shop loads
  useEffect(() => {
    if (!shop?.id || depositLoaded) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("coffee_shops")
        .select("require_deposit, deposit_percent, deposit_notes")
        .eq("id", shop.id)
        .maybeSingle();
      if (data) {
        setDepositEnabled(!!data.require_deposit);
        setDepositPercent(String(data.deposit_percent ?? 50));
        setDepositNotes(data.deposit_notes ?? "");
      }
      setDepositLoaded(true);
    })();
  }, [shop?.id, depositLoaded]);

  const saveDepositSettings = async () => {
    if (!shop?.id) return;
    setSavingDeposit(true);
    const { error } = await (supabase as any)
      .from("coffee_shops")
      .update({
        require_deposit: depositEnabled,
        deposit_percent: Number(depositPercent),
        deposit_notes: depositNotes.trim() || null,
      })
      .eq("id", shop.id);
    setSavingDeposit(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pengaturan deposit disimpan");
  };

  const load = useCallback(async () => {
    if (!shop?.id) return;
    setLoading(true);
    try {
      const [sl, bk] = await Promise.all([
        supabase
          .from("booking_slots" as any)
          .select("*")
          .eq("shop_id" as any, shop.id)
          .eq("booking_type" as any, bookingType)
          .eq("slot_date" as any, date)
          .order("slot_time" as any) as any,
        supabase
          .from("bookings" as any)
          .select("*, booking_slots!inner(*, shop_id)")
          .eq("booking_slots.shop_id" as any, shop.id)
          .eq("booking_type" as any, bookingType)
          .eq("booking_slots.slot_date" as any, date)
          .order("created_at", { ascending: false }) as any,
      ]);
      const slotList: Slot[] = ((sl.data as any[]) ?? []).map((s) => ({
        ...s,
        price: Number(s.price),
        duration_min: Number(s.duration_min),
        max_capacity: Number(s.max_capacity),
        booked_count: Number(s.booked_count ?? 0),
      }));
      setSlots(slotList);
      setBookings(
        ((bk.data as any[]) ?? []).map((b) => ({ ...b, slot: b.booking_slots }))
      );

      // Load waitlist for all slots of the day
      if (slotList.length > 0) {
        const slotIds = slotList.map(s => s.id);
        const { data: wlData } = await (supabase as any)
          .from("booking_waitlist")
          .select("*")
          .in("slot_id", slotIds)
          .order("created_at", { ascending: true }) as any;
        const map: Record<string, WaitlistEntry[]> = {};
        for (const entry of (wlData ?? []) as any[]) {
          if (!map[entry.slot_id]) map[entry.slot_id] = [];
          map[entry.slot_id].push(entry as WaitlistEntry);
        }
        setWaitlistMap(map);
      } else {
        setWaitlistMap({});
      }
    } finally {
      setLoading(false);
    }
  }, [shop?.id, date, bookingType]);

  useEffect(() => { load(); }, [load]);

  const prevDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() - 1);
    setDate(isoDate(d));
  };
  const nextDay = () => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    setDate(isoDate(d));
  };

  const saveSlot = async () => {
    if (!shop?.id) return;
    if (!slotForm.service_name.trim()) { toast.error("Nama layanan wajib diisi"); return; }
    setSavingSlot(true);
    const { error } = await supabase.from("booking_slots" as any).insert({
      shop_id: shop.id,
      service_name: slotForm.service_name.trim(),
      slot_date: slotForm.slot_date,
      slot_time: slotForm.slot_time,
      duration_min: Number(slotForm.duration_min),
      max_capacity: Number(slotForm.max_capacity),
      price: Number(slotForm.price),
      notes: slotForm.notes.trim() || null,
      booking_type: bookingType,
    });
    setSavingSlot(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Slot ditambahkan");
    setSlotOpen(false);
    load();
  };

  const openBooking = (slot: Slot) => {
    setBookingSlot(slot);
    setBookingForm({ customer_name: "", customer_phone: "", party_size: "1", notes: "" });
    setBookingOpen(true);
  };

  const saveBooking = async () => {
    if (!bookingSlot) return;
    if (!bookingForm.customer_name.trim()) { toast.error("Nama pelanggan wajib diisi"); return; }
    setSavingBooking(true);
    const { error } = await supabase.from("bookings" as any).insert({
      slot_id: bookingSlot.id,
      customer_name: bookingForm.customer_name.trim(),
      customer_phone: bookingForm.customer_phone.trim() || null,
      party_size: Number(bookingForm.party_size),
      notes: bookingForm.notes.trim() || null,
      status: "confirmed",
    });
    setSavingBooking(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Booking ditambahkan");
    setBookingOpen(false);
    load();
  };

  const updateStatus = async (bk: Booking, status: Booking["status"]) => {
    setStatusUpdating(bk.id);
    const { error } = await supabase.from("bookings" as any).update({ status }).eq("id", bk.id);
    setStatusUpdating(null);
    if (error) toast.error(error.message);
    else { toast.success("Status diperbarui"); load(); }
  };

  // ── F-17: Reschedule functions ──────────────────────────────────────
  const openReschedule = (bk: Booking) => {
    setRescheduleBooking(bk);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setRescheduleDate(isoDate(tomorrow));
    setRescheduleSlots([]);
    setRescheduleSlot("");
    setRescheduleNote("");
    setRescheduleOpen(true);
  };

  const loadRescheduleSlots = useCallback(async (targetDate: string) => {
    if (!shop?.id || !rescheduleBooking) return;
    setLoadingRescheduleSlots(true);
    try {
      const { data } = await (supabase as any)
        .from("booking_slots")
        .select("*")
        .eq("shop_id", shop.id)
        .eq("slot_date", targetDate)
        .order("slot_time");
      const list: Slot[] = ((data ?? []) as any[])
        .map((s: any) => ({
          ...s,
          price: Number(s.price),
          duration_min: Number(s.duration_min ?? s.duration_minutes ?? 60),
          max_capacity: Number(s.max_capacity ?? s.capacity ?? 1),
          booked_count: Number(s.booked_count ?? 0),
        }))
        .filter((s: Slot) => {
          // Kecualikan slot yang sedang dipakai booking ini
          if (rescheduleBooking.slot_id === s.id) return false;
          // Kecualikan slot yang sudah penuh
          const avail = s.max_capacity - s.booked_count;
          return avail >= 1;
        });
      setRescheduleSlots(list);
      setRescheduleSlot("");
    } finally {
      setLoadingRescheduleSlots(false);
    }
  }, [shop?.id, rescheduleBooking]);

  const executeReschedule = async () => {
    if (!rescheduleBooking || !rescheduleSlot) {
      toast.error("Pilih slot tujuan terlebih dahulu");
      return;
    }
    setSavingReschedule(true);
    try {
      const { data, error } = await (supabase as any).rpc("reschedule_booking", {
        p_booking_id:  rescheduleBooking.id,
        p_new_slot_id: rescheduleSlot,
        p_note:        rescheduleNote.trim() || null,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      if (!data?.ok) {
        toast.error(data?.error ?? "Reschedule gagal");
        return;
      }
      const newSlot = rescheduleSlots.find(s => s.id === rescheduleSlot);
      toast.success(
        newSlot
          ? `Booking dipindahkan ke ${newSlot.service_name} — ${new Date(newSlot.slot_date + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" })} ${newSlot.slot_time}`
          : "Booking berhasil dipindahkan"
      );
      setRescheduleOpen(false);
      load();
    } finally {
      setSavingReschedule(false);
    }
  };

  const openRescheduleHistory = async (bookingId: string) => {
    setHistoryBookingId(bookingId);
    setHistoryOpen(true);
    setLoadingHistory(true);
    try {
      const { data } = await (supabase as any)
        .from("booking_reschedule_logs")
        .select(`
          *,
          old_slot:old_slot_id(service_name, slot_date, slot_time),
          new_slot:new_slot_id(service_name, slot_date, slot_time)
        `)
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      setRescheduleHistory((data ?? []) as RescheduleLog[]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const fmtDate = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const pendingCount = bookings.filter((b) => b.status === "pending").length;

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarCheck className="h-6 w-6" />
            {isTableMode ? "Reservasi Meja" : "Booking Jadwal Layanan"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isTableMode
              ? "Kelola meja/area dan konfirmasi reservasi pelanggan"
              : "Kelola slot waktu dan konfirmasi booking pelanggan"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setSlotOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            {isTableMode ? "Buat Meja" : "Buat Slot"}
          </Button>
        </div>
      </div>

      {/* Tabs: Layanan / Meja */}
      <div className="inline-flex rounded-lg border bg-muted/30 p-1">
        {(["service", "table"] as const).map((t) => (
          <button
            key={t}
            onClick={() => navigate({ search: { type: t } })}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              bookingType === t
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "service" ? "Layanan" : "Meja"}
          </button>
        ))}
      </div>

      {/* ─── Voucher Booking Card ─── */}
      <Card className="p-5 space-y-4 border-violet-200/60 bg-violet-50/30 dark:bg-violet-950/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-violet-600" />
            <div>
              <p className="font-semibold text-sm">Voucher Khusus Booking</p>
              <p className="text-xs text-muted-foreground">Buat kode diskon eksklusif untuk pelanggan yang booking online</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 border-violet-300 text-violet-700 hover:bg-violet-50 shrink-0"
            onClick={() => setVoucherOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" /> Buat Voucher
          </Button>
        </div>

        {vouchersLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : vouchers.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-3">
            Belum ada voucher — klik "Buat Voucher" untuk menambahkan
          </p>
        ) : (
          <div className="space-y-2">
            {vouchers.map(v => {
              const discLabel = v.discount_type === "percent"
                ? `${v.discount_value}% off`
                : `Rp ${Number(v.discount_value).toLocaleString("id-ID")} off`;
              const usageLabel = v.max_uses
                ? `${v.used_count}/${v.max_uses} terpakai`
                : `${v.used_count}× terpakai`;
              return (
                <div key={v.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${v.is_active ? "border-violet-200 bg-white dark:bg-card" : "border-border bg-muted/30 opacity-60"}`}>
                  <Tag className="h-4 w-4 text-violet-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-sm tracking-wide">{v.code}</span>
                      <Badge variant="secondary" className="text-[10px] bg-violet-100 text-violet-700">{discLabel}</Badge>
                      {!v.is_active && <Badge variant="outline" className="text-[10px]">Nonaktif</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {usageLabel}
                      {v.min_slot_price > 0 && ` · min. Rp ${Number(v.min_slot_price).toLocaleString("id-ID")}`}
                      {v.valid_until && ` · s/d ${new Date(v.valid_until).toLocaleDateString("id-ID")}`}
                    </p>
                    {v.description && <p className="text-xs text-muted-foreground truncate">{v.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleVoucher(v)}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-all ${v.is_active ? "border-violet-300 text-violet-700 hover:bg-violet-50" : "border-border text-muted-foreground hover:border-violet-300"}`}
                    >
                      {v.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>
                    <button onClick={() => deleteVoucher(v)} className="ml-1 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ─── Voucher Analytics Card ─── */}
      <Card className="p-5 space-y-4 border-indigo-200/60 bg-indigo-50/20 dark:bg-indigo-950/10">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <BarChart2 className="h-5 w-5 text-indigo-600" />
            <div>
              <p className="font-semibold text-sm">Analitik Voucher</p>
              <p className="text-xs text-muted-foreground">Pantau dampak diskon voucher terhadap booking</p>
            </div>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted/30 p-0.5">
            {(["7", "30", "90", "all"] as const).map(r => (
              <button
                key={r}
                onClick={() => setAnalyticsRange(r)}
                className={`rounded-md px-2.5 py-1 text-xs transition-colors ${analyticsRange === r ? "bg-background shadow-sm font-medium text-indigo-700" : "text-muted-foreground hover:text-foreground"}`}
              >
                {r === "all" ? "Semua" : `${r}h`}
              </button>
            ))}
          </div>
        </div>

        {analyticsLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : !analyticsLoaded || (voucherStats.length === 0 && totalRedemptions === 0) ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Belum ada booking yang menggunakan voucher
            {analyticsRange !== "all" && ` dalam ${analyticsRange} hari terakhir`}
          </div>
        ) : (
          <>
            {/* ── Summary stat cards ── */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-indigo-200/60 bg-white dark:bg-card p-3">
                <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Pemakaian</span>
                </div>
                <p className="text-2xl font-bold text-indigo-700">{totalRedemptions}×</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Total pemakaian voucher</p>
              </div>
              <div className="rounded-xl border border-rose-200/60 bg-white dark:bg-card p-3">
                <div className="flex items-center gap-1.5 text-rose-600 mb-1">
                  <TrendingDown className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Total Diskon</span>
                </div>
                <p className="text-xl font-bold text-rose-700 leading-tight">{formatIDR(totalDiscount)}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Nilai diskon diberikan</p>
              </div>
              <div className="rounded-xl border border-emerald-200/60 bg-white dark:bg-card p-3">
                <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
                  <Percent className="h-3.5 w-3.5" />
                  <span className="text-[10px] font-medium uppercase tracking-wide">Dampak</span>
                </div>
                <p className="text-xl font-bold text-emerald-700 leading-tight">
                  {totalOriginal > 0 ? `${Math.round((totalDiscount / totalOriginal) * 100)}%` : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Dari total booking</p>
              </div>
            </div>

            {/* ── Per-voucher breakdown ── */}
            {voucherStats.length > 0 && (
              <div className="space-y-2 pt-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Per Kode Voucher</p>
                {voucherStats.map(stat => {
                  const discountPct = stat.totalOriginalPrice > 0
                    ? Math.round((stat.totalDiscount / stat.totalOriginalPrice) * 100)
                    : 0;
                  const barWidth = totalDiscount > 0
                    ? Math.round((stat.totalDiscount / totalDiscount) * 100)
                    : 0;
                  return (
                    <div key={stat.code} className="rounded-xl border border-border bg-white dark:bg-card px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Tag className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                          <span className="font-mono font-bold text-sm tracking-wide text-indigo-700">{stat.code}</span>
                          <Badge variant="secondary" className="text-[10px] bg-indigo-100 text-indigo-700">
                            {stat.redemptions}× pakai
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-right">
                          <div>
                            <p className="text-muted-foreground">Diskon diberikan</p>
                            <p className="font-semibold text-rose-600">{formatIDR(stat.totalDiscount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Dari total booking</p>
                            <p className="font-semibold">{formatIDR(stat.totalOriginalPrice)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Dampak</p>
                            <p className="font-semibold text-emerald-600">{discountPct}%</p>
                          </div>
                        </div>
                      </div>
                      {/* Progress bar showing share of total discount */}
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 transition-all duration-500"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {barWidth}% dari total diskon yang diberikan
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Card>

      {/* ─── Deposit Settings Card ─── */}
      <Card className="p-5 space-y-4 border-amber-200/60 bg-amber-50/30 dark:bg-amber-950/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-semibold text-sm">Pengaturan Uang Muka (DP)</p>
              <p className="text-xs text-muted-foreground">Wajibkan pelanggan bayar DP saat booking online</p>
            </div>
          </div>
          <button
            onClick={() => setDepositEnabled(!depositEnabled)}
            className="text-amber-600 hover:text-amber-700 transition-colors"
            title={depositEnabled ? "Nonaktifkan deposit" : "Aktifkan deposit"}
          >
            {depositEnabled
              ? <ToggleRight className="h-8 w-8" />
              : <ToggleLeft className="h-8 w-8 text-muted-foreground" />
            }
          </button>
        </div>

        {depositEnabled && (
          <div className="space-y-3 pt-1 border-t border-amber-200/50">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Persentase DP (%)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    min={10}
                    max={100}
                    step={5}
                    value={depositPercent}
                    onChange={(e) => setDepositPercent(e.target.value)}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">% dari harga slot</span>
                </div>
                <div className="flex gap-1 mt-1.5 flex-wrap">
                  {["30", "50", "100"].map(p => (
                    <button
                      key={p}
                      onClick={() => setDepositPercent(p)}
                      className={`text-xs px-2 py-0.5 rounded-full border transition-all ${depositPercent === p ? "bg-amber-500 text-white border-amber-500" : "border-border hover:border-amber-400"}`}
                    >
                      {p}%{p === "100" ? " (Lunas)" : ""}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs">Info Pembayaran (rekening / VA / QRIS)</Label>
              <Textarea
                className="mt-1 text-sm"
                rows={3}
                value={depositNotes}
                onChange={(e) => setDepositNotes(e.target.value)}
                placeholder={"BCA 1234567890 a/n Toko Anda\nDana 0812xxx\n\nSertakan nama saat transfer"}
              />
              <p className="text-xs text-muted-foreground mt-1">Info ini ditampilkan ke pelanggan saat checkout booking</p>
            </div>
          </div>
        )}

        <Button
          size="sm"
          variant="outline"
          className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
          onClick={saveDepositSettings}
          disabled={savingDeposit}
        >
          {savingDeposit ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Simpan Pengaturan
        </Button>
      </Card>

      <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
        <Button variant="ghost" size="icon" onClick={prevDay}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="text-center">
          <p className="text-sm font-semibold">{fmtDate(date)}</p>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="text-xs text-muted-foreground bg-transparent text-center cursor-pointer"
          />
        </div>
        <Button variant="ghost" size="icon" onClick={nextDay}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4">
          <p className="text-2xl font-bold">{slots.length}</p>
          <p className="text-xs text-muted-foreground">Slot hari ini</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold">{bookings.length}</p>
          <p className="text-xs text-muted-foreground">Total booking</p>
        </Card>
        <Card className={`p-4 ${pendingCount > 0 ? "border-amber-200 bg-amber-50/30" : ""}`}>
          <p className={`text-2xl font-bold ${pendingCount > 0 ? "text-amber-700" : ""}`}>{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Menunggu konfirmasi</p>
        </Card>
      </div>

      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit flex-wrap">
        {(["bookings", "slots", "packages"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`rounded-md px-4 py-1.5 text-sm transition-colors ${
              view === v ? "bg-background shadow-sm font-medium" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {v === "bookings" ? "Booking Masuk" : v === "slots" ? "Slot Tersedia" : "Paket & Add-on"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : view === "packages" ? (
        /* ─── Packages & Add-ons Management (M-17) ─── */
        <div className="space-y-6">
          {pkgLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : (
            <>
              {/* ── Service Packages ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" /> Paket Layanan
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pembeli memilih satu paket saat booking (Basic / Standard / Premium, dll.)
                    </p>
                  </div>
                  <Button size="sm" onClick={openNewPkg} className="gap-1.5 shrink-0">
                    <Plus className="h-3.5 w-3.5" /> Tambah Paket
                  </Button>
                </div>

                {pkgList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                    Belum ada paket — klik "Tambah Paket" untuk mulai
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pkgList.map(pkg => {
                      const colorDot: Record<string, string> = {
                        blue: "bg-blue-500", green: "bg-emerald-500", purple: "bg-purple-500",
                        amber: "bg-amber-500", rose: "bg-rose-500",
                      };
                      return (
                        <Card key={pkg.id} className={`p-4 ${!pkg.is_active ? "opacity-60" : ""}`}>
                          <div className="flex items-center gap-3">
                            <div className={`h-3 w-3 rounded-full shrink-0 ${colorDot[pkg.color] ?? "bg-blue-500"}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{pkg.name}</span>
                                <span className="text-xs font-semibold text-primary">
                                  {pkg.price > 0 ? `+${formatIDR(pkg.price)}` : "Gratis"}
                                </span>
                                <Badge variant="outline" className="text-[10px]">Urutan #{pkg.sort_order}</Badge>
                                {!pkg.is_active && <Badge variant="outline" className="text-[10px] text-muted-foreground">Nonaktif</Badge>}
                              </div>
                              {pkg.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{pkg.description}</p>}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button onClick={() => openEditPkg(pkg)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                                <Edit2 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => togglePkg(pkg)}
                                className={`text-xs px-2 py-0.5 rounded-full border transition-all ${pkg.is_active ? "border-primary/30 text-primary hover:bg-primary/5" : "border-border text-muted-foreground hover:border-primary/30"}`}
                              >
                                {pkg.is_active ? "Nonaktifkan" : "Aktifkan"}
                              </button>
                              <button onClick={() => deletePkg(pkg)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── Add-ons ── */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" /> Add-on / Layanan Tambahan
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pembeli bisa pilih satu atau lebih add-on saat booking untuk menambah nilai transaksi
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={openNewAddon} className="gap-1.5 shrink-0">
                    <Plus className="h-3.5 w-3.5" /> Tambah Add-on
                  </Button>
                </div>

                {addonList.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
                    Belum ada add-on — klik "Tambah Add-on" untuk mulai
                  </div>
                ) : (
                  <div className="space-y-2">
                    {addonList.map(addon => (
                      <Card key={addon.id} className={`p-4 ${!addon.is_active ? "opacity-60" : ""}`}>
                        <div className="flex items-center gap-3">
                          <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-sm">{addon.name}</span>
                              <span className="text-xs font-semibold text-primary">
                                {addon.price > 0 ? `+${formatIDR(addon.price)}` : "Gratis"}
                              </span>
                              {!addon.is_active && <Badge variant="outline" className="text-[10px] text-muted-foreground">Nonaktif</Badge>}
                            </div>
                            {addon.description && <p className="text-xs text-muted-foreground mt-0.5 truncate">{addon.description}</p>}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => openEditAddon(addon)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => toggleAddon(addon)}
                              className={`text-xs px-2 py-0.5 rounded-full border transition-all ${addon.is_active ? "border-primary/30 text-primary hover:bg-primary/5" : "border-border text-muted-foreground hover:border-primary/30"}`}
                            >
                              {addon.is_active ? "Nonaktifkan" : "Aktifkan"}
                            </button>
                            <button onClick={() => deleteAddon(addon)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-xs font-semibold text-primary flex items-center gap-1.5 mb-1">
                  <Star className="h-3.5 w-3.5" /> Cara Kerja Paket &amp; Add-on
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Saat booking, pembeli akan melihat langkah tambahan untuk memilih paket layanan (mis. Basic/Standard/Premium) dan/atau add-on pilihan. Harga paket &amp; add-on dijumlahkan ke harga slot. Ini meningkatkan nilai transaksi rata-rata.
                </p>
              </div>
            </>
          )}
        </div>
      ) : view === "slots" ? (
        <div className="space-y-3">
          {slots.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground space-y-2">
              <p className="font-medium text-foreground">
                {isTableMode
                  ? "Belum ada meja/area untuk hari ini"
                  : "Belum ada slot layanan untuk hari ini"}
              </p>
              <p className="text-xs">
                {isTableMode
                  ? 'Klik "Buat Meja" untuk menambahkan meja/area beserta kapasitas tempat duduk.'
                  : 'Klik "Buat Slot" untuk membuka jadwal layanan baru.'}
              </p>
            </div>
          ) : slots.map((slot) => {
            const avail = slot.max_capacity - slot.booked_count;
            const wlEntries = waitlistMap[slot.id] ?? [];
            const wlCount = wlEntries.length;
            const isExpanded = expandedWaitlist[slot.id] ?? false;
            return (
              <Card key={slot.id} className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{slot.service_name}</span>
                      <Badge variant={avail === 0 ? "destructive" : "outline"} className="text-[10px]">
                        {avail === 0 ? "Penuh" : `${avail} slot tersisa`}
                      </Badge>
                      {wlCount > 0 && (
                        <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200 gap-1">
                          <Users className="h-2.5 w-2.5" /> {wlCount} antrean
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{slot.slot_time} ({slot.duration_min} menit)</span>
                      <span>{slot.booked_count}/{slot.max_capacity} booking</span>
                      {slot.price > 0 && <span>Rp {slot.price.toLocaleString("id-ID")}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {wlCount > 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-amber-300 text-amber-700 hover:bg-amber-50"
                        onClick={() => setExpandedWaitlist(p => ({ ...p, [slot.id]: !p[slot.id] }))}
                      >
                        <Users className="h-3.5 w-3.5" />
                        Antrean ({wlCount})
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      disabled={avail === 0}
                      onClick={() => openBooking(slot)}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Tambah Booking
                    </Button>
                  </div>
                </div>

                {/* ── Waitlist panel ── */}
                {isExpanded && wlCount > 0 && (
                  <div className="mt-4 border-t border-border pt-3 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" /> Daftar Antrean
                    </p>
                    {wlEntries.map((entry, idx) => (
                      <div
                        key={entry.id}
                        className={`rounded-lg border p-3 flex items-start justify-between gap-3 ${
                          entry.notified_at
                            ? "border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/10"
                            : "border-amber-100 bg-amber-50/30 dark:bg-amber-950/10"
                        }`}
                      >
                        <div className="text-xs space-y-0.5 min-w-0">
                          <p className="font-semibold flex items-center gap-1.5">
                            <span className="text-muted-foreground">#{idx + 1}</span>
                            {entry.customer_name}
                            {entry.party_size > 1 && <span className="text-muted-foreground">(×{entry.party_size})</span>}
                          </p>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {entry.customer_phone}
                          </p>
                          {entry.notes && <p className="text-muted-foreground italic truncate max-w-[200px]">"{entry.notes}"</p>}
                          {entry.notified_at && (
                            <p className="text-emerald-600 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Sudah dinotifikasi
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!entry.notified_at && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                              asChild
                              onClick={async () => {
                                // Mark as notified
                                await (supabase as any)
                                  .from("booking_waitlist")
                                  .update({ notified_at: new Date().toISOString() })
                                  .eq("id", entry.id);
                                load();
                              }}
                            >
                              <a
                                href={`https://wa.me/${entry.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                  `Halo ${entry.customer_name}, kabar baik! Ada slot yang terbuka untuk ${slot.service_name} pada ${new Date(slot.slot_date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })} jam ${slot.slot_time}. Apakah kamu masih berminat untuk booking?`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <BellRing className="h-3 w-3" /> Notif WA
                              </a>
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            onClick={async () => {
                              await (supabase as any)
                                .from("booking_waitlist")
                                .delete()
                                .eq("id", entry.id);
                              load();
                            }}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
              Belum ada booking untuk hari ini
            </div>
          ) : bookings.map((bk) => {
            const st = STATUS_BADGE[bk.status] ?? STATUS_BADGE.pending;
            return (
              <Card key={bk.id} className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-semibold">{bk.customer_name}</span>
                      {bk.party_size > 1 && <span className="text-xs text-muted-foreground">(×{bk.party_size})</span>}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {bk.customer_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{bk.customer_phone}</span>}
                      {bk.slot && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{bk.slot.slot_time} — {bk.slot.service_name}</span>}
                    </div>
                    {bk.notes && <p className="text-xs text-muted-foreground mt-1 italic">"{bk.notes}"</p>}

                    {/* SB-07: Catatan kunjungan merchant */}
                    <div className="mt-1.5">
                      {editingMerchantNotesId === bk.id ? (
                        <div className="flex items-start gap-1.5">
                          <Textarea
                            className="text-xs min-h-[60px] py-1.5"
                            placeholder="Catatan kunjungan (hanya terlihat oleh merchant)…"
                            value={merchantNotesDraft}
                            onChange={e => setMerchantNotesDraft(e.target.value)}
                            autoFocus
                          />
                          <div className="flex flex-col gap-1">
                            <Button
                              size="sm"
                              className="h-6 w-6 p-0"
                              disabled={savingMerchantNotes}
                              onClick={() => saveMerchantNotes(bk.id)}
                            >
                              {savingMerchantNotes ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => setEditingMerchantNotesId(null)}
                            >
                              <XCircle className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => {
                            setEditingMerchantNotesId(bk.id);
                            setMerchantNotesDraft(bk.merchant_notes ?? "");
                          }}
                        >
                          <FileText className="h-3 w-3" />
                          {bk.merchant_notes
                            ? <span className="italic truncate max-w-[200px]">{bk.merchant_notes}</span>
                            : "Tambah catatan kunjungan"}
                        </button>
                      )}
                    </div>

                    {bk.deposit_required && (
                      <div className="mt-1.5 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Banknote className="h-3 w-3 text-amber-500" />
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                            bk.deposit_status === "submitted"
                              ? "bg-amber-100 text-amber-700"
                              : bk.deposit_status === "paid"
                                ? "bg-emerald-100 text-emerald-700"
                                : bk.deposit_status === "verified"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : bk.deposit_status === "refunded"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-red-100 text-red-700"
                          }`}>
                            DP {bk.deposit_amount ? `Rp ${Number(bk.deposit_amount).toLocaleString("id-ID")}` : ""} ·{" "}
                            {bk.deposit_status === "submitted"
                              ? "Menunggu Verifikasi"
                              : bk.deposit_status === "paid"
                                ? "Lunas (Gateway)"
                                : bk.deposit_status === "verified"
                                  ? "Terverifikasi"
                                  : bk.deposit_status === "refunded"
                                    ? "Refunded"
                                    : "Belum Bayar"}
                          </span>
                          {bk.deposit_status === "submitted" && (
                            <button
                              className="text-[10px] text-emerald-600 hover:underline font-medium"
                              onClick={async () => {
                                await (supabase as any).from("bookings").update({ deposit_status: "verified" }).eq("id", bk.id);
                                toast.success("DP terverifikasi");
                                load();
                              }}
                            >
                              Verifikasi
                            </button>
                          )}
                        </div>

                        {/* Refund panel — shown for cancelled bookings with gateway-paid deposit */}
                        {bk.status === "cancelled" && bk.deposit_status === "paid" && (
                          <RefundPanel bookingId={bk.id} onRefunded={load} />
                        )}
                      </div>
                    )}
                    {(bk as any).package_name && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <Package className="h-3 w-3 text-primary shrink-0" />
                        <span className="text-[10px] text-muted-foreground">
                          Paket: <span className="font-medium text-foreground">{(bk as any).package_name}</span>
                          {(bk as any).package_price > 0 && (
                            <span className="text-primary"> +{formatIDR(Number((bk as any).package_price))}</span>
                          )}
                        </span>
                      </div>
                    )}
                    {(bk as any).addon_names_snapshot && (
                      <div className="flex items-start gap-1.5 mt-0.5">
                        <Plus className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                        <span className="text-[10px] text-muted-foreground">
                          Add-on: <span className="font-medium text-foreground">{(bk as any).addon_names_snapshot}</span>
                          {(bk as any).addon_total_price > 0 && (
                            <span className="text-primary"> +{formatIDR(Number((bk as any).addon_total_price))}</span>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                    {bk.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={statusUpdating === bk.id}
                          onClick={() => updateStatus(bk, "confirmed")}
                        >
                          <CheckCircle className="h-3 w-3 mr-1 text-green-600" />
                          Konfirmasi
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={statusUpdating === bk.id}
                          onClick={() => updateStatus(bk, "cancelled")}
                        >
                          <XCircle className="h-3 w-3 mr-1 text-red-500" />
                          Tolak
                        </Button>
                      </>
                    )}
                    {bk.status === "confirmed" && (
                      <>
                        {/* F-17: Tombol Reschedule */}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-950/30"
                          onClick={() => openReschedule(bk)}
                        >
                          <ArrowRightLeft className="h-3 w-3" />
                          Pindah Jadwal
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          disabled={statusUpdating === bk.id}
                          onClick={() => updateStatus(bk, "done")}
                        >
                          <CheckCircle className="h-3 w-3 mr-1 text-primary" />
                          Selesai
                        </Button>
                      </>
                    )}
                    {/* F-17: Riwayat reschedule (tampil jika ada) */}
                    {(bk as any).reschedule_count > 0 && (
                      <button
                        className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 underline decoration-dashed underline-offset-2"
                        onClick={() => openRescheduleHistory(bk.id)}
                        title="Lihat riwayat perpindahan jadwal"
                      >
                        <History className="h-3 w-3" />
                        {(bk as any).reschedule_count}× dipindah
                      </button>
                    )}
                    {bk.status === "done" && <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── F-17: Reschedule Dialog ─── */}
      <Dialog open={rescheduleOpen} onOpenChange={(open) => { setRescheduleOpen(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4 text-blue-600" />
              Pindah Jadwal Booking
            </DialogTitle>
          </DialogHeader>

          {rescheduleBooking && (
            <div className="space-y-4 mt-1">
              {/* Info booking saat ini */}
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 dark:bg-blue-950/20 dark:border-blue-800 p-3 space-y-1">
                <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                  <CalendarClock className="h-3.5 w-3.5" /> Jadwal Saat Ini
                </p>
                <p className="text-sm font-semibold">{rescheduleBooking.customer_name}</p>
                {rescheduleBooking.slot && (
                  <p className="text-xs text-muted-foreground">
                    {rescheduleBooking.slot.service_name} ·{" "}
                    {new Date(rescheduleBooking.slot.slot_date + "T00:00:00").toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · {rescheduleBooking.slot.slot_time}
                  </p>
                )}
              </div>

              {/* Pilih tanggal baru */}
              <div>
                <Label className="text-xs font-semibold">Pilih Tanggal Baru *</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={rescheduleDate}
                  min={isoDate(new Date())}
                  onChange={e => {
                    setRescheduleDate(e.target.value);
                    if (e.target.value) loadRescheduleSlots(e.target.value);
                  }}
                />
              </div>

              {/* Pilih slot baru */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <Label className="text-xs font-semibold">Pilih Slot Tujuan *</Label>
                  {rescheduleDate && (
                    <button
                      className="text-[11px] text-primary hover:underline"
                      onClick={() => loadRescheduleSlots(rescheduleDate)}
                      disabled={loadingRescheduleSlots}
                    >
                      {loadingRescheduleSlots ? "Memuat…" : "Muat ulang"}
                    </button>
                  )}
                </div>

                {!rescheduleDate ? (
                  <p className="text-xs text-muted-foreground py-3 text-center border border-dashed rounded-lg">
                    Pilih tanggal dulu untuk melihat slot tersedia
                  </p>
                ) : loadingRescheduleSlots ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : rescheduleSlots.length === 0 ? (
                  <div className="rounded-lg border border-dashed py-5 text-center text-xs text-muted-foreground">
                    Tidak ada slot tersedia di tanggal ini.
                    <br />
                    <span className="text-[11px]">Coba tanggal lain atau buat slot baru dulu.</span>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                    {rescheduleSlots.map(slot => {
                      const avail = slot.max_capacity - slot.booked_count;
                      const isSelected = rescheduleSlot === slot.id;
                      return (
                        <button
                          key={slot.id}
                          onClick={() => setRescheduleSlot(slot.id)}
                          className={`w-full text-left rounded-lg border px-3 py-2.5 transition-all text-sm ${
                            isSelected
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-500"
                              : "border-border hover:border-blue-300 hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="font-semibold">{slot.service_name}</span>
                              <span className="text-xs text-muted-foreground ml-2">{slot.slot_time} ({slot.duration_min} mnt)</span>
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${
                              avail <= 1 ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
                            }`}>
                              {avail} slot tersisa
                            </span>
                          </div>
                          {slot.price > 0 && (
                            <p className="text-xs text-muted-foreground mt-0.5">{formatIDR(slot.price)}</p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Catatan (opsional) */}
              <div>
                <Label className="text-xs font-semibold">Catatan Reschedule (opsional)</Label>
                <Input
                  className="mt-1 text-sm"
                  placeholder="cth: Permintaan pelanggan via WA"
                  value={rescheduleNote}
                  onChange={e => setRescheduleNote(e.target.value)}
                />
              </div>

              {/* Tombol aksi */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setRescheduleOpen(false)}
                  disabled={savingReschedule}
                >
                  Batal
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={executeReschedule}
                  disabled={savingReschedule || !rescheduleSlot}
                >
                  {savingReschedule
                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />Memindahkan…</>
                    : <><ArrowRightLeft className="h-3.5 w-3.5 mr-1.5" />Pindahkan Jadwal</>
                  }
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ─── F-17: Reschedule History Dialog ─── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-4 w-4 text-muted-foreground" />
              Riwayat Perpindahan Jadwal
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2">
            {loadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : rescheduleHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Tidak ada riwayat perpindahan jadwal
              </p>
            ) : (
              <div className="space-y-3">
                {rescheduleHistory.map((log, idx) => (
                  <div key={log.id} className="relative pl-5">
                    {idx < rescheduleHistory.length - 1 && (
                      <div className="absolute left-[7px] top-5 bottom-0 w-px bg-border" />
                    )}
                    <div className="absolute left-0 top-1 h-3.5 w-3.5 rounded-full border-2 border-blue-400 bg-background" />
                    <div className="rounded-lg border border-border p-3 space-y-1">
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <div className="flex items-center gap-2 text-xs flex-wrap">
                        <span className="text-muted-foreground line-through">
                          {log.old_slot?.service_name} · {log.old_slot?.slot_date ? new Date(log.old_slot.slot_date + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "-"} {log.old_slot?.slot_time}
                        </span>
                        <ArrowRightLeft className="h-3 w-3 text-blue-500 shrink-0" />
                        <span className="font-semibold text-foreground">
                          {log.new_slot?.service_name} · {log.new_slot?.slot_date ? new Date(log.new_slot.slot_date + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "-"} {log.new_slot?.slot_time}
                        </span>
                      </div>
                      {log.note && (
                        <p className="text-[11px] text-muted-foreground italic">"{log.note}"</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Create Voucher Dialog ─── */}
      <Dialog open={voucherOpen} onOpenChange={setVoucherOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Ticket className="h-4 w-4 text-violet-600" /> Buat Voucher Booking</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Kode Voucher *</Label>
              <Input
                className="mt-1 font-mono uppercase"
                placeholder="cth: BOOKING10"
                value={voucherForm.code}
                onChange={e => setVoucherForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              />
              <p className="text-[10px] text-muted-foreground mt-0.5">Otomatis diubah ke huruf kapital</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Jenis Diskon</Label>
                <select
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={voucherForm.discount_type}
                  onChange={e => setVoucherForm(f => ({ ...f, discount_type: e.target.value as "percent" | "fixed" }))}
                >
                  <option value="percent">Persen (%)</option>
                  <option value="fixed">Nominal (Rp)</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">Nilai Diskon *</Label>
                <div className="flex items-center gap-1 mt-1">
                  <Input
                    type="number"
                    min={1}
                    max={voucherForm.discount_type === "percent" ? 100 : undefined}
                    step={voucherForm.discount_type === "percent" ? 5 : 1000}
                    value={voucherForm.discount_value}
                    onChange={e => setVoucherForm(f => ({ ...f, discount_value: e.target.value }))}
                    placeholder={voucherForm.discount_type === "percent" ? "10" : "20000"}
                  />
                  <span className="text-sm text-muted-foreground shrink-0">{voucherForm.discount_type === "percent" ? "%" : "Rp"}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Min. Harga Slot (Rp)</Label>
                <Input
                  type="number"
                  min={0}
                  step={5000}
                  value={voucherForm.min_slot_price}
                  onChange={e => setVoucherForm(f => ({ ...f, min_slot_price: e.target.value }))}
                  className="mt-1"
                  placeholder="0 = semua harga"
                />
              </div>
              <div>
                <Label className="text-xs">Maks. Penggunaan</Label>
                <Input
                  type="number"
                  min={1}
                  value={voucherForm.max_uses}
                  onChange={e => setVoucherForm(f => ({ ...f, max_uses: e.target.value }))}
                  className="mt-1"
                  placeholder="Kosong = tak terbatas"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Berlaku mulai</Label>
                <Input type="date" value={voucherForm.valid_from} onChange={e => setVoucherForm(f => ({ ...f, valid_from: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs">Berlaku hingga</Label>
                <Input type="date" value={voucherForm.valid_until} onChange={e => setVoucherForm(f => ({ ...f, valid_until: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Deskripsi (opsional)</Label>
              <Input
                className="mt-1"
                placeholder="cth: Diskon untuk pelanggan baru"
                value={voucherForm.description}
                onChange={e => setVoucherForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setVoucherOpen(false)}>Batal</Button>
              <Button className="flex-1 bg-violet-600 hover:bg-violet-700" onClick={saveVoucher} disabled={savingVoucher}>
                {savingVoucher ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Ticket className="h-3.5 w-3.5 mr-1" />}
                {savingVoucher ? "Menyimpan…" : "Buat Voucher"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Package Dialog ─── */}
      <Dialog open={pkgDialogOpen} onOpenChange={setPkgDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              {editingPkg ? "Edit Paket" : "Tambah Paket Layanan"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Nama Paket *</Label>
              <Input
                className="mt-1"
                placeholder="cth: Basic, Standard, Premium"
                value={pkgForm.name}
                onChange={e => setPkgForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Deskripsi (opsional)</Label>
              <Textarea
                className="mt-1 text-sm resize-none"
                rows={2}
                placeholder="Jelaskan apa yang termasuk dalam paket ini"
                value={pkgForm.description}
                onChange={e => setPkgForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Harga Tambahan (Rp)</Label>
                <Input
                  type="number"
                  min={0}
                  step={5000}
                  className="mt-1"
                  placeholder="0 = Gratis"
                  value={pkgForm.price}
                  onChange={e => setPkgForm(f => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Urutan tampil</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1"
                  value={pkgForm.sort_order}
                  onChange={e => setPkgForm(f => ({ ...f, sort_order: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Warna Aksen</Label>
              <div className="flex gap-2 mt-1.5">
                {PKG_COLORS.map(c => {
                  const bg: Record<string, string> = {
                    blue: "bg-blue-500", green: "bg-emerald-500", purple: "bg-purple-500",
                    amber: "bg-amber-500", rose: "bg-rose-500",
                  };
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setPkgForm(f => ({ ...f, color: c.value }))}
                      className={`h-7 w-7 rounded-full ${bg[c.value]} transition-all ${pkgForm.color === c.value ? "ring-2 ring-offset-2 ring-foreground/40 scale-110" : "opacity-60 hover:opacity-100"}`}
                      title={c.label}
                    />
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setPkgDialogOpen(false)}>Batal</Button>
              <Button className="flex-1" onClick={savePkg} disabled={savingPkg}>
                {savingPkg ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                {savingPkg ? "Menyimpan…" : (editingPkg ? "Simpan Perubahan" : "Tambah Paket")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Add-on Dialog ─── */}
      <Dialog open={addonDialogOpen} onOpenChange={setAddonDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              {editingAddon ? "Edit Add-on" : "Tambah Add-on"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-xs">Nama Add-on *</Label>
              <Input
                className="mt-1"
                placeholder="cth: Perawatan Ekstra, Foto Dokumentasi, dll."
                value={addonForm.name}
                onChange={e => setAddonForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs">Deskripsi (opsional)</Label>
              <Textarea
                className="mt-1 text-sm resize-none"
                rows={2}
                placeholder="Jelaskan apa yang termasuk dalam add-on ini"
                value={addonForm.description}
                onChange={e => setAddonForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Harga (Rp)</Label>
                <Input
                  type="number"
                  min={0}
                  step={5000}
                  className="mt-1"
                  placeholder="0 = Gratis"
                  value={addonForm.price}
                  onChange={e => setAddonForm(f => ({ ...f, price: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-xs">Urutan tampil</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1"
                  value={addonForm.sort_order}
                  onChange={e => setAddonForm(f => ({ ...f, sort_order: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setAddonDialogOpen(false)}>Batal</Button>
              <Button className="flex-1" onClick={saveAddon} disabled={savingAddon}>
                {savingAddon ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                {savingAddon ? "Menyimpan…" : (editingAddon ? "Simpan Perubahan" : "Tambah Add-on")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={slotOpen} onOpenChange={setSlotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Buat Slot Baru</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label>Nama Layanan *</Label>
              <Input value={slotForm.service_name} onChange={(e) => setSlotForm((f) => ({ ...f, service_name: e.target.value }))} placeholder="cth: Konsultasi, Fotografi, Potong Rambut" className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tanggal</Label>
                <Input type="date" value={slotForm.slot_date} onChange={(e) => setSlotForm((f) => ({ ...f, slot_date: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Jam mulai</Label>
                <Input type="time" value={slotForm.slot_time} onChange={(e) => setSlotForm((f) => ({ ...f, slot_time: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Durasi (mnt)</Label>
                <Input type="number" min={15} step={15} value={slotForm.duration_min} onChange={(e) => setSlotForm((f) => ({ ...f, duration_min: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Kapasitas</Label>
                <Input type="number" min={1} value={slotForm.max_capacity} onChange={(e) => setSlotForm((f) => ({ ...f, max_capacity: e.target.value }))} className="mt-1" />
              </div>
              <div>
                <Label>Harga (Rp)</Label>
                <Input type="number" min={0} value={slotForm.price} onChange={(e) => setSlotForm((f) => ({ ...f, price: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Catatan</Label>
              <Textarea value={slotForm.notes} onChange={(e) => setSlotForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="mt-1" placeholder="Opsional" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setSlotOpen(false)}>Batal</Button>
              <Button className="flex-1" onClick={saveSlot} disabled={savingSlot}>{savingSlot ? "Menyimpan…" : "Buat Slot"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Tambah Booking Manual</DialogTitle></DialogHeader>
          {bookingSlot && (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs mt-1">
              <strong>{bookingSlot.service_name}</strong> · {bookingSlot.slot_time} · {bookingSlot.duration_min} mnt
            </div>
          )}
          <div className="space-y-3 mt-1">
            <div>
              <Label>Nama Pelanggan *</Label>
              <Input value={bookingForm.customer_name} onChange={(e) => setBookingForm((f) => ({ ...f, customer_name: e.target.value }))} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>No. WhatsApp</Label>
                <Input value={bookingForm.customer_phone} onChange={(e) => setBookingForm((f) => ({ ...f, customer_phone: e.target.value }))} placeholder="08xx" className="mt-1" />
              </div>
              <div>
                <Label>Jumlah Orang</Label>
                <Input type="number" min={1} value={bookingForm.party_size} onChange={(e) => setBookingForm((f) => ({ ...f, party_size: e.target.value }))} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Catatan</Label>
              <Textarea value={bookingForm.notes} onChange={(e) => setBookingForm((f) => ({ ...f, notes: e.target.value }))} rows={2} className="mt-1" placeholder="Opsional" />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setBookingOpen(false)}>Batal</Button>
              <Button className="flex-1" onClick={saveBooking} disabled={savingBooking}>{savingBooking ? "Menyimpan…" : "Konfirmasi Booking"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
