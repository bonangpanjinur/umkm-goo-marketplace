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
import { CalendarPlus, Loader2, RefreshCw, Car, Clock, CheckCircle2, XCircle, AlertTriangle, MessageSquare, Search } from "lucide-react";

export const Route = createFileRoute("/pos-app/rental-extend")({
  head: () => ({ meta: [{ title: "Perpanjangan Sewa" }] }),
  component: RentalExtendPage,
});

type RentalBooking = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  start_date: string;
  end_date: string;
  status: string;
  notes: string | null;
  total_days: number;
  unit: { name: string; unit_code: string | null; daily_price: number | null } | null;
  extension_requested: boolean | null;
  extension_days: number | null;
  extension_status: string | null;
  extension_notes: string | null;
};

const STATUS = {
  pending:   { label: "Aktif",     cls: "bg-green-100 text-green-700" },
  confirmed: { label: "Dikonfirmasi", cls: "bg-blue-100 text-blue-700" },
  active:    { label: "Sedang Sewa", cls: "bg-indigo-100 text-indigo-700" },
  completed: { label: "Selesai",   cls: "bg-gray-100 text-gray-600" },
  cancelled: { label: "Dibatalkan", cls: "bg-red-100 text-red-700" },
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function RentalExtendPage() {
  const { shop } = useCurrentShop();
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<RentalBooking | null>(null);
  const [extDays, setExtDays] = useState("1");
  const [extNotes, setExtNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("rental_bookings")
        .select("id, customer_name, customer_phone, start_date, end_date, status, notes, total_days, extension_requested, extension_days, extension_status, extension_notes, unit:rental_units(name, unit_code, daily_price)")
        .eq("shop_id", shopId)
        .in("status", ["confirmed", "active"])
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

  const approve = async (booking: RentalBooking, action: "approved" | "rejected") => {
    if (!booking.extension_days) return;
    setSaving(true);
    try {
      const newEnd = new Date(booking.end_date + "T00:00:00");
      newEnd.setDate(newEnd.getDate() + booking.extension_days);
      const updates: Record<string, unknown> = {
        extension_status: action,
      };
      if (action === "approved") {
        updates.end_date = newEnd.toISOString().split("T")[0];
        updates.extension_new_end_date = newEnd.toISOString().split("T")[0];
      }
      const { error } = await (supabase as any)
        .from("rental_bookings")
        .update(updates)
        .eq("id", booking.id);
      if (error) throw error;

      if (booking.customer_phone) {
        const msg = action === "approved"
          ? `Halo ${booking.customer_name}, permintaan perpanjangan sewa unit ${booking.unit?.name ?? ""} selama ${booking.extension_days} hari telah DISETUJUI. Tanggal kembali baru: ${fmtDate(newEnd.toISOString().split("T")[0])}.`
          : `Halo ${booking.customer_name}, permintaan perpanjangan sewa tidak dapat disetujui. Mohon hubungi kami untuk info lebih lanjut.`;
        window.open(`https://wa.me/${booking.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
      }
      toast.success(action === "approved" ? "Perpanjangan disetujui!" : "Perpanjangan ditolak");
      load(shop!.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setSaving(false);
    }
  };

  const requestExtension = async () => {
    if (!selected) return;
    const days = Math.max(1, Number(extDays) || 1);
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("rental_bookings")
        .update({
          extension_requested: true,
          extension_days: days,
          extension_status: "pending",
          extension_notes: extNotes.trim() || null,
        })
        .eq("id", selected.id);
      if (error) throw error;
      toast.success("Permintaan perpanjangan dibuat");
      setSelected(null);
      setExtDays("1");
      setExtNotes("");
      load(shop!.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally {
      setSaving(false);
    }
  };

  const filtered = bookings.filter(b => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return b.customer_name.toLowerCase().includes(s) || (b.customer_phone ?? "").includes(s) || (b.unit?.name ?? "").toLowerCase().includes(s);
  });

  const today = new Date().toISOString().split("T")[0];
  const expiringToday = bookings.filter(b => b.end_date === today).length;

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <CalendarPlus className="h-5 w-5 text-primary" />
            Perpanjangan Sewa
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Kelola permintaan perpanjangan dari penyewa.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(shop.id)} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Muat Ulang
        </Button>
      </div>

      {expiringToday > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span><strong>{expiringToday} sewa</strong> berakhir hari ini. Hubungi penyewa untuk konfirmasi pengembalian atau perpanjangan.</span>
        </div>
      )}

      {showSql && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="text-sm font-semibold text-amber-800">Kolom perpanjangan belum ada. Jalankan SQL berikut:</p>
          <pre className="rounded bg-amber-100 p-2 text-xs font-mono overflow-x-auto">{SQL_HINT}</pre>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Cari nama, WA, atau unit..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <CalendarPlus className="mx-auto h-8 w-8 opacity-30 mb-2" />
          <p className="text-sm">Tidak ada sewa aktif yang ditemukan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => {
            const st = STATUS[b.status as keyof typeof STATUS];
            const addlCost = b.unit?.daily_price ? b.unit.daily_price * (b.extension_days ?? 0) : 0;
            return (
              <div key={b.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{b.customer_name}</span>
                      {st && <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>}
                      {b.extension_requested && b.extension_status === "pending" && (
                        <Badge variant="default" className="bg-amber-500 text-white text-xs">
                          Minta Perpanjang +{b.extension_days}h
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Car className="h-3 w-3" /> {b.unit?.name ?? "—"}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtDate(b.start_date)} — {fmtDate(b.end_date)}</span>
                      <span>{b.total_days} hari</span>
                    </div>
                    {b.extension_notes && (
                      <p className="mt-1 text-xs text-muted-foreground italic">Catatan: {b.extension_notes}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    {b.extension_requested && b.extension_status === "pending" ? (
                      <>
                        <p className="text-xs text-right text-muted-foreground">Tambahan: {formatIDR(addlCost)}</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive" disabled={saving} onClick={() => approve(b, "rejected")}>
                            <XCircle className="h-3 w-3 mr-1" /> Tolak
                          </Button>
                          <Button size="sm" disabled={saving} onClick={() => approve(b, "approved")}>
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Setujui
                          </Button>
                        </div>
                      </>
                    ) : b.extension_status === "approved" ? (
                      <Badge className="bg-green-100 text-green-700 text-xs">Perpanjangan Disetujui</Badge>
                    ) : (
                      <div className="flex gap-2">
                        {b.customer_phone && (
                          <a
                            href={`https://wa.me/${b.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Halo ${b.customer_name}, sewa unit ${b.unit?.name ?? ""} Anda berakhir pada ${fmtDate(b.end_date)}. Apakah ingin diperpanjang?`)}`}
                            target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md border border-green-300 bg-green-50 px-2 py-1 text-xs text-green-700 hover:bg-green-100"
                          >
                            <MessageSquare className="h-3 w-3" /> WA
                          </a>
                        )}
                        <Button size="sm" variant="outline" onClick={() => setSelected(b)}>
                          <CalendarPlus className="h-3 w-3 mr-1" /> Perpanjang
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog perpanjangan */}
      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              Perpanjang Sewa — {selected?.customer_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-muted/30 border p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unit</span>
                <span className="font-medium">{selected?.unit?.name}</span>
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted-foreground">Tanggal kembali saat ini</span>
                <span className="font-medium">{selected ? fmtDate(selected.end_date) : ""}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Perpanjang (hari) <span className="text-destructive">*</span></Label>
              <Input type="number" min={1} value={extDays} onChange={e => setExtDays(e.target.value)} />
              {selected?.unit?.daily_price && (
                <p className="text-xs text-muted-foreground">
                  Biaya tambahan: {formatIDR(selected.unit.daily_price * (Number(extDays) || 0))}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Catatan (opsional)</Label>
              <Textarea value={extNotes} onChange={e => setExtNotes(e.target.value)} rows={2} placeholder="Alasan perpanjangan..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Batal</Button>
            <Button disabled={saving} onClick={requestExtension}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarPlus className="h-4 w-4 mr-2" />}
              Ajukan Perpanjangan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
