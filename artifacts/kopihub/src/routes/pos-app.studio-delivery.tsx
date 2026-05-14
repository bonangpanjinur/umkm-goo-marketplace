import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  FolderOpen, Plus, Loader2, Search, MessageSquare,
  ChevronDown, ChevronUp, Link as LinkIcon, CheckCircle2,
  Clock, Upload, Trash2, Copy,
} from "lucide-react";

export const Route = createFileRoute("/pos-app/studio-delivery")({
  head: () => ({ meta: [{ title: "Pengiriman Hasil Foto" }] }),
  component: StudioDeliveryPage,
});

type Delivery = {
  id: string;
  client_name: string;
  client_phone: string | null;
  session_date: string | null;
  package_name: string | null;
  file_urls: string[];
  drive_link: string | null;
  download_token: string;
  expires_at: string | null;
  download_count: number;
  status: "preparing" | "delivered" | "downloaded" | "expired";
  notes: string | null;
  created_at: string;
};

const SQL_HINT = `CREATE TABLE IF NOT EXISTS public.studio_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_phone text,
  session_date date,
  package_name text,
  file_urls text[] NOT NULL DEFAULT '{}',
  drive_link text,
  download_token text NOT NULL DEFAULT gen_random_uuid()::text,
  expires_at timestamptz,
  download_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing','delivered','downloaded','expired')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);`;

const STATUS_META = {
  preparing:  { label: "Sedang Disiapkan", cls: "bg-amber-100 text-amber-700",  icon: Clock },
  delivered:  { label: "Sudah Dikirim",    cls: "bg-blue-100 text-blue-700",    icon: LinkIcon },
  downloaded: { label: "Sudah Diunduh",    cls: "bg-green-100 text-green-700",  icon: CheckCircle2 },
  expired:    { label: "Link Kedaluwarsa", cls: "bg-gray-100 text-gray-500",    icon: Clock },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function addDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

const EMPTY_FORM = {
  client_name: "",
  client_phone: "",
  session_date: "",
  package_name: "",
  drive_link: "",
  file_urls_raw: "",
  expires_days: "30",
  notes: "",
};

export default function StudioDeliveryPage() {
  const { shop } = useCurrentShop();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("studio_deliveries")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });
    if (error?.message?.includes("exist")) setShowSql(true);
    setDeliveries((data ?? []) as Delivery[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const save = async () => {
    if (!shop || !form.client_name.trim()) {
      toast.error("Nama klien wajib diisi");
      return;
    }
    if (!form.drive_link.trim() && !form.file_urls_raw.trim()) {
      toast.error("Masukkan link Google Drive atau URL file foto");
      return;
    }
    setSaving(true);
    try {
      const expiresAt = form.expires_days
        ? new Date(addDays(Number(form.expires_days))).toISOString()
        : null;

      const { data, error } = await (supabase as any)
        .from("studio_deliveries")
        .insert({
          shop_id: shop.id,
          client_name: form.client_name.trim(),
          client_phone: form.client_phone.trim() || null,
          session_date: form.session_date || null,
          package_name: form.package_name.trim() || null,
          drive_link: form.drive_link.trim() || null,
          file_urls: form.file_urls_raw
            .split("\n")
            .map(s => s.trim())
            .filter(Boolean),
          expires_at: expiresAt,
          notes: form.notes.trim() || null,
          status: "preparing",
        })
        .select()
        .single();
      if (error) throw error;

      toast.success("Pengiriman dibuat — kirim link ke klien");
      setOpen(false);
      setForm(EMPTY_FORM);
      load(shop.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  };

  const sendToClient = async (delivery: Delivery) => {
    if (!delivery.client_phone) {
      toast.error("Nomor WhatsApp klien tidak ada");
      return;
    }

    const downloadLink = delivery.drive_link
      || `${window.location.origin}/download/${delivery.download_token}`;

    const expiresNote = delivery.expires_at
      ? `\n\nLink aktif hingga: ${fmtDate(delivery.expires_at)}`
      : "";

    const msg = `Halo ${delivery.client_name}! 📸\n\nFoto sesi${delivery.session_date ? ` ${fmtDate(delivery.session_date)}` : ""} sudah siap! Silakan unduh di link berikut:\n\n🔗 ${downloadLink}${expiresNote}\n\nTerima kasih sudah memilih kami! Jangan lupa tag kami jika upload ke sosmed ya 🙏`;
    window.open(
      `https://wa.me/${delivery.client_phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`,
      "_blank"
    );

    await (supabase as any)
      .from("studio_deliveries")
      .update({ status: "delivered" })
      .eq("id", delivery.id);
    setDeliveries(prev =>
      prev.map(d => d.id === delivery.id ? { ...d, status: "delivered" } : d)
    );
    toast.success("Link dikirim ke klien via WhatsApp");
  };

  const copyDownloadLink = async (delivery: Delivery) => {
    const link = delivery.drive_link
      || `${window.location.origin}/download/${delivery.download_token}`;
    await navigator.clipboard.writeText(link);
    toast.success("Link disalin ke clipboard");
  };

  const markDownloaded = async (delivery: Delivery) => {
    await (supabase as any)
      .from("studio_deliveries")
      .update({ status: "downloaded", download_count: delivery.download_count + 1 })
      .eq("id", delivery.id);
    setDeliveries(prev =>
      prev.map(d => d.id === delivery.id
        ? { ...d, status: "downloaded", download_count: d.download_count + 1 }
        : d
      )
    );
    toast.success("Status diperbarui: sudah diunduh");
  };

  const remove = async (delivery: Delivery) => {
    if (!confirm(`Hapus pengiriman untuk "${delivery.client_name}"?`)) return;
    await (supabase as any).from("studio_deliveries").delete().eq("id", delivery.id);
    setDeliveries(prev => prev.filter(d => d.id !== delivery.id));
    toast.success("Pengiriman dihapus");
  };

  const filtered = deliveries.filter(d =>
    !search.trim() ||
    d.client_name.toLowerCase().includes(search.toLowerCase()) ||
    (d.package_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    preparing: deliveries.filter(d => d.status === "preparing").length,
    delivered: deliveries.filter(d => d.status === "delivered").length,
    downloaded: deliveries.filter(d => d.status === "downloaded").length,
  };

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <FolderOpen className="h-5 w-5 text-primary" /> Pengiriman Hasil Foto
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Kirim link foto/Google Drive ke klien via WhatsApp — SF-05.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          <Upload className="h-4 w-4" /> Kirim Hasil Foto
        </Button>
      </div>

      {/* Stats strip */}
      {deliveries.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Sedang Disiapkan", count: stats.preparing, cls: "text-amber-600" },
            { label: "Sudah Dikirim", count: stats.delivered, cls: "text-blue-600" },
            { label: "Sudah Diunduh", count: stats.downloaded, cls: "text-green-600" },
          ].map(s => (
            <div key={s.label} className="rounded-xl border bg-card p-3 text-center">
              <p className={`text-2xl font-bold ${s.cls}`}>{s.count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {showSql && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Tabel belum ada — jalankan SQL berikut di Supabase:</p>
          <pre className="mt-2 text-xs font-mono bg-amber-100 p-2 rounded overflow-x-auto">{SQL_HINT}</pre>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Cari nama klien atau paket..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <FolderOpen className="mx-auto h-10 w-10 opacity-30 mb-3" />
          <p className="font-medium">Belum ada pengiriman hasil foto</p>
          <p className="text-sm mt-1">Setelah sesi selesai, kirim link foto ke klien dari sini</p>
          <Button className="mt-4 gap-1.5" onClick={() => setOpen(true)}>
            <Upload className="h-4 w-4" /> Kirim Hasil Foto Pertama
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(delivery => {
            const sm = STATUS_META[delivery.status];
            const StatusIcon = sm.icon;
            const isExpanded = expandedId === delivery.id;
            return (
              <div key={delivery.id} className="rounded-xl border bg-card overflow-hidden">
                <button
                  className="w-full text-left p-4 hover:bg-accent/20 transition"
                  onClick={() => setExpandedId(isExpanded ? null : delivery.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{delivery.client_name}</span>
                        <Badge className={`text-xs inline-flex items-center gap-1 ${sm.cls}`}>
                          <StatusIcon className="h-2.5 w-2.5" /> {sm.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {delivery.package_name && `${delivery.package_name} · `}
                        {delivery.session_date ? fmtDate(delivery.session_date) : "Tanggal tidak diisi"}
                        {delivery.download_count > 0 && ` · Diunduh ${delivery.download_count}×`}
                      </p>
                      {delivery.expires_at && (
                        <p className="text-xs text-muted-foreground">
                          Kadaluarsa: {fmtDate(delivery.expires_at)}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                    {/* File links */}
                    <div className="space-y-1.5">
                      {delivery.drive_link && (
                        <a
                          href={delivery.drive_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                          <LinkIcon className="h-3.5 w-3.5" /> {delivery.drive_link.length > 50 ? delivery.drive_link.slice(0, 50) + "…" : delivery.drive_link}
                        </a>
                      )}
                      {delivery.file_urls.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-sm text-primary hover:underline"
                        >
                          <LinkIcon className="h-3.5 w-3.5" /> File {i + 1}
                        </a>
                      ))}
                    </div>

                    {delivery.notes && (
                      <p className="text-xs text-muted-foreground italic">{delivery.notes}</p>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm" variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => copyDownloadLink(delivery)}
                      >
                        <Copy className="h-3 w-3" /> Salin Link
                      </Button>
                      {delivery.client_phone && (
                        <Button
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => sendToClient(delivery)}
                        >
                          <MessageSquare className="h-3 w-3" /> Kirim WA
                        </Button>
                      )}
                      {delivery.status === "delivered" && (
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs text-green-700 border-green-200"
                          onClick={() => markDownloaded(delivery)}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Tandai Diunduh
                        </Button>
                      )}
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive ml-auto"
                        onClick={() => remove(delivery)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* New delivery dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> Kirim Hasil Foto ke Klien
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label>Nama Klien <span className="text-destructive">*</span></Label>
                <Input
                  value={form.client_name}
                  onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                  placeholder="Nama klien"
                />
              </div>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label>Nomor WhatsApp Klien</Label>
                <Input
                  value={form.client_phone}
                  onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))}
                  placeholder="08xx..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Tanggal Sesi</Label>
                <Input
                  type="date"
                  value={form.session_date}
                  onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Nama Paket</Label>
                <Input
                  value={form.package_name}
                  onChange={e => setForm(f => ({ ...f, package_name: e.target.value }))}
                  placeholder="Basic, Standard, Premium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Link Google Drive / WeTransfer / Mega</Label>
              <Input
                value={form.drive_link}
                onChange={e => setForm(f => ({ ...f, drive_link: e.target.value }))}
                placeholder="https://drive.google.com/drive/folders/..."
              />
              <p className="text-xs text-muted-foreground">
                Rekomendasi: Google Drive (folder shared) atau WeTransfer
              </p>
            </div>

            <div className="space-y-1.5">
              <Label>URL File Tambahan (opsional, satu per baris)</Label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                value={form.file_urls_raw}
                onChange={e => setForm(f => ({ ...f, file_urls_raw: e.target.value }))}
                placeholder={"https://...\nhttps://..."}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Link aktif berapa hari?</Label>
              <div className="flex gap-2">
                {["7", "14", "30", "90"].map(d => (
                  <button
                    key={d}
                    onClick={() => setForm(f => ({ ...f, expires_days: d }))}
                    className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${form.expires_days === d ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-accent"}`}
                  >
                    {d} hari
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Catatan (opsional)</Label>
              <Input
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Catatan internal untuk dirimu sendiri"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Simpan Pengiriman
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
