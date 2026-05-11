import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/withdrawals")({
  component: AdminWithdrawals,
});

function AdminWithdrawals() {
  const [list, setList] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("pending");

  const refresh = () =>
    supabase
      .from("withdrawal_requests")
      .select("*, shop:coffee_shops(name, slug, owner_id)")
      .eq(filter === "all" ? "id" : "status", filter === "all" ? "id" : filter as any)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }) => setList((data as any[]) ?? []));

  useEffect(() => {
    let q = supabase
      .from("withdrawal_requests")
      .select("*, shop:coffee_shops(name, slug, owner_id)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (filter !== "all") q = q.eq("status", filter as any);
    q.then(({ data }) => setList((data as any[]) ?? []));
  }, [filter]);

  const setStatus = async (id: string, status: string, reject_reason?: string) => {
    const patch: any = { status, reviewed_at: new Date().toISOString() };
    if (status === "rejected" && reject_reason) patch.reject_reason = reject_reason;
    if (status === "paid") patch.paid_at = new Date().toISOString();
    const { error } = await supabase.from("withdrawal_requests").update(patch).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status diperbarui");
    setList((prev) => prev.map((w) => (w.id === id ? { ...w, ...patch } : w)));
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Permohonan Penarikan</h1>
        <p className="text-sm text-muted-foreground">Review & proses pencairan dana toko.</p>
      </div>

      <div className="flex gap-2">
        {["pending", "approved", "paid", "rejected", "all"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left">Tanggal</th>
              <th className="px-4 py-2 text-left">Toko</th>
              <th className="px-4 py-2 text-right">Jumlah</th>
              <th className="px-4 py-2 text-right">Net</th>
              <th className="px-4 py-2 text-left">Bank</th>
              <th className="px-4 py-2 text-left">Status</th>
              <th className="px-4 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Tidak ada data.</td></tr>
            ) : list.map((w) => (
              <tr key={w.id} className="border-t border-border align-top">
                <td className="px-4 py-3 whitespace-nowrap">{new Date(w.created_at).toLocaleString("id-ID")}</td>
                <td className="px-4 py-3 font-medium">{w.shop?.name ?? "-"}</td>
                <td className="px-4 py-3 text-right">Rp {Number(w.amount).toLocaleString("id-ID")}</td>
                <td className="px-4 py-3 text-right font-semibold">Rp {Number(w.net_amount).toLocaleString("id-ID")}</td>
                <td className="px-4 py-3">
                  <div>{w.bank_name}</div>
                  <div className="text-xs text-muted-foreground">{w.bank_account_no} · {w.bank_account_name}</div>
                </td>
                <td className="px-4 py-3"><span className="rounded-full bg-muted px-2 py-0.5 text-xs">{w.status}</span></td>
                <td className="px-4 py-3 text-right">
                  {w.status === "pending" && (
                    <div className="flex justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => {
                        const r = prompt("Alasan penolakan?");
                        if (r) setStatus(w.id, "rejected", r);
                      }}>Tolak</Button>
                      <Button size="sm" onClick={() => setStatus(w.id, "approved")}>Setujui</Button>
                    </div>
                  )}
                  {w.status === "approved" && (
                    <Button size="sm" onClick={() => setStatus(w.id, "paid")}>Tandai Lunas</Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
