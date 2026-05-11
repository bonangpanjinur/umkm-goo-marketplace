import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Mail, Send, Users, BarChart2, Plus, Eye, Calendar, CheckCircle2, Clock } from "lucide-react";

export const Route = createFileRoute("/pos-app/email-marketing")({ component: EmailMarketingPage });

type Campaign = {
  id: string;
  subject: string;
  preview_text: string;
  status: "draft" | "sent" | "scheduled";
  recipient_count: number;
  open_rate: number;
  sent_at: string | null;
  scheduled_at: string | null;
};

const DEMO_CAMPAIGNS: Campaign[] = [
  { id: "1", subject: "Promo Akhir Bulan — Diskon 20%!", preview_text: "Jangan lewatkan promo spesial kami...", status: "sent", recipient_count: 234, open_rate: 42, sent_at: "2026-05-01", scheduled_at: null },
  { id: "2", subject: "Menu Baru Sudah Hadir!", preview_text: "Kami punya menu baru yang lezat...", status: "sent", recipient_count: 198, open_rate: 38, sent_at: "2026-04-15", scheduled_at: null },
  { id: "3", subject: "Promo Hari Kemerdekaan", preview_text: "Rayakan hari kemerdekaan dengan...", status: "scheduled", recipient_count: 0, open_rate: 0, sent_at: null, scheduled_at: "2026-08-17" },
];

const TEMPLATES = [
  { id: "promo", label: "Promo / Diskon", subject: "🎉 Promo Spesial: [Nama Promo]", body: "Halo {nama_pelanggan},\n\nKami punya kabar gembira! Dapatkan diskon [X]% untuk semua menu hingga [tanggal].\n\nGunakan kode: [KODE_PROMO]\n\nBelanja sekarang: [link_toko]\n\nSalam,\n[Nama Toko]" },
  { id: "newmenu", label: "Menu Baru", subject: "🍽️ Menu Baru Sudah Tersedia!", body: "Halo {nama_pelanggan},\n\nKami dengan bangga memperkenalkan menu baru kami: [nama_menu].\n\nTersedia mulai [tanggal]. Coba sekarang di [link_toko].\n\nSalam,\n[Nama Toko]" },
  { id: "loyalty", label: "Program Loyalty", subject: "⭐ Kamu punya [X] poin! Tukarkan sekarang", body: "Halo {nama_pelanggan},\n\nKamu memiliki [X] poin loyalty yang siap ditukarkan menjadi diskon [Y]%.\n\nPoin berlaku hingga [tanggal]. Jangan sampai hangus!\n\n[link_toko]\n\nSalam,\n[Nama Toko]" },
];

export default function EmailMarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(DEMO_CAMPAIGNS);
  const [tab, setTab] = useState<"list" | "compose">("list");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [body, setBody] = useState("");
  const [segment, setSegment] = useState("all");
  const [sending, setSending] = useState(false);

  function applyTemplate(id: string) {
    const t = TEMPLATES.find(x => x.id === id);
    if (t) { setSubject(t.subject); setBody(t.body); }
  }

  async function sendCampaign() {
    if (!subject.trim() || !body.trim()) { toast.error("Subject dan isi email wajib diisi"); return; }
    setSending(true);
    await new Promise(r => setTimeout(r, 1200));
    const newCampaign: Campaign = {
      id: String(Date.now()),
      subject: subject.trim(),
      preview_text: previewText.trim(),
      status: "sent",
      recipient_count: segment === "all" ? 312 : segment === "loyal" ? 89 : 45,
      open_rate: 0,
      sent_at: new Date().toISOString().split("T")[0],
      scheduled_at: null,
    };
    setCampaigns(c => [newCampaign, ...c]);
    setSubject(""); setPreviewText(""); setBody("");
    setSending(false);
    setTab("list");
    toast.success("Email marketing berhasil dikirim!");
  }

  const totalRecipients = campaigns.filter(c => c.status === "sent").reduce((s, c) => s + c.recipient_count, 0);
  const avgOpenRate = campaigns.filter(c => c.status === "sent" && c.open_rate > 0).reduce((s, c, _, a) => s + c.open_rate / a.length, 0);

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
            <Card className="p-4"><p className="text-xs text-muted-foreground">Avg. Open Rate</p><p className="text-2xl font-bold">{avgOpenRate.toFixed(0)}%</p></Card>
            <Card className="p-4"><p className="text-xs text-muted-foreground">Campaign</p><p className="text-2xl font-bold">{campaigns.length}</p></Card>
          </div>
          <div className="space-y-3">
            {campaigns.map(c => (
              <Card key={c.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {c.status === "sent" && <Badge className="text-xs bg-green-600 hover:bg-green-600 h-5"><CheckCircle2 className="h-3 w-3 mr-1" />Terkirim</Badge>}
                      {c.status === "draft" && <Badge variant="secondary" className="text-xs h-5">Draft</Badge>}
                      {c.status === "scheduled" && <Badge className="text-xs bg-blue-600 hover:bg-blue-600 h-5"><Clock className="h-3 w-3 mr-1" />Terjadwal</Badge>}
                    </div>
                    <p className="font-medium truncate">{c.subject}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      {c.status === "sent" && <><span><Users className="h-3 w-3 inline mr-1" />{c.recipient_count} penerima</span><span><Eye className="h-3 w-3 inline mr-1" />{c.open_rate}% dibuka</span></>}
                      {c.sent_at && <span><Calendar className="h-3 w-3 inline mr-1" />{c.sent_at}</span>}
                      {c.scheduled_at && <span><Calendar className="h-3 w-3 inline mr-1" />Jadwal: {c.scheduled_at}</span>}
                    </div>
                  </div>
                  <BarChart2 className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                </div>
              </Card>
            ))}
          </div>
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
              <Label>Preview Text <span className="text-muted-foreground text-xs">(opsional)</span></Label>
              <Input className="mt-1" value={previewText} onChange={e => setPreviewText(e.target.value)} placeholder="Teks singkat yang muncul di daftar email..." />
            </div>
            <div>
              <Label>Isi Email *</Label>
              <p className="text-xs text-muted-foreground mb-1">Gunakan: {"{nama_pelanggan}"} untuk personalisasi</p>
              <Textarea className="mt-1 min-h-[200px] font-mono text-sm" value={body} onChange={e => setBody(e.target.value)} placeholder="Tulis isi email di sini..." />
            </div>
            <Button className="w-full" onClick={sendCampaign} disabled={sending}>
              {sending ? "Mengirim..." : <><Send className="h-4 w-4 mr-2" /> Kirim Campaign</>}
            </Button>
          </div>
          <div className="space-y-3">
            <div>
              <Label>Segmen Penerima</Label>
              <div className="mt-2 space-y-2">
                {[
                  { id: "all",    label: "Semua Pelanggan", count: 312 },
                  { id: "loyal",  label: "Pelanggan Loyal (3+ order)", count: 89 },
                  { id: "new",    label: "Pelanggan Baru (30 hari)", count: 45 },
                  { id: "inactive", label: "Tidak Aktif (60+ hari)", count: 78 },
                ].map(s => (
                  <label key={s.id} className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${segment === s.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                    <div className="flex items-center gap-2">
                      <input type="radio" name="segment" checked={segment === s.id} onChange={() => setSegment(s.id)} className="accent-primary" />
                      <span className="text-sm">{s.label}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">{s.count}</Badge>
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
