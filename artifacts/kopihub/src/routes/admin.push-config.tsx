import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Bell, Save, AlertCircle, CheckCircle2, Copy, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/admin/push-config")({
  head: () => ({ meta: [{ title: "Konfigurasi Push — Admin" }] }),
  component: AdminPushConfig,
});

type PushConfig = {
  enabled: boolean;
  vapid_public_key: string;
  vapid_private_key: string;
  vapid_subject: string;
};

const DEFAULTS: PushConfig = {
  enabled: false,
  vapid_public_key: "",
  vapid_private_key: "",
  vapid_subject: "mailto:admin@example.com",
};

function AdminPushConfig() {
  const [cfg, setCfg] = useState<PushConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPriv, setShowPriv] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    supabase
      .from("platform_settings" as any)
      .select("value")
      .eq("key", "web_push")
      .maybeSingle()
      .then(({ data }) => {
        if (data) setCfg({ ...DEFAULTS, ...((data as any).value || {}) });
        setLoading(false);
      });
  }, []);

  const set = (patch: Partial<PushConfig>) => setCfg(c => ({ ...c, ...patch }));

  const save = async () => {
    if (cfg.enabled && (!cfg.vapid_public_key.trim() || !cfg.vapid_private_key.trim())) {
      toast.error("Public & Private Key wajib diisi saat push diaktifkan");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings" as any)
      .upsert(
        {
          key: "web_push",
          value: cfg,
          category: "notifications",
          description: "Konfigurasi VAPID untuk Web Push background notification",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "key" },
      );
    if (error) toast.error(error.message);
    else toast.success("Konfigurasi push notification tersimpan");
    setSaving(false);
  };

  const copy = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(`${label} disalin`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isConfigured = cfg.vapid_public_key && cfg.vapid_private_key;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Push Notification (VAPID)</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Konfigurasi background push notification yang muncul walau aplikasi tertutup.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="shrink-0 gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan
        </Button>
      </div>

      {/* Status */}
      <Card className="flex flex-wrap items-center gap-2 p-4">
        <span className="text-xs font-medium text-muted-foreground">Status:</span>
        {cfg.enabled && isConfigured ? (
          <Badge className="gap-1 bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3" />Aktif
          </Badge>
        ) : isConfigured ? (
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="h-3 w-3" />Terkonfigurasi tapi nonaktif
          </Badge>
        ) : (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />Belum dikonfigurasi
          </Badge>
        )}
      </Card>

      {/* How to generate */}
      <Card className="p-5 space-y-3 bg-muted/30">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <p className="font-semibold text-sm">Generate VAPID Keys</p>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={generating}
            onClick={async () => {
              setGenerating(true);
              try {
                const apiBase = import.meta.env.VITE_API_URL ?? "/api";
                const res = await fetch(`${apiBase}/push/vapid-keys`, { method: "POST" });
                if (!res.ok) throw new Error("Gagal generate keys");
                const data = await res.json();
                set({ vapid_public_key: data.publicKey, vapid_private_key: data.privateKey });
                toast.success("VAPID keys berhasil digenerate — simpan sekarang!");
              } catch (e: any) {
                toast.error(e.message ?? "Gagal generate keys");
              } finally {
                setGenerating(false);
              }
            }}
          >
            {generating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
            Generate dari Server
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Klik tombol di atas untuk generate key pair baru langsung dari API server,
          atau paste manual dari{" "}
          <a href="https://vapidkeys.com/" target="_blank" rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline">
            vapidkeys.com <ExternalLink className="h-3 w-3" />
          </a>.
          Setelah generate, klik <strong>Simpan</strong> untuk menyimpan ke database.
        </p>
      </Card>

      {/* Config form */}
      <Card className="p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Aktifkan Push Notification</p>
            <p className="text-xs text-muted-foreground">Toggle off untuk menonaktifkan tanpa menghapus key</p>
          </div>
          <Switch
            checked={cfg.enabled}
            onCheckedChange={v => set({ enabled: v })}
            disabled={!isConfigured}
          />
        </div>

        <div>
          <Label htmlFor="public_key">VAPID Public Key</Label>
          <div className="mt-1.5 flex gap-2">
            <Input
              id="public_key"
              value={cfg.vapid_public_key}
              onChange={e => set({ vapid_public_key: e.target.value.trim() })}
              placeholder="BHHhDvlw5_uMW0iPnJcHUBtCS_jCk..."
              className="font-mono text-xs"
            />
            {cfg.vapid_public_key && (
              <Button type="button" size="icon" variant="outline" onClick={() => copy(cfg.vapid_public_key, "Public key")}>
                <Copy className="h-4 w-4" />
              </Button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Aman untuk dishare di client. Akan ditanam ke service worker browser pengguna.
          </p>
        </div>

        <div>
          <Label htmlFor="private_key">VAPID Private Key</Label>
          <div className="mt-1.5 relative">
            <Input
              id="private_key"
              type={showPriv ? "text" : "password"}
              value={cfg.vapid_private_key}
              onChange={e => set({ vapid_private_key: e.target.value.trim() })}
              placeholder="••••••••••••••••••••••••"
              className="pr-10 font-mono text-xs"
            />
            <button
              type="button"
              onClick={() => setShowPriv(s => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPriv ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-[11px] text-destructive">
            Rahasia. Jangan dishare. Hanya digunakan di server untuk sign push payload.
          </p>
        </div>

        <div>
          <Label htmlFor="subject">VAPID Subject</Label>
          <Input
            id="subject"
            value={cfg.vapid_subject}
            onChange={e => set({ vapid_subject: e.target.value })}
            placeholder="mailto:admin@example.com"
            className="mt-1.5 font-mono text-xs"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            Email kontak admin (format <code className="font-mono">mailto:...</code>) atau URL situs.
          </p>
        </div>
      </Card>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 space-y-1">
            <p className="font-semibold">Status Implementasi Push Notification (F13)</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li>✅ Service worker (<code className="font-mono">/sw.js</code>) sudah handle push events</li>
              <li>✅ Endpoint <code className="font-mono">POST /api/push/send</code> dan <code className="font-mono">/api/push/send-to-all</code> aktif</li>
              <li>✅ Tabel <code className="font-mono">push_subscriptions</code> sudah ada (jalankan migration)</li>
              <li>⚡ Set <strong>VAPID_PUBLIC_KEY</strong> dan <strong>VAPID_PRIVATE_KEY</strong> di Replit Secrets agar push aktif permanen</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
