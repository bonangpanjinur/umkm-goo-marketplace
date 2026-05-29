import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  ShieldAlert, RefreshCw, CheckCircle2, EyeOff, Star,
  MessageSquare, Store, User, Clock, Loader2, AlertTriangle,
} from "lucide-react";

export const Route = createFileRoute("/admin/moderation")({
  head: () => ({ meta: [{ title: "Moderasi Konten — Admin" }] }),
  component: AdminModerationPage,
});

type FlaggedReview = {
  id: string;
  rating: number;
  body: string;
  is_hidden: boolean;
  is_flagged: boolean;
  flag_reason: string | null;
  created_at: string;
  shop_reply: string | null;
  shop: { name: string; slug: string } | null;
  reviewer: { full_name: string | null; email: string } | null;
  product: { name: string } | null;
};

type Tab = "pending" | "resolved";

export default function AdminModerationPage() {
  const [rows, setRows] = useState<FlaggedReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("pending");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("product_reviews")
      .select(`
        id, rating, body, is_hidden, is_flagged, flag_reason, created_at, shop_reply,
        shop:shops(name, slug),
        product:menu_items(name)
      `)
      .eq("is_flagged", true)
      .order("created_at", { ascending: false })
      .limit(100);
    if (!error) {
      const all = data ?? [];
      setRows(tab === "pending" ? all.filter((r: FlaggedReview) => !r.is_hidden) : all.filter((r: FlaggedReview) => r.is_hidden));
    }
    setLoading(false);
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const approve = async (id: string) => {
    setBusy(id);
    const { error } = await (supabase as any)
      .from("product_reviews")
      .update({ is_flagged: false, flag_reason: null })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Ulasan disetujui — flag dihapus"); load(); }
    setBusy(null);
  };

  const hide = async (id: string) => {
    setBusy(id);
    const { error } = await (supabase as any)
      .from("product_reviews")
      .update({ is_hidden: true, is_flagged: true })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Ulasan disembunyikan"); load(); }
    setBusy(null);
  };

  const restore = async (id: string) => {
    setBusy(id);
    const { error } = await (supabase as any)
      .from("product_reviews")
      .update({ is_hidden: false, is_flagged: false, flag_reason: null })
      .eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Ulasan dipulihkan"); load(); }
    setBusy(null);
  };

  const stars = (n: number) => Array.from({ length: 5 }, (_, i) => (
    <Star key={i} className={`h-3 w-3 ${i < n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
  ));

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  const pending = rows.filter(r => !r.is_hidden);
  const resolved = rows.filter(r => r.is_hidden);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6 text-amber-500" /> Moderasi Konten
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tinjau ulasan yang dilaporkan. Setujui untuk tetap tampil atau sembunyikan secara permanen.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Menunggu Review</p>
          <p className="text-2xl font-bold mt-1">{pending.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><EyeOff className="h-3.5 w-3.5 text-red-500" /> Disembunyikan</p>
          <p className="text-2xl font-bold mt-1">{resolved.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5 text-blue-500" /> Total Laporan</p>
          <p className="text-2xl font-bold mt-1">{rows.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Star className="h-3.5 w-3.5 text-amber-500" /> Rata-rata Rating</p>
          <p className="text-2xl font-bold mt-1">
            {rows.length > 0 ? (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1) : "—"}
          </p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={v => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="pending" className="gap-1.5">
            Menunggu Review
            {pending.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 leading-none">{pending.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved">Sudah Diproses ({resolved.length})</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Review list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.filter(r => tab === "pending" ? !r.is_hidden : r.is_hidden).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>{tab === "pending" ? "Tidak ada ulasan yang perlu ditinjau" : "Belum ada ulasan yang disembunyikan"}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.filter(r => tab === "pending" ? !r.is_hidden : r.is_hidden).map(r => (
            <Card key={r.id} className="p-4 space-y-3">
              {/* Meta row */}
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Store className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-medium">{(r.shop as any)?.name || "—"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <User className="h-3.5 w-3.5" />
                    <span>{(r.reviewer as any)?.full_name || (r.reviewer as any)?.email || "Anonim"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>{fmt(r.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">{stars(r.rating)}</div>
              </div>

              {/* Review body */}
              <div className="rounded-lg bg-muted/40 border border-border px-4 py-3 text-sm leading-relaxed">
                "{r.body}"
              </div>

              {/* Flag reason */}
              {r.flag_reason && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 px-3 py-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-800 dark:text-amber-300">Alasan pelaporan:</p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">{r.flag_reason}</p>
                  </div>
                </div>
              )}

              {/* Product */}
              {r.product && (
                <p className="text-xs text-muted-foreground">
                  Produk: <span className="font-medium">{(r.product as any).name}</span>
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                {tab === "pending" ? (
                  <>
                    <Button
                      size="sm" variant="outline"
                      className="gap-1.5 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                      onClick={() => approve(r.id)}
                      disabled={busy === r.id}
                    >
                      {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Setujui (Hapus Flag)
                    </Button>
                    <Button
                      size="sm" variant="outline"
                      className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => hide(r.id)}
                      disabled={busy === r.id}
                    >
                      {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
                      Sembunyikan
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm" variant="outline"
                    className="gap-1.5"
                    onClick={() => restore(r.id)}
                    disabled={busy === r.id}
                  >
                    {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                    Pulihkan Ulasan
                  </Button>
                )}
                <Badge variant="outline" className="text-xs ml-auto">ID: {r.id.slice(0, 8)}</Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
