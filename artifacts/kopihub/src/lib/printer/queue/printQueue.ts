// ============================================================
// Print Queue — async job processor with retry
// Jobs are processed in order; failed jobs retry up to maxAttempts.
// ============================================================

import type { PrintJob, PrintJobStatus } from "../types";
import { printerManager } from "../manager/printerManager";

type QueueListener = (jobs: PrintJob[]) => void;

let jobCounter = 0;

class PrintQueue {
  private jobs: Map<string, PrintJob> = new Map();
  private processing = false;
  private listeners: Set<QueueListener> = new Set();

  // ── Subscriptions ────────────────────────────────────────

  subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    listener(this.getJobs());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const jobs = this.getJobs();
    for (const l of this.listeners) { try { l(jobs); } catch {} }
  }

  // ── Job management ───────────────────────────────────────

  getJobs(): PrintJob[] {
    return Array.from(this.jobs.values()).sort((a, b) => a.createdAt - b.createdAt);
  }

  getPendingCount(): number {
    return this.getJobs().filter(j => j.status === "pending" || j.status === "printing").length;
  }

  /** Add a job to the queue and start processing */
  enqueue(printerId: string, data: Uint8Array, opts?: { label?: string; maxAttempts?: number }): string {
    const id = `job-${++jobCounter}-${Date.now()}`;
    const job: PrintJob = {
      id,
      printerId,
      data,
      label: opts?.label,
      createdAt: Date.now(),
      status: "pending",
      attempts: 0,
      maxAttempts: opts?.maxAttempts ?? 3,
    };
    this.jobs.set(id, job);
    printerManager.emit({ type: "job-queued", job });
    this.notify();
    this._process();
    return id;
  }

  cancelJob(id: string): void {
    const job = this.jobs.get(id);
    if (!job || job.status !== "pending") return;
    this._update(id, { status: "cancelled", finishedAt: Date.now() });
  }

  clearCompleted(): void {
    for (const [id, job] of this.jobs) {
      if (job.status === "done" || job.status === "cancelled") this.jobs.delete(id);
    }
    this.notify();
  }

  // ── Processing loop ──────────────────────────────────────

  private async _process(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    while (true) {
      const pending = this.getJobs().find(j => j.status === "pending");
      if (!pending) break;

      this._update(pending.id, { status: "printing", startedAt: Date.now(), attempts: pending.attempts + 1 });
      printerManager.emit({ type: "job-started", job: this.jobs.get(pending.id)! });

      try {
        await printerManager.send(pending.printerId, pending.data);
        this._update(pending.id, { status: "done", finishedAt: Date.now() });
        printerManager.emit({ type: "job-done", job: this.jobs.get(pending.id)! });
      } catch (err: any) {
        const job = this.jobs.get(pending.id)!;
        const msg = err?.message ?? String(err);
        if (job.attempts < job.maxAttempts) {
          // Retry: back to pending with exponential backoff
          const delay = Math.min(1000 * Math.pow(2, job.attempts - 1), 10_000);
          this._update(pending.id, { status: "pending", lastError: msg });
          await new Promise(r => setTimeout(r, delay));
        } else {
          this._update(pending.id, { status: "failed", finishedAt: Date.now(), lastError: msg });
          printerManager.emit({ type: "job-failed", job: this.jobs.get(pending.id)!, error: msg });
        }
      }
    }

    this.processing = false;
  }

  private _update(id: string, patch: Partial<PrintJob>) {
    const job = this.jobs.get(id);
    if (!job) return;
    this.jobs.set(id, { ...job, ...patch });
    this.notify();
  }
}

export const printQueue = new PrintQueue();
