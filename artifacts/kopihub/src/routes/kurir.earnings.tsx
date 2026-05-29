import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatIDR } from "@/lib/format";
import { Loader2, Wallet } from "lucide-react";

export const Route = createFileRoute("/kurir/earnings")({
  head: () => ({ meta: [{ title: "Penghasilan Kurir — UMKMgo" }] }),
  component: CourierEarnings,
});

type Row = { day: string; deliveries: number; gross_fee: number };

function CourierEarnings() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("courier_earnings")
        .select("day,deliveries,gross_fee")
        .eq("user_id", user.id)
        .order("day", { ascending: false })
        .limit(30);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const totalDeliveries = rows.reduce((s, r) => s + Number(r.deliveries), 0);
  const totalGross = rows.reduce((s, r) => s + Number(r.gross_fee), 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center gap-2">
        <Wallet className="h-5 w-5" />
        <h1 className="text-xl font-semibold">Penghasilan (30 hari)</h1>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-[10px] uppercase text-muted-foreground">Total antaran</div>
          <div className="text-xl font-bold">{totalDeliveries}</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 text-center">
          <div className="text-[10px] uppercase text-muted-foreground">Total ongkir</div>
          <div className="text-lg font-bold">{formatIDR(totalGross)}</div>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Belum ada pengantaran yang tercatat.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.day} className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
              <span>{new Date(r.day).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}</span>
              <span className="text-xs text-muted-foreground">{r.deliveries} antaran</span>
              <span className="font-medium">{formatIDR(Number(r.gross_fee))}</span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Catatan: ini adalah <strong>ongkir kotor</strong>. Skema bagi hasil dengan toko diatur terpisah.
      </p>
    </div>
  );
}
