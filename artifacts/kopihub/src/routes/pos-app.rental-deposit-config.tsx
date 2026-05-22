import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import { Banknote, Loader2, RefreshCw, Save, Car, Calculator, Percent, AlertTriangle, CheckCircle2, Info } from "lucide-react";

export const Route = createFileRoute("/pos-app/rental-deposit-config")({
  head: () => ({ meta: [{ title: "Konfigurasi Deposit Rental" }] }),
  component: RentalDepositConfigPage,
});

type RentalUnit = {
  id: string;
  name: string;
  unit_code: string | null;
  category: string | null;
  daily_price: number | null;
  deposit_amount: number | null;
  deposit_pct: number | null;
  auto_deposit: boolean | null;
  is_active: boolean;
  condition: string;
};

function calcDeposit(unit: RentalUnit, days: number): number {
  if (!unit.auto_deposit || !unit.daily_price) return unit.deposit_amount ?? 0;
  const pct = unit.deposit_pct ?? 30;
  return Math.ceil((unit.daily_price * days * pct) / 100);
}

export default function RentalDepositConfigPage() {
  const { shop } = useCurrentShop();
  const [units, setUnits] = useState<RentalUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showSql, setShowSql] = useState(false);
  const [previewDays, setPreviewDays] = useState("3");

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("rental_units")
      .select("id, name, unit_code, category, daily_price, deposit_amount, deposit_pct, auto_deposit, is_active, condition")
      .eq("shop_id", shopId)
      .order("name");
    if (error) {
      if (error.message?.includes("column") || error.message?.includes("does not exist")) {
        setShowSql(true);
      } else {
        toast.error("Gagal memuat unit rental");
      }
    }
    setUnits((data ?? []) as RentalUnit[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (shop?.id) load(shop.id);
  }, [shop?.id, load]);

  const save = async (unit: RentalUnit) => {
    setSaving(unit.id);
    try {
      const { error } = await (supabase as any)
        .from("rental_units")
        .update({
          deposit_amount: unit.deposit_amount,
          deposit_pct: unit.deposit_pct,
          auto_deposit: unit.auto_deposit,
        })
        .eq("id", unit.id);
      if (error) throw error;
      toast.success(`${unit.name} — konfigurasi deposit disimpan`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(null);
    }
  };

  const update = (id: string, field: keyof RentalUnit, value: unknown) => {
    setUnits(prev => prev.map(u => u.id === id ? { ...u, [field]: value } : u));
  };

  const days = Math.max(1, Number(previewDays) || 1);

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Banknote className="h-5 w-5 text-primary" />
            Konfigurasi Deposit Rental
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Atur deposit otomatis per unit — sistem akan hitung otomatis saat pembeli memesan.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(shop.id)} className="gap-1.5">
          <RefreshCw className="h-3.5 w-3.5" /> Muat Ulang
        </Button>
      </div>

      {showSql && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
            <AlertTriangle className="h-4 w-4" /> Kolom deposit belum ada
          </p>
          <p className="text-xs text-amber-700">Jalankan SQL berikut di Supabase SQL Editor:</p>
          <pre className="rounded bg-amber-100 p-2 text-xs font-mono overflow-x-auto">{SQL_HINT}</pre>
        </div>
      )}

      {/* Preview calculator */}
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-center gap-3 mb-3">
          <Calculator className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">Preview Kalkulasi Deposit</span>
          <div className="flex items-center gap-2 ml-auto">
            <Label className="text-xs text-muted-foreground">Durasi sewa</Label>
            <Input
              type="number"
              min={1}
              className="w-16 h-7 text-sm text-center"
              value={previewDays}
              onChange={e => setPreviewDays(e.target.value)}
            />
            <span className="text-xs text-muted-foreground">hari</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Kolom "Deposit Perkiraan" di bawah menunjukkan deposit yang akan dihitung otomatis untuk durasi {days} hari.
        </p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : units.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-muted-foreground">
          <Car className="mx-auto h-8 w-8 opacity-30 mb-2" />
          <p className="text-sm">Belum ada unit rental. Tambah unit di halaman Ketersediaan Unit.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {units.map(unit => {
            const estimated = calcDeposit(unit, days);
            return (
              <div key={unit.id} className="rounded-xl border border-border bg-card p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{unit.name}</span>
                      {unit.unit_code && <Badge variant="secondary" className="text-xs">{unit.unit_code}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Harga/hari: {unit.daily_price ? formatIDR(unit.daily_price) : "—"}
                      {unit.category && ` · ${unit.category}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Deposit perkiraan ({days} hari)</p>
                    <p className="text-lg font-bold text-primary">{formatIDR(estimated)}</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Mode toggle */}
                  <div className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div>
                      <p className="text-sm font-medium">Deposit Otomatis</p>
                      <p className="text-xs text-muted-foreground">Hitung otomatis: harga × hari × %</p>
                    </div>
                    <Switch
                      checked={!!unit.auto_deposit}
                      onCheckedChange={v => update(unit.id, "auto_deposit", v)}
                    />
                  </div>

                  {unit.auto_deposit ? (
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <Percent className="h-3 w-3" /> Persentase Deposit (%)
                      </Label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={unit.deposit_pct ?? 30}
                        onChange={e => update(unit.id, "deposit_pct", Number(e.target.value))}
                        placeholder="30"
                      />
                      <p className="text-xs text-muted-foreground">
                        {formatIDR(unit.daily_price ?? 0)} × {days} hari × {unit.deposit_pct ?? 30}% = {formatIDR(estimated)}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="text-xs flex items-center gap-1">
                        <Banknote className="h-3 w-3" /> Deposit Tetap (Rp)
                      </Label>
                      <Input
                        type="number"
                        min={0}
                        value={unit.deposit_amount ?? ""}
                        onChange={e => update(unit.id, "deposit_amount", Number(e.target.value))}
                        placeholder="500000"
                      />
                      <p className="text-xs text-muted-foreground">Nominal tetap berapapun durasi sewa.</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-1.5 border border-green-200">
                    <CheckCircle2 className="h-3 w-3" />
                    {unit.auto_deposit
                      ? `Auto: ${unit.deposit_pct ?? 30}% × durasi`
                      : `Tetap: ${formatIDR(unit.deposit_amount ?? 0)}`
                    }
                  </div>
                  <Button
                    size="sm"
                    onClick={() => save(unit)}
                    disabled={saving === unit.id}
                    className="gap-1.5"
                  >
                    {saving === unit.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Save className="h-3.5 w-3.5" />
                    }
                    Simpan
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-lg bg-muted/30 border border-border p-4 text-xs text-muted-foreground flex gap-2">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-blue-500" />
        <span>
          Deposit yang dikonfigurasi di sini akan ditampilkan otomatis di halaman booking pelanggan saat mereka memilih unit dan rentang tanggal. Mode "Otomatis" menghitung berdasarkan durasi sewa, mode "Tetap" selalu tagih nominal yang sama.
        </span>
      </div>
    </div>
  );
}
