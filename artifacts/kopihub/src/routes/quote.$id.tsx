import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calculator, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/quote/$id")({
  head: () => ({ meta: [{ title: "Penawaran Biaya" }] }),
  component: PublicQuoteView,
});

function PublicQuoteView() {
  const { id } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState<any | null>(null);
  const [acting, setActing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("custom_order_quotes")
        .select("id, total, breakdown, notes, valid_until, status, sent_at, created_at, request:custom_order_requests(customer_name, description), shop:coffee_shops(name, slug, logo_url)")
        .eq("id", id)
        .in("status", ["sent", "accepted", "rejected", "expired"])
        .maybeSingle();
      setQ(data);
      setLoading(false);
    })();
  }, [id]);

  const respond = async (status: "accepted" | "rejected") => {
    if (!q) return;
    setActing(true);
    const { error } = await (supabase as any).from("custom_order_quotes")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("id", q.id);
    if (error) { toast.error(error.message); setActing(false); return; }
    toast.success(status === "accepted" ? "Quote disetujui — merchant akan dihubungi" : "Quote ditolak");
    setQ({ ...q, status });
    setActing(false);
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!q) return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <Calculator className="mx-auto h-10 w-10 text-muted-foreground opacity-40" />
        <p className="mt-3 font-medium">Quote tidak ditemukan</p>
        <p className="mt-1 text-sm text-muted-foreground">Mungkin masih draft atau sudah dihapus.</p>
      </div>
    </div>
  );

  const expired = q.valid_until && new Date(q.valid_until) < new Date();

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          {q.shop?.logo_url && <img src={q.shop.logo_url} alt="" className="h-10 w-10 rounded-full object-cover" />}
          <div>
            <p className="text-xs text-muted-foreground">Penawaran biaya dari</p>
            <p className="font-semibold">{q.shop?.name ?? "Merchant"}</p>
          </div>
        </div>

        <h1 className="mt-5 text-xl font-bold">Estimasi untuk: {q.request?.customer_name}</h1>
        {q.request?.description && <p className="mt-1 text-sm text-muted-foreground">{q.request.description}</p>}

        <div className="mt-5 divide-y rounded-xl border">
          {(q.breakdown ?? []).map((it: any, i: number) => (
            <div key={i} className="flex items-start justify-between gap-3 p-3 text-sm">
              <div>
                <p className="font-medium">{it.name}</p>
                <p className="text-xs text-muted-foreground">{it.qty} × {formatIDR(it.price)}</p>
              </div>
              <p className="font-semibold">{formatIDR(it.qty * it.price)}</p>
            </div>
          ))}
          <div className="flex items-center justify-between p-3 bg-primary/5">
            <span className="font-bold">Total</span>
            <span className="text-xl font-bold text-primary">{formatIDR(q.total)}</span>
          </div>
        </div>

        {q.notes && (
          <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-semibold">Catatan & Syarat</p>
            <p className="mt-1 whitespace-pre-wrap">{q.notes}</p>
          </div>
        )}

        {q.valid_until && (
          <p className={`mt-3 text-xs ${expired ? "text-destructive" : "text-muted-foreground"}`}>
            Berlaku sampai: {new Date(q.valid_until).toLocaleDateString("id-ID", { dateStyle: "long" })}
            {expired && " — sudah expired"}
          </p>
        )}

        <div className="mt-6">
          {q.status === "sent" && !expired && (
            <div className="flex gap-2">
              <Button onClick={() => respond("accepted")} disabled={acting} className="flex-1 gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Setujui
              </Button>
              <Button onClick={() => respond("rejected")} disabled={acting} variant="outline" className="flex-1 gap-1.5">
                <XCircle className="h-4 w-4" /> Tolak
              </Button>
            </div>
          )}
          {q.status === "accepted" && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
              <CheckCircle2 className="h-4 w-4" /> Quote sudah disetujui
            </div>
          )}
          {q.status === "rejected" && (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              <XCircle className="h-4 w-4" /> Quote ditolak
            </div>
          )}
          {expired && q.status === "sent" && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-center text-sm text-amber-800">Quote sudah expired. Hubungi merchant untuk penawaran baru.</div>
          )}
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">Powered by UMKMgo</p>
    </div>
  );
}
