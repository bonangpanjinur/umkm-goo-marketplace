// ============================================================
// AddPrinterDialog — wizard to configure any printer type
// ============================================================

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Usb, Bluetooth, Network, Terminal, Plus, Loader2, ChevronRight } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { usePrinter } from "@/lib/printer/hooks/usePrinter";
import type { PrinterConnectionType, PaperWidth } from "@/lib/printer/types";

// ── Connection type option ────────────────────────────────────
const CONN_TYPES: { id: PrinterConnectionType; icon: React.FC<{className?: string}>; label: string; desc: string }[] = [
  { id: "usb",       icon: Usb,       label: "USB",          desc: "Printer USB langsung (WebUSB)" },
  { id: "bluetooth", icon: Bluetooth, label: "Bluetooth",     desc: "Printer BT thermal (Web Bluetooth)" },
  { id: "serial",    icon: Terminal,  label: "Serial / COM",  desc: "USB-Serial adapter / COM port" },
  { id: "network",   icon: Network,   label: "LAN / IP",      desc: "Printer jaringan via TCP port 9100" },
];

// ── Zod schema ────────────────────────────────────────────────
const schema = z.object({
  name: z.string().min(1, "Nama printer wajib diisi"),
  paper: z.enum(["58", "80"]),
  isDefault: z.boolean(),
  // network
  networkHost: z.string().optional(),
  networkPort: z.coerce.number().optional(),
  // serial
  baudRate: z.coerce.number().optional(),
});
type FormData = z.infer<typeof schema>;

// ── Component ─────────────────────────────────────────────────
export function AddPrinterDialog({ children }: { children?: React.ReactNode }) {
  const { addPrinter, connect, supported } = usePrinter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"type" | "config">("type");
  const [connType, setConnType] = useState<PrinterConnectionType>("usb");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", paper: "58", isDefault: false, networkPort: 9100, baudRate: 9600 },
  });

  function reset() {
    setStep("type");
    setConnType("usb");
    form.reset();
    setError("");
  }

  async function onSubmit(data: FormData) {
    setSaving(true);
    setError("");
    try {
      const id = addPrinter({
        name: data.name,
        connectionType: connType,
        paper: data.paper as PaperWidth,
        isDefault: data.isDefault,
        networkHost: data.networkHost,
        networkPort: data.networkPort,
        baudRate: data.baudRate,
      });
      // Auto-connect after adding
      try { await connect(id); } catch {}
      setOpen(false);
      reset();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {children ?? (
          <Button size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Tambah Printer
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "type" ? "Pilih Jenis Koneksi" : "Konfigurasi Printer"}
          </DialogTitle>
        </DialogHeader>

        {/* ── Step 1: connection type ── */}
        {step === "type" && (
          <div className="grid grid-cols-2 gap-3 pt-2">
            {CONN_TYPES.map((t) => {
              const Icon = t.icon;
              const sup = t.id === "network" ? true : supported[t.id as keyof typeof supported];
              return (
                <button
                  key={t.id}
                  disabled={!sup}
                  onClick={() => { setConnType(t.id); setStep("config"); }}
                  className={`flex flex-col gap-2 rounded-xl border-2 p-4 text-left transition-all hover:border-primary hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-40 ${connType === t.id ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <Icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{t.label}</span>
                  <span className="text-[11px] text-muted-foreground leading-snug">{t.desc}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── Step 2: config form ── */}
        {step === "config" && (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nama Printer</Label>
              <Input id="name" placeholder="Kasir Utama" {...form.register("name")} />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-1 space-y-1.5">
                <Label>Ukuran Kertas</Label>
                <Select defaultValue="58" onValueChange={v => form.setValue("paper", v as PaperWidth)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58">58 mm</SelectItem>
                    <SelectItem value="80">80 mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1.5">
                <Label>Jadikan Default</Label>
                <div className="flex h-9 items-center">
                  <Switch
                    checked={form.watch("isDefault")}
                    onCheckedChange={v => form.setValue("isDefault", v)}
                  />
                </div>
              </div>
            </div>

            {/* Network-specific fields */}
            {connType === "network" && (
              <div className="flex gap-3">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="host">Alamat IP</Label>
                  <Input id="host" placeholder="192.168.1.100" {...form.register("networkHost")} />
                </div>
                <div className="w-24 space-y-1.5">
                  <Label htmlFor="port">Port</Label>
                  <Input id="port" placeholder="9100" {...form.register("networkPort")} />
                </div>
              </div>
            )}

            {/* Serial-specific fields */}
            {connType === "serial" && (
              <div className="space-y-1.5">
                <Label htmlFor="baud">Baud Rate</Label>
                <Select defaultValue="9600" onValueChange={v => form.setValue("baudRate", Number(v))}>
                  <SelectTrigger id="baud"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[9600, 19200, 38400, 57600, 115200].map(b => (
                      <SelectItem key={b} value={String(b)}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Printer thermal umumnya 9600. Klik "Simpan" untuk memilih port dari dialog browser.
                </p>
              </div>
            )}

            {connType === "usb" && (
              <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                Klik "Simpan" untuk memilih printer USB dari dialog browser. Pilih hanya sekali — koneksi otomatis diingat.
              </p>
            )}

            {connType === "bluetooth" && (
              <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                Klik "Simpan" untuk memilih printer Bluetooth dari dialog browser. Pastikan printer sudah di-pair via Windows Settings.
              </p>
            )}

            {error && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>
            )}

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setStep("type")}>
                Kembali
              </Button>
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Simpan & Hubungkan
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
