import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, CalendarCog, Save, Tags } from "lucide-react";

export const Route = createFileRoute("/admin/booking-config")({
  head: () => ({ meta: [{ title: "Konfigurasi Booking per Kategori — Admin" }] }),
  component: BookingConfigPage,
});

type Cat = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  booking_enabled: boolean;
  booking_type: "session" | "rental" | "both" | null;
  booking_config: Record<string, any>;
};

type Edits = Record<string, {
  booking_enabled: boolean;
  booking_type: "session" | "rental" | "both" | "";
  min_hours_before: string;
  deposit_required: boolean;
  deposit_percent: string;
  max_advance_days: string;
}>;

const DEFAULT_CFG = { min_hours_before: "2", deposit_required: false, deposit_percent: "20", max_advance_days: "60" };

function BookingConfigPage() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [edits, setEdits] = useState<Edits>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("business_categories")
      .select("id, slug, name, is_active, booking_enabled, booking_type, booking_config")
      .order("sort_order");
    const list = (data ?? []) as Cat[];
    setCats(list);
    const ed: Edits = {};
    for (const c of list) {
      const cfg = c.booking_config ?? {};
      ed[c.id] = {
        booking_enabled: c.booking_enabled,
        booking_type: c.booking_type ?? "",
        min_hours_before: String(cfg.min_hours_before ?? DEFAULT_CFG.min_hours_before),
        deposit_required: !!cfg.deposit_required,
        deposit_percent: String(cfg.deposit_percent ?? DEFAULT_CFG.deposit_percent),
        max_advance_days: String(cfg.max_advance_days ?? DEFAULT_CFG.max_advance_days),
      };
    }
    setEdits(ed);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (id: string, patch: Partial<Edits[string]>) => {
    setEdits(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const save = async (c: Cat) => {
    setSavingId(c.id);
    const e = edits[c.id];
    try {
      const { error } = await supabase
        .from("business_categories")
        .update({
          booking_enabled: e.booking_enabled,
          booking_type: e.booking_enabled ? (e.booking_type || "session") : null,
          booking_config: e.booking_enabled ? {
            min_hours_before: Number(e.min_hours_before) || 0,
            deposit_required: e.deposit_required,
            deposit_percent: Number(e.deposit_percent) || 0,
            max_advance_days: Number(e.max_advance_days) || 0,
          } : {},
        })
        .eq("id", c.id);
      if (error) throw error;
      toast.success(`Konfigurasi ${c.name} disimpan`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally { setSavingId(null); }
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold">
          <CalendarCog className="h-5 w-5 text-primary" /> Konfigurasi Booking per Kategori
        </h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Atur kategori usaha mana yang mengaktifkan booking sesi (T3) atau booking rental (T4), beserta parameter default.
        </p>
      </div>

      <div className="space-y-3">
        {cats.map(c => {
          const e = edits[c.id];
          return (
            <div key={c.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Tags className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-muted-foreground">/{c.slug}</div>
                  </div>
                  {!c.is_active && <Badge variant="outline" className="text-xs">Nonaktif</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`be_${c.id}`} className="text-sm">Booking aktif</Label>
                  <Switch id={`be_${c.id}`} checked={e.booking_enabled} onCheckedChange={(v) => update(c.id, { booking_enabled: v })} />
                </div>
              </div>

              {e.booking_enabled && (
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipe Booking</Label>
                    <select
                      className="h-9 w-full rounded-md border bg-background px-3 text-sm"
                      value={e.booking_type || "session"}
                      onChange={(ev) => update(c.id, { booking_type: ev.target.value as any })}
                    >
                      <option value="session">Sesi (T3)</option>
                      <option value="rental">Rental (T4)</option>
                      <option value="both">Keduanya</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Min. Jam Sebelum</Label>
                    <Input type="number" min={0} value={e.min_hours_before} onChange={(ev) => update(c.id, { min_hours_before: ev.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Maks. Hari di Muka</Label>
                    <Input type="number" min={1} value={e.max_advance_days} onChange={(ev) => update(c.id, { max_advance_days: ev.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Deposit %</Label>
                    <div className="flex items-center gap-2">
                      <Switch checked={e.deposit_required} onCheckedChange={(v) => update(c.id, { deposit_required: v })} />
                      <Input type="number" min={0} max={100} value={e.deposit_percent} disabled={!e.deposit_required} onChange={(ev) => update(c.id, { deposit_percent: ev.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-3 flex justify-end">
                <Button size="sm" onClick={() => save(c)} disabled={savingId === c.id} className="gap-1.5">
                  {savingId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Simpan
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
        <strong>Catatan:</strong> Parameter di sini adalah default yang berlaku untuk semua toko di kategori tersebut.
        Owner toko tetap dapat meng-override deposit & min. jam di pengaturan booking masing-masing.
      </div>
    </div>
  );
}
