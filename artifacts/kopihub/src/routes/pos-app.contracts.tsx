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
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import { ScrollText, Plus, Loader2, RefreshCw, Search, Printer, CheckCircle2, Clock, X, MessageSquare, Link as LinkIcon, PenLine } from "lucide-react";

export const Route = createFileRoute("/pos-app/contracts")({
  head: () => ({ meta: [{ title: "Kontrak Freelance Digital" }] }),
  component: ContractsPage,
});

type Contract = {
  id: string;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  project_name: string;
  project_description: string;
  total_value: number;
  start_date: string;
  end_date: string;
  deliverables: string;
  revision_count: number;
  payment_terms: string;
  status: "draft" | "sent" | "signed" | "completed" | "cancelled";
  signed_at: string | null;
  signature_url: string | null;
  signed_by_name: string | null;
  sign_token: string | null;
  created_at: string;
};

const SQL_HINT = `CREATE TABLE IF NOT EXISTS public.freelance_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_phone text,
  client_email text,
  project_name text NOT NULL,
  project_description text NOT NULL,
  total_value numeric(12,2) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  deliverables text NOT NULL,
  revision_count int NOT NULL DEFAULT 2,
  payment_terms text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);`;

const STATUS_META = {
  draft:     { label: "Draft",      cls: "bg-gray-100 text-gray-600" },
  sent:      { label: "Dikirim",    cls: "bg-blue-100 text-blue-700" },
  signed:    { label: "Ditandatangani", cls: "bg-green-100 text-green-700" },
  completed: { label: "Selesai",    cls: "bg-purple-100 text-purple-700" },
  cancelled: { label: "Dibatalkan", cls: "bg-red-100 text-red-700" },
};

function fmtDate(d: string) { return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }); }

const CONTRACT_TEMPLATE = (shop: Record<string, string>, c: Partial<Contract>) => `KONTRAK KERJA FREELANCE

Tanggal: ${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}

PIHAK PERTAMA (Freelancer/Jasa):
Nama: ${shop.name ?? ""}
Kontak: ${shop.phone ?? ""}

PIHAK KEDUA (Klien):
Nama: ${c.client_name ?? ""}
Kontak: ${c.client_phone ?? ""}

LINGKUP PEKERJAAN:
Nama Proyek: ${c.project_name ?? ""}
Deskripsi: ${c.project_description ?? ""}

DELIVERABLES:
${c.deliverables ?? ""}

REVISI: Termasuk ${c.revision_count ?? 2}x revisi. Revisi tambahan dikenakan biaya.

TIMELINE:
Mulai: ${c.start_date ? fmtDate(c.start_date) : ""}
Selesai: ${c.end_date ? fmtDate(c.end_date) : ""}

NILAI KONTRAK: ${formatIDR(c.total_value ?? 0)}
SYARAT PEMBAYARAN: ${c.payment_terms ?? ""}

KETENTUAN UMUM:
1. Hak cipta atas karya berpindah kepada klien setelah pembayaran lunas.
2. Freelancer berhak mencantumkan karya dalam portofolio (tanpa data sensitif klien).
3. Keterlambatan pembayaran > 7 hari dikenakan denda 2% per minggu.
4. Force majeure tidak menjadi tanggung jawab salah satu pihak.

Dengan ini para pihak menyetujui kontrak ini.

Pihak Pertama,                    Pihak Kedua,

_____________________              _____________________
${shop.name ?? ""}                 ${c.client_name ?? ""}`;

export default function ContractsPage() {
  const { shop } = useCurrentShop();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<Contract | null>(null);
  const [form, setForm] = useState({
    client_name: "", client_phone: "", client_email: "",
    project_name: "", project_description: "", total_value: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "", deliverables: "", revision_count: "2",
    payment_terms: "30% DP, 40% progress 50%, 30% setelah final delivery",
  });

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("freelance_contracts").select("*").eq("shop_id", shopId)
      .order("created_at", { ascending: false });
    if (error?.message?.includes("exist")) setShowSql(true);
    setContracts((data ?? []) as Contract[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const save = async () => {
    if (!shop || !form.client_name.trim() || !form.project_name.trim()) { toast.error("Nama klien & proyek wajib"); return; }
    setSaving(true);
    try {
      const { error } = await (supabase as any).from("freelance_contracts").insert({
        shop_id: shop.id, ...form,
        total_value: Number(form.total_value),
        revision_count: Number(form.revision_count),
        client_phone: form.client_phone.trim() || null,
        client_email: form.client_email.trim() || null,
        status: "draft",
      });
      if (error) throw error;
      toast.success("Kontrak dibuat");
      setOpen(false);
      load(shop.id);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal"); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: Contract["status"]) => {
    const updates: Record<string, unknown> = { status };
    if (status === "signed") updates.signed_at = new Date().toISOString();
    await (supabase as any).from("freelance_contracts").update(updates).eq("id", id);
    setContracts(prev => prev.map(x => x.id === id ? { ...x, ...updates } : x));
    toast.success(`Status kontrak diperbarui: ${STATUS_META[status].label}`);
  };

  const sendViaWA = (c: Contract) => {
    if (!c.client_phone) { toast.error("Nomor WA klien tidak tersedia"); return; }
    const signUrl = c.sign_token ? `${window.location.origin}/kontrak/${c.sign_token}` : "";
    const msg = `Halo ${c.client_name}, kontrak kerja untuk proyek "${c.project_name}" sudah siap. Nilai: ${formatIDR(c.total_value)}.${signUrl ? `\n\nSilakan tinjau & tanda tangan di tautan berikut:\n${signUrl}` : ""}\n\nTerima kasih!`;
    window.open(`https://wa.me/${c.client_phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
    updateStatus(c.id, "sent");
  };

  const copySignLink = async (c: Contract) => {
    if (!c.sign_token) { toast.error("Token tanda tangan belum tersedia"); return; }
    const url = `${window.location.origin}/kontrak/${c.sign_token}`;
    try { await navigator.clipboard.writeText(url); toast.success("Link tanda tangan disalin"); }
    catch { toast.error("Gagal menyalin"); }
  };

  const filtered = contracts.filter(c =>
    !search.trim() || c.client_name.toLowerCase().includes(search.toLowerCase()) || c.project_name.toLowerCase().includes(search.toLowerCase())
  );

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><ScrollText className="h-5 w-5 text-primary" /> Kontrak Freelance Digital</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Buat & kirim kontrak kerja digital — lindungi hak freelancer & klien.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> Buat Kontrak</Button>
      </div>

      {showSql && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Tabel belum ada:</p>
          <pre className="mt-2 text-xs font-mono bg-amber-100 p-2 rounded overflow-x-auto">{SQL_HINT}</pre>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Cari nama klien atau proyek..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <ScrollText className="mx-auto h-10 w-10 opacity-30 mb-3" />
          <p className="font-medium">Belum ada kontrak</p>
          <Button className="mt-4 gap-1.5" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Buat Kontrak Pertama</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => {
            const sm = STATUS_META[c.status];
            return (
              <div key={c.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{c.project_name}</span>
                      <Badge className={`text-xs ${sm.cls}`}>{sm.label}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.client_name} · {formatIDR(c.total_value)} · {fmtDate(c.start_date)}–{fmtDate(c.end_date)}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPreview(c)}>
                      <Printer className="h-3 w-3" />
                    </Button>
                    {c.sign_token && c.status !== "signed" && c.status !== "completed" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => copySignLink(c)}>
                        <LinkIcon className="h-3 w-3" /> Salin Link
                      </Button>
                    )}
                    {c.status === "draft" && (
                      <Button size="sm" className="h-7 text-xs gap-1" onClick={() => sendViaWA(c)}>
                        <MessageSquare className="h-3 w-3" /> Kirim WA
                      </Button>
                    )}
                    {c.status === "sent" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300" onClick={() => updateStatus(c.id, "signed")}>
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Tandai Manual
                      </Button>
                    )}
                    {c.status === "signed" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateStatus(c.id, "completed")}>
                        Selesai
                      </Button>
                    )}
                  </div>
                </div>
                {c.signature_url && (
                  <div className="mt-3 flex items-center gap-3 rounded-lg border bg-muted/30 p-2 text-xs">
                    <PenLine className="h-3.5 w-3.5 text-green-700 shrink-0" />
                    <img src={c.signature_url} alt="ttd" className="h-10 max-w-[140px] rounded bg-white" />
                    <div className="text-muted-foreground">
                      Ditandatangani oleh <span className="font-medium text-foreground">{c.signed_by_name ?? c.client_name}</span>
                      {c.signed_at && <> &middot; {new Date(c.signed_at).toLocaleString("id-ID")}</>}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New contract dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Buat Kontrak Freelance</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {([
              ["client_name", "Nama Klien *", "Budi Santoso"], ["client_phone", "WA Klien", "08xx..."],
              ["client_email", "Email Klien (opsional)", "klien@email.com"],
              ["project_name", "Nama Proyek *", "Website Toko Online"], ["total_value", "Nilai Kontrak (Rp) *", "5000000"],
              ["start_date", "Mulai", ""], ["end_date", "Selesai", ""],
              ["revision_count", "Jumlah Revisi", "2"],
            ] as [string, string, string][]).map(([k, l, p]) => (
              <div key={k} className="space-y-1.5">
                <Label>{l}</Label>
                <Input type={k.includes("date") ? "date" : k === "total_value" || k === "revision_count" ? "number" : "text"}
                  value={(form as Record<string, string>)[k]} placeholder={p}
                  onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label>Deliverables (list yang akan diserahkan)</Label>
              <Textarea rows={3} value={form.deliverables} onChange={e => setForm(f => ({ ...f, deliverables: e.target.value }))} placeholder="- File design (.fig, .ai)&#10;- Export PNG/JPG&#10;- Source code" />
            </div>
            <div className="space-y-1.5">
              <Label>Syarat Pembayaran</Label>
              <Input value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Deskripsi Proyek</Label>
              <Textarea rows={3} value={form.project_description} onChange={e => setForm(f => ({ ...f, project_description: e.target.value }))} placeholder="Pembuatan website toko online lengkap dengan fitur keranjang..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button disabled={saving} onClick={save}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ScrollText className="h-4 w-4 mr-2" />}
              Buat Kontrak
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview dialog */}
      {preview && (
        <Dialog open onOpenChange={() => setPreview(null)}>
          <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Preview Kontrak</DialogTitle></DialogHeader>
            <pre className="text-xs font-mono whitespace-pre-wrap bg-muted/30 p-4 rounded-lg overflow-x-auto">
              {CONTRACT_TEMPLATE(shop as unknown as Record<string, string>, preview)}
            </pre>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreview(null)}>Tutup</Button>
              <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" /> Cetak</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
