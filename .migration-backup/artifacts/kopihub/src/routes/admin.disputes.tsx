import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, AlertOctagon, RefreshCw } from "lucide-react";
import { formatIDR } from "@/lib/format";
import { ResolveDisputeDialog } from "@/components/marketplace/ResolveDisputeDialog";

export const Route = createFileRoute("/admin/disputes")({
  head: () => ({ meta: [{ title: "Sengketa · Admin" }] }),
  component: AdminDisputesPage,
});

const STATUS_COLOR: Record<string, string> = {
  open: "bg-red-100 text-red-900",
  under_review: "bg-amber-100 text-amber-900",
  resolved: "bg-emerald-100 text-emerald-900",
  rejected: "bg-zinc-200 text-zinc-700",
};

function AdminDisputesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("active");
  const [resolveFor, setResolveFor] = useState<any>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("order_disputes")
      .select("id, status, reason, description, refund_amount, resolution, created_at, resolved_at, order:orders(id, order_no, total, customer_name), shop:coffee_shops(id, name, slug)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!error) setRows(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = rows.filter((d) => {
    if (tab === "active") return ["open", "under_review"].includes(d.status);
    if (tab === "done") return ["resolved", "rejected"].includes(d.status);
    return true;
  });

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-6xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <AlertOctagon className="h-5 w-5 text-destructive" /> Sengketa Marketplace
          </h1>
          <p className="text-sm text-muted-foreground">Eskalasi dan pengawasan sengketa pelanggan ↔ penjual.</p>
        </div>
        <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-1" />Refresh</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">Aktif</TabsTrigger>
          <TabsTrigger value="done">Selesai</TabsTrigger>
          <TabsTrigger value="all">Semua</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Tidak ada sengketa</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <Card key={d.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{d.order?.order_no || d.order?.id}</CardTitle>
                    <p className="text-xs text-muted-foreground">{new Date(d.created_at).toLocaleString("id-ID")} · {d.shop?.name}</p>
                  </div>
                  <Badge className={`text-xs ${STATUS_COLOR[d.status] || ""}`}>{d.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div><span className="font-medium">Alasan:</span> {d.reason}</div>
                {d.description && <div className="text-muted-foreground">"{d.description}"</div>}
                <div className="grid grid-cols-3 gap-2 text-xs border-t pt-2">
                  <div><div className="text-muted-foreground">Pelanggan</div><div>{d.order?.customer_name || "-"}</div></div>
                  <div><div className="text-muted-foreground">Total order</div><div>{formatIDR(d.order?.total || 0)}</div></div>
                  <div><div className="text-muted-foreground">Refund</div><div className="text-destructive">{d.refund_amount ? formatIDR(d.refund_amount) : "-"}</div></div>
                </div>
                {d.resolution && (
                  <div className="rounded-md border bg-muted/40 p-2 text-xs">
                    <span className="font-semibold">Resolusi:</span> {d.resolution}
                  </div>
                )}
                {["open", "under_review"].includes(d.status) && (
                  <div className="pt-1">
                    <Button size="sm" variant="destructive" onClick={() => setResolveFor(d)}>
                      Putuskan
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ResolveDisputeDialog
        open={!!resolveFor}
        onOpenChange={(v) => !v && setResolveFor(null)}
        dispute={resolveFor}
        onResolved={load}
      />
    </div>
  );
}
