import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Percent, Save, Info } from "lucide-react";

export const Route = createFileRoute("/admin/commission")({
  component: AdminCommission,
});

type CategoryRate = {
  id: string;
  label: string;
  rate: number;
  min_fee: number;
  max_fee: number | null;
};

type CommissionConfig = {
  enabled: boolean;
  default_rate: number;
  free_plan_rate: number;
  pro_plan_rate: number;
  min_order_value: number;
  apply_to_marketplace_only: boolean;
  category_overrides: CategoryRate[];
};

const DEFAULT_CATEGORIES: CategoryRate[] = [
  { id: "fnb",         label: "F&B / Kuliner",        rate: 3,   min_fee: 500,   max_fee: 50000 },
  { id: "fashion",     label: "Fashion & Pakaian",     rate: 5,   min_fee: 1000,  max_fee: 100000 },
  { id: "digital",     label: "Produk Digital",        rate: 8,   min_fee: 2000,  max_fee: null },
  { id: "beauty",      label: "Kecantikan",            rate: 4,   min_fee: 500,   max_fee: 75000 },
  { id: "craft",       label: "Kerajinan Tangan",      rate: 4,   min_fee: 500,   max_fee: 50000 },
  { id: "electronics", label: "Elektronik & Gadget",   rate: 3,   min_fee: 2000,  max_fee: 200000 },
  { id: "general",     label: "Toko Umum",             rate: 4,   min_fee: 500,   max_fee: null },
];

const DEFAULTS: CommissionConfig = {
  enabled: true,
  default_rate: 4,
  free_plan_rate: 5,
  pro_plan_rate: 3,
  min_order_value: 10000,
  apply_to_marketplace_only: true,
  category_overrides: DEFAULT_CATEGORIES,
};

function NumInput({ label, value, onChange, suffix, min, max, note }:
  { label: string; value: number; onChange: (v: number) => void; suffix?: string; min?: number; max?: number; note?: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="relative mt-1.5">
        <Input type="number" min={min ?? 0} max={max} step={suffix === "%" ? 0.1 : 100}
          value={value} onChange={e => onChange(Number(e.target.value))}
          className={suffix ? "pr-10" : ""} />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{suffix}</span>}
      </div>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

function AdminCommission() {
  const [cfg, setCfg] = useState<CommissionConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("platform_settings" as any)
      .select("value")
      .eq("key", "commission_config")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          const v = (data as any).value as CommissionConfig;
          setCfg({
            ...DEFAULTS,
            ...v,
            category_overrides: DEFAULT_CATEGORIES.map(def => {
              const saved = v.category_overrides?.find(c => c.id === def.id);
              return saved ? { ...def, ...saved } : def;
            }),
          });
        }
        setLoading(false);
      });
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings" as any)
      .upsert({ key: "commission_config", value: cfg, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) toast.error(error.message);
    else toast.success("Konfigurasi komisi tersimpan");
    setSaving(false);
  };

  const set = (patch: Partial<CommissionConfig>) => setCfg(c => ({ ...c, ...patch }));

  const updateCat = (id: string, patch: Partial<CategoryRate>) => {
    setCfg(c => ({
      ...c,
      category_overrides: c.category_overrides.map(cat => cat.id === id ? { ...cat, ...patch } : cat),
    }));
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Konfigurasi Komisi</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Atur tarif komisi yang dipotong dari setiap transaksi marketplace.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="shrink-0 gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan
        </Button>
      </div>

      {/* Global switch */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Aktifkan pemotongan komisi</p>
            <p className="text-xs text-muted-foreground mt-0.5">Jika dimatikan, tidak ada komisi yang dipotong dari transaksi manapun</p>
          </div>
          <Switch checked={cfg.enabled} onCheckedChange={v => set({ enabled: v })} />
        </div>
        {!cfg.enabled && (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <Info className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700">Komisi nonaktif — platform tidak memotong fee dari transaksi</p>
          </div>
        )}
      </Card>

      {cfg.enabled && (
        <>
          {/* Global rates */}
          <Card className="p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tarif Global</p>
            <div className="grid grid-cols-3 gap-4">
              <NumInput label="Tarif Default" value={cfg.default_rate} onChange={v => set({ default_rate: v })} suffix="%" max={50} />
              <NumInput label="Tarif Free Plan" value={cfg.free_plan_rate} onChange={v => set({ free_plan_rate: v })} suffix="%" max={50} />
              <NumInput label="Tarif Pro Plan" value={cfg.pro_plan_rate} onChange={v => set({ pro_plan_rate: v })} suffix="%" max={50} />
            </div>
            <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
              <NumInput label="Min. nilai pesanan (Rp)" value={cfg.min_order_value} onChange={v => set({ min_order_value: v })} suffix="Rp" note="Di bawah ini tidak dikenakan komisi" />
              <div className="flex items-center gap-3 rounded-lg border border-border p-3 self-end">
                <Switch checked={cfg.apply_to_marketplace_only} onCheckedChange={v => set({ apply_to_marketplace_only: v })} />
                <div>
                  <p className="text-sm font-medium">Marketplace saja</p>
                  <p className="text-xs text-muted-foreground">POS & kasir langsung bebas komisi</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Category overrides */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Percent className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Tarif per Kategori Bisnis</p>
              <span className="ml-auto text-xs text-muted-foreground">Override tarif global untuk kategori tertentu</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="pb-2 text-left font-medium">Kategori</th>
                    <th className="pb-2 text-right font-medium px-3">Rate (%)</th>
                    <th className="pb-2 text-right font-medium px-3">Min Fee (Rp)</th>
                    <th className="pb-2 text-right font-medium">Max Fee (Rp)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {cfg.category_overrides.map(cat => (
                    <tr key={cat.id}>
                      <td className="py-2 pr-3">
                        <p className="font-medium">{cat.label}</p>
                      </td>
                      <td className="py-2 px-3">
                        <Input type="number" min={0} max={50} step={0.1}
                          value={cat.rate} onChange={e => updateCat(cat.id, { rate: Number(e.target.value) })}
                          className="w-20 text-right text-sm h-8 ml-auto" />
                      </td>
                      <td className="py-2 px-3">
                        <Input type="number" min={0} step={100}
                          value={cat.min_fee} onChange={e => updateCat(cat.id, { min_fee: Number(e.target.value) })}
                          className="w-28 text-right text-sm h-8 ml-auto" />
                      </td>
                      <td className="py-2">
                        <Input type="number" min={0} step={1000}
                          value={cat.max_fee ?? ""} onChange={e => updateCat(cat.id, { max_fee: e.target.value === "" ? null : Number(e.target.value) })}
                          placeholder="∞" className="w-28 text-right text-sm h-8 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">Max Fee kosong = tidak ada batas atas pemotongan komisi</p>
          </Card>
        </>
      )}
    </div>
  );
}
