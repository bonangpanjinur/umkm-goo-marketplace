import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, CheckCircle2, AlertCircle, Clock, FileText, Loader2, ExternalLink, ShieldCheck } from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/download/$token")({ component: DownloadPage });

type DownloadInfo = {
  product_name: string;
  product_description: string | null;
  download_url: string;
  file_type: string | null;
  file_size_kb: number | null;
  download_limit: number | null;
  download_count: number;
  expires_at: string | null;
  order_id: string;
  order_number: string | null;
  paid_at: string | null;
  shop_name: string;
  price: number;
};

export default function DownloadPage() {
  const { token } = Route.useParams();
  const [info, setInfo] = useState<DownloadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      // The token is: base64(orderId:productId)
      let orderId: string, productId: string;
      try {
        const decoded = atob(token);
        [orderId, productId] = decoded.split(":");
        if (!orderId || !productId) throw new Error("invalid");
      } catch {
        setError("Link download tidak valid atau sudah kadaluarsa.");
        setLoading(false);
        return;
      }

      // Fetch order
      const { data: order } = await (supabase as any)
        .from("orders")
        .select("id, order_number, payment_status, created_at, total_price, coffee_shops(name)")
        .eq("id", orderId)
        .maybeSingle();

      if (!order) { setError("Pesanan tidak ditemukan."); setLoading(false); return; }
      if (order.payment_status !== "paid") {
        setError("Pembayaran belum dikonfirmasi. Silakan tunggu atau hubungi toko.");
        setLoading(false);
        return;
      }

      // Fetch product
      const { data: product } = await (supabase as any)
        .from("menu_items")
        .select("id, name, description, price, download_url, download_limit, download_expires_hours, file_type, file_size_kb")
        .eq("id", productId)
        .maybeSingle();

      if (!product) { setError("Produk tidak ditemukan."); setLoading(false); return; }
      if (!product.download_url) { setError("URL download belum dikonfigurasi oleh toko."); setLoading(false); return; }

      // Check expiry
      if (product.download_expires_hours) {
        const expiry = new Date(order.created_at);
        expiry.setHours(expiry.getHours() + product.download_expires_hours);
        if (new Date() > expiry) {
          setError(`Link download sudah kadaluarsa (${product.download_expires_hours} jam setelah pembelian).`);
          setLoading(false);
          return;
        }
      }

      // Get/init download count from localStorage (proxy for real download_count)
      const dlKey = `dl_count_${orderId}_${productId}`;
      const dlCount = parseInt(localStorage.getItem(dlKey) ?? "0");

      if (product.download_limit && dlCount >= product.download_limit) {
        setError(`Batas unduhan sudah tercapai (${product.download_limit}x). Hubungi toko jika perlu unduh ulang.`);
        setLoading(false);
        return;
      }

      const expiresAt = product.download_expires_hours
        ? (() => { const d = new Date(order.created_at); d.setHours(d.getHours() + product.download_expires_hours!); return d.toISOString(); })()
        : null;

      setInfo({
        product_name: product.name,
        product_description: product.description,
        download_url: product.download_url,
        file_type: product.file_type,
        file_size_kb: product.file_size_kb,
        download_limit: product.download_limit,
        download_count: dlCount,
        expires_at: expiresAt,
        order_id: order.id,
        order_number: order.order_number,
        paid_at: order.created_at,
        shop_name: (order as any).coffee_shops?.name ?? "Toko",
        price: product.price,
      });
      setLoading(false);
    }
    load();
  }, [token]);

  async function handleDownload() {
    if (!info) return;
    setDownloading(true);
    const dlKey = `dl_count_${info.order_id}_${token.split(":")[1]}`;
    const newCount = info.download_count + 1;
    localStorage.setItem(dlKey, String(newCount));
    setInfo(i => i ? { ...i, download_count: newCount } : i);

    // Trigger download
    const a = document.createElement("a");
    a.href = info.download_url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.download = info.product_name;
    a.click();

    setDownloading(false);
    setDownloaded(true);
  }

  function fmtDate(s: string | null) {
    if (!s) return "—";
    return new Date(s).toLocaleString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function formatFileSize(kb: number | null) {
    if (!kb) return "—";
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  }

  function isExpiringSoon() {
    if (!info?.expires_at) return false;
    const diff = new Date(info.expires_at).getTime() - Date.now();
    return diff > 0 && diff < 24 * 60 * 60 * 1000;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        {/* Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-primary font-bold text-lg mb-2">
            <ShieldCheck className="h-5 w-5" /> UMKMgo
          </Link>
          <p className="text-sm text-muted-foreground">Halaman Unduh Produk Digital</p>
        </div>

        {loading && (
          <Card className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Memverifikasi link download...</p>
          </Card>
        )}

        {error && (
          <Card className="p-6 text-center border-destructive/30">
            <AlertCircle className="h-10 w-10 text-destructive mx-auto mb-3" />
            <h2 className="font-semibold mb-2">Tidak Bisa Mengunduh</h2>
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button asChild className="mt-4" variant="outline">
              <Link to="/akun/pesanan">Lihat Pesanan</Link>
            </Button>
          </Card>
        )}

        {info && (
          <>
            <Card className="p-6">
              <div className="flex items-start gap-4 mb-5">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-7 w-7 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-lg leading-tight">{info.product_name}</h2>
                  <p className="text-sm text-muted-foreground">{info.shop_name}</p>
                  {info.product_description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{info.product_description}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2.5 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Nomor Pesanan</span>
                  <span className="font-mono font-medium">{info.order_number ?? info.order_id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tanggal Pembelian</span>
                  <span>{fmtDate(info.paid_at)}</span>
                </div>
                {info.file_type && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tipe File</span>
                    <Badge variant="secondary">{info.file_type.toUpperCase()}</Badge>
                  </div>
                )}
                {info.file_size_kb && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ukuran File</span>
                    <span>{formatFileSize(info.file_size_kb)}</span>
                  </div>
                )}
                {info.download_limit && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sisa Unduhan</span>
                    <Badge variant={info.download_count >= info.download_limit - 1 ? "destructive" : "secondary"}>
                      {info.download_limit - info.download_count}x dari {info.download_limit}x
                    </Badge>
                  </div>
                )}
                {info.expires_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Link Kadaluarsa</span>
                    <span className={`flex items-center gap-1 ${isExpiringSoon() ? "text-amber-600 font-medium" : ""}`}>
                      {isExpiringSoon() && <Clock className="h-3.5 w-3.5" />}
                      {fmtDate(info.expires_at)}
                    </span>
                  </div>
                )}
              </div>

              {isExpiringSoon() && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 mb-4 text-sm text-amber-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 shrink-0" />
                  Link download akan kadaluarsa dalam kurang dari 24 jam!
                </div>
              )}

              {downloaded && (
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 mb-4 text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Berhasil! Jika unduhan tidak otomatis, klik tombol di bawah sekali lagi.
                </div>
              )}

              <Button className="w-full" size="lg" onClick={handleDownload} disabled={downloading}>
                {downloading ? (
                  <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Memproses...</>
                ) : (
                  <><Download className="h-5 w-5 mr-2" /> {downloaded ? "Unduh Lagi" : "Unduh Sekarang"}</>
                )}
              </Button>

              {info.download_url.startsWith("http") && (
                <Button variant="ghost" size="sm" className="w-full mt-2" asChild>
                  <a href={info.download_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-1.5" /> Buka di tab baru
                  </a>
                </Button>
              )}
            </Card>

            <p className="text-xs text-center text-muted-foreground">
              Butuh bantuan? Hubungi <strong>{info.shop_name}</strong> atau{" "}
              <Link to="/" className="text-primary hover:underline">tim support</Link>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
