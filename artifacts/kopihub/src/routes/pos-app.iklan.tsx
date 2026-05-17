import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Megaphone, Plus, X, Clock, CheckCircle2, XCircle, Calendar,
  Eye, MousePointerClick, BarChart2, RefreshCw, Package, Store,
  MapPin, Banknote, Info, AlertCircle, ChevronRight, Copy,
  Loader2, QrCode, CreditCard, Wallet, ArrowLeft,
} from "lucide-react";
import { initiatePayment, openMidtransSnap, isGatewayPaymentMethod } from "@/lib/payment-gateway";

export const Route = createFileRoute("/pos-app/iklan")({
  component: IklanPage,
});

type AdStatus = "payment_pending" | "pending" | "active" | "rejected" | "expired" | "paused";
type AdPosition = "hero_carousel" | "homepage_middle" | "search_top" | "category_top" | "product_sidebar";
type AdType = "product" | "shop";
type PayStep = "form" | "payment" | "waiting" | "success";

type AdRequest = {
  id: string;
  ad_type: AdType;
  target_id: string;
  target_name: string;
  position: AdPosition;
  budget_idr: number;
  duration_days: number;
  starts_at: string | null;
  ends_at: string | null;
  status: AdStatus;
  reject_reason: string | null;
  impressions: number;
  clicks: number;
  created_at: string;
  payment_method?: string | null;
  payment_tx_id?: string | null;
};
type MenuItem = { id: string; name: string; price: number };

const POSITIONS: { value: AdPosition; label: string; desc: string; price_per_day: number; badge?: string }[] = [
  { value: "hero_carousel",    label: "Banner Hero (Carousel)", desc: "Slider utama halaman depan — visibilitas tertinggi",           price_per_day: 50_000, badge: "Populer" },
  { value: "homepage_middle",  label: "Tengah Homepage",        desc: "Slot iklan di antara flash sale dan kategori",                 price_per_day: 30_000 },
  { value: "search_top",       label: "Atas Pencarian",         desc: "Tampil saat pembeli mencari produk di marketplace",            price_per_day: 25_000 },
  { value: "category_top",     label: "Atas Kategori",          desc: "Tampil di halaman kategori yang relevan",                     price_per_day: 20_000 },
  { value: "product_sidebar",  label: "Sidebar Produk",         desc: "Tampil di samping detail produk lain",                       price_per_day: 15_000 },
];
const DURATIONS = [
  { days: 7,  label: "7 hari" },
  { days: 14, label: "14 hari", badge: "Hemat 10%" },
  { days: 30, label: "30 hari", badge: "Hemat 20%" },
];
const STATUS_CONFIG: Record<AdStatus, { label: string; color: string; icon: typeof Clock }> = {
  payment_pending: { label: "Menunggu Pembayaran", color: "bg-orange-100 text-orange-700", icon: Banknote },
  pending:         { label: "Menunggu Verifikasi", color: "bg-amber-100 text-amber-700",   icon: Clock },
  active:          { label: "Aktif Ditayangkan",   color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  rejected:        { label: "Ditolak",             color: "bg-red-100 text-red-700",       icon: XCircle },
  expired:         { label: "Masa Habis",          color: "bg-slate-100 text-slate-600",   icon: Calendar },
  paused:          { label: "Dijeda",              color: "bg-blue-100 text-blue-700",     icon: AlertCircle },
};
const POSITION_LABELS: Record<AdPosition, string> = {
  hero_carousel:   "Banner Hero",
  homepage_middle: "Tengah Homepage",
  search_top:      "Atas Pencarian",
  category_top:    "Atas Kategori",
  product_sidebar: "Sidebar Produk",
};
const PAYMENT_METHODS = [
  { value: "transfer",    label: "Transfer Bank",  icon: Banknote,   desc: "BCA / Mandiri / BNI / BRI — manual confirm" },
  { value: "qris",        label: "QRIS",           icon: QrCode,     desc: "Scan QR dari aplikasi bank / e-wallet apa saja" },
  { value: "gopay",       label: "GoPay",          icon: Wallet,     desc: "Bayar via GoPay (Midtrans)" },
  { value: "ovo",         label: "OVO",            icon: Wallet,     desc: "Bayar via OVO (Midtrans)" },
  { value: "shopeepay",   label: "ShopeePay",      icon: Wallet,     desc: "Bayar via ShopeePay (Midtrans)" },
  { value: "cc",          label: "Kartu Kredit",   icon: CreditCard, desc: "Visa / Mastercard / JCB (Midtrans)" },
];
const BANK_ACCOUNTS = [
  { bank: "BCA",     no: "1234567890", name: "PT UMKMgo Indonesia" },
  { bank: "Mandiri", no: "9876543210", name: "PT UMKMgo Indonesia" },
];

function calcTotal(posValue: AdPosition, days: number) {
  const pos = POSITIONS.find(p => p.value === posValue)!;
  const disc = days >= 30 ? 0.8 : days >= 14 ? 0.9 : 1;
  return Math.round(pos.price_per_day * days * disc);
}

export default function IklanPage() {
  const { user } = useAuth();
  const [ads, setAds] = useState<AdRequest[]>([]);
  const [products, setProducts] = useState<MenuItem[]>([]);
  const [shopId, setShopId] = useState<string | null>(null);
  const [shopName, setShopName] = useState("");
  const [shopEmail, setShopEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [payStep, setPayStep] = useState<PayStep>("form");

  // Form fields
  const [adType, setAdType] = useState<AdType>("product");
  const [targetId, setTargetId] = useState("");
  const [targetName, setTargetName] = useState("");
  const [position, setPosition] = useState<AdPosition>("homepage_middle");
  const [durationDays, setDurationDays] = useState(7);
  const [paymentMethod, setPaymentMethod] = useState("transfer");
  const [showForm, setShowForm] = useState(false);

  // Payment state
  const [pendingAdId, setPendingAdId] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [snapBusy, setSnapBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedPos = POSITIONS.find(p => p.value === position)!;
  const totalBudget = calcTotal(position, durationDays);

  async function load() {
    setLoading(true);
    try {
      if (!user) throw new Error();
      const { data: shopData } = await supabase.from("shops").select("id, name").eq("owner_id", user.id).maybeSingle();
      if (!shopData) throw new Error();
      setShopId(shopData.id);
      setShopName(shopData.name);
      setShopEmail(user.email ?? "");
      const { data: menuData } = await supabase.from("menu_items").select("id, name, price").eq("shop_id", shopData.id).eq("is_available", true).order("name");
      setProducts((menuData as MenuItem[]) ?? []);
      const { data: adData, error } = await (supabase as any).from("ad_requests").select("*").eq("shop_id", shopData.id).order("created_at", { ascending: false });
      if (error) throw error;
      setAds((adData as AdRequest[]) ?? []);
    } catch {
      setUsingDemo(true);
    }
    setLoading(false);
  }
  useEffect(() => { load(); }, [user]);

  function resetForm() {
    setAdType("product"); setTargetId(""); setTargetName("");
    setPosition("homepage_middle"); setDurationDays(7); setPaymentMethod("transfer");
    setShowForm(false); setPayStep("form"); setPendingAdId(null); setPaymentUrl(null);
  }

  // ── Step 1: save ad_request with status=payment_pending ──────────────────
  async function handleSubmitForm() {
    if (adType === "product" && !targetId) { toast.error("Pilih produk yang ingin diiklankan."); return; }
    setPayStep("payment");
  }

  // ── Step 2: initiate payment ─────────────────────────────────────────────
  async function handlePay() {
    setSnapBusy(true);
    try {
      // 1. Create ad_request in Supabase
      let adId: string;
      if (usingDemo) {
        adId = `demo-${Date.now()}`;
        const demoAd: AdRequest = {
          id: adId, ad_type: adType,
          target_id: adType === "product" ? targetId : (shopId ?? ""),
          target_name: adType === "product" ? targetName : shopName,
          position, budget_idr: totalBudget, duration_days: durationDays,
          starts_at: null, ends_at: null,
          status: "payment_pending",
          reject_reason: null, impressions: 0, clicks: 0,
          created_at: new Date().toISOString(), payment_method: paymentMethod,
        };
        setAds(p => [demoAd, ...p]);
        setPendingAdId(adId);
      } else {
        const { data: inserted, error: insErr } = await (supabase as any).from("ad_requests").insert([{
          shop_id: shopId,
          ad_type: adType,
          target_id: adType === "product" ? targetId : shopId,
          target_name: adType === "product" ? targetName : shopName,
          position, budget_idr: totalBudget, duration_days: durationDays,
          status: "payment_pending",
          payment_method: paymentMethod,
        }]).select("id").single();
        if (insErr) throw insErr;
        adId = inserted.id as string;
        setPendingAdId(adId);
      }

      // 2. For transfer manual — just show instructions
      if (paymentMethod === "transfer") {
        setSnapBusy(false);
        setPayStep("waiting");
        return;
      }

      // 3. For gateway methods — initiate payment
      const result = await initiatePayment({
        order_id: `ad-${adId}`,
        amount: totalBudget,
        payment_method: paymentMethod,
        customer_name: shopName,
        customer_email: shopEmail,
        items: [{ id: adId, name: `Iklan ${POSITION_LABELS[position]} ${durationDays} hari`, price: totalBudget, quantity: 1 }],
        success_redirect_url: window.location.href,
        failure_redirect_url: window.location.href,
      });

      if (result.gateway === "midtrans" && result.snap_token) {
        setSnapBusy(false);
        openMidtransSnap(result.snap_token, {
          onSuccess: async () => {
            await confirmPayment(adId, paymentMethod);
          },
          onPending: () => {
            toast.info("Pembayaran sedang diproses. Iklan akan aktif setelah dikonfirmasi.");
            setPayStep("waiting");
            startPolling(adId);
          },
          onError: () => {
            toast.error("Pembayaran gagal. Silakan coba lagi.");
            setPayStep("payment");
          },
          onClose: () => {
            setSnapBusy(false);
          },
        });
        return;
      }

      if (result.gateway === "xendit" && result.payment_url) {
        setPaymentUrl(result.payment_url);
        setSnapBusy(false);
        setPayStep("waiting");
        window.open(result.payment_url, "_blank");
        startPolling(adId);
        return;
      }

      // Manual fallback
      setSnapBusy(false);
      setPayStep("waiting");
    } catch (err: any) {
      toast.error(err.message ?? "Gagal memproses pembayaran.");
      setSnapBusy(false);
    }
  }

  async function confirmPayment(adId: string, method: string) {
    try {
      if (!usingDemo) {
        await (supabase as any).from("ad_requests").update({ status: "pending", payment_method: method }).eq("id", adId);
      } else {
        setAds(p => p.map(a => a.id === adId ? { ...a, status: "pending" as AdStatus } : a));
      }
    } catch { /* webhook will handle it */ }
    if (pollRef.current) clearInterval(pollRef.current);
    setPayStep("success");
    load();
  }

  function startPolling(adId: string) {
    if (pollRef.current) clearInterval(pollRef.current);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > 24) { // 2 minutes max
        clearInterval(pollRef.current!);
        return;
      }
      try {
        const { data } = await (supabase as any).from("ad_requests").select("status").eq("id", adId).single();
        if (data?.status === "pending" || data?.status === "active") {
          clearInterval(pollRef.current!);
          setPayStep("success");
          load();
        }
      } catch { /* ignore */ }
    }, 5000);
  }

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  async function handleManualConfirm() {
    if (!pendingAdId) return;
    toast.info("Terima kasih! Pembayaran Anda sedang dikonfirmasi oleh admin.", { duration: 5000 });
    setPayStep("success");
    load();
  }

  // ─── Render helpers ────────────────────────────────────────────────────────

  const totalImpressions = ads.filter(a => a.status === "active").reduce((s, a) => s + a.impressions, 0);
  const totalClicks      = ads.filter(a => a.status === "active").reduce((s, a) => s + a.clicks, 0);
  const activeCount      = ads.filter(a => a.status === "active").length;

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-primary" /> Iklan & Promosi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pasang iklan berbayar untuk menjangkau lebih banyak pembeli di marketplace.
            {usingDemo && <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Demo</span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {!showForm && (
            <Button size="sm" onClick={() => { setShowForm(true); setPayStep("form"); }}>
              <Plus className="h-4 w-4 mr-1" /> Pasang Iklan
            </Button>
          )}
        </div>
      </div>

      {/* KPI */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: "Iklan Aktif",      value: activeCount,                              icon: Megaphone,         color: "text-emerald-500" },
          { label: "Total Tayangan",   value: totalImpressions.toLocaleString("id-ID"), icon: Eye,               color: "text-blue-500" },
          { label: "Total Klik",       value: totalClicks.toLocaleString("id-ID"),      icon: MousePointerClick, color: "text-violet-500" },
        ].map(item => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-sm text-muted-foreground">{item.label}</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{item.value}</p>
            </div>
          );
        })}
      </div>

      {/* ── Wizard / Form Panel ────────────────────────────────────────────── */}
      {showForm && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-card overflow-hidden">

          {/* ── Step indicator ── */}
          <div className="flex border-b border-border">
            {(["form", "payment", "waiting", "success"] as PayStep[]).map((step, i) => {
              const labels = ["1. Detail Iklan", "2. Pembayaran", "3. Konfirmasi", "4. Selesai"];
              const done   = ["form", "payment", "waiting", "success"].indexOf(payStep) > i;
              const active = payStep === step;
              return (
                <div key={step} className={`flex-1 px-4 py-3 text-center text-xs font-medium transition-colors ${active ? "bg-primary/5 text-primary" : done ? "text-muted-foreground" : "text-muted-foreground/40"}`}>
                  {labels[i]}
                </div>
              );
            })}
          </div>

          {/* ─── STEP 1: Detail Form ─────────────────────────────────────── */}
          {payStep === "form" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-semibold">Detail Iklan</h2>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={resetForm}><X className="h-4 w-4" /></Button>
              </div>

              {/* Jenis */}
              <div className="mb-4">
                <Label className="mb-2 block">Jenis Iklan</Label>
                <div className="flex gap-3">
                  {([["product", "Iklan Produk", Package, "Promosikan 1 produk spesifik"], ["shop", "Iklan Toko", Store, "Promosikan profil toko Anda"]] as const).map(([val, lbl, Icon, sub]) => (
                    <button key={val} type="button"
                      onClick={() => { setAdType(val); setTargetId(""); setTargetName(""); }}
                      className={`flex flex-1 items-center gap-2.5 rounded-xl border p-3.5 text-left transition ${adType === val ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                    >
                      <Icon className="h-5 w-5 shrink-0 text-primary" />
                      <div><p className="text-sm font-medium">{lbl}</p><p className="text-xs text-muted-foreground">{sub}</p></div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Produk */}
              {adType === "product" && (
                <div className="mb-4">
                  <Label>Pilih Produk *</Label>
                  {products.length === 0
                    ? <p className="mt-2 text-sm text-muted-foreground">Tidak ada produk aktif. Tambahkan produk di halaman Menu terlebih dahulu.</p>
                    : (
                      <select className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm" value={targetId}
                        onChange={e => { const p = products.find(p => p.id === e.target.value); setTargetId(e.target.value); setTargetName(p?.name ?? ""); }}>
                        <option value="">-- Pilih produk --</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name} — Rp {Number(p.price).toLocaleString("id-ID")}</option>)}
                      </select>
                    )
                  }
                </div>
              )}
              {adType === "shop" && (
                <div className="mb-4 rounded-lg border border-border bg-muted/30 p-3 text-sm flex items-center gap-2">
                  <Store className="h-4 w-4 text-primary" />
                  <span><strong>{shopName || "Toko Anda"}</strong> akan dipromosikan di posisi yang dipilih.</span>
                </div>
              )}

              {/* Posisi */}
              <div className="mb-4">
                <Label className="mb-2 block">Posisi Iklan</Label>
                <div className="space-y-2">
                  {POSITIONS.map(pos => (
                    <button key={pos.value} type="button" onClick={() => setPosition(pos.value)}
                      className={`flex w-full items-center justify-between rounded-xl border p-3.5 text-left transition ${position === pos.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/20"}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{pos.label}</span>
                          {pos.badge && <span className="rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-semibold">{pos.badge}</span>}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{pos.desc}</p>
                      </div>
                      <span className="ml-4 shrink-0 text-sm font-semibold">Rp {pos.price_per_day.toLocaleString("id-ID")}/hari</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Durasi */}
              <div className="mb-5">
                <Label className="mb-2 block">Durasi Tayang</Label>
                <div className="flex gap-2">
                  {DURATIONS.map(dur => (
                    <button key={dur.days} type="button" onClick={() => setDurationDays(dur.days)}
                      className={`flex-1 rounded-xl border p-3 text-center transition ${durationDays === dur.days ? "border-primary bg-primary/5" : "border-border hover:border-primary/20"}`}
                    >
                      <p className="text-sm font-semibold">{dur.label}</p>
                      {dur.badge && <p className="mt-0.5 text-[10px] text-emerald-600 font-medium">{dur.badge}</p>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ringkasan */}
              <div className="mb-5 rounded-xl border border-border bg-muted/30 p-4 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Harga per hari</span><span>Rp {selectedPos.price_per_day.toLocaleString("id-ID")}</span></div>
                <div className="flex justify-between text-muted-foreground mt-1"><span>Durasi</span><span>{durationDays} hari</span></div>
                {durationDays >= 14 && <div className="flex justify-between text-emerald-600 mt-1"><span>Diskon paket</span><span>-{durationDays >= 30 ? "20" : "10"}%</span></div>}
                <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
                  <span>Total</span>
                  <span className="text-lg text-primary">Rp {totalBudget.toLocaleString("id-ID")}</span>
                </div>
              </div>

              <Button className="w-full" disabled={adType === "product" && !targetId} onClick={handleSubmitForm}>
                Lanjut ke Pembayaran <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* ─── STEP 2: Pilih Metode Bayar ──────────────────────────────── */}
          {payStep === "payment" && (
            <div className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPayStep("form")}><ArrowLeft className="h-4 w-4" /></Button>
                <h2 className="font-semibold">Pilih Metode Pembayaran</h2>
              </div>

              {/* Rekap biaya */}
              <div className="mb-5 rounded-xl bg-primary/5 border border-primary/20 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{adType === "product" ? targetName : shopName}</p>
                  <p className="text-xs text-muted-foreground">{POSITION_LABELS[position]} · {durationDays} hari</p>
                </div>
                <p className="text-xl font-bold text-primary">Rp {totalBudget.toLocaleString("id-ID")}</p>
              </div>

              <Label className="mb-2 block">Metode Pembayaran</Label>
              <div className="space-y-2 mb-5">
                {PAYMENT_METHODS.map(m => {
                  const Icon = m.icon;
                  return (
                    <button key={m.value} type="button" onClick={() => setPaymentMethod(m.value)}
                      className={`flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition ${paymentMethod === m.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/20"}`}
                    >
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${paymentMethod === m.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{m.label}</p>
                        <p className="text-xs text-muted-foreground">{m.desc}</p>
                      </div>
                      {paymentMethod === m.value && <div className="h-2 w-2 rounded-full bg-primary" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-start gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3 text-xs text-blue-700 mb-4">
                <Info className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Iklan akan masuk antrian verifikasi admin setelah pembayaran dikonfirmasi. Proses verifikasi maksimal 1×24 jam.</span>
              </div>

              <Button className="w-full" disabled={snapBusy} onClick={handlePay}>
                {snapBusy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses…</> : `Bayar Rp ${totalBudget.toLocaleString("id-ID")}`}
              </Button>
            </div>
          )}

          {/* ─── STEP 3: Menunggu / Instruksi Transfer ───────────────────── */}
          {payStep === "waiting" && (
            <div className="p-6">
              <h2 className="mb-1 font-semibold">
                {paymentMethod === "transfer" ? "Instruksi Transfer Bank" : "Menunggu Konfirmasi Pembayaran"}
              </h2>
              <p className="mb-5 text-sm text-muted-foreground">
                {paymentMethod === "transfer"
                  ? "Transfer ke salah satu rekening berikut dan klik tombol konfirmasi setelah selesai."
                  : paymentUrl
                    ? "Selesaikan pembayaran di halaman yang sudah dibuka. Halaman ini akan otomatis update setelah lunas."
                    : "Pembayaran Anda sedang diproses. Halaman ini akan otomatis update."}
              </p>

              {paymentMethod === "transfer" && (
                <div className="space-y-3 mb-5">
                  <div className="mb-2 rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Nominal transfer</span>
                    <span className="text-xl font-bold text-primary">Rp {totalBudget.toLocaleString("id-ID")}</span>
                  </div>
                  {BANK_ACCOUNTS.map(acc => (
                    <div key={acc.bank} className="rounded-xl border border-border bg-card p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-semibold text-sm">{acc.bank}</span>
                        <button type="button" className="flex items-center gap-1 text-xs text-primary hover:underline"
                          onClick={() => { navigator.clipboard.writeText(acc.no); toast.success("Nomor rekening disalin!"); }}>
                          <Copy className="h-3 w-3" /> Salin
                        </button>
                      </div>
                      <p className="font-mono text-lg font-bold tracking-widest">{acc.no}</p>
                      <p className="text-xs text-muted-foreground">a/n {acc.name}</p>
                    </div>
                  ))}
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                    <strong>Penting:</strong> Transfer tepat sesuai nominal. Konfirmasi pembayaran di bawah setelah transfer selesai. Admin akan memverifikasi dalam 1×24 jam.
                  </div>
                  <Button className="w-full" onClick={handleManualConfirm}>
                    Saya Sudah Transfer — Konfirmasi
                  </Button>
                </div>
              )}

              {paymentMethod !== "transfer" && (
                <div className="space-y-3">
                  {paymentUrl && (
                    <Button variant="outline" className="w-full" onClick={() => window.open(paymentUrl, "_blank")}>
                      Buka Halaman Pembayaran <ChevronRight className="ml-1.5 h-4 w-4" />
                    </Button>
                  )}
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Mendeteksi pembayaran secara otomatis…</span>
                  </div>
                  <Button variant="ghost" className="w-full text-sm" onClick={handleManualConfirm}>
                    Pembayaran sudah selesai, lanjutkan →
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* ─── STEP 4: Sukses ───────────────────────────────────────────── */}
          {payStep === "success" && (
            <div className="flex flex-col items-center p-8 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-bold">Iklan Berhasil Diajukan!</h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                Pembayaran Anda sedang dikonfirmasi. Setelah lunas, iklan akan masuk antrian verifikasi admin dan ditayangkan dalam 1×24 jam.
              </p>
              <div className="mt-6 flex gap-3">
                <Button variant="outline" onClick={resetForm}>Pasang Iklan Lagi</Button>
                <Button onClick={() => { resetForm(); load(); }}>Lihat Status Iklan</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Daftar Iklan ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        {loading
          ? Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted/40 animate-pulse" />)
          : ads.length === 0
            ? (
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-16 text-center">
                <Megaphone className="mb-3 h-8 w-8 text-muted-foreground" />
                <p className="font-medium">Belum ada iklan</p>
                <p className="mt-1 text-sm text-muted-foreground">Pasang iklan untuk menjangkau lebih banyak pembeli di marketplace.</p>
                <Button className="mt-4" size="sm" onClick={() => { setShowForm(true); setPayStep("form"); }}>
                  <Plus className="h-4 w-4 mr-1" /> Pasang Iklan Pertama
                </Button>
              </div>
            )
            : ads.map(ad => {
              const cfg = STATUS_CONFIG[ad.status];
              const Icon = cfg.icon;
              const ctr = ad.impressions > 0 ? ((ad.clicks / ad.impressions) * 100).toFixed(1) : "—";
              const daysLeft = ad.ends_at ? Math.ceil((new Date(ad.ends_at).getTime() - Date.now()) / 86400000) : null;
              return (
                <div key={ad.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {ad.ad_type === "product" ? <Package className="h-5 w-5" /> : <Store className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">{ad.target_name}</span>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{POSITION_LABELS[ad.position]}</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Banknote className="h-3 w-3" />Rp {ad.budget_idr.toLocaleString("id-ID")}</span>
                          {daysLeft !== null && daysLeft > 0 && <><span>·</span><span className="text-emerald-600 font-medium">{daysLeft} hari tersisa</span></>}
                        </div>
                        {ad.reject_reason && <p className="mt-1 text-xs text-destructive">Ditolak: {ad.reject_reason}</p>}
                        {ad.status === "payment_pending" && (
                          <button type="button" className="mt-1.5 text-xs text-primary hover:underline"
                            onClick={() => {
                              setPendingAdId(ad.id); setAdType(ad.ad_type); setPosition(ad.position);
                              setDurationDays(ad.duration_days); setTargetId(ad.target_id); setTargetName(ad.target_name);
                              setShowForm(true); setPayStep("payment");
                            }}>
                            Selesaikan pembayaran →
                          </button>
                        )}
                      </div>
                    </div>
                    {ad.status === "active" && (
                      <div className="shrink-0 flex gap-3 text-right">
                        {[
                          { label: "Tayangan", value: ad.impressions.toLocaleString("id-ID"), icon: Eye },
                          { label: "Klik",     value: ad.clicks.toLocaleString("id-ID"),      icon: MousePointerClick },
                          { label: "CTR",      value: `${ctr}%`,                              icon: BarChart2 },
                        ].map(stat => {
                          const SIcon = stat.icon;
                          return (
                            <div key={stat.label} className="text-center">
                              <p className="font-bold text-sm">{stat.value}</p>
                              <p className="flex items-center gap-0.5 text-[10px] text-muted-foreground justify-center">
                                <SIcon className="h-2.5 w-2.5" />{stat.label}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
        }
      </div>
    </div>
  );
}
