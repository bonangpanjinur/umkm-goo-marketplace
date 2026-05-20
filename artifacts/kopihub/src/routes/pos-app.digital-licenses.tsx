import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  Download,
  RefreshCcw,
  RotateCcw,
  Ban,
  CheckCircle2,
  Copy,
  Loader2,
  Search,
  Key,
  BarChart3,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/digital-licenses")({
  head: () => ({ meta: [{ title: "Lisensi Digital — Merchant" }] }),
  component: DigitalLicensesPage,
});

type License = {
  id: string;
  order_id: string;
  product_id: string;
  license_key: string;
  license_type: "personal" | "commercial" | "extended";
  download_count: number;
  max_downloads: number | null;
  last_downloaded_at: string | null;
  is_active: boolean;
  customer_name: string | null;
  order_no: string | null;
  created_at: string;
  product_name?: string;
};

type Product = { id: string; name: string };

const LICENSE_LABEL: Record<string, string> = {
  personal:   "Personal",
  commercial: "Komersial",
  extended:   "Extended",
};
const LICENSE_COLOR: Record<string, string> = {
  personal:   "bg-blue-100 text-blue-800",
  commercial: "bg-purple-100 text-purple-800",
  extended:   "bg-amber-100 text-amber-800",
};

function DigitalLicensesPage() {
  const { shop } = useCurrentShop();
  const [licenses, setLicenses] = useState<License[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [filterProduct, setFilterProduct] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [search, setSearch] = useState("");

  const [viewLogs, setViewLogs] = useState<{ licenseId: string; key: string } | null>(null);
  const [logs, setLogs] = useState<{ downloaded_at: string }[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  async function loadData() {
    if (!shop?.id) return;
    setLoading(true);
    try {
      // Load products for filter
      const { data: prods, error: pe } = await supabase
        .from("menu_items" as any)
        .select("id, name")
        .eq("shop_id", shop.id)
        .eq("product_type", "digital")
        .order("name") as any;

      if (pe?.code === "42P01") { setDbReady(false); setLoading(false); return; }
      setProducts((prods ?? []) as Product[]);

      // Load licenses with product name
      const { data: lics, error: le } = await supabase
        .from("digital_licenses" as any)
        .select("*, menu_items!product_id(name)")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false })
        .limit(300) as any;

      if (le?.code === "42P01") { setDbReady(false); setLoading(false); return; }
      setDbReady(true);

      setLicenses(
        ((lics ?? []) as any[]).map((l: any) => ({
          ...l,
          product_name: l.menu_items?.name ?? "—",
        }))
      );
    } catch { setDbReady(false); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (shop?.id) loadData(); }, [shop?.id]);

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = licenses.filter((l) => {
    if (filterProduct !== "all" && l.product_id !== filterProduct) return false;
    if (filterStatus === "active" && !l.is_active) return false;
    if (filterStatus === "revoked" && l.is_active) return false;
    if (filterStatus === "limit_reached" &&
        (l.max_downloads === null || l.download_count < l.max_downloads)) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.license_key.toLowerCase().includes(q) &&
          !(l.order_no ?? "").toLowerCase().includes(q) &&
          !(l.customer_name ?? "").toLowerCase().includes(q) &&
          !(l.product_name ?? "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const totalDownloads = licenses.reduce((s, l) => s + l.download_count, 0);
  const activeLicenses = licenses.filter((l) => l.is_active).length;
  const limitReached = licenses.filter(
    (l) => l.max_downloads !== null && l.download_count >= l.max_downloads
  ).length;

  // ── Actions ───────────────────────────────────────────────────────────────
  async function handleReset(l: License) {
    if (!confirm(`Reset jumlah unduhan untuk lisensi ${l.license_key}?`)) return;
    setActionLoading(l.id);
    try {
      const { error } = await supabase.rpc("reset_download_count" as any, {
        p_license_id: l.id,
      });
      if (error) throw error;
      toast.success("Jumlah unduhan direset ke 0");
      setLicenses((prev) =>
        prev.map((lic) => (lic.id === l.id ? { ...lic, download_count: 0 } : lic))
      );
    } catch (e: unknown) {
      toast.error("Gagal: " + (e as Error).message);
    } finally { setActionLoading(null); }
  }

  async function handleToggleActive(l: License) {
    setActionLoading(l.id);
    try {
      const { error } = await supabase
        .from("digital_licenses" as any)
        .update({ is_active: !l.is_active })
        .eq("id", l.id) as any;
      if (error) throw error;
      toast.success(l.is_active ? "Lisensi dinonaktifkan" : "Lisensi diaktifkan kembali");
      setLicenses((prev) =>
        prev.map((lic) => (lic.id === l.id ? { ...lic, is_active: !l.is_active } : lic))
      );
    } catch (e: unknown) {
      toast.error("Gagal: " + (e as Error).message);
    } finally { setActionLoading(null); }
  }

  async function openLogs(l: License) {
    setViewLogs({ licenseId: l.id, key: l.license_key });
    setLogsLoading(true);
    const { data } = await supabase
      .from("digital_download_logs" as any)
      .select("downloaded_at")
      .eq("license_id", l.id)
      .order("downloaded_at", { ascending: false })
      .limit(50) as any;
    setLogs((data ?? []) as { downloaded_at: string }[]);
    setLogsLoading(false);
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key);
    toast.success("License key disalin");
  }

  function fmtDate(s: string | null) {
    if (!s) return "—";
    return new Date(s).toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  if (loading) return (
    <div className="p-8 flex items-center gap-2 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin" /> Memuat data lisensi...
    </div>
  );

  if (!dbReady) return (
    <div className="p-8 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-7 h-7 text-purple-600" />
        <h1 className="text-2xl font-bold">Lisensi Digital</h1>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
        <p className="font-semibold text-amber-800">Setup database diperlukan</p>
        <p className="text-sm text-amber-700">
          Jalankan <code className="bg-white px-1 rounded text-xs">supabase/migrations/f20_digital_licenses.sql</code>{" "}
          di Supabase Dashboard → SQL Editor untuk mengaktifkan fitur ini.
        </p>
        <Button size="sm" onClick={() => { setDbReady(true); setLoading(true); loadData(); }}>
          <RefreshCcw className="w-4 h-4 mr-1" /> Coba Lagi
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-purple-600" />
          <div>
            <h1 className="text-2xl font-bold">Lisensi Digital</h1>
            <p className="text-sm text-gray-500">Lacak unduhan pembeli & kelola lisensi per produk</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/pos-app/digital">
              <Download className="w-4 h-4 mr-1" /> Kelola Produk
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border bg-white p-4">
          <div className="text-2xl font-bold">{licenses.length}</div>
          <div className="text-xs text-gray-500">Total Lisensi</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-2xl font-bold text-green-700">{activeLicenses}</div>
          <div className="text-xs text-gray-500">Aktif</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-2xl font-bold text-purple-700">{totalDownloads}</div>
          <div className="text-xs text-gray-500">Total Unduhan</div>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <div className="text-2xl font-bold text-amber-700">{limitReached}</div>
          <div className="text-xs text-gray-500">Limit Tercapai</div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-9"
            placeholder="Cari license key, order, atau nama…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterProduct} onValueChange={setFilterProduct}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Semua produk" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua produk</SelectItem>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="revoked">Dinonaktifkan</SelectItem>
            <SelectItem value="limit_reached">Limit Tercapai</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center space-y-2">
          <Key className="w-10 h-10 text-gray-200 mx-auto" />
          <p className="text-gray-400 text-sm">
            {licenses.length === 0
              ? "Belum ada lisensi. Lisensi terbuat otomatis saat pembeli mengunduh produk digital."
              : "Tidak ada hasil sesuai filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((l) => {
            const limitReachedNow =
              l.max_downloads !== null && l.download_count >= l.max_downloads;
            return (
              <div
                key={l.id}
                className={`rounded-xl border bg-white p-4 flex items-center justify-between gap-4 ${
                  !l.is_active ? "opacity-60" : ""
                }`}
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Icon */}
                  <div className={`rounded-lg p-2 shrink-0 ${l.is_active ? "bg-purple-50" : "bg-gray-100"}`}>
                    <Key className={`w-5 h-5 ${l.is_active ? "text-purple-500" : "text-gray-400"}`} />
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <code className="text-sm font-mono font-bold tracking-wide">{l.license_key}</code>
                      <Badge className={LICENSE_COLOR[l.license_type]}>
                        {LICENSE_LABEL[l.license_type]}
                      </Badge>
                      {!l.is_active && (
                        <Badge className="bg-red-100 text-red-700">Dicabut</Badge>
                      )}
                      {limitReachedNow && l.is_active && (
                        <Badge className="bg-amber-100 text-amber-800">Limit Tercapai</Badge>
                      )}
                    </div>

                    <p className="text-sm font-medium truncate">{l.product_name}</p>

                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                      {l.order_no && (
                        <span>Order: <strong className="text-gray-700">{l.order_no}</strong></span>
                      )}
                      {l.customer_name && (
                        <span>Pembeli: <strong className="text-gray-700">{l.customer_name}</strong></span>
                      )}
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        <strong className={limitReachedNow ? "text-amber-600" : "text-gray-700"}>
                          {l.download_count}
                        </strong>
                        {l.max_downloads !== null && (
                          <span>/ {l.max_downloads}</span>
                        )}
                        × diunduh
                      </span>
                      {l.last_downloaded_at && (
                        <span>Terakhir: {fmtDate(l.last_downloaded_at)}</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-gray-400 hover:text-gray-700"
                    onClick={() => copyKey(l.license_key)}
                    title="Salin license key"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-gray-400 hover:text-blue-600"
                    onClick={() => openLogs(l)}
                    title="Lihat riwayat unduhan"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-gray-400 hover:text-green-600"
                    onClick={() => handleReset(l)}
                    disabled={actionLoading === l.id || l.download_count === 0}
                    title="Reset jumlah unduhan"
                  >
                    {actionLoading === l.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="w-3.5 h-3.5" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={`h-8 px-2 ${l.is_active ? "text-gray-400 hover:text-red-600" : "text-gray-400 hover:text-green-600"}`}
                    onClick={() => handleToggleActive(l)}
                    disabled={actionLoading === l.id}
                    title={l.is_active ? "Cabut lisensi" : "Aktifkan kembali"}
                  >
                    {l.is_active ? <Ban className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dialog: Riwayat Unduhan */}
      <Dialog open={!!viewLogs} onOpenChange={() => setViewLogs(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Riwayat Unduhan
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {viewLogs && (
              <p className="text-xs text-gray-500 font-mono">
                {viewLogs.key}
              </p>
            )}
            {logsLoading ? (
              <div className="text-center py-6">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-300" />
              </div>
            ) : logs.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                Belum ada riwayat unduhan
              </p>
            ) : (
              <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-1.5 border-b last:border-0">
                    <Download className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="text-gray-600">{fmtDate(log.downloaded_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setViewLogs(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
