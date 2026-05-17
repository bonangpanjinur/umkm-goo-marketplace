import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatIDR } from "@/lib/format";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/kurir/history")({
  component: CourierHistory,
});

type Row = {
  id: string;
  order_no: string;
  status: string;
  total: number;
  delivery_fee: number;
  delivery_address: string | null;
  delivered_at: string | null;
  created_at: string;
};

function CourierHistory() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: cs } = await supabase
        .from("couriers")
        .select("id")
        .eq("user_id", user.id);
      const ids = (cs ?? []).map((c) => c.id);
      if (ids.length === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("orders")
        .select("id,order_no,status,total,delivery_fee,delivery_address,delivered_at,created_at")
        .in("courier_id", ids)
        .order("created_at", { ascending: false })
        .limit(100);
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-4 text-xl font-semibold">Riwayat Pengantaran</h1>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Belum ada riwayat.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">#{r.order_no}</span>
                <span className="text-xs capitalize text-muted-foreground">{r.status}</span>
              </div>
              {r.delivery_address && (
                <p className="text-xs text-muted-foreground line-clamp-1">{r.delivery_address}</p>
              )}
              <div className="mt-1 flex items-center justify-between text-xs">
                <span>{new Date(r.delivered_at ?? r.created_at).toLocaleString("id-ID")}</span>
                <span className="font-medium">Ongkir {formatIDR(Number(r.delivery_fee || 0))}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
