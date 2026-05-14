import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Bell, MessageCircle, Search, Loader2, Package, RefreshCw,
  ExternalLink, CheckCircle2, Send, Megaphone, AlertTriangle, Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/pos-app/restock-notify")({
  head: () => ({ meta: [{ title: "Notifikasi Pelanggan Menunggu — Merchant" }] }),
  component: RestockNotifyPage,
});

const SETUP_SQL = `-- Jalankan sekali di Supabase SQL Editor:
create table if not exists public.restock_subscribers (
  id            uuid        primary key default gen_random_uuid(),
  shop_id       uuid        not null references public.coffee_shops(id) on delete cascade,
  product_id    uuid        not null references public.menu_items(id)   on delete cascade,
  product_name  text        not null,
  customer_wa   text        not null,
  customer_name text,
  subscribed_at timestamptz not null default now(),
  notified_at   timestamptz,
  unique (product_id, customer_wa)
);
alter table public.restock_subscribers enable row level security;
create policy "restock_sub_insert_anyone" on public.restock_subscribers
  for insert with check (true);
create policy "restock_sub_owner_select" on public.restock_subscribers
  for select using (shop_id in (select id from public.coffee_shops where owner_id = auth.uid()));
create policy "restock_sub_owner_update" on public.restock_subscribers
  for update using (shop_id in (select id from public.coffee_shops where owner_id = auth.uid()));
create policy "restock_sub_owner_delete" on public.restock_subscribers
  for delete using (shop_id in (select id from public.coffee_shops where owner_id = auth.uid()));`;

type Subscriber = {
  id: string;
  product_id: string;
  product_name: string;
  customer_wa: string;
  customer_name: string | null;
  subscribed_at: string;
  notified_at: string | null;
};

type ProductGroup = {
  product_id: string;
  product_name: string;
  stock: number | null;
  is_available: boolean;
  track_stock: boolean;
  image_url: string | null;
  subscribers: Subscriber[];
  notified_count: number;
  pending_count: number;
};

function waLink(phone: string, message: string) {
  const clean = phone.replace(/\D/g, "").replace(/^0/, "62");
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

function buildBlastMessage(productName: string, shopName: string): string {
  return `Halo! 👋

Kabar gembira — *${productName}* di *${shopName}* kini sudah tersedia kembali! 🎉

Stok terbatas, segera pesan sebelum habis lagi ya.

Kunjungi toko kami sekarang!`;
}

function formatWA(wa: string): string {
  const clean = wa.replace(/\D/g, "");
  return clean.startsWith("62") ? `+${clean}` : clean.startsWith("0") ? `+62${clean.slice(1)}` : `+62${clean}`;
}

export default function RestockNotifyPage() {
  const { shop } = useCurrentShop();
  const [groups, setGroups] = useState<ProductGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "notified">("all");
  const [notifying, setNotifying] = useState<string | null>(null);

  const shopId = (shop as any)?.id as string | undefined;
  const shopName = (shop as any)?.name as string | undefined;

  async function load() {
    if (!shopId) return;
    setLoading(true);
    try {
      const { data: subs, error } = await (supabase as any)
        .from("restock_subscribers")
        .select("id, product_id, product_name, customer_wa, customer_name, subscribed_at, notified_at")
        .eq("shop_id", shopId)
        .order("subscribed_at", { ascending: false });

      if (error) {
        if (error.code === "42P01" || error.message?.includes("does not exist")) {
          setTableReady(false);
          setLoading(false);
          return;
        }
        throw error;
      }

      const subscribers: Subscriber[] = subs ?? [];

      const productIds = [...new Set(subscribers.map((s: Subscriber) => s.product_id))];

      let itemMap: Record<string, { stock: number | null; is_available: boolean; track_stock: boolean; image_url: string | null }> = {};
      if (productIds.length > 0) {
        const { data: items } = await supabase
          .from("menu_items")
          .select("id, stock_qty, is_available, track_stock, image_url")
          .in("id", productIds);

        for (const it of items ?? []) {
          itemMap[(it as any).id] = {
            stock: (it as any).stock_qty ?? null,
            is_available: (it as any).is_available ?? true,
            track_stock: (it as any).track_stock ?? false,
            image_url: (it as any).image_url ?? null,
          };
        }
      }

      const groupMap: Record<string, ProductGroup> = {};
      for (const sub of subscribers) {
        if (!groupMap[sub.product_id]) {
          const info = itemMap[sub.product_id];
          groupMap[sub.product_id] = {
            product_id: sub.product_id,
            product_name: sub.product_name,
            stock: info?.stock ?? null,
            is_available: info?.is_available ?? true,
            track_stock: info?.track_stock ?? false,
            image_url: info?.image_url ?? null,
            subscribers: [],
            notified_count: 0,
            pending_count: 0,
          };
        }
        groupMap[sub.product_id].subscribers.push(sub);
        if (sub.notified_at) groupMap[sub.product_id].notified_count++;
        else groupMap[sub.product_id].pending_count++;
      }

      setGroups(Object.values(groupMap).sort((a, b) => b.pending_count - a.pending_count));
      setTableReady(true);
    } catch (err: any) {
      toast.error("Gagal memuat data: " + (err?.message ?? "Unknown error"));
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [shopId]);

  async function markNotified(subscriberId: string) {
    await (supabase as any)
      .from("restock_subscribers")
      .update({ notified_at: new Date().toISOString() })
      .eq("id", subscriberId);
    await load();
  }

  async function markAllNotified(productId: string) {
    setNotifying(productId);
    const ids = groups
      .find(g => g.product_id === productId)
      ?.subscribers.filter(s => !s.notified_at)
      .map(s => s.id) ?? [];
    if (ids.length > 0) {
      await (supabase as any)
        .from("restock_subscribers")
        .update({ notified_at: new Date().toISOString() })
        .in("id", ids);
    }
    await load();
    setNotifying(null);
    toast.success("Semua pelanggan ditandai sudah dinotifikasi.");
  }

  async function removeSubscriber(id: string) {
    await (supabase as any).from("restock_subscribers").delete().eq("id", id);
    await load();
    toast.success("Subscriber dihapus.");
  }

  async function removeProduct(productId: string) {
    await (supabase as any).from("restock_subscribers").delete().eq("product_id", productId).eq("shop_id", shopId);
    await load();
    toast.success("Semua subscriber produk dihapus.");
  }

  const filtered = useMemo(() => {
    return groups
      .filter(g => g.product_name.toLowerCase().includes(search.toLowerCase()))
      .filter(g => {
        if (filter === "pending") return g.pending_count > 0;
        if (filter === "notified") return g.notified_count > 0 && g.pending_count === 0;
        return true;
      });
  }, [groups, search, filter]);

  const totalPending = groups.reduce((s, g) => s + g.pending_count, 0);
  const totalNotified = groups.reduce((s, g) => s + g.notified_count, 0);

  if (!tableReady) {
    return (
      <div className="p-6 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">Notifikasi Pelanggan Menunggu</h1>
        </div>
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-base">
              <AlertTriangle className="h-5 w-5" />
              Setup Diperlukan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Tabel <code className="bg-amber-100 dark:bg-amber-900 rounded px-1 font-mono text-xs">restock_subscribers</code> belum ada.
              Jalankan SQL berikut sekali di <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="underline font-medium">Supabase SQL Editor</a>:
            </p>
            <pre className="text-xs bg-amber-100 dark:bg-amber-900/40 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap text-amber-900 dark:text-amber-200 select-all">
              {SETUP_SQL}
            </pre>
            <Button onClick={load} variant="outline" size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" /> Cek Ulang
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notifikasi Pelanggan Menunggu
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pelanggan yang ingin dinotifikasi saat produk stok habis tersedia kembali
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} className="gap-2 self-start sm:self-auto">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="text-center">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-amber-600">{totalPending}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Belum Dinotifikasi</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold text-green-600">{totalNotified}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Sudah Dinotifikasi</div>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-4 pb-3">
            <div className="text-2xl font-bold">{groups.length}</div>
            <div className="text-xs text-muted-foreground mt-0.5">Produk</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari produk..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          {(["all", "pending", "notified"] as const).map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "Semua" : f === "pending" ? "Menunggu" : "Sudah Dikirim"}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Memuat...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground space-y-2">
          <Package className="h-10 w-10 mx-auto opacity-30" />
          <p className="font-medium">
            {groups.length === 0
              ? "Belum ada pelanggan yang mendaftar notifikasi restock"
              : "Tidak ada hasil untuk filter ini"}
          </p>
          {groups.length === 0 && (
            <p className="text-xs max-w-xs mx-auto">
              Pelanggan bisa mendaftar dari halaman produk saat stok habis. Mereka memasukkan nomor WhatsApp dan akan muncul di sini.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {filtered.map(group => {
            const isOutOfStock = (group.track_stock && (group.stock ?? 0) <= 0) || !group.is_available;
            const blastMsg = buildBlastMessage(group.product_name, shopName ?? "Toko Kami");
            const pendingSubs = group.subscribers.filter(s => !s.notified_at);

            return (
              <Card key={group.product_id} className={isOutOfStock ? "border-red-200 dark:border-red-800" : "border-green-200 dark:border-green-800"}>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {group.image_url ? (
                        <img src={group.image_url} alt={group.product_name} className="h-12 w-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <h2 className="font-semibold text-base leading-tight">{group.product_name}</h2>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {isOutOfStock ? (
                            <Badge variant="destructive" className="text-xs">Stok Habis</Badge>
                          ) : (
                            <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100 text-xs">Tersedia</Badge>
                          )}
                          {group.stock !== null && (
                            <span className="text-xs text-muted-foreground">Stok: {group.stock}</span>
                          )}
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Bell className="h-3 w-3" />
                            {group.pending_count} menunggu
                          </Badge>
                          {group.notified_count > 0 && (
                            <Badge className="bg-green-50 text-green-700 border border-green-200 hover:bg-green-50 text-xs gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              {group.notified_count} sudah dikirim
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 shrink-0">
                      {pendingSubs.length > 0 && (
                        <>
                          {/* WhatsApp blast link opens for first pending subscriber, rest must be done manually */}
                          {pendingSubs.length === 1 ? (
                            <a
                              href={waLink(pendingSubs[0].customer_wa, blastMsg)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => markNotified(pendingSubs[0].id)}
                            >
                              <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                                <MessageCircle className="h-4 w-4" />
                                Kirim WA
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </a>
                          ) : (
                            <a
                              href={waLink(pendingSubs[0].customer_wa, blastMsg)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <Button size="sm" variant="outline" className="gap-2 border-green-300 text-green-700 hover:bg-green-50">
                                <Megaphone className="h-4 w-4" />
                                Blast Satu per Satu
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </a>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            disabled={notifying === group.product_id}
                            onClick={() => markAllNotified(group.product_id)}
                          >
                            {notifying === group.product_id
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <CheckCircle2 className="h-4 w-4" />}
                            Tandai Semua Dikirim
                          </Button>
                        </>
                      )}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="gap-2 text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus semua subscriber?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Ini akan menghapus semua {group.subscribers.length} subscriber untuk produk <strong>{group.product_name}</strong>. Tidak bisa dibatalkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => removeProduct(group.product_id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              Hapus
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>

                  {/* WA blast template preview */}
                  {pendingSubs.length > 1 && (
                    <details className="mt-3">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground select-none">
                        Lihat template pesan WhatsApp ({pendingSubs.length} penerima)
                      </summary>
                      <div className="mt-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-2">
                        <pre className="text-xs whitespace-pre-wrap text-green-900 dark:text-green-200 font-sans">{blastMsg}</pre>
                        <p className="text-xs text-muted-foreground">
                          Klik "Kirim WA" di masing-masing baris di bawah untuk membuka WhatsApp Web dengan pesan ini.
                        </p>
                      </div>
                    </details>
                  )}
                </CardHeader>

                <CardContent className="pt-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Pelanggan</TableHead>
                        <TableHead className="text-xs">Nomor WhatsApp</TableHead>
                        <TableHead className="text-xs">Daftar Sejak</TableHead>
                        <TableHead className="text-xs">Status</TableHead>
                        <TableHead className="text-xs w-24">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.subscribers.map(sub => (
                        <TableRow key={sub.id} className={sub.notified_at ? "opacity-60" : ""}>
                          <TableCell className="text-sm font-medium">
                            {sub.customer_name || <span className="text-muted-foreground italic">—</span>}
                          </TableCell>
                          <TableCell className="text-sm font-mono">
                            {formatWA(sub.customer_wa)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(sub.subscribed_at).toLocaleDateString("id-ID", {
                              day: "numeric", month: "short", year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            {sub.notified_at ? (
                              <Badge className="bg-green-100 text-green-700 border border-green-200 hover:bg-green-100 text-xs gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Terkirim
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Bell className="h-3 w-3" />
                                Menunggu
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {!sub.notified_at && (
                                <a
                                  href={waLink(sub.customer_wa, blastMsg)}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={() => markNotified(sub.id)}
                                  title="Kirim WhatsApp & tandai terkirim"
                                >
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50">
                                    <Send className="h-3.5 w-3.5" />
                                  </Button>
                                </a>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                onClick={() => removeSubscriber(sub.id)}
                                title="Hapus subscriber"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
