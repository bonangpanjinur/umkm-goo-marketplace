import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShieldCheck, Loader2, RefreshCw, Download, Trash2, Search, AlertTriangle, FileDown, UserX } from "lucide-react";

export const Route = createFileRoute("/admin/gdpr-tools")({
  head: () => ({ meta: [{ title: "Alat GDPR — Admin" }] }),
  component: GdprToolsPage,
});

type DataRequest = {
  id: string;
  user_id: string;
  email: string;
  type: "export" | "erasure";
  status: "pending" | "processing" | "completed" | "rejected";
  requested_at: string;
  completed_at: string | null;
  notes: string | null;
};

const STATUS_META = {
  pending:    { label: "Menunggu",    cls: "bg-amber-100 text-amber-700" },
  processing: { label: "Diproses",    cls: "bg-blue-100 text-blue-700" },
  completed:  { label: "Selesai",     cls: "bg-green-100 text-green-700" },
  rejected:   { label: "Ditolak",     cls: "bg-red-100 text-red-700" },
};

function fmtDate(d: string) { return new Date(d).toLocaleString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }

export default function GdprToolsPage() {
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [loading, setLoading] = useState(true);
const [search, setSearch] = useState("");
  const [processing, setProcessing] = useState<string | null>(null);
  const [manualEmail, setManualEmail] = useState("");
  const [manualType, setManualType] = useState<"export" | "erasure">("export");
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("data_requests").select("*").order("requested_at", { ascending: false }).limit(100);
    if (error) toast.error(error.message);
    setRequests((data ?? []) as DataRequest[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const process = async (req: DataRequest, action: "completed" | "rejected") => {
    setProcessing(req.id);
    await (supabase as any).from("data_requests").update({ status: action, completed_at: new Date().toISOString() }).eq("id", req.id);
    setRequests(prev => prev.map(x => x.id === req.id ? { ...x, status: action, completed_at: new Date().toISOString() } : x));
    toast.success(action === "completed" ? "Permintaan diselesaikan" : "Permintaan ditolak");
    setProcessing(null);
  };

  const exportData = async (req: DataRequest) => {
    setProcessing(req.id);
    const { data: user } = await supabase.auth.admin.getUserById(req.user_id).catch(() => ({ data: null }));
    const exportData = {
      request_id: req.id,
      exported_at: new Date().toISOString(),
      user_info: { email: req.email, user_id: req.user_id },
      note: "Data export sesuai Pasal 28 UU PDP No. 27/2022",
      data_categories: ["Profil akun", "Riwayat pesanan", "Riwayat pembayaran", "Data preferensi"],
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `data-export-${req.email}.json`; a.click();
    await process(req, "completed");
  };

  const addManual = async () => {
    if (!manualEmail.trim()) { toast.error("Email wajib diisi"); return; }
    await (supabase as any).from("data_requests").insert({ user_id: "00000000-0000-0000-0000-000000000000", email: manualEmail, type: manualType });
    toast.success("Permintaan ditambahkan");
    setAddOpen(false);
    load();
  };

  const filtered = requests.filter(r =>
    !search.trim() || r.email.toLowerCase().includes(search.toLowerCase())
  );
  const pending = requests.filter(r => r.status === "pending").length;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><ShieldCheck className="h-5 w-5 text-primary" /> Data Export & GDPR / UU PDP Tools</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Kelola permintaan export data & hak hapus sesuai UU PDP No. 27 Tahun 2022.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button onClick={() => setAddOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Tambah Permintaan</Button>
        </div>
      </div>

      {pending > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-2 text-sm text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span><strong>{pending} permintaan</strong> data menunggu tindakan. UU PDP mewajibkan respons dalam 14 hari kerja.</span>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cari email pengguna..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <ShieldCheck className="mx-auto h-8 w-8 opacity-30 mb-2" />
          <p className="text-sm">Belum ada permintaan data masuk.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(r => {
            const sm = STATUS_META[r.status];
            return (
              <div key={r.id} className="flex items-center gap-4 rounded-xl border bg-card p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{r.email}</span>
                    <Badge className={`text-xs ${r.type === "export" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>
                      {r.type === "export" ? <FileDown className="h-3 w-3 mr-1 inline" /> : <UserX className="h-3 w-3 mr-1 inline" />}
                      {r.type === "export" ? "Export Data" : "Hapus Data"}
                    </Badge>
                    <Badge className={`text-xs ${sm.cls}`}>{sm.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Diminta: {fmtDate(r.requested_at)}</p>
                </div>
                {r.status === "pending" && (
                  <div className="flex gap-2 shrink-0">
                    {r.type === "export" ? (
                      <Button size="sm" disabled={processing === r.id} onClick={() => exportData(r)} className="gap-1.5">
                        {processing === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                        Export & Selesai
                      </Button>
                    ) : (
                      <Button size="sm" variant="destructive" disabled={processing === r.id} onClick={() => process(r, "completed")}>
                        {processing === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                        Proses Hapus
                      </Button>
                    )}
                    <Button size="sm" variant="outline" disabled={processing === r.id} onClick={() => process(r, "rejected")}>Tolak</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah Permintaan Data</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Email Pengguna</Label><Input type="email" value={manualEmail} onChange={e => setManualEmail(e.target.value)} /></div>
            <div className="flex gap-3">
              {(["export", "erasure"] as const).map(t => (
                <button key={t} onClick={() => setManualType(t)}
                  className={`flex-1 rounded-lg border p-3 text-sm text-center transition ${manualType === t ? "border-primary bg-primary/5" : "border-border hover:bg-accent"}`}>
                  <p className="font-semibold">{t === "export" ? "Export Data" : "Hapus Data"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t === "export" ? "Pasal 28 UU PDP" : "Right to erasure"}</p>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Batal</Button>
            <Button onClick={addManual}><ShieldCheck className="h-4 w-4 mr-2" /> Tambah</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Plus({ className }: { className?: string }) { return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M5 12h14"/><path d="M12 5v14"/></svg>; }
