import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import {
  Users, Search, RefreshCw, Eye, Mail, Calendar,
  ShoppingCart, Banknote, Loader2, UserX, UserCheck,
  Download, Shield, ChevronLeft, ChevronRight, Phone,
} from "lucide-react";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Manajemen Pengguna — Admin" }] }),
  component: AdminUsersPage,
});

type AppRole = "super_admin" | "owner" | "cashier" | "barista" | "customer" | "manager" | "courier";

type UserRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
  is_banned: boolean;
  ban_reason: string | null;
  roles: AppRole[];
  order_count: number;
  total_spent: number;
  last_order_at: string | null;
};

const ROLE_OPTS: { value: AppRole | "all"; label: string }[] = [
  { value: "all",         label: "Semua Role" },
  { value: "customer",    label: "Pembeli" },
  { value: "owner",       label: "Pemilik Toko" },
  { value: "manager",     label: "Manager" },
  { value: "cashier",     label: "Kasir" },
  { value: "barista",     label: "Barista" },
  { value: "courier",     label: "Kurir" },
  { value: "super_admin", label: "Super Admin" },
];

const ROLE_COLOR: Record<AppRole, string> = {
  super_admin: "bg-purple-100 text-purple-800",
  owner:       "bg-blue-100 text-blue-800",
  manager:     "bg-cyan-100 text-cyan-800",
  cashier:     "bg-green-100 text-green-800",
  barista:     "bg-lime-100 text-lime-800",
  courier:     "bg-amber-100 text-amber-800",
  customer:    "bg-slate-100 text-slate-700",
};

const PAGE_SIZE = 50;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function Avatar({ name, email, url }: { name: string | null; email: string; url: string | null }) {
  if (url) return <img src={url} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />;
  const letter = (name || email || "?")[0].toUpperCase();
  return (
    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
      {letter}
    </div>
  );
}

export default function AdminUsersPage() {
  const [rows,    setRows]    = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(0);

  // Filters
  const [search,    setSearch]    = useState("");
  const [statusTab, setStatusTab] = useState<"all" | "active" | "banned">("all");
  const [roleFilter,setRoleFilter]= useState<AppRole | "all">("all");

  // Ban dialog
  const [banTarget, setBanTarget] = useState<UserRow | null>(null);
  const [banReason, setBanReason] = useState("");
  const [busy,      setBusy]      = useState(false);

  // Detail dialog
  const [detailUser,   setDetailUser]   = useState<UserRow | null>(null);
  const [detailOrders, setDetailOrders] = useState<any[]>([]);
  const [detailLoading,setDetailLoading]= useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch profiles with user_roles join
      let q = (supabase as any)
        .from("profiles")
        .select(`
          id, email, full_name, phone, avatar_url, created_at, is_banned, ban_reason,
          user_roles!left(role)
        `, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

      if (statusTab === "active")  q = q.eq("is_banned", false);
      if (statusTab === "banned")  q = q.eq("is_banned", true);
      if (search.trim())           q = q.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);

      const { data, count, error } = await q;

      if (error) throw error;

      // Filter by role client-side (since role is nested)
      let processed = (data ?? []).map((u: any) => {
        const roles: AppRole[] = (u.user_roles ?? []).map((r: any) => r.role as AppRole);
        return { ...u, roles, order_count: 0, total_spent: 0, last_order_at: null };
      });

      if (roleFilter !== "all") {
        processed = processed.filter((u: UserRow) => u.roles.includes(roleFilter));
      }

      setRows(processed);
      setTotal(count ?? 0);
    } catch (err: any) {
      // Fallback sem orders join
      const { data: fallback } = await (supabase as any)
        .from("profiles")
        .select("id, email, full_name, phone, avatar_url, created_at, is_banned, ban_reason")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      setRows(
        (fallback ?? []).map((u: any) => ({ ...u, roles: [], order_count: 0, total_spent: 0, last_order_at: null })),
      );
    } finally {
      setLoading(false);
    }
  }, [page, statusTab, search, roleFilter]);

  useEffect(() => { load(); }, [load]);
  // Reset page when filter changes
  useEffect(() => { setPage(0); }, [statusTab, roleFilter, search]);

  const openDetail = async (u: UserRow) => {
    setDetailUser(u);
    setDetailLoading(true);
    const { data } = await supabase
      .from("orders")
      .select("id, order_no, total, status, created_at, shop:shops(name)")
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
        is_banned:  newBanned,
        ban_reason: newBanned ? (banReason.trim() || "Pelanggaran kebijakan platform") : null,
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

  const exportCSV = () => {
    const header = ["ID", "Nama", "Email", "Telepon", "Role", "Status", "Bergabung", "Pesanan", "Total Belanja"].join(",");
    const lines = rows.map(u => [
      u.id,
      `"${(u.full_name ?? "").replace(/"/g, "'")}"`,
      u.email,
      u.phone ?? "",
      u.roles.join("|"),
      u.is_banned ? "Diblokir" : "Aktif",
      u.created_at ? fmtDate(u.created_at) : "",
      u.order_count,
      u.total_spent,
    ].join(","));
    const csv = [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "users-export.csv"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Data pengguna diekspor");
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" /> Manajemen Pengguna
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Kelola akun pembeli & merchant, lihat riwayat transaksi, dan tindak pelanggaran.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={rows.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 border-b border-border pb-1">
        {(["all", "active", "banned"] as const).map(t => (
          <button
            key={t}
            onClick={() => setStatusTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${statusTab === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "all" ? "Semua" : t === "active" ? "Aktif" : "Diblokir"}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center">{total.toLocaleString("id-ID")} pengguna total</span>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Cari nama atau email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={roleFilter} onValueChange={v => setRoleFilter(v as AppRole | "all")}>
          <SelectTrigger className="w-44">
            <Shield className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Filter role" />
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pengguna</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Bergabung</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Pesanan</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total Belanja</th>
                <th className="px-4 py-3 text-center font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-muted-foreground">
                    Tidak ada pengguna ditemukan
                  </td>
                </tr>
              ) : rows.map(u => (
                <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={u.full_name} email={u.email} url={u.avatar_url} />
                      <div className="min-w-0">
                        <p className="font-medium leading-tight truncate max-w-[180px]">
                          {u.full_name || "(Tanpa nama)"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        {u.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {u.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : u.roles.map(r => (
                        <span key={r} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${ROLE_COLOR[r] ?? "bg-gray-100 text-gray-700"}`}>
                          {ROLE_OPTS.find(o => o.value === r)?.label ?? r}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                    {u.created_at ? fmtDate(u.created_at) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{u.order_count}</td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium">{formatIDR(u.total_spent)}</td>
                  <td className="px-4 py-3 text-center">
                    {u.is_banned ? (
                      <Badge variant="destructive" className="text-xs">Diblokir</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">Aktif</Badge>
                    )}
                    {u.ban_reason && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[120px] truncate" title={u.ban_reason}>
                        {u.ban_reason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => openDetail(u)} title="Lihat detail"
                      >
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
        <div className="flex items-center justify-between border-t border-border px-4 py-3 bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Menampilkan {rows.length} dari {total.toLocaleString("id-ID")} pengguna
            {totalPages > 1 && ` · Halaman ${page + 1} dari ${totalPages}`}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Sebelum
            </Button>
            <Button variant="outline" size="sm" disabled={rows.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
              Berikutnya <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Ban / Unban Dialog ── */}
      <Dialog open={!!banTarget} onOpenChange={v => !v && setBanTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {banTarget?.is_banned
                ? <><UserCheck className="h-5 w-5 text-emerald-600" /> Cabut Blokir Pengguna</>
                : <><UserX className="h-5 w-5 text-destructive" /> Blokir Pengguna</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-border p-3 flex items-center gap-3">
              <Avatar name={banTarget?.full_name ?? null} email={banTarget?.email ?? ""} url={banTarget?.avatar_url ?? null} />
              <div>
                <p className="font-medium text-sm">{banTarget?.full_name || "(Tanpa nama)"}</p>
                <p className="text-xs text-muted-foreground">{banTarget?.email}</p>
              </div>
            </div>
            {banTarget?.is_banned ? (
              <p className="text-sm text-muted-foreground">
                Akun ini akan diaktifkan kembali. Pengguna bisa login dan bertransaksi seperti biasa.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Pengguna tidak akan bisa login hingga blokir dicabut.
                </p>
                <div>
                  <Label>Alasan pemblokiran</Label>
                  <Textarea
                    className="mt-1.5"
                    placeholder="Tuliskan alasan pemblokiran (spam, penipuan, dll)…"
                    value={banReason}
                    onChange={e => setBanReason(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
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
              {banTarget?.is_banned ? "Aktifkan Kembali" : "Blokir Sekarang"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ── */}
      <Dialog open={!!detailUser} onOpenChange={v => !v && setDetailUser(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Detail Pengguna
            </DialogTitle>
          </DialogHeader>
          {detailUser && (
            <div className="space-y-5">
              {/* Profile info */}
              <div className="flex items-center gap-3">
                <Avatar name={detailUser.full_name} email={detailUser.email} url={detailUser.avatar_url} />
                <div>
                  <p className="font-semibold">{detailUser.full_name || "(Tanpa nama)"}</p>
                  <p className="text-xs text-muted-foreground">{detailUser.email}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {detailUser.roles.map(r => (
                      <span key={r} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${ROLE_COLOR[r] ?? "bg-gray-100 text-gray-700"}`}>
                        {ROLE_OPTS.find(o => o.value === r)?.label ?? r}
                      </span>
                    ))}
                    {detailUser.is_banned && (
                      <Badge variant="destructive" className="text-[11px]">Diblokir</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Email
                  </p>
                  <p className="font-medium text-xs mt-0.5 break-all">{detailUser.email}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Telepon
                  </p>
                  <p className="font-medium text-sm mt-0.5">{detailUser.phone || "—"}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Bergabung
                  </p>
                  <p className="font-medium text-sm mt-0.5">
                    {detailUser.created_at ? fmtDate(detailUser.created_at) : "—"}
                  </p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <ShoppingCart className="h-3 w-3" /> Pesanan
                  </p>
                  <p className="font-bold text-xl mt-0.5">{detailUser.order_count}</p>
                </div>
              </div>

              {detailUser.ban_reason && (
                <div className="rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2">
                  <p className="text-xs font-semibold text-destructive">Alasan Blokir</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{detailUser.ban_reason}</p>
                </div>
              )}

              {/* Order history */}
              <div>
                <p className="text-sm font-semibold mb-2">Riwayat 20 Pesanan Terakhir</p>
                {detailLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
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
                          <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tanggal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/50">
                        {detailOrders.map(o => (
                          <tr key={o.id}>
                            <td className="px-3 py-2 font-mono">{o.order_no || o.id.slice(0, 8)}</td>
                            <td className="px-3 py-2">{(o.shop as any)?.name || "—"}</td>
                            <td className="px-3 py-2 text-right tabular-nums">{formatIDR(Number(o.total))}</td>
                            <td className="px-3 py-2 text-center">
                              <Badge variant="outline" className="text-[10px]">{o.status}</Badge>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {o.created_at ? fmtDate(o.created_at) : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-between items-center pt-2 border-t border-border">
                <Button
                  variant={detailUser.is_banned ? "default" : "destructive"}
                  size="sm"
                  onClick={() => {
                    setDetailUser(null);
                    setBanTarget(detailUser);
                    setBanReason("");
                  }}
                >
                  {detailUser.is_banned ? <UserCheck className="h-4 w-4 mr-1.5" /> : <UserX className="h-4 w-4 mr-1.5" />}
                  {detailUser.is_banned ? "Cabut Blokir" : "Blokir Pengguna"}
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDetailUser(null)}>
                  Tutup
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
