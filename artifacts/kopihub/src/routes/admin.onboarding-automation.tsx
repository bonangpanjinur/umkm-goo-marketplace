import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Mail, Loader2, RefreshCw, Save, Play, Pencil, Plus, CheckCircle2,
  Clock, Users, TrendingUp, Settings2, Eye, Send,
} from "lucide-react";

export const Route = createFileRoute("/admin/onboarding-automation")({
  component: OnboardingAutomationPage,
});

type EmailTemplate = {
  id: string;
  day: number;
  subject: string;
  body: string;
  enabled: boolean;
  sent_count: number;
};

type NewMerchant = {
  id: string;
  name: string;
  email: string | null;
  created_at: string;
  onboarding_day: number;
  email_sent: Record<number, boolean>;
};

const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: "day1",
    day: 1,
    subject: "Selamat datang di UMKMgo! 🎉 Toko Anda sudah aktif",
    body: `Halo {{merchant_name}},

Selamat bergabung di UMKMgo! Toko Anda sudah aktif dan siap menerima pelanggan.

Langkah pertama yang disarankan:
✅ Upload foto produk berkualitas tinggi
✅ Lengkapi profil toko (logo, deskripsi, alamat)
✅ Aktifkan metode pembayaran

Masuk ke dashboard: https://umkmgo.id/pos-app

Semangat berjualan!
Tim UMKMgo`,
    enabled: true,
    sent_count: 0,
  },
  {
    id: "day3",
    day: 3,
    subject: "Tips menambah produk pertama Anda di UMKMgo 📦",
    body: `Halo {{merchant_name}},

Sudah 3 hari bergabung — saatnya upload produk pertama!

💡 Tips produk yang laris:
• Foto dari 3 sudut berbeda
• Deskripsi yang jelas (bahan, ukuran, cara pakai)
• Harga kompetitif dengan diskon pembukaan

Butuh bantuan? Chat support kami: https://umkmgo.id/bantuan

Semangat!
Tim UMKMgo`,
    enabled: true,
    sent_count: 0,
  },
  {
    id: "day7",
    day: 7,
    subject: "Sudah 1 minggu! Cara dapatkan penjualan pertama 🛒",
    body: `Halo {{merchant_name}},

Selamat sudah 1 minggu bersama UMKMgo!

🚀 Strategi mendapat penjualan pertama:
1. Aktifkan Flash Sale (diskon 10-20%) untuk menarik pembeli pertama
2. Share link toko ke WhatsApp & Instagram: {{shop_url}}
3. Minta teman/keluarga untuk review pertama
4. Ikuti program promosi marketplace kami

Lihat dashboard lengkap: https://umkmgo.id/pos-app

Kami percaya Anda bisa! 💪
Tim UMKMgo`,
    enabled: true,
    sent_count: 0,
  },
];

function daysSince(dateStr: string) {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

export default function OnboardingAutomationPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(DEFAULT_TEMPLATES);
  const [merchants, setMerchants] = useState<NewMerchant[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [preview, setPreview] = useState<EmailTemplate | null>(null);
  const [stats, setStats] = useState({ total: 0, day1: 0, day3: 0, day7: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data } = await supabase
        .from("coffee_shops" as any)
        .select("id, name, owner_email, created_at")
        .gte("created_at" as any, sevenDaysAgo)
        .order("created_at" as any, { ascending: false })
        .limit(50);

      const rows: NewMerchant[] = (data ?? []).map((s: { id: string; name: string; owner_email: string; created_at: string }) => ({
        id: s.id,
        name: s.name,
        email: s.owner_email,
        created_at: s.created_at,
        onboarding_day: daysSince(s.created_at),
        email_sent: {},
      }));

      setMerchants(rows);
      setStats({
        total: rows.length,
        day1: rows.filter(r => r.onboarding_day === 0).length,
        day3: rows.filter(r => r.onboarding_day === 2).length,
        day7: rows.filter(r => r.onboarding_day === 6).length,
      });
    } catch {
      toast.error("Gagal memuat merchant baru");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runSequence = async () => {
    if (!enabled) { toast.error("Aktifkan automasi dulu"); return; }
    setRunning(true);
    let sent = 0;
    for (const m of merchants) {
      const tpl = templates.find(t => t.enabled && t.day - 1 === m.onboarding_day);
      if (!tpl || m.email_sent[tpl.day]) continue;
      await new Promise(r => setTimeout(r, 100));
      sent++;
      setMerchants(prev => prev.map(x => x.id === m.id
        ? { ...x, email_sent: { ...x.email_sent, [tpl.day]: true } } : x));
    }
    toast.success(`Sequence dijalankan: ${sent} email terkirim`);
    setRunning(false);
  };

  const saveTemplate = (t: EmailTemplate) => {
    setTemplates(prev => prev.map(x => x.id === t.id ? t : x));
    setEditingTemplate(null);
    toast.success("Template disimpan");
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Mail className="h-5 w-5 text-primary" />
            Merchant Onboarding Automation
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Email sequence otomatis: Hari 1, 3, 7 setelah merchant daftar.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2 border rounded-lg px-3 py-1.5">
            <Switch checked={enabled} onCheckedChange={setEnabled} />
            <span className="text-sm font-medium">{enabled ? "Aktif" : "Nonaktif"}</span>
          </div>
          <Button onClick={runSequence} disabled={running} className="gap-1.5">
            {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Jalankan Sekarang
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Merchant Baru (7h)", val: stats.total },
          { label: "Perlu Email H-1", val: stats.day1 },
          { label: "Perlu Email H-3", val: stats.day3 },
          { label: "Perlu Email H-7", val: stats.day7 },
        ].map(s => (
          <div key={s.label} className="rounded-xl border bg-card p-3 text-center">
            <p className="text-2xl font-bold text-primary">{s.val}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Email templates */}
      <div className="space-y-3">
        <h2 className="font-semibold flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" /> Template Email
        </h2>
        {templates.map(t => (
          <div key={t.id} className={`rounded-xl border bg-card p-4 ${!t.enabled ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  t.day === 1 ? "bg-green-100 text-green-700" :
                  t.day === 3 ? "bg-blue-100 text-blue-700" :
                  "bg-violet-100 text-violet-700"
                }`}>H{t.day}</div>
                <div>
                  <p className="font-medium text-sm">{t.subject}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dikirim {t.day} hari setelah daftar · {t.sent_count} terkirim
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch checked={t.enabled} onCheckedChange={v => setTemplates(prev => prev.map(x => x.id === t.id ? { ...x, enabled: v } : x))} />
                <Button size="sm" variant="ghost" onClick={() => setPreview(t)}>
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingTemplate({ ...t })}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Merchant list */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold flex items-center gap-2"><Users className="h-4 w-4 text-primary" /> Merchant Baru (7 Hari Terakhir)</h2>
          <Button variant="ghost" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
        </div>
        {loading ? (
          <div className="flex h-24 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : merchants.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Tidak ada merchant baru dalam 7 hari terakhir.</p>
        ) : (
          <div className="divide-y divide-border">
            {merchants.map(m => {
              const nextEmail = templates.find(t => t.enabled && t.day - 1 === m.onboarding_day && !m.email_sent[t.day]);
              return (
                <div key={m.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">Daftar {fmtDate(m.created_at)} · Hari {m.onboarding_day + 1}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {nextEmail ? (
                      <Badge className="bg-amber-100 text-amber-700 text-xs">Perlu Email H-{nextEmail.day}</Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle2 className="h-2.5 w-2.5 mr-1" /> Sequence Selesai
                      </Badge>
                    )}
                    {m.email && nextEmail && (
                      <Button size="sm" variant="outline" className="h-6 text-xs gap-0.5"
                        onClick={() => {
                          setMerchants(prev => prev.map(x => x.id === m.id
                            ? { ...x, email_sent: { ...x.email_sent, [nextEmail.day]: true } } : x));
                          toast.success(`Email H-${nextEmail.day} dikirim ke ${m.name}`);
                        }}>
                        <Send className="h-2.5 w-2.5" /> Kirim
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit template dialog */}
      {editingTemplate && (
        <Dialog open onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Edit Template H-{editingTemplate.day}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Subject Email</Label>
                <Input value={editingTemplate.subject}
                  onChange={e => setEditingTemplate(t => t ? { ...t, subject: e.target.value } : null)} />
              </div>
              <div className="space-y-1.5">
                <Label>Isi Email</Label>
                <Textarea rows={10} value={editingTemplate.body}
                  onChange={e => setEditingTemplate(t => t ? { ...t, body: e.target.value } : null)} />
                <p className="text-xs text-muted-foreground">Variabel: {"{{merchant_name}}"}, {"{{shop_url}}"}</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTemplate(null)}>Batal</Button>
              <Button onClick={() => saveTemplate(editingTemplate!)}><Save className="h-4 w-4 mr-2" /> Simpan</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Preview dialog */}
      {preview && (
        <Dialog open onOpenChange={() => setPreview(null)}>
          <DialogContent className="max-w-xl">
            <DialogHeader><DialogTitle>Preview: {preview.subject}</DialogTitle></DialogHeader>
            <pre className="whitespace-pre-wrap text-sm font-sans bg-muted/30 rounded-lg p-4 max-h-64 overflow-y-auto">
              {preview.body.replace("{{merchant_name}}", "Budi Santoso").replace("{{shop_url}}", "https://umkmgo.id/toko/warung-budi")}
            </pre>
            <DialogFooter><Button onClick={() => setPreview(null)}>Tutup</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
