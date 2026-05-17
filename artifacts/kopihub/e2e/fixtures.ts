import { test as base, expect, type Page } from "@playwright/test";

/**
 * Kredensial demo (di-seed via migrasi sandbox UMKMgo).
 * Override lewat env: E2E_EMAIL / E2E_PASSWORD.
 */
export const DEMO_EMAIL = process.env.E2E_EMAIL ?? "owner@umkmgo.id";
export const DEMO_PASSWORD = process.env.E2E_PASSWORD ?? "demo1234";

/**
 * Deterministic print mock untuk E2E.
 *
 * Yang dipasang di `window`:
 *  - __printLog: Array<{ source: 'window' | 'popup'; type: string; html: string; ts: number }>
 *  - __printCalls: number (alias = __printLog.length)
 *  - __openCalls: number
 *  - __lastPrintHtml: string
 *  - __resetPrintLog(): void
 *
 * Heuristik tipe struk:
 *  - Cari elemen ber-`data-receipt-type` di DOM utama saat print() dipanggil,
 *    atau parse HTML yang di-`document.write` ke popup.
 *  - Fallback: 'unknown'.
 *
 * Popup window dibuat penuh sebagai fake — script `<script>window.print()</script>`
 * yang ditulis ke document juga dieksekusi (sebagai counter, bukan eval) sehingga
 * jalur "open in new window → print" tetap ter-track tanpa popup asli.
 */
export async function installPrintMock(page: Page) {
  await page.addInitScript(() => {
    type Entry = { source: "window" | "popup"; type: string; html: string; ts: number };
    const log: Entry[] = [];
    const w = window as any;
    w.__printLog = log;
    w.__printCalls = 0;
    w.__openCalls = 0;
    w.__lastPrintHtml = "";
    w.__resetPrintLog = () => {
      log.length = 0;
      w.__printCalls = 0;
      w.__openCalls = 0;
      w.__lastPrintHtml = "";
    };

    function detectTypeFromDom(): { type: string; html: string } {
      // Cari semua kandidat struk yang terlihat (atau ada di .print-area).
      const nodes = Array.from(
        document.querySelectorAll<HTMLElement>("[data-receipt-type]"),
      );
      // Prioritaskan node dengan class print-area (yang sedang diset oleh printReceiptNode)
      const active = nodes.find((n) => n.classList.contains("print-area")) ?? nodes[0];
      if (!active) return { type: "unknown", html: "" };
      return {
        type: active.dataset.receiptType ?? "unknown",
        html: active.outerHTML,
      };
    }

    function detectTypeFromHtml(html: string): string {
      const m = html.match(/data-receipt-type=["']([^"']+)["']/);
      return m?.[1] ?? "unknown";
    }

    function record(entry: Entry) {
      log.push(entry);
      w.__printCalls = log.length;
      w.__lastPrintHtml = entry.html;
    }

    const origPrint = window.print.bind(window);
    w.__origPrint = origPrint;
    window.print = function mockedPrint() {
      const info = detectTypeFromDom();
      record({ source: "window", type: info.type, html: info.html, ts: Date.now() });
      return undefined as unknown as void;
    };

    const origOpen = window.open?.bind(window);
    w.__origOpen = origOpen;
    window.open = function mockedOpen(..._args: any[]) {
      w.__openCalls = (w.__openCalls ?? 0) + 1;
      let buffer = "";
      const fakeDoc: any = {
        open: () => { buffer = ""; },
        write: (chunk: string) => { buffer += String(chunk ?? ""); },
        writeln: (chunk: string) => { buffer += String(chunk ?? "") + "\n"; },
        close: () => {
          // Jika HTML yang ditulis berisi pemicu auto-print, hitung sebagai print popup.
          if (/window\.print\s*\(/.test(buffer)) {
            record({
              source: "popup",
              type: detectTypeFromHtml(buffer),
              html: buffer,
              ts: Date.now(),
            });
          }
        },
      };
      const fakeWin: any = {
        document: fakeDoc,
        print: () => {
          record({
            source: "popup",
            type: detectTypeFromHtml(buffer),
            html: buffer,
            ts: Date.now(),
          });
        },
        close: () => {},
        focus: () => {},
        closed: false,
      };
      return fakeWin;
    } as typeof window.open;
  });

  // Auto-dismiss native print/beforeunload dialogs jika ada
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
}

/** Tunggu sampai struk dengan tipe tertentu tercatat (default: minimal 1). */
export async function waitForPrint(
  page: Page,
  opts: { type?: string; min?: number; timeout?: number } = {},
) {
  const { type, min = 1, timeout = 15_000 } = opts;
  await page.waitForFunction(
    ({ type, min }) => {
      const log = ((window as any).__printLog ?? []) as Array<{ type: string }>;
      const matched = type ? log.filter((e) => e.type === type) : log;
      return matched.length >= min;
    },
    { type, min },
    { timeout },
  );
  return page.evaluate(() => (window as any).__printLog ?? []);
}


/**
 * Pola yang di-ignore (warning umum dari ekstensi, HMR, lovable.js, dsb).
 * Tambahkan di sini kalau ada noise baru yang bukan bug aplikasi.
 */
export const FATAL_IGNORE_PATTERNS: RegExp[] = [
  /RESET_BLANK_CHECK/i,
  /Unknown message type/i,
  /\[vite\]/i,
  /\[HMR\]/i,
  /Download the React DevTools/i,
  /ResizeObserver loop/i,
  /Non-Error promise rejection captured/i,
  /Failed to load resource.*manifest\.webmanifest/i,
  // Sonner / toast info tidak boleh mem-fail test
  /sonner/i,
];

export function isFatalMessage(msg: string): boolean {
  if (!msg) return false;
  return !FATAL_IGNORE_PATTERNS.some((re) => re.test(msg));
}

/** Pasang capture console.error + pageerror + unhandledrejection ke page. */
export function installErrorCapture(page: Page): { errors: string[] } {
  const errors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    if (isFatalMessage(text)) errors.push(`[console.error] ${text}`);
  });

  // Uncaught exceptions di halaman
  page.on("pageerror", (err) => {
    const text = `${err.name}: ${err.message}`;
    if (isFatalMessage(text)) errors.push(`[pageerror] ${text}`);
  });

  // Hook unhandledrejection di dalam page agar selalu terbaca oleh `pageerror`
  page.addInitScript(() => {
    window.addEventListener("unhandledrejection", (ev) => {
      const reason: any = (ev as PromiseRejectionEvent).reason;
      const msg = reason?.stack ?? reason?.message ?? String(reason);
      // Throw sintetis agar tertangkap oleh Playwright 'pageerror'
      // (tapi jangan ganggu app — schedule async dengan label jelas)
      setTimeout(() => {
        throw new Error(`[unhandledrejection] ${msg}`);
      }, 0);
    });
  });

  return { errors };
}

type Fixtures = {
  authedPage: Page;
  consoleErrors: string[];
};

export const test = base.extend<Fixtures>({
  // Per-test array; auto-fail kalau ada error fatal saat test selesai.
  consoleErrors: async ({ page }, use, testInfo) => {
    const { errors } = installErrorCapture(page);
    await use(errors);
    if (errors.length > 0) {
      testInfo.attach("console-errors.txt", {
        body: errors.join("\n"),
        contentType: "text/plain",
      });
      throw new Error(
        `Test menghasilkan ${errors.length} error fatal:\n${errors.join("\n")}`,
      );
    }
  },
  authedPage: async ({ page, consoleErrors: _ }, use) => {
    await installPrintMock(page);
    await login(page);
    await use(page);
  },
});

export { expect };

