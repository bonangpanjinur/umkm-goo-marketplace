import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Store, CalendarCheck, Clock, ChevronLeft, ChevronRight,
  CheckCircle2, Loader2, Phone, User, MessageSquare, Users,
  ArrowLeft, ShieldCheck, Star, Scissors, UserCheck, Banknote, Copy, Check,
} from "lucide-react";
import { formatIDR } from "@/lib/format";

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

type Step = "date" | "slot" | "staff" | "form" | "deposit" | "success";

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
  const [confirmingDeposit, setConfirmingDeposit] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load shop
  useEffect(() => {
    (async () => {
      const { data: s } = await supabase
        .from("coffee_shops" as any)
        .select("id, name, slug, logo_url, tagline, address, phone, rating_avg, rating_count, kyc_status, require_deposit, deposit_percent, deposit_notes")
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

  useEffect(() => {
    if (shop?.id) {
      loadSlots(shop.id);
      loadStaff(shop.id);
    }
  }, [shop?.id, loadSlots, loadStaff]);

  const hasStaff = staffList.length > 0;

  // Derived
  const availableDates = [...new Set(
    allSlots
      .filter(s => s.booked_count < s.max_capacity)
      .map(s => s.slot_date)
  )];

  const calStart = addDays(new Date(), calOffset * 7);
  const calDays = Array.from({ length: 14 }, (_, i) => isoDate(addDays(calStart, i)));

  const slotsForDate = allSlots.filter(
    s => s.slot_date === selectedDate && s.booked_count < s.max_capacity
  );

  const selectedStaff = staffList.find(s => s.id === selectedStaffId) ?? null;

  // Step labels — dynamic based on whether staff selection is available
  const stepKeys = hasStaff
    ? (["date", "slot", "staff", "form"] as Step[])
    : (["date", "slot", "form"] as Step[]);
  const stepLabels = hasStaff
    ? ["Pilih Tanggal", "Pilih Waktu", "Pilih Staff", "Isi Data"]
    : ["Pilih Tanggal", "Pilih Waktu", "Isi Data"];

  const afterSlot = hasStaff ? "staff" : "form";

  // Computed deposit amount
  const depositAmount = (() => {
    if (!shop?.require_deposit || !selectedSlot) return 0;
    const pct = shop.deposit_percent ?? 50;
    return Math.ceil((selectedSlot.price * pct) / 100);
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
      const needsDeposit = !!(shop.require_deposit && selectedSlot.price > 0);

      const { data: bk, error } = await supabase
        .from("bookings" as any)
        .insert({
          slot_id: selectedSlot.id,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          party_size: party,
          notes: notes.trim() || null,
          status: needsDeposit ? "pending" : "pending",
          ...(staffId ? { staff_id: staffId } : {}),
          ...(needsDeposit ? {
            deposit_required: true,
            deposit_amount: depositAmount,
            deposit_status: "waiting_payment",
          } : {}),
        } as any)
        .select("id")
        .maybeSingle() as any;
      if (error) throw error;

      await supabase
        .from("booking_slots" as any)
        .update({ booked_count: (fresh?.booked_count ?? 0) + 1 } as any)
        .eq("id" as any, selectedSlot.id);

      await supabase
        .from("owner_notifications" as any)
        .insert({
          shop_id: shop.id,
          type: needsDeposit ? "new_booking_deposit" : "new_booking",
          title: `📅 Booking baru dari ${name.trim()}`,
          body: `${selectedSlot.service_name}${staffName ? ` · ${staffName}` : ""} · ${fmtDate(selectedSlot.slot_date)} ${fmtTime(selectedSlot.slot_time)}${party > 1 ? ` · ${party} orang` : ""} · WA: ${phone.trim()}${needsDeposit ? ` · DP: ${formatIDR(depositAmount)}` : ""}`,
          severity: "info",
          link: "/pos-app/booking",
          dedupe_key: `booking_${bk?.id ?? Date.now()}`,
        } as any);

      setBookingId(bk?.id ?? "ok");
      // If deposit required and slot has a price, show deposit step
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

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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
                    const isSelected = d === selectedDate;
                    const isPast = d < isoDate(new Date());
                    const dayNum = new Date(d + "T00:00:00").getDate();
                    return (
                      <button
                        key={d}
                        disabled={!isAvail || isPast}
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
                              : "text-muted-foreground/40 cursor-not-allowed"
                        }`}
                      >
                        {dayNum}
                        {isAvail && !isPast && (
                          <span className="mt-0.5 h-1 w-1 rounded-full bg-primary opacity-70" />
                        )}
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  {availableDates.length} tanggal tersedia dalam 30 hari ke depan
                </p>
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
                  const isSelected = selectedSlot?.id === slot.id;
                  return (
                    <button
                      key={slot.id}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setSelectedStaffId(NO_PREF_STAFF_ID);
                        setStep(afterSlot);
                      }}
                      className={`text-left rounded-xl border p-4 transition-all hover:shadow-md ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-2 ring-primary"
                          : "border-border hover:border-primary/50"
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
                            <p className="font-bold text-primary">{formatIDR(slot.price)}</p>
                          ) : (
                            <p className="text-sm font-semibold text-emerald-600">Gratis</p>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <Badge
                          variant="secondary"
                          className={`text-xs ${remaining <= 2 ? "bg-orange-100 text-orange-700" : ""}`}
                        >
                          {remaining} tempat tersisa
                        </Badge>
                        {slot.notes && (
                          <p className="text-xs text-muted-foreground truncate max-w-[120px]">{slot.notes}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
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
                  setStep("form");
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
                      setStep("form");
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

        {/* ─── Step: Form ─── */}
        {step === "form" && selectedSlot && (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep(hasStaff ? "staff" : "slot")}
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
                <p className="text-sm font-bold text-primary">{formatIDR(selectedSlot.price)}</p>
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
            <div className="flex items-center gap-2">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-primary" /> Bayar Uang Muka (DP)
                </h2>
                <p className="text-sm text-muted-foreground">
                  Booking dikonfirmasi setelah DP diterima toko
                </p>
              </div>
            </div>

            {/* DP Amount Card */}
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-5 text-center">
              <p className="text-sm text-muted-foreground mb-1">Jumlah DP yang harus dibayar</p>
              <p className="text-4xl font-bold text-primary">{formatIDR(depositAmount)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                ({shop.deposit_percent ?? 50}% dari {formatIDR(selectedSlot.price)})
              </p>
            </div>

            {/* Payment Info */}
            {shop.deposit_notes && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-primary" /> Informasi Pembayaran
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

            {/* Booking summary */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-1.5 text-sm">
              <p className="font-semibold text-xs text-muted-foreground uppercase tracking-wide mb-2">Detail Booking</p>
              <p><span className="text-muted-foreground">Layanan:</span> <span className="font-medium">{selectedSlot.service_name}</span></p>
              <p><span className="text-muted-foreground">Tanggal:</span> <span className="font-medium">{fmtDate(selectedSlot.slot_date)} · {fmtTime(selectedSlot.slot_time)}</span></p>
              <p><span className="text-muted-foreground">Nama:</span> <span className="font-medium">{name}</span></p>
              <p><span className="text-muted-foreground">WhatsApp:</span> <span className="font-medium">{phone}</span></p>
            </div>

            <div className="space-y-2.5">
              <Button
                className="w-full h-12 text-base gap-2"
                onClick={confirmDeposit}
                disabled={confirmingDeposit}
              >
                {confirmingDeposit ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Memproses…</>
                ) : (
                  <><Check className="h-4 w-4" /> Saya Sudah Transfer DP</>
                )}
              </Button>
              {shop.phone && (
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
              Setelah transfer, klik tombol di atas agar toko segera memverifikasi pembayaran Anda
            </p>
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
                  <p><span className="font-medium text-foreground">Harga:</span> {formatIDR(selectedSlot.price)}</p>
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
    </div>
  );
}
