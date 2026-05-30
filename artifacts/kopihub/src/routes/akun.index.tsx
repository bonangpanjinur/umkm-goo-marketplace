import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, ShoppingBag, Heart, Bell, MapPin, Star, User, Cake, Award } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/akun/")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading]  = useState(true);
  const [saving, setSaving]    = useState(false);
  const [form, setForm]        = useState({ display_name: "", phone: "", email: "", birthday: "" });
  const [stats, setStats]      = useState({ orders: 0, wishlist: 0, notifications: 0, totalSpent: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [buyerRatings, setBuyerRatings] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [profileRes, orderRes, wishlistRes, notifRes, ratingsRes] = await Promise.all([
        supabase.from("customer_profiles").select("display_name, phone, email, birthday").eq("user_id", user.id).maybeSingle(),
        supabase.from("orders").select("id, status, total, created_at, shop:shops(name, slug, logo_url)").eq("customer_user_id", user.id).like("order_no", "MKT-%").order("created_at", { ascending: false }).limit(3),
        supabase.from("wishlists" as any).select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("notifications" as any).select("id", { count: "exact", head: true }).eq("recipient_user_id", user.id).is("read_at", null),
        supabase.from("buyer_ratings" as any).select("id, rating, comment, created_at, shop:shops(name)").eq("rated_user_id", user.id).order("created_at", { ascending: false }).limit(20),
      ]);

      const allOrders = (orderRes.data as any[]) ?? [];
      const totalSpent = allOrders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0);

      setForm({
        display_name: (profileRes.data as any)?.display_name || user.user_metadata?.full_name || "",
        phone:        (profileRes.data as any)?.phone || "",
        email:        (profileRes.data as any)?.email || user.email || "",
        birthday:     (profileRes.data as any)?.birthday || "",
      });
      setRecentOrders(allOrders);
      setBuyerRatings((ratingsRes.data as any[]) ?? []);

      const { count: orderCount } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("customer_user_id", user.id).like("order_no", "MKT-%");
      setStats({
        orders:        orderCount ?? 0,
        wishlist:      (wishlistRes as any).count ?? 0,
        notifications: (notifRes as any).count ?? 0,
        totalSpent,
      });
      setLoading(false);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    if (!form.display_name.trim()) { toast.error("Nama wajib diisi"); return; }
    setSaving(true);
    const { error } = await supabase.from("customer_profiles").upsert({
      user_id:      user.id,
      display_name: form.display_name.trim().slice(0, 100),
      phone:        form.phone.trim().slice(0, 20) || null,
      email:        form.email.trim().slice(0, 255) || null,
      birthday:     form.birthday || null,
    } as any, { onConflict: "user_id" });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profil tersimpan");
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
        <Skeleton className="h-16 w-16 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <Skeleton className="h-7 w-10" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3 rounded-xl border border-border bg-card p-4">
            <Skeleton className="h-14 w-14 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );

  const initials = form.display_name
    ? form.display_name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
    : (user?.email?.[0] ?? "U").toUpperCase();

  const STATUS_LABEL: Record<string, string> = {
    pending: "Menunggu", confirmed: "Dikonfirmasi", preparing: "Disiapkan",
    ready: "Siap", in_delivery: "Diantar", delivered: "Terkirim",
    completed: "Selesai", cancelled: "Dibatalkan",
  };
  const STATUS_COLOR: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700", confirmed: "bg-blue-100 text-blue-700",
    preparing: "bg-blue-100 text-blue-700", ready: "bg-violet-100 text-violet-700",
    in_delivery: "bg-indigo-100 text-indigo-700", delivered: "bg-emerald-100 text-emerald-700",
    completed: "bg-emerald-100 text-emerald-700", cancelled: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-6">
      {/* Avatar + name */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-bold text-primary-foreground shadow">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg truncate">{form.display_name || "Pembeli"}</p>
          <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Link to="/akun/pesanan" className="group flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-4 text-center transition hover:border-primary/50 hover:shadow-sm">
          <ShoppingBag className="h-5 w-5 text-primary" />
          <p className="text-2xl font-bold">{stats.orders}</p>
          <p className="text-xs text-muted-foreground">Pesanan</p>
        </Link>
        <Link to="/akun/wishlist" className="group flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-4 text-center transition hover:border-primary/50 hover:shadow-sm">
          <Heart className="h-5 w-5 text-rose-500" />
          <p className="text-2xl font-bold">{stats.wishlist}</p>
          <p className="text-xs text-muted-foreground">Wishlist</p>
        </Link>
        <Link to="/akun/notifikasi" className="group relative flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-4 text-center transition hover:border-primary/50 hover:shadow-sm">
          {stats.notifications > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive animate-pulse" />
          )}
          <Bell className="h-5 w-5 text-amber-500" />
          <p className="text-2xl font-bold">{stats.notifications}</p>
          <p className="text-xs text-muted-foreground">Belum dibaca</p>
        </Link>
        <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-card p-4 text-center">
          <Star className="h-5 w-5 text-amber-400" />
          <p className="text-lg font-bold leading-tight">{formatIDR(stats.totalSpent)}</p>
          <p className="text-xs text-muted-foreground">Total belanja</p>
        </div>
      </div>

      {/* Recent orders */}
      {recentOrders.length > 0 && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold">Pesanan Terbaru</h3>
            <Link to="/akun/pesanan" className="text-xs text-primary hover:underline">Lihat semua →</Link>
          </div>
          <ul className="divide-y divide-border">
            {recentOrders.map(o => (
              <li key={o.id}>
                <Link to="/akun/pesanan/$orderId" params={{ orderId: o.id }} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                  {o.shop?.logo_url
                    ? <img src={o.shop.logo_url} className="h-9 w-9 rounded-lg object-cover border border-border" alt="" />
                    : <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted"><ShoppingBag className="h-4 w-4 text-muted-foreground" /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{o.shop?.name ?? "Toko"}</p>
                    <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold">{formatIDR(o.total)}</p>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_COLOR[o.status] ?? "bg-muted text-muted-foreground"}`}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reputasi Pembeli */}
      {buyerRatings.length > 0 && (() => {
        const avg = (buyerRatings.reduce((s: number, r: any) => s + r.rating, 0) / buyerRatings.length);
        const LABEL: Record<number, string> = { 1: "Sangat Bermasalah", 2: "Kurang Baik", 3: "Cukup", 4: "Baik", 5: "Pembeli Terbaik" };
        const COLOR: Record<number, string> = {
          1: "bg-red-100 text-red-700 border-red-200", 2: "bg-orange-100 text-orange-700 border-orange-200",
          3: "bg-amber-100 text-amber-700 border-amber-200", 4: "bg-emerald-100 text-emerald-700 border-emerald-200",
          5: "bg-emerald-100 text-emerald-700 border-emerald-200",
        };
        const rounded = Math.round(avg);
        return (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="border-b border-border px-4 py-3 flex items-center gap-2">
              <Award className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold">Reputasi Pembeli Anda</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-4">
                <div className="text-center shrink-0">
                  <p className="text-3xl font-bold">{avg.toFixed(1)}</p>
                  <div className="flex justify-center mt-0.5">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} className={`h-3 w-3 ${n <= rounded ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`} />
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{buyerRatings.length} penilaian</p>
                </div>
                <div className="flex-1">
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${COLOR[rounded]}`}>
                    <Award className="h-3.5 w-3.5" />
                    {LABEL[rounded]}
                  </span>
                  <p className="text-xs text-muted-foreground mt-2">
                    Penilaian dari pedagang tempat Anda pernah berbelanja. Skor ini membangun reputasi Anda di marketplace.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                {buyerRatings.slice(0, 3).map((r: any) => (
                  <div key={r.id} className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2">
                    <div className="flex shrink-0 mt-0.5">
                      {[1,2,3,4,5].map(n => (
                        <Star key={n} className={`h-3 w-3 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20"}`} />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">{r.shop?.name ?? "Toko"}</p>
                      {r.comment && <p className="text-[11px] text-muted-foreground truncate">{r.comment}</p>}
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {new Date(r.created_at).toLocaleDateString("id-ID", { day:"numeric", month:"short" })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit profile form */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-4 py-3 flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold">Edit Profil</h3>
        </div>
        <div className="p-4 space-y-4">
          <div><Label>Nama lengkap</Label><Input className="mt-1" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} maxLength={100} /></div>
          <div><Label>No. WhatsApp</Label><Input className="mt-1" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} maxLength={20} placeholder="08xxxxxxxxx" inputMode="tel" /></div>
          <div><Label>Email</Label><Input className="mt-1" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} maxLength={255} /></div>
          <div>
            <Label className="flex items-center gap-1.5">
              <Cake className="h-3.5 w-3.5 text-rose-500" /> Tanggal Lahir
            </Label>
            <Input className="mt-1" type="date" value={form.birthday} onChange={e => setForm({ ...form, birthday: e.target.value })} />
            <p className="mt-1 text-xs text-muted-foreground">Digunakan untuk voucher ulang tahun dari toko.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={save} disabled={saving} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {saving ? "Menyimpan…" : "Simpan Profil"}
            </Button>
            <Link to="/akun/alamat" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
              <MapPin className="h-3.5 w-3.5" /> Kelola Alamat
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
