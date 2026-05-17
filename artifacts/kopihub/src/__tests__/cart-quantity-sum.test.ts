import { describe, it, expect, vi, beforeEach } from "vitest";

// Cart yang berisi item dari beberapa shop pada cart_id yang sama.
const SAMPLE_ROWS = [
  { quantity: 2, shop_id: "shop-A" },
  { quantity: 3, shop_id: "shop-A" },
  { quantity: 1, shop_id: "shop-B" },
  { quantity: 5, shop_id: "shop-C" },
];

// Simulasi query builder Supabase: .from().select().eq().eq() -> resolve { data }.
function makeQueryBuilder(filterCalls: Array<{ col: string; val: any }>) {
  const builder: any = {
    select() { return builder; },
    eq(col: string, val: any) {
      filterCalls.push({ col, val });
      return builder;
    },
    then(resolve: (v: any) => any) {
      // Terapkan filter shop_id (kalau ada). Filter cart_id tidak relevan untuk
      // test ini karena kita sudah anggap semua row punya cart_id yang sama.
      const shopFilter = filterCalls.find((f) => f.col === "shop_id");
      const data = shopFilter
        ? SAMPLE_ROWS.filter((r) => r.shop_id === shopFilter.val)
        : SAMPLE_ROWS;
      return Promise.resolve({ data, error: null }).then(resolve);
    },
  };
  return builder;
}

const filterCallsByQuery: Array<Array<{ col: string; val: any }>> = [];

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "u1" } } } }),
    },
    rpc: async (name: string) => {
      if (name === "get_or_create_marketplace_cart") {
        return { data: "cart-xyz", error: null };
      }
      return { data: null, error: null };
    },
    from(_table: string) {
      const calls: Array<{ col: string; val: any }> = [];
      filterCallsByQuery.push(calls);
      return makeQueryBuilder(calls);
    },
  },
}));

import { cartQuantitySum } from "@/lib/marketplace-cart";

describe("cartQuantitySum — multi-shop filter", () => {
  beforeEach(() => {
    filterCallsByQuery.length = 0;
  });

  it("akumulasi seluruh shop bila shopId tidak diberikan", async () => {
    const total = await cartQuantitySum();
    expect(total).toBe(2 + 3 + 1 + 5); // 11
    const lastCalls = filterCallsByQuery.at(-1)!;
    expect(lastCalls.some((c) => c.col === "shop_id")).toBe(false);
  });

  it("hanya menghitung qty milik shop-A bila shopId=shop-A", async () => {
    const total = await cartQuantitySum("shop-A");
    expect(total).toBe(5); // 2 + 3
    const lastCalls = filterCallsByQuery.at(-1)!;
    expect(lastCalls).toContainEqual({ col: "shop_id", val: "shop-A" });
  });

  it("hanya menghitung qty milik shop-B bila shopId=shop-B", async () => {
    const total = await cartQuantitySum("shop-B");
    expect(total).toBe(1);
  });

  it("mengembalikan 0 untuk shop yang tidak punya item di cart", async () => {
    const total = await cartQuantitySum("shop-Z");
    expect(total).toBe(0);
  });

  it("badge per-shop konsisten saat user pindah antar produk dari shop berbeda", async () => {
    // Simulasikan navigasi: shop-A -> shop-B -> shop-C, semuanya pakai cart yang sama.
    const [a, b, c] = await Promise.all([
      cartQuantitySum("shop-A"),
      cartQuantitySum("shop-B"),
      cartQuantitySum("shop-C"),
    ]);
    expect(a).toBe(5);
    expect(b).toBe(1);
    expect(c).toBe(5);
    // Pastikan tidak ada yang sama dengan total akumulasi (11).
    expect(a + b + c).toBe(11);
  });
});
