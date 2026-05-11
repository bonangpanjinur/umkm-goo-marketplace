import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, CreditCard, Zap, CheckCircle2, AlertCircle, Save } from "lucide-react";

export const Route = createFileRoute("/admin/payment-config")({
  component: AdminPaymentConfig,
});

type GwConfig = {
  midtrans_enabled: boolean;
  midtrans_server_key: string | null;
  midtrans_client_key: string | null;
  midtrans_mode: "sandbox" | "production";
  xendit_enabled: boolean;
  xendit_secret_key: string | null;
  xendit_webhook_token: string | null;
  xendit_mode: "sandbox" | "production";
  manual_transfer_enabled: boolean;
  qris_enabled: boolean;
};

const DEFAULTS: GwConfig = {
  midtrans_enabled: false,
  midtrans_server_key: "",
  midtrans_client_key: "",
  midtrans_mode: "sandbox",
  xendit_enabled: false,
  xendit_secret_key: "",
  xendit_webhook_token: "",
  xendit_mode: "sandbox",
  manual_transfer_enabled: true,
  qris_enabled: false,
};

function SecretInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative mt-1.5">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder ?? "••••••••••••••••"}
          className="pr-10 font-mono text-sm"
        />
        <button type="button" onClick={() => setShow(s => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function AdminPaymentConfig() {
  const [cfg, setCfg] = useState<GwConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("platform_settings" as any)
      .select("value")
      .eq("key", "payment_gateways")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCfg({ ...DEFAULTS, ...(data as any).value });
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings" as any)
      .upsert({ key: "payment_gateways", value: cfg, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) toast.error(error.message);
    else toast.success("Konfigurasi payment gateway tersimpan");
    setSaving(false);
  };

  const set = (patch: Partial<GwConfig>) => setCfg(c => ({ ...c, ...patch }));

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  const activeGateways = [
    cfg.midtrans_enabled && "Midtrans",
    cfg.xendit_enabled && "Xendit",
    cfg.manual_transfer_enabled && "Transfer Manual",
    cfg.qris_enabled && "QRIS",
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Konfigurasi Payment Gateway</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aktifkan dan konfigurasikan gateway pembayaran untuk checkout marketplace.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="shrink-0 gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan
        </Button>
      </div>

      {/* Active summary */}
      <Card className="flex flex-wrap items-center gap-2 p-4">
        <span className="text-xs text-muted-foreground font-medium">Aktif:</span>
        {activeGateways.length === 0 ? (
          <Badge variant="destructive" className="text-xs gap-1"><AlertCircle className="h-3 w-3" />Tidak ada gateway aktif</Badge>
        ) : activeGateways.map(g => (
          <Badge key={g as string} className="gap-1 bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3" />{g}
          </Badge>
        ))}
      </Card>

      {/* Midtrans */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold">Midtrans</p>
              <p className="text-xs text-muted-foreground">Payment gateway lokal Indonesia</p>
            </div>
          </div>
          <Switch checked={cfg.midtrans_enabled} onCheckedChange={v => set({ midtrans_enabled: v })} />
        </div>

        {cfg.midtrans_enabled && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex gap-2">
              {(["sandbox", "production"] as const).map(m => (
                <button key={m} onClick={() => set({ midtrans_mode: m })}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${cfg.midtrans_mode === m ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent"}`}>
                  {m === "sandbox" ? "Sandbox (Testing)" : "Production (Live)"}
                </button>
              ))}
            </div>
            {cfg.midtrans_mode === "production" && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">Mode production — transaksi nyata akan diproses</p>
              </div>
            )}
            <SecretInput label="Server Key" value={cfg.midtrans_server_key ?? ""} onChange={v => set({ midtrans_server_key: v })} placeholder="SB-Mid-server-..." />
            <div>
              <Label>Client Key</Label>
              <Input className="mt-1.5 font-mono text-sm" value={cfg.midtrans_client_key ?? ""} onChange={e => set({ midtrans_client_key: e.target.value })} placeholder="SB-Mid-client-..." />
            </div>
            <p className="text-xs text-muted-foreground">
              Dapatkan kunci dari <a href="https://dashboard.midtrans.com" target="_blank" rel="noreferrer" className="text-primary underline">dashboard.midtrans.com</a>
            </p>
          </div>
        )}
      </Card>

      {/* Xendit */}
      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-600 text-white">
              <Zap className="h-4 w-4" />
            </div>
            <div>
              <p className="font-semibold">Xendit</p>
              <p className="text-xs text-muted-foreground">VA, e-wallet, kartu kredit, QRIS</p>
            </div>
          </div>
          <Switch checked={cfg.xendit_enabled} onCheckedChange={v => set({ xendit_enabled: v })} />
        </div>

        {cfg.xendit_enabled && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex gap-2">
              {(["sandbox", "production"] as const).map(m => (
                <button key={m} onClick={() => set({ xendit_mode: m })}
                  className={`flex-1 rounded-lg border py-1.5 text-xs font-medium transition-colors ${cfg.xendit_mode === m ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground hover:bg-accent"}`}>
                  {m === "sandbox" ? "Sandbox (Testing)" : "Production (Live)"}
                </button>
              ))}
            </div>
            {cfg.xendit_mode === "production" && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-xs text-amber-700">Mode production — transaksi nyata akan diproses</p>
              </div>
            )}
            <SecretInput label="Secret Key" value={cfg.xendit_secret_key ?? ""} onChange={v => set({ xendit_secret_key: v })} placeholder="xnd_production_..." />
            <SecretInput label="Webhook Verification Token" value={cfg.xendit_webhook_token ?? ""} onChange={v => set({ xendit_webhook_token: v })} />
            <p className="text-xs text-muted-foreground">
              Dapatkan kunci dari <a href="https://dashboard.xendit.co" target="_blank" rel="noreferrer" className="text-primary underline">dashboard.xendit.co</a>
            </p>
          </div>
        )}
      </Card>

      {/* Manual methods */}
      <Card className="p-5 space-y-3">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide text-xs">Metode Manual</p>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Transfer Bank Manual</p>
            <p className="text-xs text-muted-foreground">Pembeli transfer ke rekening platform, konfirmasi manual</p>
          </div>
          <Switch checked={cfg.manual_transfer_enabled} onCheckedChange={v => set({ manual_transfer_enabled: v })} />
        </div>
        <div className="flex items-center justify-between border-t border-border pt-3">
          <div>
            <p className="text-sm font-medium">QRIS Statis</p>
            <p className="text-xs text-muted-foreground">Scan QR yang sudah diatur di Pengaturan</p>
          </div>
          <Switch checked={cfg.qris_enabled} onCheckedChange={v => set({ qris_enabled: v })} />
        </div>
      </Card>
    </div>
  );
}
