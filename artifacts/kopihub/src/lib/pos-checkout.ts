import { supabase } from "@/integrations/supabase/client";

export type CheckoutPayload = {
  shop_id: string;
  outlet_id: string;
  cashier_id: string;
  subtotal: number;
  discount: number;
  service_charge: number;
  tax: number;
  total: number;
  payment_method: string;
  amount_tendered?: number;
  change_due?: number;
  client_idempotency_key: string;
  customer_name?: string | null;
  table_label?: string | null;
  delivery_fee?: number;
  delivery_address?: string | null;
  items: Array<{
    menu_item_id: string | null;
    name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    note: string | null;
  }>;
};

export type CheckoutResult = { order_id: string; order_no: string };

const PENDING_KEY = "umkmgo.pos.pending_checkouts";

export function loadPendingCheckouts(): CheckoutPayload[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]"); } catch { return []; }
}

export function savePendingCheckouts(list: CheckoutPayload[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PENDING_KEY, JSON.stringify(list));
}

export function enqueuePending(p: CheckoutPayload) {
  const list = loadPendingCheckouts();
  if (!list.some(x => x.client_idempotency_key === p.client_idempotency_key)) {
    list.push(p);
    savePendingCheckouts(list);
  }
}

export function removePending(key: string) {
  savePendingCheckouts(loadPendingCheckouts().filter(p => p.client_idempotency_key !== key));
}

function isTransientError(err: any): boolean {
  const msg = String(err?.message ?? err ?? "").toLowerCase();
  return !navigator.onLine
    || msg.includes("failed to fetch")
    || msg.includes("networkerror")
    || msg.includes("network request failed")
    || msg.includes("timeout")
    || msg.includes("503")
    || msg.includes("502");
}

async function logAudit(p: CheckoutPayload, action: string, opts: { order_id?: string; order_no?: string; error?: string; reason?: string }) {
  try {
    await (supabase as any).from("pos_audit_log").insert({
      shop_id: p.shop_id,
      outlet_id: p.outlet_id,
      order_id: opts.order_id ?? null,
      order_no: opts.order_no ?? null,
      action,
      reason: opts.reason ?? null,
      error_message: opts.error ?? null,
      cashier_id: p.cashier_id,
      metadata: { idempotency_key: p.client_idempotency_key, total: p.total },
    });
  } catch { /* swallow audit errors */ }
}

/** Submit a checkout with idempotency + retry. Throws on hard failure. */
export async function submitCheckout(p: CheckoutPayload, maxAttempts = 3): Promise<CheckoutResult> {
  // Check if this idempotency key already produced an order (true idempotency)
  const existing = await (supabase as any)
    .from("orders")
    .select("id, order_no")
    .eq("shop_id", p.shop_id)
    .eq("client_idempotency_key", p.client_idempotency_key)
    .maybeSingle();
  if (existing?.data?.id) {
    removePending(p.client_idempotency_key);
    return { order_id: existing.data.id, order_no: existing.data.order_no };
  }

  let lastErr: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const { data: order, error: orderErr } = await (supabase as any)
        .from("orders")
        .insert({
          outlet_id: p.outlet_id,
          shop_id: p.shop_id,
          subtotal: p.subtotal,
          discount: p.discount,
          service_charge: p.service_charge,
          tax: p.tax,
          total: p.total,
          status: "completed",
          payment_method: p.payment_method,
          payment_status: "paid",
          amount_tendered: p.amount_tendered ?? null,
          change_due: p.change_due ?? 0,
          cashier_id: p.cashier_id,
          channel: "pos",
          order_source: "pos",
          client_idempotency_key: p.client_idempotency_key,
          customer_name: p.customer_name ?? null,
          table_label: p.table_label ?? null,
          delivery_fee: p.delivery_fee ?? 0,
          delivery_address: p.delivery_address ?? null,
        })
        .select("id, order_no")
        .single();

      if (orderErr) {
        // Duplicate idempotency key → fetch the existing order
        if (orderErr.code === "23505") {
          const dup = await (supabase as any)
            .from("orders").select("id, order_no")
            .eq("shop_id", p.shop_id)
            .eq("client_idempotency_key", p.client_idempotency_key)
            .single();
          if (dup?.data) {
            removePending(p.client_idempotency_key);
            return { order_id: dup.data.id, order_no: dup.data.order_no };
          }
        }
        throw orderErr;
      }

      const items = p.items.map(it => ({ ...it, order_id: order.id }));
      const { error: itemsErr } = await supabase.from("order_items").insert(items);
      if (itemsErr) throw itemsErr;

      removePending(p.client_idempotency_key);
      await logAudit(p, "checkout_success", { order_id: order.id, order_no: order.order_no });
      return { order_id: order.id, order_no: order.order_no };
    } catch (err: any) {
      lastErr = err;
      if (attempt < maxAttempts && isTransientError(err)) {
        await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
        continue;
      }
      // Non-transient or out of attempts: queue + audit
      if (isTransientError(err)) enqueuePending(p);
      await logAudit(p, "checkout_error", { error: err?.message ?? String(err) });
      throw err;
    }
  }
  throw lastErr;
}

/** Try to flush queued offline checkouts. Call when online. */
export async function flushPendingCheckouts(): Promise<{ ok: number; failed: number }> {
  const list = loadPendingCheckouts();
  let ok = 0, failed = 0;
  for (const p of list) {
    try { await submitCheckout(p); ok++; } catch { failed++; }
  }
  return { ok, failed };
}