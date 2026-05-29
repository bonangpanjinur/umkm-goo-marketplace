import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import {
  FileSpreadsheet, Loader2, RefreshCw, Download, TrendingUp,
  Percent, Calendar, Printer, ChevronDown, ChevronUp, Info,
} from "lucide-react";

export const Route = createFileRoute("/admin/tax-report")({
  head: () => ({ meta: [{ title: "Laporan Pajak — Admin" }] }),
  component: AdminTaxReportPage,
});

const MONTHS = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const PPN_RATE = 0.11;
const PPH_FINAL_RATE = 0.005;

type TaxRow = {
  month: number;
  label: string;
  gross_revenue: number;
  subscription: number;
  commission: number;
  withdrawal_fees: number;
  ppn_collected: number;
  ppn_deposited: number;
  pph_base: number;
  pph_final: number;
  net_revenue: number;
  orders: number;
  txCount: number;
};

type QuarterSummary = {
  label: string;
  months: number[];
  gross: number;
  ppn: number;
  pph: number;
};

export default function AdminTaxReportPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<TaxRow[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"monthly" | "quarterly">("monthly");

  const load = async () => {
    setLoading(true);
    const ys = `${year}-01-01T00:00:00.000Z`;
    const ye = `${year}-12-31T23:59:59.999Z`;
    try {
      const [{ data: invoices }, { data: orders }, { data: withdrawals }] = await Promise.all([
        supabase.from("plan_invoices" as any).select("amount_idr, paid_at").eq("status", "paid").gte("paid_at", ys).lte("paid_at", ye),
        supabase.from("orders").select("total, commission_fee, created_at").eq("status", "completed").gte("created_at", ys).lte("created_at", ye),
        supabase.from("withdrawal_requests" as any).select("admin_fee, created_at").eq("status", "paid").gte("created_at", ys).lte("created_at", ye),
      ]);

      const monthly: Record<number, TaxRow> = {};
      for (let m = 0; m < 12; m++) {
        monthly[m] = { month: m, label: MONTHS[m], gross_revenue: 0, subscription: 0, commission: 0, withdrawal_fees: 0, ppn_collected: 0, ppn_deposited: 0, pph_base: 0, pph_final: 0, net_revenue: 0, orders: 0, txCount: 0 };
      }
      for (const inv of invoices ?? []) {
        const m = new Date(inv.paid_at).getMonth();
        monthly[m].subscription += Number(inv.amount_idr);
        monthly[m].txCount++;
      }
      for (const ord of orders ?? []) {
        const m = new Date(ord.created_at).getMonth();
        monthly[m].commission += Number(ord.commission_fee ?? 0);
        monthly[m].orders++;
        monthly[m].txCount++;
      }
      for (const wd of withdrawals ?? []) {
        const m = new Date(wd.created_at).getMonth();
        monthly[m].withdrawal_fees += Number(wd.admin_fee ?? 0);
        monthly[m].txCount++;
      }

      const result = Object.values(monthly).map(r => {
        const gross = r.subscription + r.commission + r.withdrawal_fees;
        const ppn = Math.round(gross * PPN_RATE);
        const pphBase = r.commission;
        const pph = Math.round(pphBase * PPH_FINAL_RATE);
        return {
          ...r,
          gross_revenue: gross,
          ppn_collected: ppn,
          ppn_deposited: ppn,
          pph_base: pphBase,
          pph_final: pph,
          net_revenue: gross - ppn - pph,
        };
      });
      setRows(result);
    } catch {
      toast.error("Gagal memuat data pajak");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [year]);

  const totals = rows.reduce((acc, r) => ({
    gross: acc.gross + r.gross_revenue,
    ppn: acc.ppn + r.ppn_collected,
    pph: acc.pph + r.pph_final,
    net: acc.net + r.net_revenue,
    orders: acc.orders + r.orders,
  }), { gross: 0, ppn: 0, pph: 0, net: 0, orders: 0 });

  const quarters: QuarterSummary[] = [
    { label: "Q1 (Jan–Mar)", months: [0,1,2], gross: 0, ppn: 0, pph: 0 },
    { label: "Q2 (Apr–Jun)", months: [3,4,5], gross: 0, ppn: 0, pph: 0 },
    { label: "Q3 (Jul–Sep)", months: [6,7,8], gross: 0, ppn: 0, pph: 0 },
    { label: "Q4 (Okt–Des)", months: [9,10,11], gross: 0, ppn: 0, pph: 0 },
  ].map(q => ({
    ...q,
    gross: rows.filter(r => q.months.includes(r.month)).reduce((s,r) => s+r.gross_revenue, 0),
    ppn: rows.filter(r => q.months.includes(r.month)).reduce((s,r) => s+r.ppn_collected, 0),
    pph: rows.filter(r => q.months.includes(r.month)).reduce((s,r) => s+r.pph_final, 0),
  }));

  const exportCsv = () => {
    const header = "Bulan,Pendapatan Bruto,Subscription,Komisi,Biaya WD,PPN 11%,PPh Final 0.5%,Pendapatan Neto,Jumlah Order";
    const data = rows.map(r =>
      [r.label, r.gross_revenue, r.subscription, r.commission, r.withdrawal_fees, r.ppn_collected, r.pph_final, r.net_revenue, r.orders].join(",")
    );
    const csv = [header, ...data].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `laporan-pajak-${year}.csv`; a.click();
    toast.success("CSV diunduh");
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Laporan Pajak — PPh & PPN
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Format kompatibel SPT Tahunan Badan. PPN 11% · PPh Final 0,5%.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            value={year} onChange={e => setYear(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <div className="flex rounded-md border border-input overflow-hidden">
            {(["monthly", "quarterly"] as const).map(m => (
              <button key={m} onClick={() => setViewMode(m)}
                className={`px-3 py-1.5 text-xs ${viewMode === m ? "bg-primary text-primary-foreground" : "bg-background hover:bg-accent"}`}>
                {m === "monthly" ? "Bulanan" : "Triwulan"}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} className="gap-1.5">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Pendapatan Bruto", val: totals.gross, cls: "text-primary" },
          { label: "PPN 11% Terkumpul", val: totals.ppn, cls: "text-amber-600" },
          { label: "PPh Final 0,5%", val: totals.pph, cls: "text-red-600" },
          { label: "Pendapatan Neto", val: totals.net, cls: "text-green-600" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border bg-card p-4">
            <p className={`text-lg font-bold ${s.cls}`}>{formatIDR(s.val)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex gap-2 text-xs text-blue-800">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          PPN 11% dihitung dari pendapatan bruto platform. PPh Final 0,5% dihitung dari komisi transaksi (omzet platform sebagai subjek pajak). Angka ini untuk referensi — konsultasikan dengan akuntan untuk kepatuhan pajak resmi.
        </span>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : viewMode === "quarterly" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {quarters.map(q => (
            <div key={q.label} className="rounded-xl border bg-card p-4 space-y-2">
              <p className="font-semibold">{q.label}</p>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Bruto</span><span className="font-medium">{formatIDR(q.gross)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">PPN</span><span className="text-amber-600">{formatIDR(q.ppn)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">PPh Final</span><span className="text-red-600">{formatIDR(q.pph)}</span></div>
                <div className="flex justify-between border-t border-border pt-1"><span className="text-muted-foreground">Neto</span><span className="font-bold text-green-600">{formatIDR(q.gross - q.ppn - q.pph)}</span></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-left">
                  {["Bulan","Bruto","Subscription","Komisi","Biaya WD","PPN 11%","PPh 0,5%","Neto","Order"].map(h => (
                    <th key={h} className="px-3 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(r => (
                  <tr key={r.month} className={`hover:bg-muted/20 ${r.gross_revenue === 0 ? "opacity-40" : ""}`}>
                    <td className="px-3 py-2 font-medium">{r.label}</td>
                    <td className="px-3 py-2 font-bold">{formatIDR(r.gross_revenue)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatIDR(r.subscription)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatIDR(r.commission)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{formatIDR(r.withdrawal_fees)}</td>
                    <td className="px-3 py-2 text-amber-600">{formatIDR(r.ppn_collected)}</td>
                    <td className="px-3 py-2 text-red-600">{formatIDR(r.pph_final)}</td>
                    <td className="px-3 py-2 font-semibold text-green-600">{formatIDR(r.net_revenue)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{r.orders}</td>
                  </tr>
                ))}
                <tr className="bg-muted/30 font-bold text-sm">
                  <td className="px-3 py-2.5">TOTAL {year}</td>
                  <td className="px-3 py-2.5">{formatIDR(totals.gross)}</td>
                  <td colSpan={2}></td>
                  <td></td>
                  <td className="px-3 py-2.5 text-amber-600">{formatIDR(totals.ppn)}</td>
                  <td className="px-3 py-2.5 text-red-600">{formatIDR(totals.pph)}</td>
                  <td className="px-3 py-2.5 text-green-600">{formatIDR(totals.net)}</td>
                  <td className="px-3 py-2.5">{totals.orders}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
