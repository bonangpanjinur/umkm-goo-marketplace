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


export async function login(page: Page, email = DEMO_EMAIL, password = DEMO_PASSWORD) {
  await page.goto("/login");
  await page.locator("input#email").fill(email);
  await page.locator("input#password").fill(password);
  await page.getByRole("button", { name: /masuk|login|sign in/i }).first().click();
  // tunggu redirect ke /app atau /pos-app
  await page.waitForURL(/\/(app|pos-app)/, { timeout: 20_000 });
}

type Fixtures = {
  authedPage: Page;
};

export const test = base.extend<Fixtures>({
  authedPage: async ({ page }, use) => {
    await installPrintMock(page);
    await login(page);
    await use(page);
  },
});

export { expect };
