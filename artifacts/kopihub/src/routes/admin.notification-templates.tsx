import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Mail, Bell, Loader2, Save, RefreshCw, Eye, ChevronDown, ChevronUp } from "lucide-react";

export const Route = createFileRoute("/admin/notification-templates")({ component: NotificationTemplates });

type Template = {
  key: string;
  subject: string;
  body: string;
  variables: string[];
  channel: "email" | "inapp";
  label: string;
};

const DEFAULT_TEMPLATES: Template[] = [
  {
    key: "order_confirmed",
    label: "Pesanan Dikonfirmasi",
    channel: "email",
    subject: "Pesanan #{{order_id}} kamu sudah dikonfirmasi!",
    body: `Halo {{customer_name}},\n\nPesananmu dari {{shop_name}} sudah dikonfirmasi. Kami sedang memproses pesananmu.\n\nDetail Pesanan:\n- ID: #{{order_id}}\n- Total: {{total_amount}}\n- Metode Bayar: {{payment_method}}\n\nPantau status pesananmu di: {{tracking_url}}\n\nTerima kasih sudah berbelanja di {{platform_name}}!`,
    variables: ["customer_name", "shop_name", "order_id", "total_amount", "payment_method", "tracking_url", "platform_name"],
  },
  {
    key: "order_shipped",
    label: "Pesanan Dikirim",
    channel: "email",
    subject: "Pesanan #{{order_id}} sedang dalam perjalanan!",
    body: `Halo {{customer_name}},\n\nPesananmu sudah dikirim oleh {{shop_name}}.\n\nInfo Pengiriman:\n- Kurir: {{courier_name}}\n- Nomor Resi: {{tracking_number}}\n- Lacak: {{courier_tracking_url}}\n\nEstimasi tiba: {{estimated_arrival}}\n\nTerima kasih,\nTim {{platform_name}}`,
    variables: ["customer_name", "shop_name", "order_id", "courier_name", "tracking_number", "courier_tracking_url", "estimated_arrival", "platform_name"],
  },
  {
    key: "kyc_approved",
    label: "KYC Disetujui",
    channel: "inapp",
    subject: "Verifikasi identitas kamu berhasil!",
    body: `Selamat, {{owner_name}}! Identitasmu telah diverifikasi dan tokomu sekarang aktif di marketplace. Badge "Terverifikasi" sudah tampil di halaman tokomu.`,
    variables: ["owner_name", "shop_name"],
  },
  {
    key: "kyc_rejected",
    label: "KYC Ditolak",
    channel: "inapp",
    subject: "Verifikasi identitas memerlukan tindak lanjut",
    body: `Halo {{owner_name}},\n\nMaaf, verifikasi identitas tokomu belum bisa kami proses. Alasan: {{reject_reason}}.\n\nSilakan upload ulang dokumen yang sesuai di menu Verifikasi KTP pada dashboard tokomu.`,
    variables: ["owner_name", "shop_name", "reject_reason"],
  },
  {
    key: "withdrawal_approved",
    label: "Penarikan Disetujui",
    channel: "inapp",
    subject: "Penarikan dana {{amount}} disetujui",
    body: `Halo {{owner_name}},\n\nPermintaan penarikan dana sebesar {{amount}} ke rekening {{bank_name}} {{account_number}} telah disetujui dan sedang diproses. Dana akan cair dalam 1-3 hari kerja.`,
    variables: ["owner_name", "amount", "bank_name", "account_number"],
  },
  {
    key: "new_order_owner",
    label: "Pesanan Baru (Owner)",
    channel: "inapp",
    subject: "Pesanan baru #{{order_id}} masuk!",
    body: `Pesanan baru dari {{customer_name}} sebesar {{total_amount}} telah masuk. Segera konfirmasi pesanan dalam {{confirm_deadline}} jam.`,
    variables: ["customer_name", "order_id", "total_amount", "confirm_deadline"],
  },
  {
    key: "low_stock_alert",
    label: "Alert Stok Rendah",
    channel: "inapp",
    subject: "Stok {{product_name}} hampir habis",
    body: `Stok produk "{{product_name}}" tinggal {{stock_qty}} unit, di bawah ambang batas {{threshold}} yang kamu set. Segera tambah stok sebelum kehabisan.`,
    variables: ["product_name", "stock_qty", "threshold"],
  },
  {
    key: "invoice_due",
    label: "Tagihan Jatuh Tempo",
    channel: "email",
    subject: "Tagihan {{platform_name}} jatuh tempo {{due_date}}",
    body: `Halo {{owner_name}},\n\nTagihan berlangganan paket {{plan_name}} sebesar {{amount}} akan jatuh tempo pada {{due_date}}.\n\nBayar sekarang di: {{billing_url}}\n\nJika tidak dibayar dalam {{grace_period}} hari, tokomu akan dinonaktifkan sementara.`,
    variables: ["owner_name", "plan_name", "amount", "due_date", "billing_url", "grace_period", "platform_name"],
  },
];

export default function NotificationTemplates() {
  const [templates, setTemplates] = useState<Template[]>(DEFAULT_TEMPLATES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState<string | null>(null);
  const [tab, setTab] = useState<"email" | "inapp">("email");

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "notification_templates")
      .maybeSingle();
    if (data?.value) {
      try {
        const saved = JSON.parse(data.value as string) as Template[];
        // Merge: keep defaults for keys not in saved
        const merged = DEFAULT_TEMPLATES.map(def => {
          const s = saved.find(x => x.key === def.key);
          return s ? { ...def, subject: s.subject, body: s.body } : def;
        });
        setTemplates(merged);
      } catch {}
    }
    setLoading(false);
  }

  async function saveTemplate(key: string) {
    setSaving(key);
    const toSave = templates.map(t => ({ key: t.key, subject: t.subject, body: t.body }));
    await supabase.from("platform_settings").upsert(
      { key: "notification_templates", value: JSON.stringify(toSave) },
      { onConflict: "key" }
    );
    setSaving(null);
    toast.success("Template disimpan");
  }

  function resetTemplate(key: string) {
    const def = DEFAULT_TEMPLATES.find(t => t.key === key);
    if (!def) return;
    setTemplates(ts => ts.map(t => t.key === key ? { ...t, subject: def.subject, body: def.body } : t));
    toast.success("Template direset ke default");
  }

  useEffect(() => { load(); }, []);

  const filtered = templates.filter(t => t.channel === tab);

  function renderPreview(t: Template) {
    let subject = t.subject;
    let body = t.body;
    const samples: Record<string, string> = {
      customer_name: "Budi Santoso", owner_name: "Budi Santoso", shop_name: "Toko Saya",
      order_id: "ORD-001234", total_amount: "Rp 250.000", payment_method: "Transfer BCA",
      tracking_url: "https://platform.com/track/ORD-001234", platform_name: "KopiHub",
      courier_name: "JNE", tracking_number: "JNE001234567", courier_tracking_url: "https://jne.co.id",
      estimated_arrival: "13–15 Mei 2026", reject_reason: "Foto KTP buram, silakan upload ulang",
      amount: "Rp 500.000", bank_name: "BCA", account_number: "1234567890",
      confirm_deadline: "24", stock_qty: "3", threshold: "10", product_name: "Kaos Polos Putih",
      plan_name: "Growth", due_date: "31 Mei 2026", billing_url: "https://platform.com/pos-app/billing",
      grace_period: "7",
    };
    for (const [k, v] of Object.entries(samples)) {
      subject = subject.replaceAll(`{{${k}}}`, v);
      body = body.replaceAll(`{{${k}}}`, v);
    }
    return { subject, body };
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Template Notifikasi
          </h1>
          <p className="text-sm text-muted-foreground">Edit subject & isi notifikasi yang dikirim ke pengguna</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Variable guide */}
      <Card className="p-3 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-800 font-medium mb-1">Cara penggunaan variabel dinamis</p>
        <p className="text-xs text-blue-700">Gunakan format <code className="bg-blue-100 px-1 rounded">{"{{nama_variabel}}"}</code> dalam subject atau isi template. Variabel akan otomatis diganti dengan data nyata saat notifikasi dikirim.</p>
      </Card>

      <Tabs value={tab} onValueChange={v => setTab(v as "email" | "inapp")}>
        <TabsList>
          <TabsTrigger value="email" className="gap-1.5"><Mail className="h-4 w-4" />Email ({templates.filter(t => t.channel === "email").length})</TabsTrigger>
          <TabsTrigger value="inapp" className="gap-1.5"><Bell className="h-4 w-4" />In-App ({templates.filter(t => t.channel === "inapp").length})</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="space-y-3 mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.map(t => {
            const isExpanded = expanded === t.key;
            const isPreview = previewKey === t.key;
            const preview = isPreview ? renderPreview(t) : null;
            return (
              <Card key={t.key} className="overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  onClick={() => setExpanded(isExpanded ? null : t.key)}
                >
                  <div className="flex items-center gap-3 text-left">
                    {tab === "email" ? <Mail className="h-4 w-4 text-blue-500 shrink-0" /> : <Bell className="h-4 w-4 text-violet-500 shrink-0" />}
                    <div>
                      <p className="font-medium text-sm">{t.label}</p>
                      <p className="text-xs text-muted-foreground font-mono">{t.key}</p>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 space-y-4 border-t">
                    {/* Variables */}
                    <div className="pt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">Variabel tersedia:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {t.variables.map(v => (
                          <code key={v} className="text-xs bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{`{{${v}}}`}</code>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Subject {tab === "inapp" && <span className="text-muted-foreground text-xs">(judul notifikasi)</span>}</Label>
                      <Input value={t.subject} onChange={e => setTemplates(ts => ts.map(x => x.key === t.key ? { ...x, subject: e.target.value } : x))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Isi {tab === "inapp" && <span className="text-muted-foreground text-xs">(body notifikasi)</span>}</Label>
                      <Textarea
                        rows={6}
                        value={t.body}
                        onChange={e => setTemplates(ts => ts.map(x => x.key === t.key ? { ...x, body: e.target.value } : x))}
                        className="font-mono text-xs"
                      />
                    </div>

                    {/* Preview */}
                    {isPreview && preview && (
                      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Preview dengan data contoh:</p>
                        <p className="text-sm font-semibold">{preview.subject}</p>
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans">{preview.body}</pre>
                      </div>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" onClick={() => saveTemplate(t.key)} disabled={saving === t.key}>
                        {saving === t.key ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                        Simpan
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setPreviewKey(isPreview ? null : t.key)}>
                        <Eye className="h-4 w-4 mr-1.5" />{isPreview ? "Tutup Preview" : "Preview"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => resetTemplate(t.key)}>
                        Reset Default
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
