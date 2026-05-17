import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getPaymentStatus } from "@/lib/payment-gateway";
import { Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Redirect handler untuk Midtrans Snap (mode redirect / non-popup).
 * Truth source pembayaran TETAP webhook server (api-server `/api/payments/webhook/midtrans`).
 * Halaman ini hanya menampilkan status — tidak menulis ke DB.
 *
 * URL pattern: `/booking/:id/payment-callback`
 * Midtrans akan menambahkan query: ?order_id=booking-<uuid>&status_code=200&transaction_status=settlement
 */
export const Route = createFileRoute("/booking/$id/payment-callback")({
  component: PaymentCallbackPage,
});

type UiStatus = "loading" | "paid" | "pending" | "failed";

function PaymentCallbackPage() {
  const { id } = Route.useParams();
  const [status, setStatus] = useState<UiStatus>("loading");
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const orderId = `booking-${id}`;
    const MAX_ATTEMPTS = 20; // ~60 detik (interval 3 detik)

    const poll = async () => {
      try {
        const result = await getPaymentStatus(orderId);
        if (cancelled) return;
        if (result.status === "paid") {
          setStatus("paid");
          return;
        }
        if (result.status === "failed" || result.status === "expired") {
          setStatus("failed");
          return;
        }
        setAttempts((n) => n + 1);
      } catch {
        setAttempts((n) => n + 1);
      }
    };

    poll();
    const iv = setInterval(() => {
      if (cancelled) return;
      setAttempts((n) => {
        if (n >= MAX_ATTEMPTS) {
          setStatus((s) => (s === "loading" ? "pending" : s));
          clearInterval(iv);
          return n;
        }
        return n;
      });
      poll();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <h1 className="text-xl font-semibold">Memverifikasi pembayaran…</h1>
            <p className="text-sm text-muted-foreground">
              Mohon tunggu sebentar. Kami sedang memeriksa status pembayaran dari gateway.
            </p>
          </>
        )}

        {status === "paid" && (
          <>
            <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto" />
            <h1 className="text-xl font-semibold">Pembayaran berhasil</h1>
            <p className="text-sm text-muted-foreground">
              DP booking Anda sudah lunas. Booking ID:{" "}
              <span className="font-mono">{id}</span>
            </p>
            <Button asChild className="mt-2">
              <Link to="/">Kembali ke beranda</Link>
            </Button>
          </>
        )}

        {status === "pending" && (
          <>
            <Clock className="h-12 w-12 text-amber-500 mx-auto" />
            <h1 className="text-xl font-semibold">Menunggu konfirmasi</h1>
            <p className="text-sm text-muted-foreground">
              Pembayaran Anda sedang diproses. Status akan diperbarui otomatis setelah
              gateway mengirim konfirmasi. Anda boleh menutup halaman ini.
            </p>
            <Button asChild variant="outline" className="mt-2">
              <Link to="/">Kembali ke beranda</Link>
            </Button>
          </>
        )}

        {status === "failed" && (
          <>
            <XCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h1 className="text-xl font-semibold">Pembayaran gagal</h1>
            <p className="text-sm text-muted-foreground">
              Pembayaran tidak dapat diproses atau kedaluwarsa. Silakan coba lagi
              dari halaman booking.
            </p>
            <Button asChild variant="outline" className="mt-2">
              <Link to="/">Kembali ke beranda</Link>
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
