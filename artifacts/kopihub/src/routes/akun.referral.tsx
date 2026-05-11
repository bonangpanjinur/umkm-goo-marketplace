import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Gift, Copy, Users, Coins, CheckCircle2, Clock, Share2, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/akun/referral")({ component: ReferralPage });

type Referral = {
  id: string;
  referred_name: string;
  status: "registered" | "first_purchase" | "qualified";
  reward_amount: number;
  created_at: string;
};

const DEMO_REFERRALS: Referral[] = [
  { id: "1", referred_name: "Budi Santoso", status: "first_purchase", reward_amount: 25000, created_at: "2026-05-01" },
  { id: "2", referred_name: "Sari Dewi", status: "qualified", reward_amount: 25000, created_at: "2026-04-20" },
  { id: "3", referred_name: "Ahmad Fajar", status: "registered", reward_amount: 0, created_at: "2026-05-08" },
];

export default function ReferralPage() {
  const { user } = useAuth();
  const [referrals] = useState<Referral[]>(DEMO_REFERRALS);
  const [loading] = useState(false);
  const [referralCode, setReferralCode] = useState("");

  useEffect(() => {
    if (user) {
      setReferralCode("KOPI" + user.id.slice(0, 6).toUpperCase());
    }
  }, [user]);

  function copyCode() {
    navigator.clipboard.writeText(referralCode).then(() => toast.success("Kode referral disalin!"));
  }

  function shareLink() {
    const url = `${window.location.origin}?ref=${referralCode}`;
    if (navigator.share) {
      navigator.share({ title: "Belanja di KopiHub", text: "Pakai kode referralku dan dapatkan voucher Rp25.000!", url });
    } else {
      navigator.clipboard.writeText(url).then(() => toast.success("Link referral disalin!"));
    }
  }

  const earnedTotal = referrals.filter(r => r.status === "qualified").reduce((s, r) => s + r.reward_amount, 0);
  const pendingTotal = referrals.filter(r => r.status === "first_purchase").reduce((s, r) => s + r.reward_amount, 0);

  const statusLabel: Record<string, { label: string; color: string }> = {
    registered:     { label: "Terdaftar",           color: "bg-blue-100 text-blue-700" },
    first_purchase: { label: "Pembelian Pertama",   color: "bg-amber-100 text-amber-700" },
    qualified:      { label: "Reward Diterima",     color: "bg-green-100 text-green-700" },
  };

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" /> Program Referral
        </h1>
        <p className="text-sm text-muted-foreground">Ajak teman, dapatkan voucher untuk setiap transaksi pertama mereka</p>
      </div>

      <Card className="p-5 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <p className="text-sm font-semibold mb-2">Kode Referralmu</p>
        <div className="flex gap-2">
          <Input
            readOnly
            value={referralCode}
            className="font-mono font-bold text-lg tracking-widest bg-white"
          />
          <Button variant="outline" onClick={copyCode} className="shrink-0">
            <Copy className="h-4 w-4" />
          </Button>
          <Button onClick={shareLink} className="shrink-0">
            <Share2 className="h-4 w-4 mr-1.5" /> Bagikan
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Teman mendapat voucher <strong>Rp25.000</strong> saat daftar. Kamu mendapat <strong>Rp25.000</strong> setelah teman selesai transaksi pertama.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4 text-center">
          <Users className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold">{referrals.length}</p>
          <p className="text-xs text-muted-foreground">Teman Diajak</p>
        </Card>
        <Card className="p-4 text-center">
          <Coins className="h-5 w-5 text-green-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">Rp {earnedTotal.toLocaleString("id-ID")}</p>
          <p className="text-xs text-muted-foreground">Reward Diterima</p>
        </Card>
        <Card className="p-4 text-center">
          <Clock className="h-5 w-5 text-amber-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">Rp {pendingTotal.toLocaleString("id-ID")}</p>
          <p className="text-xs text-muted-foreground">Menunggu Dikonfirmasi</p>
        </Card>
      </div>

      <div>
        <p className="text-sm font-semibold mb-3">Riwayat Referral</p>
        {loading ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : referrals.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Belum ada yang menggunakan kode referralmu</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {referrals.map(r => {
              const s = statusLabel[r.status];
              return (
                <Card key={r.id} className="flex items-center gap-3 p-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 font-semibold text-sm">
                    {r.referred_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{r.referred_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>{s.label}</span>
                  {r.reward_amount > 0 && (
                    <div className="flex items-center gap-1 text-green-600 shrink-0">
                      {r.status === "qualified" ? <CheckCircle2 className="h-4 w-4" /> : <Clock className="h-4 w-4 text-amber-500" />}
                      <span className="text-xs font-semibold">+Rp{r.reward_amount.toLocaleString("id-ID")}</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Card className="p-4 bg-muted/50">
        <p className="text-sm font-semibold mb-2">Cara Kerja</p>
        <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
          <li>Bagikan kode referralmu ke teman</li>
          <li>Teman daftar menggunakan kodemu → mendapat voucher Rp25.000</li>
          <li>Teman selesai transaksi pertama → kamu mendapat voucher Rp25.000</li>
          <li>Voucher dapat digunakan untuk transaksi berikutnya di KopiHub</li>
        </ol>
      </Card>
    </div>
  );
}
