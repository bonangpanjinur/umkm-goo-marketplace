import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import { Target, Plus, Loader2, CheckCircle2, Circle, Clock, Banknote, MessageSquare, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/pos-app/milestones")({
  head: () => ({ meta: [{ title: "Milestone & Escrow Proyek" }] }),
  component: MilestonesPage,
});

type Milestone = {
  id: string;
  order_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  project_name: string;
  total_value: number;
  milestones: MilestoneStep[];
  status: string;
};

type MilestoneStep = {
  id: string;
  title: string;
  description: string;
  amount: number;
  pct: number;
  status: "pending" | "in_progress" | "delivered" | "paid" | "disputed";
  due_date: string | null;
  deliverable_url: string | null;
};

const STEP_STATUS = {
  pending:    { label: "Menunggu",    cls: "bg-gray-100 text-gray-600",    icon: Circle },
  in_progress:{ label: "Dikerjakan",  cls: "bg-blue-100 text-blue-700",    icon: Clock },
  delivered:  { label: "Dikirim",     cls: "bg-amber-100 text-amber-700",  icon: CheckCircle2 },
  paid:       { label: "Dibayar ✅",  cls: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  disputed:   { label: "Sengketa",    cls: "bg-red-100 text-red-700",      icon: AlertTriangle },
};

function fmtDate(d: string) { return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" }); }

export default function MilestonesPage() {
  const { shop } = useCurrentShop();
  const [projects, setProjects] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
const [expandedId, setExpandedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ customer_name: "", customer_phone: "", project_name: "", total_value: "" });
  const [steps, setSteps] = useState<{ title: string; pct: string; description: string; due_date: string }[]>([
    { title: "DP / Konsep", pct: "30", description: "Pembayaran awal & diskusi konsep", due_date: "" },
    { title: "Revisi & Review", pct: "40", description: "Pengerjaan + revisi", due_date: "" },
    { title: "Final Delivery", pct: "30", description: "Pengiriman hasil akhir", due_date: "" },
  ]);

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("project_milestones").select("*").eq("shop_id", shopId)
      .eq("status", "active").order("created_at", { ascending: false });
    if (error?.message?.includes("exist")) setShowSql(true);
    setProjects((data ?? []) as Milestone[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const save = async () => {
    if (!shop || !form.project_name.trim() || !form.customer_name.trim() || !form.total_value) {
      toast.error("Isi semua field yang wajib"); return;
    }
    setSaving(true);
    const total = Number(form.total_value);
    const milestoneSteps: MilestoneStep[] = steps.map((s, i) => ({
      id: `ms_${Date.now()}_${i}`,
      title: s.title,
      description: s.description,
      amount: Math.round(total * Number(s.pct) / 100),
      pct: Number(s.pct),
      status: "pending",
      due_date: s.due_date || null,
      deliverable_url: null,
    }));
    try {
      const { error } = await (supabase as any).from("project_milestones").insert({
        shop_id: shop.id,
        customer_name: form.customer_name.trim(),
        customer_phone: form.customer_phone.trim() || null,
        project_name: form.project_name.trim(),
        total_value: total,
        milestones: milestoneSteps,
        status: "active",
      });
      if (error) throw error;
      toast.success("Proyek dengan milestone dibuat");
      setOpen(false);
      load(shop.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally { setSaving(false); }
  };

  const updateStepStatus = async (proj: Milestone, stepId: string, status: MilestoneStep["status"]) => {
    const milestones = proj.milestones.map(m => m.id === stepId ? { ...m, status } : m);
    await (supabase as any).from("project_milestones").update({ milestones }).eq("id", proj.id);
    setProjects(prev => prev.map(p => p.id === proj.id ? { ...p, milestones } : p));
    toast.success("Status milestone diperbarui");
    if (proj.customer_phone && status === "delivered") {
      const step = milestones.find(m => m.id === stepId);
      const msg = `Halo ${proj.customer_name}, milestone "${step?.title ?? ""}" untuk proyek "${proj.project_name}" sudah selesai dikerjakan. Mohon konfirmasi dan lakukan pembayaran ${formatIDR(step?.amount ?? 0)} untuk melanjutkan. Terima kasih!`;
      window.open(`https://wa.me/${proj.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
    }
  };

  const totalPct = steps.reduce((s, x) => s + Number(x.pct || 0), 0);

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><Target className="h-5 w-5 text-primary" /> Milestone & Escrow Proyek</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Tracking proyek freelance per fase — pembayaran bertahap per milestone.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Proyek Baru</Button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <Target className="mx-auto h-10 w-10 opacity-30 mb-3" />
          <p className="font-medium">Belum ada proyek aktif</p>
          <Button className="mt-4 gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Buat Proyek</Button>
        </div>
      ) : (
        <div className="space-y-4">
          {projects.map(proj => {
            const paidAmt = proj.milestones.filter(m => m.status === "paid").reduce((s, m) => s + m.amount, 0);
            const progress = Math.round((paidAmt / proj.total_value) * 100);
            const isExpanded = expandedId === proj.id;
            return (
              <div key={proj.id} className="rounded-xl border bg-card overflow-hidden">
                <button className="w-full text-left p-4 hover:bg-accent/20 transition"
                  onClick={() => setExpandedId(isExpanded ? null : proj.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{proj.project_name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{proj.customer_name}{proj.customer_phone && ` · ${proj.customer_phone}`}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-primary">{formatIDR(proj.total_value)}</p>
                      <p className="text-xs text-muted-foreground">{progress}% dibayar</p>
                    </div>
                  </div>
                  <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                    {proj.milestones.map(m => {
                      const s = STEP_STATUS[m.status]; const Icon = s.icon;
                      return <span key={m.id} className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 ${s.cls}`}><Icon className="h-2.5 w-2.5" />{m.title}</span>;
                    })}
                  </div>
                </button>
                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                    {proj.milestones.map(ms => {
                      const sc = STEP_STATUS[ms.status]; const Icon = sc.icon;
                      return (
                        <div key={ms.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${sc.cls}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm">{ms.title}</p>
                              <p className="font-bold text-sm text-primary shrink-0">{formatIDR(ms.amount)}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">{ms.description}</p>
                            {ms.due_date && <p className="text-xs text-muted-foreground">Deadline: {fmtDate(ms.due_date)}</p>}
                            {ms.status !== "paid" && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {ms.status === "pending" && (
                                  <Button size="sm" variant="outline" className="text-xs h-6" onClick={() => updateStepStatus(proj, ms.id, "in_progress")}>
                                    Mulai Kerjakan
                                  </Button>
                                )}
                                {ms.status === "in_progress" && (
                                  <Button size="sm" className="text-xs h-6" onClick={() => updateStepStatus(proj, ms.id, "delivered")}>
                                    <MessageSquare className="h-3 w-3 mr-1" /> Kirim & Notif Klien
                                  </Button>
                                )}
                                {ms.status === "delivered" && (
                                  <Button size="sm" className="text-xs h-6 bg-green-600 hover:bg-green-700" onClick={() => updateStepStatus(proj, ms.id, "paid")}>
                                    <Banknote className="h-3 w-3 mr-1" /> Tandai Dibayar
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New project dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Proyek Baru</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nama Proyek <span className="text-destructive">*</span></Label>
                <Input value={form.project_name} onChange={e => setForm(f => ({ ...f, project_name: e.target.value }))} placeholder="Website Toko, Desain Logo, dll." />
              </div>
              <div className="space-y-1.5">
                <Label>Nilai Total (Rp) <span className="text-destructive">*</span></Label>
                <Input type="number" min={0} value={form.total_value} onChange={e => setForm(f => ({ ...f, total_value: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Nama Klien <span className="text-destructive">*</span></Label>
                <Input value={form.customer_name} onChange={e => setForm(f => ({ ...f, customer_name: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>WA Klien</Label>
                <Input value={form.customer_phone} onChange={e => setForm(f => ({ ...f, customer_phone: e.target.value }))} placeholder="08xx..." />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Milestone</Label>
                <span className={`text-xs font-medium ${totalPct === 100 ? "text-green-600" : "text-amber-600"}`}>
                  Total: {totalPct}% {totalPct !== 100 && "(harus 100%)"}
                </span>
              </div>
              {steps.map((s, i) => (
                <div key={i} className="grid grid-cols-12 gap-2">
                  <Input className="col-span-5 text-sm" value={s.title} onChange={e => { const ns = [...steps]; ns[i].title = e.target.value; setSteps(ns); }} placeholder="Nama fase" />
                  <div className="col-span-2 flex items-center gap-1">
                    <Input type="number" min={0} max={100} className="text-sm text-center" value={s.pct} onChange={e => { const ns = [...steps]; ns[i].pct = e.target.value; setSteps(ns); }} />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                  <Input className="col-span-4 text-sm" value={s.due_date} type="date" onChange={e => { const ns = [...steps]; ns[i].due_date = e.target.value; setSteps(ns); }} />
                  <button onClick={() => setSteps(prev => prev.filter((_, j) => j !== i))} className="text-destructive hover:opacity-70 text-xs">✕</button>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={() => setSteps(p => [...p, { title: "", pct: "0", description: "", due_date: "" }])} className="gap-1 text-xs">
                <Plus className="h-3 w-3" /> Tambah Milestone
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving || totalPct !== 100}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Target className="h-4 w-4 mr-2" />}
              Buat Proyek
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
