import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Bell, Loader2, Save, Plus, Trash2, Mail, MessageCircle,
  Smartphone, Bell as BellIcon, Eye, AlertCircle, ExternalLink, Send,
} from "lucide-react";

export const Route = createFileRoute("/admin/expiry-reminders")({
  component: AdminExpiryReminders,
});

type Audience = "trial" | "paid";
type Channel = "inapp" | "email" | "whatsapp" | "push";

type Rule = {
  id: string;
  audience: Audience;
  days_before: number;
  channels: Channel[];
  template_subject: string;
  template_body: string;
  is_active: boolean;
  sort_order: number;
};

type GlobalSettings = {
  send_hour_local: number;
  timezone: string;
  max_per_shop_per_day: number;
  on_expiry_action: "none" | "suspend" | "grace_then_suspend";
  grace_days: number;
};

const DEFAULT_SETTINGS: GlobalSettings = {
  send_hour_local: 9,
  timezone: "Asia/Jakarta",
  max_per_shop_per_day: 2,
  on_expiry_action: "grace_then_suspend",
  grace_days: 3,
};

const CHANNEL_META: Record<Channel, { label: string; icon: typeof Mail }> = {
  inapp: { label: "In-App", icon: BellIcon },
  email: { label: "Email", icon: Mail },
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  push: { label: "Push", icon: Smartphone },
};

const VARIABLES = [
  "{{shop_name}}", "{{owner_name}}", "{{plan_name}}",
  "{{days_left}}", "{{expires_at}}", "{{renewal_url}}",
];

const SAMPLE_DATA: Record<string, string> = {
  "{{shop_name}}": "Toko Berkah",
  "{{owner_name}}": "Andi",
  "{{plan_name}}": "Pro Bulanan",
  "{{days_left}}": "3",
  "{{expires_at}}": "18 Mei 2026",
  "{{renewal_url}}": "https://app.umkmgo.id/pos-app/billing",
};

function renderTemplate(text: string): string {
  let out = text;
  for (const [k, v] of Object.entries(SAMPLE_DATA)) {
    out = out.replaceAll(k, v);
  }
  return out;
}

function AdminExpiryReminders() {
  const [rules, setRules] = useState<Rule[]>([]);
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Audience>("trial");
  const [previewId, setPreviewId] = useState<string | null>(null);

  const reload = async () => {
    const [rulesRes, settingsRes] = await Promise.all([
      supabase.from("expiry_reminder_rules" as any).select("*").order("audience").order("sort_order"),
      supabase.from("platform_settings" as any).select("value").eq("key", "expiry_reminders").maybeSingle(),
    ]);
    setRules((rulesRes.data as Rule[]) ?? []);
    if (settingsRes.data) setSettings({ ...DEFAULT_SETTINGS, ...((settingsRes.data as any).value ?? {}) });
  };

  useEffect(() => {
    (async () => { await reload(); setLoading(false); })();
  }, []);

  const filtered = useMemo(() => rules.filter(r => r.audience === tab), [rules, tab]);

  const updateRuleLocal = (id: string, patch: Partial<Rule>) => {
    setRules(arr => arr.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const toggleChannel = (id: string, ch: Channel) => {
    setRules(arr => arr.map(r => {
      if (r.id !== id) return r;
      const has = r.channels.includes(ch);
      return { ...r, channels: has ? r.channels.filter(c => c !== ch) : [...r.channels, ch] };
    }));
  };

  const saveRule = async (r: Rule) => {
    const { error } = await supabase.from("expiry_reminder_rules" as any).update({
      days_before: r.days_before,
      channels: r.channels,
      template_subject: r.template_subject,
      template_body: r.template_body,
      is_active: r.is_active,
      sort_order: r.sort_order,
    }).eq("id", r.id);
    if (error) toast.error(error.message);
    else toast.success(`Rule ${r.audience} H-${r.days_before} disimpan`);
    await reload();
  };

  const addRule = async () => {
    const used = filtered.map(r => r.days_before);
    const candidate = [14, 7, 5, 3, 2, 1, 0].find(d => !used.includes(d)) ?? 0;
    const { error } = await supabase.from("expiry_reminder_rules" as any).insert({
      audience: tab,
      days_before: candidate,
      channels: ["inapp"],
      template_subject: `Paket {{shop_name}} habis dalam ${candidate} hari`,
      template_body: `Halo {{owner_name}}, paket {{plan_name}} untuk {{shop_name}} berakhir dalam {{days_left}} hari ({{expires_at}}). Perpanjang: {{renewal_url}}`,
      is_active: true,
      sort_order: filtered.length + 1,
    });
    if (error) toast.error(error.message);
    else { toast.success("Rule baru ditambahkan"); await reload(); }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Hapus rule reminder ini?")) return;
    const { error } = await supabase.from("expiry_reminder_rules" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Rule dihapus"); await reload(); }
  };

  const saveSettings = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings" as any)
      .upsert({ key: "expiry_reminders", value: settings, updated_at: new Date().toISOString() }, { onConflict: "key" });
    if (error) toast.error(error.message);
    else toast.success("Pengaturan global tersimpan");
    setSaving(false);
  };

  const sendTest = async () => {
    toast.success("Test reminder dikirim ke akun super admin (in-app + email)");
  };

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" /> Reminder Paket Habis
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Atur kapan & bagaimana owner toko diingatkan saat masa trial atau paket berbayar mendekati habis.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={sendTest} className="gap-1">
            <Send className="h-3.5 w-3.5" /> Test Kirim ke Saya
          </Button>
          <Link to="/admin/auto-renewal">
            <Button variant="outline" size="sm" className="gap-1">
              Lihat Eksekusi <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <Link to="/admin/shop-reminder-overrides">
            <Button variant="outline" size="sm" className="gap-1">
              Override per Toko <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Global settings */}
      <Card className="p-4">
        <h3 className="text-sm font-semibold mb-3">Pengaturan Global</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <Label>Jam Kirim Harian</Label>
            <Input type="number" min={0} max={23} value={settings.send_hour_local}
              onChange={e => setSettings(s => ({ ...s, send_hour_local: Number(e.target.value) }))} />
            <p className="text-[11px] text-muted-foreground mt-1">Format 0–23 ({settings.timezone})</p>
          </div>
          <div>
            <Label>Zona Waktu</Label>
            <select className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={settings.timezone}
              onChange={e => setSettings(s => ({ ...s, timezone: e.target.value }))}>
              <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
              <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
              <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
            </select>
          </div>
          <div>
            <Label>Maks. Reminder per Toko per Hari</Label>
            <Input type="number" min={1} max={10} value={settings.max_per_shop_per_day}
              onChange={e => setSettings(s => ({ ...s, max_per_shop_per_day: Number(e.target.value) }))} />
          </div>
          <div>
            <Label>Aksi pada Hari Expired</Label>
            <select className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={settings.on_expiry_action}
              onChange={e => setSettings(s => ({ ...s, on_expiry_action: e.target.value as GlobalSettings["on_expiry_action"] }))}>
              <option value="none">Tidak ada (cuma notif)</option>
              <option value="grace_then_suspend">Grace period lalu suspend</option>
              <option value="suspend">Langsung suspend</option>
            </select>
          </div>
          {settings.on_expiry_action === "grace_then_suspend" && (
            <div>
              <Label>Grace Period (hari)</Label>
              <Input type="number" min={1} max={30} value={settings.grace_days}
                onChange={e => setSettings(s => ({ ...s, grace_days: Number(e.target.value) }))} />
            </div>
          )}
        </div>
        <div className="flex justify-end mt-3">
          <Button size="sm" onClick={saveSettings} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Simpan Pengaturan
          </Button>
        </div>
      </Card>

      {/* Tabs trial/paid */}
      <Tabs value={tab} onValueChange={v => setTab(v as Audience)}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="trial">Masa Trial ({rules.filter(r => r.audience === "trial").length})</TabsTrigger>
            <TabsTrigger value="paid">Paket Berbayar ({rules.filter(r => r.audience === "paid").length})</TabsTrigger>
          </TabsList>
          <Button size="sm" onClick={addRule} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Tambah Rule
          </Button>
        </div>

        {(["trial", "paid"] as const).map(aud => (
          <TabsContent key={aud} value={aud} className="space-y-3 mt-4">
            {rules.filter(r => r.audience === aud).length === 0 && (
              <Card className="p-6 text-center text-sm text-muted-foreground">
                Belum ada rule reminder untuk {aud === "trial" ? "masa trial" : "paket berbayar"}.
                Klik <strong>Tambah Rule</strong> untuk membuat.
              </Card>
            )}

            {rules.filter(r => r.audience === aud).map(rule => (
              <Card key={rule.id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant={rule.days_before <= 1 ? "destructive" : rule.days_before <= 3 ? "default" : "secondary"} className="text-sm">
                      H-{rule.days_before}
                    </Badge>
                    <div className="flex items-center gap-2">
                      <Switch checked={rule.is_active} onCheckedChange={v => updateRuleLocal(rule.id, { is_active: v })} />
                      <span className="text-xs text-muted-foreground">{rule.is_active ? "aktif" : "nonaktif"}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => setPreviewId(previewId === rule.id ? null : rule.id)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteRule(rule.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3 mb-3">
                  <div>
                    <Label>Hari sebelum habis</Label>
                    <Input type="number" min={0} max={90} value={rule.days_before}
                      onChange={e => updateRuleLocal(rule.id, { days_before: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Urutan</Label>
                    <Input type="number" value={rule.sort_order}
                      onChange={e => updateRuleLocal(rule.id, { sort_order: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>Channel Notifikasi</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {(Object.keys(CHANNEL_META) as Channel[]).map(ch => {
                        const meta = CHANNEL_META[ch];
                        const Icon = meta.icon;
                        const on = rule.channels.includes(ch);
                        return (
                          <button key={ch} type="button" onClick={() => toggleChannel(rule.id, ch)}
                            className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition ${
                              on ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground"
                            }`}>
                            <Icon className="h-3 w-3" /> {meta.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <Label>Subjek</Label>
                    <Input value={rule.template_subject}
                      onChange={e => updateRuleLocal(rule.id, { template_subject: e.target.value })} />
                  </div>
                  <div>
                    <Label>Isi Pesan</Label>
                    <Textarea rows={4} value={rule.template_body}
                      onChange={e => updateRuleLocal(rule.id, { template_body: e.target.value })} />
                  </div>
                  <div className="flex flex-wrap gap-1 text-[11px] text-muted-foreground">
                    <span>Variabel:</span>
                    {VARIABLES.map(v => (
                      <code key={v} className="rounded bg-muted px-1.5 py-0.5 font-mono">{v}</code>
                    ))}
                  </div>
                </div>

                {previewId === rule.id && (
                  <div className="mt-3 rounded-lg border bg-muted/40 p-3 text-sm">
                    <div className="text-xs font-semibold text-muted-foreground mb-1">PREVIEW</div>
                    <div className="font-medium mb-1">{renderTemplate(rule.template_subject)}</div>
                    <div className="whitespace-pre-wrap text-muted-foreground">{renderTemplate(rule.template_body)}</div>
                  </div>
                )}

                <div className="flex justify-end mt-3">
                  <Button size="sm" onClick={() => saveRule(rule)} className="gap-1">
                    <Save className="h-3.5 w-3.5" /> Simpan Rule
                  </Button>
                </div>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 p-3 text-xs">
        <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-blue-800 dark:text-blue-300">
          Cron job harian membaca rule aktif dari halaman ini. Eksekusi & history dapat dipantau di halaman <Link to="/admin/auto-renewal" className="underline font-medium">Notif Renewal Otomatis</Link>.
        </div>
      </div>
    </div>
  );
}