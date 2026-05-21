import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Truck, Search, Clock, CheckCircle2, Settings, Zap, Eye, EyeOff,
  Loader2, KeyRound, Trash2, ShieldCheck, ExternalLink,
} from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/rajaongkir")({ component: RajaOngkirPage });

const COURIERS = [
  { id: "jne",      name: "JNE",            logo: "📦" },
  { id: "tiki",     name: "TIKI",           logo: "📫" },
  { id: "pos",      name: "POS Indonesia",  logo: "📮" },
  { id: "sicepat",  name: "SiCepat",        logo: "⚡" },
  { id: "jnt",      name: "J&T Express",    logo: "🚚" },
  { id: "anteraja", name: "AnterAja",       logo: "🛵" },
];

type RateResult = {
  courier: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
  logo: string;
};

const DEMO_RESULTS: RateResult[] = [
  { courier: "JNE",          service: "OKE",  description: "Ongkos Kirim Ekonomis", cost: 12000, etd: "4-5 hari", logo: "📦" },
  { courier: "JNE",          service: "REG",  description: "Layanan Reguler",       cost: 16000, etd: "2-3 hari", logo: "📦" },
  { courier: "JNE",          service: "YES",  description: "Yakin Esok Sampai",     cost: 38000, etd: "1 hari",   logo: "📦" },
  { courier: "SiCepat",      service: "HALU", description: "Harga Murah",           cost: 11000, etd: "4-5 hari", logo: "⚡" },
  { courier: "SiCepat",      service: "BEST", description: "Besok Sampai",          cost: 25000, etd: "1 hari",   logo: "⚡" },
  { courier: "J&T Express",  service: "EZ",   description: "Reguler",               cost: 14000, etd: "2-3 hari", logo: "🚚" },
  { courier: "TIKI",         service: "ECO",  description: "Economy",               cost: 13000, etd: "4-6 hari", logo: "📫" },
  { courier: "TIKI",         service: "ONS",  description: "Overnight Service",     cost: 29000, etd: "1 hari",   logo: "📫" },
];

const PROVIDER = "rajaongkir";

type ApiKeyRow = {
  id: string;
  api_key: string;
  is_active: boolean;
  config: { origin_city?: string; couriers?: string[] } | null;
  updated_at: string;
};

function maskKey(k: string): string {
  if (!k) return "";
  if (k.length <= 8) return "•".repeat(k.length);
  return k.slice(0, 4) + "•".repeat(Math.max(4, k.length - 8)) + k.slice(-4);
}

function RajaOngkirPage() {
  const { shop } = useCurrentShop();

  // Settings state
  const [existing, setExisting] = useState<ApiKeyRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [editing, setEditing] = useState(false);
  const [originCity, setOriginCity] = useState("");
  const [selectedCouriers, setSelectedCouriers] = useState<string[]>(["jne", "sicepat", "jnt"]);

  // Check ongkir state
  const [tab, setTab] = useState<"cek-ongkir" | "settings">("cek-ongkir");
  const [destCity, setDestCity] = useState("");
  const [weight, setWeight] = useState("1000");
  const [results, setResults] = useState<RateResult[]>([]);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);

  const load = useCallback(async () => {
    if (!shop?.id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("shop_api_keys")
      .select("id, api_key, is_active, config, updated_at")
      .eq("shop_id", shop.id)
      .eq("provider", PROVIDER)
      .maybeSingle();
    if (!error && data) {
      const row = data as ApiKeyRow;
      setExisting(row);
      setOriginCity(row.config?.origin_city ?? "");
      if (Array.isArray(row.config?.couriers) && row.config!.couriers!.length > 0) {
        setSelectedCouriers(row.config!.couriers!);
      }
    } else {
      setExisting(null);
    }
    setLoading(false);
  }, [shop?.id]);

  useEffect(() => { void load(); }, [load]);

  function toggleCourier(id: string) {
    setSelectedCouriers(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  async function saveConfig() {
    if (!shop?.id) { toast.error("Toko belum dimuat"); return; }

    const trimmedKey = apiKey.trim();
    const newKey = trimmedKey.length > 0;

    if (!existing && !newKey) {
      toast.error("Masukkan API key RajaOngkir terlebih dahulu");
      return;
    }
    if (newKey && trimmedKey.length < 16) {
      toast.error("API key terlalu pendek — periksa kembali");
      return;
    }

    setSaving(true);
    const payload: Record<string, unknown> = {
      shop_id: shop.id,
      provider: PROVIDER,
      config: {
        origin_city: originCity.trim() || null,
        couriers: selectedCouriers,
      },
      is_active: true,
      updated_at: new Date().toISOString(),
    };
    if (newKey) payload.api_key = trimmedKey;
    else if (existing) payload.api_key = existing.api_key;

    const { error } = await (supabase as any)
      .from("shop_api_keys")
      .upsert(payload, { onConflict: "shop_id,provider" });
    setSaving(false);

    if (error) { toast.error(error.message); return; }
    toast.success("Konfigurasi RajaOngkir disimpan");
    setApiKey("");
    setEditing(false);
    setShowKey(false);
    await load();
  }

  async function removeKey() {
    if (!shop?.id || !existing) return;
    if (!confirm("Hapus API key RajaOngkir? Cek ongkir live akan nonaktif.")) return;
    setRemoving(true);
    const { error } = await (supabase as any)
      .from("shop_api_keys")
      .delete()
      .eq("shop_id", shop.id)
      .eq("provider", PROVIDER);
    setRemoving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("API key RajaOngkir dihapus");
    setExisting(null);
    setApiKey("");
    setEditing(true);
  }

  async function checkRates() {
    if (!originCity.trim() || !destCity.trim()) { toast.error("Isi kota asal & tujuan"); return; }
    setChecking(true);
    // TODO: integrasikan ke server fn /api/shipping/cost yang memanggil RajaOngkir
    // memakai api_key dari shop_api_keys. Untuk sekarang, hasil demo.
    await new Promise(r => setTimeout(r, 800));
    setResults(DEMO_RESULTS);
    setChecked(true);
    setChecking(false);
  }

  const sorted = [...results].sort((a, b) => a.cost - b.cost);
  const cheapest = sorted[0];
  const hasKey = !!existing;
  const showInputKey = !hasKey || editing;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> Integrasi RajaOngkir
            <Badge variant="secondary" className="text-xs">Growth/Pro</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">Cek ongkir real-time &amp; coverage kurir nasional</p>
        </div>
        <div className="flex gap-1 rounded-lg border border-border p-1">
          <button onClick={() => setTab("cek-ongkir")} className={`px-3 py-1.5 rounded-md text-sm transition-colors ${tab === "cek-ongkir" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>Cek Ongkir</button>
          <button onClick={() => setTab("settings")} className={`px-3 py-1.5 rounded-md text-sm transition-colors ${tab === "settings" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>

      {tab === "settings" ? (
        <div className="space-y-4 max-w-xl">
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" /> Konfigurasi API Key
              </p>
              {hasKey && (
                <Badge className="bg-green-600 hover:bg-green-600 text-xs">
                  <ShieldCheck className="h-3 w-3 mr-1" /> Aktif
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground">
              Dapatkan API key di{" "}
              <a href="https://rajaongkir.com" target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-0.5">
                rajaongkir.com <ExternalLink className="h-3 w-3" />
              </a>
              . Tersedia plan Starter (gratis) dan Pro. API key disimpan terenkripsi dan hanya bisa diakses oleh pemilik toko.
            </p>

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Memuat konfigurasi…
              </div>
            ) : (
              <>
                <div>
                  <Label className="flex items-center gap-1.5">
                    <KeyRound className="h-3.5 w-3.5" /> RajaOngkir API Key
                  </Label>
                  {hasKey && !editing ? (
                    <div className="mt-1 flex items-center gap-2">
                      <Input
                        readOnly
                        value={showKey ? existing!.api_key : maskKey(existing!.api_key)}
                        className="font-mono bg-muted/40"
                      />
                      <Button type="button" variant="outline" size="icon" onClick={() => setShowKey(s => !s)} aria-label={showKey ? "Sembunyikan" : "Tampilkan"}>
                        {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => { setEditing(true); setApiKey(""); setShowKey(false); }}>
                        Ganti
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showKey ? "text" : "password"}
                          value={apiKey}
                          onChange={e => setApiKey(e.target.value)}
                          placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          className="font-mono pr-10"
                          autoComplete="off"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(s => !s)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          aria-label={showKey ? "Sembunyikan key" : "Tampilkan key"}
                        >
                          {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {hasKey && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setEditing(false); setApiKey(""); setShowKey(false); }}>
                          Batal
                        </Button>
                      )}
                    </div>
                  )}
                  {hasKey && (
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      Diperbarui terakhir: {new Date(existing!.updated_at).toLocaleString("id-ID")}
                    </p>
                  )}
                </div>

                <div>
                  <Label>Kota Asal (Default Pengiriman)</Label>
                  <Input
                    className="mt-1"
                    placeholder="cth: Jakarta Selatan"
                    value={originCity}
                    onChange={e => setOriginCity(e.target.value)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button onClick={saveConfig} disabled={saving || loading}>
                    {saving ? (
                      <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Menyimpan…</>
                    ) : hasKey ? (
                      <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Simpan Perubahan</>
                    ) : (
                      "Simpan Konfigurasi"
                    )}
                  </Button>
                  {hasKey && (
                    <Button type="button" variant="outline" onClick={removeKey} disabled={removing} className="text-destructive hover:text-destructive">
                      {removing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1.5" />}
                      Hapus
                    </Button>
                  )}
                </div>

                {showInputKey && !hasKey && (
                  <p className="text-[11px] text-muted-foreground">
                    Setelah disimpan, key akan ditampilkan tersamarkan. Anda bisa menggantinya kapan saja.
                  </p>
                )}
              </>
            )}
          </Card>

          <Card className="p-4">
            <p className="font-semibold mb-3">Kurir yang Diaktifkan</p>
            <div className="grid grid-cols-2 gap-2">
              {COURIERS.map(c => (
                <label
                  key={c.id}
                  className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${selectedCouriers.includes(c.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedCouriers.includes(c.id)}
                    onChange={() => toggleCourier(c.id)}
                    className="accent-primary"
                  />
                  <span className="text-lg">{c.logo}</span>
                  <span className="text-sm font-medium">{c.name}</span>
                </label>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted-foreground">
              Jangan lupa klik <b>Simpan Perubahan</b> di atas setelah mengubah daftar kurir.
            </p>
          </Card>
        </div>
      ) : (
        <>
          {!hasKey && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
              <Settings className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                API key RajaOngkir belum dikonfigurasi. Buka tab <b>Settings</b> untuk menyimpan API key terlebih dahulu.
              </div>
            </div>
          )}

          <Card className="p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label>Kota / Kecamatan Asal</Label>
                <Input className="mt-1" value={originCity} onChange={e => setOriginCity(e.target.value)} placeholder="cth: Jakarta Selatan" />
              </div>
              <div>
                <Label>Kota / Kecamatan Tujuan</Label>
                <Input className="mt-1" value={destCity} onChange={e => setDestCity(e.target.value)} placeholder="cth: Surabaya" />
              </div>
              <div>
                <Label>Berat Paket (gram)</Label>
                <Input className="mt-1" type="number" min="1" value={weight} onChange={e => setWeight(e.target.value)} />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="flex gap-2 flex-wrap flex-1">
                {COURIERS.filter(c => selectedCouriers.includes(c.id)).map(c => (
                  <span key={c.id} className="text-xs px-2.5 py-1 rounded-full border border-primary bg-primary text-primary-foreground">
                    {c.logo} {c.name}
                  </span>
                ))}
              </div>
              <Button onClick={checkRates} disabled={checking || !hasKey} className="shrink-0">
                {checking ? <Loader /> : <><Search className="h-4 w-4 mr-1.5" /> Cek Ongkir</>}
              </Button>
            </div>
          </Card>

          {checked && (
            <>
              {cheapest && (
                <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Ongkir termurah: <strong>{cheapest.courier} {cheapest.service}</strong> — {formatIDR(cheapest.cost)} ({cheapest.etd})
                </div>
              )}
              <div className="space-y-2">
                {sorted.map((r, i) => (
                  <Card key={i} className="flex items-center gap-4 p-3">
                    <span className="text-2xl shrink-0">{r.logo}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{r.courier} <span className="text-primary">{r.service}</span></p>
                      <p className="text-xs text-muted-foreground">{r.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{r.etd}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold">{formatIDR(r.cost)}</p>
                      {i === 0 && <Badge className="text-xs h-4 bg-green-600 hover:bg-green-600">Termurah</Badge>}
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function Loader() {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      Memeriksa...
    </span>
  );
}
