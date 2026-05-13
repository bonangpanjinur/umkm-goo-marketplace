import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Loader2, ChevronLeft, Search, Sparkles, Calendar, Package } from "lucide-react";
import { toast } from "sonner";
import { CustomOrderTimeline, type TimelineEntry } from "@/components/CustomOrderTimeline";

type Req = {
  id: string;
  product_id: string | null;
  product_name: string | null;
  customer_name: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  reference_image_url: string | null;
  status: string;
  owner_note: string | null;
  created_at: string;
  updated_at: string;
  history?: TimelineEntry[];
};

const STORAGE_KEY = (slug: string) => `kopihub:custom-order-contact:${slug}`;

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending: { label: "Menunggu review", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  accepted: { label: "Diterima", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  in_progress: { label: "Sedang dikerjakan", cls: "bg-blue-100 text-blue-800 border-blue-200" },
  completed: { label: "Selesai", cls: "bg-green-100 text-green-800 border-green-200" },
  rejected: { label: "Ditolak", cls: "bg-rose-100 text-rose-800 border-rose-200" },
  cancelled: { label: "Dibatalkan", cls: "bg-muted text-muted-foreground border-border" },
};

function fmtRp(n: number | null) {
  if (n == null) return null;
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}

function fmtDate(s: string | null) {
  if (!s) return "-";
  return new Date(s).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}

export const Route = createFileRoute("/toko/$slug/custom-order/status")({
  component: CustomOrderStatusPage,
});

function CustomOrderStatusPage() {
  const { slug } = Route.useParams();
  const [shop, setShop] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState("");
  const [searching, setSearching] = useState(false);
  const [rows, setRows] = useState<Req[] | null>(null);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("coffee_shops").select("id, name").eq("slug", slug).maybeSingle();
      if (s) setShop(s);
      const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY(slug)) : null;
      if (saved) {
        setContact(saved);
        await load(saved);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  async function load(value: string, opts?: { silent?: boolean }) {
    const v = value.trim();
    if (v.replace(/\D/g, "").length < 6) {
      if (!opts?.silent) toast.error("Masukkan nomor WhatsApp yang valid");
      return;
    }
    if (!opts?.silent) setSearching(true);
    const { data, error } = await supabase.rpc("get_customer_custom_orders", {
      p_shop_slug: slug,
      p_contact: v,
    });
    if (!opts?.silent) setSearching(false);
    if (error) { if (!opts?.silent) toast.error(error.message); return; }
    setRows((data ?? []) as Req[]);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY(slug), v);
  }

  // Realtime: refresh saat ada perubahan request atau riwayat status.
  // Channel name di-suffix dengan hash kontak supaya event tidak menyebar antar customer/tab.
  useEffect(() => {
    if (!rows || rows.length === 0) return;
    const ids = new Set(rows.map(r => r.id));
    const contactKey = contact.replace(/\D/g, "").slice(-10) || "anon";
    const ch = supabase
      .channel(`cor-customer-${slug}-${contactKey}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "custom_order_requests" },
        (payload: any) => {
          const id = payload?.new?.id ?? payload?.old?.id;
          if (id && ids.has(id)) load(contact, { silent: true });
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "custom_order_status_history" },
        (payload: any) => {
          const rid = payload?.new?.request_id;
          if (rid && ids.has(rid)) load(contact, { silent: true });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, slug, contact]);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!shop) return <div className="p-12 text-center">Toko tidak ditemukan.</div>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketplaceHeader />
      <main className="flex-1 mx-auto max-w-3xl w-full px-4 py-8">
        <Link to="/toko/$slug" params={{ slug }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4" /> Kembali ke {shop.name}
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6">
          <h1 className="text-xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Status Custom Order</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Masukkan nomor WhatsApp yang sama dengan saat kamu mengirim permintaan untuk melihat progressnya.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); load(contact); }}
            className="mt-4 flex flex-col sm:flex-row gap-2 sm:items-end"
          >
            <div className="flex-1">
              <Label>WhatsApp / kontak</Label>
              <Input className="mt-1" value={contact} onChange={e => setContact(e.target.value)} placeholder="08xxxxxxxxxx" />
            </div>
            <Button type="submit" disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Cek Status
            </Button>
          </form>
        </div>

        <div className="mt-6 space-y-3">
          {rows === null ? (
            <p className="text-sm text-muted-foreground text-center py-8">Belum ada pencarian. Masukkan kontak kamu di atas.</p>
          ) : rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-8 text-center">
              <p className="text-sm text-muted-foreground">Tidak ada permintaan custom order ditemukan untuk kontak ini.</p>
              <Link to="/toko/$slug/custom-order" params={{ slug }}>
                <Button variant="outline" className="mt-4">Kirim Permintaan Baru</Button>
              </Link>
            </div>
          ) : (
            rows.map((r) => {
              const meta = STATUS_META[r.status] ?? { label: r.status, cls: "bg-muted text-muted-foreground border-border" };
              return (
                <div key={r.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold truncate">{r.customer_name}</h3>
                        <Badge variant="outline" className={meta.cls}>{meta.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Dikirim {fmtDate(r.created_at)} · Update {fmtDate(r.updated_at)}
                      </p>
                    </div>
                  </div>

                  {r.product_name && (
                    <p className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Package className="h-3 w-3" /> Produk: <span className="text-foreground">{r.product_name}</span>
                    </p>
                  )}

                  <p className="mt-3 text-sm whitespace-pre-line">{r.description}</p>

                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {(r.budget_min || r.budget_max) && (
                      <span>Budget: {fmtRp(r.budget_min) ?? "-"} – {fmtRp(r.budget_max) ?? "-"}</span>
                    )}
                    {r.deadline && (
                      <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> Deadline {fmtDate(r.deadline)}</span>
                    )}
                  </div>

                  {r.reference_image_url && (
                    <a href={r.reference_image_url} target="_blank" rel="noreferrer" className="mt-3 inline-block">
                      <img src={r.reference_image_url} alt="Referensi" className="h-24 w-24 rounded-lg object-cover border border-border" />
                    </a>
                  )}

                  {r.owner_note && (
                    <div className="mt-3 rounded-lg bg-muted/60 p-3 text-sm">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Catatan dari penjual</p>
                      <p className="whitespace-pre-line">{r.owner_note}</p>
                    </div>
                  )}

                  {r.history && r.history.length > 0 && (
                    <div className="mt-4 border-t border-border pt-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Riwayat status</p>
                      <CustomOrderTimeline history={r.history} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
      <MarketplaceFooter />
    </div>
  );
}
