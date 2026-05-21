import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Plus, Trophy, Gift, Trash2, ArrowLeft, Crown } from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/loyalty/rewards")({
  component: LoyaltyRewardsPage,
});

type Tier = {
  id: string;
  shop_id: string;
  name: string;
  min_points: number;
  multiplier: number;
  color: string | null;
  sort_order: number;
  is_active: boolean;
};

type Reward = {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  points_required: number;
  reward_type: string;
  reward_value: number | null;
  stock: number | null;
  is_active: boolean;
  current_redemptions: number;
};

const REWARD_TYPES = [
  { v: "discount", l: "Diskon (Rp)" },
  { v: "free_item", l: "Item Gratis" },
  { v: "free_shipping", l: "Gratis Ongkir" },
  { v: "voucher", l: "Voucher" },
];

function LoyaltyRewardsPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [tab, setTab] = useState<"tiers" | "rewards">("tiers");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [tierDlg, setTierDlg] = useState<Partial<Tier> | null>(null);
  const [rewardDlg, setRewardDlg] = useState<Partial<Reward> | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    if (!shop) return;
    setLoading(true);
    const [tRes, rRes] = await Promise.all([
      (supabase as any).from("loyalty_tiers").select("*").eq("shop_id", shop.id).order("sort_order"),
      (supabase as any).from("loyalty_rewards").select("*").eq("shop_id", shop.id).order("points_required"),
    ]);
    setTiers(tRes.data ?? []);
    setRewards(rRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!shopLoading && shop) load();
  }, [shop, shopLoading]);

  const saveTier = async () => {
    if (!shop || !tierDlg?.name) { toast.error("Nama tier wajib"); return; }
    setBusy(true);
    const payload = {
      shop_id: shop.id,
      name: tierDlg.name,
      min_points: Number(tierDlg.min_points ?? 0),
      multiplier: Number(tierDlg.multiplier ?? 1),
      color: tierDlg.color ?? null,
      sort_order: Number(tierDlg.sort_order ?? tiers.length),
      is_active: tierDlg.is_active ?? true,
    };
    const { error } = tierDlg.id
      ? await (supabase as any).from("loyalty_tiers").update(payload).eq("id", tierDlg.id)
      : await (supabase as any).from("loyalty_tiers").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Tier tersimpan");
    setTierDlg(null);
    load();
  };

  const delTier = async (id: string) => {
    if (!confirm("Hapus tier ini?")) return;
    const { error } = await (supabase as any).from("loyalty_tiers").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Tier dihapus");
    load();
  };

  const saveReward = async () => {
    if (!shop || !rewardDlg?.name) { toast.error("Nama reward wajib"); return; }
    setBusy(true);
    const payload = {
      shop_id: shop.id,
      name: rewardDlg.name,
      description: rewardDlg.description ?? null,
      points_required: Number(rewardDlg.points_required ?? 0),
      cost_points: Number(rewardDlg.points_required ?? 0),
      reward_type: rewardDlg.reward_type ?? "discount",
      reward_value: rewardDlg.reward_value != null ? Number(rewardDlg.reward_value) : null,
      stock: rewardDlg.stock != null ? Number(rewardDlg.stock) : null,
      is_active: rewardDlg.is_active ?? true,
    };
    const { error } = rewardDlg.id
      ? await (supabase as any).from("loyalty_rewards").update(payload).eq("id", rewardDlg.id)
      : await (supabase as any).from("loyalty_rewards").insert(payload);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Reward tersimpan");
    setRewardDlg(null);
    load();
  };

  const delReward = async (id: string) => {
    if (!confirm("Hapus reward ini?")) return;
    const { error } = await (supabase as any).from("loyalty_rewards").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Reward dihapus");
    load();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <header className="space-y-2">
        <Link to="/pos-app/loyalty" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3 w-3" /> Kembali ke Loyalty
        </Link>
        <h1 className="text-2xl font-semibold">Tier & Reward</h1>
        <p className="text-sm text-muted-foreground">
          Kustomisasi tier member dan katalog hadiah yang bisa ditukar dengan poin.
        </p>
      </header>

      <div className="flex gap-1 border-b border-border">
        {[
          { k: "tiers" as const, l: "Tier Member", icon: Trophy },
          { k: "rewards" as const, l: "Katalog Reward", icon: Gift },
        ].map(t => {
          const I = t.icon;
          return (
            <button key={t.k} onClick={() => setTab(t.k)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                tab === t.k ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}>
              <I className="h-4 w-4" /> {t.l}
            </button>
          );
        })}
      </div>

      {tab === "tiers" && (
        <section className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setTierDlg({ name: "", min_points: 0, multiplier: 1, is_active: true, sort_order: tiers.length })}>
              <Plus className="mr-1 h-4 w-4" /> Tambah Tier
            </Button>
          </div>
          {tiers.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Belum ada tier. Tambahkan tier seperti Bronze, Silver, Gold.
            </Card>
          ) : (
            <div className="space-y-2">
              {tiers.map(t => (
                <Card key={t.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Crown className="h-5 w-5" style={{ color: t.color ?? "#666" }} />
                    <div>
                      <p className="font-medium">{t.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Min. {t.min_points} poin lifetime · {t.multiplier}× earning
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!t.is_active && <Badge variant="outline">Nonaktif</Badge>}
                    <Button size="sm" variant="ghost" onClick={() => setTierDlg(t)}>Edit</Button>
                    <Button size="sm" variant="ghost" onClick={() => delTier(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "rewards" && (
        <section className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setRewardDlg({ name: "", points_required: 100, reward_type: "discount", reward_value: 10000, is_active: true })}>
              <Plus className="mr-1 h-4 w-4" /> Tambah Reward
            </Button>
          </div>
          {rewards.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Belum ada reward. Tambahkan reward yang bisa ditukar customer.
            </Card>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {rewards.map(r => (
                <Card key={r.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{r.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{r.description || "—"}</p>
                    </div>
                    {!r.is_active && <Badge variant="outline">Off</Badge>}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-primary">{r.points_required} poin</span>
                    <span className="text-muted-foreground">
                      {r.reward_type === "discount" ? formatIDR(r.reward_value ?? 0) :
                       REWARD_TYPES.find(x => x.v === r.reward_type)?.l ?? r.reward_type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Ditukar: {r.current_redemptions ?? 0}{r.stock != null ? ` / ${r.stock}` : ""}</span>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => setRewardDlg(r)}>Edit</Button>
                      <Button size="sm" variant="ghost" className="h-7" onClick={() => delReward(r.id)}>
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Tier Dialog */}
      <Dialog open={!!tierDlg} onOpenChange={(o) => !o && setTierDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{tierDlg?.id ? "Edit Tier" : "Tier Baru"}</DialogTitle></DialogHeader>
          {tierDlg && (
            <div className="space-y-3">
              <div><Label>Nama</Label>
                <Input value={tierDlg.name ?? ""} onChange={e => setTierDlg({ ...tierDlg, name: e.target.value })} placeholder="Bronze / Silver / Gold" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Min. Poin Lifetime</Label>
                  <Input type="number" value={tierDlg.min_points ?? 0} onChange={e => setTierDlg({ ...tierDlg, min_points: Number(e.target.value) })} />
                </div>
                <div><Label>Multiplier Earning</Label>
                  <Input type="number" step="0.1" value={tierDlg.multiplier ?? 1} onChange={e => setTierDlg({ ...tierDlg, multiplier: Number(e.target.value) })} />
                </div>
              </div>
              <div><Label>Warna (hex)</Label>
                <Input value={tierDlg.color ?? ""} onChange={e => setTierDlg({ ...tierDlg, color: e.target.value })} placeholder="#cd7f32" />
              </div>
              <div className="flex items-center justify-between">
                <Label>Aktif</Label>
                <Switch checked={tierDlg.is_active ?? true} onCheckedChange={v => setTierDlg({ ...tierDlg, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setTierDlg(null)}>Batal</Button>
            <Button onClick={saveTier} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reward Dialog */}
      <Dialog open={!!rewardDlg} onOpenChange={(o) => !o && setRewardDlg(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{rewardDlg?.id ? "Edit Reward" : "Reward Baru"}</DialogTitle></DialogHeader>
          {rewardDlg && (
            <div className="space-y-3">
              <div><Label>Nama</Label>
                <Input value={rewardDlg.name ?? ""} onChange={e => setRewardDlg({ ...rewardDlg, name: e.target.value })} />
              </div>
              <div><Label>Deskripsi</Label>
                <Input value={rewardDlg.description ?? ""} onChange={e => setRewardDlg({ ...rewardDlg, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Poin Dibutuhkan</Label>
                  <Input type="number" value={rewardDlg.points_required ?? 0} onChange={e => setRewardDlg({ ...rewardDlg, points_required: Number(e.target.value) })} />
                </div>
                <div><Label>Tipe</Label>
                  <Select value={rewardDlg.reward_type ?? "discount"} onValueChange={v => setRewardDlg({ ...rewardDlg, reward_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {REWARD_TYPES.map(t => <SelectItem key={t.v} value={t.v}>{t.l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Nilai (Rp atau jumlah)</Label>
                  <Input type="number" value={rewardDlg.reward_value ?? 0} onChange={e => setRewardDlg({ ...rewardDlg, reward_value: Number(e.target.value) })} />
                </div>
                <div><Label>Stok (kosong = unlimited)</Label>
                  <Input type="number" value={rewardDlg.stock ?? ""} onChange={e => setRewardDlg({ ...rewardDlg, stock: e.target.value === "" ? null : Number(e.target.value) })} />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <Label>Aktif</Label>
                <Switch checked={rewardDlg.is_active ?? true} onCheckedChange={v => setRewardDlg({ ...rewardDlg, is_active: v })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRewardDlg(null)}>Batal</Button>
            <Button onClick={saveReward} disabled={busy}>
              {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
