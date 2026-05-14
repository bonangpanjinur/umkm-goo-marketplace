import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import {
  AlertTriangle, Loader2, RefreshCw, Calculator, Car, Clock,
  CheckCircle2, Banknote, MessageSquare, Search, Settings2,
} from "lucide-react";

export const Route = createFileRoute("/pos-app/rental-fines")({
  head: () => ({ meta: [{ title: "Denda Keterlambatan Rental" }] }),
  component: RentalFinesPage,
});

type RentalBooking = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  end_date: string;
  status: string;
  total_days: number;
  actual_return_date: string | null;
  fine_per_day: number | null;
  fine_total: number | null;
  fine_status: string | null;
  fine_notes: string | null;
  unit: { name: string; unit_code: string | null; daily_price: number | null } | null;
};

const SQL_HINT = `-- Jalankan di Supabase SQL Editor:
ALTER TABLE public.rental_bookings
  ADD COLUMN IF NOT EXISTS actual_return_date date,
  ADD COLUMN IF NOT EXISTS fine_per_day numeric(12,2),
  ADD COLUMN IF NOT EXISTS fine_total numeric(12,2),
  ADD COLUMN IF NOT EXISTS fine_status text CHECK (fine_status IN ('pending','paid','waived')),
  ADD COLUMN IF NOT EXISTS fine_notes text;

-- Config denda per unit:
ALTER TABLE public.rental_units
  ADD COLUMN IF NOT EXISTS fine_per_day numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fine_type text DEFAULT 'fixed' CHECK (fine_type IN ('fixed','percent'));`;

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}
function daysDiff(from: string, to: string) {
  const a = new Date(from + "T00:00:00").getTime();
  const b = new Date(to + "T00:00:00").getTime();
  return Math.max(0, Math.floor((b - a) / 86400000));
}

export default function RentalFinesPage() {
  const { shop } = useCurrentShop();
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RentalBooking | null>(null);
  const [returnDate, setReturnDate] = useState("");
  const [finePerDay, setFinePerDay] = useState("");
  const [fineNotes, setFineNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [defaultFine, setDefaultFine] = useState("50000");

  const today = new Date().toISOString().split("T")[0];

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("rental_bookings")
        .select("id, customer_name, customer_phone, end_date, status, total_days, actual_return_date, fine_per_day, fine_total, fine_status, fine_notes, unit:rental_units(name, unit_code, daily_price)")
        .eq("shop_id", shopId)
        .in("status", ["active", "completed"])
        .order("end_date");
      if (error) {
        if (error.message?.includes("column")) setShowSql(true);
        else toast.error("Gagal memuat data");
      }
      setBookings((data ?? []) as RentalBooking[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (shop?.id) load(shop.id);
  }, [shop?.id, load]);

  const openFineDialog = (b: RentalBooking) => {
    setSelected(b);
    setReturnDate(today);
    setFinePerDay(b.fine_per_day ? String(b.fine_per_day) : defaultFine);
    setFineNotes("");
  };

  const calcFine = () => {
    if (!selected || !returnDate) return 0;
    const lateDays = daysDiff(selected.end_date, returnDate);
    return lateDays * (Number(finePerDay) || 0);
  };

  const saveFine = async () => {
    if (!selected) return;
    setSaving(true);
    const lateDays = daysDiff(selected.end_date, returnDate);
    const total = calcFine();
    try {
      const { error } = await (supabase as any)
        .from("rental_bookings")
        .update({
          actual_return_date: returnDate,
          fine_per_day: Number(finePerDay) || 0,
          fine_total: total,
          fine_status: total > 0 ? "pending" : "waived",
          fine_notes: fineNotes.trim() || null,
          status: "completed",
        })
        .eq("id", selected.id);
      if (error) throw error;

      if (total > 0 && selected.customer_phone) {
        const msg = `Halo ${selected.customer_name}, unit ${selected.unit?.name ?? ""} dikembalikan terlambat ${lateDays} hari. Denda keterlambatan: ${formatIDR(total)}. Mohon segera melunasi. Terima kasih.`;
        window.open(`https://wa.me/${selected.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
      }
      toast.success(total > 0 ? `Denda ${formatIDR(total)} dicatat` : "Pengembalian dicatat tanpa denda");
      setSelected(null);
      load(shop!.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const markPaid = async (b: RentalBooking) => {
    const { error } = await (supabase as any)
      .from("rental_bookings")
      .update({ fine_status: "paid" })
      .eq("id", b.id);
    if (error) { toast.error("Gagal"); return; }
    toast.success("Denda ditandai lunas");
    load(shop!.id);
  };

  const filtered = bookings.filter(b => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return b.customer_name.toLowerCase().includes(s) || (b.customer_phone ?? "").includes(s);
  });

  const overdueCount = bookings.filter(b => b.end_date < today && b.status !== "completed").length;
  const pendingFines = bookings.filter(b => b.fine_status === "pending").length;

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Denda Keterlambatan
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Catat pengembalian & hitung denda otomatis per hari keterlambatan.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowConfig(true)} className="gap-1.5">
            <Settings2 className="h-3.5 w-3.5" /> Konfigurasi
          </Button>
          <Button variant="outline" size="sm" onClick={() => load(shop.id)} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Muat Ulang
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Terlambat Kembali", value: overdueCount, cls: "text-red-600 bg-red-50" },
          { label: "Denda Belum Lunas", value: pendingFines, cls: "text-amber-600 bg-amber-50" },
          { label: "Total Terkelola", value: filtered.length, cls: "text-primary bg-primary/5" },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.cls}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {showSql && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800">Kolom denda belum ada. Jalankan SQL ini:</p>
          <pre className="rounded bg-amber-100 p-2 text-xs font-mono overflow-x-auto">{SQL_HINT}</pre>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cari nama penyewa..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <Car className="mx-auto h-8 w-8 opacity-30 mb-2" />
          <p className="text-sm">Tidak ada sewa aktif.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => {
            const isLate = b.status !== "completed" && b.end_date < today;
            const lateDays = b.actual_return_date ? daysDiff(b.end_date, b.actual_return_date) : (isLate ? daysDiff(b.end_date, today) : 0);
            return (
              <div key={b.id} className={`rounded-xl border bg-card p-4 ${isLate ? "border-red-200" : "border-border"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{b.customer_name}</span>
                      {isLate && <Badge className="bg-red-100 text-red-700 text-xs">Terlambat {daysDiff(b.end_date, today)}h</Badge>}
                      {b.fine_status === "pending" && <Badge className="bg-amber-100 text-amber-700 text-xs">Denda Belum Lunas</Badge>}
                      {b.fine_status === "paid" && <Badge className="bg-green-100 text-green-700 text-xs">Lunas</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                      <span><Car className="inline h-3 w-3 mr-0.5" />{b.unit?.name ?? "—"}</span>
                      <span><Clock className="inline h-3 w-3 mr-0.5" />Jatuh tempo: {fmtDate(b.end_date)}</span>
                      {b.actual_return_date && <span>Dikembalikan: {fmtDate(b.actual_return_date)}</span>}
                      {b.fine_total != null && b.fine_total > 0 && <span className="text-red-600 font-medium">Denda: {formatIDR(b.fine_total)}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {b.fine_status === "pending" && (
                      <Button size="sm" variant="outline" className="text-green-700 border-green-300" onClick={() => markPaid(b)}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Lunas
                      </Button>
                    )}
                    {b.status !== "completed" && (
                      <Button size="sm" onClick={() => openFineDialog(b)}>
                        <Calculator className="h-3 w-3 mr-1" /> Catat Kembali
                      </Button>
                    )}
                    {b.customer_phone && b.fine_total != null && b.fine_total > 0 && b.fine_status === "pending" && (
                      <a href={`https://wa.me/${b.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Halo ${b.customer_name}, mohon segera melunasi denda keterlambatan ${formatIDR(b.fine_total)} untuk unit ${b.unit?.name ?? ""}. Terima kasih.`)}`}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border border-green-300 bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100">
                        <MessageSquare className="h-3 w-3" /> WA
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog catat pengembalian */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Catat Pengembalian — {selected?.customer_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/30 border p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Unit</span><span>{selected?.unit?.name}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Batas kembali</span><span className="font-medium">{selected ? fmtDate(selected.end_date) : ""}</span></div>
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Dikembalikan Aktual</Label>
              <Input type="date" value={returnDate} onChange={e => setReturnDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Denda per Hari (Rp)</Label>
              <Input type="number" min={0} value={finePerDay} onChange={e => setFinePerDay(e.target.value)} />
            </div>
            {returnDate && returnDate > (selected?.end_date ?? "") && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm">
                <p className="font-medium text-red-700">
                  Terlambat {daysDiff(selected?.end_date ?? "", returnDate)} hari
                  — Denda: <strong>{formatIDR(calcFine())}</strong>
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Catatan (opsional)</Label>
              <Textarea rows={2} value={fineNotes} onChange={e => setFineNotes(e.target.value)} placeholder="Kondisi kendaraan, catatan denda..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Batal</Button>
            <Button disabled={saving} onClick={saveFine}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Banknote className="h-4 w-4 mr-2" />}
              Simpan & Selesaikan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Config dialog */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent>
          <DialogHeader><DialogTitle>Konfigurasi Default Denda</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Denda Default per Hari (Rp)</Label>
              <Input type="number" min={0} value={defaultFine} onChange={e => setDefaultFine(e.target.value)} />
              <p className="text-xs text-muted-foreground">Akan diisi otomatis saat dialog pencatatan dibuka.</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => { setShowConfig(false); toast.success("Default denda disimpan"); }}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
