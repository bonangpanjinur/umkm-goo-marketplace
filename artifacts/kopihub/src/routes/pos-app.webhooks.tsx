import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  Webhook,
  Plus,
  Trash2,
  Pencil,
  PlayCircle,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export const Route = createFileRoute("/pos-app/webhooks")({
  head: () => ({ meta: [{ title: "Webhook — Merchant" }] }),
  component: WebhooksPage,
});

const API_BASE = "/api";

const ALL_EVENTS = [
  { value: "order.created", label: "Pesanan Dibuat" },
  { value: "order.completed", label: "Pesanan Selesai" },
  { value: "order.cancelled", label: "Pesanan Dibatalkan" },
  { value: "order.refunded", label: "Refund Diproses" },
  { value: "payment.paid", label: "Pembayaran Berhasil" },
  { value: "payment.failed", label: "Pembayaran Gagal" },
  { value: "booking.created", label: "Booking Dibuat" },
  { value: "booking.confirmed", label: "Booking Dikonfirmasi" },
  { value: "booking.cancelled", label: "Booking Dibatalkan" },
  { value: "stock.low", label: "Stok Menipis" },
  { value: "review.created", label: "Ulasan Baru" },
];

type WebhookRow = {
  id: string;
  shop_id: string;
  name: string;
  url: string;
  events: string[];
  secret: string | null;
  is_active: boolean;
  created_at: string;
};

type Delivery = {
  id: string;
  event: string;
  status: string;
  response_code: number | null;
  duration_ms: number | null;
  delivered_at: string;
};

const BLANK_FORM = { name: "", url: "", events: [] as string[], secret: "" };

function WebhooksPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [webhooks, setWebhooks] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<WebhookRow | null>(null);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [deliveriesMap, setDeliveriesMap] = useState<Record<string, Delivery[]>>({});
  const [openDeliveries, setOpenDeliveries] = useState<Record<string, boolean>>({});
  const [showSecret, setShowSecret] = useState(false);

  const load = useCallback(async () => {
    if (!shop?.id) return;
    setLoading(true);
    const res = await fetch(`${API_BASE}/webhooks?shop_id=${shop.id}`);
    if (res.ok) {
      const json = await res.json();
      setWebhooks(json.webhooks ?? []);
    }
    setLoading(false);
  }, [shop?.id]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setEditTarget(null);
    setForm(BLANK_FORM);
    setShowSecret(false);
    setDialogOpen(true);
  }

  function openEdit(w: WebhookRow) {
    setEditTarget(w);
    setForm({ name: w.name, url: w.url, events: [...w.events], secret: w.secret ?? "" });
    setShowSecret(false);
    setDialogOpen(true);
  }

  function toggleEvent(ev: string) {
    setForm((f) => ({
      ...f,
      events: f.events.includes(ev) ? f.events.filter((e) => e !== ev) : [...f.events, ev],
    }));
  }

  async function save() {
    if (!shop?.id) return;
    if (!form.name.trim() || !form.url.trim()) {
      toast.error("Nama dan URL wajib diisi");
      return;
    }
    if (form.events.length === 0) {
      toast.error("Pilih minimal satu event");
      return;
    }
    try { new URL(form.url); } catch {
      toast.error("URL tidak valid");
      return;
    }
    setSaving(true);
    const body = {
      shop_id: shop.id,
      name: form.name,
      url: form.url,
      events: form.events,
      secret: form.secret || undefined,
    };
    const method = editTarget ? "PUT" : "POST";
    const url = editTarget ? `${API_BASE}/webhooks/${editTarget.id}` : `${API_BASE}/webhooks`;
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j.error ?? "Gagal menyimpan webhook");
      return;
    }
    toast.success(editTarget ? "Webhook diperbarui" : "Webhook ditambahkan");
    setDialogOpen(false);
    load();
  }

  async function deleteWebhook(w: WebhookRow) {
    if (!confirm(`Hapus webhook "${w.name}"?`)) return;
    const res = await fetch(`${API_BASE}/webhooks/${w.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Webhook dihapus");
      load();
    } else {
      toast.error("Gagal menghapus webhook");
    }
  }

  async function toggleActive(w: WebhookRow) {
    await fetch(`${API_BASE}/webhooks/${w.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !w.is_active }),
    });
    load();
  }

  async function sendTest(w: WebhookRow) {
    setTestingId(w.id);
    const res = await fetch(`${API_BASE}/webhooks/${w.id}/test`, { method: "POST" });
    setTestingId(null);
    const json = await res.json().catch(() => ({}));
    if (json.status === "success") {
      toast.success(`Test berhasil — HTTP ${json.response_code} (${json.duration_ms}ms)`);
    } else {
      toast.error(`Test gagal — ${json.response_body || "Tidak ada respons"}`);
    }
    loadDeliveries(w.id);
  }

  async function loadDeliveries(id: string) {
    const res = await fetch(`${API_BASE}/webhooks/${id}/deliveries`);
    if (res.ok) {
      const json = await res.json();
      setDeliveriesMap((m) => ({ ...m, [id]: json.deliveries ?? [] }));
    }
  }

  function toggleDeliveries(id: string) {
    setOpenDeliveries((s) => {
      const next = !s[id];
      if (next && !deliveriesMap[id]) loadDeliveries(id);
      return { ...s, [id]: next };
    });
  }

  if (shopLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-6 lg:py-10">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Webhook className="h-6 w-6 text-primary" /> Outgoing Webhooks
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kirim notifikasi otomatis ke sistem eksternal saat ada event di toko Anda
          </p>
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-1.5" /> Tambah Webhook
        </Button>
      </div>

      <div className="mb-6 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-sm text-blue-800 space-y-1">
        <p className="font-medium">Cara kerja Webhook</p>
        <p>Setiap kali event terpilih terjadi di toko Anda, sistem akan mengirim HTTP POST ke URL yang dikonfigurasi dengan payload JSON. Gunakan Secret untuk memverifikasi tanda tangan <code className="bg-blue-100 px-1 rounded text-xs">X-UMKMgo-Signature</code>.</p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : webhooks.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Belum ada webhook. Klik "Tambah Webhook" untuk mulai.
        </Card>
      ) : (
        <div className="space-y-3">
          {webhooks.map((w) => (
            <Card key={w.id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{w.name}</span>
                      <Badge variant={w.is_active ? "default" : "secondary"} className="text-xs">
                        {w.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground truncate font-mono">{w.url}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {w.events.map((ev) => (
                        <Badge key={ev} variant="outline" className="text-xs font-mono">{ev}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button variant="outline" size="sm" onClick={() => sendTest(w)} disabled={testingId === w.id}>
                      {testingId === w.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <PlayCircle className="h-3.5 w-3.5 mr-1" />}
                      Test
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(w)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => toggleActive(w)}>
                      {w.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </Button>
                    <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => deleteWebhook(w)}>
                      <Trash2 className="h-3.5 w-3.5 mr-1" /> Hapus
                    </Button>
                  </div>
                </div>
              </div>

              <Collapsible open={!!openDeliveries[w.id]} onOpenChange={() => toggleDeliveries(w.id)}>
                <CollapsibleTrigger asChild>
                  <button className="w-full flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground hover:bg-muted/30">
                    Riwayat Pengiriman
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDeliveries[w.id] ? "rotate-180" : ""}`} />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="border-t border-border divide-y divide-border">
                    {!deliveriesMap[w.id] ? (
                      <div className="px-4 py-3 flex justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    ) : deliveriesMap[w.id]!.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-muted-foreground text-center">
                        Belum ada pengiriman
                      </div>
                    ) : (
                      deliveriesMap[w.id]!.slice(0, 10).map((d) => (
                        <div key={d.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            {d.status === "success"
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                              : <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                            <span className="font-mono text-muted-foreground truncate">{d.event}</span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
                            {d.response_code && (
                              <span className={d.response_code >= 200 && d.response_code < 300 ? "text-green-600" : "text-red-600"}>
                                HTTP {d.response_code}
                              </span>
                            )}
                            {d.duration_ms && <span>{d.duration_ms}ms</span>}
                            <span>{formatDistanceToNow(new Date(d.delivered_at), { addSuffix: true, locale: idLocale })}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Webhook" : "Tambah Webhook Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nama *</Label>
              <Input
                className="mt-1"
                placeholder="cth: Notifikasi ke Slack"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>URL Endpoint *</Label>
              <Input
                className="mt-1 font-mono text-sm"
                placeholder="https://hooks.slack.com/services/..."
                value={form.url}
                onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              />
            </div>
            <div>
              <Label>Secret (opsional)</Label>
              <div className="relative mt-1">
                <Input
                  type={showSecret ? "text" : "password"}
                  className="font-mono text-sm pr-10"
                  placeholder="Kosongkan jika tidak perlu verifikasi"
                  value={form.secret}
                  onChange={(e) => setForm((f) => ({ ...f, secret: e.target.value }))}
                />
                <button
                  type="button"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowSecret((s) => !s)}
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Digunakan untuk menghitung HMAC-SHA256 di header <code className="bg-muted px-1 rounded">X-UMKMgo-Signature</code>
              </p>
            </div>
            <div>
              <Label className="mb-2 block">Events *</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_EVENTS.map((ev) => (
                  <label key={ev.value} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      className="rounded border-border accent-primary"
                      checked={form.events.includes(ev.value)}
                      onChange={() => toggleEvent(ev.value)}
                    />
                    <span>{ev.label}</span>
                    <span className="text-xs text-muted-foreground font-mono hidden sm:block">{ev.value}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Batal</Button>
              <Button onClick={save} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Menyimpan...</> : "Simpan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
