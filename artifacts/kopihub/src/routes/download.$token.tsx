import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  CheckCircle2,
  AlertCircle,
  Clock,
  FileText,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Key,
  Copy,
} from "lucide-react";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/download/$token")({
  head: () => ({ meta: [{ title: "Unduh Produk — UMKMgo" }] }), component: DownloadPage });

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
  product_id: string;
  order_no: string | null;
  paid_at: string | null;
  shop_name: string;
  price: number;
  license_type: string | null;
};

export default function DownloadPage() {
  const { token } = Route.useParams();
  const [info, setInfo] = useState<DownloadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
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
        .select("id, order_no, payment_status, created_at, total, shops(name)")
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
        .select("id, name, description, price, download_url, download_limit, download_expires_hours, file_type, file_size_kb, license_type")
        .eq("id", productId)
        .maybeSingle();

      if (!product) { setError("Produk tidak ditemukan."); setLoading(false); return; }
      if (!product.download_url) { setError("URL download belum dikonfigurasi oleh toko."); setLoading(false); return; }

      // Check expiry
      let expiresAt: string | null = null;
      if (product.download_expires_hours) {
        const expiry = new Date(order.created_at);
        expiry.setHours(expiry.getHours() + product.download_expires_hours);
        expiresAt = expiry.toISOString();
        if (new Date() > expiry) {
          setError(`Link download sudah kadaluarsa (${product.download_expires_hours} jam setelah pembelian).`);
          setLoading(false);
          return;
        }
      }

      // Try to fetch current license from DB (server-side count)
      let dlCount = 0;
      let existingKey: string | null = null;
      try {
        const { data: lic } = await (supabase as any)
          .from("digital_licenses")
          .select("download_count, max_downloads, is_active, license_key")
          .eq("order_id", orderId)
          .eq("product_id", productId)
          .maybeSingle();

        if (lic) {
          dlCount = lic.download_count ?? 0;
          existingKey = lic.license_key ?? null;

          if (!lic.is_active) {
            setError("Lisensi unduhan ini telah dinonaktifkan. Hubungi toko untuk informasi lebih lanjut.");
            setLoading(false);
            return;
          }
          if (lic.max_downloads !== null && dlCount >= lic.max_downloads) {
            setError(`Batas unduhan sudah tercapai (${lic.max_downloads}×). Hubungi toko jika perlu unduh ulang.`);
            setLoading(false);
            return;
          }
        }
      } catch {
        // DB tables not yet created — fall back to localStorage
        const dlKey = `dl_count_${orderId}_${productId}`;
        dlCount = parseInt(localStorage.getItem(dlKey) ?? "0");
        if (product.download_limit && dlCount >= product.download_limit) {
          setError(`Batas unduhan sudah tercapai (${product.download_limit}×). Hubungi toko jika perlu unduh ulang.`);
          setLoading(false);
          return;
        }
      }

      if (existingKey) setLicenseKey(existingKey);

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
        product_id: productId,
        order_no: order.order_no,
        paid_at: order.created_at,
        shop_name: (order as any).shops?.name ?? "Toko",
        price: product.price,
        license_type: product.license_type ?? null,
      });
      setLoading(false);
    }
    load();
  }, [token]);

  async function handleDownload() {
    if (!info) return;
    setDownloading(true);

    // Try server-side tracking via RPC
    let newCount = info.download_count + 1;
    let serverKey: string | null = null;
    try {
      const { data: result, error: rpcErr } = await (supabase as any).rpc("record_download", {
        p_order_id: info.order_id,
        p_product_id: info.product_id,
      });

      if (!rpcErr && result) {
        if (result.ok === false) {
          if (result.reason === "limit_reached") {
            setError(`Batas unduhan sudah tercapai (${result.limit}×). Hubungi toko jika perlu unduh ulang.`);
            setDownloading(false);
            return;
          }
          if (result.reason === "revoked") {
            setError("Lisensi unduhan ini telah dinonaktifkan. Hubungi toko untuk informasi lebih lanjut.");
            setDownloading(false);
            return;
          }
        }
        if (result.ok) {
          newCount = result.download_count;
          serverKey = result.license_key ?? null;
        }
      }
    } catch {
      // Fallback: localStorage
      const dlKey = `dl_count_${info.order_id}_${info.product_id}`;
      localStorage.setItem(dlKey, String(newCount));
    }

    if (serverKey) setLicenseKey(serverKey);
    setInfo((i) => i ? { ...i, download_count: newCount } : i);

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
    return new Date(s).toLocaleString("id-ID", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
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

  const LICENSE_LABEL: Record<string, string> = {
    personal: "Lisensi Personal",
    commercial: "Lisensi Komersial",
    extended: "Lisensi Extended",
  };

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
                  <span className="font-mono font-medium">
                    {info.order_no ?? info.order_id.slice(0, 8)}
                  </span>
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
                {info.license_type && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tipe Lisensi</span>
                    <Badge className="bg-purple-100 text-purple-800">
                      {LICENSE_LABEL[info.license_type] ?? info.license_type}
                    </Badge>
                  </div>
                )}
                {info.download_limit && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sisa Unduhan</span>
                    <Badge
                      variant={
                        info.download_count >= info.download_limit - 1 ? "destructive" : "secondary"
                      }
                    >
                      {Math.max(0, info.download_limit - info.download_count)}× dari {info.download_limit}×
                    </Badge>
                  </div>
                )}
                {info.expires_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Link Kadaluarsa</span>
                    <span
                      className={`flex items-center gap-1 ${isExpiringSoon() ? "text-amber-600 font-medium" : ""}`}
                    >
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

              <Button
                className="w-full"
                size="lg"
                onClick={handleDownload}
                disabled={downloading}
              >
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

            {/* License key card (shown after first download) */}
            {licenseKey && (
              <Card className="p-4 border-purple-200 bg-purple-50/60">
                <div className="flex items-center gap-2 mb-2">
                  <Key className="h-4 w-4 text-purple-600" />
                  <p className="text-sm font-semibold text-purple-800">License Key Anda</p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono bg-white border border-purple-200 rounded px-3 py-2 tracking-widest">
                    {licenseKey}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-purple-300 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(licenseKey);
                      toast.success("License key disalin");
                    }}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="text-xs text-purple-600 mt-2">
                  Simpan license key ini — diperlukan untuk verifikasi kepemilikan produk.
                </p>
              </Card>
            )}

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
