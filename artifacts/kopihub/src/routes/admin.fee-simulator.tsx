import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Calculator, TrendingUp, Store, ShoppingCart, Percent, BarChart3 } from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/admin/fee-simulator")({
  head: () => ({ meta: [{ title: "Simulasi Biaya — Admin" }] }), component: FeeSimulator });

const PLANS = [
  { id: "free", label: "Gratis", commissionPct: 10, monthlyFee: 0 },
  { id: "starter", label: "Starter", commissionPct: 7, monthlyFee: 149000 },
  { id: "growth", label: "Growth", commissionPct: 5, monthlyFee: 349000 },
  { id: "pro", label: "Pro", commissionPct: 3, monthlyFee: 799000 },
];

const CATEGORIES = [
  { id: "fnb", label: "F&B / Makanan", overridePct: 0 },
  { id: "fashion", label: "Fashion", overridePct: 0 },
  { id: "digital", label: "Produk Digital", overridePct: 2 },
  { id: "beauty", label: "Kecantikan", overridePct: 1 },
  { id: "electronics", label: "Elektronik", overridePct: 0 },
  { id: "services", label: "Jasa", overridePct: -1 },
];

type SimResult = {
  gmv: number;
  commissionRevenue: number;
  subscriptionRevenue: number;
  totalRevenue: number;
  netAfterOps: number;
  avgOrderValue: number;
  ordersPerShop: number;
  totalOrders: number;
};

export default function FeeSimulator() {
  const [shopCount, setShopCount] = useState(100);
  const [avgOrderValue, setAvgOrderValue] = useState(150000);
  const [ordersPerShopPerMonth, setOrdersPerShopPerMonth] = useState(50);
  const [selectedPlan, setSelectedPlan] = useState("growth");
  const [selectedCategory, setSelectedCategory] = useState("fnb");
  const [customCommission, setCustomCommission] = useState<string>("");
  const [opsCostPct, setOpsCostPct] = useState(30);

  const plan = PLANS.find(p => p.id === selectedPlan)!;
  const category = CATEGORIES.find(c => c.id === selectedCategory)!;

  const effectiveCommission = customCommission !== ""
    ? parseFloat(customCommission) || 0
    : Math.max(0, plan.commissionPct + category.overridePct);

  function simulate(): SimResult {
    const totalOrders = shopCount * ordersPerShopPerMonth;
    const gmv = totalOrders * avgOrderValue;
    const commissionRevenue = gmv * (effectiveCommission / 100);
    const subscriptionRevenue = shopCount * plan.monthlyFee;
    const totalRevenue = commissionRevenue + subscriptionRevenue;
    const netAfterOps = totalRevenue * (1 - opsCostPct / 100);
    return {
      gmv,
      commissionRevenue,
      subscriptionRevenue,
      totalRevenue,
      netAfterOps,
      avgOrderValue,
      ordersPerShop: ordersPerShopPerMonth,
      totalOrders,
    };
  }

  const result = simulate();

  function Kpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
    return (
      <div className={`rounded-xl border p-4 ${color ?? ""}`}>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" /> Marketplace Fee Simulator
        </h1>
        <p className="text-sm text-muted-foreground">Proyeksikan pendapatan platform berdasarkan skenario toko dan transaksi</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Inputs */}
        <Card className="p-5 space-y-5">
          <h2 className="font-semibold text-sm flex items-center gap-2"><Store className="h-4 w-4" /> Skenario Toko</h2>

          <div className="space-y-1.5">
            <Label>Jumlah Toko Aktif</Label>
            <div className="flex items-center gap-3">
              <Slider
                min={10} max={10000} step={10}
                value={[shopCount]}
                onValueChange={([v]) => setShopCount(v)}
                className="flex-1"
              />
              <Input
                type="number" className="w-24 text-center"
                value={shopCount}
                onChange={e => setShopCount(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Rata-rata Nilai Pesanan (AOV)</Label>
            <div className="flex items-center gap-3">
              <Slider
                min={10000} max={2000000} step={10000}
                value={[avgOrderValue]}
                onValueChange={([v]) => setAvgOrderValue(v)}
                className="flex-1"
              />
              <Input
                type="number" className="w-28 text-center"
                value={avgOrderValue}
                onChange={e => setAvgOrderValue(Number(e.target.value))}
              />
            </div>
            <p className="text-xs text-muted-foreground">{formatIDR(avgOrderValue)}</p>
          </div>

          <div className="space-y-1.5">
            <Label>Pesanan per Toko per Bulan</Label>
            <div className="flex items-center gap-3">
              <Slider
                min={1} max={500} step={1}
                value={[ordersPerShopPerMonth]}
                onValueChange={([v]) => setOrdersPerShopPerMonth(v)}
                className="flex-1"
              />
              <Input
                type="number" className="w-24 text-center"
                value={ordersPerShopPerMonth}
                onChange={e => setOrdersPerShopPerMonth(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Paket Berlangganan</Label>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLANS.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label} — komisi {p.commissionPct}% · {p.monthlyFee === 0 ? "Gratis" : formatIDR(p.monthlyFee) + "/bln"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Kategori Bisnis</Label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label} {c.overridePct !== 0 ? `(${c.overridePct > 0 ? "+" : ""}${c.overridePct}%)` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Percent className="h-3.5 w-3.5" /> Override Komisi (opsional)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                type="number" placeholder={`Default: ${effectiveCommission}%`}
                value={customCommission}
                onChange={e => setCustomCommission(e.target.value)}
                min={0} max={50} step={0.5}
              />
              {customCommission && (
                <Button variant="ghost" size="sm" onClick={() => setCustomCommission("")}>Reset</Button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Estimasi Biaya Operasional ({opsCostPct}%)</Label>
            <Slider
              min={0} max={80} step={5}
              value={[opsCostPct]}
              onValueChange={([v]) => setOpsCostPct(v)}
            />
            <p className="text-xs text-muted-foreground">Server, support, pemasaran, gaji — persentase dari total pendapatan</p>
          </div>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          <Card className="p-5 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="font-semibold">Proyeksi Bulanan</h2>
              <Badge variant="outline" className="ml-auto">
                Komisi efektif: {effectiveCommission}%
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Kpi label="Total GMV" value={formatIDR(result.gmv)} sub={`${result.totalOrders.toLocaleString("id")} pesanan`} />
              <Kpi label="Pendapatan Komisi" value={formatIDR(result.commissionRevenue)} sub={`${effectiveCommission}% dari GMV`} />
              <Kpi label="Pendapatan Langganan" value={formatIDR(result.subscriptionRevenue)} sub={`${shopCount} toko × ${plan.label}`} />
              <Kpi label="Total Pendapatan" value={formatIDR(result.totalRevenue)} color="bg-green-50 border-green-200" />
            </div>
            <div className="mt-3 rounded-lg border-2 border-green-300 bg-green-50 p-4">
              <p className="text-sm text-muted-foreground">Estimasi Laba Bersih (setelah ops {opsCostPct}%)</p>
              <p className="text-3xl font-bold text-green-700 mt-0.5">{formatIDR(result.netAfterOps)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {((result.netAfterOps / result.totalRevenue) * 100).toFixed(1)}% margin bersih
              </p>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4" /> Proyeksi Tahunan
            </h2>
            <div className="space-y-2 text-sm">
              {[
                { label: "GMV Tahunan", value: result.gmv * 12 },
                { label: "Pendapatan Komisi Tahunan", value: result.commissionRevenue * 12 },
                { label: "Pendapatan Langganan Tahunan", value: result.subscriptionRevenue * 12 },
                { label: "Total Pendapatan Tahunan", value: result.totalRevenue * 12, bold: true },
                { label: "Laba Bersih Tahunan", value: result.netAfterOps * 12, bold: true, green: true },
              ].map(row => (
                <div key={row.label} className={`flex justify-between ${row.bold ? "font-semibold" : ""} ${row.green ? "text-green-700" : ""}`}>
                  <span className={row.bold ? "" : "text-muted-foreground"}>{row.label}</span>
                  <span>{formatIDR(row.value)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="font-semibold mb-3 text-sm flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" /> Statistik
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pendapatan per Toko/Bulan</span>
                <span>{formatIDR((result.commissionRevenue + result.subscriptionRevenue) / shopCount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Take Rate Efektif</span>
                <span>{result.gmv > 0 ? ((result.totalRevenue / result.gmv) * 100).toFixed(2) : 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">GMV per Toko/Bulan</span>
                <span>{formatIDR((avgOrderValue * ordersPerShopPerMonth))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Pesanan/Bulan</span>
                <span>{result.totalOrders.toLocaleString("id-ID")}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
