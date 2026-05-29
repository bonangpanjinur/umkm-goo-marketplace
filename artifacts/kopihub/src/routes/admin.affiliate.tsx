import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import { Link2, Plus, Loader2, RefreshCw, Copy, TrendingUp, Banknote, Users, CheckCircle2, Pencil } from "lucide-react";

export const Route = createFileRoute("/admin/affiliate")({
  head: () => ({ meta: [{ title: "Program Afiliasi — Admin" }] }),
  component: AffiliatePage,
});

type Affiliate = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  ref_code: string;
  commission_pct: number;
  clicks: number;
  conversions: number;
  total_earned: number;
  pending_payout: number;
  is_active: boolean;
  joined_at: string;
};

function genRefCode(name: string) {
  return name.slice(0, 4).toUpperCase().replace(/\s/g, "") + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export default function AffiliatePage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", commission_pct: "10", ref_code: "" });

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("affiliates").select("*").order("total_earned", { ascending: false });
    if (error) toast.error(error.message);
    setAffiliates((data ?? []) as Affiliate[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim() || !form.email.trim()) { toast.error("Nama & email wajib"); return; }
    setSaving(true);
    try {
      await (supabase as any).from("affiliates").insert({
        name: form.name, email: form.email, phone: form.phone || null,
        commission_pct: Number(form.commission_pct),
        ref_code: form.ref_code || genRefCode(form.name),
      });
      toast.success("Afiliator baru ditambahkan");
      setOpen(false);
      load();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal"); }
    finally { setSaving(false); }
  };

  const toggle = async (a: Affiliate) => {
    await (supabase as any).from("affiliates").update({ is_active: !a.is_active }).eq("id", a.id);
    setAffiliates(prev => prev.map(x => x.id === a.id ? { ...x, is_active: !a.is_active } : x));
  };

  const payout = async (a: Affiliate) => {
    if (a.pending_payout <= 0) { toast.error("Tidak ada yang perlu dibayar"); return; }
    await (supabase as any).from("affiliates").update({ pending_payout: 0, total_earned: a.total_earned }).eq("id", a.id);
    setAffiliates(prev => prev.map(x => x.id === a.id ? { ...x, pending_payout: 0 } : x));
    toast.success(`Komisi ${formatIDR(a.pending_payout)} untuk ${a.name} dibayar`);
  };

  const totalPending = affiliates.reduce((s, a) => s + a.pending_payout, 0);
  const totalEarned = affiliates.reduce((s, a) => s + a.total_earned, 0);
  const totalConversions = affiliates.reduce((s, a) => s + a.conversions, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><Link2 className="h-5 w-5 text-primary" /> Affiliate & Partner Management</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Kelola afiliator — track klik, konversi, dan hitung komisi otomatis.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button onClick={() => { setForm({ name: "", email: "", phone: "", commission_pct: "10", ref_code: "" }); setOpen(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" /> Tambah Afiliator
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border bg-card p-4 text-center"><p className="text-2xl font-bold text-primary">{affiliates.length}</p><p className="text-xs text-muted-foreground">Total Afiliator</p></div>
        <div className="rounded-xl border bg-card p-4 text-center"><p className="text-xl font-bold text-amber-600">{formatIDR(totalPending)}</p><p className="text-xs text-muted-foreground">Komisi Belum Dibayar</p></div>
        <div className="rounded-xl border bg-card p-4 text-center"><p className="text-xl font-bold text-green-600">{totalConversions}</p><p className="text-xs text-muted-foreground">Total Konversi</p></div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : affiliates.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <Link2 className="mx-auto h-8 w-8 opacity-30 mb-2" />
          <p className="text-sm">Belum ada afiliator. Tambah partner pertama.</p>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {["Nama","Kode Ref","Komisi","Klik","Konversi","Total Earned","Pending","Status",""].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {affiliates.map(a => (
                  <tr key={a.id} className={`hover:bg-muted/20 ${!a.is_active ? "opacity-50" : ""}`}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.email}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{a.ref_code}</code>
                        <button onClick={() => { navigator.clipboard.writeText(`https://umkmgo.id?ref=${a.ref_code}`); toast.success("Link disalin"); }}
                          className="text-muted-foreground hover:text-primary"><Copy className="h-3 w-3" /></button>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 font-semibold">{a.commission_pct}%</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{a.clicks}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-medium">{a.conversions}</span>
                      {a.clicks > 0 && <span className="text-xs text-muted-foreground ml-1">({Math.round((a.conversions / a.clicks) * 100)}%)</span>}
                    </td>
                    <td className="px-3 py-2.5 font-semibold text-green-600">{formatIDR(a.total_earned)}</td>
                    <td className="px-3 py-2.5">
                      {a.pending_payout > 0 ? (
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-amber-600">{formatIDR(a.pending_payout)}</span>
                          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => payout(a)}>Bayar</Button>
                        </div>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5"><Switch checked={a.is_active} onCheckedChange={() => toggle(a)} /></td>
                    <td className="px-3 py-2.5">
                      <button className="text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Afiliator Baru</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {([["name","Nama *","Budi Santoso"],["email","Email *","budi@email.com"],["phone","WhatsApp","08xx..."],["commission_pct","Komisi (%)","10"],["ref_code","Kode Ref (opsional, auto-generate jika kosong)","BUDI2024"]] as [string,string,string][]).map(([k,l,p]) => (
              <div key={k} className="space-y-1.5"><Label>{l}</Label><Input type={k === "commission_pct" ? "number" : "text"} value={(form as Record<string,string>)[k]} placeholder={p} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} /></div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button disabled={saving} onClick={save}>{saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
