import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2, CheckCircle2, XCircle, Clock, ShieldCheck,
  ZoomIn, ZoomOut, User, Building2, Calendar
} from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin/kyc")({
  head: () => ({ meta: [{ title: "Verifikasi KYC — Admin" }] }),
  component: AdminKycPage,
});

type KycStatus = "not_submitted" | "pending" | "in_review" | "approved" | "rejected" | "expired";

type KycEntry = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  kyc_status: KycStatus | null;
  kyc_document_url: string | null;
  kyc_submitted_at: string | null;
  kyc_reviewed_at: string | null;
  kyc_reviewer_id: string | null;
  kyc_reject_reason: string | null;
  created_at: string;
  owner_name: string | null;
  owner_email: string | null;
};

type FilterTab = "pending" | "in_review" | "approved" | "rejected" | "all";

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  not_submitted: { label: "Belum Upload", cls: "bg-gray-100 text-gray-600" },
  pending:       { label: "Menunggu", cls: "bg-amber-100 text-amber-700" },
  in_review:     { label: "Sedang Ditinjau", cls: "bg-blue-100 text-blue-700" },
  approved:      { label: "Disetujui", cls: "bg-green-100 text-green-700" },
  rejected:      { label: "Ditolak", cls: "bg-red-100 text-red-700" },
  expired:       { label: "Kadaluarsa", cls: "bg-orange-100 text-orange-700" },
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function AdminKycPage() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<KycEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<FilterTab>("pending");
  const [selected, setSelected] = useState<KycEntry | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [imgZoom, setImgZoom] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("shops")
      .select("id, name, slug, owner_id, kyc_status, kyc_document_url, kyc_submitted_at, kyc_reviewed_at, kyc_reviewer_id, kyc_reject_reason, created_at")
      .not("kyc_status", "is", null)
      .order("kyc_submitted_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }

    const enriched = await Promise.all(
      ((data ?? []) as KycEntry[]).map(async (e) => {
        const { data: profile } = await supabase
          .from("profiles" as any)
          .select("display_name, email")
          .eq("id", e.owner_id)
          .maybeSingle();
        return {
          ...e,
          owner_name: (profile as any)?.display_name ?? null,
          owner_email: (profile as any)?.email ?? null,
        };
      })
    );
    setEntries(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const tabs: Array<{ key: FilterTab; label: string; count: number }> = [
    { key: "pending",   label: "Menunggu",  count: entries.filter(e => e.kyc_status === "pending").length },
    { key: "in_review", label: "Ditinjau",  count: entries.filter(e => e.kyc_status === "in_review").length },
    { key: "approved",  label: "Disetujui", count: entries.filter(e => e.kyc_status === "approved").length },
    { key: "rejected",  label: "Ditolak",   count: entries.filter(e => e.kyc_status === "rejected").length },
    { key: "all",       label: "Semua",     count: entries.length },
  ];

  const filtered = entries.filter(e => {
    if (tab === "all") return true;
    return e.kyc_status === tab;
  });

  const markInReview = async (entry: KycEntry) => {
    setBusy(true);
    const { error } = await supabase
      .from("shops")
      .update({ kyc_status: "in_review", kyc_reviewer_id: user?.id ?? null } as any)
      .eq("id", entry.id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    toast.success("Status diubah ke 'Sedang Ditinjau'");
    setSelected(s => s ? { ...s, kyc_status: "in_review" } : s);
    await load();
    setBusy(false);
  };

  const approve = async (entry: KycEntry) => {
    setBusy(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("shops")
      .update({
        kyc_status: "approved",
        kyc_reviewed_at: now,
        kyc_reviewer_id: user?.id ?? null,
        kyc_reject_reason: null,
      } as any)
      .eq("id", entry.id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    toast.success("KYC disetujui");
    setSelected(null);
    await load();
    setBusy(false);
  };

  const reject = async (entry: KycEntry) => {
    if (!rejectReason.trim()) { toast.error("Isi alasan penolakan terlebih dahulu"); return; }
    setBusy(true);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("shops")
      .update({
        kyc_status: "rejected",
        kyc_reviewed_at: now,
        kyc_reviewer_id: user?.id ?? null,
        kyc_reject_reason: rejectReason.trim(),
      } as any)
      .eq("id", entry.id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    toast.success("KYC ditolak");
    setSelected(null);
    setRejectReason("");
    await load();
    setBusy(false);
  };

  return (
    <div className="flex h-full min-h-screen">
      {/* Left panel — list */}
      <div className="flex w-80 flex-shrink-0 flex-col border-r border-border">
        <div className="border-b border-border p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <h1 className="text-base font-semibold">Verifikasi KYC</h1>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Review identitas merchant</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-border p-2">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${tab === t.key ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${tab === t.key ? "bg-white/20" : "bg-background"}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Tidak ada entri</div>
          ) : (
            filtered.map(e => {
              const st = STATUS_BADGE[e.kyc_status ?? "not_submitted"];
              const isActive = selected?.id === e.id;
              return (
                <button
                  key={e.id}
                  onClick={() => { setSelected(e); setRejectReason(e.kyc_reject_reason ?? ""); }}
                  className={`w-full border-b border-border p-3 text-left transition-colors hover:bg-accent ${isActive ? "bg-accent" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{e.name}</p>
                      <p className="truncate text-xs text-muted-foreground">@{e.slug}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.cls}`}>{st.label}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <Calendar className="mr-0.5 inline h-3 w-3" />
                    {fmtDate(e.kyc_submitted_at)}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right panel — detail */}
      <div className="flex flex-1 flex-col">
        {!selected ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="text-center text-muted-foreground">
              <ShieldCheck className="mx-auto mb-3 h-10 w-10 opacity-30" />
              <p className="text-sm">Pilih entri di kiri untuk mulai review</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 overflow-hidden">
            {/* Document preview */}
            <div className="flex flex-1 flex-col bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Dokumen KTP / KYC</p>
                <Button size="sm" variant="ghost" onClick={() => setImgZoom(z => !z)} className="h-7 gap-1.5 text-xs">
                  {imgZoom ? <ZoomOut className="h-3.5 w-3.5" /> : <ZoomIn className="h-3.5 w-3.5" />}
                  {imgZoom ? "Zoom Out" : "Zoom In"}
                </Button>
              </div>
              {selected.kyc_document_url ? (
                <div className={`flex-1 overflow-auto rounded-lg border border-border bg-background ${imgZoom ? "cursor-zoom-out" : "cursor-zoom-in"}`} onClick={() => setImgZoom(z => !z)}>
                  <img
                    src={selected.kyc_document_url}
                    alt="Dokumen KYC"
                    className={`transition-all duration-200 ${imgZoom ? "w-full" : "mx-auto max-h-[500px] object-contain p-4"}`}
                  />
                </div>
              ) : (
                <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border bg-background">
                  <p className="text-sm text-muted-foreground">Belum ada dokumen yang diupload</p>
                </div>
              )}
            </div>

            {/* Action panel */}
            <div className="w-80 flex-shrink-0 overflow-y-auto border-l border-border p-5">
              <div className="space-y-4">
                {/* Shop info */}
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Info Toko</p>
                  <Card className="p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{selected.name}</p>
                        <p className="text-xs text-muted-foreground">@{selected.slug}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-xs font-medium">{selected.owner_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{selected.owner_email ?? "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Status KYC</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[selected.kyc_status ?? "not_submitted"].cls}`}>
                        {STATUS_BADGE[selected.kyc_status ?? "not_submitted"].label}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>Didaftarkan: {fmtDate(selected.created_at)}</p>
                      <p>Disubmit: {fmtDate(selected.kyc_submitted_at)}</p>
                      {selected.kyc_reviewed_at && <p>Direview: {fmtDate(selected.kyc_reviewed_at)}</p>}
                    </div>
                  </Card>
                </div>

                {/* Actions */}
                {(selected.kyc_status === "pending" || selected.kyc_status === "in_review") && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Keputusan</p>
                    <div className="space-y-3">
                      {selected.kyc_status === "pending" && (
                        <Button size="sm" variant="outline" className="w-full justify-start gap-2" onClick={() => markInReview(selected)} disabled={busy}>
                          <Clock className="h-4 w-4 text-blue-500" />
                          Tandai Sedang Ditinjau
                        </Button>
                      )}
                      <Button size="sm" className="w-full justify-start gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => approve(selected)} disabled={busy}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Setujui KYC
                      </Button>
                      <div className="space-y-2">
                        <Label htmlFor="reject-reason" className="text-xs">Alasan penolakan</Label>
                        <Textarea
                          id="reject-reason"
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Foto buram / KTP tidak terbaca / bukan KTP..."
                          rows={3}
                          className="text-sm"
                        />
                        <Button size="sm" variant="destructive" className="w-full justify-start gap-2" onClick={() => reject(selected)} disabled={busy}>
                          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                          Tolak KYC
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {selected.kyc_status === "approved" && (
                  <Card className="flex items-center gap-3 border-green-200 bg-green-50 p-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800">KYC Disetujui</p>
                      <p className="text-xs text-green-600">{fmtDate(selected.kyc_reviewed_at)}</p>
                    </div>
                  </Card>
                )}

                {selected.kyc_status === "rejected" && (
                  <div className="space-y-3">
                    <Card className="flex items-start gap-3 border-red-200 bg-red-50 p-3">
                      <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-red-800">KYC Ditolak</p>
                        <p className="text-xs text-red-600 mt-0.5">{selected.kyc_reject_reason ?? "—"}</p>
                        <p className="text-xs text-muted-foreground mt-1">{fmtDate(selected.kyc_reviewed_at)}</p>
                      </div>
                    </Card>
                    <Button size="sm" className="w-full justify-start gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => approve(selected)} disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Override: Setujui Sekarang
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
