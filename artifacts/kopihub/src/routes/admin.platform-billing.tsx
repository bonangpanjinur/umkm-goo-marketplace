import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Loader2, Save, CreditCard, Eye, EyeOff, CheckCircle2, AlertCircle,
  Wallet, QrCode, Banknote, Receipt, ExternalLink, Settings2,
} from "lucide-react";

export const Route = createFileRoute("/admin/platform-billing")({
  component: AdminPlatformBilling,
});

type Method = "midtrans" | "xendit" | "manual_transfer" | "qris_static";

type PlanBillingConfig = {
  primary_provider: Method;
  enabled_methods: Method[];
  invoice_prefix: string;
  tax_inclusive: boolean;
  tax_percent: number;
  auto_activate_on_paid: boolean;
  grace_period_days: number;
  success_redirect_url: string;
  failure_redirect_url: string;
  webhook_url_midtrans: string;
  webhook_url_xendit: string;
  manual_bank_name: string;
  manual_account_no: string;
  manual_account_name: string;
  manual_instructions: string;
  qris_image_url: string;
  qris_merchant_name: string;
  notes_for_owner: string;
};

const DEFAULTS: PlanBillingConfig = {
  primary_provider: "manual_transfer",
  enabled_methods: ["manual_transfer"],
  invoice_prefix: "INV-PLAN-",
  tax_inclusive: true,
  tax_percent: 11,
  auto_activate_on_paid: true,
  grace_period_days: 3,
  success_redirect_url: "",
  failure_redirect_url: "",
  webhook_url_midtrans: "",
  webhook_url_xendit: "",
  manual_bank_name: "",
  manual_account_no: "",
  manual_account_name: "",
  manual_instructions: "Transfer ke rekening di atas, lalu upload bukti di halaman invoice.",
  qris_image_url: "",
  qris_merchant_name: "",
  notes_for_owner: "",
};

type GwConfig = {
  midtrans_enabled: boolean;
  midtrans_server_key: string | null;
  midtrans_client_key: string | null;
  midtrans_mode: "sandbox" | "production";
  xendit_enabled: boolean;
  xendit_secret_key: string | null;
  xendit_webhook_token: string | null;
  xendit_mode: "sandbox" | "production";
};

const METHOD_META: Record<Method, { label: string; icon: typeof Wallet; desc: string }> = {
  midtrans: { label: "Midtrans", icon: CreditCard, desc: "Snap checkout — VA, kartu kredit, e-wallet, QRIS" },
  xendit: { label: "Xendit", icon: Wallet, desc: "Invoice — VA, retail outlet, e-wallet, kartu" },
  manual_transfer: { label: "Transfer Bank Manual", icon: Banknote, desc: "Owner transfer & upload bukti, admin verifikasi manual" },
  qris_static: { label: "QRIS Statis", icon: QrCode, desc: "Tampilkan QRIS gambar statis untuk semua paket" },
};

function SecretView({ value }: { value: string | null }) {
  const [show, setShow] = useState(false);
  if (!value) return <span className="text-xs text-muted-foreground italic">belum diisi</span>;
  const masked = value.length > 8 ? value.slice(0, 4) + "•".repeat(8) + value.slice(-4) : "•".repeat(value.length);
  return (
    <div className="flex items-center gap-1.5">
      <code className="text-xs font-mono">{show ? value : masked}</code>
      <button type="button" onClick={() => setShow(s => !s)} className="text-muted-foreground hover:text-foreground">
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function AdminPlatformBilling() {
  const [cfg, setCfg] = useState<PlanBillingConfig>(DEFAULTS);
  const [gw, setGw] = useState<GwConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [billingRes, gwRes] = await Promise.all([
        supabase.from("platform_settings" as any).select("value").eq("key", "plan_billing").maybeSingle(),
        supabase.from("platform_settings" as any).select("value").eq("key", "payment_gateways").maybeSingle(),
      ]);
      if (billingRes.data) setCfg({ ...DEFAULTS, ...((billingRes.data as any).value ?? {}) });
      if (gwRes.data) setGw((gwRes.data as any).value as GwConfig);
      setLoading(false);
    })();
  }, []);

  const set = (patch: Partial<PlanBillingConfig>) => setCfg(c => ({ ...c, ...patch }));

  const toggleMethod = (m: Method) => {
    setCfg(c => ({
      ...c,
      enabled_methods: c.enabled_methods.includes(m)
        ? c.enabled_methods.filter(x => x !== m)
        : [...c.enabled_methods, m],
    }));
  };

  const save = async () => {
    if (cfg.enabled_methods.length === 0) {
      toast.error("Pilih minimal 1 metode pembayaran aktif");
      return;
    }
    if (!cfg.enabled_methods.includes(cfg.primary_provider)) {
      toast.error("Metode utama harus salah satu yang diaktifkan");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings" as any)
      .upsert({ key: "plan_billing", value: cfg, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) toast.error(error.message);
    else toast.success("Konfigurasi billing paket tersimpan");
    setSaving(false);
  };

  const testConnection = async (provider: "midtrans" | "xendit") => {
    setTesting(provider);
    await new Promise(r => setTimeout(r, 800));
    if (provider === "midtrans") {
      if (!gw?.midtrans_server_key) toast.error("Midtrans server key belum di-set di Payment Gateway");
      else toast.success(`Midtrans (${gw.midtrans_mode}) — kredensial ditemukan`);
    } else {
      if (!gw?.xendit_secret_key) toast.error("Xendit secret key belum di-set di Payment Gateway");
      else toast.success(`Xendit (${gw.xendit_mode}) — kredensial ditemukan`);
    }
    setTesting(null);
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const midtransReady = !!gw?.midtrans_enabled && !!gw?.midtrans_server_key;
  const xenditReady = !!gw?.xendit_enabled && !!gw?.xendit_secret_key;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6 text-primary" /> Billing Paket Platform
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Atur metode pembayaran yang dipakai owner saat membeli/upgrade paket berlangganan platform.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan
        </Button>
      </div>

      {/* Credential status from Payment Gateway page */}
      <Card className="p-4 bg-muted/30">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Status Kredensial Gateway</h3>
          </div>
          <Link to="/admin/payment-config">
            <Button variant="ghost" size="sm" className="gap-1 text-xs">
              Kelola Key <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-lg border bg-background p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Midtrans</span>
              <Badge variant={midtransReady ? "default" : "outline"} className="text-[10px]">
                {midtransReady ? gw?.midtrans_mode ?? "" : "belum aktif"}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>Server key: <SecretView value={gw?.midtrans_server_key ?? null} /></div>
              <div>Client key: <SecretView value={gw?.midtrans_client_key ?? null} /></div>
            </div>
            <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => testConnection("midtrans")} disabled={testing === "midtrans"}>
              {testing === "midtrans" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
              Test Koneksi
            </Button>
          </div>
          <div className="rounded-lg border bg-background p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium">Xendit</span>
              <Badge variant={xenditReady ? "default" : "outline"} className="text-[10px]">
                {xenditReady ? gw?.xendit_mode ?? "" : "belum aktif"}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground space-y-0.5">
              <div>Secret key: <SecretView value={gw?.xendit_secret_key ?? null} /></div>
              <div>Webhook token: <SecretView value={gw?.xendit_webhook_token ?? null} /></div>
            </div>
            <Button size="sm" variant="outline" className="mt-2 text-xs h-7" onClick={() => testConnection("xendit")} disabled={testing === "xendit"}>
              {testing === "xendit" ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <CheckCircle2 className="h-3 w-3 mr-1" />}
              Test Koneksi
            </Button>
          </div>
        </div>
      </Card>

      {/* Method picker */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Metode Pembayaran Aktif untuk Paket</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {(Object.keys(METHOD_META) as Method[]).map(m => {
            const meta = METHOD_META[m];
            const Icon = meta.icon;
            const enabled = cfg.enabled_methods.includes(m);
            const blocked =
              (m === "midtrans" && !midtransReady) ||
              (m === "xendit" && !xenditReady);
            return (
              <button
                key={m}
                type="button"
                onClick={() => !blocked && toggleMethod(m)}
                disabled={blocked}
                className={`text-left rounded-lg border p-3 transition ${
                  enabled ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted/40"
                } ${blocked ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-start gap-2">
                  <Icon className={`h-4 w-4 mt-0.5 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{meta.label}</span>
                      {enabled && <Badge className="text-[10px] h-4">aktif</Badge>}
                      {blocked && <Badge variant="outline" className="text-[10px] h-4">key belum diisi</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{meta.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t">
          <Label className="text-xs">Metode Utama (default checkout)</Label>
          <select
            className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={cfg.primary_provider}
            onChange={e => set({ primary_provider: e.target.value as Method })}
          >
            {cfg.enabled_methods.map(m => (
              <option key={m} value={m}>{METHOD_META[m].label}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Invoice & tax */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Invoice & Pajak</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Prefix Nomor Invoice</Label>
            <Input value={cfg.invoice_prefix} onChange={e => set({ invoice_prefix: e.target.value })} placeholder="INV-PLAN-" />
          </div>
          <div>
            <Label>PPN (%)</Label>
            <Input type="number" min={0} max={100} value={cfg.tax_percent} onChange={e => set({ tax_percent: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={cfg.tax_inclusive} onCheckedChange={v => set({ tax_inclusive: v })} />
            <Label className="font-normal">Harga paket sudah termasuk PPN</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={cfg.auto_activate_on_paid} onCheckedChange={v => set({ auto_activate_on_paid: v })} />
            <Label className="font-normal">Aktifkan paket otomatis saat webhook PAID diterima</Label>
          </div>
          <div>
            <Label>Grace Period setelah Expired (hari)</Label>
            <Input type="number" min={0} max={30} value={cfg.grace_period_days} onChange={e => set({ grace_period_days: Number(e.target.value) })} />
          </div>
        </div>
      </Card>

      {/* Redirect URLs */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">URL Redirect Checkout</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Success Redirect URL</Label>
            <Input value={cfg.success_redirect_url} onChange={e => set({ success_redirect_url: e.target.value })} placeholder="https://app.umkmgo.id/pos-app/billing?status=success" />
          </div>
          <div>
            <Label>Failure Redirect URL</Label>
            <Input value={cfg.failure_redirect_url} onChange={e => set({ failure_redirect_url: e.target.value })} placeholder="https://app.umkmgo.id/pos-app/billing?status=failed" />
          </div>
          <div>
            <Label>Webhook URL Midtrans</Label>
            <Input value={cfg.webhook_url_midtrans} onChange={e => set({ webhook_url_midtrans: e.target.value })} placeholder="https://app.umkmgo.id/api/public/webhooks/plan-billing/midtrans" />
            <p className="text-[11px] text-muted-foreground mt-1">Salin URL ini ke Midtrans Dashboard → Settings → Notification URL.</p>
          </div>
          <div>
            <Label>Webhook URL Xendit</Label>
            <Input value={cfg.webhook_url_xendit} onChange={e => set({ webhook_url_xendit: e.target.value })} placeholder="https://app.umkmgo.id/api/public/webhooks/plan-billing/xendit" />
            <p className="text-[11px] text-muted-foreground mt-1">Salin URL ini ke Xendit Dashboard → Webhooks → Invoice Paid.</p>
          </div>
        </div>
      </Card>

      {/* Manual transfer details */}
      {cfg.enabled_methods.includes("manual_transfer") && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Banknote className="h-4 w-4" /> Detail Transfer Manual
          </h3>
          <div className="grid sm:grid-cols-3 gap-3">
            <div>
              <Label>Nama Bank</Label>
              <Input value={cfg.manual_bank_name} onChange={e => set({ manual_bank_name: e.target.value })} placeholder="BCA" />
            </div>
            <div>
              <Label>Nomor Rekening</Label>
              <Input value={cfg.manual_account_no} onChange={e => set({ manual_account_no: e.target.value })} placeholder="1234567890" />
            </div>
            <div>
              <Label>Atas Nama</Label>
              <Input value={cfg.manual_account_name} onChange={e => set({ manual_account_name: e.target.value })} placeholder="PT UMKMgo Indonesia" />
            </div>
          </div>
          <div className="mt-3">
            <Label>Instruksi untuk Owner</Label>
            <Textarea rows={3} value={cfg.manual_instructions} onChange={e => set({ manual_instructions: e.target.value })} />
          </div>
        </Card>
      )}

      {/* QRIS */}
      {cfg.enabled_methods.includes("qris_static") && (
        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <QrCode className="h-4 w-4" /> QRIS Statis
          </h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label>Nama Merchant QRIS</Label>
              <Input value={cfg.qris_merchant_name} onChange={e => set({ qris_merchant_name: e.target.value })} placeholder="UMKMGO INDONESIA" />
            </div>
            <div>
              <Label>URL Gambar QRIS</Label>
              <Input value={cfg.qris_image_url} onChange={e => set({ qris_image_url: e.target.value })} placeholder="https://.../qris.png" />
            </div>
          </div>
        </Card>
      )}

      {/* Notes */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Catatan Tambahan untuk Owner di Halaman Checkout</h3>
        <Textarea rows={3} value={cfg.notes_for_owner} onChange={e => set({ notes_for_owner: e.target.value })} placeholder="Pembayaran akan diverifikasi 1x24 jam pada hari kerja." />
      </Card>

      {/* Footer warning */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-xs">
        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-amber-800 dark:text-amber-300">
          Kredensial Midtrans/Xendit dikelola di halaman <Link to="/admin/payment-config" className="underline font-medium">Payment Gateway</Link>. Halaman ini hanya mengatur bagaimana paket platform di-billing — checkout produk marketplace memakai pengaturan terpisah di halaman tersebut.
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan Konfigurasi
        </Button>
      </div>
    </div>
  );
}