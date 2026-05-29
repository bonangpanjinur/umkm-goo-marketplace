/**
 * F2-1: Email Marketing — menggunakan tabel marketing_campaigns + campaign_recipients.
 * (Sebelumnya pakai email_campaigns — sudah dimigrasikan)
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Send, Users, BarChart2, Plus, Calendar, CheckCircle2, Clock, Loader2, Trash2 } from "lucide-react";
import { useShop } from "@/lib/use-shop";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pos-app/email-marketing")({
  head: () => ({ meta: [{ title: "Email Marketing — Merchant" }] }), component: EmailMarketingPage });

type Campaign = {
  id: string;
  subject: string;
  name: string | null;
  status: "draft" | "sent" | "scheduled" | "sending" | "failed";
  recipient_count: number | null;
  sent_at: string | null;
  scheduled_at: string | null;
  segment: string | null;
};

const TEMPLATES = [
  { id: "promo", label: "Promo / Diskon", subject: "🎉 Promo Spesial: [Nama Promo]", body: "Halo {nama_pelanggan},\n\nKami punya kabar gembira! Dapatkan diskon [X]% untuk semua menu hingga [tanggal].\n\nGunakan kode: [KODE_PROMO]\n\nBelanja sekarang: [link_toko]\n\nSalam,\n[Nama Toko]" },
  { id: "newmenu", label: "Menu Baru", subject: "🍽️ Menu Baru Sudah Tersedia!", body: "Halo {nama_pelanggan},\n\nKami dengan bangga memperkenalkan menu baru kami: [nama_menu].\n\nTersedia mulai [tanggal]. Coba sekarang di [link_toko].\n\nSalam,\n[Nama Toko]" },
  { id: "loyalty", label: "Program Loyalty", subject: "⭐ Kamu punya [X] poin! Tukarkan sekarang", body: "Halo {nama_pelanggan},\n\nKamu memiliki [X] poin loyalty yang siap ditukarkan menjadi diskon [Y]%.\n\nPoin berlaku hingga [tanggal]. Jangan sampai hangus!\n\n[link_toko]\n\nSalam,\n[Nama Toko]" },
];

const SEGMENTS = [
  { id: "all",      label: "Semua Pelanggan" },
  { id: "loyal",    label: "Pelanggan Loyal (3+ order)" },
  { id: "new",      label: "Pelanggan Baru (30 hari)" },
  { id: "inactive", label: "Tidak Aktif (60+ hari)" },
];

export default function EmailMarketingPage() {
  const { shop } = useShop();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<"list" | "compose">("list");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState("all");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    if (!shop?.id) return;
    const { data, error } = await supabase
      .from("marketing_campaigns" as any)
      .select("id, name, subject, status, recipient_count, sent_at, scheduled_at, segment")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) { toast.error(error.message); setLoaded(true); return; }
    setCampaigns((data ?? []) as Campaign[]);
    setLoaded(true);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [shop?.id]);

  function applyTemplate(id: string) {
    const t = TEMPLATES.find(x => x.id === id);
    if (t) { setSubject(t.subject); setBody(t.body); }
  }

  async function saveCampaign(asDraft: boolean) {
    if (!shop?.id) { toast.error("Toko belum siap"); return; }
    if (!subject.trim() || !body.trim()) { toast.error("Subject dan isi email wajib diisi"); return; }
    setSending(true);
    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">${body.replace(/\n/g, "<br/>")}</div>`;
    const { error } = await (supabase as any).from("marketing_campaigns").insert({
      shop_id: shop.id,
      name: previewText.trim() || subject.trim().slice(0, 80),
      subject: subject.trim(),
      body_html: html,
      body_text: body.trim(),
      segment,
      status: asDraft ? "draft" : "scheduled",
      scheduled_at: asDraft ? null : new Date().toISOString(),
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setSubject(""); setPreviewText(""); setBody("");
    setTab("list");
    toast.success(asDraft ? "Draft tersimpan" : "Campaign dijadwalkan untuk dikirim");
    load();
  }

  async function deleteCampaign(id: string) {
    setDeleting(id);
    const { error } = await (supabase as any)
      .from("marketing_campaigns")
      .delete()
      .eq("id", id)
      .eq("shop_id", shop?.id ?? "");
    setDeleting(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Campaign dihapus");
    setCampaigns(c => c.filter(x => x.id !== id));
  }

  const sentCampaigns = campaigns.filter(c => c.status === "sent");
  const totalRecipients = sentCampaigns.reduce((s, c) => s + (c.recipient_count ?? 0), 0);

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Email Marketing
            <Badge className="text-xs bg-purple-600 hover:bg-purple-600">Pro</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">Kirim promo ke daftar pelanggan toko</p>
        </div>
        <Button size="sm" onClick={() => setTab(tab === "compose" ? "list" : "compose")}>
          {tab === "compose" ? "← Kembali" : <><Plus className="h-4 w-4 mr-1.5" /> Buat Campaign</>}
        </Button>
      </div>

      {tab === "list" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-4"><p className="text-xs text-muted-foreground">Total Terkirim</p><p className="text-2xl font-bold">{totalRecipients.toLocaleString("id-ID")}</p></Card>
            <Card className="p-4"><p className="text-xs text-muted-foreground">Campaign Terkirim</p><p className="text-2xl font-bold">{sentCampaigns.length}</p></Card>
            <Card className="p-4"><p className="text-xs text-muted-foreground">Total Campaign</p><p className="text-2xl font-bold">{campaigns.length}</p></Card>
          </div>
          {!loaded ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : campaigns.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              Belum ada campaign. Klik <strong>Buat Campaign</strong> untuk mulai.
            </Card>
          ) : (
            <div className="space-y-3">
              {campaigns.map(c => (
                <Card key={c.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {c.status === "sent"      && <Badge className="text-xs bg-green-600 hover:bg-green-600 h-5"><CheckCircle2 className="h-3 w-3 mr-1" />Terkirim</Badge>}
                        {c.status === "draft"     && <Badge variant="secondary" className="text-xs h-5">Draft</Badge>}
                        {c.status === "scheduled" && <Badge className="text-xs bg-blue-600 hover:bg-blue-600 h-5"><Clock className="h-3 w-3 mr-1" />Terjadwal</Badge>}
                        {c.status === "sending"   && <Badge className="text-xs bg-amber-600 hover:bg-amber-600 h-5"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Mengirim</Badge>}
                        {c.status === "failed"    && <Badge variant="destructive" className="text-xs h-5">Gagal</Badge>}
                      </div>
                      <p className="font-medium truncate">{c.subject}</p>
                      {c.name && <p className="text-xs text-muted-foreground truncate">{c.name}</p>}
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        {c.recipient_count != null && c.recipient_count > 0 && (
                          <span><Users className="h-3 w-3 inline mr-1" />{c.recipient_count} penerima</span>
                        )}
                        {c.sent_at && <span><Calendar className="h-3 w-3 inline mr-1" />{new Date(c.sent_at).toLocaleDateString("id-ID")}</span>}
                        {c.scheduled_at && !c.sent_at && <span><Calendar className="h-3 w-3 inline mr-1" />Jadwal: {new Date(c.scheduled_at).toLocaleString("id-ID")}</span>}
                        {c.segment && <span>Segmen: {SEGMENTS.find(s => s.id === c.segment)?.label ?? c.segment}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <BarChart2 className="h-4 w-4 text-muted-foreground" />
                      {(c.status === "draft" || c.status === "scheduled") && (
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => deleteCampaign(c.id)}
                          disabled={deleting === c.id}
                        >
                          {deleting === c.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div>
              <Label>Template Cepat</Label>
              <div className="flex gap-2 mt-1.5 flex-wrap">
                {TEMPLATES.map(t => (
                  <Button key={t.id} variant="outline" size="sm" className="text-xs" onClick={() => applyTemplate(t.id)}>
                    {t.label}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <Label>Subject Email *</Label>
              <Input className="mt-1" value={subject} onChange={e => setSubject(e.target.value)} placeholder="cth: Promo Spesial Hari Ini!" />
            </div>
            <div>
              <Label>Nama Internal <span className="text-muted-foreground text-xs">(opsional)</span></Label>
              <Input className="mt-1" value={previewText} onChange={e => setPreviewText(e.target.value)} placeholder="Untuk pencarian internal..." />
            </div>
            <div>
              <Label>Isi Email *</Label>
              <p className="text-xs text-muted-foreground mb-1">Gunakan: {"{nama_pelanggan}"} untuk personalisasi</p>
              <Textarea className="mt-1 min-h-[200px] font-mono text-sm" value={body} onChange={e => setBody(e.target.value)} placeholder="Tulis isi email di sini..." />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => saveCampaign(true)} disabled={sending}>
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Draft"}
              </Button>
              <Button className="flex-1" onClick={() => saveCampaign(false)} disabled={sending}>
                {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Memproses...</> : <><Send className="h-4 w-4 mr-2" /> Jadwalkan</>}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Campaign akan diproses oleh worker pengiriman email (aktif setelah RESEND_API_KEY dikonfigurasi di server).
            </p>
          </div>
          <div className="space-y-3">
            <div>
              <Label>Segmen Penerima</Label>
              <div className="mt-2 space-y-2">
                {SEGMENTS.map(s => (
                  <label key={s.id} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${segment === s.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="segment" checked={segment === s.id} onChange={() => setSegment(s.id)} className="accent-primary" />
                      <span className="text-sm">{s.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <Card className="p-3 bg-muted/40">
              <p className="text-xs font-medium mb-1">Variabel Tersedia</p>
              {["{nama_pelanggan}", "{nama_toko}", "{link_toko}", "{tanggal}"].map(v => (
                <code key={v} className="block text-[11px] text-muted-foreground font-mono py-0.5">{v}</code>
              ))}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
