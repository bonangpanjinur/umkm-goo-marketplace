// ============================================================
// USB Printer Settings Page Component
// Manage WebUSB thermal printer connection + paper size.
// ============================================================

import { useState } from "react";
import { useUsbPrinter } from "@/hooks/use-usb-printer";
import {
  getReceiptPaper,
  setReceiptPaper,
  type ReceiptPaper,
} from "@/lib/receipt-printer";
import { buildReceiptBytes, type ReceiptData } from "@/lib/printer/printReceipt";
import { printerService } from "@/lib/printer/printerService";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Printer,
  Usb,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Wifi,
  WifiOff,
  RefreshCw,
} from "lucide-react";

const STATUS_CONFIG = {
  disconnected: {
    label: "Tidak Terhubung",
    variant: "secondary" as const,
    icon: WifiOff,
    color: "text-gray-500",
  },
  connecting: {
    label: "Menghubungkan...",
    variant: "outline" as const,
    icon: Loader2,
    color: "text-blue-500",
  },
  connected: {
    label: "Terhubung",
    variant: "default" as const,
    icon: CheckCircle2,
    color: "text-green-600",
  },
  printing: {
    label: "Mencetak...",
    variant: "outline" as const,
    icon: Loader2,
    color: "text-blue-500",
  },
  error: {
    label: "Error",
    variant: "destructive" as const,
    icon: XCircle,
    color: "text-red-500",
  },
};

const SAMPLE_RECEIPT: ReceiptData = {
  shopName: "TOKO MAJU JAYA",
  shopAddress: "Jl. Contoh No.123",
  shopPhone: "0812-3456-7890",
  items: [
    { name: "Nasi Goreng Spesial", qty: 1, price: 15000 },
    { name: "Es Teh Manis", qty: 2, price: 5000 },
  ],
  subtotal: 25000,
  total: 25000,
  cash: 50000,
  change: 25000,
  orderId: "TEST-001",
  cashierName: "Admin",
  footer: "Terima kasih atas kunjungan Anda!",
};

export function UsbPrinterSettings() {
  const printer = useUsbPrinter();
  const [paper, setPaper] = useState<ReceiptPaper>(() => getReceiptPaper());
  const [testResult, setTestResult] = useState<"idle" | "printing" | "ok" | "error">("idle");
  const [testError, setTestError] = useState("");

  const statusConf = STATUS_CONFIG[printer.status];
  const StatusIcon = statusConf.icon;

  function handlePaperChange(val: string) {
    const p = val as ReceiptPaper;
    setPaper(p);
    setReceiptPaper(p);
  }

  async function handleTestPrint() {
    if (!printer.isConnected) return;
    setTestResult("printing");
    setTestError("");
    try {
      const bytes = buildReceiptBytes({ ...SAMPLE_RECEIPT, paper });
      await printerService.print(bytes);
      setTestResult("ok");
      setTimeout(() => setTestResult("idle"), 3000);
    } catch (err: any) {
      setTestError(err?.message ?? String(err));
      setTestResult("error");
    }
  }

  return (
    <div className="max-w-lg mx-auto space-y-4 p-4">
      <div className="flex items-center gap-2">
        <Printer className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Pengaturan Printer Thermal</h2>
      </div>

      {/* Support check */}
      {!printer.isSupported && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Browser ini tidak mendukung WebUSB. Gunakan Electron, Chrome, atau Edge versi desktop.
          </AlertDescription>
        </Alert>
      )}

      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Status Printer</CardTitle>
            <Badge variant={statusConf.variant} className="flex items-center gap-1.5">
              <StatusIcon
                className={`h-3.5 w-3.5 ${statusConf.color} ${printer.status === "connecting" || printer.status === "printing" ? "animate-spin" : ""}`}
              />
              {statusConf.label}
            </Badge>
          </div>
          {printer.deviceInfo && (
            <CardDescription className="text-xs">
              <span className="font-medium">{printer.deviceInfo.productName ?? "Printer USB"}</span>
              {printer.deviceInfo.manufacturerName && ` · ${printer.deviceInfo.manufacturerName}`}
              {" · "}VID: 0x{printer.deviceInfo.vendorId.toString(16).toUpperCase().padStart(4, "0")}
              {" / "}PID: 0x{printer.deviceInfo.productId.toString(16).toUpperCase().padStart(4, "0")}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Error display */}
          {printer.lastError && (
            <Alert variant="destructive" className="py-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">{printer.lastError}</AlertDescription>
            </Alert>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {!printer.isConnected ? (
              <>
                <Button
                  onClick={printer.requestDevice}
                  disabled={!printer.isSupported || printer.status === "connecting"}
                  className="gap-2"
                >
                  <Usb className="h-4 w-4" />
                  Pilih Printer USB
                </Button>
                <Button
                  variant="outline"
                  onClick={printer.autoReconnect}
                  disabled={!printer.isSupported || printer.status === "connecting"}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Reconnect
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={printer.disconnect} className="gap-2">
                  <WifiOff className="h-4 w-4" />
                  Putuskan
                </Button>
                <Button
                  variant="outline"
                  onClick={printer.requestDevice}
                  className="gap-2"
                >
                  <Wifi className="h-4 w-4" />
                  Ganti Printer
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Paper size */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Ukuran Kertas</CardTitle>
          <CardDescription>Pilih sesuai printer thermal Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Label htmlFor="paper-select" className="shrink-0">Lebar kertas</Label>
            <Select value={paper} onValueChange={handlePaperChange}>
              <SelectTrigger id="paper-select" className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58">58 mm (32 kolom)</SelectItem>
                <SelectItem value="80">80 mm (48 kolom)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Test print */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Cetak Uji Coba</CardTitle>
          <CardDescription>Cetak struk contoh ke printer yang terhubung</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {testResult === "ok" && (
            <Alert className="py-2 border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-xs text-green-700">
                Berhasil dicetak!
              </AlertDescription>
            </Alert>
          )}
          {testResult === "error" && (
            <Alert variant="destructive" className="py-2">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">{testError}</AlertDescription>
            </Alert>
          )}
          <Button
            onClick={handleTestPrint}
            disabled={!printer.isConnected || testResult === "printing"}
            variant="secondary"
            className="gap-2"
          >
            {testResult === "printing" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Printer className="h-4 w-4" />
            )}
            {testResult === "printing" ? "Mencetak..." : "Cetak Test Print"}
          </Button>
        </CardContent>
      </Card>

      {/* Info */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong>Cara kerja:</strong> Sistem ini menggunakan WebUSB API untuk mengirimkan
            perintah ESC/POS langsung ke printer thermal — tanpa dialog browser, tanpa PDF,
            tanpa popup. Printer akan diingat secara otomatis dan terhubung kembali saat
            aplikasi dibuka ulang.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
