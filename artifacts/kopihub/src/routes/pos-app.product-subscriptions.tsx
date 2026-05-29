import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { RefreshCcw, Plus, Trash2, Pencil, Loader2, Users, Package, Calendar, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/product-subscriptions")({
  head: () => ({ meta: [{ title: "Langganan Produk — Merchant" }] }),
  component: ProductSubscriptionsPage,
});

type MenuItem = { id: string; name: string; price: number };
type SubscriptionPlan = {
  id: string;
  menu_item_id: string;
  name: string;
  description: string | null;
  interval: "weekly" | "biweekly" | "monthly";
  price: number;
  original_price: number;
  is_active: boolean;
  subscriber_count: number;
  created_at: string;
  menu_item?: { name: string } | null;
};
type Subscriber = {
  id: string;
  plan_id: string;
  user_id: string;
  status: string;
  started_at: string;
  next_delivery_at: string | null;
  customer_name: string | null;
  customer_phone: string | null;
};

const INTERVAL_LABEL: Record<string, string> = {
  weekly: "Setiap Minggu", biweekly: "2 Minggu Sekali", monthly: "Setiap Bulan",
};

function defaultPlanForm() {
  return {
    menu_item_id: "", name: "", description: "",
    interval: "monthly" as "weekly" | "biweekly" | "monthly",
    price: 0, is_active: true,
  };
}

export default function ProductSubscriptionsPage() {
  const { shop } = useCurrentShop();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("plans");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState(defaultPlanForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!shop) return;
    setLoading(true);
    const [{ data: ps }, { data: items }, { data: subs }] = await Promise.all([
      (supabase as any).from("product_subscription_plans").select("*, menu_item:menu_items(name)").eq("shop_id", shop.id).order("created_at", { ascending: false }),
      supabase.from("menu_items").select("id,name,price").eq("shop_id", shop.id).eq("is_active", true).order("name"),
      (supabase as any).from("product_subscriptions").select("*").eq("shop_id", shop.id).order("started_at", { ascending: false }),
    ]);
    setPlans((ps ?? []) as SubscriptionPlan[]);
    setMenuItems((items as MenuItem[]) ?? []);
    setSubscribers((subs ?? []) as Subscriber[]);
    setLoading(false);
  }, [shop]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(defaultPlanForm()); setShowDialog(true); };
  const openEdit = (p: SubscriptionPlan) => {
    setEditing(p);
    setForm({ menu_item_id: p.menu_item_id, name: p.name, description: p.description ?? "", interval: p.interval, price: p.price, is_active: p.is_active });
    setShowDialog(true);
  };

  const save = async () => {
    if (!shop || !form.menu_item_id || !form.name || form.price <= 0) {
      toast.error("Produk, nama plan, dan harga wajib diisi"); return;
    }
    setSaving(true);
    const menuItem = menuItems.find(m => m.id === form.menu_item_id);
    const payload: any = {
      shop_id: shop.id, menu_item_id: form.menu_item_id,
      name: form.name.trim(), description: form.description.trim() || null,
      interval: form.interval, price: Number(form.price),
      original_price: menuItem?.price ?? form.price, is_active: form.is_active,
    };
    const { error } = editing
      ? await (supabase as any).from("product_subscription_plans").update(payload).eq("id", editing.id)
      : await (supabase as any).from("product_subscription_plans").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Plan diperbarui" : "Plan langganan dibuat");
    setShowDialog(false);
    load();
  };

  const toggleActive = async (p: SubscriptionPlan) => {
    await (supabase as any).from("product_subscription_plans").update({ is_active: !p.is_active }).eq("id", p.id);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus plan ini? Pelanggan aktif akan dinotifikasi.")) return;
    await (supabase as any).from("product_subscription_plans").delete().eq("id", id);
    load();
  };

  const updateSubStatus = async (id: string, status: string) => {
    await (supabase as any).from("product_subscriptions").update({ status }).eq("id", id);
    load();
  };

  const activeSubs = subscribers.filter(s => s.status === "active");
  const pausedSubs = subscribers.filter(s => s.status === "paused");

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RefreshCcw className="h-6 w-6" /> Langganan Produk Rutin
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Buat plan berlangganan — pelanggan terima produk secara berkala, pendapatan lebih stabil.
          </p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Buat Plan</Button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Plan Aktif", value: plans.filter(p => p.is_active).length, icon: Package },
          { label: "Pelanggan Aktif", value: activeSubs.length, icon: Users },
          { label: "Pelanggan Dijeda", value: pausedSubs.length, icon: Calendar },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="p-4 flex items-center gap-3">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>
          </Card>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4"><TabsTrigger value="plans">Plan Langganan</TabsTrigger><TabsTrigger value="subscribers">Pelanggan ({subscribers.length})</TabsTrigger></TabsList>

        <TabsContent value="plans">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : plans.length === 0 ? (
            <Card className="flex flex-col items-center py-14 text-center gap-3">
              <RefreshCcw className="h-10 w-10 text-muted-foreground/40" />
              <p className="font-semibold">Belum ada plan langganan</p>
              <p className="text-sm text-muted-foreground">Buat plan pertama untuk mulai menerima pelanggan rutin.</p>
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Buat Plan</Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {plans.map(p => (
                <Card key={p.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold">{p.name}</span>
                        <Badge className={p.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"} variant="outline">
                          {p.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                        <Badge variant="outline" className="text-[11px]">{INTERVAL_LABEL[p.interval]}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{p.menu_item?.name} · <b className="text-foreground">{formatIDR(p.price)}</b> / pengiriman</p>
                      {p.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">{p.subscriber_count ?? 0} pelanggan aktif</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => toggleActive(p)} className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors">
                        {p.is_active ? <ToggleRight className="h-5 w-5 text-green-600" /> : <ToggleLeft className="h-5 w-5" />}
                      </button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(p)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="subscribers">
          {subscribers.length === 0 ? (
            <Card className="flex flex-col items-center py-14 text-center gap-3">
              <Users className="h-10 w-10 text-muted-foreground/40" />
              <p className="font-semibold">Belum ada pelanggan</p>
              <p className="text-sm text-muted-foreground">Pelanggan akan muncul setelah mereka subscribe dari halaman toko.</p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40"><tr>{["Pelanggan", "Plan", "Status", "Mulai", "Pengiriman Berikutnya", "Aksi"].map(h => (<th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>))}</tr></thead>
                <tbody className="divide-y divide-border">
                  {subscribers.map(s => {
                    const plan = plans.find(p => p.id === s.plan_id);
                    return (
                      <tr key={s.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <div className="font-medium">{s.customer_name ?? s.user_id.slice(0, 8)}</div>
                          {s.customer_phone && <div className="text-xs text-muted-foreground">{s.customer_phone}</div>}
                        </td>
                        <td className="px-4 py-3 text-xs">{plan?.name ?? "-"}</td>
                        <td className="px-4 py-3">
                          <Badge className={s.status === "active" ? "bg-green-100 text-green-700" : s.status === "paused" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"} variant="outline">
                            {s.status === "active" ? "Aktif" : s.status === "paused" ? "Dijeda" : "Berhenti"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs">{new Date(s.started_at).toLocaleDateString("id-ID")}</td>
                        <td className="px-4 py-3 text-xs">{s.next_delivery_at ? new Date(s.next_delivery_at).toLocaleDateString("id-ID") : "-"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {s.status === "active" && <Button size="sm" variant="ghost" className="text-amber-600 h-7 text-xs" onClick={() => updateSubStatus(s.id, "paused")}>Jeda</Button>}
                            {s.status === "paused" && <Button size="sm" variant="ghost" className="text-green-600 h-7 text-xs" onClick={() => updateSubStatus(s.id, "active")}>Aktifkan</Button>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Plan" : "Buat Plan Langganan"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Produk / Menu</Label>
              <Select value={form.menu_item_id} onValueChange={v => setForm(f => ({ ...f, menu_item_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih produk..." /></SelectTrigger>
                <SelectContent>{menuItems.map(m => (<SelectItem key={m.id} value={m.id}>{m.name} — {formatIDR(m.price)}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nama Plan</Label>
              <Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contoh: Kopi Bulanan Premium" />
            </div>
            <div>
              <Label>Deskripsi (opsional)</Label>
              <Textarea className="mt-1" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Jelaskan manfaat berlangganan..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Interval Pengiriman</Label>
                <Select value={form.interval} onValueChange={v => setForm(f => ({ ...f, interval: v as any }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Setiap Minggu</SelectItem>
                    <SelectItem value="biweekly">2 Minggu Sekali</SelectItem>
                    <SelectItem value="monthly">Setiap Bulan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Harga per Pengiriman (Rp)</Label>
                <Input className="mt-1" type="number" min={0} value={form.price || ""} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="ps-active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              <label htmlFor="ps-active" className="text-sm cursor-pointer">Langsung aktif (bisa didaftarkan pembeli)</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editing ? "Simpan" : "Buat Plan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
