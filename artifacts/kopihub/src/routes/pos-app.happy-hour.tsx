import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Plus, Trash2, Loader2, Copy, Check, Power, PowerOff, Pencil } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/happy-hour")({
  head: () => ({ meta: [{ title: "Happy Hour — Merchant" }] }),
  component: HappyHourPage,
});

const HAPPY_HOUR_SQL = `-- Jalankan di Supabase SQL Editor:
create table if not exists public.happy_hour_rules (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references public.coffee_shops(id) on delete cascade,
  name text not null,
  days_of_week integer[] not null default '{1,2,3,4,5}',
  start_time time not null,
  end_time time not null,
  discount_type text not null default 'percent'
    check (discount_type in ('percent','fixed')),
  discount_value numeric(10,2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.happy_hour_rules enable row level security;
create policy "owner_all_hh" on public.happy_hour_rules
  using (shop_id in (select id from coffee_shops where owner_id = auth.uid()))
  with check (shop_id in (select id from coffee_shops where owner_id = auth.uid()));
create policy "public_read_hh" on public.happy_hour_rules
  for select using (true);`;

const DAY_NAMES = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];
const ALL_DAYS  = [0,1,2,3,4,5,6];

type Rule = {
  id: string;
  name: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  is_active: boolean;
};

const defaultForm = (): Omit<Rule, "id"> => ({
  name: "",
  days_of_week: [1,2,3,4,5],
  start_time: "14:00",
  end_time: "17:00",
  discount_type: "percent",
  discount_value: 20,
  is_active: true,
});

function HappyHourPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [tableExists, setTableExists] = useState<boolean | null>(null);
  const [rules, setRules]   = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editRule, setEditRule] = useState<Rule | null>(null);
  const [form, setForm]     = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!shop?.id) return;
    (async () => {
      const { error } = await (supabase as any).from("happy_hour_rules").select("id").limit(1);
      if (error?.message?.includes("relation") || error?.message?.includes("does not exist")) {
        setTableExists(false);
        setLoading(false);
        return;
      }
      setTableExists(true);
      await loadRules();
    })();
  }, [shop?.id]);

  async function loadRules() {
    if (!shop?.id) return;
    const { data, error } = await (supabase as any)
      .from("happy_hour_rules")
      .select("id, name, days_of_week, start_time, end_time, discount_type, discount_value, is_active")
      .eq("shop_id", shop.id)
      .order("start_time");
    if (error) toast.error(error.message);
    setRules((data ?? []) as Rule[]);
    setLoading(false);
  }

  function openAdd() {
    setEditRule(null);
    setForm(defaultForm());
    setShowDialog(true);
  }

  function openEdit(r: Rule) {
    setEditRule(r);
    setForm({ name: r.name, days_of_week: r.days_of_week, start_time: r.start_time.slice(0,5), end_time: r.end_time.slice(0,5), discount_type: r.discount_type, discount_value: r.discount_value, is_active: r.is_active });
    setShowDialog(true);
  }

  function toggleDay(d: number) {
    setForm(f => ({
      ...f,
      days_of_week: f.days_of_week.includes(d)
        ? f.days_of_week.filter(x => x !== d)
        : [...f.days_of_week, d].sort(),
    }));
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Masukkan nama aturan."); return; }
    if (form.days_of_week.length === 0) { toast.error("Pilih minimal 1 hari."); return; }
    if (form.discount_value <= 0) { toast.error("Diskon harus lebih dari 0."); return; }
    if (!shop?.id) return;
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), shop_id: shop.id };
      if (editRule) {
        const { error } = await (supabase as any).from("happy_hour_rules").update(payload).eq("id", editRule.id);
        if (error) throw error;
        toast.success("Aturan diperbarui!");
      } else {
        const { error } = await (supabase as any).from("happy_hour_rules").insert(payload);
        if (error) throw error;
        toast.success("Aturan Happy Hour ditambahkan!");
      }
      setShowDialog(false);
      await loadRules();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(r: Rule) {
    const { error } = await (supabase as any).from("happy_hour_rules").update({ is_active: !r.is_active }).eq("id", r.id);
    if (error) toast.error(error.message);
    else { toast.success(r.is_active ? "Aturan dinonaktifkan" : "Aturan diaktifkan"); await loadRules(); }
  }

  async function deleteRule(id: string) {
    setDeleting(id);
    const { error } = await (supabase as any).from("happy_hour_rules").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Aturan dihapus"); await loadRules(); }
    setDeleting(null);
  }

  if (shopLoading || loading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>;
  }

  if (tableExists === false) {
    return (
      <div className="p-6 space-y-4">
        <h1 className="text-xl font-bold">Happy Hour</h1>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <p className="text-sm font-medium text-amber-800">Tabel happy_hour_rules belum ada. Jalankan SQL ini:</p>
          <pre className="overflow-x-auto rounded-lg bg-white border border-border p-3 text-[11px] whitespace-pre-wrap">{HAPPY_HOUR_SQL}</pre>
          <Button
            size="sm" variant="outline" className="gap-1.5"
            onClick={() => { navigator.clipboard.writeText(HAPPY_HOUR_SQL); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          >
            {copied ? <><Check className="h-3.5 w-3.5" /> Disalin!</> : <><Copy className="h-3.5 w-3.5" /> Salin SQL</>}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Happy Hour</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Atur diskon otomatis berdasarkan hari dan jam. Harga spesial tampil otomatis di halaman produk selama periode aktif.
          </p>
        </div>
        <Button className="gap-1.5" onClick={openAdd}>
          <Plus className="h-4 w-4" /> Tambah Aturan
        </Button>
      </div>

      {rules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Clock className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">Belum ada aturan Happy Hour</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Contoh: "Senin–Jumat jam 14.00–17.00, semua menu diskon 20%"
          </p>
          <Button className="mt-4 gap-1.5" onClick={openAdd}>
            <Plus className="h-4 w-4" /> Buat Aturan Pertama
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(r => (
            <div key={r.id} className={`rounded-xl border bg-card p-4 flex gap-4 items-start transition-opacity ${r.is_active ? "" : "opacity-60"}`}>
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Clock className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{r.name}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${r.is_active ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                    {r.is_active ? "Aktif" : "Nonaktif"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {r.days_of_week.map(d => DAY_NAMES[d]).join(", ")} · {r.start_time.slice(0,5)} – {r.end_time.slice(0,5)}
                </p>
                <p className="text-xs font-medium text-primary mt-0.5">
                  Diskon {r.discount_type === "percent" ? `${r.discount_value}%` : `Rp ${Number(r.discount_value).toLocaleString("id-ID")}`}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
                  onClick={() => toggleActive(r)}
                  title={r.is_active ? "Nonaktifkan" : "Aktifkan"}
                >
                  {r.is_active ? <PowerOff className="h-3.5 w-3.5 text-muted-foreground" /> : <Power className="h-3.5 w-3.5 text-green-600" />}
                </button>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-muted transition-colors"
                  onClick={() => openEdit(r)}
                  title="Edit"
                >
                  <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-border hover:bg-red-50 hover:border-red-200 transition-colors"
                  onClick={() => deleteRule(r.id)}
                  disabled={deleting === r.id}
                  title="Hapus"
                >
                  {deleting === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 text-destructive" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editRule ? "Edit Aturan Happy Hour" : "Tambah Aturan Happy Hour"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nama Aturan</Label>
              <Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Contoh: Happy Hour Sore" />
            </div>
            <div>
              <Label>Hari Berlaku</Label>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {ALL_DAYS.map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                      form.days_of_week.includes(d)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {DAY_NAMES[d]}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jam Mulai</Label>
                <Input type="time" className="mt-1" value={form.start_time} onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))} />
              </div>
              <div>
                <Label>Jam Selesai</Label>
                <Input type="time" className="mt-1" value={form.end_time} onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jenis Diskon</Label>
                <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v as "percent" | "fixed" }))}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Persentase (%)</SelectItem>
                    <SelectItem value="fixed">Nominal (Rp)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Nilai Diskon</Label>
                <Input
                  type="number"
                  className="mt-1"
                  value={form.discount_value}
                  onChange={e => setForm(f => ({ ...f, discount_value: Number(e.target.value) }))}
                  min={0}
                  max={form.discount_type === "percent" ? 100 : undefined}
                  placeholder={form.discount_type === "percent" ? "20" : "5000"}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Menyimpan…" : editRule ? "Simpan" : "Tambah"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
