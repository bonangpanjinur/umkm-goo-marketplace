import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Store, CalendarCheck, Clock, ChevronLeft, ChevronRight,
  CheckCircle2, Loader2, Phone, User, MessageSquare, Users,
  ArrowLeft, ShieldCheck, Copy, Check, UtensilsCrossed,
  LayoutGrid, Circle, Square, AlertTriangle, X,
} from "lucide-react";

export const Route = createFileRoute("/toko/$slug/reservasi")({
  component: TableReservationPage,
});

type Shop = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  tagline: string | null;
  address: string | null;
  phone: string | null;
  kyc_status: string | null;
  reservation_enabled: boolean | null;
  reservation_open_time: string | null;
  reservation_close_time: string | null;
  reservation_duration: number | null;
  reservation_max_party: number | null;
  reservation_notes: string | null;
};

type TableRow = {
  id: string;
  name: string;
  capacity: number;
  shape: string;
  status: string;
};

type Step = "date" | "table" | "form" | "success";

function isoDate(d: Date) {
  return d.toISOString().split("T")[0];
}
function addDays(d: Date, n: number) {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
function fmtTime(t: string) { return t.slice(0, 5); }

const DAY_NAMES_SHORT = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function generateTimeSlots(openTime: string, closeTime: string, durationMin: number): string[] {
  const slots: string[] = [];
  const [oh, om] = (openTime || "09:00").split(":").map(Number);
  const [ch, cm] = (closeTime || "21:00").split(":").map(Number);
  let cur = oh * 60 + om;
  const end = ch * 60 + cm;
  while (cur + durationMin <= end) {
    const hh = String(Math.floor(cur / 60)).padStart(2, "0");
    const mm = String(cur % 60).padStart(2, "0");
    slots.push(`${hh}:${mm}`);
    cur += 30;
  }
  return slots;
}

export default function TableReservationPage() {
  const { slug } = Route.useParams();

  const [shop, setShop] = useState<Shop | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notEnabled, setNotEnabled] = useState(false);

  const [step, setStep] = useState<Step>("date");
  const [calOffset, setCalOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedTable, setSelectedTable] = useState<TableRow | null>(null);
  const [partySize, setPartySize] = useState("2");

  const [availableTables, setAvailableTables] = useState<TableRow[]>([]);
  const [tablesLoading, setTablesLoading] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [reservationId, setReservationId] = useState<string | null>(null);
  const [cancelToken, setCancelToken] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  // Load shop
  useEffect(() => {
    (async () => {
      const { data: s } = await (supabase as any)
        .from("coffee_shops")
        .select("id, name, slug, logo_url, tagline, address, phone, kyc_status, reservation_enabled, reservation_open_time, reservation_close_time, reservation_duration, reservation_max_party, reservation_notes")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();
      if (!s) { setNotFound(true); setLoading(false); return; }
      setShop(s as Shop);
      if (!s.reservation_enabled) setNotEnabled(true);
      setLoading(false);
    })();
  }, [slug]);

  const duration = shop?.reservation_duration ?? 90;
  const timeSlots = shop
    ? generateTimeSlots(
        shop.reservation_open_time ?? "09:00",
        shop.reservation_close_time ?? "21:00",
        duration,
      )
    : [];

  // Load available tables when date + time + partySize are set
  const loadTables = useCallback(async (shopId: string, date: string, time: string, size: number) => {
    setTablesLoading(true);
    try {
      const { data, error } = await (supabase as any).rpc("get_available_tables", {
        p_shop_id: shopId,
        p_date: date,
        p_time: time + ":00",
        p_duration_min: duration,
        p_party_size: size,
      });
      if (error) {
        // Fallback: fetch all tables for this shop filtered by capacity
        const { data: fallback } = await (supabase as any)
          .from("tables")
          .select("id, name, capacity, shape, status")
          .eq("shop_id", shopId)
          .gte("capacity", size)
          .not("status", "in", '("occupied","dirty")');
        setAvailableTables((fallback ?? []) as TableRow[]);
      } else {
        setAvailableTables((data ?? []) as TableRow[]);
      }
    } finally {
      setTablesLoading(false);
    }
  }, [duration]);

  const calStart = addDays(new Date(), calOffset * 7);
  const calDays = Array.from({ length: 14 }, (_, i) => isoDate(addDays(calStart, i)));

  const proceedToTable = () => {
    if (!selectedDate) { toast.error("Pilih tanggal terlebih dahulu"); return; }
    if (!selectedTime) { toast.error("Pilih waktu terlebih dahulu"); return; }
    if (!shop) return;
    const sz = Math.max(1, Number(partySize) || 1);
    loadTables(shop.id, selectedDate, selectedTime, sz);
    setSelectedTable(null);
    setStep("table");
  };

  const proceedToForm = () => {
    if (!selectedTable) { toast.error("Pilih meja terlebih dahulu"); return; }
    setStep("form");
  };

  const submit = async () => {
    if (!shop || !selectedDate || !selectedTime || !selectedTable) return;
    if (!name.trim()) { toast.error("Nama wajib diisi"); return; }
    if (!phone.trim()) { toast.error("Nomor WhatsApp wajib diisi"); return; }
    const sz = Math.max(1, Number(partySize) || 1);
    setSubmitting(true);
    try {
      const { data: res, error } = await (supabase as any)
        .from("table_reservations")
        .insert({
          shop_id: shop.id,
          table_id: selectedTable.id,
          table_name: selectedTable.name,
          customer_name: name.trim(),
          customer_phone: phone.trim(),
          customer_email: email.trim() || null,
          party_size: sz,
          reservation_date: selectedDate,
          reservation_time: selectedTime + ":00",
          duration_minutes: duration,
          status: "pending",
          notes: notes.trim() || null,
        })
        .select("id, cancel_token")
        .maybeSingle();
      if (error) throw error;

      // Notify owner
      try {
        await (supabase as any).from("owner_notifications").insert({
          shop_id: shop.id,
          type: "table_reservation_new",
          title: `🪑 Reservasi meja baru — ${name.trim()}`,
          body: `${selectedTable.name} · ${sz} tamu · ${fmtDate(selectedDate)} ${fmtTime(selectedTime)} · WA: ${phone.trim()}`,
          severity: "info",
          link: "/pos-app/reservasi",
          dedupe_key: `res_${res?.id ?? Date.now()}`,
        });
      } catch { /* non-critical */ }

      setReservationId(res?.id ?? null);
      setCancelToken(res?.cancel_token ?? null);
      setStep("success");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat reservasi. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceHeader />
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <MarketplaceFooter />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceHeader />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Toko tidak ditemukan</h1>
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">← Beranda</Link>
        </div>
        <MarketplaceFooter />
      </div>
    );
  }

  if (notEnabled) {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceHeader />
        <div className="mx-auto max-w-xl px-4 py-20 text-center">
          <UtensilsCrossed className="mx-auto h-12 w-12 text-muted-foreground/40 mb-4" />
          <h1 className="text-xl font-bold mb-2">Reservasi tidak tersedia</h1>
          <p className="text-muted-foreground text-sm mb-6">Toko ini belum mengaktifkan fitur reservasi meja.</p>
          <Button asChild variant="outline">
            <Link to="/toko/$slug" params={{ slug }}>← Kembali ke toko</Link>
          </Button>
        </div>
        <MarketplaceFooter />
      </div>
    );
  }

  const maxParty = shop?.reservation_max_party ?? 20;

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />

      {/* Shop header */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 to-background">
        <div className="mx-auto max-w-3xl px-4 py-6">
          <Button asChild variant="ghost" size="sm" className="mb-4 -ml-2 gap-1.5 text-muted-foreground">
            <Link to="/toko/$slug" params={{ slug }}>
              <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke {shop?.name}
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            {shop?.logo_url ? (
              <img src={shop.logo_url} alt={shop.name} className="h-12 w-12 rounded-xl object-cover shrink-0" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                <Store className="h-6 w-6" />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold">{shop?.name}</h1>
                {shop?.kyc_status === "approved" && (
                  <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-green-700">
                    <ShieldCheck className="h-3 w-3" />
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                <UtensilsCrossed className="h-3.5 w-3.5" />
                Reservasi Meja
              </p>
            </div>
          </div>
          {shop?.reservation_notes && (
            <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 flex gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{shop.reservation_notes}</span>
            </div>
          )}
        </div>
      </section>

      {/* Step progress */}
      {step !== "success" && (
        <div className="border-b border-border bg-background/80 sticky top-0 z-10 backdrop-blur">
          <div className="mx-auto max-w-3xl px-4 py-3">
            <div className="flex items-center gap-1 text-xs">
              {(["date", "table", "form"] as Step[]).map((s, i) => {
                const labels = ["Tanggal & Waktu", "Pilih Meja", "Isi Data"];
                const isDone = (step === "table" && i < 1) || (step === "form" && i < 2);
                const isCurrent = s === step;
                return (
                  <div key={s} className="flex items-center gap-1">
                    {i > 0 && <div className={`h-px w-4 ${isDone ? "bg-primary" : "bg-border"}`} />}
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-full font-medium transition-colors ${
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : isDone
                          ? "text-primary"
                          : "text-muted-foreground"
                    }`}>
                      {isDone ? <Check className="h-3 w-3" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                      {labels[i]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">

        {/* ── STEP: Date & Time ───────────────────────────────────── */}
        {step === "date" && (
          <div className="space-y-6">
            {/* Party size */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4 text-primary" /> Jumlah Tamu
              </div>
              <div className="flex items-center gap-3">
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-accent transition"
                  onClick={() => setPartySize(s => String(Math.max(1, Number(s) - 1)))}
                >−</button>
                <span className="w-12 text-center text-xl font-bold">{partySize}</span>
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-border hover:bg-accent transition"
                  onClick={() => setPartySize(s => String(Math.min(maxParty, Number(s) + 1)))}
                >+</button>
                <span className="text-xs text-muted-foreground">orang (maks. {maxParty})</span>
              </div>
            </div>

            {/* Calendar */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarCheck className="h-4 w-4 text-primary" /> Pilih Tanggal
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setCalOffset(o => Math.max(0, o - 1))}
                    disabled={calOffset === 0}
                    className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-accent disabled:opacity-30 transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setCalOffset(o => o + 1)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg hover:bg-accent transition"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {MONTH_NAMES[calStart.getMonth()]} {calStart.getFullYear()}
              </p>
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-medium text-muted-foreground mb-1">
                {DAY_NAMES_SHORT.map(d => <span key={d}>{d}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calDays.map(day => {
                  const d = new Date(day + "T00:00:00");
                  const isSelected = day === selectedDate;
                  const isPast = d < new Date(isoDate(new Date()) + "T00:00:00");
                  return (
                    <button
                      key={day}
                      disabled={isPast}
                      onClick={() => setSelectedDate(day)}
                      className={`aspect-square rounded-lg text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow"
                          : isPast
                            ? "text-muted-foreground/30 cursor-not-allowed"
                            : "hover:bg-accent text-foreground"
                      }`}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
              {selectedDate && (
                <p className="text-xs text-primary font-medium mt-1">
                  ✓ {fmtDate(selectedDate)}
                </p>
              )}
            </div>

            {/* Time slots */}
            {selectedDate && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Clock className="h-4 w-4 text-primary" /> Pilih Waktu
                </div>
                <p className="text-xs text-muted-foreground">
                  Durasi reservasi: {duration} menit
                </p>
                {timeSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Tidak ada slot tersedia hari ini.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {timeSlots.map(t => (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className={`rounded-lg border py-2 text-xs font-medium transition-all ${
                          selectedTime === t
                            ? "border-primary bg-primary text-primary-foreground shadow"
                            : "border-border hover:border-primary/50 hover:bg-accent"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={!selectedDate || !selectedTime}
              onClick={proceedToTable}
            >
              Cari Meja Tersedia
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {/* ── STEP: Table selection ───────────────────────────────── */}
        {step === "table" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep("date")}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <p className="text-sm font-semibold">
                  {fmtDate(selectedDate)} · {fmtTime(selectedTime)}
                </p>
                <p className="text-xs text-muted-foreground">{partySize} tamu · {duration} menit</p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <LayoutGrid className="h-4 w-4 text-primary" /> Meja Tersedia
              </div>
              {tablesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : availableTables.length === 0 ? (
                <div className="py-10 text-center space-y-2">
                  <UtensilsCrossed className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground font-medium">Tidak ada meja tersedia</p>
                  <p className="text-xs text-muted-foreground">Coba tanggal / waktu lain atau kurangi jumlah tamu.</p>
                  <Button variant="outline" size="sm" onClick={() => setStep("date")}>
                    Ubah Jadwal
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {availableTables.map(tbl => {
                    const isSelected = selectedTable?.id === tbl.id;
                    return (
                      <button
                        key={tbl.id}
                        onClick={() => setSelectedTable(tbl)}
                        className={`relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/40"
                            : "border-border hover:border-primary/40 hover:bg-accent/40"
                        }`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-primary ${
                          isSelected ? "bg-primary/15" : "bg-primary/8"
                        }`}>
                          {tbl.shape === "circle"
                            ? <Circle className="h-5 w-5" />
                            : <Square className="h-5 w-5" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{tbl.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <span className="inline-flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              Kapasitas {tbl.capacity} orang
                            </span>
                          </p>
                          <span className={`mt-1 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                            tbl.status === "available" || tbl.status === "reserved"
                              ? "bg-green-100 text-green-700"
                              : "bg-muted text-muted-foreground"
                          }`}>
                            Tersedia
                          </span>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="absolute top-3 right-3 h-4 w-4 text-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {availableTables.length > 0 && (
              <Button
                className="w-full"
                size="lg"
                disabled={!selectedTable}
                onClick={proceedToForm}
              >
                Lanjut Isi Data
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        )}

        {/* ── STEP: Customer form ─────────────────────────────────── */}
        {step === "form" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep("table")}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-accent transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <p className="text-sm font-semibold">
                  {selectedTable?.name} · {fmtDate(selectedDate)} · {fmtTime(selectedTime)}
                </p>
                <p className="text-xs text-muted-foreground">{partySize} tamu · {duration} menit</p>
              </div>
            </div>

            {/* Summary card */}
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Ringkasan Reservasi</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Meja</span>
                  <span className="font-medium">{selectedTable?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tanggal</span>
                  <span className="font-medium">{fmtDate(selectedDate)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Waktu</span>
                  <span className="font-medium">{fmtTime(selectedTime)} ({duration} menit)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jumlah tamu</span>
                  <span className="font-medium">{partySize} orang</span>
                </div>
              </div>
            </div>

            {/* Form fields */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-4">
              <p className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Data Pemesan
              </p>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="res-name">Nama Lengkap <span className="text-destructive">*</span></Label>
                  <Input
                    id="res-name"
                    placeholder="Nama pemesan"
                    value={name}
                    onChange={e => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="res-phone">Nomor WhatsApp <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="res-phone"
                      placeholder="08xx-xxxx-xxxx"
                      className="pl-9"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      type="tel"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="res-email">Email <span className="text-muted-foreground text-xs">(opsional)</span></Label>
                  <Input
                    id="res-email"
                    placeholder="email@contoh.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    type="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="res-notes">Catatan Tambahan <span className="text-muted-foreground text-xs">(opsional)</span></Label>
                  <Textarea
                    id="res-notes"
                    placeholder="Misal: ada bayi, alergi makanan, acara ulang tahun..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={submitting || !name.trim() || !phone.trim()}
              onClick={submit}
            >
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Memproses...</>
                : <><CheckCircle2 className="h-4 w-4 mr-2" />Konfirmasi Reservasi</>
              }
            </Button>
          </div>
        )}

        {/* ── STEP: Success ───────────────────────────────────────── */}
        {step === "success" && (
          <div className="space-y-4 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-9 w-9 text-green-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-green-700">Reservasi Terkirim!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Menunggu konfirmasi dari <strong>{shop?.name}</strong>
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 text-left space-y-2 text-sm">
              <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Detail Reservasi</p>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nama</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Meja</span>
                <span className="font-medium">{selectedTable?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tanggal</span>
                <span className="font-medium">{fmtDate(selectedDate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Waktu</span>
                <span className="font-medium">{fmtTime(selectedTime)} — selesai ~{
                  (() => {
                    const [hh, mm] = selectedTime.split(":").map(Number);
                    const end = hh * 60 + mm + duration;
                    return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
                  })()
                }</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Jumlah tamu</span>
                <span className="font-medium">{partySize} orang</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary" className="text-amber-700 bg-amber-100">Menunggu Konfirmasi</Badge>
              </div>
            </div>

            {cancelToken && (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-left">
                <p className="text-xs font-semibold mb-1 text-muted-foreground">Token Pembatalan</p>
                <p className="text-xs text-muted-foreground mb-2">
                  Simpan kode ini untuk membatalkan reservasi jika diperlukan.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-background border border-border px-2 py-1.5 text-xs font-mono break-all">
                    {cancelToken}
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(cancelToken);
                      setTokenCopied(true);
                      setTimeout(() => setTokenCopied(false), 2000);
                    }}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border hover:bg-accent transition"
                  >
                    {tokenCopied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {shop?.phone && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 text-xs text-blue-800 text-left flex gap-2">
                <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  Konfirmasi biasanya dikirim via WhatsApp. Jika belum ada kabar dalam 1 jam, hubungi{" "}
                  <a href={`https://wa.me/${shop.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="underline font-medium">
                    {shop.phone}
                  </a>
                </span>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button asChild>
                <Link to="/toko/$slug" params={{ slug }}>
                  Kembali ke Toko
                </Link>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("date");
                  setSelectedDate(""); setSelectedTime(""); setSelectedTable(null);
                  setName(""); setPhone(""); setEmail(""); setNotes("");
                  setReservationId(null); setCancelToken(null);
                }}
              >
                Buat Reservasi Baru
              </Button>
            </div>
          </div>
        )}
      </div>

      <MarketplaceFooter />
    </div>
  );
}
