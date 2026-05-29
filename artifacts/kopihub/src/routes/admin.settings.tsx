import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Play, RefreshCw, Eye, EyeOff, Plus, Trash2, Star } from "lucide-react";

export const Route = createFileRoute("/admin/settings")({ component: AdminSettings });

type Settings = {
  bank_name: string | null;
  account_no: string | null;
  account_name: string | null;
  instructions: string | null;
  qris_image_url: string | null;
  cron_secret: string | null;
};

type TopupPreset = {
  id: string;
  amount: number;
  label: string | null;
  is_popular: boolean;
  sort_order: number;
};

function AdminSettings() {
  const [s, setS] = useState<Settings>({ bank_name: "", account_no: "", account_name: "", instructions: "", qris_image_url: "", cron_secret: "" });
  const [showSecret, setShowSecret] = useState(false);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [presets, setPresets] = useState<TopupPreset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(true);
  const [savingPresets, setSavingPresets] = useState(false);
  const [newPresetAmount, setNewPresetAmount] = useState("");

  useEffect(() => {
    supabase.from("billing_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => { if (data) setS(data as Settings); });
    loadPresets();
  }, []);

  const loadPresets = async () => {
    setLoadingPresets(true);
    const { data } = await (supabase as any)
      .from("wallet_topup_presets")
      .select("id, amount, label, is_popular, sort_order")
      .order("sort_order", { ascending: true });
    setPresets((data ?? []) as TopupPreset[]);
    setLoadingPresets(false);
  };

  const save = async () => {
    const { error } = await supabase.from("billing_settings").update({ ...s, updated_at: new Date().toISOString() }).eq("id", 1);
    if (error) toast.error(error.message); else toast.success("Tersimpan");
  };

  const generateSecret = () => {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    setS({ ...s, cron_secret: "cron_" + hex });
    setShowSecret(true);
    toast.success("Secret baru dibuat. Klik Simpan untuk menerapkan.");
  };

  const runNow = async () => {
    setRunning(true);
    try {
      const { runPlanMaintenance } = await import("@/lib/api/admin.functions");
      const result = await runPlanMaintenance();
      setLastRun(JSON.stringify(result, null, 2));
      toast.success("Maintenance dijalankan");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setRunning(false);
    }
  };

  const addPreset = async () => {
    const amount = Number(newPresetAmount);
    if (!amount || amount < 1000) { toast.error("Jumlah minimal Rp 1.000"); return; }
    setSavingPresets(true);
    const { error } = await (supabase as any).from("wallet_topup_presets").insert({
      amount,
      label: `Rp ${amount.toLocaleString("id-ID")}`,
      is_popular: false,
      sort_order: presets.length + 1,
    });
    setSavingPresets(false);
    if (error) toast.error(error.message);
    else { toast.success("Preset ditambahkan"); setNewPresetAmount(""); loadPresets(); }
  };

  const deletePreset = async (id: string) => {
    const { error } = await (supabase as any).from("wallet_topup_presets").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Preset dihapus"); loadPresets(); }
  };

  const togglePopular = async (preset: TopupPreset) => {
    await (supabase as any).from("wallet_topup_presets").update({ is_popular: !preset.is_popular }).eq("id", preset.id);
    setPresets(p => p.map(x => x.id === preset.id ? { ...x, is_popular: !x.is_popular } : x));
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-4">Pengaturan Platform</h1>
      </div>

      {/* Billing settings */}
      <div>
        <h2 className="text-lg font-bold mb-2">Rekening Pembayaran</h2>
        <Card className="p-5 space-y-3">
          <div><Label>Nama Bank</Label><Input value={s.bank_name ?? ""} onChange={(e) => setS({ ...s, bank_name: e.target.value })} /></div>
          <div><Label>No. Rekening</Label><Input value={s.account_no ?? ""} onChange={(e) => setS({ ...s, account_no: e.target.value })} /></div>
          <div><Label>Atas Nama</Label><Input value={s.account_name ?? ""} onChange={(e) => setS({ ...s, account_name: e.target.value })} /></div>
          <div><Label>URL QRIS (opsional)</Label><Input value={s.qris_image_url ?? ""} onChange={(e) => setS({ ...s, qris_image_url: e.target.value })} /></div>
          <div><Label>Instruksi Pembayaran</Label><Textarea rows={4} value={s.instructions ?? ""} onChange={(e) => setS({ ...s, instructions: e.target.value })} /></div>
        </Card>
      </div>

      {/* Wallet Topup Presets (F9-6) */}
      <div>
        <h2 className="text-lg font-bold mb-2">Preset Topup Saldo Merchant</h2>
        <Card className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">Nominal topup yang ditampilkan ke merchant saat isi saldo dompet.</p>

          {loadingPresets ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat preset...
            </div>
          ) : (
            <div className="space-y-2">
              {presets.map(preset => (
                <div key={preset.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                  <span className="font-semibold text-sm flex-1">
                    Rp {preset.amount.toLocaleString("id-ID")}
                  </span>
                  <button
                    onClick={() => togglePopular(preset)}
                    className={`p-1 rounded-full transition-colors ${preset.is_popular ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground hover:text-amber-500"}`}
                    title={preset.is_popular ? "Hapus label populer" : "Tandai populer"}
                  >
                    <Star className="h-4 w-4" fill={preset.is_popular ? "currentColor" : "none"} />
                  </button>
                  {preset.is_popular && (
                    <Badge className="bg-amber-100 text-amber-700 text-xs">Populer</Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-red-500"
                    onClick={() => deletePreset(preset.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {presets.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-3">Belum ada preset topup</p>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1 border-t border-border">
            <div className="flex-1">
              <Input
                type="number"
                placeholder="Jumlah (Rp)"
                value={newPresetAmount}
                onChange={e => setNewPresetAmount(e.target.value)}
                min={1000}
                step={1000}
              />
            </div>
            <Button onClick={addPreset} disabled={savingPresets} variant="outline">
              {savingPresets ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Tambah
            </Button>
          </div>
        </Card>
      </div>

      {/* Cron Secret & Maintenance */}
      <div>
        <h2 className="text-lg font-bold mb-2">Cron Secret &amp; Maintenance</h2>
        <Card className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Secret ini melindungi endpoint <code className="rounded bg-muted px-1">/api/public/cron/plan-maintenance</code>.
            Gunakan di pg_cron atau scheduler eksternal sebagai header <code className="rounded bg-muted px-1">x-cron-secret</code>.
          </p>
          <div>
            <Label>Cron Secret</Label>
            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={s.cron_secret ?? ""}
                  onChange={(e) => setS({ ...s, cron_secret: e.target.value })}
                  placeholder="Belum diatur"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button type="button" variant="outline" onClick={generateSecret}>
                <RefreshCw className="h-4 w-4 mr-1" /> Generate
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Setelah diubah, klik <b>Simpan</b> di bawah lalu update header pada cron job Anda.
            </p>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-medium">Jalankan Maintenance Sekarang</div>
                <div className="text-xs text-muted-foreground">Downgrade plan kadaluarsa, recheck DNS, expire tagihan basi.</div>
              </div>
              <Button onClick={runNow} disabled={running || !s.cron_secret}>
                {running ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                Jalankan
              </Button>
            </div>
            {lastRun && (
              <pre className="mt-3 max-h-48 overflow-auto rounded bg-muted p-3 text-[11px]">{lastRun}</pre>
            )}
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={save} size="lg">Simpan Semua</Button>
      </div>
    </div>
  );
}
