import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2, Eye, EyeOff, Save, RefreshCw, CheckCircle2, XCircle,
  CreditCard, Mail, Bell, MessageCircle, Info, Shield, Truck, KeyRound,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/admin/credentials")({
  head: () => ({ meta: [{ title: "Kredensial API — Admin" }] }),
  component: AdminCredentials,
});

type PaymentCreds = {
  midtrans_enabled: boolean;
  midtrans_server_key: string;
  midtrans_client_key: string;
  midtrans_mode: "sandbox" | "production";
  xendit_enabled: boolean;
  xendit_secret_key: string;
  xendit_webhook_token: string;
  xendit_mode: "test" | "live";
};

type EmailCreds = {
  resend_api_key: string;
  email_from: string;
};

type PushCreds = {
  vapid_public_key: string;
  vapid_private_key: string;
  vapid_subject: string;
};

type WACreds = {
  wa_api_key: string;
  wa_api_provider: string;
  wa_phone: string;
};

type SystemCreds = {
  admin_secret: string;
  rajaongkir_api_key: string;
  supabase_service_key: string;
};

const PAYMENT_DEFAULTS: PaymentCreds = {
  midtrans_enabled: false, midtrans_server_key: "", midtrans_client_key: "",
  midtrans_mode: "sandbox", xendit_enabled: false, xendit_secret_key: "",
  xendit_webhook_token: "", xendit_mode: "test",
};
const EMAIL_DEFAULTS: EmailCreds = { resend_api_key: "", email_from: "UMKMgo <noreply@umkmgo.id>" };
const PUSH_DEFAULTS: PushCreds = { vapid_public_key: "", vapid_private_key: "", vapid_subject: "mailto:admin@umkmgo.id" };
const WA_DEFAULTS: WACreds = { wa_api_key: "", wa_api_provider: "fonnte", wa_phone: "" };
const SYSTEM_DEFAULTS: SystemCreds = { admin_secret: "", rajaongkir_api_key: "", supabase_service_key: "" };

function SecretInput({ id, value, onChange, placeholder }: {
  id: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input id={id} type={show ? "text" : "password"} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="pr-10 font-mono text-sm" autoComplete="off" spellCheck={false} />
      <button type="button" onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" tabIndex={-1}>
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function StatusBadge({ configured }: { configured: boolean }) {
  return configured ? (
    <Badge className="bg-green-100 text-green-700 gap-1"><CheckCircle2 className="h-3 w-3" /> Terkonfigurasi</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground gap-1"><XCircle className="h-3 w-3" /> Belum diatur</Badge>
  );
}

async function loadSetting<T>(key: string, defaults: T): Promise<T> {
  const { data, error } = await (supabase as any)
    .from("platform_settings").select("value").eq("key", key).maybeSingle();
  if (error || !data?.value) return defaults;
  const val = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
  return { ...defaults, ...val } as T;
}

async function saveSetting(key: string, value: unknown): Promise<void> {
  const { error } = await (supabase as any)
    .from("platform_settings").upsert({ key, value }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

function AdminCredentials() {
  const [payment, setPayment] = useState<PaymentCreds>(PAYMENT_DEFAULTS);
  const [email, setEmail] = useState<EmailCreds>(EMAIL_DEFAULTS);
  const [push, setPush] = useState<PushCreds>(PUSH_DEFAULTS);
  const [wa, setWa] = useState<WACreds>(WA_DEFAULTS);
  const [system, setSystem] = useState<SystemCreds>(SYSTEM_DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      loadSetting("payment_credentials", PAYMENT_DEFAULTS),
      loadSetting("email_credentials", EMAIL_DEFAULTS),
      loadSetting("push_credentials", PUSH_DEFAULTS),
      loadSetting("wa_credentials", WA_DEFAULTS),
      loadSetting("system_credentials", SYSTEM_DEFAULTS),
    ]).then(([p, e, pu, w, s]) => {
      setPayment(p); setEmail(e); setPush(pu); setWa(w); setSystem(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const save = async (section: string, data: unknown) => {
    setSaving(section);
    try {
      await saveSetting(section, data);
      toast.success("Tersimpan. Klik 'Refresh Cache Server' agar server membaca credentials baru.");
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menyimpan");
    } finally {
      setSaving(null);
    }
  };

  const invalidateServerCache = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const res = await fetch("/api/admin/credentials/invalidate-cache", {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) toast.success("Cache server berhasil di-refresh");
      else toast.error("Gagal refresh cache. Pastikan SUPABASE_SERVICE_KEY sudah dikonfigurasi.");
    } catch {
      toast.error("Tidak dapat menghubungi server");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <KeyRound className="h-6 w-6 text-primary" />
            Kredensial & API Keys
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Konfigurasi API keys untuk payment gateway, email, push notification, WhatsApp, dan sistem.
            Semua nilai disimpan di database dan dibaca server secara otomatis.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={invalidateServerCache}>
          <RefreshCw className="h-4 w-4 mr-1.5" />
          Refresh Cache Server
        </Button>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex gap-2">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <strong>Cara kerja:</strong> Simpan credentials di halaman ini → klik <strong>Refresh Cache Server</strong> →
          API server membaca nilai terbaru (cache auto-refresh setiap 5 menit).
        </div>
      </div>

      {/* ── Sistem & Security ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Sistem & Keamanan</h2>
        </div>
        <Card className="p-5 space-y-4">
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800 flex gap-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <div>
              <strong>SUPABASE_SERVICE_KEY</strong> dibutuhkan agar server bisa membaca semua credentials dari database.
              Tanpanya, fitur payment/email tidak akan aktif.
              Dapatkan dari <a href="https://supabase.com/dashboard/project/_/settings/api" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-0.5">Supabase Dashboard → Settings → API <ExternalLink className="h-3 w-3" /></a>.
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="svc-key" className="text-xs">Supabase Service Role Key <span className="text-red-500">*penting</span></Label>
              <StatusBadge configured={Boolean(system.supabase_service_key)} />
            </div>
            <SecretInput id="svc-key" value={system.supabase_service_key}
              onChange={(v) => setSystem((s) => ({ ...s, supabase_service_key: v }))}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." />
          </div>

          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="admin-secret" className="text-xs">ADMIN_SECRET</Label>
              <StatusBadge configured={Boolean(system.admin_secret)} />
            </div>
            <SecretInput id="admin-secret" value={system.admin_secret}
              onChange={(v) => setSystem((s) => ({ ...s, admin_secret: v }))}
              placeholder="Buat password rahasia untuk akses API admin..." />
            <p className="mt-1 text-xs text-muted-foreground">
              Digunakan untuk autentikasi endpoint admin (migrations, auto-cancel, dll).
              Buat nilai yang kuat, minimal 32 karakter.
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <Button onClick={() => save("system_credentials", system)} disabled={saving === "system_credentials"}>
              {saving === "system_credentials"
                ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                : <Save className="h-4 w-4 mr-1.5" />}
              Simpan Sistem
            </Button>
          </div>
        </Card>
      </section>

      {/* ── Shipping ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Truck className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Pengiriman — RajaOngkir</h2>
        </div>
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-muted-foreground">Untuk kalkulasi ongkos kirim real-time.</div>
            <StatusBadge configured={Boolean(system.rajaongkir_api_key)} />
          </div>
          <div>
            <Label htmlFor="raja-key" className="text-xs mb-1">RajaOngkir API Key</Label>
            <SecretInput id="raja-key" value={system.rajaongkir_api_key}
              onChange={(v) => setSystem((s) => ({ ...s, rajaongkir_api_key: v }))}
              placeholder="rajaongkir_api_key..." />
            <p className="mt-1 text-xs text-muted-foreground">
              Dapatkan di <a href="https://rajaongkir.com" target="_blank" rel="noopener noreferrer" className="underline">rajaongkir.com</a> setelah mendaftar akun.
            </p>
          </div>
          <div className="flex justify-end pt-1">
            <Button onClick={() => save("system_credentials", system)} disabled={saving === "system_credentials"}>
              {saving === "system_credentials"
                ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                : <Save className="h-4 w-4 mr-1.5" />}
              Simpan Pengiriman
            </Button>
          </div>
        </Card>
      </section>

      {/* ── Payment Gateway ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Payment Gateway</h2>
        </div>
        <Card className="p-5 space-y-6">
          {/* Midtrans */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">Midtrans / Snap</div>
              <StatusBadge configured={Boolean(payment.midtrans_server_key)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="mt-server-key" className="text-xs mb-1">Server Key</Label>
                <SecretInput id="mt-server-key" value={payment.midtrans_server_key}
                  onChange={(v) => setPayment((p) => ({ ...p, midtrans_server_key: v }))} placeholder="SB-Mid-server-..." />
              </div>
              <div>
                <Label htmlFor="mt-client-key" className="text-xs mb-1">Client Key</Label>
                <SecretInput id="mt-client-key" value={payment.midtrans_client_key}
                  onChange={(v) => setPayment((p) => ({ ...p, midtrans_client_key: v }))} placeholder="SB-Mid-client-..." />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1">Mode</Label>
              <div className="flex gap-2 mt-1">
                {(["sandbox", "production"] as const).map((mode) => (
                  <button key={mode} onClick={() => setPayment((p) => ({ ...p, midtrans_mode: mode }))}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${payment.midtrans_mode === mode ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
                    {mode === "sandbox" ? "🧪 Sandbox" : "🚀 Production"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-border" />
          {/* Xendit */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-sm">Xendit</div>
              <StatusBadge configured={Boolean(payment.xendit_secret_key)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="xen-secret" className="text-xs mb-1">Secret Key</Label>
                <SecretInput id="xen-secret" value={payment.xendit_secret_key}
                  onChange={(v) => setPayment((p) => ({ ...p, xendit_secret_key: v }))} placeholder="xnd_production_..." />
              </div>
              <div>
                <Label htmlFor="xen-webhook" className="text-xs mb-1">Webhook Verification Token</Label>
                <SecretInput id="xen-webhook" value={payment.xendit_webhook_token}
                  onChange={(v) => setPayment((p) => ({ ...p, xendit_webhook_token: v }))} placeholder="webhook_token..." />
              </div>
            </div>
            <div>
              <Label className="text-xs mb-1">Mode</Label>
              <div className="flex gap-2 mt-1">
                {(["test", "live"] as const).map((mode) => (
                  <button key={mode} onClick={() => setPayment((p) => ({ ...p, xendit_mode: mode }))}
                    className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${payment.xendit_mode === mode ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
                    {mode === "test" ? "🧪 Test" : "🚀 Live"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => save("payment_credentials", payment)} disabled={saving === "payment_credentials"}>
              {saving === "payment_credentials" ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              Simpan Payment Gateway
            </Button>
          </div>
        </Card>
      </section>

      {/* ── Email (Resend) ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Email — Resend</h2>
        </div>
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-muted-foreground">Undangan staff, renewal reminder, invoice notifikasi.</div>
            <StatusBadge configured={Boolean(email.resend_api_key)} />
          </div>
          <div>
            <Label htmlFor="resend-key" className="text-xs mb-1">Resend API Key</Label>
            <SecretInput id="resend-key" value={email.resend_api_key}
              onChange={(v) => setEmail((e) => ({ ...e, resend_api_key: v }))} placeholder="re_..." />
            <p className="mt-1 text-xs text-muted-foreground">
              Dapatkan di <a href="https://resend.com/api-keys" target="_blank" rel="noopener noreferrer" className="underline">resend.com/api-keys</a>
            </p>
          </div>
          <div>
            <Label htmlFor="email-from" className="text-xs mb-1">Sender Address</Label>
            <Input id="email-from" value={email.email_from}
              onChange={(e) => setEmail((prev) => ({ ...prev, email_from: e.target.value }))}
              placeholder="UMKMgo <noreply@umkmgo.id>" />
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => save("email_credentials", email)} disabled={saving === "email_credentials"}>
              {saving === "email_credentials" ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              Simpan Email
            </Button>
          </div>
        </Card>
      </section>

      {/* ── Push Notification (VAPID) ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Push Notification — VAPID Keys</h2>
        </div>
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-muted-foreground">Web Push Notification menggunakan protokol VAPID.</div>
            <StatusBadge configured={Boolean(push.vapid_public_key && push.vapid_private_key)} />
          </div>
          <div>
            <Label htmlFor="vapid-public" className="text-xs mb-1">VAPID Public Key</Label>
            <Input id="vapid-public" value={push.vapid_public_key}
              onChange={(e) => setPush((p) => ({ ...p, vapid_public_key: e.target.value }))}
              placeholder="BNcRdreALRFXTkOOUHK..." className="font-mono text-sm" />
          </div>
          <div>
            <Label htmlFor="vapid-private" className="text-xs mb-1">VAPID Private Key</Label>
            <SecretInput id="vapid-private" value={push.vapid_private_key}
              onChange={(v) => setPush((p) => ({ ...p, vapid_private_key: v }))} placeholder="private key..." />
          </div>
          <div>
            <Label htmlFor="vapid-subject" className="text-xs mb-1">Subject (mailto: atau URL)</Label>
            <Input id="vapid-subject" value={push.vapid_subject}
              onChange={(e) => setPush((p) => ({ ...p, vapid_subject: e.target.value }))}
              placeholder="mailto:admin@umkmgo.id" />
          </div>
          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
            <strong>Generate VAPID keys:</strong>{" "}
            <code className="rounded bg-background px-1 py-0.5">npx web-push generate-vapid-keys</code>
            {" "}atau gunakan{" "}
            <a href="https://vapidkeys.com" target="_blank" rel="noopener noreferrer" className="underline">vapidkeys.com</a>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => save("push_credentials", push)} disabled={saving === "push_credentials"}>
              {saving === "push_credentials" ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              Simpan Push Notification
            </Button>
          </div>
        </Card>
      </section>

      {/* ── WhatsApp ── */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">WhatsApp API</h2>
        </div>
        <Card className="p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm text-muted-foreground">Notifikasi WhatsApp ke merchant dan pelanggan.</div>
            <StatusBadge configured={Boolean(wa.wa_api_key)} />
          </div>
          <div>
            <Label className="text-xs mb-1">Provider</Label>
            <div className="flex gap-2 mt-1">
              {["fonnte", "wablas", "whacenter"].map((p) => (
                <button key={p} onClick={() => setWa((w) => ({ ...w, wa_api_provider: p }))}
                  className={`px-3 py-1.5 rounded-md text-sm border transition-colors capitalize ${wa.wa_api_provider === p ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="wa-key" className="text-xs mb-1">API Key / Token</Label>
              <SecretInput id="wa-key" value={wa.wa_api_key}
                onChange={(v) => setWa((w) => ({ ...w, wa_api_key: v }))} placeholder="wa_api_token..." />
            </div>
            <div>
              <Label htmlFor="wa-phone" className="text-xs mb-1">Nomor Pengirim (dengan kode negara)</Label>
              <Input id="wa-phone" value={wa.wa_phone}
                onChange={(e) => setWa((w) => ({ ...w, wa_phone: e.target.value }))} placeholder="6281234567890" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={() => save("wa_credentials", wa)} disabled={saving === "wa_credentials"}>
              {saving === "wa_credentials" ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              Simpan WhatsApp
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
