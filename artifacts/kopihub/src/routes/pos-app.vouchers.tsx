import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Ticket, Trash2, Copy, Check, Info } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/vouchers")({
  head: () => ({ meta: [{ title: "Voucher Toko" }] }),
  component: ShopVouchersPage,
});

type Voucher = {
  id: string;
  shop_id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "nominal";
  value: number;
  min_order: number;
  max_discount: number | null;
  usage_limit: number | null;
  per_user_limit: number | null;
  usage_count: number;
  starts_at: string | null;
  expires_at: string | null;
  is_active: boolean;
};

const EMPTY_FORM: Partial<Voucher> = {
  code: "",
  discount_type: "percent",
  value: 10,
  min_order: 0,
  per_user_limit: 1,
  is_active: true,
};

function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={copy}
      className="ml-1 inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
      title="Salin kode"
    >
      {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
    </button>
  );
}

function ShopVouchersPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [list, setList] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [tableReady, setTableReady] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Voucher>>(EMPTY_FORM);

  const load = async () => {
    if (!shop) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("shop_vouchers" as any)
      .select("*")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false });

    if (error) {
      if (
        error.message.toLowerCase().includes("does not exist") ||
        error.message.toLowerCase().includes("relation")
      ) {
        setTableReady(false);
      } else {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }

    setList(
      ((data ?? []) as any[]).map((v: any) => ({
        ...v,
        value: Number(v.value),
        min_order: Number(v.min_order),
        max_discount: v.max_discount ? Number(v.max_discount) : null,
      }))
    );
    setLoading(false);
  };

  useEffect(() => {
    if (shop) load();
  }, [shop?.id]);

  const save = async () => {
    if (!shop) return;
    if (!form.code?.trim()) { toast.error("Kode wajib diisi"); return; }
    if (!form.value || Number(form.value) <= 0) { toast.error("Nilai diskon harus lebih dari 0"); return; }
    if (form.discount_type === "percent" && Number(form.value) > 100) {
      toast.error("Diskon persen tidak boleh lebih dari 100%");
      return;
    }

    setSaving(true);
    const payload: any = {
      shop_id: shop.id,
      code: form.code.trim().toUpperCase(),
      description: form.description ?? null,
      discount_type: form.discount_type,
      value: Number(form.value),
      min_order: Number(form.min_order ?? 0),
      max_discount: form.max_discount ? Number(form.max_discount) : null,
      usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
      per_user_limit: form.per_user_limit ? Number(form.per_user_limit) : null,
      starts_at: form.starts_at || null,
      expires_at: form.expires_at || null,
      is_active: form.is_active ?? true,
    };

    const { error } = await supabase.from("shop_vouchers" as any).insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Voucher berhasil dibuat");
    setOpen(false);
    setForm(EMPTY_FORM);
    load();
  };

  const toggle = async (v: Voucher) => {
    const { error } = await supabase
      .from("shop_vouchers" as any)
      .update({ is_active: !v.is_active })
      .eq("id", v.id);
    if (error) toast.error(error.message);
    else load();
  };

  const remove = async (v: Voucher) => {
    if (!confirm(`Hapus voucher ${v.code}?`)) return;
    const { error } = await supabase.from("shop_vouchers" as any).delete().eq("id", v.id);
    if (error) toast.error(error.message);
    else { toast.success("Voucher dihapus"); load(); }
  };

  const isExpired = (v: Voucher) =>
    v.expires_at ? new Date(v.expires_at) < new Date() : false;

  const isNotStarted = (v: Voucher) =>
    v.starts_at ? new Date(v.starts_at) > new Date() : false;

  if (shopLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4 sm:p-6 max-w-4xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Ticket className="h-5 w-5 text-primary" /> Voucher Toko
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Buat kode diskon khusus untuk toko kamu. Pembeli bisa memasukkan kode ini saat checkout.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} disabled={!tableReady}>
          <Plus className="mr-1.5 h-4 w-4" /> Voucher Baru
        </Button>
      </div>

      {!tableReady && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-semibold text-amber-800">Tabel database belum siap</p>
            <p className="mt-1 text-amber-700 text-xs">
              Fitur ini memerlukan tabel <code className="bg-amber-100 px-1 rounded">shop_vouchers</code> di Supabase.
              Jalankan migrasi SQL berikut di Supabase SQL Editor:
            </p>
            <pre className="mt-2 overflow-auto rounded bg-amber-100 p-3 text-xs text-amber-900">
{`CREATE TABLE IF NOT EXISTS shop_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','nominal')),
  value numeric(12,2) NOT NULL,
  min_order numeric(12,2) NOT NULL DEFAULT 0,
  max_discount numeric(12,2),
  usage_limit int,
  per_user_limit int DEFAULT 1,
  usage_count int NOT NULL DEFAULT 0,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, code)
);
ALTER TABLE shop_vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all" ON shop_vouchers FOR ALL
  USING (shop_id IN (
    SELECT id FROM shops WHERE owner_user_id = auth.uid()
  ));`}
            </pre>
          </div>
        </div>
      )}

      {tableReady && (
        loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <Ticket className="mx-auto h-10 w-10 text-muted-foreground opacity-30" />
            <p className="mt-3 text-sm font-medium">Belum ada voucher</p>
            <p className="mt-1 text-xs text-muted-foreground">Buat voucher pertama untuk menarik lebih banyak pembeli.</p>
            <Button className="mt-4" size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Buat Voucher
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {list.map((v) => {
              const expired = isExpired(v);
              const notStarted = isNotStarted(v);
              const statusLabel = expired ? "Kadaluarsa" : notStarted ? "Belum Mulai" : v.is_active ? "Aktif" : "Nonaktif";
              const statusCls = expired
                ? "bg-red-100 text-red-600"
                : notStarted
                ? "bg-amber-100 text-amber-700"
                : v.is_active
                ? "bg-emerald-100 text-emerald-700"
                : "bg-muted text-muted-foreground";

              return (
                <div
                  key={v.id}
                  className={`flex items-start justify-between gap-3 rounded-xl border bg-card p-4 transition ${!v.is_active || expired ? "opacity-60" : ""}`}
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-base font-bold tracking-wider">{v.code}</span>
                      <CopyCode code={v.code} />
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCls}`}>
                        {statusLabel}
                      </span>
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {v.discount_type === "percent" ? `${v.value}%` : `Rp ${Number(v.value).toLocaleString("id-ID")}`}
                      </span>
                    </div>
                    {v.description && (
                      <p className="text-xs text-muted-foreground">{v.description}</p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span>Min. {formatIDR(v.min_order)}</span>
                      {v.max_discount && <span>Maks. diskon {formatIDR(v.max_discount)}</span>}
                      {v.usage_limit
                        ? <span>Terpakai {v.usage_count}/{v.usage_limit}×</span>
                        : <span>Terpakai {v.usage_count}×</span>}
                      {v.per_user_limit && <span>Maks. {v.per_user_limit}× per orang</span>}
                      {v.starts_at && <span>Mulai {new Date(v.starts_at).toLocaleDateString("id-ID")}</span>}
                      {v.expires_at && <span>Berakhir {new Date(v.expires_at).toLocaleDateString("id-ID")}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Switch
                      checked={v.is_active}
                      onCheckedChange={() => toggle(v)}
                      disabled={expired}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(v)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Voucher Baru</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3.5 py-1">
            <div>
              <Label>Kode Voucher *</Label>
              <Input
                value={form.code ?? ""}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="cth: DISKON20"
                className="mt-1 font-mono tracking-widest"
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Pembeli akan memasukkan kode ini saat checkout.</p>
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea
                rows={2}
                value={form.description ?? ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="cth: Diskon spesial untuk pelanggan setia"
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Jenis Diskon</Label>
                <select
                  className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={form.discount_type}
                  onChange={(e) => setForm({ ...form, discount_type: e.target.value as any })}
                >
                  <option value="percent">Persen (%)</option>
                  <option value="nominal">Nominal (Rp)</option>
                </select>
              </div>
              <div>
                <Label>Nilai Diskon *</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    min={1}
                    max={form.discount_type === "percent" ? 100 : undefined}
                    value={form.value ?? ""}
                    onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {form.discount_type === "percent" ? "%" : "Rp"}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Min. Belanja</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.min_order ?? 0}
                  onChange={(e) => setForm({ ...form, min_order: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Maks. Diskon (Rp)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.max_discount ?? ""}
                  onChange={(e) => setForm({ ...form, max_discount: e.target.value ? Number(e.target.value) : null })}
                  placeholder="opsional"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Kuota Total</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.usage_limit ?? ""}
                  onChange={(e) => setForm({ ...form, usage_limit: e.target.value ? Number(e.target.value) : null })}
                  placeholder="kosong = tak terbatas"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Maks. per Pengguna</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.per_user_limit ?? 1}
                  onChange={(e) => setForm({ ...form, per_user_limit: Number(e.target.value) })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Tanggal Mulai</Label>
                <Input
                  type="datetime-local"
                  value={form.starts_at ?? ""}
                  onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Tanggal Berakhir</Label>
                <Input
                  type="datetime-local"
                  value={form.expires_at ?? ""}
                  onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
              <Switch
                checked={form.is_active ?? true}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
              <span className="text-sm font-medium">Aktifkan langsung setelah dibuat</span>
            </div>
            <Button onClick={save} disabled={saving} className="mt-1 w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
              Simpan Voucher
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
