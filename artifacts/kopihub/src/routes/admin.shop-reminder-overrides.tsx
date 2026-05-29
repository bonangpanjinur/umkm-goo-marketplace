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
import { Bell, Loader2, Save, Plus, Trash2, Search, ArrowLeft, Store, Mail, MessageCircle, Smartphone, Bell as BellIcon } from "lucide-react";

export const Route = createFileRoute("/admin/shop-reminder-overrides")({
  head: () => ({ meta: [{ title: "Override Pengingat Toko — Admin" }] }),
  component: AdminShopReminderOverrides,
});

type Audience = "trial" | "paid";
type Channel = "inapp" | "email" | "whatsapp" | "push";

type Shop = { id: string; name: string; owner_id: string; plan_expires_at: string | null; trial_ends_at: string | null };
type Settings = {
  shop_id: string;
  override_schedule: boolean;
  override_rules: boolean;
  send_hour_local: number;
  timezone: string;
  max_per_shop_per_day: number;
  on_expiry_action: "none" | "suspend" | "grace_then_suspend";
  grace_days: number;
  notes: string | null;
};
type Rule = {
  id: string;
  shop_id: string;
  audience: Audience;
  days_before: number;
  channels: Channel[];
  template_subject: string;
  template_body: string;
  is_active: boolean;
  sort_order: number;
};

const DEFAULT_SETTINGS = (shop_id: string): Settings => ({
  shop_id,
  override_schedule: false,
  override_rules: false,
  send_hour_local: 9,
  timezone: "Asia/Jakarta",
  max_per_shop_per_day: 2,
  on_expiry_action: "grace_then_suspend",
  grace_days: 3,
  notes: "",
});

const CHANNEL_META: Record<Channel, { label: string; icon: typeof Mail }> = {
  inapp: { label: "In-App", icon: BellIcon },
  email: { label: "Email", icon: Mail },
  whatsapp: { label: "WhatsApp", icon: MessageCircle },
  push: { label: "Push", icon: Smartphone },
};

const VARIABLES = ["{{shop_name}}", "{{plan_name}}", "{{days_left}}", "{{expires_at}}", "{{renewal_url}}"];

function AdminShopReminderOverrides() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [overriddenShopIds, setOverriddenShopIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Shop | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [tab, setTab] = useState<Audience>("trial");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reloadShops = async () => {
    const [shopsRes, settingsRes] = await Promise.all([
      supabase.from("shops").select("id, name, owner_id, plan_expires_at, trial_ends_at").order("name").limit(500),
      supabase.from("expiry_reminder_shop_settings" as any).select("shop_id"),
    ]);
    setShops((shopsRes.data as Shop[]) ?? []);
    setOverriddenShopIds(new Set(((settingsRes.data as any[]) ?? []).map(r => r.shop_id)));
  };

  const loadShopOverride = async (shop: Shop) => {
    setSelected(shop);
    setLoading(true);
    const [sRes, rRes] = await Promise.all([
      supabase.from("expiry_reminder_shop_settings" as any).select("*").eq("shop_id", shop.id).maybeSingle(),
      supabase.from("expiry_reminder_shop_rules" as any).select("*").eq("shop_id", shop.id).order("audience").order("sort_order"),
    ]);
    setSettings((sRes.data as Settings) ?? DEFAULT_SETTINGS(shop.id));
    setRules((rRes.data as Rule[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    (async () => { await reloadShops(); setLoading(false); })();
  }, []);

  const filteredShops = useMemo(() => {
    const q = search.trim().toLowerCase();
    return shops.filter(s => !q || s.name.toLowerCase().includes(q));
  }, [shops, search]);

  const filteredRules = useMemo(() => rules.filter(r => r.audience === tab), [rules, tab]);

  const saveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    const { error } = await supabase
      .from("expiry_reminder_shop_settings" as any)
      .upsert({ ...settings, updated_at: new Date().toISOString() }, { onConflict: "shop_id" });
    if (error) toast.error(error.message);
    else { toast.success("Override tersimpan"); await reloadShops(); }
    setSaving(false);
  };

  const removeOverride = async () => {
    if (!selected) return;
    if (!confirm(`Hapus seluruh override reminder untuk ${selected.name}?`)) return;
    const { error } = await supabase.from("expiry_reminder_shop_settings" as any).delete().eq("shop_id", selected.id);
    if (error) { toast.error(error.message); return; }
    await supabase.from("expiry_reminder_shop_rules" as any).delete().eq("shop_id", selected.id);
    toast.success("Override dihapus, kembali ke default");
    setSettings(DEFAULT_SETTINGS(selected.id));
    setRules([]);
    await reloadShops();
  };

  const updateRuleLocal = (id: string, patch: Partial<Rule>) =>
    setRules(arr => arr.map(r => r.id === id ? { ...r, ...patch } : r));

  const toggleChannel = (id: string, ch: Channel) =>
    setRules(arr => arr.map(r => {
      if (r.id !== id) return r;
      const has = r.channels.includes(ch);
      return { ...r, channels: has ? r.channels.filter(c => c !== ch) : [...r.channels, ch] };
    }));

  const saveRule = async (r: Rule) => {
    const { error } = await supabase.from("expiry_reminder_shop_rules" as any).update({
      days_before: r.days_before,
      channels: r.channels,
      template_subject: r.template_subject,
      template_body: r.template_body,
      is_active: r.is_active,
      sort_order: r.sort_order,
    }).eq("id", r.id);
    if (error) toast.error(error.message);
    else toast.success(`Rule H-${r.days_before} disimpan`);
  };

  const addRule = async () => {
    if (!selected) return;
    const used = filteredRules.map(r => r.days_before);
    const candidate = [14, 7, 5, 3, 2, 1, 0].find(d => !used.includes(d)) ?? 0;
    const { error } = await supabase.from("expiry_reminder_shop_rules" as any).insert({
      shop_id: selected.id,
      audience: tab,
      days_before: candidate,
      channels: ["inapp"],
      template_subject: `Paket ${selected.name} habis dalam ${candidate} hari`,
      template_body: `Halo, paket {{plan_name}} untuk {{shop_name}} berakhir dalam {{days_left}} hari ({{expires_at}}). Perpanjang: {{renewal_url}}`,
      is_active: true,
      sort_order: filteredRules.length + 1,
    });
    if (error) toast.error(error.message);
    else { toast.success("Rule baru ditambahkan"); await loadShopOverride(selected); }
  };

  const deleteRule = async (id: string) => {
    if (!confirm("Hapus rule override ini?")) return;
    const { error } = await supabase.from("expiry_reminder_shop_rules" as any).delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Rule dihapus"); setRules(rs => rs.filter(r => r.id !== id)); }
  };

  if (loading && !selected && shops.length === 0) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }

  // Detail editor
  if (selected && settings) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => { setSelected(null); setSettings(null); setRules([]); }}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Store className="h-5 w-5 text-primary" /> {selected.name}
              </h1>
              <p className="text-xs text-muted-foreground">
                Trial: {selected.trial_ends_at ? new Date(selected.trial_ends_at).toLocaleDateString("id-ID") : "—"} ·
                Paket: {selected.plan_expires_at ? new Date(selected.plan_expires_at).toLocaleDateString("id-ID") : "—"}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={removeOverride} className="gap-1 text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> Hapus Override
          </Button>
        </div>

        <Card className="p-4">
          <h3 className="text-sm font-semibold mb-3">Override Penjadwalan</h3>
          <div className="grid sm:grid-cols-2 gap-3 mb-3">
            <label className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Override Jadwal</div>
                <p className="text-[11px] text-muted-foreground">Pakai jam kirim & timezone khusus toko ini</p>
              </div>
              <Switch checked={settings.override_schedule} onCheckedChange={v => setSettings(s => s && ({ ...s, override_schedule: v }))} />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div>
                <div className="text-sm font-medium">Override Aturan Reminder</div>
                <p className="text-[11px] text-muted-foreground">Pakai daftar rule khusus toko ini, abaikan default</p>
              </div>
              <Switch checked={settings.override_rules} onCheckedChange={v => setSettings(s => s && ({ ...s, override_rules: v }))} />
            </label>
          </div>

          <div className={`grid sm:grid-cols-2 lg:grid-cols-3 gap-3 ${!settings.override_schedule ? "opacity-50 pointer-events-none" : ""}`}>
            <div>
              <Label>Jam Kirim Harian</Label>
              <Input type="number" min={0} max={23} value={settings.send_hour_local}
                onChange={e => setSettings(s => s && ({ ...s, send_hour_local: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Zona Waktu</Label>
              <select className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={settings.timezone}
                onChange={e => setSettings(s => s && ({ ...s, timezone: e.target.value }))}>
                <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
              </select>
            </div>
            <div>
              <Label>Maks. Reminder/Hari</Label>
              <Input type="number" min={1} max={20} value={settings.max_per_shop_per_day}
                onChange={e => setSettings(s => s && ({ ...s, max_per_shop_per_day: Number(e.target.value) }))} />
            </div>
            <div>
              <Label>Aksi pada Hari Expired</Label>
              <select className="mt-1.5 w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={settings.on_expiry_action}
                onChange={e => setSettings(s => s && ({ ...s, on_expiry_action: e.target.value as Settings["on_expiry_action"] }))}>
                <option value="none">Tidak ada</option>
                <option value="grace_then_suspend">Grace lalu suspend</option>
                <option value="suspend">Langsung suspend</option>
              </select>
            </div>
            {settings.on_expiry_action === "grace_then_suspend" && (
              <div>
                <Label>Grace Period (hari)</Label>
                <Input type="number" min={0} max={90} value={settings.grace_days}
                  onChange={e => setSettings(s => s && ({ ...s, grace_days: Number(e.target.value) }))} />
              </div>
            )}
          </div>

          <div className="mt-3">
            <Label>Catatan Internal</Label>
            <Textarea rows={2} value={settings.notes ?? ""} onChange={e => setSettings(s => s && ({ ...s, notes: e.target.value }))}
              placeholder="Misal: VIP, kontak owner langsung via WA personal" />
          </div>

          <div className="flex justify-end mt-3">
            <Button size="sm" onClick={saveSettings} disabled={saving} className="gap-1">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Simpan Override
            </Button>
          </div>
        </Card>

        <div className={!settings.override_rules ? "opacity-60" : ""}>
          <Tabs value={tab} onValueChange={v => setTab(v as Audience)}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <TabsList>
                <TabsTrigger value="trial">Trial ({rules.filter(r => r.audience === "trial").length})</TabsTrigger>
                <TabsTrigger value="paid">Berbayar ({rules.filter(r => r.audience === "paid").length})</TabsTrigger>
              </TabsList>
              <Button size="sm" onClick={addRule} disabled={!settings.override_rules} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Tambah Rule
              </Button>
            </div>

            {(["trial", "paid"] as const).map(aud => (
              <TabsContent key={aud} value={aud} className="space-y-3 mt-4">
                {rules.filter(r => r.audience === aud).length === 0 && (
                  <Card className="p-6 text-center text-sm text-muted-foreground">
                    Belum ada rule override untuk audiens ini.
                    {settings.override_rules
                      ? " Klik Tambah Rule untuk membuat."
                      : " Aktifkan toggle Override Aturan Reminder dulu."}
                  </Card>
                )}

                {rules.filter(r => r.audience === aud).map(rule => (
                  <Card key={rule.id} className="p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <Badge variant={rule.days_before <= 1 ? "destructive" : rule.days_before <= 3 ? "default" : "secondary"} className="text-sm">
                          H-{rule.days_before}
                        </Badge>
                        <Switch checked={rule.is_active} onCheckedChange={v => updateRuleLocal(rule.id, { is_active: v })} />
                        <span className="text-xs text-muted-foreground">{rule.is_active ? "aktif" : "nonaktif"}</span>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => deleteRule(rule.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
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
                        <Label>Channel</Label>
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
                        {VARIABLES.map(v => <code key={v} className="rounded bg-muted px-1.5 py-0.5 font-mono">{v}</code>)}
                      </div>
                    </div>

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
        </div>
      </div>
    );
  }

  // Shop list
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Bell className="h-6 w-6 text-primary" /> Override Reminder per Toko
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pilih toko untuk mengatur jadwal & aturan reminder yang berbeda dari{" "}
          <Link to="/admin/expiry-reminders" className="underline">default rules</Link>.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Cari nama toko..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="divide-y">
          {filteredShops.length === 0 && (
            <div className="p-6 text-center text-sm text-muted-foreground">Tidak ada toko ditemukan.</div>
          )}
          {filteredShops.map(shop => {
            const hasOverride = overriddenShopIds.has(shop.id);
            return (
              <button key={shop.id} onClick={() => loadShopOverride(shop)}
                className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-muted/40 transition">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="font-medium truncate">{shop.name}</span>
                    {hasOverride && <Badge variant="default" className="text-[10px]">override aktif</Badge>}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Trial: {shop.trial_ends_at ? new Date(shop.trial_ends_at).toLocaleDateString("id-ID") : "—"} ·
                    Paket: {shop.plan_expires_at ? new Date(shop.plan_expires_at).toLocaleDateString("id-ID") : "—"}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{hasOverride ? "Edit" : "Atur"}</span>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}