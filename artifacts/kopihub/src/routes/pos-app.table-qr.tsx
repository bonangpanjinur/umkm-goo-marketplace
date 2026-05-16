import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useCurrentShop } from "@/lib/use-shop";
import { useTables } from "@/hooks/use-tables";
import { useOutletContext } from "@/lib/outlet-context";
import { QRCodeSVG } from "qrcode.react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  QrCode,
  Printer,
  Copy,
  Check,
  Search,
  TableIcon,
  FileDown,
  FolderArchive,
  ExternalLink,
  Globe,
  PlayCircle,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/table-qr")({
  component: TableQRPage,
});

type DomainOption = {
  key: string;
  label: string;
  origin: string;
  verified: boolean;
  isCustom: boolean;
};

function TableQRPage() {
  const { shop } = useCurrentShop();
  const { current: outlet, outlets, setCurrent: setOutlet } = useOutletContext();
  const outletActive = !!(outlet as any)?.is_active;
  const { data: rawTables, isLoading } = useTables(outlet?.id || "");
  // Only allow QR for ACTIVE tables on ACTIVE outlets — never expose inactive ones.
  const tables = useMemo(
    () => outletActive
      ? (rawTables || []).filter((t: any) => t?.is_active !== false)
      : [],
    [rawTables, outletActive],
  );
  const [search, setSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState<{ id: string; name: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [domainOptions, setDomainOptions] = useState<DomainOption[]>([]);
  const [selectedDomainKey, setSelectedDomainKey] = useState<string>("");
  const [downloading, setDownloading] = useState<"pdf" | "zip" | null>(null);

  // Fetch domain info (custom_domain) since useCurrentShop doesn't include it
  useEffect(() => {
    if (!shop?.id) return;
    (async () => {
      const { data } = await supabase
        .from("coffee_shops")
        .select("custom_domain, custom_domain_verified_at")
        .eq("id", shop.id)
        .maybeSingle();
      const opts: DomainOption[] = [];
      if (data?.custom_domain) {
        opts.push({
          key: "custom",
          label: data.custom_domain,
          origin: `https://${data.custom_domain}`,
          verified: !!data.custom_domain_verified_at,
          isCustom: true,
        });
      }
      opts.push({
        key: "default",
        label: window.location.host,
        origin: window.location.origin,
        verified: true,
        isCustom: false,
      });
      setDomainOptions(opts);
      // Default: prefer verified custom domain
      const verifiedCustom = opts.find((o) => o.isCustom && o.verified);
      setSelectedDomainKey(verifiedCustom ? "custom" : "default");
    })();
  }, [shop?.id]);

  const selectedDomain = domainOptions.find((o) => o.key === selectedDomainKey) ?? domainOptions[0];

  const baseOrderUrl = useMemo(() => {
    if (!shop || !selectedDomain) return "";
    return `${selectedDomain.origin}/s/${shop.slug}`;
  }, [shop, selectedDomain]);

  const filtered = (tables || []).filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  function getTableUrl(tableId: string, tableName: string) {
    if (!outlet?.id || !tableId) return "";
    return `${baseOrderUrl}?table=${encodeURIComponent(tableId)}&tableName=${encodeURIComponent(tableName)}`;
  }

  function copyUrl(tableId: string, tableName: string) {
    if (!outletActive) { toast.error("Outlet non-aktif — tidak boleh membuat QR."); return; }
    const t = (rawTables || []).find((x: any) => x.id === tableId);
    if (t && t.is_active === false) { toast.error("Meja non-aktif — tidak boleh membuat QR."); return; }
    navigator.clipboard.writeText(getTableUrl(tableId, tableName));
    setCopiedId(tableId);
    toast.success("Link disalin!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  // ---- Download all as PDF (4 per A4 page) ----
  async function downloadPdfAll() {
    if (!tables?.length || !shop) return;
    if (!outletActive) { toast.error("Outlet non-aktif — tidak boleh membuat QR."); return; }
    setDownloading("pdf");
    try {
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageW = 210;
      const pageH = 297;
      const cols = 2;
      const rows = 2;
      const cardW = (pageW - 30) / cols; // 90mm
      const cardH = (pageH - 30) / rows; // ~133mm
      const marginX = 10;
      const marginY = 10;
      const qrSizeMm = 70;

      for (let i = 0; i < tables.length; i++) {
        const idx = i % (cols * rows);
        if (i > 0 && idx === 0) pdf.addPage();
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = marginX + col * (cardW + 5);
        const y = marginY + row * (cardH + 5);

        // Card border
        pdf.setDrawColor(220);
        pdf.roundedRect(x, y, cardW, cardH, 3, 3);

        // Shop name
        pdf.setFontSize(14);
        pdf.setFont("helvetica", "bold");
        pdf.text(shop.name, x + cardW / 2, y + 12, { align: "center" });

        // Table name
        pdf.setFontSize(20);
        pdf.text(tables[i].name, x + cardW / 2, y + 24, { align: "center" });

        // QR code (PNG data URL)
        const url = getTableUrl(tables[i].id, tables[i].name);
        const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 1 });
        const qrX = x + (cardW - qrSizeMm) / 2;
        pdf.addImage(dataUrl, "PNG", qrX, y + 32, qrSizeMm, qrSizeMm);

        // Instruction
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(90);
        pdf.text("Scan untuk lihat menu & pesan", x + cardW / 2, y + 32 + qrSizeMm + 8, { align: "center" });
        pdf.setFontSize(7);
        pdf.setTextColor(150);
        const shortUrl = url.length > 55 ? url.slice(0, 52) + "…" : url;
        pdf.text(shortUrl, x + cardW / 2, y + 32 + qrSizeMm + 14, { align: "center" });
        pdf.setTextColor(0);
      }
      pdf.save(`qr-meja-${shop.slug}.pdf`);
      toast.success(`PDF berisi ${tables.length} QR berhasil diunduh`);
    } catch (e) {
      console.error(e);
      toast.error("Gagal membuat PDF");
    } finally {
      setDownloading(null);
    }
  }

  // ---- Download all as ZIP of PNGs ----
  async function downloadZipAll() {
    if (!tables?.length || !shop) return;
    if (!outletActive) { toast.error("Outlet non-aktif — tidak boleh membuat QR."); return; }
    setDownloading("zip");
    try {
      const zip = new JSZip();
      const folder = zip.folder(`qr-meja-${shop.slug}`)!;
      for (const t of tables) {
        const url = getTableUrl(t.id, t.name);
        const dataUrl = await QRCode.toDataURL(url, { width: 600, margin: 2 });
        const base64 = dataUrl.split(",")[1];
        const safeName = t.name.replace(/[^\w-]+/g, "_");
        folder.file(`${safeName}.png`, base64, { base64: true });
      }
      // Also include a CSV mapping
      const csv = ["table_name,url", ...tables.map((t) => `"${t.name}","${getTableUrl(t.id, t.name)}"`)].join("\n");
      folder.file("daftar-link.csv", csv);
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `qr-meja-${shop.slug}.zip`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success(`ZIP berisi ${tables.length} QR berhasil diunduh`);
    } catch (e) {
      console.error(e);
      toast.error("Gagal membuat ZIP");
    } finally {
      setDownloading(null);
    }
  }

  function printSingle(tableId: string, tableName: string) {
    if (!outletActive) { toast.error("Outlet non-aktif — tidak boleh membuat QR."); return; }
    const t = (rawTables || []).find((x: any) => x.id === tableId);
    if (t && t.is_active === false) { toast.error("Meja non-aktif — tidak boleh membuat QR."); return; }
    const url = getTableUrl(tableId, tableName);
    const win = window.open("", "_blank", "width=420,height=620");
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><title>QR ${tableName}</title>
      <style>body{font-family:sans-serif;text-align:center;padding:24px}
      .s{font-size:22px;font-weight:bold}.t{font-size:32px;margin:8px 0 16px}
      .h{font-size:12px;color:#666;margin-top:12px}.u{font-size:9px;color:#aaa;margin-top:6px;word-break:break-all}
      @media print{button{display:none}}</style></head><body>
      <div class="s">${shop!.name}</div><div class="t">${tableName}</div>
      <img src="https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(url)}" width="260" height="260"/>
      <div class="h">Scan untuk lihat menu & pesan</div><div class="u">${url}</div>
      <br/><button onclick="window.print()">🖨️ Cetak</button></body></html>`);
    win.document.close();
    setTimeout(() => win.print(), 600);
  }

  if (!shop) return null;

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            QR Code Meja
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Cetak QR & tempel di meja. Pelanggan scan → otomatis masuk ke menu toko Anda dengan nomor meja terisi.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadPdfAll} disabled={!tables?.length || !!downloading}>
            {downloading === "pdf" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileDown className="h-4 w-4 mr-2" />}
            Unduh PDF Semua
          </Button>
          <Button variant="outline" onClick={downloadZipAll} disabled={!tables?.length || !!downloading}>
            {downloading === "zip" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FolderArchive className="h-4 w-4 mr-2" />}
            Unduh ZIP (PNG)
          </Button>
        </div>
      </div>

      {/* Domain & Outlet selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Globe className="h-4 w-4" /> Pengaturan Link QR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs">Domain Toko</Label>
              <Select value={selectedDomainKey} onValueChange={setSelectedDomainKey}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih domain" />
                </SelectTrigger>
                <SelectContent>
                  {domainOptions.map((o) => (
                    <SelectItem key={o.key} value={o.key}>
                      <div className="flex items-center gap-2">
                        {o.isCustom ? (
                          o.verified ? (
                            <Badge variant="default" className="text-[10px] bg-emerald-600">Custom ✓</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">Belum verif</Badge>
                          )
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Default</Badge>
                        )}
                        <span className="text-xs">{o.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedDomain?.isCustom && !selectedDomain.verified && (
                <p className="text-[11px] text-amber-600 mt-1">
                  Domain custom belum terverifikasi — QR mungkin belum bisa dibuka pelanggan.
                </p>
              )}
              {!domainOptions.some((o) => o.isCustom) && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Belum ada custom domain. <a href="/pos-app/domain" className="underline">Tambah custom domain</a> agar QR pakai brand toko Anda.
                </p>
              )}
            </div>
            <div>
              <Label className="text-xs">Outlet</Label>
              <Select
                value={outlet?.id || ""}
                onValueChange={(id) => {
                  const next = outlets.find((o) => o.id === id);
                  if (next) setOutlet(next);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Pilih outlet" />
                </SelectTrigger>
                <SelectContent>
                  {outlets
                    .filter((o) => (o as any).is_active !== false)
                    .map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {!outletActive && (
                <p className="text-[11px] text-red-600 mt-1">
                  Outlet ini non-aktif. QR tidak bisa dibuat sampai outlet diaktifkan kembali.
                </p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs">Preview Link Dasar</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 text-xs bg-muted rounded px-3 py-2 font-mono truncate">
                {baseOrderUrl}?table=…
              </code>
              <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(baseOrderUrl); toast.success("Disalin"); }}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" asChild>
                <a href={baseOrderUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test E2E */}
      <TestE2EPanel
        shopId={shop.id}
        outletId={outlet?.id || ""}
        sampleUrl={tables?.[0] ? getTableUrl(tables[0].id, tables[0].name) : baseOrderUrl}
        sampleTableId={tables?.[0]?.id || ""}
        sampleTableName={tables?.[0]?.name || ""}
      />

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari meja..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="text-sm text-muted-foreground">{filtered.length} meja</div>
      </div>

      {/* QR grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-52 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <TableIcon className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="font-medium">Belum ada meja</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tambahkan dulu di <a href="/pos-app/tables" className="underline text-primary">Manajemen Meja</a>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((table) => {
            const url = getTableUrl(table.id, table.name);
            const isCopied = copiedId === table.id;
            return (
              <Card key={table.id} className="overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold truncate">{table.name}</CardTitle>
                    {table.capacity && <Badge variant="secondary" className="text-xs shrink-0">{table.capacity} org</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex justify-center my-2 cursor-pointer" onClick={() => setSelectedTable({ id: table.id, name: table.name })}>
                    <div className="bg-white p-2 rounded-lg border">
                      <QRCodeSVG value={url} size={100} level="M" />
                    </div>
                  </div>
                  <div className="flex gap-1 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => copyUrl(table.id, table.name)} title="Salin link">
                      {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => window.open(url, "_blank")} title="Buka link">
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 h-8" onClick={() => printSingle(table.id, table.name)} title="Cetak">
                      <Printer className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selectedTable} onOpenChange={(open) => !open && setSelectedTable(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" /> QR — {selectedTable?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedTable && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-xl border-2">
                  <QRCodeSVG value={getTableUrl(selectedTable.id, selectedTable.name)} size={200} level="H" />
                </div>
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">{shop.name}</p>
                <p className="text-sm text-muted-foreground">{selectedTable.name}</p>
              </div>
              <div className="rounded-md bg-muted p-2">
                <p className="text-xs font-mono break-all text-center text-muted-foreground">
                  {getTableUrl(selectedTable.id, selectedTable.name)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => copyUrl(selectedTable.id, selectedTable.name)}>
                  {copiedId === selectedTable.id ? <Check className="h-4 w-4 mr-2 text-green-600" /> : <Copy className="h-4 w-4 mr-2" />}
                  Salin
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => window.open(getTableUrl(selectedTable.id, selectedTable.name), "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-2" /> Buka
                </Button>
                <Button className="flex-1" onClick={() => printSingle(selectedTable.id, selectedTable.name)}>
                  <Printer className="h-4 w-4 mr-2" /> Cetak
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =================================================================
// Test E2E Panel — open the QR link, then poll orders for that table
// =================================================================
type TestStatus =
  | { state: "idle" }
  | { state: "waiting"; startedAt: number; tableId: string }
  | { state: "ok"; orderNo: string; tableName: string }
  | { state: "timeout" }
  | { state: "no-tables" };

function TestE2EPanel({
  shopId,
  outletId,
  sampleUrl,
  sampleTableId,
  sampleTableName,
}: {
  shopId: string;
  outletId: string;
  sampleUrl: string;
  sampleTableId: string;
  sampleTableName: string;
}) {
  const [status, setStatus] = useState<TestStatus>({ state: "idle" });
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    if (status.state !== "waiting") return;
    const TIMEOUT_MS = 5 * 60 * 1000;
    const tick = setInterval(() => {
      const elapsed = Date.now() - status.startedAt;
      setSecondsLeft(Math.max(0, Math.ceil((TIMEOUT_MS - elapsed) / 1000)));
      if (elapsed >= TIMEOUT_MS) {
        setStatus({ state: "timeout" });
        clearInterval(tick);
      }
    }, 1000);

    const poll = setInterval(async () => {
      try {
        const since = new Date(status.startedAt).toISOString();
        const { data } = await supabase
          .from("orders")
          .select("order_no, note, created_at")
          .eq("shop_id", shopId)
          .gte("created_at", since)
          .order("created_at", { ascending: false })
          .limit(1);
        if (data && data.length > 0) {
          setStatus({
            state: "ok",
            orderNo: data[0].order_no || "—",
            tableName: (data[0].note && /meja/i.test(data[0].note)) ? data[0].note : sampleTableName,
          });
          clearInterval(poll);
          clearInterval(tick);
        }
      } catch {}
    }, 4000);

    return () => { clearInterval(poll); clearInterval(tick); };
  }, [status, shopId, sampleTableName]);

  function start() {
    if (!sampleTableId) {
      setStatus({ state: "no-tables" });
      return;
    }
    setStatus({ state: "waiting", startedAt: Date.now(), tableId: sampleTableId });
    window.open(sampleUrl, "_blank", "noopener");
  }

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <PlayCircle className="h-4 w-4" /> Mode Pengujian End-to-End
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Tes alur: scan/buka QR → masuk halaman pesan → buat order → sistem memverifikasi pesanan masuk dengan nomor meja yang benar.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={start} disabled={status.state === "waiting"}>
            {status.state === "waiting" ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
            {status.state === "waiting" ? "Menunggu order…" : "Mulai Tes"}
          </Button>
          {status.state === "waiting" && (
            <Button size="sm" variant="ghost" onClick={() => setStatus({ state: "idle" })}>Batal</Button>
          )}
          {sampleTableName && (
            <span className="text-xs text-muted-foreground">Memakai meja sampel: <b>{sampleTableName}</b></span>
          )}
        </div>

        {status.state === "no-tables" && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded p-2">
            <XCircle className="h-4 w-4" /> Tambah minimal 1 meja dulu untuk menjalankan tes.
          </div>
        )}
        {status.state === "waiting" && (
          <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 dark:bg-blue-950/30 rounded p-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Menunggu order baru dari meja <b>{sampleTableName}</b>… ({secondsLeft}s tersisa)
          </div>
        )}
        {status.state === "ok" && (
          <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 rounded p-2">
            <CheckCircle2 className="h-4 w-4" />
            Berhasil! Order <b>#{status.orderNo}</b> dari <b>{status.tableName}</b> diterima — QR meja Anda terhubung dengan benar.
          </div>
        )}
        {status.state === "timeout" && (
          <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 dark:bg-red-950/30 rounded p-2">
            <XCircle className="h-4 w-4" />
            Tidak ada order dalam 5 menit. Pastikan halaman pesan terbuka di domain yang benar dan order benar-benar dibuat.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
