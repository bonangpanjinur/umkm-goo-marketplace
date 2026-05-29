import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ScrollText, Search, RefreshCw, Download, Loader2, User, Receipt } from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/order-audit")({
  head: () => ({ meta: [{ title: "Audit Pesanan — Merchant" }] }),
  component: OrderAuditPage,
});

type AuditEntry = {
  id: string;
  order_id: string | null;
  order_no: string | null;
  action: string;
  reason: string | null;
  previous_status: string | null;
  new_status: string | null;
  total: number | null;
  actor_id: string | null;
  actor_name: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
};

const ACTION_LABEL: Record<string, string> = {
  void: "VOID",
  cancel: "BATAL",
  refund: "REFUND",
  reopen: "REOPEN",
  edit: "EDIT",
};

const ACTION_COLOR: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  void: "destructive",
  cancel: "destructive",
  refund: "secondary",
  reopen: "outline",
  edit: "default",
};

const PAGE_SIZE = 50;

function OrderAuditPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [actorMap, setActorMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const load = useCallback(async () => {
    if (!shop) return;
    setLoading(true);
    let q = (supabase as any)
      .from("order_audit_log")
      .select("*")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (action !== "all") q = q.eq("action", action);
    if (search.trim()) {
      const s = search.trim();
      q = q.or(`order_no.ilike.%${s}%,reason.ilike.%${s}%,actor_name.ilike.%${s}%`);
    }

    const { data, error } = await q;
    if (error) {
      setLoading(false);
      return;
    }
    const rows = (data ?? []) as AuditEntry[];
    setEntries(rows);

    // Resolve actor names from profiles
    const ids = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean) as string[]));
    if (ids.length) {
      const { data: profs } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      const m: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => {
        m[p.id] = p.full_name || p.email || p.id.slice(0, 8);
      });
      setActorMap(m);
    }
    setLoading(false);
  }, [shop, action, search, page]);

  useEffect(() => {
    load();
  }, [load]);

  const exportCSV = () => {
    const rows = [
      ["Waktu", "Aksi", "Order No", "User", "Status Sebelum", "Status Sesudah", "Total", "Alasan"],
      ...entries.map((e) => [
        new Date(e.created_at).toLocaleString("id-ID"),
        ACTION_LABEL[e.action] ?? e.action,
        e.order_no ?? "",
        e.actor_name || (e.actor_id ? actorMap[e.actor_id] ?? e.actor_id : ""),
        e.previous_status ?? "",
        e.new_status ?? "",
        e.total != null ? String(e.total) : "",
        e.reason ?? "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `order_audit_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (shopLoading) {
    return (
      <div className="flex h-full items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ScrollText className="h-6 w-6 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Log Pesanan</h1>
            <p className="text-sm text-muted-foreground">
              Riwayat VOID, CANCEL, REFUND lengkap dengan alasan & user pelaku.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={entries.length === 0}>
            <Download className="h-4 w-4 mr-1.5" /> Export CSV
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <Select value={action} onValueChange={(v) => { setAction(v); setPage(0); }}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Aksi</SelectItem>
            <SelectItem value="void">VOID</SelectItem>
            <SelectItem value="cancel">CANCEL</SelectItem>
            <SelectItem value="refund">REFUND</SelectItem>
            <SelectItem value="reopen">REOPEN</SelectItem>
            <SelectItem value="edit">EDIT</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nomor order, alasan, atau user..."
            className="pl-8"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
      </div>

      <div className="space-y-2">
        {loading && (
          <div className="py-8 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
        )}
        {!loading && entries.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground">
            <ScrollText className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p>Belum ada catatan audit pesanan.</p>
          </Card>
        )}
        {entries.map((e) => {
          const actor = e.actor_name || (e.actor_id ? actorMap[e.actor_id] : null);
          return (
            <Card key={e.id} className="p-4">
              <div className="flex items-start gap-3">
                <Badge variant={ACTION_COLOR[e.action] ?? "default"} className="shrink-0">
                  {ACTION_LABEL[e.action] ?? e.action}
                </Badge>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {e.order_no && (
                      <span className="font-mono text-sm font-semibold inline-flex items-center gap-1">
                        <Receipt className="h-3.5 w-3.5" /> {e.order_no}
                      </span>
                    )}
                    {e.previous_status && (
                      <Badge variant="outline" className="text-[10px]">
                        {e.previous_status} → {e.new_status ?? "-"}
                      </Badge>
                    )}
                    {e.total != null && (
                      <Badge variant="secondary" className="text-[10px] tabular-nums">
                        {formatIDR(Number(e.total))}
                      </Badge>
                    )}
                  </div>
                  {e.reason && (
                    <p className="text-sm mt-1.5"><span className="text-muted-foreground">Alasan:</span> {e.reason}</p>
                  )}
                  <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {actor && (
                      <span className="inline-flex items-center gap-1"><User className="h-3 w-3" /> {actor}</span>
                    )}
                    <span>{new Date(e.created_at).toLocaleString("id-ID")}</span>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3 mt-4">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
          Sebelumnya
        </Button>
        <span className="text-sm text-muted-foreground">Halaman {page + 1}</span>
        <Button variant="outline" size="sm" disabled={entries.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>
          Berikutnya
        </Button>
      </div>
    </div>
  );
}