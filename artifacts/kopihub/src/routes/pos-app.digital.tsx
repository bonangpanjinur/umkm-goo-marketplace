import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/use-shop";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Download,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Link as LinkIcon,
  Package,
  RefreshCw,
  Copy,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";

export const Route = createFileRoute("/pos-app/digital")({ component: DigitalProducts });

type DigitalProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  download_url: string | null;
  download_limit: number | null;
  download_expires_hours: number | null;
  file_size_kb: number | null;
  file_type: string | null;
  license_type: "personal" | "commercial" | "extended" | null;
  total_sold: number;
};

const EMPTY: Omit<DigitalProduct, "id" | "total_sold"> = {
  name: "",
  description: null,
  price: 0,
  is_available: true,
  download_url: null,
  download_limit: null,
  download_expires_hours: 48,
  file_size_kb: null,
  file_type: null,
  license_type: "personal",
};

const LICENSE_TYPE_LABEL: Record<string, string> = {
  personal:   "Personal — hanya untuk penggunaan pribadi",
  commercial: "Komersial — boleh digunakan untuk bisnis",
  extended:   "Extended — distribusi & modifikasi diizinkan",
};

function DigitalProducts() {
  const { shop } = useShop();
  const [items, setItems] = useState<DigitalProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<DigitalProduct | null>(null);
  const [form, setForm] = useState({ ...EMPTY, download_url: "", download_limit: "", download_expires_hours: "48", file_size_kb: "", file_type: "", name: "", description: "", price: "", license_type: "personal" as string });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!shop?.id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("menu_items" as any)
        .select("id, name, description, price, is_available, download_url, download_limit, download_expires_hours, file_size_kb, file_type, license_type")
        .eq("shop_id", shop.id)
        .eq("product_type", "digital")
        .order("created_at", { ascending: false }) as any;
      if (error) throw error;

      const ids = (data ?? []).map((d: any) => d.id);
      let salesMap: Record<string, number> = {};
      if (ids.length) {
        const { data: sales } = await supabase
          .from("order_items" as any)
          .select("product_id, quantity")
          .in("product_id", ids) as any;
        for (const s of sales ?? []) {
          salesMap[s.product_id] = (salesMap[s.product_id] ?? 0) + s.quantity;
        }
      }

      setItems(
        (data ?? []).map((d: any) => ({
          ...d,
          price: Number(d.price),
          total_sold: salesMap[d.id] ?? 0,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [shop?.id]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm({ ...EMPTY, download_url: "", download_limit: "", download_expires_hours: "48", file_size_kb: "", file_type: "", name: "", description: "", price: "", license_type: "personal" });
    setOpen(true);
  };

  const openEdit = (item: DigitalProduct) => {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description ?? "",
      price: String(item.price),
      is_available: item.is_available,
      download_url: item.download_url ?? "",
      download_limit: item.download_limit != null ? String(item.download_limit) : "",
      download_expires_hours: item.download_expires_hours != null ? String(item.download_expires_hours) : "48",
      file_size_kb: item.file_size_kb != null ? String(item.file_size_kb) : "",
      file_type: item.file_type ?? "",
      license_type: item.license_type ?? "personal",
    });
    setOpen(true);
  };

  const save = async () => {
    if (!shop?.id) return;
    if (!form.name.trim()) { toast.error("Nama produk wajib diisi"); return; }
    if (!form.download_url.trim()) { toast.error("URL download wajib diisi"); return; }
    setSaving(true);
    const payload = {
      shop_id: shop.id,
      name: form.name.trim(),
      description: form.description?.trim() || null,
      price: Number(form.price) || 0,
      is_available: form.is_available,
      product_type: "digital",
      download_url: form.download_url.trim(),
      download_limit: form.download_limit ? Number(form.download_limit) : null,
      download_expires_hours: form.download_expires_hours ? Number(form.download_expires_hours) : 48,
      file_size_kb: form.file_size_kb ? Number(form.file_size_kb) : null,
      file_type: form.file_type?.trim() || null,
      license_type: form.license_type || "personal",
      track_stock: false,
    };
    let error;
    if (editing) {
      ({ error } = await supabase.from("menu_items" as any).update(payload).eq("id", editing.id));
    } else {
      ({ error } = await supabase.from("menu_items" as any).insert(payload));
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Produk diperbarui" : "Produk digital ditambahkan");
    setOpen(false);
    load();
  };

  const del = async (item: DigitalProduct) => {
    if (!confirm(`Hapus "${item.name}"?`)) return;
    setDeleting(item.id);
    const { error } = await supabase.from("menu_items" as any).delete().eq("id", item.id);
    setDeleting(null);
    if (error) toast.error(error.message);
    else { toast.success("Produk dihapus"); load(); }
  };

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url).then(() => toast.success("Link disalin"));
  };

  const fmtSize = (kb: number | null) => {
    if (!kb) return null;
    if (kb < 1024) return `${kb} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Download className="h-6 w-6" /> Produk Digital
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Produk yang otomatis dikirim link download setelah pembeli melunasi pembayaran
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button size="sm" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Produk
          </Button>
        </div>
      </div>

      <Card className="p-4 border-blue-200 bg-blue-50/50">
        <div className="flex items-start gap-2 text-blue-800 text-sm">
          <Package className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Produk digital tidak memerlukan pengiriman fisik. Setelah pembayaran dikonfirmasi, sistem otomatis
            mengirimkan link download ke pembeli melalui notifikasi. Dukung: PDF, ebook, template, foto, audio, software, dll.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-2xl font-bold">{items.length}</p>
          <p className="text-xs text-muted-foreground">Total produk digital</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold">{items.filter((i) => i.is_available).length}</p>
          <p className="text-xs text-muted-foreground">Aktif dijual</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold">{items.reduce((s, i) => s + i.total_sold, 0)}</p>
          <p className="text-xs text-muted-foreground">Total terjual</p>
        </Card>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <Download className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">Belum ada produk digital</p>
          <p className="text-xs text-muted-foreground mt-1">Tambahkan ebook, template, foto, atau file lainnya</p>
          <Button size="sm" className="mt-4" onClick={openNew}>
            <Plus className="h-4 w-4 mr-1.5" />
            Tambah Produk Digital
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card key={item.id} className={`p-4 ${!item.is_available ? "opacity-60" : ""}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{item.name}</span>
                    {item.is_available ? (
                      <Badge className="text-[10px] bg-green-500 hover:bg-green-500">Aktif</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Nonaktif</Badge>
                    )}
                    {item.file_type && (
                      <Badge variant="outline" className="text-[10px] uppercase">{item.file_type}</Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {item.price > 0 ? `Rp ${item.price.toLocaleString("id-ID")}` : "Gratis"}
                    </span>
                    <span>Terjual: <strong className="text-foreground">{item.total_sold}×</strong></span>
                    {item.file_size_kb && <span>{fmtSize(item.file_size_kb)}</span>}
                    {item.download_expires_hours && (
                      <span className="flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" />
                        Link berlaku {item.download_expires_hours}j
                      </span>
                    )}
                    {item.download_limit && (
                      <span>Maks {item.download_limit}× unduhan</span>
                    )}
                  </div>
                  {item.download_url && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="flex-1 rounded-md border border-border bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground truncate">
                        <FileText className="inline h-3 w-3 mr-1" />
                        {item.download_url}
                      </div>
                      <button
                        onClick={() => copyLink(item.download_url!)}
                        className="rounded-md border border-border p-1.5 hover:bg-muted transition-colors"
                        title="Salin URL"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                      <a
                        href={item.download_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-md border border-border p-1.5 hover:bg-muted transition-colors"
                        title="Buka URL"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-purple-500 hover:text-purple-700" asChild title="Lihat lisensi & unduhan">
                    <Link to="/pos-app/digital-licenses" search={{ product: item.id } as any}>
                      <ShieldCheck className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(item)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => del(item)}
                    disabled={deleting === item.id}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Produk Digital" : "Tambah Produk Digital"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nama produk *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="cth: Template CV Premium, Ebook Memasak"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea
                value={form.description ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Apa yang pembeli dapatkan setelah membeli?"
                rows={3}
                className="mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Harga (Rp)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.price}
                  onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="0 = Gratis"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Tipe file</Label>
                <Input
                  value={form.file_type}
                  onChange={(e) => setForm((f) => ({ ...f, file_type: e.target.value }))}
                  placeholder="PDF, ZIP, MP3, JPEG…"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>URL Download *</Label>
              <Input
                value={form.download_url}
                onChange={(e) => setForm((f) => ({ ...f, download_url: e.target.value }))}
                placeholder="https://drive.google.com/... atau URL file"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Google Drive, Dropbox, S3, atau hosting file sendiri
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Link berlaku (jam)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.download_expires_hours}
                  onChange={(e) => setForm((f) => ({ ...f, download_expires_hours: e.target.value }))}
                  placeholder="48"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Maks unduhan</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.download_limit}
                  onChange={(e) => setForm((f) => ({ ...f, download_limit: e.target.value }))}
                  placeholder="kosong = tak terbatas"
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>Ukuran file (KB)</Label>
              <Input
                type="number"
                min={0}
                value={form.file_size_kb}
                onChange={(e) => setForm((f) => ({ ...f, file_size_kb: e.target.value }))}
                placeholder="cth: 2048 = 2 MB"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Tipe Lisensi</Label>
              <Select
                value={form.license_type}
                onValueChange={(v) => setForm((f) => ({ ...f, license_type: v }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LICENSE_TYPE_LABEL).map(([k, label]) => (
                    <SelectItem key={k} value={k}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Ditampilkan di halaman unduhan pembeli & tercatat di setiap lisensi
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_available}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_available: v }))}
              />
              <Label>Aktif dijual</Label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Batal
              </Button>
              <Button className="flex-1" onClick={save} disabled={saving}>
                {saving ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Tambah Produk"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
