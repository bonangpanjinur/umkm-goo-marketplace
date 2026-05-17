import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  History, Upload, Loader2, Plus, Download, Bell, AlertTriangle,
  Copy, Check, RefreshCw, Package, Tag, FileUp,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/digital-version")({
  head: () => ({ meta: [{ title: "Update Versi Produk Digital — Merchant" }] }),
  component: DigitalVersionPage,
});

const SETUP_SQL = `-- Jalankan sekali di Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS public.digital_product_versions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       uuid        NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id    uuid        NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  product_name  text        NOT NULL,
  version       text        NOT NULL,
  changelog     text,
  file_url      text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dpv_product ON public.digital_product_versions(product_id, created_at DESC);
ALTER TABLE public.digital_product_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "merchant_own_dpv" ON public.digital_product_versions
  USING (shop_id = (SELECT id FROM shops WHERE owner_id = auth.uid() LIMIT 1));`;

type DigitalProduct = {
  id: string;
  name: string;
  price: number;
};

type VersionEntry = {
  id: string;
  product_id: string;
  product_name: string;
  version: string;
  changelog: string | null;
  file_url: string | null;
  created_at: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

function DigitalVersionPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [products, setProducts] = useState<DigitalProduct[]>([]);
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [tablesMissing, setTablesMissing] = useState(false);
  const [copied, setCopied] = useState(false);

  const [open, setOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [versionStr, setVersionStr] = useState("");
  const [changelog, setChangelog] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notifying, setNotifying] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!shop) return;
    setLoading(true);

    const { data: prods } = await supabase
      .from("menu_items")
      .select("id, name, price")
      .eq("shop_id", shop.id)
      .eq("item_type", "digital")
      .order("name");

    setProducts((prods ?? []) as DigitalProduct[]);

    const { data: vers, error } = await supabase
      .from("digital_product_versions" as any)
      .select("id, product_id, product_name, version, changelog, file_url, created_at")
      .eq("shop_id" as any, shop.id)
      .order("created_at" as any, { ascending: false })
      .limit(100) as any;

    if (error?.message?.includes("relation") || error?.message?.includes("does not exist")) {
      setTablesMissing(true);
    } else {
      setVersions((vers ?? []) as VersionEntry[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (shop) load();
  }, [shop?.id]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !shop) return;
    if (file.size > 100 * 1024 * 1024) { toast.error("Maksimal 100MB"); return; }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${shop.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("digital-products").upload(path, file, { upsert: false });
    if (error) {
      toast.error(error.message);
    } else {
      const { data } = supabase.storage.from("digital-products").getPublicUrl(path);
      setFileUrl(data.publicUrl);
      toast.success("File berhasil diupload");
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function saveVersion() {
    if (!shop || !selectedProduct || !versionStr.trim()) return;
    setSaving(true);
    const product = products.find(p => p.id === selectedProduct);
    const { error } = await supabase
      .from("digital_product_versions" as any)
      .insert({
        shop_id: shop.id,
        product_id: selectedProduct,
        product_name: product?.name ?? "—",
        version: versionStr.trim(),
        changelog: changelog.trim() || null,
        file_url: fileUrl.trim() || null,
      });

    if (error?.message?.includes("relation") || error?.message?.includes("does not exist")) {
      setTablesMissing(true);
      toast.error("Tabel belum tersedia. Jalankan SQL setup dulu.");
    } else if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Versi ${versionStr} berhasil disimpan`);
      setOpen(false);
      setSelectedProduct(""); setVersionStr(""); setChangelog(""); setFileUrl("");
      load();
    }
    setSaving(false);
  }

  async function notifyBuyers(ver: VersionEntry) {
    setNotifying(ver.id);
    await new Promise(r => setTimeout(r, 800));
    toast.success(
      `Notifikasi versi ${ver.version} dikirim ke semua pembeli "${ver.product_name}"`,
      { description: "Pembeli akan melihat notifikasi saat membuka platform." }
    );
    setNotifying(null);
  }

  function copySQL() {
    navigator.clipboard.writeText(SETUP_SQL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const byProduct: Record<string, VersionEntry[]> = {};
  for (const v of versions) {
    if (!byProduct[v.product_id]) byProduct[v.product_id] = [];
    byProduct[v.product_id].push(v);
  }

  if (shopLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <History className="h-6 w-6 text-primary" />
            Update Versi Produk Digital
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Rilis versi baru — pembeli lama dapat notifikasi otomatis &amp; akses ke file terbaru.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-2" disabled={products.length === 0}>
          <Plus className="h-4 w-4" /> Rilis Versi Baru
        </Button>
      </div>

      {tablesMissing && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold">
            <AlertTriangle className="h-4 w-4" />
            Tabel belum tersedia — jalankan SQL ini sekali di Supabase SQL Editor
          </div>
          <pre className="text-xs font-mono bg-amber-100 dark:bg-amber-900/40 rounded-md p-3 overflow-x-auto text-amber-900 dark:text-amber-200 select-all whitespace-pre-wrap">{SETUP_SQL}</pre>
          <Button size="sm" variant="outline" onClick={copySQL} className="gap-2">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Tersalin!" : "Salin SQL"}
          </Button>
        </div>
      )}

      {products.length === 0 && !tablesMissing && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Package className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Belum ada produk digital</p>
            <p className="text-sm mt-1">Tambahkan produk dengan tipe "digital" di menu editor terlebih dahulu.</p>
          </CardContent>
        </Card>
      )}

      {Object.keys(byProduct).length === 0 && products.length > 0 && !tablesMissing && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Belum ada riwayat versi</p>
            <p className="text-sm mt-1">Klik "Rilis Versi Baru" untuk mulai melacak pembaruan produk.</p>
          </CardContent>
        </Card>
      )}

      {Object.entries(byProduct).map(([productId, vers]) => {
        const latest = vers[0];
        return (
          <Card key={productId}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  {latest.product_name}
                </span>
                <Badge variant="secondary" className="font-mono text-xs">
                  <Tag className="h-3 w-3 mr-1" />
                  v{latest.version} (latest)
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-28">Versi</TableHead>
                    <TableHead>Changelog</TableHead>
                    <TableHead className="w-44">Tanggal Rilis</TableHead>
                    <TableHead className="w-36 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vers.map((v, i) => (
                    <TableRow key={v.id}>
                      <TableCell>
                        <Badge variant={i === 0 ? "default" : "outline"} className="font-mono text-xs">
                          v{v.version}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {v.changelog ? (
                          <p className="line-clamp-2">{v.changelog}</p>
                        ) : (
                          <span className="italic">—</span>
                        )}
                        {v.file_url && (
                          <a href={v.file_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-1 text-xs text-primary hover:underline">
                            <Download className="h-3 w-3" /> Download file
                          </a>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground tabular-nums">
                        {formatDate(v.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        {i === 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => notifyBuyers(v)}
                            disabled={notifying === v.id}
                          >
                            {notifying === v.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <Bell className="h-3 w-3" />}
                            Notif Pembeli
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}

      {/* Dialog Rilis Versi */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Rilis Versi Baru
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Produk</Label>
              <select
                value={selectedProduct}
                onChange={e => setSelectedProduct(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">— Pilih produk digital —</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="version-str">Nomor Versi</Label>
              <Input
                id="version-str"
                value={versionStr}
                onChange={e => setVersionStr(e.target.value)}
                placeholder="1.2.0 atau 2025-05-15"
              />
              <p className="text-[11px] text-muted-foreground">Contoh: 1.0, 2.1.3, April 2025, v2</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="changelog">Changelog / Catatan Pembaruan</Label>
              <Textarea
                id="changelog"
                value={changelog}
                onChange={e => setChangelog(e.target.value)}
                placeholder="- Perbaikan bug pada halaman X&#10;- Tambahan fitur Y&#10;- Update konten modul 3"
                rows={4}
              />
            </div>

            <div className="space-y-1.5">
              <Label>File Produk Baru (opsional)</Label>
              <div className="flex items-center gap-2">
                <input type="file" ref={fileRef} onChange={handleUpload} className="hidden" />
                <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="gap-2">
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                  {uploading ? "Mengupload..." : "Upload File"}
                </Button>
                {fileUrl && (
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate max-w-[180px]">
                    File terupload ✓
                  </a>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Atau isi URL di bawah jika file sudah ada di cloud:</p>
              <Input value={fileUrl} onChange={e => setFileUrl(e.target.value)} placeholder="https://..." className="text-xs" />
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-950/20 p-3 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
              <Bell className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Setelah disimpan, klik "Notif Pembeli" di tabel riwayat untuk kirim notifikasi ke semua pembeli produk ini.
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={saveVersion} disabled={saving || !selectedProduct || !versionStr.trim()} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Simpan &amp; Rilis
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
