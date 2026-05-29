import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Megaphone, Loader2, Clock, CheckCircle, Users, Bell, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/broadcast-buyers")({
  head: () => ({ meta: [{ title: "Broadcast ke Pembeli — Admin" }] }),
  component: AdminBroadcastBuyers,
});

type HistoryItem = {
  id: string;
  title: string;
  body: string;
  severity: string;
  created_at: string;
  recipient_count?: number;
};

const SEVERITY_OPTS = [
  { value: "info",    label: "Info",    cls: "bg-blue-100 text-blue-700" },
  { value: "success", label: "Sukses",  cls: "bg-green-100 text-green-700" },
  { value: "warning", label: "Peringatan", cls: "bg-amber-100 text-amber-700" },
  { value: "error",   label: "Darurat", cls: "bg-red-100 text-red-700" },
];

const AUDIENCE_OPTS = [
  { value: "all",      label: "Semua Pembeli" },
  { value: "active",   label: "Pembeli Aktif (order < 30 hari)" },
  { value: "inactive", label: "Pembeli Tidak Aktif (>30 hari)" },
];

function AdminBroadcastBuyers() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [severity, setSeverity] = useState("info");
  const [link, setLink] = useState("");
  const [audience, setAudience] = useState("all");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [buyerCount, setBuyerCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  const loadHistory = async () => {
    setLoadingHistory(true);
    const { data } = await (supabase as any)
      .from("notifications")
      .select("id, title, body, severity, created_at")
      .eq("type", "broadcast")
      .is("shop_id", null)
      .order("created_at", { ascending: false })
      .limit(30);
    setHistory((data ?? []) as HistoryItem[]);
    setLoadingHistory(false);
  };

  const loadBuyerCount = async () => {
    setLoadingCount(true);
    const now30 = new Date(Date.now() - 30 * 86_400_000).toISOString();
    let q = (supabase as any).from("customer_profiles").select("user_id", { count: "exact", head: true });
    if (audience === "active") {
      const { data: activeIds } = await (supabase as any)
        .from("orders").select("user_id").gte("created_at", now30).not("user_id", "is", null);
      const ids = [...new Set((activeIds ?? []).map((r: any) => r.user_id))];
      q = q.in("user_id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"]);
    } else if (audience === "inactive") {
      const { data: activeIds } = await (supabase as any)
        .from("orders").select("user_id").gte("created_at", now30).not("user_id", "is", null);
      const ids = [...new Set((activeIds ?? []).map((r: any) => r.user_id))];
      if (ids.length > 0) q = q.not("user_id", "in", `(${ids.join(",")})`);
    }
    const { count } = await q;
    setBuyerCount(count ?? 0);
    setLoadingCount(false);
  };

  useEffect(() => { loadHistory(); }, []);
  useEffect(() => { loadBuyerCount(); }, [audience]);

  const send = async () => {
    if (!title.trim()) { toast.error("Judul wajib diisi"); return; }
    if (!body.trim()) { toast.error("Pesan wajib diisi"); return; }
    setSending(true);
    try {
      const now30 = new Date(Date.now() - 30 * 86_400_000).toISOString();

      let buyers: any[] = [];

      if (audience === "all") {
        const { data } = await (supabase as any).from("customer_profiles").select("user_id").limit(10000);
        buyers = data ?? [];
      } else if (audience === "active") {
        const { data } = await (supabase as any)
          .from("orders").select("user_id").gte("created_at", now30).not("user_id", "is", null).limit(10000);
        const ids = [...new Set((data ?? []).map((r: any) => r.user_id))];
        buyers = ids.map(id => ({ user_id: id }));
      } else if (audience === "inactive") {
        const { data: activeOrders } = await (supabase as any)
          .from("orders").select("user_id").gte("created_at", now30).not("user_id", "is", null).limit(10000);
        const activeIds = new Set((activeOrders ?? []).map((r: any) => r.user_id));
        const { data: allBuyers } = await (supabase as any).from("customer_profiles").select("user_id").limit(10000);
        buyers = (allBuyers ?? []).filter((b: any) => !activeIds.has(b.user_id));
      }

      if (buyers.length === 0) {
        toast.error("Tidak ada penerima ditemukan untuk segmen ini");
        setSending(false);
        return;
      }

      // Insert notifications in batches of 500
      const notifications = buyers.map((b: any) => ({
        recipient_user_id: b.user_id,
        type: "broadcast",
        title: title.trim(),
        body: body.trim(),
        severity,
        link: link.trim() || null,
        shop_id: null,
      }));

      const BATCH = 500;
      let sent = 0;
      for (let i = 0; i < notifications.length; i += BATCH) {
        const { error } = await (supabase as any)
          .from("notifications")
          .insert(notifications.slice(i, i + BATCH));
        if (error) throw error;
        sent += Math.min(BATCH, notifications.length - i);
      }

      toast.success(`Broadcast terkirim ke ${sent.toLocaleString("id-ID")} pembeli`);
      setTitle(""); setBody(""); setLink("");
      loadHistory();
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal mengirim broadcast");
    } finally {
      setSending(false);
    }
  };

  const sevMeta = SEVERITY_OPTS.find(s => s.value === severity) ?? SEVERITY_OPTS[0];

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" /> Broadcast ke Pembeli
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Kirim notifikasi massal ke semua pembeli atau segmen tertentu
        </p>
      </div>

      <Card className="p-5 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Segmen Penerima</Label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AUDIENCE_OPTS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <div className="flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 w-full">
              <Users className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Estimasi penerima</p>
                <p className="font-semibold text-sm">
                  {loadingCount ? "..." : buyerCount !== null ? buyerCount.toLocaleString("id-ID") : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Tingkat Notifikasi</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEVERITY_OPTS.map(o => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Link (opsional)</Label>
            <Input
              className="mt-1.5"
              placeholder="https://... atau /marketplace/..."
              value={link}
              onChange={e => setLink(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>Judul</Label>
          <Input
            className="mt-1.5"
            placeholder="Judul notifikasi..."
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
          />
        </div>

        <div>
          <Label>Pesan</Label>
          <Textarea
            className="mt-1.5"
            rows={4}
            placeholder="Tulis pesan broadcast di sini..."
            value={body}
            onChange={e => setBody(e.target.value)}
          />
        </div>

        {title && body && (
          <div className="rounded-xl border border-border p-4 bg-muted/30 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Preview</p>
            <div className="flex items-start gap-3">
              <Bell className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="font-semibold text-sm">{title}</p>
                <p className="text-sm text-muted-foreground">{body}</p>
                <Badge className={`mt-1.5 text-xs ${sevMeta.cls}`}>{sevMeta.label}</Badge>
              </div>
            </div>
          </div>
        )}

        <Button onClick={send} disabled={sending || !title.trim() || !body.trim()} className="w-full">
          {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
          {sending ? "Mengirim…" : "Kirim Broadcast"}
        </Button>
      </Card>

      {/* History */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Riwayat Broadcast</h2>
          <Button variant="outline" size="sm" onClick={loadHistory}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
        {loadingHistory ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Belum ada riwayat broadcast pembeli
          </div>
        ) : (
          <div className="space-y-2">
            {history.map(h => {
              const sev = SEVERITY_OPTS.find(s => s.value === h.severity) ?? SEVERITY_OPTS[0];
              return (
                <div key={h.id} className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3">
                  <CheckCircle className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{h.title}</span>
                      <Badge className={`text-xs ${sev.cls}`}>{sev.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{h.body}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(h.created_at).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
