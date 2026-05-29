import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCurrentShop } from "@/lib/use-shop";
import { formatIDR } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Printer, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/payslip")({
  component: PayslipPage,
});

type AttendanceRow = {
  id: string;
  business_date: string;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number | null;
  note: string | null;
};

type StaffInfo = {
  id: string;
  email: string;
  full_name?: string | null;
};

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function getMonthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const from = new Date(y, m - 1, 1).toISOString().split("T")[0];
  const to = new Date(y, m, 0).toISOString().split("T")[0];
  return { from, to };
}

function toHoursMinutes(minutes: number | null) {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}j ${m > 0 ? m + "m" : ""}`.trim();
}

function PayslipPage() {
  const { user } = useAuth();
  const { shop, loading: shopLoading } = useCurrentShop();

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(defaultMonth);
  const [hourlyRate, setHourlyRate] = useState("");
  const [attendances, setAttendances] = useState<AttendanceRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const generate = async () => {
    if (!user || !shop) return;
    setLoading(true);
    const { from, to } = getMonthRange(month);
    const { data, error } = await supabase
      .from("attendances")
      .select("id,business_date,clock_in,clock_out,duration_minutes,note")
      .eq("shop_id", shop.id)
      .eq("user_id", user.id)
      .gte("business_date", from)
      .lte("business_date", to)
      .order("business_date");
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setAttendances((data ?? []) as AttendanceRow[]);
    setGenerated(true);
    setExpanded(true);
  };

  const totalMinutes = attendances.reduce((s, a) => s + (a.duration_minutes ?? 0), 0);
  const totalHours = totalMinutes / 60;
  const workDays = attendances.length;
  const ratePerHour = Number(hourlyRate) || 0;
  const grossPay = Math.round(totalHours * ratePerHour);

  const [y, m] = month.split("-").map(Number);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex items-center gap-2">
        <FileText className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Slip Gaji Digital</h1>
      </div>

      <Card className="p-5 space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Periode (Bulan)</Label>
            <Input
              type="month"
              value={month}
              onChange={(e) => { setMonth(e.target.value); setGenerated(false); }}
            />
          </div>
          <div>
            <Label>Tarif per Jam (Rp, opsional)</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="15000"
            />
          </div>
        </div>
        <Button onClick={generate} disabled={loading || shopLoading} className="w-full sm:w-auto">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          Generate Slip Gaji
        </Button>
      </Card>

      {generated && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <button
              className="flex items-center gap-1.5 text-sm font-medium text-primary"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {expanded ? "Sembunyikan detail" : "Tampilkan detail"}
            </button>
            <Button size="sm" variant="outline" onClick={handlePrint} className="print:hidden">
              <Printer className="mr-1.5 h-3.5 w-3.5" /> Cetak / Simpan PDF
            </Button>
          </div>

          <div ref={printRef} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="bg-primary px-6 py-4 text-primary-foreground">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs opacity-80 uppercase tracking-wide">Slip Gaji</p>
                  <h2 className="text-lg font-bold mt-0.5">{shop?.name}</h2>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-80">Periode</p>
                  <p className="font-semibold">{monthLabel}</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Hari Kerja</p>
                  <p className="text-2xl font-bold">{workDays}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Total Jam</p>
                  <p className="text-lg font-bold">{totalHours.toFixed(1)}j</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-3">
                  <p className="text-xs text-muted-foreground">Gaji Kotor</p>
                  <p className="text-base font-bold text-primary">{ratePerHour > 0 ? formatIDR(grossPay) : "—"}</p>
                </div>
              </div>

              {ratePerHour > 0 && (
                <div className="rounded-lg border border-border p-4 text-sm">
                  <div className="flex justify-between mb-1.5">
                    <span className="text-muted-foreground">Tarif per jam</span>
                    <span>{formatIDR(ratePerHour)}</span>
                  </div>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-muted-foreground">Total jam kerja</span>
                    <span>{totalHours.toFixed(2)} jam</span>
                  </div>
                  <div className="flex justify-between border-t border-border pt-2 font-semibold">
                    <span>Total Gaji</span>
                    <span className="text-primary">{formatIDR(grossPay)}</span>
                  </div>
                </div>
              )}

              {expanded && attendances.length > 0 && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Detail Absensi</h3>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <thead className="border-b border-border bg-muted/30 text-[11px] uppercase">
                        <tr>
                          <th className="px-3 py-2 text-left">Tanggal</th>
                          <th className="px-3 py-2 text-center">Masuk</th>
                          <th className="px-3 py-2 text-center">Keluar</th>
                          <th className="px-3 py-2 text-right">Durasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {attendances.map((a) => {
                          const d = new Date(a.business_date);
                          return (
                            <tr key={a.id} className="hover:bg-muted/20">
                              <td className="px-3 py-2">
                                <span className="text-muted-foreground">{DAYS[d.getDay()]} </span>
                                {d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                              </td>
                              <td className="px-3 py-2 text-center">
                                {new Date(a.clock_in).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                              </td>
                              <td className="px-3 py-2 text-center text-muted-foreground">
                                {a.clock_out
                                  ? new Date(a.clock_out).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                                  : "—"}
                              </td>
                              <td className="px-3 py-2 text-right font-medium">
                                {toHoursMinutes(a.duration_minutes)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="border-t border-border bg-muted/20 font-semibold">
                        <tr>
                          <td className="px-3 py-2" colSpan={3}>Total</td>
                          <td className="px-3 py-2 text-right">{toHoursMinutes(totalMinutes)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {attendances.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Tidak ada data absensi pada periode ini.
                </p>
              )}

              <div className="border-t border-border pt-3 text-center text-xs text-muted-foreground">
                Dicetak dari UMKMgo · {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body > * { display: none !important; }
          #root > * { display: none !important; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
