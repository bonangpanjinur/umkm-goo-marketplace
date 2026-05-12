import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useCurrentShop } from "@/lib/use-shop";
import { useTables } from "@/hooks/use-tables";
import { useCurrentOutlet } from "@/lib/use-outlet";
import { QRCodeSVG } from "qrcode.react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  QrCode,
  Printer,
  Download,
  Copy,
  Check,
  Search,
  Grid3X3,
  TableIcon,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/table-qr")({
  component: TableQRPage,
});

function TableQRPage() {
  const { shop } = useCurrentShop();
  const { outlet } = useCurrentOutlet();
  const { data: tables, isLoading } = useTables(outlet?.id || "");
  const [search, setSearch] = useState("");
  const [selectedTable, setSelectedTable] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!shop) return null;

  const baseOrderUrl = `${window.location.origin}/order/${shop.slug}`;

  const filtered = (tables || []).filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  );

  function getTableUrl(tableId: string, tableName: string) {
    return `${baseOrderUrl}?table=${tableId}&tableName=${encodeURIComponent(tableName)}`;
  }

  function copyUrl(tableId: string, tableName: string) {
    navigator.clipboard.writeText(getTableUrl(tableId, tableName));
    setCopiedId(tableId);
    toast.success("Link disalin!");
    setTimeout(() => setCopiedId(null), 2000);
  }

  function printSingle(tableId: string, tableName: string) {
    const url = getTableUrl(tableId, tableName);
    const win = window.open("", "_blank", "width=400,height=600");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Meja — ${tableName}</title>
        <style>
          body { font-family: sans-serif; text-align: center; padding: 20px; }
          .shop-name { font-size: 22px; font-weight: bold; margin-bottom: 4px; }
          .table-name { font-size: 18px; color: #555; margin-bottom: 16px; }
          .qr-wrap { margin: 20px auto; }
          .instruction { font-size: 13px; color: #777; margin-top: 16px; }
          .url { font-size: 10px; color: #aaa; margin-top: 8px; word-break: break-all; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div class="shop-name">${shop!.name}</div>
        <div class="table-name">📍 ${tableName}</div>
        <div class="qr-wrap">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}" width="200" height="200" />
        </div>
        <div class="instruction">Scan QR ini untuk melihat menu dan memesan langsung</div>
        <div class="url">${url}</div>
        <br/>
        <button onclick="window.print()">🖨️ Cetak</button>
      </body>
      </html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  }

  function printAll() {
    const rows = (tables || [])
      .map((t) => {
        const url = getTableUrl(t.id, t.name);
        return `
          <div class="card">
            <div class="shop-name">${shop!.name}</div>
            <div class="table-name">📍 ${t.name}</div>
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(url)}" width="160" height="160" />
            <div class="instruction">Scan untuk memesan</div>
          </div>
        `;
      })
      .join("");

    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR Semua Meja — ${shop!.name}</title>
        <style>
          body { font-family: sans-serif; padding: 10px; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
          .card { border: 1px solid #ddd; border-radius: 8px; padding: 16px; text-align: center; break-inside: avoid; }
          .shop-name { font-size: 14px; font-weight: bold; }
          .table-name { font-size: 13px; color: #555; margin: 4px 0 12px; }
          .instruction { font-size: 11px; color: #999; margin-top: 8px; }
          @media print { button { display: none; } }
        </style>
      </head>
      <body>
        <div style="text-align:center; margin-bottom: 16px;">
          <h2>${shop!.name} — QR Semua Meja</h2>
          <button onclick="window.print()">🖨️ Cetak Semua</button>
        </div>
        <div class="grid">${rows}</div>
      </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <QrCode className="h-6 w-6" />
            QR Code Meja
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pelanggan scan QR → lihat menu → pesan langsung dari meja tanpa perlu panggil pelayan.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={printAll} disabled={!tables?.length}>
            <Printer className="h-4 w-4 mr-2" />
            Cetak Semua
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-4">
        <div className="flex gap-3">
          <QrCode className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Cara pakai QR meja</p>
            <ol className="text-sm text-blue-700 dark:text-blue-400 mt-1 list-decimal list-inside space-y-0.5">
              <li>Cetak QR code per meja dan tempel di meja</li>
              <li>Pelanggan scan QR dengan kamera HP</li>
              <li>Otomatis terbuka menu toko + muncul banner "Meja X"</li>
              <li>Pelanggan pilih menu → pesan → bayar (Cash/QRIS)</li>
              <li>Pesanan masuk ke dashboard & KDS langsung</li>
            </ol>
          </div>
        </div>
      </div>

      {/* URL Base Info */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-xs text-muted-foreground">URL Dasar Order Meja</Label>
          <div className="flex items-center gap-2 mt-1">
            <code className="flex-1 text-xs bg-muted rounded px-3 py-2 font-mono truncate">
              {baseOrderUrl}?table=...
            </code>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(baseOrderUrl);
                toast.success("URL disalin");
              }}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search + Stats */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari meja..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          {filtered.length} meja
        </div>
      </div>

      {/* QR Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-52 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <TableIcon className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="font-medium">Belum ada meja</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tambahkan meja di halaman{" "}
            <a href="/pos-app/tables" className="underline text-primary">
              Manajemen Meja
            </a>{" "}
            terlebih dahulu.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {filtered.map((table) => {
            const url = getTableUrl(table.id, table.name);
            const isCopied = copiedId === table.id;
            return (
              <Card
                key={table.id}
                className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => setSelectedTable({ id: table.id, name: table.name })}
              >
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold truncate">
                      {table.name}
                    </CardTitle>
                    {table.capacity && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {table.capacity} orang
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex justify-center my-2">
                    <div className="bg-white p-2 rounded-lg border">
                      <QRCodeSVG
                        value={url}
                        size={100}
                        level="M"
                        includeMargin={false}
                      />
                    </div>
                  </div>
                  <div className="flex gap-1 mt-3" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs h-8"
                      onClick={() => copyUrl(table.id, table.name)}
                    >
                      {isCopied ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs h-8"
                      onClick={() => printSingle(table.id, table.name)}
                    >
                      <Printer className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 text-xs h-8"
                      onClick={() => setSelectedTable({ id: table.id, name: table.name })}
                    >
                      <Grid3X3 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedTable}
        onOpenChange={(open) => !open && setSelectedTable(null)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              QR — {selectedTable?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedTable && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-xl border-2">
                  <QRCodeSVG
                    value={getTableUrl(selectedTable.id, selectedTable.name)}
                    size={200}
                    level="H"
                    includeMargin={false}
                    imageSettings={{
                      src: "",
                      height: 0,
                      width: 0,
                      excavate: false,
                    }}
                  />
                </div>
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">{shop?.name}</p>
                <p className="text-sm text-muted-foreground">{selectedTable.name}</p>
              </div>
              <div className="rounded-md bg-muted p-2">
                <p className="text-xs font-mono break-all text-center text-muted-foreground">
                  {getTableUrl(selectedTable.id, selectedTable.name)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => copyUrl(selectedTable.id, selectedTable.name)}
                >
                  {copiedId === selectedTable.id ? (
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  Salin Link
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => printSingle(selectedTable.id, selectedTable.name)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Cetak
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
