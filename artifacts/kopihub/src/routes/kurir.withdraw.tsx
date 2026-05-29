import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatIDR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Wallet, ArrowUpRight, Clock } from "lucide-react";

export const Route = createFileRoute("/kurir/withdraw")({
  head: () => ({ meta: [{ title: "Penarikan Dana — UMKMgo" }] }),
  component: KurirWithdraw,
});

type Courier = {
  id: string;
  name: string;
  balance: number;
  total_earned: number;
};

type WithdrawalRow = {
  id: string;
  amount: number;
  net_amount: number;
  admin_fee: number;
  bank_name: string;
  bank_account_no: string;
  bank_account_name: string;
  status: string;
  created_at: string;
};

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  pending:   { label: "Menunggu",  className: "bg-amber-100 text-amber-700" },
  approved:  { label: "Disetujui", className: "bg-blue-100 text-blue-700" },
  paid:      { label: "Dibayar",   className: "bg-emerald-100 text-emerald-700" },
  rejected:  { label: "Ditolak",   className: "bg-red-100 text-red-700" },
};

const ADMIN_FEE = 2500;

function KurirWithdraw() {
  const { user } = useAuth();
  const [courier, setCourier] = useState<Courier | null>(null);
  const [history, setHistory] = useState<WithdrawalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [accountName, setAccountName] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: cs } = await supabase
      .from("couriers")
      .select("id,name,balance,total_earned")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .limit(1)
      .single();
    if (cs) setCourier(cs as Courier);

    if (cs?.id) {
      const { data: ws } = await (supabase as any)
        .from("withdrawal_requests")
        .select("id,amount,net_amount,admin_fee,bank_name,bank_account_no,bank_account_name,status,created_at")
        .eq("courier_id", cs.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setHistory((ws ?? []) as WithdrawalRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const amountNum = Number(amount) || 0;
  const netAmount = Math.max(0, amountNum - ADMIN_FEE);
  const canSubmit = amountNum >= 50000 && bankName && accountNo && accountName && courier;

  const submit = async () => {
    if (!canSubmit || !courier) return;
    if (amountNum > (courier.balance ?? 0)) {
      toast.error("Saldo tidak mencukupi");
      return;
    }
    setSubmitting(true);
    const { error } = await (supabase as any)
      .from("withdrawal_requests")
      .insert({
        courier_id: courier.id,
        shop_id: null,
        amount: amountNum,
        net_amount: netAmount,
        admin_fee: ADMIN_FEE,
        bank_name: bankName.trim(),
        bank_account_no: accountNo.trim(),
        bank_account_name: accountName.trim(),
        status: "pending",
      });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Permintaan penarikan terkirim. Tim kami akan memproses dalam 1–2 hari kerja.");
      setAmount(""); setBankName(""); setAccountNo(""); setAccountName("");
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!courier) {
    return (
      <div className="mx-auto max-w-md p-6 text-center text-sm text-muted-foreground">
        Akun kurir aktif tidak ditemukan.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Wallet className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Tarik Penghasilan</h1>
      </div>

      <Card className="p-5">
        <div className="grid grid-cols-2 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground uppercase">Saldo tersedia</p>
            <p className="mt-0.5 text-2xl font-bold text-primary">
              {formatIDR(Number(courier.balance ?? 0))}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Total diperoleh</p>
            <p className="mt-0.5 text-xl font-semibold">
              {formatIDR(Number(courier.total_earned ?? 0))}
            </p>
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <h2 className="font-semibold">Ajukan Penarikan</h2>

        <div>
          <Label>Jumlah (min. Rp 50.000)</Label>
          <Input
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Masukkan jumlah"
            min={50000}
          />
          {amountNum >= 50000 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Biaya admin: {formatIDR(ADMIN_FEE)} · Diterima: <strong>{formatIDR(netAmount)}</strong>
            </p>
          )}
        </div>

        <div>
          <Label>Bank</Label>
          <Input
            value={bankName}
            onChange={(e) => setBankName(e.target.value)}
            placeholder="BCA, BRI, Mandiri, dll"
          />
        </div>
        <div>
          <Label>Nomor Rekening</Label>
          <Input
            value={accountNo}
            onChange={(e) => setAccountNo(e.target.value)}
            placeholder="1234567890"
            inputMode="numeric"
          />
        </div>
        <div>
          <Label>Atas Nama</Label>
          <Input
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Sesuai buku tabungan"
          />
        </div>

        <Button
          className="w-full"
          onClick={submit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <ArrowUpRight className="mr-2 h-4 w-4" />
          )}
          Ajukan Penarikan
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Diproses 1–2 hari kerja · Minimal Rp 50.000
        </p>
      </Card>

      {history.length > 0 && (
        <div>
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
            <Clock className="h-3.5 w-3.5" /> Riwayat Penarikan
          </h2>
          <div className="space-y-2">
            {history.map((w) => {
              const s = STATUS_MAP[w.status] ?? { label: w.status, className: "bg-muted text-muted-foreground" };
              return (
                <div key={w.id} className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{formatIDR(w.amount)}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${s.className}`}>{s.label}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {w.bank_name} · {w.bank_account_no} · {w.bank_account_name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(w.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    {w.status === "paid" && ` · Diterima: ${formatIDR(w.net_amount)}`}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
