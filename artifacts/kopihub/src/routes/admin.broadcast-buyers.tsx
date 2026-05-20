import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Megaphone, Loader2, RefreshCw, Send, Users, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/admin/broadcast-buyers")({
  component: BroadcastBuyersPage,
});

type BroadcastRecord = {
  id: string;
  title: string;
  message: string;
  target: "all" | "active" | "inactive" | "new";
  channel: "in_app" | "push" | "email";
  sent_count: number;
  status: "draft" | "sent";
  sent_at: string | null;
  created_at: string;
};

const SQL_HINT = `CREATE TABLE IF NOT EXISTS public.buyer_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  target text NOT NULL DEFAULT 'all',
  channel text NOT NULL DEFAULT 'in_app',
  sent_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);`;

const TARGETS = [
  { value: "all",      label: "Semua Pembeli",           desc: "Semua akun yang pernah daftar" },
  { value: "active",   label: "Pembeli Aktif",           desc: "Pernah bertransaksi dalam 30 hari" },
  { value: "inactive", label: "Pembeli Tidak Aktif",     desc: "Tidak transaksi > 60 hari" },
  { value: "new",      label: "Pembeli Baru",            desc: "Daftar dalam 7 hari terakhir" },
];
const CHANNELS = [
  { value: "in_app", label: "Notifikasi In-App" },
  { value: "push",   label: "Push Notification" },
  { value: "email",  label: "Email Blast" },
];

function fmtDate(d: string) { return new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }

export default function BroadcastBuyersPage() {
  const [broadcasts, setBroadcasts] = useState<BroadcastRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ title: "", message: "", target: "all" as BroadcastRecord["target"], channel: "in_app" as BroadcastRecord["channel"] });
  const [segments, setSegments] = useState({ total: 0, active: 0, inactive: 0, new_buyers: 0 });

  const load = async () => {
    setLoading(true);
    const [broadRes, segRes] = await Promise.all([
      (supabase as any).from("buyer_broadcasts").select("*").order("created_at", { ascending: false }).limit(20),
      (supabase as any).rpc("admin_buyer_segments"),
    ]);
    if (broadRes.error?.message?.toLowerCase().includes("does not exist")) setShowSql(true);
    setBroadcasts((broadRes.data ?? []) as BroadcastRecord[]);
    const row = Array.isArray(segRes.data) ? segRes.data[0] : segRes.data;
    if (row) setSegments({
      total: Number(row.total ?? 0),
      active: Number(row.active ?? 0),
      inactive: Number(row.inactive ?? 0),
      new_buyers: Number(row.new_buyers ?? 0),
    });
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const estCount = form.target === "all" ? segments.total
    : form.target === "active" ? segments.active
    : form.target === "new" ? segments.new_buyers
    : segments.inactive;

  const send = async () => {
    if (!form.title.trim() || !form.message.trim()) { toast.error("Judul dan pesan wajib diisi"); return; }
    setSending(true);
    try {
      const { error } = await (supabase as any).from("buyer_broadcasts").insert({
        title: form.title, message: form.message, target: form.target, channel: form.channel,
        sent_count: estCount, status: "sent", sent_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast.success(`Broadcast terkirim ke ~${estCount} pembeli`);
      setForm({ title: "", message: "", target: "all", channel: "in_app" });
      load();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal"); }
    finally { setSending(false); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><Megaphone className="h-5 w-5 text-primary" /> Broadcast ke Pembeli</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Kirim notifikasi, promo, atau pengumuman langsung ke segmen pembeli tertentu.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
      </div>

      {/* Composer */}
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <p className="font-semibold flex items-center gap-2"><Send className="h-4 w-4 text-primary" /> Buat Broadcast Baru</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Judul Notifikasi *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Flash Sale 50% Semua Kategori!" />
          </div>
          <div className="space-y-1.5">
            <Label>Target Penerima</Label>
            <Select value={form.target} onValueChange={v => setForm(f => ({ ...f, target: v as BroadcastRecord["target"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TARGETS.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    <div><p className="font-medium">{t.label}</p><p className="text-xs text-muted-foreground">{t.desc}</p></div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Channel</Label>
            <Select value={form.channel} onValueChange={v => setForm(f => ({ ...f, channel: v as BroadcastRecord["channel"] }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Isi Pesan *</Label>
            <Textarea rows={3} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Halo! Jangan lewatkan flash sale terbesar kami..." />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Estimasi penerima: <strong>~{estCount.toLocaleString()} pembeli</strong>
          </p>
          <Button onClick={send} disabled={sending} className="gap-1.5">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Kirim Broadcast
          </Button>
        </div>
      </div>

      {showSql && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Tabel belum ada:</p>
          <pre className="mt-2 text-xs font-mono bg-amber-100 p-2 rounded overflow-x-auto">{SQL_HINT}</pre>
        </div>
      )}

      {/* History */}
      <div className="space-y-3">
        <h2 className="font-semibold text-sm text-muted-foreground">Riwayat Broadcast</h2>
        {loading ? (
          <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : broadcasts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Belum ada broadcast.</p>
        ) : (
          <div className="space-y-2">
            {broadcasts.map(b => (
              <div key={b.id} className="flex items-center gap-4 rounded-xl border bg-card p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{b.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">{b.message}</p>
                  <div className="flex gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">{TARGETS.find(t => t.value === b.target)?.label}</Badge>
                    <Badge variant="secondary" className="text-xs">{CHANNELS.find(c => c.value === b.channel)?.label}</Badge>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-sm font-medium">{b.sent_count.toLocaleString()} terkirim</span>
                  </div>
                  {b.sent_at && <p className="text-xs text-muted-foreground">{fmtDate(b.sent_at)}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
