import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Package, ExternalLink, Loader2, FileText, Music, Video, Image, Code, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/akun/digital-products")({
  head: () => ({ meta: [{ title: "Produk Digital Saya — Akun" }] }),
  component: DigitalProductsPage,
});

type DigitalItem = {
  id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
  menu_item: {
    name: string;
    is_digital: boolean | null;
    digital_file_url: string | null;
    digital_file_name: string | null;
    image_url: string | null;
  } | null;
  order: {
    id: string;
    status: string;
    payment_status: string | null;
    created_at: string;
    shop: { name: string; slug: string } | null;
  } | null;
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function fmtPrice(n: number) {
  return `Rp ${Number(n).toLocaleString("id-ID")}`;
}

function fmtSize(kb: number | null) {
  if (!kb) return null;
  if (kb < 1024) return `${kb} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function FileIcon({ type }: { type: string | null }) {
  const t = (type ?? "").toLowerCase();
  if (["mp3","wav","ogg","aac","flac"].includes(t)) return <Music className="h-6 w-6 text-primary" />;
  if (["mp4","mov","avi","mkv"].includes(t)) return <Video className="h-6 w-6 text-primary" />;
  if (["jpg","jpeg","png","webp","svg","psd","ai"].includes(t)) return <Image className="h-6 w-6 text-primary" />;
  if (["js","ts","jsx","tsx","py","html","css","json"].includes(t)) return <Code className="h-6 w-6 text-primary" />;
  if (["zip","rar","7z","tar","gz"].includes(t)) return <Archive className="h-6 w-6 text-primary" />;
  return <FileText className="h-6 w-6 text-primary" />;
}

function DigitalProductsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<DigitalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Step 1: get paid order IDs for this user
        const { data: orders, error: oErr } = await supabase
          .from("orders" as any)
          .select("id")
          .eq("customer_user_id", user.id)
          .eq("payment_status", "paid");
        if (oErr) throw oErr;

        const orderIds: string[] = (orders ?? []).map((o: any) => o.id);
        if (orderIds.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }

        // Step 2: get digital order_items for those orders
        const { data, error: err } = await (supabase as any)
          .from("order_items")
          .select(`
            id, quantity, unit_price, created_at, order_id,
            menu_item:menu_items!inner(name, is_digital, digital_file_url, digital_file_name, image_url),
            order:orders!inner(id, status, payment_status, created_at, shop:shops(name, slug))
          `)
          .in("order_id", orderIds)
          .eq("menu_item.is_digital", true)
          .order("created_at", { ascending: false })
          .limit(100);
        if (err) {
          const msg: string = err.message ?? "";
          if (msg.includes("is_digital") || msg.includes("42703") || msg.includes("does not exist")) {
            // Column not yet added to menu_items — treat as no digital products
            setItems([]);
            return;
          }
          throw err;
        }
        setItems((data ?? []) as DigitalItem[]);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4 rounded-xl border border-border bg-card p-4">
              <Skeleton className="h-16 w-16 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-9 w-24 rounded-lg shrink-0" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Produk Digital Saya</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Semua produk digital yang pernah kamu beli — tersedia seumur hidup selama link aktif.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Gagal memuat: {error}
        </div>
      )}

      {!error && items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-14 text-center">
          <Package className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-3 text-base font-medium">Belum ada produk digital</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Produk digital seperti e-book, template, font, atau preset akan muncul di sini setelah pembelian dikonfirmasi.
          </p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">
            Jelajahi Marketplace →
          </Link>
        </div>
      )}

      {items.length > 0 && (
        <div className="space-y-3">
          {items.map(item => {
            const downloadUrl = item.menu_item?.digital_file_url ?? null;
            const hasDownload = !!downloadUrl;
            const fileName = item.menu_item?.digital_file_name ?? null;
            const fileType = fileName?.split(".").pop()?.toLowerCase() ?? null;
            return (
              <div key={item.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex gap-4">
                  <div className="shrink-0">
                    {item.menu_item?.image_url ? (
                      <img
                        src={item.menu_item.image_url}
                        alt={item.menu_item.name}
                        className="h-16 w-16 rounded-lg object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileIcon type={fileType} />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-snug">{item.menu_item?.name ?? "Produk Digital"}</p>
                        {item.order?.shop && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            dari{" "}
                            <Link
                              to="/toko/$slug"
                              params={{ slug: item.order.shop.slug }}
                              className="text-primary hover:underline"
                            >
                              {item.order.shop.name}
                            </Link>
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {fileType && (
                          <Badge variant="secondary" className="text-[10px] uppercase font-mono">
                            {fileType}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                      <span>Dibeli: {fmtDate(item.order?.created_at ?? item.created_at)}</span>
                      <span>{fmtPrice(item.unit_price)}</span>
                      {item.quantity > 1 && <span>× {item.quantity}</span>}
                    </div>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      {hasDownload ? (
                        <a
                          href={downloadUrl!}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                        >
                          <Button size="sm" className="gap-2 h-8">
                            <Download className="h-3.5 w-3.5" />
                            Unduh
                          </Button>
                        </a>
                      ) : (
                        <Button size="sm" variant="outline" disabled className="gap-2 h-8 text-muted-foreground">
                          <Download className="h-3.5 w-3.5" />
                          Link Belum Tersedia
                        </Button>
                      )}
                      {item.order?.id && (
                        <Link to="/akun/pesanan/$orderId" params={{ orderId: item.order.id }}>
                          <Button size="sm" variant="ghost" className="gap-1.5 h-8">
                            <ExternalLink className="h-3 w-3" />
                            Detail Pesanan
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {items.length} produk digital · Link download dari merchant — hubungi toko jika link tidak berfungsi.
        </p>
      )}
    </div>
  );
}
