// ============================================================
// PrinterSettingsPage — full printer management UI
// Shows all configured printers, add/remove, queue monitoring.
// ============================================================

import { useEffect } from "react";
import { Printer, ScanSearch, Loader2, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PrinterCard } from "./PrinterCard";
import { AddPrinterDialog } from "./AddPrinterDialog";
import { PrinterTestPage } from "./PrinterTestPage";
import { usePrinter } from "@/lib/printer/hooks/usePrinter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function PrinterSettingsPage() {
  const {
    configs, devices, jobs, defaultId,
    scan, isScanning, discovered,
    clearCompleted,
  } = usePrinter();

  // Auto-connect on mount
  useEffect(() => {
    // Silent — just attempts reconnect; errors surface per-card
    import("@/lib/printer/manager/printerManager").then(({ printerManager }) =>
      printerManager.autoConnectAll().catch(() => {})
    );
  }, []);

  const pendingJobs = jobs.filter(j => j.status === "pending" || j.status === "printing");
  const completedJobs = jobs.filter(j => j.status === "done" || j.status === "failed" || j.status === "cancelled");

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Printer className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-base font-semibold leading-tight">Printer Thermal</h1>
            <p className="text-xs text-muted-foreground">{configs.length} printer dikonfigurasi</p>
          </div>
        </div>
        <AddPrinterDialog />
      </div>

      <Tabs defaultValue="printers">
        <TabsList className="w-full">
          <TabsTrigger value="printers" className="flex-1">Printer</TabsTrigger>
          <TabsTrigger value="test" className="flex-1">Test Print</TabsTrigger>
          <TabsTrigger value="queue" className="flex-1 gap-1.5">
            Antrian
            {pendingJobs.length > 0 && (
              <Badge variant="destructive" className="h-4 w-4 p-0 flex items-center justify-center text-[9px]">
                {pendingJobs.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Printers tab ── */}
        <TabsContent value="printers" className="mt-4 space-y-3">
          {configs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border py-14 text-center">
              <Printer className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium">Belum ada printer</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Tambahkan printer thermal untuk mulai mencetak struk.</p>
              </div>
              <AddPrinterDialog>
                <Button size="sm">Tambah Printer Pertama</Button>
              </AddPrinterDialog>
            </div>
          ) : (
            configs.map(cfg => (
              <PrinterCard
                key={cfg.id}
                config={cfg}
                device={devices.find(d => d.id === cfg.id)}
                isDefault={cfg.id === defaultId}
              />
            ))
          )}

          {/* Discovery */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Deteksi Otomatis</p>
              <Button variant="outline" size="sm" className="gap-1.5 h-7 text-xs" onClick={scan} disabled={isScanning}>
                {isScanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ScanSearch className="h-3.5 w-3.5" />}
                {isScanning ? "Mencari…" : "Scan Printer"}
              </Button>
            </div>
            {discovered.length > 0 && (
              <div className="space-y-2">
                {discovered.map(d => (
                  <div key={d.id} className="flex items-center justify-between rounded-lg border border-dashed border-border px-3 py-2 text-sm">
                    <span>{d.name}</span>
                    <AddPrinterDialog>
                      <Button variant="ghost" size="sm" className="h-7 text-xs">Tambah</Button>
                    </AddPrinterDialog>
                  </div>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ── Test tab ── */}
        <TabsContent value="test" className="mt-4">
          <PrinterTestPage />
        </TabsContent>

        {/* ── Queue tab ── */}
        <TabsContent value="queue" className="mt-4 space-y-3">
          {pendingJobs.length === 0 && completedJobs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Antrian kosong</p>
            </div>
          ) : (
            <>
              {pendingJobs.length > 0 && (
                <section className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Dalam Proses</p>
                  {pendingJobs.map(j => <QueueJobRow key={j.id} job={j} />)}
                </section>
              )}
              {completedJobs.length > 0 && (
                <section className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Selesai</p>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearCompleted}>Hapus</Button>
                  </div>
                  {completedJobs.map(j => <QueueJobRow key={j.id} job={j} />)}
                </section>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ── Queue row ─────────────────────────────────────────────────
import type { PrintJob } from "@/lib/printer/types";

const JOB_STATUS_COLOR: Record<string, string> = {
  pending: "text-blue-500",
  printing: "text-blue-500",
  done: "text-green-500",
  failed: "text-red-500",
  cancelled: "text-gray-400",
};
const JOB_STATUS_LABEL: Record<string, string> = {
  pending: "Antri",
  printing: "Mencetak…",
  done: "Selesai",
  failed: "Gagal",
  cancelled: "Dibatalkan",
};

function QueueJobRow({ job }: { job: PrintJob }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-xs">
      <div className="min-w-0">
        <p className="font-medium truncate">{job.label ?? job.id}</p>
        {job.lastError && <p className="text-destructive truncate">{job.lastError}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {(job.status === "pending" || job.status === "printing") && (
          <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
        )}
        <span className={JOB_STATUS_COLOR[job.status]}>{JOB_STATUS_LABEL[job.status]}</span>
        {job.attempts > 1 && <span className="text-muted-foreground">×{job.attempts}</span>}
      </div>
    </div>
  );
}
