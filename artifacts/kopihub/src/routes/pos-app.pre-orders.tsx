import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Calendar, Clock, Package, Pencil, AlertTriangle, CheckCircle2, Hourglass } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/pre-orders")({
  head: () => ({ meta: [{ title: "Pre-Order Mode — Merchant" }] }),
  component: PreOrdersPage,
});

type Item = {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  is_pre_order: boolean;
  pre_order_open_at: string | null;
  pre_order_close_at: string | null;
  pre_order_estimated_ship_at: string | null;
  pre_order_min_qty: number | null;
  pre_order_current_qty: number;
};

function statusOf(item: Item): { label: string; cls: string; icon: any } {
  if (!item.is_pre_order) return { label: "Reguler", cls: "bg-muted text-muted-foreground", icon: Package };
  const now = Date.now();
  const open = item.pre_order_open_at ? new Date(item.pre_order_open_at).getTime() : null;
  const close = item.pre_order_close_at ? new Date(item.pre_order_close_at).getTime() : null;
  if (open && now < open) return { label: "Akan datang", cls: "bg-blue-500/10 text-blue-600", icon: Hourglass };
  if (close && now > close) return { label: "Ditutup", cls: "bg-muted text-muted-foreground", icon: AlertTriangle };
  return { label: "Pre-order aktif", cls: "bg-emerald-500/10 text-emerald-600", icon: CheckCircle2 };
}

function fmtDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 16);
}

function PreOrdersPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Item | null>(null);
  const [form, setForm] = useState({
    is_pre_order: false,
    pre_order_open_at: "",
    pre_order_close_at: "",
    pre_order_estimated_ship_at: "",
    pre_order_min_qty: "",
  });
  const [saving, setSaving] = useState(false);

  async function load() {
    if (!shop?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("menu_items")
      .select("id, name, price, image_url, is_pre_order, pre_order_open_at, pre_order_close_at, pre_order_estimated_ship_at, pre_order_min_qty, pre_order_current_qty")
      .eq("shop_id" as any, shop.id)
      .order("is_pre_order" as any, { ascending: false })
      .order("name", { ascending: true })
      .limit(500) as any;
    setItems((data ?? []) as Item[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [shop?.id]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, search]);

  function openEdit(item: Item) {
    setEditing(item);
    setForm({
      is_pre_order: item.is_pre_order,
      pre_order_open_at: fmtDateInput(item.pre_order_open_at),
      pre_order_close_at: fmtDateInput(item.pre_order_close_at),
      pre_order_estimated_ship_at: item.pre_order_estimated_ship_at ?? "",
      pre_order_min_qty: item.pre_order_min_qty?.toString() ?? "",
    });
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    const payload: any = {
      is_pre_order: form.is_pre_order,
      pre_order_open_at: form.pre_order_open_at ? new Date(form.pre_order_open_at).toISOString() : null,
      pre_order_close_at: form.pre_order_close_at ? new Date(form.pre_order_close_at).toISOString() : null,
      pre_order_estimated_ship_at: form.pre_order_estimated_ship_at || null,
      pre_order_min_qty: form.pre_order_min_qty ? parseInt(form.pre_order_min_qty, 10) : null,
    };
    const { error } = await supabase.from("menu_items").update(payload).eq("id", editing.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pengaturan pre-order disimpan");
    setEditing(null);
    load();
  }

  if (shopLoading) return <div className="p-8 text-muted-foreground">Memuat toko…</div>;

  const activeCount = items.filter((i) => i.is_pre_order && statusOf(i).label === "Pre-order aktif").length;
  const upcomingCount = items.filter((i) => i.is_pre_order && statusOf(i).label === "Akan datang").length;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Hourglass className="h-6 w-6 text-primary" /> Pre-Order Mode
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Buka pesanan di muka untuk produk yang belum siap (limited drop, catering, custom batch).
          Atur jendela waktu, estimasi pengiriman, dan kuorum minimum.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="border border-border rounded-xl p-4 bg-card">
          <div className="text-xs text-muted-foreground">Total produk</div>
          <div className="text-2xl font-bold mt-1">{items.length}</div>
        </div>
        <div className="border border-border rounded-xl p-4 bg-card">
          <div className="text-xs text-muted-foreground">Pre-order aktif</div>
          <div className="text-2xl font-bold mt-1 text-emerald-600">{activeCount}</div>
        </div>
        <div className="border border-border rounded-xl p-4 bg-card">
          <div className="text-xs text-muted-foreground">Akan datang</div>
          <div className="text-2xl font-bold mt-1 text-blue-600">{upcomingCount}</div>
        </div>
        <div className="border border-border rounded-xl p-4 bg-card">
          <div className="text-xs text-muted-foreground">Total kuorum tercapai</div>
          <div className="text-2xl font-bold mt-1">
            {items.filter((i) => i.is_pre_order && i.pre_order_min_qty && i.pre_order_current_qty >= i.pre_order_min_qty).length}
          </div>
        </div>
      </div>

      <div className="mb-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari produk…" className="max-w-sm" />
      </div>

      <div className="border border-border rounded-xl bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Memuat…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Belum ada produk.</div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((item) => {
              const st = statusOf(item);
              const Icon = st.icon;
              const progress = item.pre_order_min_qty
                ? Math.min(100, (item.pre_order_current_qty / item.pre_order_min_qty) * 100)
                : 0;
              return (
                <div key={item.id} className="p-4 flex items-center gap-4 hover:bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{item.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 ${st.cls}`}>
                        <Icon className="h-3 w-3" /> {st.label}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                      <span>{formatIDR(item.price)}</span>
                      {item.is_pre_order && item.pre_order_open_at && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> Buka: {new Date(item.pre_order_open_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                      )}
                      {item.is_pre_order && item.pre_order_close_at && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Tutup: {new Date(item.pre_order_close_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                      )}
                      {item.is_pre_order && item.pre_order_estimated_ship_at && (
                        <span className="inline-flex items-center gap-1">
                          <Package className="h-3 w-3" /> Kirim: {new Date(item.pre_order_estimated_ship_at).toLocaleDateString("id-ID", { dateStyle: "medium" })}
                        </span>
                      )}
                    </div>
                    {item.is_pre_order && item.pre_order_min_qty && (
                      <div className="mt-2 max-w-xs">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                          <span>Kuorum {item.pre_order_current_qty} / {item.pre_order_min_qty}</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className={`h-full transition-all ${progress >= 100 ? "bg-emerald-500" : "bg-primary"}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <Button variant="outline" size="sm" onClick={() => openEdit(item)} className="gap-1.5">
                    <Pencil className="h-3.5 w-3.5" /> Atur
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pengaturan Pre-Order</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              <div className="text-sm font-medium">{editing.name}</div>

              <div className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <div className="text-sm font-medium">Aktifkan Pre-Order</div>
                  <div className="text-xs text-muted-foreground">Tampilkan badge "Pre-Order" di halaman produk</div>
                </div>
                <Switch
                  checked={form.is_pre_order}
                  onCheckedChange={(v) => setForm({ ...form, is_pre_order: v })}
                />
              </div>

              {form.is_pre_order && (
                <>
                  <div>
                    <Label className="text-xs">Buka pesanan (mulai)</Label>
                    <Input
                      type="datetime-local"
                      value={form.pre_order_open_at}
                      onChange={(e) => setForm({ ...form, pre_order_open_at: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tutup pesanan (deadline)</Label>
                    <Input
                      type="datetime-local"
                      value={form.pre_order_close_at}
                      onChange={(e) => setForm({ ...form, pre_order_close_at: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Estimasi tanggal pengiriman</Label>
                    <Input
                      type="date"
                      value={form.pre_order_estimated_ship_at}
                      onChange={(e) => setForm({ ...form, pre_order_estimated_ship_at: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Kuorum minimum (opsional)</Label>
                    <Input
                      type="number"
                      min={1}
                      placeholder="Misal 10"
                      value={form.pre_order_min_qty}
                      onChange={(e) => setForm({ ...form, pre_order_min_qty: e.target.value })}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Jika diisi, batch dianggap "tercapai" saat jumlah pesanan mencapai angka ini.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving ? "Menyimpan…" : "Simpan"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
