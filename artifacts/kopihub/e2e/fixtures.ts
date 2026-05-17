import { test as base, expect, type Page } from "@playwright/test";

/**
 * Kredensial demo (di-seed via migrasi sandbox UMKMgo).
 * Override lewat env: E2E_EMAIL / E2E_PASSWORD.
 */
export const DEMO_EMAIL = process.env.E2E_EMAIL ?? "owner@umkmgo.id";
export const DEMO_PASSWORD = process.env.E2E_PASSWORD ?? "demo1234";

/**
 * Mock semua mekanisme cetak supaya test deterministik:
 *  - window.print() → no-op + dicatat di window.__printCalls
 *  - window.open()  → mock dengan Document yang punya .print() no-op
 *  - dialog beforeprint diabaikan
 */
export async function installPrintMock(page: Page) {
  await page.addInitScript(() => {
    // @ts-expect-error: pasang counter di window
    window.__printCalls = 0;
    const origPrint = window.print;
    window.print = function mockedPrint() {
      // @ts-expect-error
      window.__printCalls = (window.__printCalls ?? 0) + 1;
      // jangan panggil dialog asli
      return undefined as unknown as void;
    };
    // Tahan referensi agar bisa di-restore manual jika diperlukan
    // @ts-expect-error
    window.__origPrint = origPrint;

    const origOpen = window.open;
    window.open = function mockedOpen(..._args: any[]) {
      // @ts-expect-error
      window.__openCalls = (window.__openCalls ?? 0) + 1;
      const fakeDoc: any = {
        open: () => {},
        write: () => {},
        close: () => {},
      };
      const fakeWin: any = {
        document: fakeDoc,
        print: () => {
          // @ts-expect-error
          window.__printCalls = (window.__printCalls ?? 0) + 1;
        },
        close: () => {},
        focus: () => {},
      };
      return fakeWin;
    };
    // @ts-expect-error
    window.__origOpen = origOpen;
  });

  // Auto-dismiss native print/beforeunload dialogs jika ada
  page.on("dialog", (d) => d.dismiss().catch(() => {}));
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
