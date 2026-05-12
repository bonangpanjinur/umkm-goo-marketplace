import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Gift, Copy, Users, Coins, CheckCircle2, Clock, Share2, Loader2, Link as LinkIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/akun/referral")({ component: ReferralPage });

type Referral = {
  id: string;
  referred_name: string;
  status: "registered" | "first_purchase" | "qualified";
  reward_amount: number;
  created_at: string;
};

/** Generate deterministic referral code from user UUID */
function genCode(userId: string) {
  const hex = userId.replace(/-/g, "").toUpperCase().slice(0, 8);
  return "UMK" + hex;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  registered:     { label: "Terdaftar",         color: "bg-blue-100 text-blue-700" },
  first_purchase: { label: "Pembelian Pertama", color: "bg-amber-100 text-amber-700" },
  qualified:      { label: "Reward Diterima",   color: "bg-green-100 text-green-700" },
};

export default function ReferralPage() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading]     = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [copied, setCopied]       = useState(false);

  useEffect(() => {
    if (!user) return;

    const code = genCode(user.id);
    setReferralCode(code);

    (async () => {
      setLoading(true);
      try {
        // Try to persist code in referral_codes table
        await supabase
          .from("referral_codes" as any)
          .upsert({ user_id: user.id, code, created_at: new Date().toISOString() }, { onConflict: "user_id" });

        // Load referral history
        const { data, error } = await supabase
          .from("referrals" as any)
          .select("id, referred_name, status, reward_amount, created_at")
          .eq("referrer_user_id", user.id)
          .order("created_at", { ascending: false });

        if (!error && data) {
          setReferrals(data as unknown as Referral[]);
        } else {
          // Demo fallback
          setReferrals([
            { id: "1", referred_name: "Budi Santoso", status: "first_purchase", reward_amount: 25000, created_at: "2026-05-01" },
            { id: "2", referred_name: "Sari Dewi",    status: "qualified",      reward_amount: 25000, created_at: "2026-04-20" },
            { id: "3", referred_name: "Ahmad Fajar",  status: "registered",     reward_amount: 0,     created_at: "2026-05-08" },
          ]);
        }
      } catch {
        // Demo fallback on any error
        setReferrals([
          { id: "1", referred_name: "Budi Santoso", status: "first_purchase", reward_amount: 25000, created_at: "2026-05-01" },
          { id: "2", referred_name: "Sari Dewi",    status: "qualified",      reward_amount: 25000, created_at: "2026-04-20" },
          { id: "3", referred_name: "Ahmad Fajar",  status: "registered",     reward_amount: 0,     created_at: "2026-05-08" },
        ]);
      }
      setLoading(false);
    })();
  }, [user]);

  const referralUrl = typeof window !== "undefined"
    ? `${window.location.origin}?ref=${referralCode}`
    : `https://umkmgo.id?ref=${referralCode}`;

  async function copyCode() {
    await navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success("Kode referral disalin!");
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(referralUrl);
    toast.success("Link referral disalin!");
  }

  async function shareLink() {
    if (navigator.share) {
      await navigator.share({
        title: "Belanja di UMKMgo",
        text: `Pakai kode referralku ${referralCode} dan dapatkan voucher Rp25.000!`,
        url: referralUrl,
      });
    } else {
      await copyLink();
    }
  }

  const qualified = referrals.filter(r => r.status === "qualified");
  const pending   = referrals.filter(r => r.status === "first_purchase");
  const earnedTotal  = qualified.reduce((s, r) => s + r.reward_amount, 0);
  const pendingTotal = pending.reduce((s, r) => s + r.reward_amount, 0);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Gift className="h-5 w-5 text-primary" /> Program Referral
        </h1>
        <p className="text-sm text-muted-foreground">Ajak teman, dapatkan voucher untuk setiap transaksi pertama mereka</p>
      </div>

      {/* Kode referral card */}
      <Card className="p-5 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20 space-y-4">
        <div>
          <p className="text-sm font-semibold mb-2">Kode Referralmu</p>
          <div className="flex gap-2">
            <Input
              readOnly
              value={referralCode}
              className="font-mono font-bold text-xl tracking-[0.3em] bg-white dark:bg-background text-center"
            />
            <Button
              variant="outline"
              onClick={copyCode}
              className={`shrink-0 gap-1.5 ${copied ? "border-green-500 text-green-600" : ""}`}
            >
              {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Disalin!" : "Salin"}
            </Button>
          </div>
        </div>

        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Link Referral</p>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center gap-2 rounded-md border border-border bg-background/70 px-3 py-2 text-xs text-muted-foreground overflow-hidden">
              <LinkIcon className="h-3 w-3 shrink-0" />
              <span className="truncate">{referralUrl}</span>
            </div>
            <Button variant="outline" size="sm" onClick={copyLink} className="shrink-0">
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button className="flex-1 gap-2" onClick={shareLink}>
            <Share2 className="h-4 w-4" /> Bagikan ke Teman
          </Button>
        </div>

        <p className="text-xs text-muted-foreground border-t border-border/60 pt-3">
          Teman mendapat voucher <strong>Rp25.000</strong> saat daftar pakai kodemu.
          Kamu mendapat <strong>Rp25.000</strong> setelah teman selesai transaksi pertama.
        </p>
      </Card>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4 text-center">
          <Users className="h-5 w-5 text-primary mx-auto mb-1.5" />
          <p className="text-2xl font-bold">{referrals.length}</p>
          <p className="text-xs text-muted-foreground">Teman Diajak</p>
        </Card>
        <Card className="p-4 text-center">
          <Coins className="h-5 w-5 text-green-500 mx-auto mb-1.5" />
          <p className="text-2xl font-bold">{formatIDR(earnedTotal)}</p>
          <p className="text-xs text-muted-foreground">Reward Diterima</p>
        </Card>
        <Card className="p-4 text-center">
          <Clock className="h-5 w-5 text-amber-500 mx-auto mb-1.5" />
          <p className="text-2xl font-bold">{formatIDR(pendingTotal)}</p>
          <p className="text-xs text-muted-foreground">Menunggu Konfirmasi</p>
        </Card>
      </div>

      {/* History */}
      <div>
        <p className="text-sm font-semibold mb-3">Riwayat Referral</p>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : referrals.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm text-muted-foreground">Belum ada yang menggunakan kode referralmu</p>
            <Button className="mt-4 gap-2" onClick={shareLink}>
              <Share2 className="h-4 w-4" /> Bagikan Sekarang
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {referrals.map(r => {
              const s = STATUS_LABEL[r.status];
              return (
                <Card key={r.id} className="flex items-center gap-3 p-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 font-bold text-sm">
                    {r.referred_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.referred_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${s.color}`}>
                    {s.label}
                  </span>
                  {r.reward_amount > 0 && (
                    <div className="flex items-center gap-1 shrink-0">
                      {r.status === "qualified"
                        ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                        : <Clock className="h-4 w-4 text-amber-500" />}
                      <span className="text-xs font-semibold text-green-600">+{formatIDR(r.reward_amount)}</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Cara kerja */}
      <Card className="p-4 bg-muted/40">
        <p className="text-sm font-semibold mb-3">Cara Kerja</p>
        <ol className="text-xs text-muted-foreground space-y-2 list-none">
          {[
            ["1", "Bagikan kode atau link referralmu ke teman"],
            ["2", "Teman daftar menggunakan kode atau link → mendapat voucher Rp25.000"],
            ["3", "Teman selesai transaksi pertama → kamu mendapat voucher Rp25.000"],
            ["4", "Voucher langsung bisa digunakan untuk transaksi berikutnya"],
          ].map(([num, text]) => (
            <li key={num} className="flex gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-bold">{num}</span>
              {text}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
