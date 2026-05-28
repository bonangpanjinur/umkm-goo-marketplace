// ============================================================
// PrinterCard — shows status, name, type, and actions
// ============================================================

import { useState } from "react";
import {
  Wifi, WifiOff, Usb, Bluetooth, Network, Terminal,
  Star, StarOff, Trash2, RefreshCw, Loader2, CheckCircle2,
  XCircle, AlertCircle, Printer,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { usePrinter } from "@/lib/printer/hooks/usePrinter";
import type { PrinterConfig, PrinterDevice } from "@/lib/printer/types";

// ── Icons per connection type ─────────────────────────────────
const TYPE_ICON: Record<string, React.FC<{ className?: string }>> = {
  usb: Usb,
  bluetooth: Bluetooth,
  network: Network,
  serial: Terminal,
};
const TYPE_LABEL: Record<string, string> = {
  usb: "USB",
  bluetooth: "Bluetooth",
  network: "LAN/IP",
  serial: "Serial/COM",
};

// ── Status config ─────────────────────────────────────────────
const STATUS_MAP = {
  disconnected: { label: "Tidak Terhubung", icon: WifiOff, color: "text-gray-400", badge: "secondary" },
  connecting:   { label: "Menghubungkan…",  icon: Loader2,  color: "text-blue-500 animate-spin", badge: "outline" },
  connected:    { label: "Terhubung",        icon: CheckCircle2, color: "text-green-500", badge: "default" },
  printing:     { label: "Mencetak…",        icon: Loader2,  color: "text-blue-500 animate-spin", badge: "outline" },
  error:        { label: "Error",            icon: XCircle,  color: "text-red-500", badge: "destructive" },
  offline:      { label: "Offline",          icon: AlertCircle, color: "text-yellow-500", badge: "outline" },
} as const;

// ── Props ─────────────────────────────────────────────────────
interface PrinterCardProps {
  config: PrinterConfig;
  device?: PrinterDevice;
  isDefault: boolean;
}

export function PrinterCard({ config, device, isDefault }: PrinterCardProps) {
  const { connect, disconnect, setDefault, removePrinter } = usePrinter();
  const [loading, setLoading] = useState(false);

  const status = device?.status ?? "disconnected";
  const statusConf = STATUS_MAP[status] ?? STATUS_MAP.disconnected;
  const StatusIcon = statusConf.icon;
  const TypeIcon = TYPE_ICON[config.connectionType] ?? Printer;
  const isConnected = status === "connected" || status === "printing";

  async function handleToggle() {
    setLoading(true);
    try {
      if (isConnected) await disconnect(config.id);
      else await connect(config.id);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className={`transition-all ${isDefault ? "ring-2 ring-primary/60" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${isConnected ? "border-green-200 bg-green-50" : "border-border bg-muted"}`}>
            <TypeIcon className={`h-4 w-4 ${isConnected ? "text-green-600" : "text-muted-foreground"}`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">{config.name}</span>
              {isDefault && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Default</Badge>
              )}
              <Badge variant={statusConf.badge as any} className="text-[10px] h-4 px-1.5 gap-1">
                <StatusIcon className={`h-2.5 w-2.5 ${statusConf.color}`} />
                {statusConf.label}
              </Badge>
            </div>

            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span>{TYPE_LABEL[config.connectionType]}</span>
              <span>·</span>
              <span>{config.paper}mm</span>
              {config.networkHost && <><span>·</span><span>{config.networkHost}:{config.networkPort ?? 9100}</span></>}
              {config.serialPort && <><span>·</span><span>{config.serialPort}</span></>}
            </div>

            {device?.lastError && (
              <p className="mt-1 text-xs text-red-500 truncate">{device.lastError}</p>
            )}

            {device?.lastPrintAt && (
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                Terakhir cetak: {new Date(device.lastPrintAt).toLocaleTimeString("id-ID")}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Default toggle */}
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7"
              title={isDefault ? "Printer default" : "Jadikan default"}
              onClick={() => !isDefault && setDefault(config.id)}
            >
              {isDefault
                ? <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-400" />
                : <StarOff className="h-3.5 w-3.5 text-muted-foreground" />
              }
            </Button>

            {/* Connect / disconnect */}
            <Button
              variant={isConnected ? "outline" : "default"}
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={handleToggle}
              disabled={loading || status === "connecting"}
            >
              {loading || status === "connecting"
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : isConnected ? <WifiOff className="h-3 w-3" /> : <Wifi className="h-3 w-3" />
              }
              {isConnected ? "Putus" : "Hubungkan"}
            </Button>

            {/* Reconnect shortcut */}
            {status === "error" && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => connect(config.id)}>
                <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}

            {/* Delete */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus printer?</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{config.name}" akan dihapus dari daftar printer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => removePrinter(config.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
