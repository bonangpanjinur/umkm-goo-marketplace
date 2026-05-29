import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { formatIDR } from "@/lib/format";
import { downloadCSV } from "@/lib/export";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Search, Download, Users, TrendingUp, ShoppingBag, UserPlus, Tag, X, Wand2 } from "lucide-react";

const SEGMENT_STYLE: Record<string, string> = {
  vip:      "bg-purple-100 text-purple-700 border border-purple-200",
  regular:  "bg-blue-100 text-blue-700 border border-blue-200",
  new:      "bg-green-100 text-green-700 border border-green-200",
  inactive: "bg-gray-100 text-gray-500 border border-gray-200",
};

const SEGMENT_LABEL: Record<string, string> = {
  vip: "VIP", regular: "Reguler", new: "Baru", inactive: "Tidak Aktif",
};

function computeAutoSegment(c: { total_orders: number; total_spent: number; last_order_at: string | null; first_order_at: string | null }): string {
  const daysSinceLast = c.last_order_at
    ? (Date.now() - new Date(c.last_order_at).getTime()) / 86_400_000
    : Infinity;
  const daysSinceFirst = c.first_order_at
    ? (Date.now() - new Date(c.first_order_at).getTime()) / 86_400_000
    : 0;

  if (c.total_orders >= 10 || c.total_spent >= 1_500_000) return "vip";
  if (daysSinceLast > 90) return "inactive";
  if (c.total_orders >= 3 && daysSinceLast <= 60) return "regular";
  if (daysSinceFirst <= 30) return "new";
  return "regular";
}

export const Route = createFileRoute("/pos-app/customers")({
  head: () => ({ meta: [{ title: "Manajemen Pelanggan — Merchant" }] }),
  component: CustomersPage,
});

type ShopCustomer = {
  id: string;
  user_id: string;
  display_name: string | null;
  phone: string | null;
  email: string | null;
  total_orders: number;
  total_spent: number;
  last_order_at: string | null;
  first_order_at: string | null;
  tags: string[];
  segment: string | null;
  notes: string | null;
};

const PAGE_SIZE = 100;

function CustomersPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [customers, setCustomers] = useState<ShopCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<{ total_spent: number; id: string } | null>(null);
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState("all");
  const [editCustomer, setEditCustomer] = useState<ShopCustomer | null>(null);
  const [editTags, setEditTags] = useState("");
  const [editSegment, setEditSegment] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [autoLabeling, setAutoLabeling] = useState(false);

  const loadCustomers = useCallback(async () => {
    if (!shop) return;
    setLoading(true);
    setCursor(null);
    const { data } = await supabase
      .from("shop_customers")
      .select("*")
      .eq("shop_id", shop.id)
      .order("total_spent", { ascending: false })
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);
    const rows = (data as ShopCustomer[]) ?? [];
    setCustomers(rows);
    setHasMore(rows.length === PAGE_SIZE);
    if (rows.length > 0) {
      const last = rows[rows.length - 1];
      setCursor({ total_spent: last.total_spent, id: last.id });
    }
    setLoading(false);
  }, [shop]);

  const loadMore = useCallback(async () => {
    if (!shop || !cursor || loadingMore) return;
    setLoadingMore(true);
    const { data } = await supabase
      .from("shop_customers")
      .select("*")
      .eq("shop_id", shop.id)
      .or(`total_spent.lt.${cursor.total_spent},and(total_spent.eq.${cursor.total_spent},id.gt.${cursor.id})`)
      .order("total_spent", { ascending: false })
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);
    const rows = (data as ShopCustomer[]) ?? [];
    setCustomers((prev) => [...prev, ...rows]);
    setHasMore(rows.length === PAGE_SIZE);
    if (rows.length > 0) {
      const last = rows[rows.length - 1];
      setCursor({ total_spent: last.total_spent, id: last.id });
    }
    setLoadingMore(false);
  }, [shop, cursor, loadingMore]);

  useEffect(() => {
    if (!shop) return;
    loadCustomers();
  }, [shop, loadCustomers]);

  const segments = useMemo(() => {
    const s = new Set(customers.map((c) => c.segment).filter(Boolean));
    return Array.from(s) as string[];
  }, [customers]);

  const filtered = useMemo(() => {
    let list = customers;
    if (segmentFilter !== "all") {
      list = list.filter((c) => c.segment === segmentFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.display_name?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.email?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [customers, search, segmentFilter]);

  const stats = useMemo(() => {
    const total = customers.length;
    const totalSpent = customers.reduce((s, c) => s + c.total_spent, 0);
    const totalOrders = customers.reduce((s, c) => s + c.total_orders, 0);
    const newThisMonth = customers.filter((c) => {
      if (!c.first_order_at) return false;
      const d = new Date(c.first_order_at);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { total, totalSpent, totalOrders, newThisMonth };
  }, [customers]);

  function openEdit(c: ShopCustomer) {
    setEditCustomer(c);
    setEditTags((c.tags ?? []).join(", "));
    setEditSegment(c.segment ?? "new");
    setEditNotes(c.notes ?? "");
  }

  async function runAutoLabel() {
    if (!shop || customers.length === 0) return;
    setAutoLabeling(true);
    try {
      const updates = customers.map((c) => ({
        id: c.id,
        segment: computeAutoSegment(c),
      }));
      await Promise.all(
        updates.map(({ id, segment }) =>
          supabase.from("shop_customers").update({ segment }).eq("id", id)
        )
      );
      toast.success(`${updates.length} pelanggan berhasil di-auto-label`);
      loadCustomers();
    } catch {
      toast.error("Gagal auto-label");
    } finally {
      setAutoLabeling(false);
    }
  }

  async function saveEdit() {
    if (!editCustomer) return;
    setSaving(true);
    const tags = editTags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const { error } = await supabase
      .from("shop_customers")
      .update({ tags, segment: editSegment, notes: editNotes })
      .eq("id", editCustomer.id);
    setSaving(false);
    if (error) {
      toast.error("Gagal menyimpan");
      return;
    }
    toast.success("Data pelanggan disimpan");
    setEditCustomer(null);
    loadCustomers();
  }

  function handleExport() {
    const rows = filtered.map((c) => ({
      Nama: c.display_name ?? "-",
      Telepon: c.phone ?? "-",
      Email: c.email ?? "-",
      "Total Order": c.total_orders,
      "Total Belanja": c.total_spent,
      "Order Terakhir": c.last_order_at ?? "-",
      Segmen: c.segment ?? "-",
      Tags: (c.tags ?? []).join("; "),
    }));
    downloadCSV("pelanggan", rows);
    toast.success("Export selesai");
  }

  if (shopLoading || loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Pelanggan</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={runAutoLabel}
            disabled={autoLabeling || customers.length === 0}
            className="gap-1.5"
          >
            {autoLabeling
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Wand2 className="h-4 w-4" />}
            Auto-Label Semua
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-3">
        Auto-Label menentukan segmen otomatis: <span className="font-medium text-purple-600">VIP</span> (≥10 order / ≥1.5jt), <span className="font-medium text-blue-600">Reguler</span>, <span className="font-medium text-green-600">Baru</span> (&lt;30 hari), <span className="font-medium text-gray-500">Tidak Aktif</span> (&gt;90 hari)
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" /> Total Pelanggan
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" /> Total Revenue
            </div>
            <p className="text-2xl font-bold mt-1">{formatIDR(stats.totalSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <ShoppingBag className="h-4 w-4" /> Total Order
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalOrders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <UserPlus className="h-4 w-4" /> Baru Bulan Ini
            </div>
            <p className="text-2xl font-bold mt-1">{stats.newThisMonth}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, telepon, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={segmentFilter} onValueChange={setSegmentFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Semua Segmen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Segmen</SelectItem>
            {segments.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Telepon</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Total Belanja</TableHead>
                  <TableHead>Segmen</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Order Terakhir</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Belum ada data pelanggan
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.display_name || "-"}</TableCell>
                      <TableCell>{c.phone || "-"}</TableCell>
                      <TableCell className="text-right">{c.total_orders}</TableCell>
                      <TableCell className="text-right">{formatIDR(c.total_spent)}</TableCell>
                      <TableCell>
                        {(() => {
                          const seg = c.segment ?? "new";
                          const cls = SEGMENT_STYLE[seg] ?? SEGMENT_STYLE.new;
                          const lbl = SEGMENT_LABEL[seg] ?? seg;
                          return (
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${cls}`}>
                              {lbl}
                            </span>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {(c.tags ?? []).slice(0, 3).map((t) => (
                            <Badge key={t} variant="outline" className="text-xs">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.last_order_at ? new Date(c.last_order_at).toLocaleDateString("id-ID") : "-"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        {/* F3-6: Keyset pagination — Load More */}
        {hasMore && !search && segmentFilter === "all" && (
          <div className="mt-3 flex justify-center border-t pt-3">
            <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore} className="gap-1.5">
              {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              {loadingMore ? "Memuat…" : `Muat lebih banyak (${customers.length} ditampilkan)`}
            </Button>
          </div>
        )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editCustomer} onOpenChange={(o) => !o && setEditCustomer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pelanggan — {editCustomer?.display_name || "Tanpa Nama"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Segmen</label>
              <Select value={editSegment} onValueChange={setEditSegment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["new", "regular", "vip", "inactive"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Tags (pisahkan koma)</label>
              <Input value={editTags} onChange={(e) => setEditTags(e.target.value)} placeholder="vip, langganan, dll" />
            </div>
            <div>
              <label className="text-sm font-medium">Catatan</label>
              <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
            </div>
            <Button onClick={saveEdit} disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Simpan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
