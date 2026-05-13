import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { listCart, checkout, listShopZones, listShopDeliverySettings, type CartItem, type DeliveryZone, type DeliverySettings } from "@/lib/marketplace-cart";
import { getDeliveryWindow, formatEta, formatTime } from "@/lib/delivery-eta";
import { useAuth } from "@/lib/auth";
import { initiatePayment, openMidtransSnap, isGatewayPaymentMethod } from "@/lib/payment-gateway";
import { Store, CreditCard, Wallet, Banknote, QrCode, Smartphone, UserX, LogIn, Loader2, ShieldCheck, ExternalLink, CheckCircle2, MapPin, Truck, Clock, Gift, Crown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Marketplace" }] }),
  component: CheckoutPage,
});

type AuthChoice = "idle" | "login" | "guest";

function CheckoutPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([]);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [deliveryMap, setDeliveryMap] = useState<Record<string, DeliverySettings>>({});
  const [shipping, setShipping] = useState<Record<string, string>>({});
  const [memberships, setMemberships] = useState<Record<string, { tier_name: string; discount_percent: number; expires_at: string }>>({});
  const [depositSettings, setDepositSettings] = useState<Record<string, { enabled: boolean; percent: number; min_total: number }>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [recipientName, setRecipientName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [fulfillment, setFulfillment] = useState<"delivery" | "pickup">("delivery");
  const [notes, setNotes] = useState("");

  const [isGift, setIsGift] = useState(false);
  const [giftRecipientName, setGiftRecipientName] = useState("");
  const [giftMessage, setGiftMessage] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("transfer");
  const [shopVoucherCodes, setShopVoucherCodes] = useState<Record<string, string>>({});
  const [platformVoucherCode, setPlatformVoucherCode] = useState("");

  const [savedAddress, setSavedAddress] = useState("");
  const [usingSavedAddress, setUsingSavedAddress] = useState(false);
  const [saveNewAddress, setSaveNewAddress] = useState(false);

  const [authChoice, setAuthChoice] = useState<AuthChoice>("idle");
  const [signingInAnonymously, setSigningInAnonymously] = useState(false);
  const [isGuest, setIsGuest] = useState(false);

  async function continueAsGuest() {
    setSigningInAnonymously(true);
    try {
      const { error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      setIsGuest(true);
      setAuthChoice("guest");
    } catch (e: any) {
      toast.error("Gagal masuk sebagai tamu: " + e.message);
    } finally {
      setSigningInAnonymously(false);
    }
  }

  async function loadCartAndProfile(uid: string, anonymous: boolean) {
    if (!anonymous) {
      // Prioritas 1: alamat default dari tabel customer_addresses (multi-alamat).
      const { data: defAddr } = await supabase
        .from("customer_addresses")
        .select("address_line, recipient_name, phone")
        .eq("user_id", uid)
        .eq("is_default", true)
        .maybeSingle();

      const { data: prof } = await supabase
        .from("customer_profiles")
        .select("display_name, phone, default_address, default_city")
        .eq("user_id", uid)
        .maybeSingle();
      if (prof) {
        if (prof.display_name) setRecipientName(prof.display_name);
        if (prof.phone) setPhone(prof.phone);
      }
      if (defAddr) {
        if (defAddr.recipient_name) setRecipientName(defAddr.recipient_name);
        if (defAddr.phone) setPhone(defAddr.phone);
        setAddress(defAddr.address_line);
        setSavedAddress(defAddr.address_line);
        setUsingSavedAddress(true);
      } else if (prof?.default_address) {
        const full = prof.default_city
          ? `${prof.default_address}, ${prof.default_city}`
          : prof.default_address;
        setAddress(full);
        setSavedAddress(full);
        setUsingSavedAddress(true);
      }
    }

    const allItems = await listCart();
    const selectedRaw = sessionStorage.getItem("checkout_selected_ids");
    const selectedIds = selectedRaw ? new Set(JSON.parse(selectedRaw) as string[]) : null;
    const d = selectedIds && selectedIds.size > 0 && selectedIds.size < allItems.length
      ? allItems.filter(i => selectedIds.has(i.id))
      : allItems;
    setItems(d);
    if (d.length === 0) {
      navigate({ to: "/keranjang" });
      return;
    }
    const shopIds = Array.from(new Set(d.map((i) => i.shop_id)));
    const [zs, dsArr] = await Promise.all([
      listShopZones(shopIds),
      listShopDeliverySettings(shopIds),
    ]);
    setZones(zs);
    const dsMap: Record<string, DeliverySettings> = {};
    for (const ds of dsArr) dsMap[ds.shop_id] = ds;
    setDeliveryMap(dsMap);
    const init: Record<string, string> = {};
    for (const sid of shopIds) {
      const sz = zs.filter((z) => z.shop_id === sid).sort((a, b) => a.fee - b.fee);
      if (sz[0]) init[sid] = sz[0].id;
    }
    setShipping(init);

    // Load deposit (DP) settings per shop
    try {
      const { data: shopRows } = await supabase
        .from("coffee_shops")
        .select("id, deposit_enabled, deposit_percent, deposit_min_total")
        .in("id", shopIds);
      if (shopRows) {
        const map: Record<string, { enabled: boolean; percent: number; min_total: number }> = {};
        for (const s of shopRows as any[]) {
          map[s.id] = {
            enabled: Boolean(s.deposit_enabled),
            percent: Number(s.deposit_percent ?? 30),
            min_total: Number(s.deposit_min_total ?? 0),
          };
        }
        setDepositSettings(map);
      }
    } catch { /* tabel lama tanpa kolom DP — abaikan */ }


    // Auto-fetch active memberships per shop (for discount preview)
    if (!anonymous) {
      const { data: memData } = await supabase.rpc("get_my_active_memberships" as any, { _shop_ids: shopIds });
      if (memData) {
        const memMap: Record<string, { tier_name: string; discount_percent: number; expires_at: string }> = {};
        for (const m of (memData as any[])) {
          // RPC orders by discount DESC — first per shop wins
          if (!memMap[m.shop_id]) {
            memMap[m.shop_id] = { tier_name: m.tier_name, discount_percent: Number(m.discount_percent), expires_at: m.expires_at };
          }
        }
        setMemberships(memMap);
      }
    }

    setLoading(false);
  }

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    const anonymous = (user as any).is_anonymous === true;
    setIsGuest(anonymous);
    loadCartAndProfile(user.id, anonymous).catch((e) => {
      toast.error(e.message);
      setLoading(false);
    });
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
  // Per-shop membership discount (auto-applied on subtotal)
  const membershipDiscountByShop: Record<string, number> = {};
  for (const [shopId, shopItems] of Object.entries(grouped)) {
    const m = memberships[shopId];
    if (!m) continue;
    const sub = shopItems.reduce((s, i) => s + Number(i.unit_price) * i.quantity, 0);
    membershipDiscountByShop[shopId] = Math.round((sub * m.discount_percent) / 100);
  }
  const membershipTotal = Object.values(membershipDiscountByShop).reduce((s, v) => s + v, 0);
  const grandTotal = itemsTotal + shippingTotal - membershipTotal;

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
        payment_method: paymentMethod,
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
      sessionStorage.removeItem("checkout_selected_ids");
      toast.success(`${ids.length} pesanan berhasil dibuat`);

      if (saveNewAddress && user && !isGuest && address.trim()) {
        try {
          const trimmed = address.trim();
          const commaIdx = trimmed.lastIndexOf(",");
          const [addr, city] = commaIdx > -1
            ? [trimmed.slice(0, commaIdx).trim(), trimmed.slice(commaIdx + 1).trim()]
            : [trimmed, ""];
          await supabase.from("customer_profiles").upsert(
            { user_id: user.id, default_address: addr, default_city: city },
            { onConflict: "user_id" }
          );
        } catch (_) {}
      }

      navigate({ to: "/checkout/sukses/$orderId", params: { orderId: ids[0] }, search: { all: ids.join(",") } as any });
    } catch (e: any) {
      toast.error(e.message ?? "Checkout gagal");
    } finally {
      setSubmitting(false);
    }
  };

  if (!authLoading && !user && !loading) {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceHeader />
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <ShieldCheck className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Lanjut ke Checkout</h1>
          <p className="text-muted-foreground mt-2 mb-8">Masuk ke akun untuk pengalaman belanja lebih baik, atau lanjut sebagai tamu.</p>
          <div className="space-y-3">
            <Button className="w-full" size="lg" asChild>
              <Link to="/login" search={{ redirect: "/checkout" } as any}>
                <LogIn className="h-4 w-4 mr-2" /> Masuk / Daftar
              </Link>
            </Button>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              disabled={signingInAnonymously}
              onClick={continueAsGuest}
            >
              {signingInAnonymously
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses...</>
                : <><UserX className="h-4 w-4 mr-2" /> Lanjut sebagai Tamu</>
              }
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Sebagai tamu, pesananmu tetap bisa dilacak dengan nomor pesanan. Kamu bisa daftar akun kapanpun untuk riwayat lengkap.
          </p>
        </div>
        <MarketplaceFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MarketplaceHeader />
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
          {isGuest && <Badge variant="secondary" className="text-xs"><UserX className="h-3 w-3 mr-1" />Mode Tamu</Badge>}
        </div>
        {isGuest && (
          <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
            <UserX className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              Kamu checkout sebagai <strong>tamu</strong>. Simpan nomor pesananmu setelah checkout.{" "}
              <Link to="/login" className="font-semibold underline underline-offset-2">Daftar akun</Link> untuk riwayat pesanan lengkap.
            </div>
          </div>
        )}

        {loading ? (
          <p className="mt-6 text-sm text-muted-foreground">Memuat…</p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="space-y-6">
              <section className="rounded-xl border border-border bg-card p-5">
                <h2 className="text-sm font-semibold">Data Penerima</h2>
                {isGuest && (
                  <div className="mt-3">
                    <Label>Email (opsional) <span className="text-muted-foreground text-xs">— untuk konfirmasi pesanan</span></Label>
                    <Input
                      type="email"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      placeholder="email@contoh.com"
                      className="mt-1"
                    />
                  </div>
                )}
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
                    <Label>Alamat pengantaran *</Label>
                    {usingSavedAddress && savedAddress ? (
                      <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                            <p className="text-sm text-emerald-800 leading-snug">{savedAddress}</p>
                          </div>
                          <button
                            type="button"
                            className="shrink-0 text-xs text-primary underline underline-offset-2"
                            onClick={() => { setUsingSavedAddress(false); setAddress(""); }}
                          >
                            Ganti
                          </button>
                        </div>
                        <p className="mt-1.5 text-xs text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Menggunakan alamat tersimpan
                        </p>
                      </div>
                    ) : (
                      <div className="mt-1 space-y-2">
                        <Textarea
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Jl. ... No. ..., Kel/Kec, Kota"
                          rows={3}
                        />
                        {savedAddress && (
                          <button
                            type="button"
                            className="text-xs text-primary hover:underline"
                            onClick={() => { setAddress(savedAddress); setUsingSavedAddress(true); }}
                          >
                            ← Gunakan alamat tersimpan
                          </button>
                        )}
                        {!isGuest && (
                          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={saveNewAddress}
                              onChange={(e) => setSaveNewAddress(e.target.checked)}
                              className="rounded"
                            />
                            Simpan alamat ini untuk checkout berikutnya
                          </label>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div className="mt-4">
                  <Label>Catatan untuk toko</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Opsional" />
                </div>

                {/* P-04: Pesan sebagai Hadiah */}
                <div className="mt-4 rounded-xl border border-border bg-muted/30 p-4">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isGift}
                      onChange={(e) => setIsGift(e.target.checked)}
                      className="h-4 w-4 rounded"
                    />
                    <span className="flex items-center gap-2 font-medium text-sm">
                      <Gift className="h-4 w-4 text-pink-500" /> Pesan sebagai Hadiah
                    </span>
                  </label>
                  {isGift && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <Label>Nama penerima hadiah</Label>
                        <Input
                          className="mt-1"
                          placeholder="contoh: Budi Santoso"
                          value={giftRecipientName}
                          onChange={(e) => setGiftRecipientName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Pesan ucapan <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                        <Textarea
                          className="mt-1"
                          rows={3}
                          placeholder="Selamat ulang tahun! Semoga hari-harimu selalu menyenangkan. 🎉"
                          value={giftMessage}
                          onChange={(e) => setGiftMessage(e.target.value)}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">Pesan ini akan dicetak pada slip hadiah oleh merchant.</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h2 className="text-sm font-semibold">Metode Pembayaran</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  {([
                    { id: "transfer",   label: "Transfer Bank",  sub: "BCA / Mandiri / BNI / BRI", icon: Banknote },
                    { id: "cod",        label: "COD",            sub: "Bayar saat diterima",       icon: Wallet },
                    { id: "qris",       label: "QRIS",           sub: "Semua e-wallet via QR",    icon: QrCode },
                    { id: "gopay",      label: "GoPay",          sub: "via aplikasi Gojek",        icon: Smartphone },
                    { id: "ovo",        label: "OVO",            sub: "via aplikasi OVO",          icon: Smartphone },
                    { id: "shopeepay",  label: "ShopeePay",      sub: "via aplikasi Shopee",       icon: CreditCard },
                    { id: "dana",       label: "DANA",           sub: "via aplikasi DANA",         icon: CreditCard },
                    { id: "cc",         label: "Kartu Kredit",   sub: "Visa / Mastercard",         icon: CreditCard },
                  ] as const).map(pm => (
                    <button
                      key={pm.id}
                      type="button"
                      onClick={() => setPaymentMethod(pm.id)}
                      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        paymentMethod === pm.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <pm.icon className={`h-4 w-4 shrink-0 ${paymentMethod === pm.id ? "text-primary" : "text-muted-foreground"}`} />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${paymentMethod === pm.id ? "text-primary" : ""}`}>{pm.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{pm.sub}</p>
                      </div>
                      {paymentMethod === pm.id && (
                        <div className="ml-auto h-4 w-4 rounded-full border-2 border-primary bg-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
                {paymentMethod === "cod" && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                    COD tersedia jika toko mendukung. Konfirmasi akan diberikan setelah pesanan diproses.
                  </p>
                )}
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
                    const mem = memberships[shopId];
                    const memDisc = membershipDiscountByShop[shopId] ?? 0;
                    return (
                      <div key={shopId} className="rounded-lg border border-border">
                        <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
                          {shop.logo_url ? (
                            <img src={shop.logo_url} alt={shop.name} className="h-6 w-6 rounded-full object-cover" />
                          ) : (
                            <Store className="h-4 w-4" />
                          )}
                          <span className="text-xs font-semibold">{shop.name}</span>
                          {mem && (
                            <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                              <Crown className="h-3 w-3" /> {mem.tier_name} · -{mem.discount_percent}%
                            </span>
                          )}
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
                            {(() => {
                              const ds = deliveryMap[shopId];
                              const win = ds?.open_time && ds?.close_time
                                ? getDeliveryWindow(ds.open_time, ds.close_time)
                                : null;
                              return ds && win ? (
                                <div className={`mb-2 flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] ${win.open ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                                  {win.open
                                    ? <Truck className="h-3 w-3 shrink-0" />
                                    : <Clock className="h-3 w-3 shrink-0" />
                                  }
                                  {win.open
                                    ? `Delivery buka · tutup pukul ${formatTime(win.closesAt!)}`
                                    : `Delivery tutup · buka pukul ${formatTime(win.opensAt!)}`
                                  }
                                </div>
                              ) : null;
                            })()}
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
                                        <p className="text-[10px] text-emerald-600 font-medium">
                                          ~{formatEta(z.min_eta_minutes, z.max_eta_minutes)}
                                        </p>
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
                        <div className="border-t border-border px-3 py-2">
                          <Label className="text-[11px] uppercase text-muted-foreground">Kode voucher toko</Label>
                          <Input
                            className="mt-1 h-8 text-xs"
                            value={shopVoucherCodes[shopId] ?? ""}
                            onChange={(e) => setShopVoucherCodes((s) => ({ ...s, [shopId]: e.target.value }))}
                            placeholder="opsional"
                          />
                        </div>
                        <div className="border-t border-border bg-muted/20 px-3 py-2 text-right text-xs space-y-0.5">
                          <div>Subtotal: <span className="font-semibold">Rp {sub.toLocaleString("id-ID")}</span></div>
                          {memDisc > 0 && (
                            <div className="text-amber-700">Diskon Member ({mem!.discount_percent}%): <span className="font-semibold">−Rp {memDisc.toLocaleString("id-ID")}</span></div>
                          )}
                          {fulfillment === "delivery" && (
                            <div>Ongkir: <span className="font-semibold">Rp {ongkir.toLocaleString("id-ID")}</span></div>
                          )}
                          <div className="text-sm">Total toko: <span className="font-bold text-primary">Rp {(sub - memDisc + ongkir).toLocaleString("id-ID")}</span></div>
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
                {membershipTotal > 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span className="flex items-center gap-1"><Crown className="h-3.5 w-3.5" /> Diskon Member</span>
                    <span className="font-semibold">−Rp {membershipTotal.toLocaleString("id-ID")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ongkir</span>
                  <span>{fulfillment === "delivery" ? `Rp ${shippingTotal.toLocaleString("id-ID")}` : "Pickup"}</span>
                </div>
              </div>
              <div className="mt-3 border-t border-border pt-3">
                <Label className="text-[11px] uppercase text-muted-foreground">Voucher platform</Label>
                <Input
                  className="mt-1 h-9"
                  value={platformVoucherCode}
                  onChange={(e) => setPlatformVoucherCode(e.target.value)}
                  placeholder="cth: HEMAT10"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Diskon dari voucher dihitung saat pesanan dibuat.
                </p>
              </div>
              <div className="mt-3 flex justify-between border-t border-border pt-3 text-base font-bold">
                <span>Estimasi Total</span>
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
