import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import {
  Users, Search, RefreshCw, ShieldOff, ShieldCheck, Eye,
  Mail, Calendar, ShoppingCart, Banknote, Loader2, UserX, UserCheck,
} from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
});

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  order_count: number;
  total_spent: number;
  is_banned: boolean;
  ban_reason: string | null;
  last_order_at: string | null;
};

const TABS = ["all", "active", "banned"] as const;
type Tab = typeof TABS[number];

export default function AdminUsersPage() {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PAGE = 50;

  const [banTarget, setBanTarget] = useState<UserRow | null>(null);
  const [banReason, setBanReason] = useState("");
  const [busy, setBusy] = useState(false);

  const [detailUser, setDetailUser] = useState<UserRow | null>(null);
  const [detailOrders, setDetailOrders] = useState<any[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = (supabase as any)
        .from("profiles")
        .select(`
          id, email, full_name, phone, created_at, is_banned, ban_reason,
          orders:orders(id, total, created_at)
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1);

      if (tab === "active") q = q.eq("is_banned", false);
      if (tab === "banned") q = q.eq("is_banned", true);
      if (search.trim()) {
        q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const { data, error } = await q;
      if (error) {
        // Fallback: try auth.users via a simpler query
        const { data: authData } = await supabase
          .from("profiles" as any)
          .select("*")
          .order("created_at", { ascending: false })
          .limit(PAGE);
        setRows((authData ?? []).map((u: any) => ({
          ...u,
          order_count: 0,
          total_spent: 0,
          last_order_at: null,
        })));
      } else {
        setRows((data ?? []).map((u: any) => {
          const orders = u.orders ?? [];
          return {
            ...u,
            order_count: orders.length,
            total_spent: orders.reduce((s: number, o: any) => s + Number(o.total ?? 0), 0),
            last_order_at: orders.length > 0
              ? orders.sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))[0].created_at
              : null,
          };
        }));
      }
    } finally {
      setLoading(false);
    }
  }, [tab, search, page]);

  useEffect(() => { load(); }, [load]);

  const openDetail = async (u: UserRow) => {
    setDetailUser(u);
    setDetailLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("id, order_no, total, status, created_at, shop:coffee_shops(name)")
      .eq("customer_user_id", u.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setDetailOrders(data ?? []);
    setDetailLoading(false);
  };

  const toggleBan = async () => {
    if (!banTarget) return;
    setBusy(true);
    const newBanned = !banTarget.is_banned;
    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        is_banned: newBanned,
        ban_reason: newBanned ? banReason || "Pelanggaran kebijakan platform" : null,
      })
      .eq("id", banTarget.id);
    if (error) toast.error(error.message);
    else {
      toast.success(newBanned ? "Pengguna diblokir" : "Blokir dicabut");
      setBanTarget(null);
      setBanReason("");
      load();
    }
    setBusy(false);
  };

  const fmt = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  const counts = {
    all: rows.length,
    active: rows.filter(r => !r.is_banned).length,
    banned: rows.filter(r => r.is_banned).length,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Manajemen Pengguna
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Kelola akun pembeli, lihat riwayat transaksi, dan tindak pelanggaran.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        {(["all", "active", "banned"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); setPage(0); }}
            className={`rounded-xl border p-4 text-left transition-colors ${tab === t ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
          >
            <p className="text-xs text-muted-foreground capitalize">{t === "all" ? "Semua" : t === "active" ? "Aktif" : "Diblokir"}</p>
            <p className="text-2xl font-bold mt-0.5">{counts[t]}</p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari nama atau email…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pengguna</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bergabung</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Pesanan</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total Belanja</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Terakhir Order</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr><td colSpan={7} className="py-16 text-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="py-16 text-center text-muted-foreground">Tidak ada data pengguna</td></tr>
              ) : rows.map(u => (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                        {(u.full_name || u.email || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium leading-tight">{u.full_name || "(Tanpa nama)"}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.created_at ? fmt(u.created_at) : "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{u.order_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{formatIDR(u.total_spent)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.last_order_at ? fmt(u.last_order_at) : "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {u.is_banned
                      ? <Badge variant="destructive" className="text-xs">Diblokir</Badge>
                      : <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">Aktif</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openDetail(u)} title="Lihat detail">
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        className={`h-7 w-7 ${u.is_banned ? "text-emerald-600 hover:text-emerald-700" : "text-destructive hover:text-destructive/80"}`}
                        onClick={() => { setBanTarget(u); setBanReason(""); }}
                        title={u.is_banned ? "Cabut blokir" : "Blokir pengguna"}
                      >
                        {u.is_banned ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">Halaman {page + 1}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>← Sebelum</Button>
            <Button variant="outline" size="sm" disabled={rows.length < PAGE} onClick={() => setPage(p => p + 1)}>Berikutnya →</Button>
          </div>
        </div>
      </Card>

      {/* Ban/Unban Dialog */}
      <Dialog open={!!banTarget} onOpenChange={v => !v && setBanTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {banTarget?.is_banned ? "Cabut Blokir Pengguna" : "Blokir Pengguna"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              {banTarget?.is_banned
                ? `Cabut blokir untuk ${banTarget?.full_name || banTarget?.email}?`
                : `Blokir akun ${banTarget?.full_name || banTarget?.email}? Pengguna tidak akan bisa login.`}
            </p>
            {!banTarget?.is_banned && (
              <div>
                <Label>Alasan pemblokiran</Label>
                <Textarea
                  className="mt-1.5"
                  placeholder="Tuliskan alasan pemblokiran…"
                  value={banReason}
                  onChange={e => setBanReason(e.target.value)}
                  rows={3}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanTarget(null)}>Batal</Button>
            <Button
              variant={banTarget?.is_banned ? "default" : "destructive"}
              disabled={busy}
              onClick={toggleBan}
            >
              {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {banTarget?.is_banned ? "Cabut Blokir" : "Blokir Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={!!detailUser} onOpenChange={v => !v && setDetailUser(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Detail Pengguna
            </DialogTitle>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Mail className="h-3 w-3" /> Email</p>
                  <p className="font-medium text-sm mt-0.5">{detailUser.email}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Bergabung</p>
                  <p className="font-medium text-sm mt-0.5">{detailUser.created_at ? fmt(detailUser.created_at) : "—"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> Total Pesanan</p>
                  <p className="font-bold text-lg mt-0.5">{detailUser.order_count}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Banknote className="h-3 w-3" /> Total Belanja</p>
                  <p className="font-bold text-lg mt-0.5">{formatIDR(detailUser.total_spent)}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold mb-2">20 Pesanan Terakhir</p>
                {detailLoading ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : detailOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Belum ada pesanan</p>
                ) : (
                  <div className="rounded-lg border border-border overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">No. Pesanan</th>
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Toko</th>
                          <th className="px-3 py-2 text-right font-medium text-muted-foreground">Total</th>
                          <th className="px-3 py-2 text-center font-medium text-muted-foreground">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {detailOrders.map(o => (
                          <tr key={o.id}>
                            <td className="px-3 py-2 font-mono">{o.order_no || o.id.slice(0, 8)}</td>
                            <td className="px-3 py-2">{(o.shop as any)?.name || "—"}</td>
                            <td className="px-3 py-2 text-right">{formatIDR(Number(o.total))}</td>
                            <td className="px-3 py-2 text-center">
                              <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
