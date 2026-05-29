import { createFileRoute, useSearch, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Star, CheckCircle, ArrowLeft } from "lucide-react";

const searchSchema = z.object({
  order_id: z.string().optional(),
});

export const Route = createFileRoute("/akun/rate-kurir")({
  head: () => ({ meta: [{ title: "Nilai Kurir — UMKMgo" }] }),
  validateSearch: searchSchema,
  component: RateKurir,
});

type OrderInfo = {
  id: string;
  order_no: string;
  courier_id: string | null;
  courier_name: string | null;
};

function RateKurir() {
  const { user } = useAuth();
  const { order_id } = useSearch({ from: "/akun/rate-kurir" });

  const [order, setOrder] = useState<OrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user || !order_id) { setLoading(false); return; }
    (async () => {
      const { data: o } = await supabase
        .from("orders")
        .select("id,order_no,courier_id,couriers:courier_id(name)")
        .eq("id", order_id)
        .eq("status", "completed")
        .single();

      if (o) {
        const courier = Array.isArray(o.couriers) ? o.couriers[0] : (o.couriers as any);
        setOrder({
          id: o.id,
          order_no: o.order_no,
          courier_id: o.courier_id,
          courier_name: courier?.name ?? null,
        });
        const { data: existing } = await (supabase as any)
          .from("courier_ratings")
          .select("id")
          .eq("order_id", order_id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (existing) setExisting(true);
      }
      setLoading(false);
    })();
  }, [user, order_id]);

  const submit = async () => {
    if (!rating || !order?.courier_id || !user) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("courier_ratings")
      .upsert({
        order_id: order.id,
        courier_id: order.courier_id,
        user_id: user.id,
        rating,
        comment: comment.trim() || null,
      });
    setSaving(false);
    if (error) {
      toast.error(error.message);
    } else {
      setDone(true);
      toast.success("Terima kasih atas penilaian Anda!");
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center">
        <CheckCircle className="mx-auto mb-4 h-12 w-12 text-emerald-500" />
        <h2 className="mb-2 text-lg font-semibold">Terima kasih!</h2>
        <p className="mb-6 text-sm text-muted-foreground">Penilaian Anda membantu meningkatkan layanan kurir kami.</p>
        <Link to="/akun/riwayat">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Riwayat</Button>
        </Link>
      </div>
    );
  }

  if (!order_id || !order) {
    return (
      <div className="mx-auto max-w-sm px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">
          {!order_id ? "Pesanan tidak ditemukan." : "Pesanan belum selesai atau kurir tidak tersedia untuk dinilai."}
        </p>
        <Link to="/akun/riwayat" className="mt-4 inline-block">
          <Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-3.5 w-3.5" /> Kembali</Button>
        </Link>
      </div>
    );
  }

  if (existing) {
    return (
      <div className="mx-auto max-w-sm px-4 py-12 text-center">
        <CheckCircle className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
        <p className="text-sm font-medium">Anda sudah memberi penilaian untuk pesanan ini.</p>
        <Link to="/akun/riwayat" className="mt-4 inline-block">
          <Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-3.5 w-3.5" /> Kembali</Button>
        </Link>
      </div>
    );
  }

  if (!order.courier_id) {
    return (
      <div className="mx-auto max-w-sm px-4 py-12 text-center">
        <p className="text-sm text-muted-foreground">Pesanan ini tidak menggunakan kurir.</p>
        <Link to="/akun/riwayat" className="mt-4 inline-block">
          <Button variant="outline" size="sm"><ArrowLeft className="mr-2 h-3.5 w-3.5" /> Kembali</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-8">
      <Link to="/akun/riwayat" className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Kembali
      </Link>

      <h1 className="mb-1 text-xl font-semibold">Nilai Kurir</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Pesanan #{order.order_no}
        {order.courier_name && ` · Kurir: ${order.courier_name}`}
      </p>

      <Card className="p-6 space-y-5">
        <div className="text-center">
          <p className="mb-3 text-sm font-medium">Seberapa puas Anda dengan kurir ini?</p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setRating(s)}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className="h-9 w-9"
                  fill={(hover || rating) >= s ? "#f59e0b" : "none"}
                  stroke={(hover || rating) >= s ? "#f59e0b" : "#d1d5db"}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="mt-2 text-sm font-medium text-amber-600">
              {["", "Buruk", "Kurang", "Cukup", "Baik", "Sangat Baik"][rating]}
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">Komentar (opsional)</label>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Kurir ramah, cepat, barang aman, dll..."
            rows={3}
          />
        </div>

        <Button
          className="w-full"
          onClick={submit}
          disabled={!rating || saving}
        >
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Star className="mr-2 h-4 w-4" />}
          Kirim Penilaian
        </Button>
      </Card>
    </div>
  );
}
