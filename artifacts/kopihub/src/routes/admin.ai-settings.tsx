import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Sparkles, CheckCircle2, XCircle, Save, ExternalLink, Info } from "lucide-react";

export const Route = createFileRoute("/admin/ai-settings")({ component: AdminAISettings });

type AISettings = {
  gemini_api_key: string;
  enabled: boolean;
};

const DEFAULTS: AISettings = { gemini_api_key: "", enabled: false };

function SecretInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="AIzaSy..."
        className="pr-10 font-mono text-sm"
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function AdminAISettings() {
  const [cfg, setCfg] = useState<AISettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);

  useEffect(() => {
    supabase
      .from("platform_settings" as any)
      .select("value")
      .eq("key", "ai_settings")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const raw = (data as any).value;
          const val = typeof raw === "string" ? JSON.parse(raw) : raw;
          setCfg({ ...DEFAULTS, ...val });
        }
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings" as any)
      .upsert({ key: "ai_settings", value: cfg as any }, { onConflict: "key" });
    if (error) toast.error(error.message);
    else toast.success("Pengaturan AI berhasil disimpan");
    setSaving(false);
  };

  const testKey = async () => {
    if (!cfg.gemini_api_key.trim()) {
      toast.error("Masukkan API key terlebih dahulu");
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${cfg.gemini_api_key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Halo, tes koneksi." }] }],
            generationConfig: { maxOutputTokens: 8 },
          }),
        },
      );
      if (res.ok) {
        setTestResult("ok");
        toast.success("API key valid! Gemini berhasil terhubung.");
      } else {
        const body = await res.json().catch(() => ({})) as Record<string, unknown>;
        setTestResult("fail");
        const msg = (body as any)?.error?.message ?? `HTTP ${res.status}`;
        toast.error(`API key ditolak: ${msg}`);
      }
    } catch {
      setTestResult("fail");
      toast.error("Tidak dapat menghubungi Gemini. Periksa koneksi internet.");
    }
    setTesting(false);
  };

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Pengaturan AI</h1>
            <p className="text-sm text-muted-foreground">Google Gemini · AI Generator Deskripsi Produk</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Aktifkan Fitur AI untuk Merchant</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                Tampilkan tombol "✨ Buat dengan AI" di form tambah/edit produk semua merchant.
              </div>
            </div>
            <Switch
              checked={cfg.enabled}
              onCheckedChange={(v) => setCfg((c) => ({ ...c, enabled: v }))}
            />
          </div>
        </Card>

        <Card className="p-5 space-y-5">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-sm font-semibold">Google Gemini API Key</Label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Dapatkan kunci gratis <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <SecretInput
              value={cfg.gemini_api_key}
              onChange={(v) => {
                setCfg((c) => ({ ...c, gemini_api_key: v }));
                setTestResult(null);
              }}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              Gemini 1.5 Flash — <strong>gratis</strong>: 15 request/menit · 1 juta token/hari · 1.500 request/hari
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={testKey}
              disabled={testing || !cfg.gemini_api_key.trim()}
            >
              {testing && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
              Uji Koneksi
            </Button>
            {testResult === "ok" && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Terhubung — API key valid
              </span>
            )}
            {testResult === "fail" && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                <XCircle className="h-3.5 w-3.5" />
                Gagal — periksa API key
              </span>
            )}
          </div>
        </Card>

        <Card className="p-4 bg-muted/40 border-dashed">
          <div className="flex gap-2.5">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p className="font-semibold text-foreground">Cara mendapatkan Gemini API Key (gratis):</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>
                  Buka{" "}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    aistudio.google.com/app/apikey
                  </a>
                </li>
                <li>Login dengan akun Google</li>
                <li>Klik <strong>"Create API key"</strong> → pilih atau buat project</li>
                <li>Salin key (dimulai dengan <code className="bg-muted px-1 rounded">AIza</code>)</li>
                <li>Tempel di kolom di atas → Uji Koneksi → Simpan</li>
              </ol>
              <p className="pt-1">
                <strong>Fitur:</strong> Merchant upload foto produk atau ketik nama produk → AI otomatis hasilkan
                deskripsi menarik + tag SEO siap pakai di form tambah/edit menu.
              </p>
            </div>
          </div>
        </Card>

        <div className="flex justify-end pt-1">
          <Button onClick={save} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Simpan Pengaturan
          </Button>
        </div>
      </div>
    </div>
  );
}
