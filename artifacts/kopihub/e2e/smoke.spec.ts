import { test, expect } from "./fixtures";

/**
 * Smoke tests — load 5 alur kritis dan pastikan tidak ada error fatal di console
 * + UI dasar render. Tidak melakukan mutasi data — aman dijalankan berulang.
 *
 * Alur yang dicover:
 *   1. Homepage marketplace publik
 *   2. Owner dashboard (/pos-app)
 *   3. Admin dashboard (/admin)  — best-effort (skip jika bukan super admin)
 *   4. Kurir portal (/kurir)     — best-effort (skip jika bukan kurir)
 *   5. Akun customer (/akun)
 *
 * Smoke ≠ functional: kita cuma cek render + console bersih.
 */

test.describe("Smoke — public marketplace", () => {
  test("homepage render tanpa fatal error", async ({ page, capture: _ }) => {
    await page.goto("/");
    // Header marketplace pasti ada (logo / link)
    await expect(page.locator("body")).toBeVisible();
    // Marketplace umum punya search atau katalog link
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  });
});

test.describe("Smoke — owner shell", () => {
  test("pos-app dashboard render", async ({ authedPage: page }) => {
    await page.goto("/pos-app");
    await expect(page).toHaveURL(/\/pos-app/);
    // Sidebar nav: minimal label "Dashboard" atau "Pesanan" muncul
    await expect(
      page.getByRole("link", { name: /dashboard|pesanan|menu|produk/i }).first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("pos-app orders render", async ({ authedPage: page }) => {
    await page.goto("/pos-app/orders");
    await expect(page).toHaveURL(/\/pos-app\/orders/);
    // Header / heading order list
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  });
});

test.describe("Smoke — admin portal (best effort)", () => {
  test("admin dashboard render", async ({ authedPage: page }) => {
    await page.goto("/admin").catch(() => {});
    // Jika user bukan super admin, akan diredirect ke /pos-app. Itu OK.
    const url = page.url();
    if (!/\/admin/.test(url)) {
      test.info().annotations.push({
        type: "skip-reason",
        description: `Demo user bukan super admin, redirected ke ${url}`,
      });
      return;
    }
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Smoke — kurir portal (best effort)", () => {
  test("kurir portal render atau tampilkan akses ditolak", async ({ authedPage: page }) => {
    await page.goto("/kurir").catch(() => {});
    // Owner demo biasanya bukan kurir → harus muncul layar "Bukan akun kurir"
    // ATAU portal kurir kalau email ter-link. Dua-duanya OK; yang penting tidak crash.
    await expect(page.getByText(/portal kurir|bukan akun kurir/i).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});

test.describe("Smoke — customer akun", () => {
  test("akun profil render", async ({ authedPage: page }) => {
    await page.goto("/akun");
    await expect(page).toHaveURL(/\/akun/);
    await expect(page.getByText(/akun saya/i).first()).toBeVisible({ timeout: 15_000 });
    // Sidebar nav customer
    await expect(page.getByRole("link", { name: /pesanan|favorit|alamat/i }).first()).toBeVisible();
  });
});
