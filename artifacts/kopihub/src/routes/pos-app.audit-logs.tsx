import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  ShieldAlert,
  Search,
  Calendar,
  Download,
  RefreshCcw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/pos-app/audit-logs")({
  component: AuditLogsPage,
});

type Shop = { id: string; name: string };
type LogRow = {
  id: string;
  shop_id: string;
  actor_id: string | null;
  target_user_id: string | null;
  target_email: string | null;
  target_name: string | null;
  action: string;
  meta: Record<string, unknown>;
  created_at: string;
};

const ACTION_OPTIONS: { value: string; label: string; tone: string }[] = [
  { value: "all", label: "Semua aksi", tone: "" },
  { value: "order.void", label: "Void order", tone: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200" },
  { value: "order.refund", label: "Refund order", tone: "bg-orange-100 text-orange-800 dark:bg-orange-950/40 dark:text-orange-200" },
  { value: "order.edit", label: "Edit order", tone: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200" },
  { value: "menu.edit_price", label: "Ubah harga menu", tone: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-200" },
  { value: "menu.delete", label: "Hapus menu", tone: "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-200" },
  { value: "finance.view", label: "Lihat keuangan", tone: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200" },
  { value: "finance.withdraw", label: "Tarik dana", tone: "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-200" },
  { value: "shift.close", label: "Tutup shift", tone: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200" },
  { value: "inventory.adjust", label: "Atur stok", tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" },
  { value: "staff.permissions_update", label: "Ubah hak akses", tone: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200" },
  { value: "customer.delete", label: "Hapus pelanggan", tone: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200" },
];

function actionTone(action: string) {
  return ACTION_OPTIONS.find((a) => a.value === action)?.tone ??
    "bg-muted text-muted-foreground";
}
function actionLabel(action: string) {
  return ACTION_OPTIONS.find((a) => a.value === action)?.label ?? action;
}

function todayLocalISO() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}
function sevenDaysAgoISO() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function AuditLogsPage() {
  const { user } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [actors, setActors] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopId, setShopId] = useState<string>("all");
  const [action, setAction] = useState<string>("all");
  const [actorId, setActorId] = useState<string>("all");
  const [from, setFrom] = useState<string>(sevenDaysAgoISO());
  const [to, setTo] = useState<string>(todayLocalISO());
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function loadShops() {
    if (!user) return;
    const { data } = await supabase
      .from("shops")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("name");
    setShops((data ?? []) as Shop[]);
  }

  async function loadLogs() {
    if (!user || shops.length === 0) { setLogs([]); setLoading(false); return; }
    setLoading(true);
    const ids = shopId === "all" ? shops.map((s) => s.id) : [shopId];
    let q = supabase
      .from("staff_audit_logs")
      .select("id, shop_id, actor_id, target_user_id, target_email, target_name, action, meta, created_at")
      .in("shop_id", ids)
      .gte("created_at", `${from}T00:00:00`)
      .lte("created_at", `${to}T23:59:59`)
      .order("created_at", { ascending: false })
      .limit(500);
    if (action !== "all") q = q.eq("action", action);
    if (actorId !== "all") q = q.eq("actor_id", actorId);
    const { data, error } = await q;
    if (error) {
      console.error(error);
      setLogs([]);
    } else {
      setLogs((data ?? []) as LogRow[]);
    }

    // Resolve actor display names from profiles
    const actorIds = Array.from(
      new Set(((data ?? []) as LogRow[]).map((r) => r.actor_id).filter(Boolean) as string[]),
    );
    if (actorIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", actorIds);
      const map: Record<string, string> = {};
      for (const p of (profs ?? []) as { id: string; display_name: string | null }[]) {
        map[p.id] = p.display_name ?? p.id.slice(0, 8);
      }
      setActors((prev) => ({ ...prev, ...map }));
    }
    setLoading(false);
  }

  useEffect(() => {
    loadShops();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, shops.length, shopId, action, actorId, from, to]);

  // Build actor filter options from currently shown logs (plus already-seen actors)
  const actorOptions = useMemo(() => {
    const ids = Array.from(new Set(logs.map((l) => l.actor_id).filter(Boolean) as string[]));
    return ids.map((id) => ({ id, name: actors[id] ?? id.slice(0, 8) }));
  }, [logs, actors]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((l) => {
      const actorName = (l.actor_id && actors[l.actor_id]) ?? "";
      return (
        actorName.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        (l.target_email ?? "").toLowerCase().includes(q) ||
        (l.target_name ?? "").toLowerCase().includes(q) ||
        JSON.stringify(l.meta).toLowerCase().includes(q)
      );
    });
  }, [logs, search, actors]);

  function shopName(id: string) {
    return shops.find((s) => s.id === id)?.name ?? id.slice(0, 8);
  }

  function exportCsv() {
    const rows = filtered.map((l) => ({
      waktu: new Date(l.created_at).toLocaleString("id-ID"),
      outlet: shopName(l.shop_id),
      staf: (l.actor_id && actors[l.actor_id]) ?? l.actor_id ?? "",
      aksi: l.action,
      target: l.target_name ?? l.target_email ?? l.target_user_id ?? "",
      alasan: typeof (l.meta as any)?.reason === "string" ? (l.meta as any).reason : "",
      meta: JSON.stringify(l.meta),
    }));
    const header = Object.keys(rows[0] ?? { waktu: "", outlet: "", staf: "", aksi: "", target: "", alasan: "", meta: "" });
    const csv = [
      header.join(","),
      ...rows.map((r) =>
        header.map((h) => `"${String((r as any)[h] ?? "").replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-logs-${from}-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4 p-4">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <ShieldAlert className="h-6 w-6 text-primary" /> Log Audit Staf
        </h1>
        <p className="text-sm text-muted-foreground">
          Jejak aksi sensitif staf — void, refund, edit harga, perubahan hak akses, dan lainnya.
          Filter berdasarkan outlet, staf, jenis aksi, atau rentang tanggal.
        </p>
      </header>

      <Card className="p-3">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-6">
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs">Outlet</Label>
            <Select value={shopId} onValueChange={setShopId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua outlet</SelectItem>
                {shops.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs">Aksi</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs">Staf</Label>
            <Select value={actorId} onValueChange={setActorId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua staf</SelectItem>
                {actorOptions.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Dari</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs flex items-center gap-1"><Calendar className="h-3 w-3" /> Sampai</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="space-y-1 lg:col-span-2">
            <Label className="text-xs">Cari teks bebas</Label>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-7"
                placeholder="nama, alasan, meta…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={loadLogs}>
            <RefreshCcw className="mr-1.5 h-3.5 w-3.5" /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="mr-1.5 h-3.5 w-3.5" /> Export CSV
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            {loading ? "Memuat…" : `${filtered.length} entri`}
          </span>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Tidak ada log untuk filter ini.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Waktu</th>
                  <th className="px-3 py-2 text-left">Outlet</th>
                  <th className="px-3 py-2 text-left">Staf</th>
                  <th className="px-3 py-2 text-left">Aksi</th>
                  <th className="px-3 py-2 text-left">Target / Alasan</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.flatMap((l) => {
                  const meta = l.meta as Record<string, unknown>;
                  const reason = typeof meta?.reason === "string" ? meta.reason as string : null;
                  const target = l.target_name ?? l.target_email ?? (typeof meta?.menu_name === "string" ? meta.menu_name as string : null) ?? (typeof meta?.order_no === "string" ? `#${meta.order_no}` : null);
                  const isOpen = expanded === l.id;
                  const rows: JSX.Element[] = [
                    <tr key={`${l.id}-main`} className="hover:bg-muted/30">
                      <td className="px-3 py-2 whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(l.created_at).toLocaleString("id-ID", {
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{shopName(l.shop_id)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {l.actor_id ? (actors[l.actor_id] ?? l.actor_id.slice(0, 8)) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={`${actionTone(l.action)} text-[10px] font-medium`} variant="outline">
                          {actionLabel(l.action)}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        {target && <div className="font-medium">{target}</div>}
                        {reason && (
                          <div className="text-xs text-muted-foreground line-clamp-2">{reason}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExpanded(isOpen ? null : l.id)}
                        >
                          {isOpen ? "Tutup" : "Detail"}
                        </Button>
                      </td>
                    </tr>,
                  ];
                  if (isOpen) {
                    rows.push(
                      <tr key={`${l.id}-detail`} className="bg-muted/20">
                        <td colSpan={6} className="px-4 py-3">
                          <pre className="max-h-72 overflow-auto rounded bg-background p-3 text-[11px] leading-relaxed">
                            {JSON.stringify(l.meta, null, 2)}
                          </pre>
                        </td>
                      </tr>,
                    );
                  }
                  return rows;
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
