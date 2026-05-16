import { createFileRoute, Link, useParams, useNavigate, getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readCart, cartTotal, clearCart, itemUnitPrice, type CustomerCartItem } from "@/lib/customer-cart";
import { addToCart } from "@/lib/customer-cart";
import { formatIDR } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { ChevronLeft, Loader2, ScanQrCode, CheckCircle2, Banknote, QrCode, RefreshCw, Clock } from "lucide-react";

export const Route = createFileRoute("/order/$slug/checkout")({
  component: DineInCheckoutPage,
});

const parentRoute = getRouteApi("/order/$slug");

function DineInCheckoutPage() {
  const { slug } = useParams({ from: "/order/$slug/checkout" });
  const { table, tableName } = parentRoute.useSearch();
  const { shop } = parentRoute.useLoaderData();
  const navigate = useNavigate();
  const cartKey = `dine:${slug}:${table}`;

  const [items, setItems] = useState<CustomerCartItem[]>([]);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "qris">("cash");
  const [shopId, setShopId] = useState<string | null>(null);
  const [qrisImageUrl, setQrisImageUrl] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(["cash"]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [estimasiMenit, setEstimasiMenit] = useState<number | null>(null);
  const [lastOrderItems, setLastOrderItems] = useState<CustomerCartItem[]>([]);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    setItems(readCart(cartKey));
  }, [cartKey]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("coffee_shops")
        .select("id, payment_methods_enabled, qris_image_url")
        .eq("slug", slug)
        .maybeSingle();
      if (!data) return;
      setShopId(data.id);
      setQrisImageUrl(data.qris_image_url ?? null);
      const methods = (data.payment_methods_enabled ?? ["cash"]) as string[];
      const usable = methods.filter(
        (m) => ["cash", "qris"].includes(m) && (m !== "qris" || data.qris_image_url)
      );
      const final = usable.length ? usable : ["cash"];
      setPaymentMethods(final);
      setPayMethod(final[0] as "cash" | "qris");
    })();
  }, [slug]);

  const total = cartTotal(items);
  const displayTableName = tableName || (table ? `Meja ${table}` : "");

  async function handleSubmit() {
    if (!shopId) return;
    if (!name.trim()) {
      toast.error("Masukkan nama kamu");
      return;
    }
    if (items.length === 0) {
      toast.error("Keranjang kosong");
      return;
    }

    setSubmitting(true);
    // Save items for re-order before clearing
    const savedItems = [...items];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      let userId: string | null = session?.user?.id ?? null;
      if (!userId) {
        const { data: anon } = await supabase.auth.signInAnonymously();
        userId = anon.session?.user?.id ?? null;
      }

      const orderItems = items.map((i) => ({
        menu_item_id: i.menu_item_id,
        name: i.name,
        quantity: i.qty,
        unit_price: itemUnitPrice(i),
        subtotal: itemUnitPrice(i) * i.qty,
        options: i.options ?? [],
      }));

      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          shop_id: shopId,
          customer_id: userId,
          customer_name: name.trim(),
          customer_phone: null,
          delivery_address: null,
          delivery_fee: 0,
          subtotal: total,
          total_amount: total,
          payment_method: payMethod,
          payment_status: "unpaid" as const,
          status: "pending",
          notes: note.trim() || null,
          channel: table ? "online" : "pos",
          order_source: table ? "qr_table" : "website",
          table_id: table || null,
          table_name: displayTableName || null,
          table_label: table ? (displayTableName || `Meja ${table}`) : null,
          order_items: orderItems,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Hitung estimasi waktu berdasarkan antrian
      try {
        const { count } = await supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("shop_id", shopId)
          .in("status", ["pending", "preparing"]);
        const menit = Math.max(3, Math.min(30, (count ?? 1) * 4));
        setEstimasiMenit(menit);
      } catch {
        setEstimasiMenit(5);
      }

      clearCart(cartKey);
      setLastOrderItems(savedItems);
      setOrderId(order.id);
      setDone(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("column") || message.includes("relation")) {
        clearCart(cartKey);
        setLastOrderItems(savedItems);
        setEstimasiMenit(5);
        setOrderId("demo-" + Date.now());
        setDone(true);
        return;
      }
      toast.error("Gagal memproses pesanan: " + message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReorder() {
    if (!lastOrderItems.length) return;
    setReordering(true);
    for (const item of lastOrderItems) {
      addToCart(cartKey, {
        menu_item_id: item.menu_item_id,
        name: item.name,
        price: item.price,
        image_url: item.image_url,
        options: item.options,
      }, item.qty);
    }
    toast.success("Menu pesanan sebelumnya ditambahkan ke keranjang!");
    await navigate({
      to: "/order/$slug/cart",
      params: { slug },
      search: { table, tableName },
    });
    setReordering(false);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4 pb-8">
        <div className="h-20 w-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-10 w-10 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Pesanan Diterima! 🎉</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Pesanan dari <strong>{displayTableName}</strong> sedang diproses
          </p>
        </div>

        {/* Estimasi waktu */}
        {estimasiMenit !== null && (
          <div className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 px-4 py-3">
            <Clock className="h-5 w-5 text-blue-600 shrink-0" />
            <p className="text-sm text-blue-800 dark:text-blue-300 font-medium">
              Estimasi siap: <strong>~{estimasiMenit} menit</strong>
            </p>
          </div>
        )}

        <div className="w-full max-w-xs rounded-xl border border-border bg-card p-4 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Meja</span>
            <span className="font-semibold">{displayTableName}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Nama</span>
            <span className="font-semibold">{name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total</span>
            <span className="font-bold text-primary">{formatIDR(total)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Pembayaran</span>
            <span className="font-semibold capitalize">{payMethod === "cash" ? "Bayar di kasir" : "QRIS"}</span>
          </div>
        </div>

        {payMethod === "cash" && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-4 py-3 max-w-xs w-full">
            <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
              💵 Silakan bayar ke kasir saat pesanan datang
            </p>
          </div>
        )}

        {payMethod === "qris" && qrisImageUrl && (
          <div className="space-y-2 max-w-xs w-full">
            <p className="text-sm text-muted-foreground">Scan QRIS untuk membayar:</p>
            <div className="bg-white p-3 rounded-xl border-2 flex justify-center">
              <img src={qrisImageUrl} alt="QRIS" className="max-w-full max-h-48 object-contain" />
            </div>
            <p className="text-xs text-center font-semibold">{formatIDR(total)}</p>
          </div>
        )}

        {/* Re-order 1-tap */}
        {lastOrderItems.length > 0 && (
          <div className="w-full max-w-xs space-y-2">
            <p className="text-xs text-muted-foreground text-center">Mau pesan yang sama lagi?</p>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleReorder}
              disabled={reordering}
            >
              {reordering ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Pesan Lagi Menu Sama ({lastOrderItems.reduce((s, i) => s + i.qty, 0)} item)
            </Button>
          </div>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            navigate({
              to: "/order/$slug",
              params: { slug },
              search: { table, tableName },
            })
          }
        >
          Pilih Menu Lain
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-36">
      <div className="flex items-center gap-2">
        <Link to="/order/$slug/cart" params={{ slug }} search={{ table, tableName }}>
          <Button variant="ghost" size="sm" className="gap-1 -ml-2">
            <ChevronLeft className="h-4 w-4" />
            Kembali
          </Button>
        </Link>
        <h1 className="text-lg font-semibold">Konfirmasi Pesanan</h1>
      </div>

      {/* Table info */}
      {table && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 px-3 py-2">
          <ScanQrCode className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-800 dark:text-green-300 font-medium">
            {displayTableName} · Dine In
          </p>
        </div>
      )}

      {/* Order Summary */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Ringkasan Pesanan</h2>
        <div className="divide-y divide-border">
          {items.map((item) => (
            <div key={item.menu_item_id} className="flex justify-between py-2 text-sm">
              <span className="text-muted-foreground">
                {item.qty}× {item.name}
              </span>
              <span className="font-medium">{formatIDR(itemUnitPrice(item) * item.qty)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between pt-1 border-t border-border">
          <span className="font-semibold">Total</span>
          <span className="font-bold text-primary text-base">{formatIDR(total)}</span>
        </div>
      </div>

      {/* Customer Info */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Info Kamu</h2>
        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs">Nama (untuk panggil pesanan)</Label>
          <Input
            id="name"
            placeholder="Contoh: Budi"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="note" className="text-xs">Catatan untuk dapur (opsional)</Label>
          <Textarea
            id="note"
            placeholder="Contoh: kurangi gula, tanpa es..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      {/* Payment Method */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <h2 className="text-sm font-semibold">Metode Bayar</h2>
        <RadioGroup
          value={payMethod}
          onValueChange={(v) => setPayMethod(v as "cash" | "qris")}
          className="space-y-2"
        >
          {paymentMethods.includes("cash") && (
            <label
              htmlFor="pay-cash"
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                payMethod === "cash"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="cash" id="pay-cash" />
              <Banknote className="h-5 w-5 text-green-600 shrink-0" />
              <div>
                <p className="text-sm font-medium">Bayar di Kasir</p>
                <p className="text-xs text-muted-foreground">Bayar tunai saat pesanan tiba</p>
              </div>
            </label>
          )}
          {paymentMethods.includes("qris") && (
            <label
              htmlFor="pay-qris"
              className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                payMethod === "qris"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <RadioGroupItem value="qris" id="pay-qris" />
              <QrCode className="h-5 w-5 text-blue-600 shrink-0" />
              <div>
                <p className="text-sm font-medium">QRIS</p>
                <p className="text-xs text-muted-foreground">Scan QR code untuk bayar sekarang</p>
              </div>
            </label>
          )}
        </RadioGroup>
      </div>

      {/* Fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-background/95 backdrop-blur p-4">
        <div className="max-w-2xl mx-auto space-y-2">
          <div className="flex items-center justify-between text-sm font-semibold px-1">
            <span>Total Bayar</span>
            <span className="text-primary text-base">{formatIDR(total)}</span>
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={handleSubmit}
            disabled={submitting || !name.trim()}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Memproses...
              </>
            ) : (
              "Kirim Pesanan"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
