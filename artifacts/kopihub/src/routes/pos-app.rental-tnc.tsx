import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText, Save, Loader2, Copy, Check, Info, AlertTriangle, FileText, Shield, Clock, Banknote, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/rental-tnc")({
  head: () => ({ meta: [{ title: "Syarat & Ketentuan Sewa — Merchant" }] }),
  component: RentalTncPage,
});

type TncData = {
  rental_tnc: string;
  rental_deposit_pct: number;
  rental_require_id: boolean;
  rental_min_hours: number;
  rental_late_fee_pct: number;
};

const DEFAULT_TNC = `SYARAT & KETENTUAN SEWA

1. IDENTITAS PENYEWA
Penyewa wajib menunjukkan KTP/SIM/Paspor yang masih berlaku saat pengambilan unit.

2. DEPOSIT
Deposit dikenakan sesuai persentase yang tercantum dan akan dikembalikan saat unit dikembalikan dalam kondisi baik.

3. DURASI SEWA
Durasi minimum sewa sesuai ketentuan toko. Pengembalian terlambat dikenakan biaya tambahan per jam/hari.

4. KONDISI UNIT
Penyewa wajib memeriksa kondisi unit bersama petugas sebelum pengambilan. Kerusakan selama masa sewa menjadi tanggung jawab penyewa.

5. LARANGAN
- Dilarang menyewakan unit kepada pihak ketiga
- Dilarang menggunakan unit di luar area yang disepakati
- Dilarang melakukan modifikasi pada unit

6. KETERLAMBATAN & DENDA
Pengembalian terlambat dikenakan denda sesuai tarif yang berlaku.

7. PEMBATALAN
Pembatalan ≥24 jam sebelum waktu sewa: deposit dikembalikan penuh.
Pembatalan <24 jam: deposit tidak dikembalikan.`;

function RentalTncPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
const [copied, setCopied] = useState(false);

  const [tnc, setTnc] = useState(DEFAULT_TNC);
  const [depositPct, setDepositPct] = useState<string>("30");
  const [requireId, setRequireId] = useState(true);
  const [minHours, setMinHours] = useState<string>("4");
  const [lateFeePct, setLateFeePct] = useState<string>("10");

  async function load() {
    if (!shop) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("shops")
      .select("rental_tnc, rental_deposit_pct, rental_require_id, rental_min_hours, rental_late_fee_pct")
      .eq("id", shop.id)
      .maybeSingle() as any;

    if (error?.message?.includes("column") || error?.message?.includes("does not exist")) {
setLoading(false);
      return;
    }

    if (data) {
      setTnc(data.rental_tnc ?? DEFAULT_TNC);
      setDepositPct(String(data.rental_deposit_pct ?? 30));
      setRequireId(data.rental_require_id ?? true);
      setMinHours(String(data.rental_min_hours ?? 4));
      setLateFeePct(String(data.rental_late_fee_pct ?? 10));
    }
    setLoading(false);
  }

  useEffect(() => {
    if (shop) load();
  }, [shop?.id]);

  async function save() {
    if (!shop) return;
    setSaving(true);
    const { error } = await supabase
      .from("shops")
      .update({
        rental_tnc: tnc.trim() || null,
        rental_deposit_pct: Number(depositPct) || 30,
        rental_require_id: requireId,
        rental_min_hours: Number(minHours) || 4,
        rental_late_fee_pct: Number(lateFeePct) || 10,
      } as any)
      .eq("id", shop.id);

    if (error?.message?.includes("column") || error?.message?.includes("does not exist")) {
toast.error("Kolom belum tersedia.");
    } else if (error) {
      toast.error(error.message);
    } else {
      toast.success("Syarat & ketentuan berhasil disimpan");
    }
    setSaving(false);
  }

  if (shopLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ScrollText className="h-6 w-6 text-primary" />
            Syarat &amp; Ketentuan Sewa
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ditampilkan kepada penyewa di halaman publik toko &amp; konfirmasi booking.
          </p>
        </div>
        <Button onClick={save} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Simpan
        </Button>
      </div>

      
      {/* Kebijakan Kunci */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Kebijakan Kunci
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="deposit-pct" className="flex items-center gap-1.5">
                <Banknote className="h-3.5 w-3.5 text-muted-foreground" />
                Deposit Booking (%)
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="deposit-pct"
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={depositPct}
                  onChange={e => setDepositPct(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">% dari total harga sewa</span>
              </div>
              <p className="text-[11px] text-muted-foreground">Deposit dihitung otomatis: harga × durasi × {depositPct}%</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="min-hours" className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Durasi Minimum Sewa
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="min-hours"
                  type="number"
                  min={1}
                  step={1}
                  value={minHours}
                  onChange={e => setMinHours(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">jam</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="late-fee" className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-muted-foreground" />
                Denda Keterlambatan
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="late-fee"
                  type="number"
                  min={0}
                  max={100}
                  step={5}
                  value={lateFeePct}
                  onChange={e => setLateFeePct(e.target.value)}
                  className="w-24"
                />
                <span className="text-sm text-muted-foreground">% per jam keterlambatan</span>
              </div>
            </div>

            <div className="space-y-1.5 flex flex-col justify-start">
              <Label className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                Wajib KTP/Identitas
              </Label>
              <div className="flex items-center gap-3 pt-1">
                <Switch checked={requireId} onCheckedChange={setRequireId} id="require-id" />
                <label htmlFor="require-id" className="text-sm text-muted-foreground cursor-pointer">
                  {requireId ? "Ya — penyewa wajib tunjukkan identitas" : "Tidak wajib"}
                </label>
              </div>
            </div>
          </div>

          {/* Live preview kalkulasi deposit */}
          <div className="rounded-lg border border-blue-200 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/20 p-3 text-sm flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-blue-700 dark:text-blue-300">
              <strong>Contoh kalkulasi deposit:</strong> Unit Rp 200.000/jam, sewa 2 hari (48 jam)
              {" → "}Total Rp {(200000 * 48).toLocaleString("id-ID")}
              {" → "}Deposit {depositPct}% = Rp {Math.round(200000 * 48 * Number(depositPct) / 100).toLocaleString("id-ID")}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teks Syarat & Ketentuan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" /> Teks Syarat &amp; Ketentuan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5" />
            Teks ini ditampilkan di halaman publik toko, konfirmasi booking, dan checklist pra-sewa.
          </p>
          <Textarea
            value={tnc}
            onChange={e => setTnc(e.target.value)}
            rows={20}
            className="font-mono text-xs resize-y"
            placeholder={DEFAULT_TNC}
          />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">{tnc.length} karakter</p>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setTnc(DEFAULT_TNC)}>
              Reset ke template default
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Badge variant="outline" className="font-normal text-xs">Preview</Badge>
            Tampilan di Halaman Publik Toko
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-semibold">Syarat &amp; Ketentuan Sewa</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-md border border-border bg-background p-2 text-center">
                <div className="font-semibold text-foreground">{depositPct}%</div>
                <div className="text-muted-foreground">Deposit</div>
              </div>
              <div className="rounded-md border border-border bg-background p-2 text-center">
                <div className="font-semibold text-foreground">Min. {minHours}j</div>
                <div className="text-muted-foreground">Durasi Minimum</div>
              </div>
              <div className="rounded-md border border-border bg-background p-2 text-center">
                <div className="font-semibold text-foreground">{lateFeePct}%/jam</div>
                <div className="text-muted-foreground">Denda Terlambat</div>
              </div>
            </div>
            {requireId && (
              <div className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                <FileText className="h-3.5 w-3.5" />
                KTP/SIM/Paspor wajib ditunjukkan saat pengambilan unit
              </div>
            )}
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Lihat syarat lengkap →</summary>
              <pre className="mt-2 text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">{tnc}</pre>
            </details>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
