import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Award, Trophy, Gift, Clock, AlertTriangle, Cake, Users, Star } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/loyalty")({
  component: LoyaltyPage,
});

type Settings = {
  shop_id: string;
  is_active: boolean;
  rupiah_per_point: number;
  point_value: number;
  min_redeem_points: number;
  max_redeem_percent: number;
  // Extended settings (may not exist in DB yet — handled gracefully)
  points_expire_days?: number | null;
  birthday_voucher_enabled?: boolean;
  birthday_voucher_amount?: number;
  birthday_voucher_expiry_days?: number;
};

type Holder = {
  user_id: string;
  balance: number;
  total_earned: number;
  total_redeemed: number;
  display_name: string | null;
  phone: string | null;
  birthday?: string | null;
};

const TIER_THRESHOLDS = [
  { name: "Bronze",   min: 0,     icon: "🥉" },
  { name: "Silver",   min: 1000,  icon: "🥈" },
  { name: "Gold",     min: 5000,  icon: "🥇" },
  { name: "Platinum", min: 10000, icon: "💎" },
];

function tierOf(totalEarned: number) {
  return TIER_THRESHOLDS.slice().reverse().find(t => totalEarned >= t.min) ?? TIER_THRESHOLDS[0];
}

function todayMMDD() {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function LoyaltyPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [holders, setHolders]   = useState<Holder[]>([]);
  const [birthdayCustomers, setBirthdayCustomers] = useState<Holder[]>([]);
  const [activeTab, setActiveTab] = useState<"settings" | "members" | "birthday">("settings");

  useEffect(() => {
    if (shopLoading || !shop) return;
    (async () => {
      setLoading(true);

      // Load loyalty settings
      const { data } = await supabase
        .from("loyalty_settings")
        .select("*")
        .eq("shop_id", shop.id)
        .maybeSingle();

      setSettings(
        (data as Settings | null) ?? {
          shop_id: shop.id,
          is_active: false,
          rupiah_per_point: 10000,
          point_value: 1000,
          min_redeem_points: 10,
          max_redeem_percent: 50,
          points_expire_days: null,
          birthday_voucher_enabled: false,
          birthday_voucher_amount: 25000,
          birthday_voucher_expiry_days: 7,
        },
      );

      // Load top holders
      const { data: pts } = await supabase
        .from("loyalty_points")
        .select("user_id,balance,total_earned,total_redeemed")
        .eq("shop_id", shop.id)
        .order("balance", { ascending: false })
        .limit(50);

      const ids = (pts ?? []).map((p: any) => p.user_id);
      let profiles: { user_id: string; display_name: string | null; phone: string | null; birthday?: string | null }[] = [];
      if (ids.length > 0) {
        const { data: cp } = await supabase
          .from("customer_profiles")
          .select("user_id,display_name,phone")
          .in("user_id", ids);
        profiles = (cp ?? []) as typeof profiles;
      }

      const enriched = (pts ?? []).map((p: any) => {
        const cp = profiles.find((x) => x.user_id === p.user_id);
        return {
          ...(p as { user_id: string; balance: number; total_earned: number; total_redeemed: number }),
          display_name: cp?.display_name ?? null,
          phone:        cp?.phone ?? null,
          birthday:     cp?.birthday ?? null,
        };
      });

      setHolders(enriched);

      // Filter birthday customers (today's MM-DD)
      const today = todayMMDD();
      const bday = enriched.filter(h => {
        if (!h.birthday) return false;
        // birthday stored as YYYY-MM-DD or MM-DD
        const parts = h.birthday.split("-");
        const mmdd = parts.length >= 3 ? `${parts[1]}-${parts[2]}` : h.birthday;
        return mmdd === today;
      });
      setBirthdayCustomers(bday);

      setLoading(false);
    })();
  }, [shop, shopLoading]);

  async function save() {
    if (!shop || !settings) return;
    setSaving(true);
    const payload: any = {
      shop_id:            shop.id,
      is_active:          settings.is_active,
      rupiah_per_point:   settings.rupiah_per_point,
      point_value:        settings.point_value,
      min_redeem_points:  settings.min_redeem_points,
      max_redeem_percent: settings.max_redeem_percent,
    };
    // Try to save extended fields — graceful if columns don't exist
    if (settings.points_expire_days !== undefined) payload.points_expire_days = settings.points_expire_days;
    if (settings.birthday_voucher_enabled !== undefined) payload.birthday_voucher_enabled = settings.birthday_voucher_enabled;
    if (settings.birthday_voucher_amount !== undefined)  payload.birthday_voucher_amount = settings.birthday_voucher_amount;
    if (settings.birthday_voucher_expiry_days !== undefined) payload.birthday_voucher_expiry_days = settings.birthday_voucher_expiry_days;

    const { error } = await supabase
      .from("loyalty_settings")
      .upsert(payload, { onConflict: "shop_id" });

    setSaving(false);
    if (error) {
      // Retry without extended fields if column error
      if (error.message.includes("column")) {
        const { error: e2 } = await supabase
          .from("loyalty_settings")
          .upsert({
            shop_id: shop.id, is_active: settings.is_active,
            rupiah_per_point: settings.rupiah_per_point, point_value: settings.point_value,
            min_redeem_points: settings.min_redeem_points, max_redeem_percent: settings.max_redeem_percent,
          }, { onConflict: "shop_id" });
        if (e2) { toast.error(e2.message); return; }
        toast.success("Pengaturan utama tersimpan (fitur lanjutan butuh migrasi DB)");
        return;
      }
      toast.error(error.message);
      return;
    }
    toast.success("Pengaturan loyalty tersimpan");
  }

  if (loading || !settings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const tabs = [
    { key: "settings" as const, label: "Pengaturan",    icon: Award },
    { key: "members"  as const, label: `Member (${holders.length})`, icon: Users },
    { key: "birthday" as const, label: `Ulang Tahun${birthdayCustomers.length > 0 ? ` (${birthdayCustomers.length})` : ""}`, icon: Cake },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <header>
        <h1 className="text-2xl font-semibold">Loyalty & Tier</h1>
        <p className="text-sm text-muted-foreground">
          Kelola poin, tier member, voucher ulang tahun, dan kadaluarsa poin.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-border pb-0">
        {tabs.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {t.key === "birthday" && birthdayCustomers.length > 0 && (
                <span className="ml-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {birthdayCustomers.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB: SETTINGS ── */}
      {activeTab === "settings" && (
        <div className="space-y-5">
          {/* Toggle aktif */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                <span className="font-medium">Aktifkan Program Loyalty</span>
              </div>
              <Switch
                checked={settings.is_active}
                onCheckedChange={v => setSettings({ ...settings, is_active: v })}
              />
            </div>
          </section>

          {/* Poin dasar */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h2 className="font-medium flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" /> Pengaturan Poin</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs">Tiap belanja Rp… dapat 1 poin</Label>
                <Input type="number" value={settings.rupiah_per_point}
                  onChange={e => setSettings({ ...settings, rupiah_per_point: Number(e.target.value) || 0 })} />
                <p className="mt-1 text-xs text-muted-foreground">Mis. 10.000 → tiap Rp10.000 = 1 poin</p>
              </div>
              <div>
                <Label className="text-xs">Nilai 1 poin saat redeem (Rp)</Label>
                <Input type="number" value={settings.point_value}
                  onChange={e => setSettings({ ...settings, point_value: Number(e.target.value) || 0 })} />
                <p className="mt-1 text-xs text-muted-foreground">Mis. 1.000 → 10 poin = {formatIDR(10 * settings.point_value)}</p>
              </div>
              <div>
                <Label className="text-xs">Min. poin untuk redeem</Label>
                <Input type="number" value={settings.min_redeem_points}
                  onChange={e => setSettings({ ...settings, min_redeem_points: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label className="text-xs">Maks. % subtotal yg bisa dipotong poin</Label>
                <Input type="number" value={settings.max_redeem_percent}
                  onChange={e => setSettings({ ...settings, max_redeem_percent: Number(e.target.value) || 0 })} />
              </div>
            </div>
          </section>

          {/* Tier info */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h2 className="font-medium flex items-center gap-2"><Trophy className="h-4 w-4 text-yellow-500" /> Tier Member</h2>
            <p className="text-xs text-muted-foreground">Tier ditentukan berdasarkan total poin yang pernah dikumpulkan customer (lifetime earned).</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {TIER_THRESHOLDS.map(t => (
                <div key={t.name} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                  <span className="text-xl">{t.icon}</span>
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.min === 0 ? "0 – 999 poin earned" : `${t.min.toLocaleString()}+ poin earned`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Kadaluarsa poin */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-orange-500" /> Kadaluarsa Poin
              </h2>
              <Switch
                checked={!!settings.points_expire_days}
                onCheckedChange={v => setSettings({ ...settings, points_expire_days: v ? 365 : null })}
              />
            </div>
            {settings.points_expire_days && (
              <div>
                <Label className="text-xs">Poin kadaluarsa setelah (hari)</Label>
                <Input type="number" value={settings.points_expire_days ?? 365}
                  onChange={e => setSettings({ ...settings, points_expire_days: Number(e.target.value) || 365 })}
                  className="max-w-[160px]"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Customer akan mendapat notifikasi 7 hari sebelum poin hangus.
                </p>
              </div>
            )}
          </section>

          {/* Voucher ulang tahun */}
          <section className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-medium flex items-center gap-2">
                <Cake className="h-4 w-4 text-rose-500" /> Voucher Ulang Tahun
              </h2>
              <Switch
                checked={!!settings.birthday_voucher_enabled}
                onCheckedChange={v => setSettings({ ...settings, birthday_voucher_enabled: v })}
              />
            </div>
            {settings.birthday_voucher_enabled && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs">Nominal diskon (Rp)</Label>
                  <Input type="number" value={settings.birthday_voucher_amount ?? 25000}
                    onChange={e => setSettings({ ...settings, birthday_voucher_amount: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <Label className="text-xs">Berlaku berapa hari</Label>
                  <Input type="number" value={settings.birthday_voucher_expiry_days ?? 7}
                    onChange={e => setSettings({ ...settings, birthday_voucher_expiry_days: Number(e.target.value) || 7 })} />
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Voucher dikirim otomatis H-1 ulang tahun customer. Customer harus mengisi tanggal lahir di profil.
                </p>
              </div>
            )}
          </section>

          <div className="flex justify-end">
            <Button onClick={save} disabled={saving} size="lg">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan Pengaturan
            </Button>
          </div>
        </div>
      )}

      {/* ── TAB: MEMBERS ── */}
      {activeTab === "members" && (
        <section className="space-y-3">
          <p className="text-sm text-muted-foreground">Top 50 member berdasarkan saldo poin aktif.</p>
          {holders.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-16 text-center">
              <Users className="h-10 w-10 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">Belum ada member loyalty.</p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {holders.map((h, idx) => {
                const tier = tierOf(h.total_earned);
                return (
                  <div key={h.user_id} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-center">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium">{h.display_name ?? "Customer"}</p>
                        <span className="text-sm">{tier.icon}</span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1">{tier.name}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{h.phone ?? "-"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-sm">{h.balance.toLocaleString("id-ID")} poin</p>
                      <p className="text-xs text-muted-foreground">earn {h.total_earned.toLocaleString()} · redeem {h.total_redeemed.toLocaleString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ── TAB: BIRTHDAY ── */}
      {activeTab === "birthday" && (
        <section className="space-y-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/30 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Cake className="h-5 w-5 text-rose-600" />
              <p className="font-semibold text-rose-800 dark:text-rose-300">
                Customer Ulang Tahun Hari Ini
              </p>
            </div>
            <p className="text-xs text-rose-600 dark:text-rose-400">
              {birthdayCustomers.length === 0
                ? "Tidak ada customer yang ulang tahun hari ini."
                : `${birthdayCustomers.length} customer ulang tahun hari ini${settings.birthday_voucher_enabled ? " — voucher terkirim otomatis." : "."}`
              }
            </p>
          </div>

          {birthdayCustomers.length > 0 ? (
            <div className="divide-y divide-border rounded-xl border border-border bg-card overflow-hidden">
              {birthdayCustomers.map(h => (
                <div key={h.user_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600 font-bold">
                    🎂
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{h.display_name ?? "Customer"}</p>
                    <p className="text-xs text-muted-foreground">{h.phone ?? "-"} · {h.balance.toLocaleString()} poin</p>
                  </div>
                  {settings.birthday_voucher_enabled ? (
                    <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px]">
                      Voucher {formatIDR(settings.birthday_voucher_amount ?? 0)} Terkirim
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Voucher Nonaktif</Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <Cake className="h-10 w-10 text-muted-foreground opacity-20" />
              <p className="text-sm text-muted-foreground">Tidak ada customer ulang tahun hari ini</p>
              <p className="text-xs text-muted-foreground">Pastikan customer mengisi tanggal lahir di profil mereka</p>
            </div>
          )}

          {!settings.birthday_voucher_enabled && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">Voucher ulang tahun belum aktif</p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                  Aktifkan di tab Pengaturan untuk otomatis kirim voucher ke customer yang berulang tahun.
                </p>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
