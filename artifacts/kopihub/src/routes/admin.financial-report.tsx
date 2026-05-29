import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/format";
import { downloadCSV } from "@/lib/export";
import { toast } from "sonner";
import {
  FileSpreadsheet, RefreshCw, Loader2, Download,
  TrendingUp, Banknote, Percent, Coins, ChevronDown,
} from "lucide-react";

export const Route = createFileRoute("/admin/financial-report")({
  head: () => ({ meta: [{ title: "Laporan Keuangan — Admin" }] }),
  component: AdminFinancialReportPage,
});

const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const PPN_RATE = 0.11;

type MonthlyRow = {
  period: string;
  label: string;
  subscription: number;
  commission: number;
  withdrawal_fees: number;
  ads: number;
  gross: number;
  ppn: number;
  net: number;
  orders: number;
};

export default function AdminFinancialReportPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<MonthlyRow[]>([]);
  const [totals, setTotals] = useState({ subscription: 0, commission: 0, withdrawal_fees: 0, gross: 0, ppn: 0, net: 0, orders: 0 });

  const load = async () => {
    setLoading(true);
    const yearStart = `${year}-01-01T00:00:00.000Z`;
    const yearEnd = `${year}-12-31T23:59:59.999Z`;

    const [{ data: invoices }, { data: orders }, { data: withdrawals }] = await Promise.all([
      supabase.from("plan_invoices" as any).select("amount_idr, paid_at").eq("status", "paid").gte("paid_at", yearStart).lte("paid_at", yearEnd),
      supabase.from("orders").select("total, commission_fee, created_at").eq("status", "completed").gte("created_at", yearStart).lte("created_at", yearEnd),
      supabase.from("withdrawal_requests" as any).select("admin_fee, created_at").eq("status", "paid").gte("created_at", yearStart).lte("created_at", yearEnd),
    ]);

    const monthData: Record<string, { subscription: number; commission: number; withdrawal_fees: number; orders: number }> = {};
    for (let m = 0; m < 12; m++) {
      monthData[String(m)] = { subscription: 0, commission: 0, withdrawal_fees: 0, orders: 0 };
    }

    (invoices ?? []).forEach((r: any) => {
      const m = new Date(r.paid_at).getMonth();
      monthData[m].subscription += Number(r.amount_idr);
    });
    (orders ?? []).forEach((r: any) => {
      const m = new Date(r.created_at).getMonth();
      monthData[m].commission += Number(r.commission_fee ?? 0);
      monthData[m].orders += 1;
    });
    (withdrawals ?? []).forEach((r: any) => {
      const m = new Date(r.created_at).getMonth();
      monthData[m].withdrawal_fees += Number(r.admin_fee ?? 0);
    });

    const built: MonthlyRow[] = MONTHS.map((label, i) => {
      const d = monthData[i];
      const gross = d.subscription + d.commission + d.withdrawal_fees;
      const ppn = gross * PPN_RATE;
      const net = gross - ppn;
      return {
        period: `${year}-${String(i + 1).padStart(2, "0")}`,
        label,
        subscription: d.subscription,
        commission: d.commission,
        withdrawal_fees: d.withdrawal_fees,
        ads: 0,
        gross,
        ppn,
        net,
        orders: d.orders,
      };
    });

    setRows(built);

    const t = built.reduce(
      (acc, r) => ({
        subscription: acc.subscription + r.subscription,
        commission: acc.commission + r.commission,
        withdrawal_fees: acc.withdrawal_fees + r.withdrawal_fees,
        gross: acc.gross + r.gross,
        ppn: acc.ppn + r.ppn,
        net: acc.net + r.net,
        orders: acc.orders + r.orders,
      }),
      { subscription: 0, commission: 0, withdrawal_fees: 0, gross: 0, ppn: 0, net: 0, orders: 0 }
    );
    setTotals(t);
    setLoading(false);
  };

  useEffect(() => { load(); }, [year]);

  const exportCSV = () => {
    downloadCSV(
      rows.map(r => ({
        "Periode": r.label,
        "Subscription (Rp)": r.subscription,
        "Komisi (Rp)": r.commission,
        "Fee Penarikan (Rp)": r.withdrawal_fees,
        "Gross Revenue (Rp)": r.gross,
        "PPN 11% (Rp)": r.ppn,
        "Net Revenue (Rp)": r.net,
        "Total Pesanan": r.orders,
      })),
      `laporan-keuangan-${year}`
    );
    toast.success("Laporan diunduh");
  };

  const quarters = [
    { label: "Q1", months: [0, 1, 2] },
    { label: "Q2", months: [3, 4, 5] },
    { label: "Q3", months: [6, 7, 8] },
    { label: "Q4", months: [9, 10, 11] },
  ].map(q => ({
    ...q,
    gross: q.months.reduce((s, i) => s + (rows[i]?.gross ?? 0), 0),
    net: q.months.reduce((s, i) => s + (rows[i]?.net ?? 0), 0),
  }));

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" /> Laporan Keuangan & Pajak
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rekap pendapatan platform bulanan termasuk perhitungan PPN {(PPN_RATE * 100).toFixed(0)}%.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Year selector */}
          <div className="relative">
            <select
              value={year}
              onChange={e => setYear(Number(e.target.value))}
              className="appearance-none h-9 rounded-md border border-input bg-background pl-3 pr-8 text-sm"
            >
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={exportCSV} className="gap-1.5">
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Annual totals */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3.5 w-3.5 text-primary" /> Gross Revenue {year}</p>
              <p className="text-xl font-bold mt-1">{formatIDR(totals.gross)}</p>
            </Card>
            <Card className="p-4 border-red-200 bg-red-50/50 dark:bg-red-950/10">
              <p className="text-xs text-red-600 flex items-center gap-1"><Percent className="h-3.5 w-3.5" /> PPN 11%</p>
              <p className="text-xl font-bold text-red-600 mt-1">{formatIDR(totals.ppn)}</p>
            </Card>
            <Card className="p-4 border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/10">
              <p className="text-xs text-emerald-700 flex items-center gap-1"><Banknote className="h-3.5 w-3.5" /> Net Revenue {year}</p>
              <p className="text-xl font-bold text-emerald-700 mt-1">{formatIDR(totals.net)}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs text-muted-foreground flex items-center gap-1"><Coins className="h-3.5 w-3.5 text-amber-500" /> Total Pesanan</p>
              <p className="text-xl font-bold mt-1">{totals.orders.toLocaleString("id-ID")}</p>
            </Card>
          </div>

          {/* Quarterly summary */}
          <div className="grid grid-cols-4 gap-3">
            {quarters.map(q => (
              <Card key={q.label} className="p-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{q.label} {year}</p>
                <p className="text-base font-bold mt-1">{formatIDR(q.gross)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Net: {formatIDR(q.net)}</p>
              </Card>
            ))}
          </div>

          {/* Monthly breakdown table */}
          <Card className="overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-semibold">Rincian Bulanan {year}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 border-b border-border">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Bulan</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Subscription</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Komisi</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Fee WD</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Gross</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground text-red-600">PPN 11%</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-emerald-600">Net</th>
                    <th className="px-4 py-2.5 text-right text-xs font-medium text-muted-foreground">Pesanan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {rows.map((r, i) => {
                    const isCurrentMonth = year === now.getFullYear() && i === now.getMonth();
                    return (
                      <tr key={r.period} className={`hover:bg-muted/20 ${isCurrentMonth ? "bg-primary/5" : ""}`}>
                        <td className="px-4 py-3 font-medium">
                          {r.label}
                          {isCurrentMonth && <Badge className="ml-2 text-[10px]">Berjalan</Badge>}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.subscription > 0 ? formatIDR(r.subscription) : "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.commission > 0 ? formatIDR(r.commission) : "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{r.withdrawal_fees > 0 ? formatIDR(r.withdrawal_fees) : "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-semibold">{r.gross > 0 ? formatIDR(r.gross) : "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-red-600">{r.ppn > 0 ? formatIDR(r.ppn) : "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums font-bold text-emerald-600">{r.net > 0 ? formatIDR(r.net) : "—"}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{r.orders > 0 ? r.orders.toLocaleString("id-ID") : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t-2 border-border bg-muted/60">
                  <tr>
                    <td className="px-4 py-3 font-bold">TOTAL {year}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{formatIDR(totals.subscription)}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{formatIDR(totals.commission)}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{formatIDR(totals.withdrawal_fees)}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">{formatIDR(totals.gross)}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-red-600">{formatIDR(totals.ppn)}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-600">{formatIDR(totals.net)}</td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums text-muted-foreground">{totals.orders.toLocaleString("id-ID")}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Tax note */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            <strong>Catatan Pajak:</strong> PPN dihitung sebesar 11% dari gross revenue platform sesuai UU HPP No. 7 Tahun 2021. 
            Angka di atas bersifat estimasi dan perlu diverifikasi oleh akuntan publik. 
            Export CSV tersedia untuk keperluan pembukuan dan pelaporan SPT Tahunan Badan.
          </div>
        </>
      )}
    </div>
  );
}

