import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatIDR } from "@/lib/format";
import { ArrowLeft, Wallet, Info, Clock, CheckCircle2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/keuangan/tarik")({
  head: () => ({ meta: [{ title: "Penarikan Dana — Merchant" }] }),
  component: WithdrawalPage,
});

const QUICK_AMOUNTS = [100_000, 250_000, 500_000, 1_000_000, 2_000_000, 5_000_000];

const BANKS_ID = [
  "BCA", "BNI", "BRI", "Mandiri", "CIMB Niaga", "Permata", "Danamon",
  "OCBC", "Maybank", "Bank Jago", "GoPay", "OVO", "DANA", "ShopeePay",
];

function WithdrawalPage() {
  const { shop }   = useCurrentShop();
  const navigate   = useNavigate();
  const [available,  setAvailable]  = useState(0);
  const [settings,   setSettings]   = useState<{ min: number; fee: number; max_per_day: number }>({ min: 50000, fee: 2500, max_per_day: 50_000_000 });
  const [prevBanks,  setPrevBanks]  = useState<{ bank_name: string; bank_account_no: string; bank_account_name: string }[]>([]);
  const [amount,     setAmount]     = useState<string>("");
  const [bankName,   setBankName]   = useState("");
  const [accountNo,  setAccountNo]  = useState("");
  const [accountName,setAccountName]= useState("");
  const [notes,      setNotes]      = useState("");
  const [busy,       setBusy]       = useState(false);
  const [step,       setStep]       = useState<"form" | "confirm" | "done">("form");

  useEffect(() => {
    if (!shop?.id) return;
    (async () => {
      const [w, s, prev] = await Promise.all([
        supabase.from("shop_wallets").select("available_balance").eq("shop_id", shop.id).maybeSingle(),
        supabase.from("platform_settings").select("key, value").in("key", ["withdrawal_min_amount", "withdrawal_admin_fee", "withdrawal_max_per_day"]),
        supabase.from("withdrawal_requests").select("bank_name, bank_account_no, bank_account_name")
          .eq("shop_id", shop.id).order("created_at", { ascending: false }).limit(5),
      ]);
      setAvailable(Number((w.data as any)?.available_balance ?? 0));
      const map = Object.fromEntries(((s.data as any[]) ?? []).map((r: any) => [r.key, Number(r.value)]));
      setSettings({
        min:         map.withdrawal_min_amount  || 50_000,
        fee:         map.withdrawal_admin_fee   || 2_500,
        max_per_day: map.withdrawal_max_per_day || 50_000_000,
      });
      // Deduplicate previous banks
      const seen = new Set<string>();
      const uniq = ((prev.data as any[]) ?? []).filter(b => {
        const k = `${b.bank_name}|${b.bank_account_no}`;
        if (seen.has(k)) return false;
        seen.add(k); return true;
      });
      setPrevBanks(uniq);
    })();
  }, [shop?.id]);

  const amt = Number(amount) || 0;
  const net = Math.max(0, amt - settings.fee);
  const pct = available > 0 ? Math.min(100, Math.round((amt / available) * 100)) : 0;

  const fillBank = (b: typeof prevBanks[number]) => {
    setBankName(b.bank_name);
    setAccountNo(b.bank_account_no);
    setAccountName(b.bank_account_name);
  };

  const validate = () => {
    if (amt < settings.min) { toast.error(`Minimum penarikan ${formatIDR(settings.min)}`); return false; }
    if (amt > available)    { toast.error("Saldo tidak cukup"); return false; }
    if (amt > settings.max_per_day) { toast.error(`Maksimum per hari ${formatIDR(settings.max_per_day)}`); return false; }
    if (!bankName.trim() || !accountNo.trim() || !accountName.trim()) { toast.error("Lengkapi data rekening bank"); return false; }
    return true;
  };

  const submit = async () => {
    if (!shop?.id || !validate()) return;
    setBusy(true);
    const { error } = await supabase.from("withdrawal_requests").insert({
      shop_id:           shop.id,
      amount:            amt,
      admin_fee:         settings.fee,
      net_amount:        net,
      bank_name:         bankName.trim(),
      bank_account_no:   accountNo.trim(),
      bank_account_name: accountName.trim(),
      notes:             notes.trim() || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setStep("done");
  };

  if (step === "done") {
    return (
      <div className="mx-auto max-w-md p-6 flex flex-col items-center gap-4 text-center py-16">
        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
        <h2 className="text-xl font-bold">Permohonan Terkirim</h2>
        <p className="text-sm text-muted-foreground">
          Permohonan penarikan <strong>{formatIDR(amt)}</strong> ({formatIDR(net)} bersih) ke rekening <strong>{bankName} {accountNo}</strong> telah dikirim. Tim kami akan memprosesnya dalam 1×24 jam kerja.
        </p>
        <div className="w-full rounded-xl border border-border bg-muted/30 p-4 text-left text-sm space-y-2">
          <div className="flex gap-2"><Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" /><span>Status: <strong>Menunggu Review</strong></span></div>
          <div className="flex gap-2"><Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" /><span>Kamu akan menerima notifikasi saat dana dicairkan.</span></div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate({ to: "/pos-app/keuangan" })}>← Keuangan</Button>
          <Button onClick={() => { setStep("form"); setAmount(""); }}>Tarik Lagi</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-5 p-4 sm:p-6">
      {/* Header */}
      <div>
        <Link to="/pos-app/keuangan" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-2">
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Keuangan
        </Link>
        <h1 className="text-xl font-bold tracking-tight">Tarik Dana</h1>
        <p className="text-sm text-muted-foreground">Ajukan penarikan ke rekening bank kamu.</p>
      </div>

      {/* Saldo */}
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
        <Wallet className="h-6 w-6 text-primary shrink-0" />
        <div>
          <p className="text-xs text-muted-foreground">Saldo tersedia</p>
          <p className="text-2xl font-bold">{formatIDR(available)}</p>
        </div>
      </div>

      {/* Amount */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div>
          <Label>Jumlah penarikan *</Label>
          <div className="relative mt-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">Rp</span>
            <Input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder={`Min ${formatIDR(settings.min)}`}
              className="pl-10 text-base font-semibold"
            />
          </div>
          {/* Quick amount buttons */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_AMOUNTS.filter(q => q <= available).map(q => (
              <button
                key={q}
                onClick={() => setAmount(String(q))}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${Number(amount) === q ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                {formatIDR(q)}
              </button>
            ))}
            {available > 0 && (
              <button
                onClick={() => setAmount(String(available))}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${Number(amount) === available ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}
              >
                Semua ({formatIDR(available)})
              </button>
            )}
          </div>
          {/* Progress bar */}
          {amt > 0 && (
            <div className="mt-3 space-y-1">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${amt > available ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>{pct}% dari saldo</span>
                <span>Sisa: {formatIDR(Math.max(0, available - amt))}</span>
              </div>
            </div>
          )}
        </div>

        {/* Fee summary */}
        {amt > 0 && (
          <div className="rounded-lg bg-muted/50 border border-border px-4 py-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Jumlah tarik</span><span>{formatIDR(amt)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Biaya admin</span><span className="text-red-600">-{formatIDR(settings.fee)}</span>
            </div>
            <div className="flex justify-between font-bold border-t border-border pt-1.5">
              <span>Diterima</span><span className="text-emerald-700">{formatIDR(net)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bank details */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold">Rekening Tujuan</h3>

        {/* Saved banks */}
        {prevBanks.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Gunakan rekening sebelumnya:</p>
            <div className="grid gap-2">
              {prevBanks.map((b, i) => (
                <button
                  key={i}
                  onClick={() => fillBank(b)}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${bankName === b.bank_name && accountNo === b.bank_account_no ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/30"}`}
                >
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold">{b.bank_name.slice(0, 3).toUpperCase()}</div>
                  <div className="min-w-0">
                    <p className="font-medium">{b.bank_name} · {b.bank_account_no}</p>
                    <p className="text-xs text-muted-foreground truncate">{b.bank_account_name}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Nama Bank *</Label>
            <Input
              className="mt-1"
              value={bankName}
              onChange={e => setBankName(e.target.value)}
              placeholder="BCA / Mandiri / BNI"
              list="banks-list"
            />
            <datalist id="banks-list">
              {BANKS_ID.map(b => <option key={b} value={b} />)}
            </datalist>
          </div>
          <div>
            <Label className="text-xs">No. Rekening *</Label>
            <Input className="mt-1" value={accountNo} onChange={e => setAccountNo(e.target.value)} inputMode="numeric" />
          </div>
        </div>
        <div>
          <Label className="text-xs">Atas Nama *</Label>
          <Input className="mt-1" value={accountName} onChange={e => setAccountName(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Catatan (opsional)</Label>
          <Textarea className="mt-1" value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Mis. urgensi, referensi" />
        </div>
      </div>

      {/* Warning if amount too low */}
      {amt > 0 && amt < settings.min && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Minimum penarikan adalah {formatIDR(settings.min)}
        </div>
      )}
      {amt > available && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Jumlah melebihi saldo tersedia ({formatIDR(available)})
        </div>
      )}

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0" />
        Dana akan diproses dalam 1×24 jam kerja setelah disetujui admin.
      </div>

      <Button
        className="w-full"
        size="lg"
        onClick={submit}
        disabled={busy || amt < settings.min || amt > available || !bankName.trim() || !accountNo.trim() || !accountName.trim()}
      >
        {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Mengirim…</> : `Ajukan Penarikan ${amt > 0 ? formatIDR(amt) : ""}`}
      </Button>
    </div>
  );
}
