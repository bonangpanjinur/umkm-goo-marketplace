import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { listCart, checkout, listShopZones, type CartItem, type DeliveryZone } from "@/lib/marketplace-cart";
import { useAuth } from "@/lib/auth";
import { Store } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Marketplace" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [shipping, setShipping] = useState<Record<string, string>>({}); // shop_id -> zone_id
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [notes, setNotes] = useState("");

  const [shopVoucherCodes, setShopVoucherCodes] = useState<Record<string, string>>({});
  const [platformVoucherCode, setPlatformVoucherCode] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate({ to: "/login" });
      return;
    }
    listCart()
      .then(async (d) => {
        setItems(d);
        if (d.length === 0) {
          navigate({ to: "/keranjang" });
          return;
        }
        const shopIds = Array.from(new Set(d.map((i) => i.shop_id)));
        const zs = await listShopZones(shopIds);
        setZones(zs);
        // auto-select cheapest zone per shop
        const init: Record<string, string> = {};
        for (const sid of shopIds) {
          const sz = zs.filter((z) => z.shop_id === sid).sort((a, b) => a.fee - b.fee);
          if (sz[0]) init[sid] = sz[0].id;
        }
        setShipping(init);
      })
      .catch((e) => toast.error(e.message))
      .finally(() => setLoading(false));
    if (user?.email && !recipientName) {
      setRecipientName(user.email.split("@")[0]);
    }
  }, [user, authLoading]);

  const grouped = items.reduce<Record<string, CartItem[]>>((acc, it) => {
    (acc[it.shop_id] ||= []).push(it);
    return acc;
  }, {});
  const itemsTotal = items.reduce((s, it) => s + Number(it.unit_price) * it.quantity, 0);
  const shippingTotal =
    fulfillment === "delivery"
      ? Object.values(shipping).reduce((s, zid) => {
          const z = zones.find((x) => x.id === zid);
          return s + (z ? z.fee : 0);
        }, 0)
      : 0;
  const grandTotal = itemsTotal + shippingTotal;

  const submit = async () => {
    if (!recipientName.trim() || !phone.trim() || (fulfillment === "delivery" && !address.trim())) {
      toast.error("Lengkapi data penerima.");
      return;
    }
    setSubmitting(true);
    try {
      const ids = await checkout({
        recipient_name: recipientName.trim(),
        phone: phone.trim(),
        address: fulfillment === "delivery" ? address.trim() : "Pickup di toko",
        fulfillment,
        notes: notes.trim() || null,
        shipping: fulfillment === "delivery" ? shipping : {},
        shop_voucher_codes: Object.fromEntries(
          Object.entries(shopVoucherCodes).filter(([, v]) => v && v.trim()).map(([k, v]) => [k, v.trim().toUpperCase()])
        ),
        platform_voucher_code: platformVoucherCode.trim() ? platformVoucherCode.trim().toUpperCase() : null,
      });
      if (ids.length === 0) {
        toast.error("Gagal membuat pesanan.");
        return;
      }
      toast.success(`${ids.length} pesanan berhasil dibuat`);
      navigate({ to: "/checkout/sukses/$orderId", params: { orderId: ids[0] }, search: { all: ids.join(",") } as any });
    } catch (e: any) {
      toast.error(e.message ?? "Checkout gagal");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>

        {loading ? (
          <p className="mt-6 text-sm text-muted-foreground">Memuat…</p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <section className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold">Data Penerima</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Nama penerima *</Label>
                    <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
                  </div>
                  <div>
                    <Label>No. WhatsApp *</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xx" />
                  </div>
                </div>
                <div className="mt-4">
                  <Label>Metode</Label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {(["delivery", "pickup"] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setFulfillment(m)}
                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                          fulfillment === m
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border bg-background text-muted-foreground hover:border-primary/50"
                        }`}
                      >
                        {m === "delivery" ? "Diantar (Delivery)" : "Ambil di toko (Pickup)"}
                      </button>
                    ))}
                  </div>
                </div>
                {fulfillment === "delivery" && (
                  <div className="mt-4">
                    <Label>Alamat lengkap *</Label>
                    <Textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Jl. ... No. ..., Kel/Kec, Kota"
                      rows={3}
                    />
                  </div>
                )}
                <div className="mt-4">
                  <Label>Catatan untuk toko</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Opsional" />
                </div>
              </section>

              <section className="rounded-xl border border-border bg-card p-5">
                <h2 className="mb-3 text-sm font-semibold">Pesanan</h2>
                <div className="space-y-4">
                  {Object.entries(grouped).map(([shopId, shopItems]) => {
                    const shop = shopItems[0].shop!;
                    const sub = shopItems.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);
                    const shopZones = zones.filter((z) => z.shop_id === shopId);
                    const selectedZoneId = shipping[shopId];
                    const selectedZone = shopZones.find((z) => z.id === selectedZoneId);
                    const ongkir = fulfillment === "delivery" ? selectedZone?.fee ?? 0 : 0;
                    return (
                      <div key={shopId} className="rounded-lg border border-border">
                        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
                          {shop.logo_url ? (
                            <img src={shop.logo_url} alt={shop.name} className="h-6 w-6 rounded-full object-cover" />
                          ) : (
                            <Store className="h-4 w-4" />
                          )}
                          <span className="text-xs font-semibold">{shop.name}</span>
                        </div>
                        <ul className="divide-y divide-border text-sm">
                          {shopItems.map((it) => (
                            <li key={it.id} className="flex justify-between gap-3 px-3 py-2">
                              <span className="line-clamp-1">
                                {it.quantity}× {it.product?.name}
                              </span>
                              <span className="shrink-0 font-medium">
                                Rp {(Number(it.unit_price) * it.quantity).toLocaleString("id-ID")}
                              </span>
                            </li>
                          ))}
                        </ul>
                        {fulfillment === "delivery" && (
                          <div className="border-t border-border px-3 py-2">
                            <p className="mb-1.5 text-[11px] font-medium uppercase text-muted-foreground">
                              Pilih zona pengantaran
                            </p>
                            {shopZones.length === 0 ? (
                              <p className="text-xs text-muted-foreground">
                                Toko ini belum mengatur zona ongkir. Ongkir akan dikonfirmasi setelah pesanan dibuat.
                              </p>
                            ) : (
                              <div className="grid gap-1.5">
                                {shopZones.map((z) => (
                                  <label
                                    key={z.id}
                                    className={`flex cursor-pointer items-start justify-between gap-2 rounded-md border px-2.5 py-1.5 text-xs transition ${
                                      selectedZoneId === z.id
                                        ? "border-primary bg-primary/5"
                                        : "border-border hover:border-primary/50"
                                    }`}
                                  >
                                    <div className="flex items-start gap-2">
                                      <input
                                        type="radio"
                                        name={`zone-${shopId}`}
                                        checked={selectedZoneId === z.id}
                                        onChange={() => setShipping((s) => ({ ...s, [shopId]: z.id }))}
                                        className="mt-0.5"
                                      />
                                      <div>
                                        <p className="font-medium">{z.name}</p>
                                        {z.area_note && (
                                          <p className="text-[10px] text-muted-foreground">{z.area_note}</p>
                                        )}
                                      </div>
                                    </div>
                                    <span className="font-semibold whitespace-nowrap">
                                      Rp {z.fee.toLocaleString("id-ID")}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        <div className="border-t border-border bg-muted/20 px-3 py-2 text-right text-xs space-y-0.5">
                          <div>Subtotal: <span className="font-semibold">Rp {sub.toLocaleString("id-ID")}</span></div>
                          {fulfillment === "delivery" && (
                            <div>Ongkir: <span className="font-semibold">Rp {ongkir.toLocaleString("id-ID")}</span></div>
                          )}
                          <div className="text-sm">Total toko: <span className="font-bold text-primary">Rp {(sub + ongkir).toLocaleString("id-ID")}</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <aside className="h-fit rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold">Ringkasan</h3>
              <div className="mt-4 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total item</span>
                  <span>Rp {itemsTotal.toLocaleString("id-ID")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ongkir</span>
                  <span>{fulfillment === "delivery" ? `Rp ${shippingTotal.toLocaleString("id-ID")}` : "Pickup"}</span>
                </div>
              </div>
              <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-bold">
                <span>Total</span>
                <span className="text-primary">Rp {grandTotal.toLocaleString("id-ID")}</span>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Pembayaran via transfer manual ke toko. Setelah pesanan dibuat, kamu akan dihubungi toko untuk konfirmasi pembayaran.
              </p>
              <Button
                size="lg"
                className="mt-4 w-full"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? "Memproses…" : "Buat Pesanan"}
              </Button>
              <Link to="/keranjang" className="mt-2 block text-center text-xs text-muted-foreground hover:text-foreground">
                ← Kembali ke keranjang
              </Link>
            </aside>
          </div>
        )}
      </div>
      <MarketplaceFooter />
    </div>
  );
}
