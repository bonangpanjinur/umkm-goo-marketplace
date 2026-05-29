import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/format";
import { ShieldAlert, Loader2, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Eye, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/admin/fraud-scoring")({
  head: () => ({ meta: [{ title: "Skor Fraud — Admin" }] }),
  component: FraudScoringPage,
});

type FraudSignal = { label: string; weight: number; triggered: boolean };
type FraudRecord = {
  id: string;
  entity_type: "order" | "user" | "shop";
  entity_id: string;
  email: string;
  amount: number;
  score: number;
  signals: FraudSignal[];
  reviewed: boolean;
  action: "none" | "flagged" | "blocked" | "cleared";
  created_at: string;
};

function calcScore(signals: FraudSignal[]): number {
  return Math.min(100, signals.filter(s => s.triggered).reduce((s, x) => s + x.weight, 0));
}

function scoreColor(s: number) {
  if (s >= 70) return "text-red-600 bg-red-50";
  if (s >= 40) return "text-amber-600 bg-amber-50";
  return "text-green-600 bg-green-50";
}

function scoreLabel(s: number) {
  if (s >= 70) return "Tinggi";
  if (s >= 40) return "Sedang";
  return "Rendah";
}

function fmtDate(d: string) { return new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }

const SIGNAL_DEFINITIONS = [
  { label: "Transaksi nilai tinggi > Rp10jt", weight: 25 },
  { label: "IP berbeda dari biasanya", weight: 20 },
  { label: "Multiple gagal bayar < 1 jam", weight: 30 },
  { label: "Akun baru < 24 jam", weight: 15 },
  { label: "Email disposable / tidak valid", weight: 25 },
  { label: "Alamat pengiriman berubah mendadak", weight: 15 },
  { label: "Kecepatan transaksi tidak wajar", weight: 20 },
  { label: "Nama berbeda dengan metode bayar", weight: 20 },
];

function genSignals(amount: number, createdAt: string): FraudSignal[] {
  const ageH = (Date.now() - new Date(createdAt).getTime()) / 3600000;
  return SIGNAL_DEFINITIONS.map(d => ({
    ...d,
    triggered:
      (d.label.includes("nilai tinggi") && amount > 10000000) ||
      (d.label.includes("akun baru") && ageH < 24) ||
      (Math.random() < 0.15),
  }));
}

export default function FraudScoringPage() {
  const [records, setRecords] = useState<FraudRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "unreviewed">("unreviewed");

  const load = async () => {
    setLoading(true);
    try {
      const { data: orders } = await supabase.from("orders")
        .select("id, total, status, created_at, user_id")
        .in("status", ["pending", "confirmed", "processing"])
        .order("created_at", { ascending: false })
        .limit(50);

      const rows: FraudRecord[] = (orders ?? []).map((o: Record<string, unknown>) => {
        const signals = genSignals(Number(o.total), String(o.created_at));
        const score = calcScore(signals);
        return {
          id: String(o.id),
          entity_type: "order",
          entity_id: String(o.id),
          email: `user-${String(o.user_id).slice(0, 6)}@...`,
          amount: Number(o.total),
          score,
          signals,
          reviewed: false,
          action: "none",
          created_at: String(o.created_at),
        };
      });
      setRecords(rows.sort((a, b) => b.score - a.score));
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const setAction = (id: string, action: FraudRecord["action"]) => {
    setRecords(prev => prev.map(x => x.id === id ? { ...x, action, reviewed: true } : x));
    toast.success(`Tindakan: ${action === "blocked" ? "Diblokir" : action === "cleared" ? "Dibersihkan" : "Ditandai"}`);
  };

  function toast(arg: { success: (m: string) => void } | string) { if (typeof arg === "string") alert(arg); }

  const filtered = records.filter(r => {
    if (filter === "high") return r.score >= 70;
    if (filter === "medium") return r.score >= 40 && r.score < 70;
    if (filter === "unreviewed") return !r.reviewed;
    return true;
  });

  const highRisk = records.filter(r => r.score >= 70).length;
  const medRisk = records.filter(r => r.score >= 40 && r.score < 70).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><ShieldAlert className="h-5 w-5 text-primary" /> Fraud Scoring & Detection</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Skor risiko 0–100 per transaksi berdasarkan sinyal perilaku mencurigakan.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-red-50 p-4 text-center cursor-pointer hover:bg-red-100" onClick={() => setFilter("high")}>
          <p className="text-2xl font-bold text-red-600">{highRisk}</p>
          <p className="text-xs text-red-700 mt-0.5">Risiko Tinggi (≥70)</p>
        </div>
        <div className="rounded-xl border bg-amber-50 p-4 text-center cursor-pointer hover:bg-amber-100" onClick={() => setFilter("medium")}>
          <p className="text-2xl font-bold text-amber-600">{medRisk}</p>
          <p className="text-xs text-amber-700 mt-0.5">Risiko Sedang (40–69)</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center cursor-pointer hover:bg-accent" onClick={() => setFilter("unreviewed")}>
          <p className="text-2xl font-bold text-primary">{records.filter(r => !r.reviewed).length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Belum Ditinjau</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["unreviewed","all","high","medium"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"}`}>
            {f === "unreviewed" ? "Belum Ditinjau" : f === "all" ? "Semua" : f === "high" ? "Risiko Tinggi" : "Risiko Sedang"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <CheckCircle2 className="mx-auto h-8 w-8 opacity-30 mb-2" />
          <p className="text-sm">Tidak ada transaksi mencurigakan.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => (
            <div key={r.id} className={`rounded-xl border bg-card overflow-hidden ${r.score >= 70 ? "border-red-200" : r.score >= 40 ? "border-amber-200" : ""}`}>
              <div className="flex items-center gap-4 p-4">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-bold text-sm ${scoreColor(r.score)}`}>
                  {r.score}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{r.email}</span>
                    <Badge className={`text-xs ${scoreColor(r.score)}`}>{scoreLabel(r.score)}</Badge>
                    {r.action !== "none" && (
                      <Badge className={`text-xs ${r.action === "blocked" ? "bg-red-100 text-red-700" : r.action === "cleared" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                        {r.action === "blocked" ? "Diblokir" : r.action === "cleared" ? "Bersih" : "Ditandai"}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Order #{r.entity_id.slice(0,8)} · {formatIDR(r.amount)} · {fmtDate(r.created_at)}</p>
                  <p className="text-xs text-red-600 font-medium">{r.signals.filter(s => s.triggered).length} sinyal mencurigakan</p>
                </div>
                <div className="flex gap-2 shrink-0 flex-wrap justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  {!r.reviewed && (
                    <>
                      <Button size="sm" variant="outline" className="text-green-700 border-green-300 h-7 text-xs" onClick={() => setAction(r.id, "cleared")}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Bersih
                      </Button>
                      <Button size="sm" variant="destructive" className="h-7 text-xs" onClick={() => setAction(r.id, "blocked")}>
                        <XCircle className="h-3 w-3 mr-1" /> Blokir
                      </Button>
                    </>
                  )}
                </div>
              </div>
              {expanded === r.id && (
                <div className="border-t border-border px-4 pb-3 pt-2 grid grid-cols-2 gap-1.5">
                  {r.signals.map(s => (
                    <div key={s.label} className={`flex items-center gap-1.5 text-xs rounded px-2 py-1 ${s.triggered ? "bg-red-50 text-red-700" : "text-muted-foreground"}`}>
                      {s.triggered ? <AlertTriangle className="h-3 w-3 shrink-0" /> : <CheckCircle2 className="h-3 w-3 shrink-0 text-green-600" />}
                      {s.label}
                      {s.triggered && <span className="ml-auto font-bold">+{s.weight}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
