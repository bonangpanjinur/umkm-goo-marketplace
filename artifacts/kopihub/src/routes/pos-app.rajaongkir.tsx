import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Truck, Search, Package, Clock, AlertCircle, CheckCircle2, Settings, Zap } from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/rajaongkir")({ component: RajaOngkirPage });

const COURIERS = [
  { id: "jne", name: "JNE", logo: "📦" },
  { id: "tiki", name: "TIKI", logo: "📫" },
  { id: "pos", name: "POS Indonesia", logo: "📮" },
  { id: "sicepat", name: "SiCepat", logo: "⚡" },
  { id: "jnt", name: "J&T Express", logo: "🚚" },
  { id: "anteraja", name: "AnterAja", logo: "🛵" },
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
  { courier: "JNE", service: "OKE", description: "Ongkos Kirim Ekonomis", cost: 12000, etd: "4-5 hari", logo: "📦" },
  { courier: "JNE", service: "REG", description: "Layanan Reguler", cost: 16000, etd: "2-3 hari", logo: "📦" },
  { courier: "JNE", service: "YES", description: "Yakin Esok Sampai", cost: 38000, etd: "1 hari", logo: "📦" },
  { courier: "SiCepat", service: "HALU", description: "Harga Murah", cost: 11000, etd: "4-5 hari", logo: "⚡" },
  { courier: "SiCepat", service: "BEST", description: "Besok Sampai", cost: 25000, etd: "1 hari", logo: "⚡" },
  { courier: "J&T Express", service: "EZ", description: "Reguler", cost: 14000, etd: "2-3 hari", logo: "🚚" },
  { courier: "TIKI", service: "ECO", description: "Economy", cost: 13000, etd: "4-6 hari", logo: "📫" },
  { courier: "TIKI", service: "ONS", description: "Overnight Service", cost: 29000, etd: "1 hari", logo: "📫" },
];

export default function RajaOngkirPage() {
  const [apiKey, setApiKey] = useState("");
  const [apiKeySet, setApiKeySet] = useState(false);
  const [originCity, setOriginCity] = useState("");
  const [destCity, setDestCity] = useState("");
  const [weight, setWeight] = useState("1000");
  const [selectedCouriers, setSelectedCouriers] = useState<string[]>(["jne", "sicepat", "jnt"]);
  const [results, setResults] = useState<RateResult[]>([]);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [tab, setTab] = useState<"cek-ongkir" | "settings">("cek-ongkir");

  function toggleCourier(id: string) {
    setSelectedCouriers(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }

  async function checkRates() {
    if (!originCity.trim() || !destCity.trim()) { toast.error("Isi kota asal & tujuan"); return; }
    setChecking(true);
    await new Promise(r => setTimeout(r, 1000));
    const filtered = DEMO_RESULTS.filter(r =>
      selectedCouriers.some(c => r.courier.toLowerCase().includes(c.replace(/-/g, "").replace("&", "and").substring(0,3)))
      || selectedCouriers.length === 0
    );
    setResults(DEMO_RESULTS);
    setChecked(true);
    setChecking(false);
  }

  function saveApiKey() {
    if (!apiKey.trim()) { toast.error("Masukkan API key RajaOngkir"); return; }
    setApiKeySet(true);
    toast.success("API key RajaOngkir disimpan");
  }

  const sorted = [...results].sort((a, b) => a.cost - b.cost);
  const cheapest = sorted[0];

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" /> Integrasi RajaOngkir
            <Badge variant="secondary" className="text-xs">Growth/Pro</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">Cek ongkir real-time & coverage kurir nasional</p>
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
          <Card className="p-4 space-y-3">
            <p className="font-semibold flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" /> Konfigurasi API Key
            </p>
            <p className="text-xs text-muted-foreground">
              Dapatkan API key di <a href="https://rajaongkir.com" target="_blank" rel="noreferrer" className="text-primary underline">rajaongkir.com</a>.
              Tersedia plan Starter (gratis) dan Pro.
            </p>
            <div>
              <Label>RajaOngkir API Key</Label>
              <Input
                className="mt-1 font-mono"
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              />
            </div>
            <div>
              <Label>Kota Asal (Default Pengiriman)</Label>
              <Input className="mt-1" placeholder="cth: Jakarta" />
            </div>
            <Button onClick={saveApiKey}>
              {apiKeySet ? <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Tersimpan</> : "Simpan Konfigurasi"}
            </Button>
          </Card>

          <Card className="p-4">
            <p className="font-semibold mb-3">Kurir yang Diaktifkan</p>
            <div className="grid grid-cols-2 gap-2">
              {COURIERS.map(c => (
                <label key={c.id} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${selectedCouriers.includes(c.id) ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                  <input type="checkbox" checked={selectedCouriers.includes(c.id)} onChange={() => toggleCourier(c.id)} className="accent-primary" />
                  <span className="text-lg">{c.logo}</span>
                  <span className="text-sm font-medium">{c.name}</span>
                </label>
              ))}
            </div>
          </Card>
        </div>
      ) : (
        <>
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
                {COURIERS.map(c => (
                  <button
                    key={c.id}
                    onClick={() => toggleCourier(c.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${selectedCouriers.includes(c.id) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/40"}`}
                  >
                    {c.logo} {c.name}
                  </button>
                ))}
              </div>
              <Button onClick={checkRates} disabled={checking} className="shrink-0">
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
