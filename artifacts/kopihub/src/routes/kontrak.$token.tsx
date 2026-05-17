import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import { ScrollText, Loader2, CheckCircle2, ShieldCheck } from "lucide-react";
import { SignaturePad, type SignaturePadHandle } from "@/components/SignaturePad";

export const Route = createFileRoute("/kontrak/$token")({
  head: () => ({ meta: [{ title: "Tanda Tangan Kontrak" }] }),
  component: SignContractPage,
});

type Contract = {
  id: string;
  shop_id: string;
  client_name: string;
  project_name: string;
  project_description: string;
  total_value: number;
  start_date: string;
  end_date: string;
  deliverables: string;
  revision_count: number;
  payment_terms: string;
  status: string;
  signed_at: string | null;
  signature_url: string | null;
  signed_by_name: string | null;
  sign_token: string;
};

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function SignContractPage() {
  const { token } = Route.useParams();
  const [contract, setContract] = useState<Contract | null>(null);
  const [shopName, setShopName] = useState("");
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const padRef = useRef<SignaturePadHandle>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("freelance_contracts")
        .select("*")
        .eq("sign_token", token)
        .maybeSingle();
      if (error || !data) {
        toast.error("Kontrak tidak ditemukan");
        setLoading(false);
        return;
      }
      setContract(data as Contract);
      setName(data.signed_by_name ?? data.client_name ?? "");
      const { data: shop } = await supabase.from("shops").select("name").eq("id", data.shop_id).maybeSingle();
      setShopName(shop?.name ?? "");
      setLoading(false);
    })();
  }, [token]);

  const submit = async () => {
    if (!contract) return;
    if (!agreed) { toast.error("Centang persetujuan dulu"); return; }
    if (!name.trim()) { toast.error("Nama lengkap wajib diisi"); return; }
    if (padRef.current?.isEmpty()) { toast.error("Tanda tangan masih kosong"); return; }
    setSubmitting(true);
    try {
      const blob = await padRef.current!.toBlob();
      if (!blob) throw new Error("Gagal menyiapkan tanda tangan");
      const path = `${contract.id}/${Date.now()}.png`;
      const { error: upErr } = await supabase.storage
        .from("contract-signatures")
        .upload(path, blob, { contentType: "image/png", upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("contract-signatures").getPublicUrl(path);
      const { error: updErr } = await (supabase as any)
        .from("freelance_contracts")
        .update({
          status: "signed",
          signed_at: new Date().toISOString(),
          signature_url: pub.publicUrl,
          signed_by_name: name.trim(),
        })
        .eq("sign_token", token);
      if (updErr) throw updErr;
      toast.success("Kontrak berhasil ditandatangani");
      setContract({ ...contract, status: "signed", signed_at: new Date().toISOString(), signature_url: pub.publicUrl, signed_by_name: name.trim() });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menandatangani");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="grid min-h-screen place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!contract) {
    return <div className="grid min-h-screen place-items-center p-6 text-muted-foreground">Kontrak tidak ditemukan atau tautan tidak valid.</div>;
  }

  const isSigned = contract.status === "signed" || !!contract.signature_url;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 py-8 sm:p-6">
      <div className="rounded-2xl border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-bold">Kontrak Kerja</h1>
          {isSigned && (
            <Badge className="ml-auto gap-1 bg-green-100 text-green-700">
              <CheckCircle2 className="h-3 w-3" /> Sudah ditandatangani
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{shopName} &middot; {contract.project_name}</p>
      </div>

      <div className="space-y-4 rounded-2xl border bg-card p-5 text-sm shadow-sm">
        <Row label="Pihak Pertama" value={shopName} />
        <Row label="Pihak Kedua (Klien)" value={contract.client_name} />
        <Row label="Proyek" value={contract.project_name} />
        <Row label="Deskripsi" value={contract.project_description} multiline />
        <Row label="Deliverables" value={contract.deliverables} multiline />
        <Row label="Revisi" value={`${contract.revision_count}x revisi termasuk`} />
        <Row label="Timeline" value={`${fmtDate(contract.start_date)} – ${fmtDate(contract.end_date)}`} />
        <Row label="Nilai Kontrak" value={<span className="font-bold text-primary">{formatIDR(contract.total_value)}</span>} />
        <Row label="Syarat Pembayaran" value={contract.payment_terms} multiline />
        <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          Dengan menandatangani di bawah, Anda menyatakan setuju dengan seluruh ketentuan kontrak ini secara digital dan mengikat secara hukum.
        </div>
      </div>

      {isSigned ? (
        <div className="space-y-3 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-700">
            <ShieldCheck className="h-4 w-4" /> Tanda tangan tercatat
          </div>
          <div className="rounded-lg border bg-white p-3">
            {contract.signature_url && (
              <img src={contract.signature_url} alt="Tanda tangan" className="mx-auto max-h-40" />
            )}
            <div className="mt-2 border-t pt-2 text-center text-xs text-muted-foreground">
              {contract.signed_by_name} &middot; {contract.signed_at ? new Date(contract.signed_at).toLocaleString("id-ID") : ""}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm">
          <div>
            <Label htmlFor="signer-name">Nama Lengkap Penandatangan</Label>
            <Input id="signer-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama sesuai identitas" className="mt-1" />
          </div>
          <div>
            <Label>Tanda Tangan</Label>
            <SignaturePad ref={padRef} className="mt-1" />
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-1" />
            <span>Saya membaca, memahami, dan menyetujui seluruh isi kontrak di atas.</span>
          </label>
          <Button onClick={submit} disabled={submitting} className="w-full gap-2">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            <CheckCircle2 className="h-4 w-4" /> Tanda Tangan & Setujui Kontrak
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, multiline }: { label: string; value: React.ReactNode; multiline?: boolean }) {
  return (
    <div className={multiline ? "" : "flex justify-between gap-4"}>
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className={multiline ? "mt-1 whitespace-pre-wrap text-sm" : "text-sm text-right"}>{value}</div>
    </div>
  );
}
