import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Store, CalendarCheck, Clock, ChevronLeft, ChevronRight,
  CheckCircle2, Loader2, Phone, User, MessageSquare, Users,
  ArrowLeft, ShieldCheck, Star, Scissors, UserCheck, Banknote, Copy, Check,
  AlertTriangle, Ticket, Tag, X, XCircle, Package, Plus,
  FileText, Upload, Trash2, CreditCard, Car,
  QrCode, Smartphone, Wallet, ExternalLink, Zap, ListOrdered,
  MapPin, Building2, Trees, Home,
} from "lucide-react";
import { formatIDR } from "@/lib/format";
import { initiatePayment, openMidtransSnap, getPaymentStatus } from "@/lib/payment-gateway";

export const Route = createFileRoute("/toko/$slug/booking")({
  component: PublicBookingPage,
});

type Shop = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  kyc_status: string | null;
  require_deposit: boolean | null;
  deposit_percent: number | null;
  deposit_notes: string | null;
  require_id_upload: boolean | null;
};

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

type Staff = {
  id: string;
  name: string;
  photo_url: string | null;
  specialization: string | null;
  is_available: boolean;
};

type Step = "date" | "slot" | "staff" | "location" | "packages" | "document" | "form" | "deposit" | "success" | "waitlist" | "waitlist_success";

type StudioLocation = {
  id: string;
  name: string;
  location_type: "studio" | "outdoor" | "client";
  address: string | null;
  description: string | null;
  extra_fee: number;
  travel_radius_km: number | null;
};

const LOCATION_META: Record<StudioLocation["location_type"], { label: string; icon: typeof Building2; color: string }> = {
  studio:  { label: "Di studio",    icon: Building2, color: "text-blue-600 bg-blue-50" },
  outdoor: { label: "Outdoor",      icon: Trees,     color: "text-emerald-600 bg-emerald-50" },
  client:  { label: "Lokasi klien", icon: Home,      color: "text-amber-600 bg-amber-50" },
};

type ServicePackage = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  color: string | null;
  sort_order: number;
};

type BookingAddon = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  sort_order: number;
};

const NO_PREF_STAFF_ID = "__any__";

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long",
  });
}

function fmtTime(t: string) {
  return t.slice(0, 5);
}

export default function PublicBookingPage() {
  const { slug } = Route.useParams();

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [allSlots, setAllSlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);

  const [staffList, setStaffList] = useState<Staff[]>([]);

  // Wizard state
  const [step, setStep] = useState<Step>("date");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<string>(NO_PREF_STAFF_ID);
  const [calOffset, setCalOffset] = useState(0);

  // Customer form
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("1");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [cancellationToken, setCancellationToken] = useState<string | null>(null);
  const [waitlistPosition, setWaitlistPosition] = useState<number | null>(null);
  const [confirmingDeposit, setConfirmingDeposit] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cancelLinkCopied, setCancelLinkCopied] = useState(false);

  // Gateway config + deposit payment state
  const [gatewayConfig, setGatewayConfig] = useState<{
    midtrans_enabled: boolean;
    midtrans_client_key: string | null;
    midtrans_mode: string;
    xendit_enabled: boolean;
  } | null>(null);
  const [depositPaymentMethod, setDepositPaymentMethod] = useState("transfer");
  const [depositProcessing, setDepositProcessing] = useState(false);
  const [xenditPaymentUrl, setXenditPaymentUrl] = useState<string | null>(null);
  const [xenditTxId, setXenditTxId] = useState<string | null>(null);
  const [depositPolling, setDepositPolling] = useState(false);
  const depositPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Voucher state
  const [voucherInput, setVoucherInput] = useState("");
  const [voucherApplying, setVoucherApplying] = useState(false);
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    discountAmount: number;
    finalPrice: number;
  } | null>(null);

  // Waitlist state (M-12)
  const [waitlistSlot, setWaitlistSlot] = useState<Slot | null>(null);
  const [waitlistName, setWaitlistName] = useState("");
  const [waitlistPhone, setWaitlistPhone] = useState("");
  const [waitlistSize, setWaitlistSize] = useState("1");
  const [waitlistSaving, setWaitlistSaving] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState(false);

  // Packages & Add-ons state (M-17)
  const [packages, setPackages] = useState<ServicePackage[]>([]);
  const [addons, setAddons] = useState<BookingAddon[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<ServicePackage | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<Set<string>>(new Set());
  const [packagesLoaded, setPackagesLoaded] = useState(false);

  // Studio locations (SF-03)
  const [locations, setLocations] = useState<StudioLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<StudioLocation | null>(null);
  const [locationsLoaded, setLocationsLoaded] = useState(false);

  // Document upload state (M-16)
  const [docUrl, setDocUrl] = useState<string | null>(null);
  const [docType, setDocType] = useState<"ktp" | "sim">("ktp");
  const [docUploading, setDocUploading] = useState(false);

  // Load shop
  useEffect(() => {
    (async () => {
      const { data: s } = await supabase
        .from("coffee_shops" as any)
        .select("id, name, slug, logo_url, tagline, address, phone, rating_avg, rating_count, kyc_status, require_deposit, deposit_percent, deposit_notes, require_id_upload")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (!s) { setNotFound(true); setLoading(false); return; }
      setShop(s as unknown as Shop);
      setLoading(false);
    })();
  }, [slug]);

  // Load slots (next 30 days)
  const loadSlots = useCallback(async (shopId: string) => {
    setSlotsLoading(true);
    const today = isoDate(new Date());
    const end = isoDate(addDays(new Date(), 30));
    const { data } = await supabase
      .from("booking_slots" as any)
      .select("*")
      .eq("shop_id" as any, shopId)
      .gte("slot_date" as any, today)
      .lte("slot_date" as any, end)
      .order("slot_date" as any)
      .order("slot_time" as any) as any;
    setAllSlots((data ?? []) as Slot[]);
    setSlotsLoading(false);
  }, []);

  // Load staff — graceful: if table missing or empty, staffList stays []
  const loadStaff = useCallback(async (shopId: string) => {
    try {
      const { data } = await supabase
        .from("booking_staff" as any)
        .select("id, name, photo_url, specialization, is_available")
        .eq("shop_id" as any, shopId)
        .eq("is_available" as any, true)
        .order("name" as any) as any;
      setStaffList((data ?? []) as Staff[]);
    } catch {
      setStaffList([]);
    }
  }, []);

  // Load service packages + add-ons (M-17) — graceful: skip if table missing
  const loadPackages = useCallback(async (shopId: string) => {
    try {
      const [pkgs, ads] = await Promise.all([
        (supabase as any)
          .from("booking_service_packages")
          .select("*")
          .eq("shop_id", shopId)
          .eq("is_active", true)
          .order("sort_order")
          .order("created_at"),
        (supabase as any)
          .from("booking_addons")
          .select("*")
          .eq("shop_id", shopId)
          .eq("is_active", true)
          .order("sort_order")
          .order("created_at"),
      ]);
      setPackages((pkgs.data ?? []) as ServicePackage[]);
      setAddons((ads.data ?? []) as BookingAddon[]);
    } catch {
      setPackages([]);
      setAddons([]);
    } finally {
      setPackagesLoaded(true);
    }
  }, []);

  // Load studio locations (SF-03) — graceful: skip if table empty
  const loadLocations = useCallback(async (shopId: string) => {
    try {
      const { data } = await (supabase as any)
        .from("studio_locations")
        .select("id, name, location_type, address, description, extra_fee, travel_radius_km")
        .eq("shop_id", shopId)
        .eq("is_active", true)
        .order("sort_order");
      setLocations((data ?? []) as StudioLocation[]);
    } catch {
      setLocations([]);
    } finally {
      setLocationsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (shop?.id) {
      loadSlots(shop.id);
      loadStaff(shop.id);
      loadPackages(shop.id);
      loadLocations(shop.id);
    }
  }, [shop?.id, loadSlots, loadStaff, loadPackages, loadLocations]);

  // Load gateway config + Midtrans Snap.js
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/payments/gateway-config");
        if (!res.ok) return;
        const cfg = await res.json() as typeof gatewayConfig;
        setGatewayConfig(cfg);
        if (cfg?.midtrans_enabled && cfg?.midtrans_client_key) {
          const existing = document.querySelector('script[src*="snap.js"]');
          if (!existing) {
            const script = document.createElement("script");
            const isSandbox = cfg.midtrans_mode !== "production";
            script.src = isSandbox
              ? "https://app.sandbox.midtrans.com/snap/snap.js"
              : "https://app.midtrans.com/snap/snap.js";
            script.setAttribute("data-client-key", cfg.midtrans_client_key);
            document.head.appendChild(script);
          }
        }
      } catch {
        // gateway config unavailable — transfer-only fallback
      }
    })();
  }, []);

  // ── Deposit payment status polling ────────────────────────────────────────
  // Starts when a gateway payment link is open; stops on success / failure / step change.
  useEffect(() => {
    const shouldPoll =
      step === "deposit" &&
      !!bookingId &&
      bookingId !== "ok" &&
      !!xenditPaymentUrl; // only poll once a gateway payment has been initiated

    if (!shouldPoll) {
      if (depositPollRef.current) {
        clearInterval(depositPollRef.current);
        depositPollRef.current = null;
        setDepositPolling(false);
      }
      return;
    }

    // Guard: don't create duplicate intervals
    if (depositPollRef.current) return;

    setDepositPolling(true);
    const orderId = `booking-${bookingId}`;

    depositPollRef.current = setInterval(async () => {
      try {
        const result = await getPaymentStatus(orderId);
        if (result.status === "paid") {
          clearInterval(depositPollRef.current!);
          depositPollRef.current = null;
          setDepositPolling(false);
          await markDepositPaid(result.transaction_id);
        } else if (result.status === "failed" || result.status === "expired") {
          clearInterval(depositPollRef.current!);
          depositPollRef.current = null;
          setDepositPolling(false);
          toast.error("Pembayaran gagal atau kedaluwarsa. Silakan coba lagi.");
        }
        // "pending" → keep polling
      } catch {
        // network hiccup — silently retry next tick
      }
    }, 5000);

    return () => {
      if (depositPollRef.current) {
        clearInterval(depositPollRef.current);
        depositPollRef.current = null;
      }
    };
  // markDepositPaid is stable (defined in component body, no external deps that change)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, bookingId, xenditPaymentUrl]);

  const hasStaff     = staffList.length > 0;
  const hasPackages  = packagesLoaded && (packages.length > 0 || addons.length > 0);
  const hasLocations = locationsLoaded && locations.length > 0;
  const needsDoc     = !!(shop?.require_id_upload);

  // Document upload helper (M-16)
  const uploadDoc = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error("Ukuran file maksimal 5MB"); return; }
    setDocUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `booking-docs/${Date.now()}-${docType}.${ext}`;
    const { error } = await supabase.storage.from("booking-documents").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Gagal upload dokumen: " + error.message);
      setDocUploading(false);
      return;
    }
    const { data: { publicUrl } } = supabase.storage.from("booking-documents").getPublicUrl(path);
    setDocUrl(publicUrl);
    toast.success("Dokumen berhasil diupload");
    setDocUploading(false);
  };

  // Derived
  const availableDates = [...new Set(
    allSlots
      .filter(s => s.booked_count < s.max_capacity)
      .map(s => s.slot_date)
  )];

  const waitlistDates = [...new Set(
    allSlots
      .filter(s => s.booked_count >= s.max_capacity)
      .map(s => s.slot_date)
      .filter(d => !availableDates.includes(d))
  )];

  const calStart = addDays(new Date(), calOffset * 7);
  const calDays = Array.from({ length: 14 }, (_, i) => isoDate(addDays(calStart, i)));

  // Include full slots so customers can join waitlist
  const slotsForDate = allSlots.filter(s => s.slot_date === selectedDate);

  const selectedStaff  = staffList.find(s => s.id === selectedStaffId) ?? null;
  const selectedAddons = addons.filter(a => selectedAddonIds.has(a.id));

  // Step labels — dynamic based on staff + packages + id-upload availability
  const stepKeys: Step[] = [
    "date", "slot",
    ...(hasStaff    ? ["staff"    as Step] : []),
    ...(hasPackages ? ["packages" as Step] : []),
    ...(needsDoc    ? ["document" as Step] : []),
    "form",
  ];
  const stepLabels = [
    "Pilih Tanggal", "Pilih Waktu",
    ...(hasStaff    ? ["Pilih Staff"]    : []),
    ...(hasPackages ? ["Paket & Add-on"] : []),
    ...(needsDoc    ? ["Upload Dokumen"] : []),
    "Isi Data",
  ];

  const afterSlot     = hasStaff ? "staff" : (hasPackages ? "packages" : (needsDoc ? "document" : "form"));
  const afterStaff    = hasPackages ? "packages" : (needsDoc ? "document" : "form");
  const afterPackages = needsDoc ? "document" : "form";
  const afterDoc      = "form" as Step;

  // Apply voucher code
  const applyVoucher = async () => {
    if (!shop?.id || !selectedSlot || !voucherInput.trim()) return;
    setVoucherApplying(true);
    try {
      const { data, error } = await (supabase as any).rpc("fn_use_booking_voucher", {
        p_shop_id: shop.id,
        p_code: voucherInput.trim(),
        p_slot_price: selectedSlot.price,
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) {
        toast.error(data?.error ?? "Voucher tidak valid");
      } else {
        setAppliedVoucher({
          code: data.code,
          discountAmount: Number(data.discount_amount),
          finalPrice: Number(data.final_price),
        });
        toast.success(`Voucher "${data.code}" berhasil! Hemat ${formatIDR(Number(data.discount_amount))}`);
        setVoucherInput("");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menerapkan voucher");
    } finally {
      setVoucherApplying(false);
    }
  };

  const removeVoucher = () => {
    setAppliedVoucher(null);
    setVoucherInput("");
  };

  // Computed effective price = slot (after voucher) + package + add-ons
  const addonTotal    = selectedAddons.reduce((s, a) => s + a.price, 0);
  const packageExtra  = selectedPackage?.price ?? 0;
  const basePrice     = appliedVoucher ? appliedVoucher.finalPrice : (selectedSlot?.price ?? 0);
  const effectivePrice = basePrice + packageExtra + addonTotal;

  // Computed deposit amount (based on full effective price)
  const depositAmount = (() => {
    if (!shop?.require_deposit || !selectedSlot) return 0;
    const pct = shop.deposit_percent ?? 50;
    return Math.ceil((effectivePrice * pct) / 100);
  })();

  const submit = async () => {
    if (!selectedSlot || !shop) return;
    if (!name.trim()) { toast.error("Nama wajib diisi"); return; }
    if (!phone.trim()) { toast.error("Nomor WhatsApp wajib diisi"); return; }
    const party = Math.max(1, Number(partySize) || 1);

    setSubmitting(true);
    try {
      const { data: fresh } = await supabase
        .from("booking_slots" as any)
        .select("booked_count, max_capacity")
        .eq("id" as any, selectedSlot.id)
        .maybeSingle() as any;
      if (fresh && fresh.booked_count >= fresh.max_capacity) {
        toast.error("Slot ini sudah penuh. Silakan pilih slot lain.");
        setStep("slot");
        setSubmitting(false);
        return;
      }

      const staffId = selectedStaffId !== NO_PREF_STAFF_ID ? selectedStaffId : null;
      const staffName = selectedStaff?.name ?? null;
      const needsDeposit = !!(shop.require_deposit && effectivePrice > 0);

      const { data: bk, error } = await supabase
        .from("bookings" as any)
        .insert({
          slot_id: selectedSlot.id,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          party_size: party,
          notes: notes.trim() || null,
          status: "pending",
          ...(staffId ? { staff_id: staffId } : {}),
          ...(needsDeposit ? {
            deposit_required: true,
            deposit_amount: depositAmount,
            deposit_status: "waiting_payment",
          } : {}),
          ...(appliedVoucher ? {
            voucher_code: appliedVoucher.code,
            voucher_discount: appliedVoucher.discountAmount,
          } : {}),
          ...(selectedPackage ? {
            package_id: selectedPackage.id,
            package_name: selectedPackage.name,
            package_price: selectedPackage.price,
          } : {}),
          ...(selectedAddons.length > 0 ? {
            addon_ids: selectedAddons.map(a => a.id),
            addon_names_snapshot: selectedAddons.map(a => a.name).join(", "),
            addon_total_price: addonTotal,
          } : {}),
          ...(docUrl ? {
            document_url: docUrl,
            document_type: docType,
          } : {}),
        } as any)
        .select("id, cancellation_token")
        .maybeSingle() as any;
      if (error) throw error;

      await supabase
        .from("booking_slots" as any)
        .update({ booked_count: (fresh?.booked_count ?? 0) + 1 } as any)
        .eq("id" as any, selectedSlot.id);

      const voucherNote = appliedVoucher
        ? ` · Voucher: ${appliedVoucher.code} (-${formatIDR(appliedVoucher.discountAmount)})`
        : "";

      await supabase
        .from("owner_notifications" as any)
        .insert({
          shop_id: shop.id,
          type: needsDeposit ? "new_booking_deposit" : "new_booking",
          title: `📅 Booking baru dari ${name.trim()}`,
          body: `${selectedSlot.service_name}${staffName ? ` · ${staffName}` : ""}${selectedPackage ? ` · Paket: ${selectedPackage.name}` : ""}${selectedAddons.length > 0 ? ` · Add-on: ${selectedAddons.map(a => a.name).join(", ")}` : ""} · ${fmtDate(selectedSlot.slot_date)} ${fmtTime(selectedSlot.slot_time)}${party > 1 ? ` · ${party} orang` : ""} · WA: ${phone.trim()}${needsDeposit ? ` · DP: ${formatIDR(depositAmount)}` : ""}${voucherNote}`,
          severity: "info",
          link: "/pos-app/booking",
          dedupe_key: `booking_${bk?.id ?? Date.now()}`,
        } as any);

      setBookingId(bk?.id ?? "ok");
      setCancellationToken(bk?.cancellation_token ?? null);
      if (needsDeposit) {
        setStep("deposit");
      } else {
        setStep("success");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat booking");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeposit = async () => {
    if (!bookingId || bookingId === "ok") { setStep("success"); return; }
    setConfirmingDeposit(true);
    try {
      await supabase
        .from("bookings" as any)
        .update({ deposit_status: "submitted" } as any)
        .eq("id" as any, bookingId);

      if (shop?.id) {
        await supabase.from("owner_notifications" as any).insert({
          shop_id: shop.id,
          type: "deposit_submitted",
          title: `💰 Bukti DP dikirim — ${name.trim()}`,
          body: `${selectedSlot?.service_name} · ${fmtDate(selectedSlot?.slot_date ?? "")} · DP ${formatIDR(depositAmount)} telah dikonfirmasi pelanggan`,
          severity: "info",
          link: "/pos-app/booking",
          dedupe_key: `deposit_${bookingId}`,
        } as any);
      }
      toast.success("Konfirmasi pembayaran terkirim!");
      setStep("success");
    } catch {
      setStep("success");
    } finally {
      setConfirmingDeposit(false);
    }
  };

  const markDepositPaid = async (txId?: string) => {
    if (!bookingId || bookingId === "ok") { setStep("success"); return; }
    try {
      await supabase
        .from("bookings" as any)
        .update({ deposit_status: "paid" } as any)
        .eq("id" as any, bookingId);
      if (shop?.id) {
        await supabase.from("owner_notifications" as any).insert({
          shop_id: shop.id,
          type: "deposit_paid",
          title: `✅ DP LUNAS — ${name.trim()}`,
          body: `${selectedSlot?.service_name} · ${fmtDate(selectedSlot?.slot_date ?? "")} · DP ${formatIDR(depositAmount)} LUNAS via payment gateway${txId ? ` (TX: ${txId})` : ""}`,
          severity: "info",
          link: "/pos-app/booking",
          dedupe_key: `deposit_paid_${bookingId}`,
        } as any);
      }
      toast.success("Pembayaran DP berhasil! Booking Anda dikonfirmasi.");
      setStep("success");
    } catch {
      toast.success("Pembayaran berhasil!");
      setStep("success");
    }
  };

  const initiateDepositPayment = async () => {
    if (!bookingId || !shop || !selectedSlot) return;
    if (depositPaymentMethod === "transfer") {
      await confirmDeposit();
      return;
    }
    setDepositProcessing(true);
    try {
      const orderId = `booking-${bookingId}`;
      const result = await initiatePayment({
        order_id: orderId,
        amount: depositAmount,
        payment_method: depositPaymentMethod,
        customer_name: name,
        customer_phone: phone,
        items: [{
          id: selectedSlot.id,
          name: `DP Booking: ${selectedSlot.service_name}`,
          price: depositAmount,
          quantity: 1,
        }],
        success_redirect_url: window.location.href,
        failure_redirect_url: window.location.href,
      });

      if (result.gateway === "midtrans" && result.snap_token) {
        openMidtransSnap(result.snap_token, {
          onSuccess: async () => {
            await markDepositPaid(result.transaction_id);
            setDepositProcessing(false);
          },
          onPending: () => {
            toast.info("Pembayaran sedang diproses, menunggu konfirmasi.");
            setDepositProcessing(false);
          },
          onError: () => {
            toast.error("Pembayaran gagal. Silakan coba lagi atau pilih metode lain.");
            setDepositProcessing(false);
          },
          onClose: () => {
            setDepositProcessing(false);
          },
        });
      } else if (result.gateway === "xendit" && result.payment_url) {
        setXenditPaymentUrl(result.payment_url);
        setXenditTxId(result.transaction_id);
        window.open(result.payment_url, "_blank");
        setDepositProcessing(false);
        toast.info("Selesaikan pembayaran di tab baru, lalu kembali ke sini untuk konfirmasi.");
      } else {
        await markDepositPaid(result.transaction_id);
        setDepositProcessing(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal memulai pembayaran. Coba lagi.");
      setDepositProcessing(false);
    }
  };

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function joinWaitlist() {
    if (!waitlistSlot || !shop) return;
    if (!waitlistName.trim()) { toast.error("Nama wajib diisi"); return; }
    if (!waitlistPhone.trim()) { toast.error("Nomor WhatsApp wajib diisi"); return; }
    setWaitlistSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("booking_waitlists")
        .insert({
          slot_id: waitlistSlot.id,
          shop_id: shop.id,
          customer_name: waitlistName.trim(),
          customer_phone: waitlistPhone.trim(),
          party_size: Math.max(1, Number(waitlistSize) || 1),
          status: "waiting",
        });
      if (error) throw error;
      setWaitlistDone(true);
      toast.success("Berhasil masuk daftar tunggu! Kami akan menghubungi kamu jika ada slot kosong.");
    } catch (e: any) {
      toast.error(e.message ?? "Gagal mendaftar waitlist");
    } finally {
      setWaitlistSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceHeader />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <MarketplaceFooter />
      </div>
    );
  }

  if (notFound || !shop) {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceHeader />
        <div className="mx-auto max-w-2xl px-4 py-24 text-center">
          <h1 className="text-2xl font-bold">Toko tidak ditemukan</h1>
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">← Beranda</Link>
        </div>
        <MarketplaceFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />

      {/* Shop header strip */}
      <div className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-2xl px-4 py-5">
          <Link
            to="/toko/$slug"
            params={{ slug }}
            className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke toko
          </Link>
          <div className="flex items-center gap-3">
            {shop.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="h-14 w-14 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 shrink-0">
                <Store className="h-7 w-7 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-lg font-bold leading-tight">{shop.name}</h1>
                {shop.kyc_status === "approved" && (
                  <ShieldCheck className="h-4 w-4 text-green-500 shrink-0" />
                )}
              </div>
              {shop.tagline && <p className="text-sm text-muted-foreground mt-0.5 truncate">{shop.tagline}</p>}
              {shop.rating_avg && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {Number(shop.rating_avg).toFixed(1)} ({shop.rating_count ?? 0} ulasan)
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 py-6">

        {/* Step indicator — dynamic */}
        {step !== "success" && (
          <div className="mb-6 flex items-center gap-2">
            {stepKeys.map((s, i) => {
              const idx = stepKeys.indexOf(step);
              const done = i < idx;
              const active = i === idx;
              return (
                <div key={s} className="flex items-center gap-2 flex-1">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shrink-0 transition-colors ${
                    done ? "bg-primary text-primary-foreground" :
                    active ? "bg-primary/20 text-primary ring-2 ring-primary" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${active ? "text-primary" : "text-muted-foreground"}`}>
                    {stepLabels[i]}
                  </span>
                  {i < stepKeys.length - 1 && <div className="flex-1 h-px bg-border" />}
                </div>
              );
            })}
          </div>
        )}

        {/* ─── Step: Date ─── */}
        {step === "date" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" /> Pilih Tanggal
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Tanggal yang tersedia ditandai — pilih salah satu</p>
            </div>

            {slotsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableDates.length === 0 ? (
              <Card className="p-8 text-center space-y-3">
                <CalendarCheck className="h-10 w-10 mx-auto text-muted-foreground opacity-40" />
                <p className="font-semibold text-muted-foreground">Belum ada slot tersedia</p>
                <p className="text-sm text-muted-foreground">Merchant belum membuat jadwal. Hubungi toko untuk booking manual.</p>
                {shop.phone && (
                  <Button asChild variant="outline" className="gap-2">
                    <a href={`https://wa.me/${shop.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                      <Phone className="h-4 w-4" /> Hubungi via WhatsApp
                    </a>
                  </Button>
                )}
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setCalOffset(o => Math.max(0, o - 1))}
                    disabled={calOffset === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium text-muted-foreground">
                    {new Date(calStart).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => setCalOffset(o => o + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-7 gap-1.5">
                  {["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"].map(d => (
                    <div key={d} className="text-center text-[10px] font-semibold text-muted-foreground py-1">{d}</div>
                  ))}
                  {Array.from({ length: new Date(calDays[0] + "T00:00:00").getDay() }, (_, i) => (
                    <div key={`pad-${i}`} />
                  ))}
                  {calDays.map(d => {
                    const isAvail = availableDates.includes(d);
                    const isWaitlistOnly = waitlistDates.includes(d);
                    const isClickable = (isAvail || isWaitlistOnly) && d >= isoDate(new Date());
                    const isSelected = d === selectedDate;
                    const isPast = d < isoDate(new Date());
                    const dayNum = new Date(d + "T00:00:00").getDate();
                    return (
                      <button
                        key={d}
                        disabled={!isClickable}
                        onClick={() => {
                          setSelectedDate(d);
                          setSelectedSlot(null);
                          setStep("slot");
                        }}
                        className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm font-medium transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-md scale-105"
                            : isAvail && !isPast
                              ? "bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
                              : isWaitlistOnly && !isPast
                                ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 cursor-pointer"
                                : "text-muted-foreground/40 cursor-not-allowed"
                        }`}
                      >
                        {dayNum}
                        {isAvail && !isPast && (
                          <span className="mt-0.5 h-1 w-1 rounded-full bg-primary opacity-70" />
                        )}
                        {isWaitlistOnly && !isPast && (
                          <span className="mt-0.5 h-1 w-1 rounded-full bg-amber-500 opacity-80" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-primary/70 inline-block" /> {availableDates.length} tersedia</span>
                  {waitlistDates.length > 0 && <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500 inline-block" /> {waitlistDates.length} antrean</span>}
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── Step: Slot ─── */}
        {step === "slot" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep("date")}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" /> Pilih Waktu
                </h2>
                <p className="text-sm text-muted-foreground">{fmtDate(selectedDate)}</p>
              </div>
            </div>

            {slotsForDate.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Tidak ada slot tersedia untuk tanggal ini</p>
                <Button variant="outline" className="mt-3" onClick={() => setStep("date")}>Pilih tanggal lain</Button>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {slotsForDate.map(slot => {
                  const remaining = slot.max_capacity - slot.booked_count;
                  const isFull = remaining <= 0;
                  const isSelected = selectedSlot?.id === slot.id;
                  return (
                    <div
                      key={slot.id}
                      onClick={() => {
                        if (isFull) {
                          setSelectedSlot(slot);
                          setSelectedStaffId(NO_PREF_STAFF_ID);
                          setAppliedVoucher(null);
                          setVoucherInput("");
                          setStep("waitlist");
                          return;
                        }
                        setSelectedSlot(slot);
                        setSelectedStaffId(NO_PREF_STAFF_ID);
                        setAppliedVoucher(null);
                        setVoucherInput("");
                        setStep(afterSlot);
                      }}
                      className={`relative text-left rounded-xl border p-4 transition-all cursor-pointer ${
                        isFull
                          ? "border-amber-200 bg-amber-50/50 dark:bg-amber-950/10 opacity-80 hover:border-amber-400"
                          : isSelected
                            ? "border-primary bg-primary/5 ring-2 ring-primary"
                            : "border-border hover:border-primary/50 hover:shadow-md"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold">{slot.service_name}</p>
                          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            {fmtTime(slot.slot_time)}
                            <span>·</span>
                            <span>{slot.duration_min} menit</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {slot.price > 0 ? (
                            <p className={`font-bold ${isFull ? "text-muted-foreground" : "text-primary"}`}>{formatIDR(slot.price)}</p>
                          ) : (
                            <p className="text-sm font-semibold text-emerald-600">Gratis</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        {isFull ? (
                          <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 gap-1">
                            <Users className="h-3 w-3" /> Penuh · Daftar Antre
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className={`text-xs ${remaining <= 2 ? "bg-orange-100 text-orange-700" : ""}`}
                          >
                            {remaining} tempat tersisa
                          </Badge>
                        )}
                        {slot.notes && (
                          <p className="text-xs text-muted-foreground truncate max-w-[120px]">{slot.notes}</p>
                        )}
                        {isFull && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs h-7 shrink-0"
                            onClick={e => {
                              e.stopPropagation();
                              setWaitlistSlot(slot);
                              setWaitlistName("");
                              setWaitlistPhone("");
                              setWaitlistSize("1");
                              setWaitlistDone(false);
                            }}
                          >
                            <ListOrdered className="h-3 w-3" /> Masuk Waitlist
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── Step: Waitlist (M-12) ─── */}
        {step === "waitlist" && selectedSlot && shop && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep("slot")}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Users className="h-5 w-5 text-amber-600" /> Daftar Antrean
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedSlot.service_name} · {fmtDate(selectedDate)} · {fmtTime(selectedSlot.slot_time)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/40 dark:bg-amber-950/10 p-4">
              <p className="text-sm font-semibold text-amber-800 flex items-center gap-2 mb-1">
                <AlertTriangle className="h-4 w-4" /> Slot ini sudah penuh
              </p>
              <p className="text-sm text-amber-700/80">
                Daftarkan diri kamu di antrean. Pemilik toko akan menghubungi via WhatsApp jika ada slot yang terbuka.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label>Nama Lengkap</Label>
                <Input
                  className="mt-1"
                  placeholder="Nama kamu"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  maxLength={80}
                />
              </div>
              <div>
                <Label>Nomor WhatsApp</Label>
                <Input
                  className="mt-1"
                  placeholder="08xx..."
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  maxLength={20}
                />
              </div>
              <div>
                <Label>Jumlah Orang</Label>
                <Input
                  className="mt-1"
                  type="number"
                  min={1}
                  max={selectedSlot.max_capacity}
                  value={partySize}
                  onChange={e => setPartySize(e.target.value)}
                />
              </div>
              <div>
                <Label>Catatan <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                <Textarea
                  className="mt-1 resize-none"
                  rows={2}
                  placeholder="Permintaan khusus, kondisi, dll."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  maxLength={300}
                />
              </div>
            </div>

            <Button
              className="w-full h-12 text-base gap-2 bg-amber-600 hover:bg-amber-700 text-white"
              disabled={submitting || !name.trim() || !phone.trim()}
              onClick={async () => {
                if (!name.trim() || !phone.trim()) return;
                setSubmitting(true);
                try {
                  // Insert into waitlist
                  await (supabase as any)
                    .from("booking_waitlist")
                    .insert({
                      slot_id: selectedSlot.id,
                      customer_name: name.trim(),
                      customer_phone: phone.trim(),
                      party_size: Number(partySize) || 1,
                      notes: notes.trim() || null,
                    });

                  // Get position in queue
                  const { count } = await (supabase as any)
                    .from("booking_waitlist")
                    .select("id", { count: "exact", head: true })
                    .eq("slot_id", selectedSlot.id)
                    .is("notified_at", null);

                  setWaitlistPosition(count ?? 1);

                  // Notify owner
                  await (supabase as any)
                    .from("owner_notifications")
                    .insert({
                      shop_id: shop.id,
                      type: "waitlist_join",
                      title: `🟡 Antrean baru: ${name.trim()}`,
                      body: `${selectedSlot.service_name} · ${fmtDate(selectedDate)} ${fmtTime(selectedSlot.slot_time)} · WA: ${phone.trim()}`,
                      severity: "info",
                      link: "/pos-app/booking",
                      dedupe_key: `waitlist_${selectedSlot.id}_${phone.trim()}_${Date.now()}`,
                    });

                  setStep("waitlist_success");
                } catch {
                  toast.error("Gagal mendaftar antrean. Coba lagi.");
                } finally {
                  setSubmitting(false);
                }
              }}
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Mendaftarkan…</>
              ) : (
                <><Users className="h-4 w-4" /> Daftar Antrean Sekarang</>
              )}
            </Button>
          </div>
        )}

        {/* ─── Step: Waitlist Success (M-12) ─── */}
        {step === "waitlist_success" && selectedSlot && shop && (
          <div className="space-y-5 text-center">
            <div className="flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Users className="h-10 w-10 text-amber-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Kamu Masuk Antrean!</h2>
              {waitlistPosition !== null && (
                <p className="text-lg font-semibold text-amber-700 mt-1">
                  Posisi #{waitlistPosition} dalam antrean
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Pemilik toko akan menghubungi kamu melalui WhatsApp jika ada slot yang terbuka.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-1.5 text-sm text-left">
              <p><span className="text-muted-foreground">Layanan:</span> <span className="font-medium">{selectedSlot.service_name}</span></p>
              <p><span className="text-muted-foreground">Tanggal:</span> <span className="font-medium">{fmtDate(selectedDate)} · {fmtTime(selectedSlot.slot_time)}</span></p>
              <p><span className="text-muted-foreground">Nama:</span> <span className="font-medium">{name}</span></p>
              <p><span className="text-muted-foreground">WhatsApp:</span> <span className="font-medium">{phone}</span></p>
            </div>

            {shop.phone && (
              <Button variant="outline" className="w-full gap-2" asChild>
                <a
                  href={`https://wa.me/${shop.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Halo ${shop.name}, saya baru mendaftar antrean untuk ${selectedSlot.service_name} pada ${fmtDate(selectedDate)} jam ${fmtTime(selectedSlot.slot_time)}. Nama saya ${name} (${phone}). Mohon beritahu saya jika ada slot tersedia.`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Phone className="h-4 w-4" /> Konfirmasi via WhatsApp
                </a>
              </Button>
            )}

            <div className="flex gap-3 justify-center flex-wrap">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("date");
                  setSelectedDate("");
                  setSelectedSlot(null);
                  setName(""); setPhone(""); setPartySize("1"); setNotes("");
                  setWaitlistPosition(null);
                  loadSlots(shop.id);
                }}
              >
                Lihat Slot Lain
              </Button>
              <Button asChild>
                <Link to="/toko/$slug" params={{ slug }}>Kembali ke Toko</Link>
              </Button>
            </div>
          </div>
        )}

        {/* ─── Step: Staff (M-01) ─── */}
        {step === "staff" && selectedSlot && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep("slot")}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-primary" /> Pilih Staff
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedSlot.service_name} · {fmtDate(selectedDate)} · {fmtTime(selectedSlot.slot_time)}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {/* No preference option */}
              <button
                onClick={() => {
                  setSelectedStaffId(NO_PREF_STAFF_ID);
                  setStep(afterStaff);
                }}
                className={`text-left rounded-xl border p-4 transition-all hover:shadow-md flex items-center gap-3 ${
                  selectedStaffId === NO_PREF_STAFF_ID
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted shrink-0">
                  <UserCheck className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-semibold">Siapa saja</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Pilih staff yang tersedia saat itu</p>
                </div>
              </button>

              {/* Individual staff cards */}
              {staffList.map(staff => {
                const isSelected = selectedStaffId === staff.id;
                return (
                  <button
                    key={staff.id}
                    onClick={() => {
                      setSelectedStaffId(staff.id);
                      setStep(afterStaff);
                    }}
                    className={`text-left rounded-xl border p-4 transition-all hover:shadow-md flex items-center gap-3 ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {staff.photo_url ? (
                      <img
                        src={staff.photo_url}
                        alt={staff.name}
                        className="h-14 w-14 rounded-full object-cover shrink-0 ring-2 ring-border"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 shrink-0">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{staff.name}</p>
                      {staff.specialization && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{staff.specialization}</p>
                      )}
                      <Badge variant="secondary" className="mt-1.5 text-[10px] bg-emerald-100 text-emerald-700">
                        Tersedia
                      </Badge>
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Preferensi staff tidak menjamin ketersediaan — toko akan konfirmasi
            </p>
          </div>
        )}

        {/* ─── Step: Packages & Add-ons (M-17) ─── */}
        {step === "packages" && selectedSlot && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep(hasStaff ? "staff" : "slot")}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" /> Paket &amp; Layanan Tambahan
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedSlot.service_name} · {fmtDate(selectedDate)} · {fmtTime(selectedSlot.slot_time)}
                </p>
              </div>
            </div>

            {/* ── Service Packages ── */}
            {packages.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" /> Pilih Paket Layanan
                  <span className="text-xs font-normal text-muted-foreground">(opsional)</span>
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {packages.map((pkg) => {
                    const isSelected = selectedPackage?.id === pkg.id;
                    const colorBorder: Record<string, string> = {
                      blue:   "border-blue-400 bg-blue-50/60 dark:bg-blue-950/20 ring-blue-400",
                      green:  "border-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/20 ring-emerald-400",
                      purple: "border-purple-400 bg-purple-50/60 dark:bg-purple-950/20 ring-purple-400",
                      amber:  "border-amber-400 bg-amber-50/60 dark:bg-amber-950/20 ring-amber-400",
                      rose:   "border-rose-400 bg-rose-50/60 dark:bg-rose-950/20 ring-rose-400",
                    };
                    const colorText: Record<string, string> = {
                      blue: "text-blue-700", green: "text-emerald-700",
                      purple: "text-purple-700", amber: "text-amber-700", rose: "text-rose-700",
                    };
                    const ck = pkg.color ?? "blue";
                    return (
                      <button
                        key={pkg.id}
                        onClick={() => setSelectedPackage(isSelected ? null : pkg)}
                        className={`text-left rounded-xl border-2 p-4 transition-all hover:shadow-md ${
                          isSelected ? `${colorBorder[ck]} ring-2` : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold text-sm ${isSelected ? colorText[ck] : ""}`}>
                              {pkg.name}
                            </p>
                            {pkg.description && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{pkg.description}</p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            {pkg.price > 0 ? (
                              <p className={`text-sm font-bold ${isSelected ? colorText[ck] : "text-foreground"}`}>
                                +{formatIDR(pkg.price)}
                              </p>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">Gratis</Badge>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                            <Check className="h-3.5 w-3.5" /> Dipilih
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Add-ons ── */}
            {addons.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Plus className="h-4 w-4 text-primary" /> Layanan Tambahan (Add-on)
                  <span className="text-xs font-normal text-muted-foreground">(bisa pilih lebih dari satu)</span>
                </p>
                <div className="space-y-2">
                  {addons.map((addon) => {
                    const isChecked = selectedAddonIds.has(addon.id);
                    return (
                      <button
                        key={addon.id}
                        onClick={() => {
                          setSelectedAddonIds(prev => {
                            const next = new Set(prev);
                            if (next.has(addon.id)) next.delete(addon.id);
                            else next.add(addon.id);
                            return next;
                          });
                        }}
                        className={`w-full text-left rounded-xl border px-4 py-3 flex items-center gap-3 transition-all hover:shadow-sm ${
                          isChecked ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/40"
                        }`}
                      >
                        <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isChecked ? "bg-primary border-primary" : "border-muted-foreground"
                        }`}>
                          {isChecked && <Check className="h-3 w-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{addon.name}</p>
                          {addon.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{addon.description}</p>
                          )}
                        </div>
                        <p className="text-sm font-semibold shrink-0">
                          {addon.price > 0 ? `+${formatIDR(addon.price)}` : <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700">Gratis</Badge>}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Price preview ── */}
            {(selectedPackage || selectedAddonIds.size > 0) && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 space-y-1.5 text-sm">
                <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">Ringkasan Harga</p>
                {selectedSlot.price > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Harga layanan dasar</span>
                    <span>{formatIDR(selectedSlot.price)}</span>
                  </div>
                )}
                {selectedPackage && selectedPackage.price > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paket: {selectedPackage.name}</span>
                    <span>+{formatIDR(selectedPackage.price)}</span>
                  </div>
                )}
                {selectedAddons.map(a => (
                  <div key={a.id} className="flex justify-between">
                    <span className="text-muted-foreground">Add-on: {a.name}</span>
                    <span>+{formatIDR(a.price)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold pt-1.5 border-t border-primary/10">
                  <span>Total estimasi</span>
                  <span className="text-primary">{formatIDR(selectedSlot.price + packageExtra + addonTotal)}</span>
                </div>
              </div>
            )}

            <Button
              className="w-full h-12 text-base gap-2"
              onClick={() => setStep(afterPackages)}
            >
              {needsDoc ? "Lanjut ke Upload Dokumen" : "Lanjut ke Isi Data"} <ChevronRight className="h-4 w-4" />
            </Button>
            <button
              className="w-full text-sm text-muted-foreground hover:text-foreground text-center py-1"
              onClick={() => {
                setSelectedPackage(null);
                setSelectedAddonIds(new Set());
                setStep(afterPackages);
              }}
            >
              Lewati — lanjut tanpa paket tambahan
            </button>
          </div>
        )}

        {/* ─── Step: Document Upload (M-16) ─── */}
        {step === "document" && needsDoc && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep(hasPackages ? "packages" : (hasStaff ? "staff" : "slot"))}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" /> Upload Dokumen Identitas
                </h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Diperlukan untuk verifikasi booking rental
                </p>
              </div>
            </div>

            {/* Tipe Dokumen */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Pilih Jenis Dokumen</p>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { value: "ktp", label: "KTP", desc: "Kartu Tanda Penduduk", icon: CreditCard },
                  { value: "sim", label: "SIM", desc: "Surat Izin Mengemudi", icon: Car },
                ] as const).map(({ value, label, desc, icon: Icon }) => (
                  <button
                    key={value}
                    onClick={() => { setDocType(value); setDocUrl(null); }}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-all ${
                      docType === value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <Icon className={`h-5 w-5 shrink-0 ${docType === value ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <p className="font-semibold text-sm">{label}</p>
                      <p className="text-[11px] text-muted-foreground">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Upload Area */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Foto {docType.toUpperCase()}</p>
              {docUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-primary/30">
                  <img src={docUrl} alt="Dokumen" className="w-full max-h-60 object-contain bg-muted/30" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-white">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-medium">Dokumen berhasil diupload</span>
                    </div>
                    <button
                      onClick={() => setDocUrl(null)}
                      className="flex items-center gap-1 rounded-lg bg-red-500/80 px-2 py-1 text-xs text-white hover:bg-red-500"
                    >
                      <Trash2 className="h-3 w-3" /> Ganti
                    </button>
                  </div>
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
                  docUploading ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30"
                }`}>
                  {docUploading ? (
                    <>
                      <Loader2 className="h-10 w-10 text-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">Mengupload…</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm font-medium">Klik untuk pilih foto</p>
                        <p className="text-xs text-muted-foreground mt-1">JPG, PNG, PDF · Maks. 5MB</p>
                        <p className="text-xs text-muted-foreground">Pastikan foto jelas, tidak terpotong, dan tidak buram</p>
                      </div>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    disabled={docUploading}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.target.value = ""; }}
                  />
                </label>
              )}
            </div>

            {/* Panduan foto */}
            <div className="rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-4 space-y-1.5">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5" /> Panduan Upload Dokumen
              </p>
              <ul className="text-xs text-amber-700 dark:text-amber-400 space-y-0.5 list-disc list-inside">
                <li>Foto seluruh bagian dokumen, tidak terpotong</li>
                <li>Cahaya cukup, tidak silau dan tidak buram</li>
                <li>Data nama dan nomor harus terbaca jelas</li>
                <li>Dokumen harus atas nama pemesan</li>
              </ul>
            </div>

            <Button
              className="w-full h-12 text-base gap-2"
              onClick={() => setStep(afterDoc)}
              disabled={!docUrl}
            >
              Lanjut ke Isi Data <ChevronRight className="h-4 w-4" />
            </Button>
            {!docUrl && (
              <p className="text-center text-xs text-muted-foreground">
                Upload dokumen terlebih dahulu untuk melanjutkan
              </p>
            )}
          </div>
        )}

        {step === "form" && selectedSlot && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep(needsDoc ? "document" : (hasPackages ? "packages" : (hasStaff ? "staff" : "slot")))}
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2 className="text-xl font-bold">Isi Data Booking</h2>
            </div>

            {/* Booking summary */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1.5">
              <p className="font-semibold">{selectedSlot.service_name}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <CalendarCheck className="h-3.5 w-3.5 shrink-0" />
                {fmtDate(selectedDate)} · {fmtTime(selectedSlot.slot_time)} ({selectedSlot.duration_min} menit)
              </p>
              {/* Selected staff chip */}
              {hasStaff && (
                <div className="flex items-center gap-1.5">
                  {selectedStaff?.photo_url ? (
                    <img src={selectedStaff.photo_url} alt={selectedStaff.name} className="h-5 w-5 rounded-full object-cover" />
                  ) : (
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    Staff: <span className="font-medium text-foreground">
                      {selectedStaffId === NO_PREF_STAFF_ID ? "Siapa saja" : (selectedStaff?.name ?? "—")}
                    </span>
                  </span>
                  <button
                    className="ml-1 text-xs text-primary hover:underline"
                    onClick={() => setStep("staff")}
                  >
                    Ubah
                  </button>
                </div>
              )}
              {selectedSlot.price > 0 && (
                <div className="space-y-0.5">
                  {appliedVoucher ? (
                    <>
                      <p className="text-sm line-through text-muted-foreground">{formatIDR(selectedSlot.price)}</p>
                      <p className="text-sm font-bold text-emerald-600">{formatIDR(appliedVoucher.finalPrice)} <span className="text-xs font-normal text-emerald-600/80">(-{formatIDR(appliedVoucher.discountAmount)})</span></p>
                    </>
                  ) : (
                    <p className="text-sm font-bold text-primary">{formatIDR(selectedSlot.price)}</p>
                  )}
                </div>
              )}
              {selectedPackage && (
                <p className="text-sm flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-muted-foreground">Paket:</span>
                  <span className="font-medium">{selectedPackage.name}</span>
                  {selectedPackage.price > 0 && <span className="text-primary font-semibold ml-auto">+{formatIDR(selectedPackage.price)}</span>}
                </p>
              )}
              {selectedAddons.length > 0 && (
                <div className="space-y-0.5">
                  {selectedAddons.map(a => (
                    <p key={a.id} className="text-sm flex items-center gap-1.5">
                      <Plus className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Add-on:</span>
                      <span className="font-medium">{a.name}</span>
                      {a.price > 0 && <span className="text-primary font-semibold ml-auto">+{formatIDR(a.price)}</span>}
                    </p>
                  ))}
                </div>
              )}
              {(selectedPackage || selectedAddons.length > 0) && effectivePrice > 0 && (
                <p className="text-sm font-bold text-primary border-t border-primary/10 pt-1.5 flex justify-between">
                  <span>Total</span>
                  <span>{formatIDR(effectivePrice)}</span>
                </p>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="bk-name" className="flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Nama Lengkap <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bk-name"
                  placeholder="contoh: Budi Santoso"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bk-phone" className="flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5" /> Nomor WhatsApp <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="bk-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="contoh: 081234567890"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Konfirmasi booking akan dikirim via WhatsApp</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bk-party" className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" /> Jumlah Orang
                </Label>
                <Input
                  id="bk-party"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={selectedSlot.max_capacity - selectedSlot.booked_count}
                  value={partySize}
                  onChange={e => setPartySize(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bk-notes" className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" /> Catatan (opsional)
                </Label>
                <Textarea
                  id="bk-notes"
                  placeholder="Permintaan khusus, kondisi yang perlu diketahui toko, dll."
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {/* ─── Voucher Input ─── */}
              {selectedSlot.price > 0 && (
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5">
                    <Ticket className="h-3.5 w-3.5 text-violet-500" /> Kode Voucher
                  </Label>
                  {appliedVoucher ? (
                    <div className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 px-3 py-2">
                      <Tag className="h-4 w-4 text-emerald-600 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-emerald-700 font-mono">{appliedVoucher.code}</p>
                        <p className="text-xs text-emerald-600">Hemat {formatIDR(appliedVoucher.discountAmount)}</p>
                      </div>
                      <button
                        onClick={removeVoucher}
                        className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        title="Hapus voucher"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        placeholder="Masukkan kode voucher"
                        value={voucherInput}
                        onChange={e => setVoucherInput(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === "Enter" && applyVoucher()}
                        className="font-mono uppercase"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={applyVoucher}
                        disabled={voucherApplying || !voucherInput.trim()}
                        className="shrink-0 border-violet-300 text-violet-700 hover:bg-violet-50"
                      >
                        {voucherApplying ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pakai"}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              className="w-full h-12 text-base gap-2"
              onClick={submit}
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Memproses…</>
              ) : (
                <><CalendarCheck className="h-4 w-4" /> Konfirmasi Booking</>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Booking belum terkonfirmasi sampai toko menyetujui permintaan Anda
            </p>
          </div>
        )}

        {/* ─── Step: Deposit ─── */}
        {step === "deposit" && selectedSlot && shop && (
          <div className="space-y-5">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Banknote className="h-5 w-5 text-primary" /> Bayar Uang Muka (DP)
              </h2>
              <p className="text-sm text-muted-foreground">
                Booking dikonfirmasi otomatis setelah DP diterima
              </p>
            </div>

            {/* DP Amount Card */}
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Jumlah DP yang harus dibayar</p>
              <p className="text-4xl font-bold text-primary">{formatIDR(depositAmount)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                ({shop.deposit_percent ?? 50}% dari {formatIDR(effectivePrice)})
              </p>
            </div>

            {/* Booking summary */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-1.5 text-sm">
              <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">Detail Booking</p>
              <p><span className="text-muted-foreground">Layanan:</span> <span className="font-medium">{selectedSlot.service_name}</span></p>
              <p><span className="text-muted-foreground">Tanggal:</span> <span className="font-medium">{fmtDate(selectedSlot.slot_date)} · {fmtTime(selectedSlot.slot_time)}</span></p>
              <p><span className="text-muted-foreground">Nama:</span> <span className="font-medium">{name}</span></p>
              <p><span className="text-muted-foreground">WhatsApp:</span> <span className="font-medium">{phone}</span></p>
            </div>

            {/* Payment method selector */}
            <div className="space-y-3">
              <p className="text-sm font-semibold">Pilih Metode Pembayaran DP</p>
              <div className="grid gap-2 grid-cols-2">
                {([
                  { id: "qris",           label: "QRIS",           sub: "Semua e-wallet via QR",    Icon: QrCode,       midtrans: true,  xendit: false },
                  { id: "gopay",          label: "GoPay",          sub: "via aplikasi Gojek",       Icon: Smartphone,   midtrans: true,  xendit: false },
                  { id: "shopeepay",      label: "ShopeePay",      sub: "via aplikasi Shopee",      Icon: Smartphone,   midtrans: true,  xendit: false },
                  { id: "ovo",            label: "OVO",            sub: "via aplikasi OVO",         Icon: Smartphone,   midtrans: true,  xendit: false },
                  { id: "dana",           label: "DANA",           sub: "via aplikasi DANA",        Icon: Wallet,       midtrans: true,  xendit: false },
                  { id: "cc",             label: "Kartu Kredit",   sub: "Visa / Mastercard",        Icon: CreditCard,   midtrans: true,  xendit: false },
                  { id: "xendit_invoice", label: "Invoice Online", sub: "Bayar via link Xendit",    Icon: ExternalLink, midtrans: false, xendit: true  },
                  { id: "transfer",       label: "Transfer Bank",  sub: "Konfirmasi manual",        Icon: Banknote,     midtrans: false, xendit: false },
                ] as const).filter(m => {
                  if (m.midtrans) return gatewayConfig?.midtrans_enabled ?? false;
                  if (m.xendit)   return gatewayConfig?.xendit_enabled   ?? false;
                  return true;
                }).map(({ id, label, sub, Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => { setDepositPaymentMethod(id); setXenditPaymentUrl(null); }}
                    className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                      depositPaymentMethod === id
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${depositPaymentMethod === id ? "text-primary" : "text-muted-foreground"}`} />
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${depositPaymentMethod === id ? "text-primary" : ""}`}>{label}</p>
                      <p className="text-xs text-muted-foreground truncate">{sub}</p>
                    </div>
                    {depositPaymentMethod === id && (
                      <div className="ml-auto h-4 w-4 rounded-full border-2 border-primary bg-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Transfer: show bank account info */}
            {depositPaymentMethod === "transfer" && shop.deposit_notes && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-primary" /> Informasi Rekening
                </p>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{shop.deposit_notes}</p>
                </div>
                <button
                  onClick={() => copyText(shop.deposit_notes ?? "")}
                  className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Tersalin!" : "Salin info rekening"}
                </button>
              </div>
            )}

            {/* Xendit pending state: auto-poll + manual fallback */}
            {depositPaymentMethod === "xendit_invoice" && xenditPaymentUrl && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4 space-y-3">
                {depositPolling ? (
                  <div className="flex items-center gap-2.5">
                    <Loader2 className="h-4 w-4 animate-spin text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                      Menunggu konfirmasi pembayaran… halaman ini akan otomatis lanjut setelah bayar.
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                    Link pembayaran sudah dibuka di tab baru. Setelah selesai bayar, halaman ini akan otomatis lanjut — atau klik tombol di bawah.
                  </p>
                )}
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" size="sm" className="gap-1.5" asChild>
                    <a href={xenditPaymentUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> Buka Link Lagi
                    </a>
                  </Button>
                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => markDepositPaid(xenditTxId ?? undefined)}
                    disabled={depositPolling}
                  >
                    <Check className="h-3.5 w-3.5" /> Saya Sudah Bayar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Memeriksa status setiap 5 detik secara otomatis.
                </p>
              </div>
            )}

            {/* Main CTA */}
            <div className="space-y-2.5">
              {!(depositPaymentMethod === "xendit_invoice" && xenditPaymentUrl) && (
                <Button
                  className="w-full h-12 text-base gap-2"
                  onClick={initiateDepositPayment}
                  disabled={depositProcessing || confirmingDeposit}
                >
                  {(depositProcessing || confirmingDeposit) ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Memproses…</>
                  ) : depositPaymentMethod === "transfer" ? (
                    <><Check className="h-4 w-4" /> Saya Sudah Transfer DP</>
                  ) : (
                    <><Zap className="h-4 w-4" /> Bayar DP {formatIDR(depositAmount)}</>
                  )}
                </Button>
              )}

              {depositPaymentMethod === "transfer" && shop.phone && (
                <Button variant="outline" className="w-full gap-2" asChild>
                  <a
                    href={`https://wa.me/${shop.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Halo ${shop.name}, saya baru booking ${selectedSlot.service_name} untuk ${fmtDate(selectedSlot.slot_date)} jam ${fmtTime(selectedSlot.slot_time)}. Nama: ${name} (${phone}). Saya akan kirim bukti transfer DP ${formatIDR(depositAmount)}.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Phone className="h-4 w-4" /> Konfirmasi via WhatsApp
                  </a>
                </Button>
              )}
            </div>

            <p className="text-xs text-center text-muted-foreground">
              {depositPaymentMethod === "transfer"
                ? "Setelah transfer, klik tombol di atas agar toko segera memverifikasi pembayaran Anda."
                : "Pembayaran diproses aman via gateway resmi. Booking terkonfirmasi otomatis setelah DP lunas."}
            </p>

            {/* Cancellation link */}
            {cancellationToken && (
              <div className="rounded-xl border border-rose-200/60 bg-rose-50/40 dark:bg-rose-950/10 p-4 space-y-2 text-left">
                <p className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5" /> Perlu batalkan booking?
                </p>
                <p className="text-xs text-muted-foreground">
                  Simpan link ini sebelum meninggalkan halaman. Gunakan untuk membatalkan booking secara mandiri.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate text-[10px] bg-white dark:bg-card border border-rose-200 rounded px-2 py-1 text-rose-700 font-mono">
                    {`${window.location.origin}/booking/cancel/${cancellationToken}`}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/booking/cancel/${cancellationToken}`);
                      setCancelLinkCopied(true);
                      setTimeout(() => setCancelLinkCopied(false), 2000);
                    }}
                    className="shrink-0 text-xs px-2 py-1 rounded border border-rose-300 text-rose-700 hover:bg-rose-100 transition-colors flex items-center gap-1"
                  >
                    {cancelLinkCopied ? <><Check className="h-3 w-3" /> Disalin</> : <><Copy className="h-3 w-3" /> Salin</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Step: Success ─── */}
        {step === "success" && selectedSlot && (
          <div className="py-8 text-center space-y-5">
            <div className="flex items-center justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <CheckCircle2 className="h-10 w-10 text-emerald-600" />
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">Booking Terkirim!</h2>
              <p className="text-muted-foreground mt-2">
                Permintaan booking Anda sudah diterima. Toko akan mengkonfirmasi segera.
              </p>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 p-4 text-left space-y-2 max-w-sm mx-auto">
              <div className="flex items-center gap-2 font-semibold">
                <CalendarCheck className="h-4 w-4 text-emerald-600" /> Detail Booking
              </div>
              <div className="text-sm space-y-1.5 text-muted-foreground">
                <p><span className="font-medium text-foreground">Layanan:</span> {selectedSlot.service_name}</p>
                <p><span className="font-medium text-foreground">Tanggal:</span> {fmtDate(selectedDate)}</p>
                <p><span className="font-medium text-foreground">Waktu:</span> {fmtTime(selectedSlot.slot_time)}</p>
                {hasStaff && (
                  <p>
                    <span className="font-medium text-foreground">Staff:</span>{" "}
                    {selectedStaffId === NO_PREF_STAFF_ID ? "Siapa saja" : (selectedStaff?.name ?? "—")}
                  </p>
                )}
                <p><span className="font-medium text-foreground">Nama:</span> {name}</p>
                {selectedSlot.price > 0 && (
                  appliedVoucher ? (
                    <div className="space-y-0.5">
                      <p><span className="font-medium text-foreground">Harga asal:</span> <span className="line-through text-muted-foreground">{formatIDR(selectedSlot.price)}</span></p>
                      <p><span className="font-medium text-foreground">Voucher:</span> <span className="text-emerald-600 font-mono">{appliedVoucher.code}</span> <span className="text-emerald-600">(-{formatIDR(appliedVoucher.discountAmount)})</span></p>
                      <p><span className="font-medium text-foreground">Harga akhir:</span> <span className="font-bold text-emerald-600">{formatIDR(appliedVoucher.finalPrice)}</span></p>
                    </div>
                  ) : (
                    <p><span className="font-medium text-foreground">Harga:</span> {formatIDR(selectedSlot.price)}</p>
                  )
                )}
                {selectedPackage && (
                  <p>
                    <span className="font-medium text-foreground">Paket:</span>{" "}
                    {selectedPackage.name}
                    {selectedPackage.price > 0 && <span className="text-primary font-semibold"> (+{formatIDR(selectedPackage.price)})</span>}
                  </p>
                )}
                {selectedAddons.length > 0 && (
                  <p>
                    <span className="font-medium text-foreground">Add-on:</span>{" "}
                    {selectedAddons.map(a => a.name).join(", ")}
                    {addonTotal > 0 && <span className="text-primary font-semibold"> (+{formatIDR(addonTotal)})</span>}
                  </p>
                )}
                {(selectedPackage || selectedAddons.length > 0) && effectivePrice > 0 && (
                  <p className="font-bold text-foreground border-t border-emerald-200 pt-1.5 mt-1">
                    <span>Total: </span>
                    <span className="text-primary">{formatIDR(effectivePrice)}</span>
                  </p>
                )}
                {shop?.require_deposit && depositAmount > 0 && (
                  <p className="flex items-center gap-1.5 font-medium text-emerald-700">
                    <Check className="h-3.5 w-3.5" /> DP {formatIDR(depositAmount)} sudah dikonfirmasi
                  </p>
                )}
              </div>
            </div>

            {shop.phone && (
              <Button
                asChild
                variant="outline"
                className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
              >
                <a
                  href={`https://wa.me/${shop.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                    `Halo ${shop.name}, saya baru saja booking ${selectedSlot.service_name}${selectedStaffId !== NO_PREF_STAFF_ID && selectedStaff ? ` dengan ${selectedStaff.name}` : ""} untuk ${fmtDate(selectedDate)} jam ${fmtTime(selectedSlot.slot_time)}. Nama saya ${name} (${phone}). Mohon dikonfirmasi ya. Terima kasih!`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Phone className="h-4 w-4" /> Konfirmasi via WhatsApp
                </a>
              </Button>
            )}

            {/* ─── Cancellation link ─── */}
            {cancellationToken && (
              <div className="rounded-xl border border-rose-200/60 bg-rose-50/40 dark:bg-rose-950/10 p-4 max-w-sm mx-auto space-y-2 text-left">
                <p className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                  <XCircle className="h-3.5 w-3.5" /> Perlu batalkan booking?
                </p>
                <p className="text-xs text-muted-foreground">
                  Simpan link ini — kamu bisa gunakan untuk membatalkan booking secara mandiri kapan saja sebelum jadwal.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 truncate text-[10px] bg-white dark:bg-card border border-rose-200 rounded px-2 py-1 text-rose-700 font-mono">
                    {`${window.location.origin}/booking/cancel/${cancellationToken}`}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/booking/cancel/${cancellationToken}`);
                      setCancelLinkCopied(true);
                      setTimeout(() => setCancelLinkCopied(false), 2000);
                    }}
                    className="shrink-0 text-xs px-2 py-1 rounded border border-rose-300 text-rose-700 hover:bg-rose-100 transition-colors flex items-center gap-1"
                  >
                    {cancelLinkCopied ? <><Check className="h-3 w-3" /> Disalin</> : <><Copy className="h-3 w-3" /> Salin</>}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center flex-wrap">
              <Button
                variant="outline"
                onClick={() => {
                  setStep("date");
                  setSelectedDate("");
                  setSelectedSlot(null);
                  setSelectedStaffId(NO_PREF_STAFF_ID);
                  setName(""); setPhone(""); setPartySize("1"); setNotes("");
                  setBookingId(null);
                  setCancellationToken(null);
                  setCancelLinkCopied(false);
                  setWaitlistPosition(null);
                  setAppliedVoucher(null);
                  setVoucherInput("");
                  loadSlots(shop.id);
                }}
              >
                Booking Lagi
              </Button>
              <Button asChild>
                <Link to="/toko/$slug" params={{ slug }}>Kembali ke Toko</Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      <MarketplaceFooter />

      {/* ─── Waitlist Dialog (M-12) ─── */}
      <Dialog open={!!waitlistSlot} onOpenChange={open => { if (!open) setWaitlistSlot(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-primary" /> Masuk Daftar Tunggu
            </DialogTitle>
          </DialogHeader>
          {waitlistDone ? (
            <div className="py-6 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <p className="font-semibold">Kamu sudah masuk daftar tunggu!</p>
              <p className="text-sm text-muted-foreground">
                Kami akan menghubungi kamu via WhatsApp jika ada slot kosong untuk{" "}
                <strong>{waitlistSlot?.service_name}</strong>.
              </p>
              <Button className="w-full mt-2" onClick={() => setWaitlistSlot(null)}>Tutup</Button>
            </div>
          ) : (
            <>
              <div className="py-2 space-y-4">
                <div className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <p className="font-medium">{waitlistSlot?.service_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {waitlistSlot?.slot_date ? fmtDate(waitlistSlot.slot_date) : ""} · {waitlistSlot?.slot_time ? fmtTime(waitlistSlot.slot_time) : ""}
                  </p>
                </div>
                <div>
                  <Label>Nama lengkap</Label>
                  <Input
                    className="mt-1"
                    value={waitlistName}
                    onChange={e => setWaitlistName(e.target.value)}
                    placeholder="Nama kamu"
                  />
                </div>
                <div>
                  <Label>Nomor WhatsApp</Label>
                  <Input
                    className="mt-1"
                    value={waitlistPhone}
                    onChange={e => setWaitlistPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    type="tel"
                  />
                </div>
                <div>
                  <Label>Jumlah orang</Label>
                  <Input
                    className="mt-1 w-24"
                    type="number"
                    min={1}
                    max={20}
                    value={waitlistSize}
                    onChange={e => setWaitlistSize(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setWaitlistSlot(null)}>Batal</Button>
                <Button onClick={joinWaitlist} disabled={waitlistSaving} className="gap-2">
                  {waitlistSaving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Daftar Waitlist
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
