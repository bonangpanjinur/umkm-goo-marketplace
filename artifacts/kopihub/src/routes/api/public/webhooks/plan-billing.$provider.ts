import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
// NOTE: crypto helpers live in a `.server.ts` module so Vite's
// `block-server-only-imports` plugin (vite.config.ts) prevents any client
// bundle from pulling in `node:crypto`. Imported dynamically + lazily so
// the static analyzer never traverses into the server-only graph from a
// client entry.

/**
 * Webhook endpoint untuk pembayaran paket platform.
 *
 * URL: /api/public/webhooks/plan-billing/{provider}
 * Provider yang didukung: midtrans, xendit
 *
 * Wajib verifikasi signature sesuai provider sebelum memproses payload.
 */

function getAdminClient() {
  const url = process.env.SUPABASE_URL || (import.meta as any).env?.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase admin credentials not configured");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const Route = createFileRoute("/api/public/webhooks/plan-billing/$provider")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const provider = params.provider;
        const body = await request.text();

        // Dynamic import keeps `node:crypto` out of any client traversal.
        const { verifyMidtrans, verifyXendit } = await import(
          /* @vite-ignore */ "@/lib/webhook-crypto.server"
        );

        let invoiceRef: string | null = null;
        let paid = false;
        let providerRef: string | null = null;

        try {
          if (provider === "midtrans") {
            const serverKey = process.env.MIDTRANS_SERVER_KEY;
            if (!serverKey) {
              return new Response("Midtrans not configured", { status: 503 });
            }
            const payload = JSON.parse(body);
            const { order_id, status_code, gross_amount, signature_key, transaction_status } = payload;
            if (!(await verifyMidtrans(order_id, status_code, gross_amount, signature_key, serverKey))) {
              return new Response("Invalid signature", { status: 401 });
            }
            invoiceRef = order_id;
            providerRef = payload.transaction_id ?? null;
            paid = ["settlement", "capture"].includes(transaction_status);
          } else if (provider === "xendit") {
            const callbackToken = process.env.XENDIT_CALLBACK_TOKEN;
            if (!callbackToken) {
              return new Response("Xendit not configured", { status: 503 });
            }
            const headerToken = request.headers.get("x-callback-token");
            if (!verifyXendit(headerToken, callbackToken)) {
              return new Response("Invalid token", { status: 401 });
            }
            const payload = JSON.parse(body);
            invoiceRef = payload.external_id ?? payload.id;
            providerRef = payload.id ?? null;
            paid = payload.status === "PAID" || payload.status === "SETTLED";
          } else {
            return new Response("Unknown provider", { status: 404 });
          }

          if (!invoiceRef) return new Response("Missing invoice ref", { status: 400 });

          const admin = getAdminClient();
          const { data: inv } = await admin
            .from("plan_invoices")
            .select("id, status, shop_id, plan_id")
            .or(`invoice_no.eq.${invoiceRef},provider_ref.eq.${invoiceRef}`)
            .maybeSingle();
          if (!inv) return new Response("Invoice not found", { status: 404 });

          if (paid && inv.status !== "paid") {
            await admin.rpc("approve_invoice" as any, { _invoice_id: inv.id });
            await admin.from("plan_invoices").update({
              provider_ref: providerRef,
              payment_method: provider,
            }).eq("id", inv.id);
          } else if (!paid) {
            await admin.from("plan_invoices").update({
              provider_ref: providerRef,
            }).eq("id", inv.id);
          }

          return new Response(JSON.stringify({ ok: true, paid }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e) {
          console.error("Webhook error:", e);
          return new Response("Internal error", { status: 500 });
        }
      },
    },
  },
});