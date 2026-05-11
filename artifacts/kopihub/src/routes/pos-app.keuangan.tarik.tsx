import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/keuangan/tarik")({
  component: WithdrawalPage,
});

function WithdrawalPage() {
  const { shop } = useShop();
  const navigate = useNavigate();
  const [available, setAvailable] = useState(0);
  const [settings, setSettings] = useState<{ min: number; fee: number }>({ min: 50000, fee: 2500 });

  const [amount, setAmount] = useState<string>("");
  const [bankName, setBankName] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [accountName, setAccountName] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!shop?.id) return;
    (async () => {
      const [w, s] = await Promise.all([
        supabase.from("shop_wallets").select("available_balance").eq("shop_id", shop.id).maybeSingle(),
        supabase.from("platform_settings").select("key, value").in("key", ["withdrawal_min_amount", "withdrawal_admin_fee"]),
      ]);
      setAvailable(Number((w.data as any)?.available_balance ?? 0));
      const map = Object.fromEntries(((s.data as any[]) ?? []).map((r) => [r.key, Number(r.value)]));
      setSettings({
        min: map.withdrawal_min_amount || 50000,
        fee: map.withdrawal_admin_fee || 2500,
      });
    })();
  }, [shop?.id]);

  const amt = Number(amount) || 0;
  const net = Math.max(0, amt - settings.fee);

  const submit = async () => {
    if (!shop?.id) return;
    if (amt < settings.min) { toast.error(`Minimum penarikan Rp ${settings.min.toLocaleString("id-ID")}`); return; }
    if (amt > available) { toast.error("Saldo tidak cukup"); return; }
    if (!bankName.trim() || !accountNo.trim() || !accountName.trim()) { toast.error("Lengkapi data bank"); return; }
    setBusy(true);
    const { error } = await supabase.from("withdrawal_requests").insert({
      shop_id: shop.id,
      amount: amt,
      admin_fee: settings.fee,
      net_amount: net,
      bank_name: bankName.trim(),
      bank_account_no: accountNo.trim(),
      bank_account_name: accountName.trim(),
      notes: notes.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Permohonan penarikan dikirim. Menunggu review admin.");
    navigate({ to: "/pos-app/keuangan" });
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 p-6">
      <div>
        <Link to="/pos-app/keuangan" className="text-xs text-muted-foreground hover:text-foreground">← Keuangan</Link>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Tarik Dana</h1>
        <p className="text-sm text-muted-foreground">Saldo tersedia: <strong>Rp {available.toLocaleString("id-ID")}</strong></p>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <Label>Jumlah penarikan *</Label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Min. ${settings.min.toLocaleString("id-ID")}`}
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>Biaya admin</span>
            <span>Rp {settings.fee.toLocaleString("id-ID")}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm font-semibold">
            <span>Diterima</span>
            <span className="text-primary">Rp {net.toLocaleString("id-ID")}</span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>Bank *</Label>
            <Input value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="BCA / Mandiri / BNI" />
          </div>
          <div>
            <Label>No. Rekening *</Label>
            <Input value={accountNo} onChange={(e) => setAccountNo(e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Atas Nama *</Label>
          <Input value={accountName} onChange={(e) => setAccountName(e.target.value)} />
        </div>
        <div>
          <Label>Catatan</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
        <Button className="w-full" onClick={submit} disabled={busy}>
          {busy ? "Mengirim…" : "Kirim Permohonan"}
        </Button>
      </div>
    </div>
  );
}
