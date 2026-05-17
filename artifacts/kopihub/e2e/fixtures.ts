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
  await page.waitForURL(/\/(app|pos-app)/, { timeout: 20_000 });
}

/**
 * Severity rules untuk capture E2E.
 *
 * - `consoleError`: minimum severity untuk console.error (default 'fatal')
 * - `consoleWarn`:  minimum severity untuk console.warn  (default 'off')
 * - `network`:      minimum severity untuk request failed / status >= 500 (default 'fatal')
 *
 * Level: 'off' (abaikan) < 'warn' (log saja, jangan fail) < 'fatal' (fail test).
 *
 * Override per-test:
 *   test.use({ severity: { consoleWarn: 'fatal', network: 'fatal' } });
 */
export type Severity = "off" | "warn" | "fatal";

export type SeverityRules = {
  consoleError?: Severity;
  consoleWarn?: Severity;
  network?: Severity;
  /** Pola URL yang di-ignore untuk capture network (regex). */
  ignoreNetwork?: RegExp[];
  /** Pola pesan tambahan yang di-ignore di console.warn/error. */
  ignoreMessages?: RegExp[];
};

export const DEFAULT_SEVERITY: Required<Omit<SeverityRules, "ignoreNetwork" | "ignoreMessages">> & {
  ignoreNetwork: RegExp[];
  ignoreMessages: RegExp[];
} = {
  consoleError: "fatal",
  consoleWarn: "off",
  network: "fatal",
  ignoreNetwork: [
    /\/lovable\.js/i,
    /cdn\.gpteng\.co/i,
    /hot-update/i,
    /__vite_ping/i,
    /\/@vite\//i,
    /\.map(\?|$)/i,
  ],
  ignoreMessages: [],
};

/**
 * Pola yang di-ignore (warning umum dari ekstensi, HMR, lovable.js, dsb).
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
  /sonner/i,
];

export function isFatalMessage(msg: string, extra: RegExp[] = []): boolean {
  if (!msg) return false;
  const all = [...FATAL_IGNORE_PATTERNS, ...extra];
  return !all.some((re) => re.test(msg));
}

export type CaptureEntry = {
  kind: "console.error" | "console.warn" | "pageerror" | "network";
  severity: Exclude<Severity, "off">;
  message: string;
};

/**
 * Pasang capture untuk console.error, console.warn, pageerror,
 * unhandledrejection, dan network failures dengan severity rules.
 */
export function installErrorCapture(
  page: Page,
  rules: SeverityRules = {},
): { entries: CaptureEntry[]; fatal: CaptureEntry[] } {
  const cfg = {
    consoleError: rules.consoleError ?? DEFAULT_SEVERITY.consoleError,
    consoleWarn: rules.consoleWarn ?? DEFAULT_SEVERITY.consoleWarn,
    network: rules.network ?? DEFAULT_SEVERITY.network,
    ignoreNetwork: [...DEFAULT_SEVERITY.ignoreNetwork, ...(rules.ignoreNetwork ?? [])],
    ignoreMessages: [...(rules.ignoreMessages ?? [])],
  };

  const entries: CaptureEntry[] = [];

  function push(kind: CaptureEntry["kind"], sev: Severity, message: string) {
    if (sev === "off") return;
    entries.push({ kind, severity: sev, message });
  }

  page.on("console", (msg) => {
    const type = msg.type();
    if (type !== "error" && type !== "warning") return;
    const text = msg.text();
    if (!isFatalMessage(text, cfg.ignoreMessages)) return;
    if (type === "error") push("console.error", cfg.consoleError, text);
    else push("console.warn", cfg.consoleWarn, text);
  });

  page.on("pageerror", (err) => {
    const text = `${err.name}: ${err.message}`;
    if (isFatalMessage(text, cfg.ignoreMessages)) {
      push("pageerror", cfg.consoleError, text);
    }
  });

  // Network: request gagal di transport level (DNS/abort) ATAU response 5xx
  page.on("requestfailed", (req) => {
    const url = req.url();
    if (cfg.ignoreNetwork.some((re) => re.test(url))) return;
    const reason = req.failure()?.errorText ?? "unknown";
    push("network", cfg.network, `${req.method()} ${url} failed: ${reason}`);
  });

  page.on("response", (res) => {
    const url = res.url();
    if (cfg.ignoreNetwork.some((re) => re.test(url))) return;
    const status = res.status();
    if (status >= 500) {
      push("network", cfg.network, `${res.request().method()} ${url} → ${status}`);
    }
  });

  page.addInitScript(() => {
    window.addEventListener("unhandledrejection", (ev) => {
      const reason: any = (ev as PromiseRejectionEvent).reason;
      const msg = reason?.stack ?? reason?.message ?? String(reason);
      setTimeout(() => {
        throw new Error(`[unhandledrejection] ${msg}`);
      }, 0);
    });
  });

  return {
    entries,
    get fatal() {
      return entries.filter((e) => e.severity === "fatal");
    },
  } as any;
}

type Fixtures = {
  authedPage: Page;
  severity: SeverityRules;
  capture: { entries: CaptureEntry[]; fatal: CaptureEntry[] };
};

export const test = base.extend<Fixtures>({
  severity: [{} as SeverityRules, { option: true }],
  capture: async ({ page, severity }, use, testInfo) => {
    const cap = installErrorCapture(page, severity);
    await use(cap);
    const fatal = cap.entries.filter((e) => e.severity === "fatal");
    const warn = cap.entries.filter((e) => e.severity === "warn");
    if (warn.length > 0) {
      await testInfo.attach("warnings.txt", {
        body: warn.map((e) => `[${e.kind}] ${e.message}`).join("\n"),
        contentType: "text/plain",
      });
    }
    if (fatal.length > 0) {
      await testInfo.attach("fatal.txt", {
        body: fatal.map((e) => `[${e.kind}] ${e.message}`).join("\n"),
        contentType: "text/plain",
      });
      throw new Error(
        `Test menghasilkan ${fatal.length} error fatal:\n` +
          fatal.map((e) => `  • [${e.kind}] ${e.message}`).join("\n"),
      );
    }
  },
  authedPage: async ({ page, capture: _ }, use) => {
    await installPrintMock(page);
    await login(page);
    await use(page);
  },
});

export { expect };

