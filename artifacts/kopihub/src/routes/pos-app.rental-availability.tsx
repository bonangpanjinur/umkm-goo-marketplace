import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Car, Plus, Trash2, Pencil, Loader2, Copy, Check, CalendarSearch, CheckCircle2, XCircle, Info } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/rental-availability")({
  head: () => ({ meta: [{ title: "Ketersediaan Unit Rental" }] }),
  component: RentalAvailabilityPage,
});

type RentalUnit = {
  id: string;
  name: string;
  unit_code: string | null;
  category: string | null;
  description: string | null;
  condition: "excellent" | "good" | "fair" | "maintenance";
  daily_price: number | null;
  deposit_amount: number | null;
  is_active: boolean;
};

type RentalBooking = {
  id: string;
  unit_id: string;
  customer_name: string;
  customer_phone: string | null;
  start_date: string;
  end_date: string;
  status: string;
  notes: string | null;
};

const CONDITION_LABEL: Record<string, string> = {
  excellent: "Sangat Baik",
  good: "Baik",
  fair: "Cukup",
  maintenance: "Perbaikan",
};
const CONDITION_COLOR: Record<string, string> = {
  excellent: "bg-green-100 text-green-800",
  good: "bg-blue-100 text-blue-800",
  fair: "bg-amber-100 text-amber-800",
  maintenance: "bg-red-100 text-red-800",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  confirmed: "Dikonfirmasi",
  active: "Disewa",
  completed: "Selesai",
  cancelled: "Batal",
};

function RentalAvailabilityPage() {
  const { shop } = useCurrentShop();
  const [units, setUnits] = useState<RentalUnit[]>([]);
  const [bookings, setBookings] = useState<RentalBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablesMissing, setTablesMissing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"units" | "availability" | "bookings">("units");

  // Check range form
  const [checkStart, setCheckStart] = useState("");
  const [checkEnd, setCheckEnd] = useState("");
  const [checking, setChecking] = useState(false);
  const [availResult, setAvailResult] = useState<{ unit: RentalUnit; available: boolean }[]>([]);

  // Unit form
  const [showForm, setShowForm] = useState(false);
  const [editUnit, setEditUnit] = useState<RentalUnit | null>(null);
  const [form, setForm] = useState({ name: "", unit_code: "", category: "", description: "", condition: "good", daily_price: "", deposit_amount: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shop) return;
    load();
  }, [shop]);

  async function load() {
    setLoading(true);
    const { data: u, error: ue } = await (supabase as any).from("rental_units").select("*").eq("shop_id", shop!.id).order("sort_order");
    if (ue?.code === "42P01") { setTablesMissing(true); setLoading(false); return; }
    setUnits((u ?? []) as RentalUnit[]);
    const { data: b } = await (supabase as any).from("rental_bookings").select("*").eq("shop_id", shop!.id).order("start_date", { ascending: false }).limit(100);
    setBookings((b ?? []) as RentalBooking[]);
    setLoading(false);
  }

  async function checkAvailability() {
    if (!checkStart || !checkEnd) { toast.error("Pilih tanggal mulai dan selesai"); return; }
    if (checkEnd <= checkStart) { toast.error("Tanggal selesai harus setelah tanggal mulai"); return; }
    setChecking(true);
    const result: { unit: RentalUnit; available: boolean }[] = [];
    for (const unit of units.filter(u => u.is_active && u.condition !== "maintenance")) {
      const { data: conflicts } = await (supabase as any)
        .from("rental_bookings")
        .select("id")
        .eq("unit_id", unit.id)
        .in("status", ["pending", "confirmed", "active"])
        .lt("start_date", checkEnd)
        .gt("end_date", checkStart);
      result.push({ unit, available: !conflicts || conflicts.length === 0 });
    }
    setAvailResult(result);
    setChecking(false);
  }

  function openAdd() { setEditUnit(null); setForm({ name: "", unit_code: "", category: "", description: "", condition: "good", daily_price: "", deposit_amount: "" }); setShowForm(true); }
  function openEdit(u: RentalUnit) { setEditUnit(u); setForm({ name: u.name, unit_code: u.unit_code ?? "", category: u.category ?? "", description: u.description ?? "", condition: u.condition, daily_price: u.daily_price?.toString() ?? "", deposit_amount: u.deposit_amount?.toString() ?? "" }); setShowForm(true); }

  async function saveUnit() {
    if (!form.name.trim()) { toast.error("Nama unit wajib diisi"); return; }
    setSaving(true);
    const payload = { shop_id: shop!.id, name: form.name.trim(), unit_code: form.unit_code || null, category: form.category || null, description: form.description || null, condition: form.condition, daily_price: form.daily_price ? Number(form.daily_price) : null, deposit_amount: form.deposit_amount ? Number(form.deposit_amount) : null };
    const { error } = editUnit
      ? await (supabase as any).from("rental_units").update(payload).eq("id", editUnit.id)
      : await (supabase as any).from("rental_units").insert(payload);
    if (error) { toast.error(error.message); } else { toast.success(editUnit ? "Unit diperbarui" : "Unit ditambahkan"); setShowForm(false); load(); }
    setSaving(false);
  }

  async function deleteUnit(id: string) {
    if (!confirm("Hapus unit ini?")) return;
    await (supabase as any).from("rental_units").delete().eq("id", id);
    toast.success("Unit dihapus");
    load();
  }

  async function updateBookingStatus(id: string, status: string) {
    await (supabase as any).from("rental_bookings").update({ status }).eq("id", id);
    toast.success("Status diperbarui");
    load();
  }

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  if (tablesMissing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Ketersediaan Unit Rental</h1>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 p-5 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-semibold text-sm">
            <Info className="h-4 w-4 shrink-0" /> Tabel belum dibuat
          </div>
          <p className="text-sm text-muted-foreground">Jalankan SQL ini di Supabase SQL Editor untuk mengaktifkan fitur.</p>
          <pre className="text-xs bg-muted rounded-lg p-3 overflow-auto max-h-64 select-all">{RENTAL_SQL}</pre>
          <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(RENTAL_SQL); setCopied(true); setTimeout(() => setCopied(false), 2000); toast.success("SQL disalin"); }} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Disalin" : "Salin SQL"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Car className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Ketersediaan Unit Rental</h1>
        </div>
        <Button onClick={openAdd} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" /> Tambah Unit
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl bg-muted p-1 text-sm">
        {[["units", "Unit Armada"], ["availability", "Cek Ketersediaan"], ["bookings", "Pemesanan"]] .map(([key, label]) => (
          <button key={key} onClick={() => setTab(key as typeof tab)} className={`flex-1 rounded-lg py-2 px-3 font-medium transition-all ${tab === key ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Unit List */}
      {tab === "units" && (
        <div className="space-y-3">
          {units.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <Car className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Belum ada unit. Tambah unit armada terlebih dahulu.</p>
            </div>
          )}
          {units.map((u) => (
            <div key={u.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold">{u.name}</span>
                    {u.unit_code && <span className="text-xs text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">{u.unit_code}</span>}
                    <Badge className={`text-[10px] px-2 py-0 ${CONDITION_COLOR[u.condition]}`}>{CONDITION_LABEL[u.condition]}</Badge>
                    {!u.is_active && <Badge className="text-[10px] px-2 py-0 bg-gray-100 text-gray-600">Nonaktif</Badge>}
                  </div>
                  {u.category && <p className="text-xs text-muted-foreground mt-0.5">{u.category}</p>}
                  {u.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{u.description}</p>}
                  <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                    {u.daily_price != null && <span>Rp {Number(u.daily_price).toLocaleString("id-ID")}/hari</span>}
                    {u.deposit_amount != null && <span>Deposit: Rp {Number(u.deposit_amount).toLocaleString("id-ID")}</span>}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(u)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500 hover:text-red-600" onClick={() => deleteUnit(u.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Availability Checker */}
      {tab === "availability" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2 text-sm">
              <CalendarSearch className="h-4 w-4 text-primary" /> Cek Ketersediaan
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Tanggal Mulai Sewa</Label>
                <Input type="date" value={checkStart} onChange={e => setCheckStart(e.target.value)} min={new Date().toISOString().slice(0,10)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tanggal Selesai Sewa</Label>
                <Input type="date" value={checkEnd} onChange={e => setCheckEnd(e.target.value)} min={checkStart || new Date().toISOString().slice(0,10)} />
              </div>
            </div>
            <Button onClick={checkAvailability} disabled={checking} className="gap-2">
              {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarSearch className="h-4 w-4" />}
              Cek Sekarang
            </Button>
          </div>

          {availResult.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Hasil untuk {new Date(checkStart).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – {new Date(checkEnd).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              </h3>
              {availResult.map(({ unit, available }) => (
                <div key={unit.id} className={`flex items-center gap-3 rounded-xl border p-4 ${available ? "border-green-200 bg-green-50 dark:bg-green-900/10" : "border-red-200 bg-red-50 dark:bg-red-900/10"}`}>
                  {available ? <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" /> : <XCircle className="h-5 w-5 text-red-500 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm">{unit.name}</p>
                    {unit.unit_code && <p className="text-xs text-muted-foreground">{unit.unit_code}</p>}
                  </div>
                  <Badge className={`text-xs shrink-0 ${available ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                    {available ? "Tersedia" : "Tidak Tersedia"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bookings */}
      {tab === "bookings" && (
        <div className="space-y-3">
          {bookings.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-10 text-center">
              <CalendarSearch className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Belum ada pemesanan rental.</p>
            </div>
          )}
          {bookings.map((b) => {
            const unit = units.find(u => u.id === b.unit_id);
            return (
              <div key={b.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{b.customer_name}</p>
                    {b.customer_phone && <p className="text-xs text-muted-foreground">{b.customer_phone}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      Unit: <span className="text-foreground font-medium">{unit?.name ?? b.unit_id}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.start_date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} → {new Date(b.end_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <Select value={b.status} onValueChange={(v) => updateBookingStatus(b.id, v)}>
                    <SelectTrigger className="h-7 text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_LABEL).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {b.notes && <p className="text-xs text-muted-foreground border-t border-border pt-2">{b.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {/* Unit Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editUnit ? "Edit Unit" : "Tambah Unit"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Unit *</Label>
              <Input placeholder="Contoh: Toyota Avanza 2023" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Kode/Nomor Unit</Label>
                <Input placeholder="Contoh: B 1234 CD" value={form.unit_code} onChange={e => setForm(f => ({ ...f, unit_code: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Kategori</Label>
                <Input placeholder="Mobil, Motor, Tenda…" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Kondisi</Label>
              <Select value={form.condition} onValueChange={v => setForm(f => ({ ...f, condition: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(CONDITION_LABEL).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Harga/Hari (Rp)</Label>
                <Input type="number" placeholder="0" value={form.daily_price} onChange={e => setForm(f => ({ ...f, daily_price: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Deposit (Rp)</Label>
                <Input type="number" placeholder="0" value={form.deposit_amount} onChange={e => setForm(f => ({ ...f, deposit_amount: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Deskripsi</Label>
              <Textarea placeholder="Spesifikasi, fasilitas, ketentuan…" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Batal</Button>
            <Button onClick={saveUnit} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editUnit ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
