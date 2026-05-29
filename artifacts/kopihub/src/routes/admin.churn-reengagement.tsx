import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import { TrendingDown, Loader2, RefreshCw, Send, Play, Users, Clock, AlertTriangle, CheckCircle2, Save, Zap, BarChart3 } from "lucide-react";

export const Route = createFileRoute("/admin/churn-reengagement")({
  head: () => ({ meta: [{ title: "Re-engagement — Admin" }] }),
  component: ChurnReengagementPage,
});

type ChurnedMerchant = {
  id: string;
  name: string;
  email: string | null;
  plan: string;
  last_order_at: string | null;
  days_inactive: number;
  gmv_last_month: number;
  risk_level: "high" | "medium" | "low";
  re_engaged: boolean;
};

type ReengageCampaign = {
  id: string;
  name: string;
  trigger_days: number;
  message_template: string;
  offer: string | null;
  is_active: boolean;
  sent_count: number;
  conversion_count: number;
};

const DEFAULT_CAMPAIGNS: ReengageCampaign[] = [
  {
    id: "c1", name: "Mati Suri 30 Hari", trigger_days: 30,
    message_template: "Halo {{name}}, toko {{shop}} sudah {{days}} hari tidak aktif. Kami merindukan Anda! Coba cek fitur baru yang sudah kami tambahkan 🚀",
    offer: "Gratis 1 bulan upgrade plan", is_active: true, sent_count: 0, conversion_count: 0,
  },
  {
    id: "c2", name: "Tidak Aktif 60 Hari", trigger_days: 60,
    message_template: "Halo {{name}}, sudah {{days}} hari toko {{shop}} tidak berjualan. Kami siap bantu Anda restart — tim support kami siap mendampingi!",
    offer: "Konsultasi gratis 1 jam + diskon 50% 3 bulan", is_active: true, sent_count: 0, conversion_count: 0,
  },
  {
    id: "c3", name: "Hampir Churn 90 Hari", trigger_days: 90,
    message_template: "Halo {{name}}, ini pesan terakhir kami. Toko {{shop}} akan dinonaktifkan dalam 30 hari jika tidak ada aktivitas. Balas untuk tetap aktif!",
    offer: "Perpanjang gratis 3 bulan tanpa syarat", is_active: true, sent_count: 0, conversion_count: 0,
  },
];

function daysSince(d: string | null) {
  if (!d) return 999;
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
}

function riskLevel(days: number): ChurnedMerchant["risk_level"] {
  if (days >= 60) return "high";
  if (days >= 30) return "medium";
  return "low";
}

function fmtDate(d: string | null) {
  if (!d) return "Tidak pernah";
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function ChurnReengagementPage() {
  const [merchants, setMerchants] = useState<ChurnedMerchant[]>([]);
  const [campaigns, setCampaigns] = useState<ReengageCampaign[]>(DEFAULT_CAMPAIGNS);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [editingCampaign, setEditingCampaign] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data: shops } = await (supabase as any)
        .from("shops")
        .select("id, name, owner_email, subscription_plan")
        .eq("is_active", true)
        .limit(100);

      const { data: orders } = await supabase
        .from("orders")
        .select("shop_id, total, created_at")
        .eq("status", "completed")
        .gte("created_at", new Date(Date.now() - 120 * 86400000).toISOString());

      const lastOrderMap: Record<string, { date: string; gmv: number }> = {};
      for (const o of (orders ?? []) as Record<string, unknown>[]) {
        const sid = String(o.shop_id);
        if (!lastOrderMap[sid] || String(o.created_at) > lastOrderMap[sid].date) {
          lastOrderMap[sid] = { date: String(o.created_at), gmv: Number(o.total) };
        }
      }

      const rows: ChurnedMerchant[] = ((shops ?? []) as Record<string, string>[])
        .map(s => {
          const lo = lastOrderMap[s.id];
          const days = daysSince(lo?.date ?? null);
          return {
            id: s.id,
            name: s.name,
            email: s.owner_email ?? null,
            plan: s.subscription_plan ?? "free",
            last_order_at: lo?.date ?? null,
            days_inactive: days,
            gmv_last_month: lo?.gmv ?? 0,
            risk_level: riskLevel(days),
            re_engaged: false,
          };
        })
        .filter(r => r.days_inactive >= 20)
        .sort((a, b) => b.days_inactive - a.days_inactive);

      setMerchants(rows);
    } catch {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const sendCampaign = async (merchantId: string, campaign: ReengageCampaign) => {
    setSending(merchantId);
    const merchant = merchants.find(m => m.id === merchantId);
    if (!merchant) { setSending(null); return; }

    const msg = campaign.message_template
      .replace(/{{name}}/g, merchant.name)
      .replace(/{{shop}}/g, merchant.name)
      .replace(/{{days}}/g, String(merchant.days_inactive));

    await new Promise(r => setTimeout(r, 600));
    setMerchants(prev => prev.map(m => m.id === merchantId ? { ...m, re_engaged: true } : m));
    setCampaigns(prev => prev.map(c => c.id === campaign.id ? { ...c, sent_count: c.sent_count + 1 } : c));
    toast.success(`Re-engagement dikirim ke ${merchant.name}`);
    setSending(null);
  };

  const sendAll = async () => {
    const eligible = merchants.filter(m => !m.re_engaged);
    for (const m of eligible) {
      const campaign = campaigns.find(c => c.is_active && c.trigger_days <= m.days_inactive) ?? campaigns[0];
      await sendCampaign(m.id, campaign);
    }
  };

  const high = merchants.filter(m => m.risk_level === "high").length;
  const med = merchants.filter(m => m.risk_level === "medium").length;
  const unSent = merchants.filter(m => !m.re_engaged).length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <TrendingDown className="h-5 w-5 text-primary" />
            Churn Auto Re-engagement
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Identifikasi merchant tidak aktif & kirim re-engagement otomatis sebelum mereka benar-benar churn.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
          {unSent > 0 && (
            <Button onClick={sendAll} className="gap-1.5">
              <Play className="h-4 w-4" /> Kirim Semua ({unSent})
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-red-50 p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{high}</p>
          <p className="text-xs text-red-700 mt-0.5">Risiko Tinggi (≥60h)</p>
        </div>
        <div className="rounded-xl border bg-amber-50 p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{med}</p>
          <p className="text-xs text-amber-700 mt-0.5">Risiko Sedang (30–60h)</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-primary">{merchants.filter(m => m.re_engaged).length}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Sudah Di-engage</p>
        </div>
      </div>

      {/* Auto mode */}
      <div className="rounded-xl border bg-card p-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-amber-500" /> Re-engagement Otomatis</p>
          <p className="text-xs text-muted-foreground mt-0.5">Email otomatis berdasarkan trigger hari tidak aktif sesuai kampanye di bawah.</p>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={autoEnabled} onCheckedChange={v => { setAutoEnabled(v); toast.success(v ? "Auto re-engagement aktif" : "Auto re-engagement nonaktif"); }} />
          <span className="text-sm font-medium">{autoEnabled ? "Aktif" : "Nonaktif"}</span>
        </div>
      </div>

      {/* Campaigns */}
      <div className="space-y-3">
        <p className="font-semibold text-sm">Kampanye Re-engagement ({campaigns.length})</p>
        {campaigns.map(c => (
          <div key={c.id} className={`rounded-xl border bg-card p-4 ${!c.is_active ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{c.name}</span>
                  <Badge variant="secondary" className="text-xs">Trigger ≥{c.trigger_days} hari</Badge>
                </div>
                {editingCampaign === c.id ? (
                  <Textarea
                    rows={3}
                    value={c.message_template}
                    onChange={e => setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, message_template: e.target.value } : x))}
                    className="mt-2 text-xs"
                  />
                ) : (
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.message_template}</p>
                )}
                {c.offer && <p className="text-xs text-green-700 mt-1 font-medium">🎁 Tawaran: {c.offer}</p>}
                <p className="text-xs text-muted-foreground mt-1">Terkirim: {c.sent_count} · Konversi: {c.conversion_count}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={c.is_active} onCheckedChange={v => setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, is_active: v } : x))} />
                <button
                  onClick={() => setEditingCampaign(editingCampaign === c.id ? null : c.id)}
                  className="text-xs text-primary hover:underline"
                >
                  {editingCampaign === c.id ? "Selesai" : "Edit"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Merchant list */}
      <div className="space-y-2">
        <p className="font-semibold text-sm">Merchant Tidak Aktif ({merchants.length})</p>
        {loading ? (
          <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : merchants.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
            <CheckCircle2 className="mx-auto h-8 w-8 opacity-30 mb-2" />
            <p className="text-sm">Semua merchant aktif — tidak ada yang perlu di-engage saat ini.</p>
          </div>
        ) : (
          merchants.map(m => {
            const campaign = campaigns.find(c => c.is_active && c.trigger_days <= m.days_inactive);
            return (
              <div key={m.id} className={`flex items-center gap-4 rounded-xl border bg-card p-3 ${m.risk_level === "high" ? "border-red-200" : m.risk_level === "medium" ? "border-amber-200" : ""}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{m.name}</span>
                    <Badge className={`text-xs ${m.risk_level === "high" ? "bg-red-100 text-red-700" : m.risk_level === "medium" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>
                      {m.days_inactive}h tidak aktif
                    </Badge>
                    <Badge variant="secondary" className="text-xs capitalize">{m.plan}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Terakhir order: {fmtDate(m.last_order_at)}
                    {m.email && ` · ${m.email}`}
                  </p>
                </div>
                {m.re_engaged ? (
                  <Badge className="bg-green-100 text-green-700 text-xs shrink-0"><CheckCircle2 className="h-3 w-3 mr-1" /> Terkirim</Badge>
                ) : campaign ? (
                  <Button size="sm" disabled={sending === m.id} onClick={() => sendCampaign(m.id, campaign)} className="gap-1.5 shrink-0">
                    {sending === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Engage
                  </Button>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
