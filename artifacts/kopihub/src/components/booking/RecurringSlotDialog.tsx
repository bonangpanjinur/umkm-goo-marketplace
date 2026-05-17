import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CalendarRange, Loader2, Wand2 } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shopId: string;
  bookingType: "service" | "table";
  defaultDate: string; // YYYY-MM-DD
  onGenerated?: () => void;
};

const WEEKDAYS = [
  { idx: 1, label: "Sen" },
  { idx: 2, label: "Sel" },
  { idx: 3, label: "Rab" },
  { idx: 4, label: "Kam" },
  { idx: 5, label: "Jum" },
  { idx: 6, label: "Sab" },
  { idx: 0, label: "Min" },
];

function addDays(iso: string, n: number) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string) {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.round((db - da) / 86400000);
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map((x) => Number(x));
  return (h || 0) * 60 + (m || 0);
}

function fromMinutes(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function RecurringSlotDialog({
  open,
  onOpenChange,
  shopId,
  bookingType,
  defaultDate,
  onGenerated,
}: Props) {
  const isTable = bookingType === "table";
  const [serviceName, setServiceName] = useState(isTable ? "Meja Reguler" : "Layanan");
  const [fromDate, setFromDate] = useState(defaultDate);
  const [toDate, setToDate] = useState(addDays(defaultDate, 13));
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [startTime, setStartTime] = useState(isTable ? "18:00" : "09:00");
  const [endTime, setEndTime] = useState(isTable ? "21:00" : "17:00");
  const [interval, setInterval] = useState(isTable ? "90" : "60");
  const [duration, setDuration] = useState(isTable ? "90" : "60");
  const [capacity, setCapacity] = useState(isTable ? "4" : "1");
  const [price, setPrice] = useState("0");
  const [depositPct, setDepositPct] = useState("0");
  const [skipExisting, setSkipExisting] = useState(true);
  const [busy, setBusy] = useState(false);

  const totalEstimate = useMemo(() => {
    const days = diffDays(fromDate, toDate) + 1;
    if (days <= 0 || weekdays.length === 0) return 0;
    const startM = toMinutes(startTime);
    const endM = toMinutes(endTime);
    const step = Number(interval) || 0;
    if (step <= 0 || endM <= startM) return 0;
    const slotsPerDay = Math.floor((endM - startM) / step) + 1;
    // approximate occurring weekdays in range
    let matchingDays = 0;
    for (let i = 0; i < days; i++) {
      const d = new Date(fromDate + "T00:00:00");
      d.setDate(d.getDate() + i);
      if (weekdays.includes(d.getDay())) matchingDays++;
    }
    return matchingDays * slotsPerDay;
  }, [fromDate, toDate, weekdays, startTime, endTime, interval]);

  function toggleWeekday(idx: number) {
    setWeekdays((prev) =>
      prev.includes(idx) ? prev.filter((x) => x !== idx) : [...prev, idx].sort(),
    );
  }

  async function generate() {
    if (!shopId) return;
    if (!serviceName.trim()) {
      toast.error("Nama layanan wajib diisi");
      return;
    }
    if (weekdays.length === 0) {
      toast.error("Pilih minimal 1 hari");
      return;
    }
    const days = diffDays(fromDate, toDate);
    if (days < 0) {
      toast.error("Tanggal akhir harus setelah tanggal mulai");
      return;
    }
    const startM = toMinutes(startTime);
    const endM = toMinutes(endTime);
    const step = Number(interval) || 0;
    const dur = Number(duration) || 0;
    if (step <= 0 || dur <= 0 || endM <= startM) {
      toast.error("Interval, durasi, dan rentang jam tidak valid");
      return;
    }
    if (totalEstimate > 2000) {
      toast.error("Terlalu banyak slot (>2000). Persempit rentang tanggal.");
      return;
    }

    setBusy(true);

    // Build rows
    const rows: Array<Record<string, unknown>> = [];
    for (let i = 0; i <= days; i++) {
      const dateIso = addDays(fromDate, i);
      const dow = new Date(dateIso + "T00:00:00").getDay();
      if (!weekdays.includes(dow)) continue;
      for (let t = startM; t <= endM; t += step) {
        rows.push({
          shop_id: shopId,
          service_name: serviceName.trim(),
          slot_date: dateIso,
          slot_time: fromMinutes(t) + ":00",
          duration_minutes: dur,
          capacity: Number(capacity) || 1,
          price: Number(price) || 0,
          deposit_percent: Math.max(0, Math.min(100, Number(depositPct) || 0)),
          booking_type: bookingType,
          is_active: true,
        });
      }
    }

    if (rows.length === 0) {
      toast.info("Tidak ada slot untuk dibuat");
      setBusy(false);
      return;
    }

    // Optionally skip existing (date+time match within shop+type)
    let toInsert = rows;
    if (skipExisting) {
      const { data: existing, error: exErr } = await supabase
        .from("booking_slots")
        .select("slot_date, slot_time")
        .eq("shop_id", shopId)
        .eq("booking_type", bookingType)
        .gte("slot_date", fromDate)
        .lte("slot_date", toDate);
      if (exErr) {
        toast.error(exErr.message);
        setBusy(false);
        return;
      }
      const exSet = new Set(
        (existing ?? []).map((r) => `${r.slot_date}|${String(r.slot_time).slice(0, 5)}`),
      );
      toInsert = rows.filter(
        (r) => !exSet.has(`${r.slot_date}|${String(r.slot_time).slice(0, 5)}`),
      );
    }

    if (toInsert.length === 0) {
      toast.info("Semua slot sudah ada");
      setBusy(false);
      return;
    }

    // Insert in chunks to avoid payload limits
    const CHUNK = 200;
    let inserted = 0;
    for (let i = 0; i < toInsert.length; i += CHUNK) {
      const chunk = toInsert.slice(i, i + CHUNK);
      const { error } = await supabase.from("booking_slots").insert(chunk);
      if (error) {
        toast.error(`Gagal pada batch ${i / CHUNK + 1}: ${error.message}`);
        setBusy(false);
        if (inserted > 0) onGenerated?.();
        return;
      }
      inserted += chunk.length;
    }

    toast.success(
      `${inserted} ${isTable ? "meja" : "slot"} berhasil dibuat${
        skipExisting && inserted < rows.length
          ? ` (${rows.length - inserted} dilewati karena duplikat)`
          : ""
      }`,
    );
    setBusy(false);
    onGenerated?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-5 w-5 text-primary" />
            Generate {isTable ? "Meja" : "Slot"} Mingguan
          </DialogTitle>
          <DialogDescription>
            Buat banyak {isTable ? "meja" : "slot layanan"} sekaligus dari template hari & jam.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Nama {isTable ? "Meja/Area" : "Layanan"}</Label>
            <Input
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder={isTable ? "Meja Reguler" : "Cuci & Potong"}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Dari Tanggal</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label>Sampai Tanggal</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Hari</Label>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {WEEKDAYS.map((d) => {
                const on = weekdays.includes(d.idx);
                return (
                  <button
                    key={d.idx}
                    type="button"
                    onClick={() => toggleWeekday(d.idx)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      on
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Jam Mulai</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label>Jam Akhir</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <div>
              <Label>Interval (mnt)</Label>
              <Input
                type="number"
                min={5}
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Durasi (mnt)</Label>
              <Input
                type="number"
                min={5}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div>
              <Label>Kapasitas</Label>
              <Input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
              />
            </div>
            <div>
              <Label>Harga</Label>
              <Input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <Label>DP (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={depositPct}
                onChange={(e) => setDepositPct(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-sm pb-2">
              <Checkbox
                checked={skipExisting}
                onCheckedChange={(v) => setSkipExisting(Boolean(v))}
              />
              <span>Lewati slot yang sudah ada</span>
            </label>
          </div>

          <div className="text-xs text-muted-foreground bg-muted/40 border rounded-md px-3 py-2">
            Estimasi: <span className="font-semibold text-foreground">{totalEstimate}</span>{" "}
            {isTable ? "meja" : "slot"} akan dibuat
            {totalEstimate > 500 && " — pastikan tidak berlebihan."}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Batal
          </Button>
          <Button onClick={generate} disabled={busy || totalEstimate === 0}>
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <Wand2 className="h-4 w-4 mr-1.5" />
            )}
            Generate {totalEstimate > 0 ? `${totalEstimate} ` : ""}
            {isTable ? "Meja" : "Slot"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
