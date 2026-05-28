// ============================================================
// PrinterTestPage — test print, cash drawer, QR/barcode test
// ============================================================

import { useState } from "react";
import { Printer, CheckCircle2, XCircle, Loader2, DollarSign, QrCode, Barcode, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePrinter } from "@/lib/printer/hooks/usePrinter";
import { EscPosBuilder, buildReceiptBytes, CMD } from "@/lib/printer/escpos/builder";
import { printerManager } from "@/lib/printer/manager/printerManager";
import type { PaperWidth } from "@/lib/printer/types";

type TestStatus = "idle" | "running" | "ok" | "error";

interface TestResult {
  label: string;
  status: TestStatus;
  error?: string;
}

export function PrinterTestPage() {
  const { configs, defaultId } = usePrinter();
  const [selectedId, setSelectedId] = useState<string>(defaultId ?? "");
  const [paper, setPaper] = useState<PaperWidth>("58");
  const [results, setResults] = useState<Record<string, TestResult>>({});

  const selectedConfig = configs.find(c => c.id === selectedId);

  function setResult(key: string, r: TestResult) {
    setResults(prev => ({ ...prev, [key]: r }));
  }

  async function runTest(key: string, label: string, buildData: () => Uint8Array) {
    if (!selectedId) return;
    setResult(key, { label, status: "running" });
    try {
      if (!printerManager.isConnected(selectedId)) {
        await printerManager.connect(selectedId);
      }
      await printerManager.send(selectedId, buildData());
      setResult(key, { label, status: "ok" });
    } catch (err: any) {
      setResult(key, { label, status: "error", error: err?.message ?? String(err) });
    }
  }

  async function testSelfTest() {
    await runTest("selftest", "Self-test print", () =>
      new EscPosBuilder(paper)
        .boldCenter("PRINTER TEST")
        .feed(1)
        .divider()
        .row("Ukuran kertas", `${paper}mm`)
        .row("Tanggal", new Date().toLocaleDateString("id-ID"))
        .row("Waktu", new Date().toLocaleTimeString("id-ID"))
        .divider()
        .center("✓ Printer berfungsi normal")
        .cut()
        .build()
    );
  }

  async function testReceipt() {
    await runTest("receipt", "Contoh struk", () =>
      buildReceiptBytes({
        shopName: "TOKO MAJU JAYA",
        shopAddress: "Jl. Contoh No.123, Jakarta",
        shopPhone: "0812-3456-7890",
        cashierName: "Admin",
        orderId: "TEST-001",
        items: [
          { name: "Nasi Goreng Spesial", qty: 1, price: 15000 },
          { name: "Es Teh Manis", qty: 2, price: 5000 },
          { name: "Ayam Bakar", qty: 1, price: 22000 },
        ],
        subtotal: 47000,
        discount: 2000,
        total: 45000,
        cash: 50000,
        change: 5000,
        footer: "Terima kasih atas kunjungan Anda!",
        paper,
      })
    );
  }

  async function testQrCode() {
    await runTest("qrcode", "QR Code", () =>
      new EscPosBuilder(paper)
        .center("QR Code Test")
        .feed(1)
        .qrCode("https://umkmgo.com/order/TEST-001", 5)
        .center("Scan untuk lihat detail order")
        .cut()
        .build()
    );
  }

  async function testBarcode() {
    await runTest("barcode", "Barcode", () =>
      new EscPosBuilder(paper)
        .center("Barcode Test")
        .feed(1)
        .barcode("ORDER-001-2024", 60)
        .center("ORDER-001-2024")
        .cut()
        .build()
    );
  }

  async function testCashDrawer() {
    await runTest("cashdrawer", "Cash Drawer", () =>
      new EscPosBuilder(paper)
        .openCashDrawer(1)
        .build()
    );
  }

  const tests = [
    { key: "selftest", label: "Self Test Print", icon: Printer, action: testSelfTest, desc: "Cetak halaman tes sederhana" },
    { key: "receipt", label: "Contoh Struk", icon: FileText, action: testReceipt, desc: "Struk lengkap dengan item & total" },
    { key: "qrcode", label: "QR Code", icon: QrCode, action: testQrCode, desc: "Cetak QR code ESC/POS native" },
    { key: "barcode", label: "Barcode", icon: Barcode, action: testBarcode, desc: "Cetak barcode Code128" },
    { key: "cashdrawer", label: "Buka Cash Drawer", icon: DollarSign, action: testCashDrawer, desc: "Kirim pulse ke cash drawer" },
  ];

  return (
    <div className="space-y-4">
      {/* Printer & paper selector */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Printer</Label>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Pilih printer…" />
            </SelectTrigger>
            <SelectContent>
              {configs.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name} · {c.paper}mm</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Kertas</Label>
          <Select value={paper} onValueChange={v => setPaper(v as PaperWidth)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="58">58 mm</SelectItem>
              <SelectItem value="80">80 mm</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {!selectedId && (
        <Alert>
          <AlertDescription className="text-xs">Pilih printer terlebih dahulu untuk menjalankan test.</AlertDescription>
        </Alert>
      )}

      {/* Test buttons */}
      <div className="grid gap-2">
        {tests.map(t => {
          const Icon = t.icon;
          const r = results[t.key];
          return (
            <Card key={t.key} className="overflow-hidden">
              <CardContent className="flex items-center gap-3 p-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.desc}</p>
                  {r?.status === "error" && (
                    <p className="text-xs text-destructive mt-0.5 truncate">{r.error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {r?.status === "ok" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {r?.status === "error" && <XCircle className="h-4 w-4 text-red-500" />}
                  <Button
                    size="sm"
                    variant={r?.status === "error" ? "destructive" : "outline"}
                    className="h-7 text-xs"
                    disabled={!selectedId || r?.status === "running"}
                    onClick={t.action}
                  >
                    {r?.status === "running" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Test"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Selected printer info */}
      {selectedConfig && (
        <Card className="bg-muted/50">
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Info Printer</CardTitle>
          </CardHeader>
          <CardContent className="pb-3 text-xs space-y-1 text-muted-foreground">
            <div className="flex justify-between"><span>Nama</span><span className="font-medium text-foreground">{selectedConfig.name}</span></div>
            <div className="flex justify-between"><span>Koneksi</span><span className="font-medium text-foreground capitalize">{selectedConfig.connectionType}</span></div>
            <div className="flex justify-between"><span>Kertas</span><span className="font-medium text-foreground">{selectedConfig.paper}mm</span></div>
            {selectedConfig.networkHost && <div className="flex justify-between"><span>IP</span><span className="font-medium text-foreground">{selectedConfig.networkHost}:{selectedConfig.networkPort ?? 9100}</span></div>}
            {selectedConfig.baudRate && <div className="flex justify-between"><span>Baud Rate</span><span className="font-medium text-foreground">{selectedConfig.baudRate}</span></div>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
