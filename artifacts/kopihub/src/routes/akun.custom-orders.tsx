import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, Sparkles, ChevronRight, Store } from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/akun/custom-orders")({
  head: () => ({ meta: [{ title: "Custom Order Saya · Akun" }] }),
  component: CustomOrdersPage,
});

type Row = {
  id: string;
  shop_id: string;
  description: string;
  status: string;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  created_at: string;
  shop: { name: string; slug: string } | null;
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:   { label: "Menunggu respon",  cls: "bg-amber-100 text-amber-700" },
  reviewing: { label: "Sedang ditinjau",  cls: "bg-blue-100 text-blue-700" },
  quoted:    { label: "Penawaran masuk",  cls: "bg-violet-100 text-violet-700" },
  accepted:  { label: "Diterima",         cls: "bg-emerald-100 text-emerald-700" },
  in_progress:{ label: "Sedang dikerjakan", cls: "bg-blue-100 text-blue-700" },
  completed: { label: "Selesai",          cls: "bg-emerald-100 text-emerald-700" },
  rejected:  { label: "Ditolak",          cls: "bg-red-100 text-red-700" },
  cancelled: { label: "Dibatalkan",       cls: "bg-muted text-muted-foreground" },
};

function CustomOrdersPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("custom_order_requests")
        .select("id, shop_id, description, status, budget_min, budget_max, deadline, created_at, shop:shops(name, slug)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Custom Order Saya</h2>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-muted-foreground opacity-30" />
          <p className="mt-3 text-sm text-muted-foreground">Belum ada permintaan custom order.</p>
          <p className="text-xs text-muted-foreground mt-1">Buka halaman toko dan klik "Custom Order" untuk mengirim brief.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const meta = STATUS_META[r.status] ?? { label: r.status, cls: "bg-muted text-muted-foreground" };
            return (
              <li key={r.id}>
                <Link
                  to="/toko/$slug/custom-order/status"
                  params={{ slug: r.shop?.slug ?? "" }}
                  className="block rounded-2xl border border-border bg-card p-4 hover:border-primary/40 transition"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-semibold truncate">{r.shop?.name ?? "Toko"}</span>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-foreground/80 line-clamp-2">{r.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    {(r.budget_min || r.budget_max) && (
                      <span>Budget: {r.budget_min ? formatIDR(r.budget_min) : "—"}{r.budget_max ? ` – ${formatIDR(r.budget_max)}` : ""}</span>
                    )}
                    {r.deadline && <span>Deadline: {new Date(r.deadline).toLocaleDateString("id-ID")}</span>}
                    <span>Dikirim: {new Date(r.created_at).toLocaleDateString("id-ID")}</span>
                    <span className="ml-auto inline-flex items-center gap-1 text-primary font-medium">Detail <ChevronRight className="h-3 w-3" /></span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
