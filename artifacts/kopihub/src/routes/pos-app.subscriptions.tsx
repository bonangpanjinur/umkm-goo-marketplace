import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCcw, Pause, Play, X, Calendar, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/subscriptions")({
  head: () => ({ meta: [{ title: "Langganan — Merchant" }] }),
  component: SubscriptionsPage,
});

type Sub = {
  id: string;
  plan_code: string;
  status: string;
  billing_interval: string;
  next_billing_at: string;
  payment_provider: string | null;
  amount_idr: number;
  last_charge_at: string | null;
  failure_count: number;
  cancelled_at: string | null;
};

type Plan = { id: string; code: string; name: string; price_idr: number; duration_days: number };

function SubscriptionsPage() {
  const { shop } = useCurrentShop();
  const [sub, setSub] = useState<Sub | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    if (!shop) return;
    setLoading(true);
    const [{ data: subData }, { data: plansData }] = await Promise.all([
      supabase.from("plan_subscriptions" as any).select("*").eq("shop_id", shop.id).maybeSingle(),
      supabase.from("plans" as any).select("id, code, name, price_idr, duration_days").eq("is_active", true).order("sort_order"),
    ]);
    setSub(subData as any);
    setPlans((plansData as any[]) ?? []);
    setLoading(false);
  }, [shop]);

  useEffect(() => { reload(); }, [reload]);

  const enable = async (planCode: string, interval: string, provider: string) => {
    if (!shop) return;
    const plan = plans.find((p) => p.code === planCode);
    if (!plan) return;
    setBusy(true);
    try {
      const monthlyAmount = interval === "yearly" ? plan.price_idr * 12 : plan.price_idr;
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + plan.duration_days);
      const payload = {
        shop_id: shop.id,
        plan_id: plan.id,
        plan_code: plan.code,
        status: "active",
        billing_interval: interval,
        next_billing_at: nextDate.toISOString(),
        payment_provider: provider,
        amount_idr: monthlyAmount,
      };
      if (sub) {
        const { error } = await supabase.from("plan_subscriptions" as any).update(payload).eq("id", sub.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("plan_subscriptions" as any).insert(payload);
        if (error) throw error;
      }
      toast.success("Auto-renewal aktif. Tagihan akan dibuat otomatis menjelang jatuh tempo.");
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(false); }
  };

  const update = async (patch: Partial<Sub>) => {
    if (!sub) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("plan_subscriptions" as any).update(patch).eq("id", sub.id);
      if (error) throw error;
      await reload();
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <RefreshCcw className="h-6 w-6" /> Auto-Renewal Berlangganan
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aktifkan perpanjangan otomatis paket platform Anda — tagihan dibuat & dibayar otomatis menjelang jatuh tempo.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : sub ? (
        <Card className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
            <div>
              <div className="text-xs text-muted-foreground">Status Berlangganan</div>
              <div className="mt-1 flex items-center gap-2">
                <Badge className={
                  sub.status === "active" ? "bg-green-500" :
                  sub.status === "paused" ? "bg-amber-500" :
                  sub.status === "past_due" ? "bg-red-500" : ""
                }>{sub.status.toUpperCase()}</Badge>
                <span className="font-semibold uppercase">{sub.plan_code}</span>
                <Badge variant="outline">{sub.billing_interval === "yearly" ? "Tahunan" : "Bulanan"}</Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Tagihan berikutnya</div>
              <div className="font-semibold">{formatIDR(sub.amount_idr)}</div>
              <div className="text-xs text-muted-foreground">
                <Calendar className="h-3 w-3 inline mr-1" />
                {new Date(sub.next_billing_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </div>
            </div>
          </div>

          {sub.failure_count > 0 && (
            <div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700">
              Gagal tagih {sub.failure_count}× — periksa metode pembayaran Anda.
            </div>
          )}

          <div className="text-xs text-muted-foreground mb-4">
            Provider: <b>{sub.payment_provider ?? "manual"}</b>
            {sub.last_charge_at && <> · Terakhir tagih: {new Date(sub.last_charge_at).toLocaleString("id-ID")}</>}
          </div>

          <div className="flex flex-wrap gap-2">
            {sub.status === "active" && (
              <Button variant="outline" onClick={() => update({ status: "paused" })} disabled={busy}>
                <Pause className="h-4 w-4 mr-2" /> Pause
              </Button>
            )}
            {sub.status === "paused" && (
              <Button onClick={() => update({ status: "active" })} disabled={busy}>
                <Play className="h-4 w-4 mr-2" /> Lanjutkan
              </Button>
            )}
            <Button variant="ghost" className="text-red-600" onClick={() => {
              if (confirm("Batalkan auto-renewal? Anda perlu memperpanjang manual setelahnya.")) {
                update({ status: "cancelled", cancelled_at: new Date().toISOString() });
              }
            }} disabled={busy}>
              <X className="h-4 w-4 mr-2" /> Batalkan
            </Button>
          </div>
        </Card>
      ) : (
        <EnableForm plans={plans} onEnable={enable} busy={busy} />
      )}
    </div>
  );
}

function EnableForm({ plans, onEnable, busy }: { plans: Plan[]; onEnable: (p: string, i: string, prov: string) => void; busy: boolean }) {
  const [planCode, setPlanCode] = useState(plans[0]?.code ?? "");
  const [interval, setInterval] = useState("monthly");
  const [provider, setProvider] = useState("midtrans");
  useEffect(() => { if (!planCode && plans[0]) setPlanCode(plans[0].code); }, [plans, planCode]);
  return (
    <Card className="p-6">
      <div className="mb-4">
        <CreditCard className="h-8 w-8 text-muted-foreground mb-2" />
        <h2 className="font-semibold">Aktifkan Auto-Renewal</h2>
        <p className="text-sm text-muted-foreground">Tidak perlu repot bayar manual setiap bulan.</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-3 mb-4">
        <div>
          <Label>Paket</Label>
          <Select value={planCode} onValueChange={setPlanCode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {plans.map((p) => (<SelectItem key={p.code} value={p.code}>{p.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Interval</Label>
          <Select value={interval} onValueChange={setInterval}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Bulanan</SelectItem>
              <SelectItem value="yearly">Tahunan (hemat 2 bulan)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Metode</Label>
          <Select value={provider} onValueChange={setProvider}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="midtrans">Midtrans (Kartu/VA)</SelectItem>
              <SelectItem value="xendit">Xendit (Kartu/VA)</SelectItem>
              <SelectItem value="manual">Manual Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={() => onEnable(planCode, interval, provider)} disabled={busy || !planCode}>
        {busy && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Aktifkan Auto-Renewal
      </Button>
    </Card>
  );
}