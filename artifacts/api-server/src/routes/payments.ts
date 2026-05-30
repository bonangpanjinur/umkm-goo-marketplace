import { Router, type Request, type Response } from "express";
import { db, pool } from "@workspace/db";
import { paymentTransactions, webhookLogs } from "@workspace/db";
import { eq } from "drizzle-orm";

async function getShopIdForOrder(orderId: string): Promise<string | null> {
  try {
    const { rows } = await pool.query<{ shop_id: string | null }>(
      `SELECT shop_id FROM orders WHERE id::text = $1 LIMIT 1`,
      [orderId],
    );
    return rows[0]?.shop_id ?? null;
  } catch {
    return null;
  }
}
import { logger } from "../lib/logger.js";
import {
  createSnapTransaction,
  verifyMidtransSignature,
  isMidtransPaymentSuccess,
  isMidtransPaymentFailed,
  refundMidtransTransaction,
  type MidtransNotification,
} from "../lib/midtrans.js";
import {
  createXenditInvoice,
  verifyXenditWebhookToken,
  isXenditPaymentSuccess,
  isXenditPaymentFailed,
  refundXenditPayment,
  type XenditWebhookPayload,
} from "../lib/xendit.js";
import {
  mergeGatewaySettings,
  buildMidtransConfig,
  buildXenditConfig,
} from "../lib/gateway-config.js";
import { supabaseUpdate, supabaseInsert, supabaseSelect } from "../lib/supabase-admin.js";
import { dispatchWebhookEvent } from "./webhooks.js";

/** If the orderId belongs to an ad payment (format: "ad-{adRequestId}-{ts}"),
 *  extract and return the ad_request id. */
function extractAdRequestId(orderId: string): string | null {
  // Stored as "ad-{uuid}-{timestamp}" or "ad-{uuid}"
  const m = orderId.match(/^ad-([0-9a-f-]{36})/i);
  return m ? m[1]! : null;
}

async function activateAdRequest(adRequestId: string): Promise<void> {
  try {
    await supabaseUpdate("ad_requests", adRequestId, {
      status: "pending",
      updated_at: new Date().toISOString(),
    });
    logger.info({ adRequestId }, "ad_request promoted to pending after payment");
  } catch (err) {
    logger.error({ err, adRequestId }, "Failed to activate ad_request after payment");
  }
}

/** Extract bookingId from order_id format "booking-{uuid}" */
function extractBookingId(orderId: string): string | null {
  const m = orderId.match(/^booking-([0-9a-f-]{36})$/i);
  return m ? m[1]! : null;
}

/**
 * When a deposit payment is confirmed by the gateway webhook, mark the booking
 * deposit_status as "paid" and fire an owner notification.
 */
async function handleBookingDepositPaid(orderId: string, gatewayTxId?: string): Promise<void> {
  const bookingId = extractBookingId(orderId);
  if (!bookingId) return;

  try {
    // Fetch the booking row to get shop_id + customer info
    const rows = await supabaseSelect(
      "bookings",
      { id: bookingId },
      "id,shop_id,customer_name,customer_phone,deposit_amount,deposit_status",
    );

    if (rows.length === 0) {
      logger.warn({ bookingId }, "Webhook deposit paid: booking not found");
      return;
    }

    const booking = rows[0]!;

    // Only advance if it's still waiting / submitted
    if (booking["deposit_status"] === "paid" || booking["deposit_status"] === "verified") {
      logger.info({ bookingId }, "Booking deposit already paid/verified — skipping webhook update");
      return;
    }

    await supabaseUpdate("bookings", bookingId, {
      deposit_status: "paid",
      updated_at: new Date().toISOString(),
    });

    if (booking["shop_id"]) {
      const amountFormatted = booking["deposit_amount"]
        ? `Rp ${Number(booking["deposit_amount"]).toLocaleString("id-ID")}`
        : "";
      await supabaseInsert("owner_notifications", {
        shop_id: booking["shop_id"],
        type: "deposit_paid",
        title: `✅ DP LUNAS — ${booking["customer_name"] ?? "Pelanggan"}`,
        body: `DP ${amountFormatted} LUNAS via payment gateway${gatewayTxId ? ` (TX: ${gatewayTxId})` : ""}`,
        severity: "info",
        link: "/pos-app/booking",
        dedupe_key: `deposit_paid_${bookingId}`,
      });
    }

    logger.info({ bookingId, orderId, gatewayTxId }, "Booking deposit_status set to paid via webhook");
  } catch (err) {
    logger.error({ err, bookingId, orderId }, "Failed to update booking deposit status from webhook");
  }
}

const router = Router();

const GATEWAY_METHODS_MIDTRANS = ["gopay", "shopeepay", "dana", "ovo", "cc", "qris"];
const GATEWAY_METHODS_XENDIT = ["xendit_invoice"];

function resolveGateway(paymentMethod: string, settings: ReturnType<typeof mergeGatewaySettings>): "midtrans" | "xendit" | "manual" | null {
  if (GATEWAY_METHODS_MIDTRANS.includes(paymentMethod) && settings.midtrans_enabled) return "midtrans";
  if (paymentMethod === "xendit_invoice" && settings.xendit_enabled) return "xendit";
  if (paymentMethod === "transfer" || paymentMethod === "cod") return "manual";
  if (settings.midtrans_enabled) return "midtrans";
  if (settings.xendit_enabled) return "xendit";
  return "manual";
}

router.post("/payments/initiate", async (req: Request, res: Response) => {
  const {
    order_id,
    amount,
    payment_method,
    customer_name,
    customer_phone,
    customer_email,
    items,
    success_redirect_url,
    failure_redirect_url,
  } = req.body as {
    order_id: string;
    amount: number;
    payment_method: string;
    customer_name?: string;
    customer_phone?: string;
    customer_email?: string;
    items?: Array<{ id: string; name: string; price: number; quantity: number }>;
    success_redirect_url?: string;
    failure_redirect_url?: string;
  };

  if (!order_id || !amount || !payment_method) {
    res.status(400).json({ error: "order_id, amount, dan payment_method wajib diisi" });
    return;
  }

  const settings = mergeGatewaySettings(null);
  const gateway = resolveGateway(payment_method, settings);

  if (gateway === "manual") {
    const [tx] = await db
      .insert(paymentTransactions)
      .values({
        orderId: order_id,
        gateway: "manual",
        status: "pending",
        amount: String(amount),
        currency: "IDR",
        paymentMethod: payment_method,
      })
      .returning();
    res.json({ gateway: "manual", transaction_id: tx.id, status: "pending" });
    return;
  }

  try {
    if (gateway === "midtrans") {
      const config = buildMidtransConfig(settings);
      const txId = `order-${order_id}-${Date.now()}`;
      const snap = await createSnapTransaction(config, {
        transaction_details: { order_id: txId, gross_amount: Math.round(amount) },
        customer_details: {
          first_name: customer_name,
          phone: customer_phone,
          email: customer_email,
        },
        item_details: items?.map((i) => ({
          id: i.id,
          price: Math.round(i.price),
          quantity: i.quantity,
          name: i.name.substring(0, 50),
        })),
        expiry: { unit: "hour", duration: 24 },
      });

      const [tx] = await db
        .insert(paymentTransactions)
        .values({
          orderId: order_id,
          gateway: "midtrans",
          gatewayTransactionId: txId,
          status: "pending",
          amount: String(amount),
          currency: "IDR",
          paymentMethod: payment_method,
          paymentUrl: snap.redirect_url,
          snapToken: snap.token,
          gatewayResponse: snap as unknown as Record<string, unknown>,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        })
        .returning();

      res.json({
        gateway: "midtrans",
        transaction_id: tx.id,
        snap_token: snap.token,
        payment_url: snap.redirect_url,
        status: "pending",
      });
      return;
    }

    if (gateway === "xendit") {
      const config = buildXenditConfig(settings);
      const externalId = `order-${order_id}-${Date.now()}`;
      const invoice = await createXenditInvoice(config, {
        external_id: externalId,
        amount: Math.round(amount),
        currency: "IDR",
        description: `Pembayaran pesanan ${order_id}`,
        payer_email: customer_email,
        customer: {
          given_names: customer_name,
          mobile_number: customer_phone,
          email: customer_email,
        },
        items: items?.map((i) => ({
          name: i.name.substring(0, 255),
          quantity: i.quantity,
          price: Math.round(i.price),
        })),
        invoice_duration: 86400,
        success_redirect_url,
        failure_redirect_url,
      });

      const [tx] = await db
        .insert(paymentTransactions)
        .values({
          orderId: order_id,
          gateway: "xendit",
          gatewayTransactionId: invoice.id,
          status: "pending",
          amount: String(amount),
          currency: "IDR",
          paymentMethod: payment_method,
          paymentUrl: invoice.invoice_url,
          gatewayResponse: invoice as unknown as Record<string, unknown>,
          expiredAt: invoice.expiry_date ? new Date(invoice.expiry_date) : null,
        })
        .returning();

      res.json({
        gateway: "xendit",
        transaction_id: tx.id,
        payment_url: invoice.invoice_url,
        invoice_id: invoice.id,
        status: "pending",
      });
      return;
    }

    res.status(422).json({ error: "Tidak ada payment gateway yang aktif" });
  } catch (err: unknown) {
    logger.error({ err, order_id, payment_method }, "Payment initiation failed");
    const message = err instanceof Error ? err.message : "Gagal membuat transaksi pembayaran";
    res.status(502).json({ error: message });
  }
});

router.get("/payments/:orderId/status", async (req: Request, res: Response) => {
  const orderId = String(req.params.orderId);
  const rows = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.orderId, orderId))
    .orderBy(paymentTransactions.createdAt);

  if (rows.length === 0) {
    res.status(404).json({ error: "Transaksi tidak ditemukan" });
    return;
  }

  const latest = rows[rows.length - 1]!;
  res.json({
    order_id: orderId,
    transaction_id: latest.id,
    gateway: latest.gateway,
    gateway_transaction_id: latest.gatewayTransactionId,
    status: latest.status,
    payment_method: latest.paymentMethod,
    payment_url: latest.paymentUrl,
    snap_token: latest.snapToken,
    paid_at: latest.paidAt,
    amount: latest.amount,
    currency: latest.currency,
    all_transactions: rows.map((r: typeof rows[number]) => ({
      id: r.id,
      gateway: r.gateway,
      status: r.status,
      created_at: r.createdAt,
    })),
  });
});

router.post("/payments/webhook/midtrans", async (req: Request, res: Response) => {
  const notification = req.body as MidtransNotification;
  const settings = mergeGatewaySettings(null);

  const [insertedLog] = await db
    .insert(webhookLogs)
    .values({
      gateway: "midtrans",
      event: notification.transaction_status,
      payload: notification as unknown as Record<string, unknown>,
      status: "received",
    })
    .returning({ id: webhookLogs.id });
  const logId = insertedLog?.id;

  if (!notification.order_id) {
    res.status(400).json({ error: "Missing order_id" });
    return;
  }

  if (
    settings.midtrans_server_key &&
    notification.signature_key &&
    notification.status_code &&
    notification.gross_amount
  ) {
    const valid = verifyMidtransSignature(
      notification.order_id,
      notification.status_code,
      notification.gross_amount,
      settings.midtrans_server_key,
      notification.signature_key,
    );
    if (!valid) {
      logger.warn({ order_id: notification.order_id }, "Midtrans signature invalid");
      res.status(401).json({ error: "Invalid signature" });
      return;
    }
  }

  try {
    const existing = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.gatewayTransactionId, notification.order_id))
      .limit(1);

    if (existing.length === 0) {
      logger.warn({ order_id: notification.order_id }, "Midtrans webhook: transaksi tidak ditemukan");
      res.json({ received: true });
      return;
    }

    const tx = existing[0]!;
    let newStatus = tx.status;
    let paidAt: Date | null = null;

    if (isMidtransPaymentSuccess(notification)) {
      newStatus = "paid";
      paidAt = new Date();
    } else if (isMidtransPaymentFailed(notification)) {
      newStatus = "failed";
    }

    if (newStatus !== tx.status) {
      await db
        .update(paymentTransactions)
        .set({
          status: newStatus,
          paymentMethod: notification.payment_type ?? tx.paymentMethod,
          gatewayResponse: notification as unknown as Record<string, unknown>,
          paidAt: paidAt ?? tx.paidAt,
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactions.id, tx.id));

      logger.info({ transaction_id: tx.id, order_id: tx.orderId, status: newStatus }, "Midtrans payment status updated");

      if (newStatus === "paid") {
        const adId = extractAdRequestId(tx.orderId);
        if (adId) await activateAdRequest(adId);
        await handleBookingDepositPaid(tx.orderId, notification.transaction_id);
        const shopId = await getShopIdForOrder(tx.orderId);
        if (shopId) {
          dispatchWebhookEvent(shopId, "payment.paid", {
            order_id: tx.orderId,
            transaction_id: tx.id,
            gateway: "midtrans",
            amount: tx.amount,
            payment_method: tx.paymentMethod,
            paid_at: paidAt?.toISOString(),
          }).catch(() => {/* fire-and-forget */});
        }
      }
    }

    if (logId) {
      await db
        .update(webhookLogs)
        .set({ status: "processed", relatedTransactionId: tx.id })
        .where(eq(webhookLogs.id, logId));
    }

    res.json({ received: true, status: newStatus });
  } catch (err: unknown) {
    logger.error({ err }, "Midtrans webhook processing error");
    if (logId) {
      await db
        .update(webhookLogs)
        .set({ status: "error", processingError: err instanceof Error ? err.message : String(err) })
        .where(eq(webhookLogs.id, logId));
    }
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

router.post("/payments/webhook/xendit", async (req: Request, res: Response) => {
  const callbackToken = req.headers["x-callback-token"] as string | undefined;
  const settings = mergeGatewaySettings(null);

  const payload = req.body as XenditWebhookPayload;

  const [insertedLog] = await db
    .insert(webhookLogs)
    .values({
      gateway: "xendit",
      event: payload.status,
      payload: payload as unknown as Record<string, unknown>,
      status: "received",
    })
    .returning({ id: webhookLogs.id });
  const logId = insertedLog?.id;

  if (settings.xendit_webhook_token && callbackToken) {
    const valid = verifyXenditWebhookToken(callbackToken, settings.xendit_webhook_token);
    if (!valid) {
      logger.warn({ external_id: payload.external_id }, "Xendit webhook token invalid");
      res.status(401).json({ error: "Invalid webhook token" });
      return;
    }
  }

  try {
    const existing = await db
      .select()
      .from(paymentTransactions)
      .where(eq(paymentTransactions.gatewayTransactionId, payload.id))
      .limit(1);

    if (existing.length === 0) {
      logger.warn({ invoice_id: payload.id }, "Xendit webhook: transaksi tidak ditemukan");
      res.json({ received: true });
      return;
    }

    const tx = existing[0]!;
    let newStatus = tx.status;
    let paidAt: Date | null = null;

    if (isXenditPaymentSuccess(payload)) {
      newStatus = "paid";
      paidAt = payload.paid_at ? new Date(payload.paid_at) : new Date();
    } else if (isXenditPaymentFailed(payload)) {
      newStatus = "failed";
    }

    if (newStatus !== tx.status) {
      await db
        .update(paymentTransactions)
        .set({
          status: newStatus,
          paymentMethod: payload.payment_method ?? tx.paymentMethod,
          gatewayResponse: payload as unknown as Record<string, unknown>,
          paidAt: paidAt ?? tx.paidAt,
          updatedAt: new Date(),
        })
        .where(eq(paymentTransactions.id, tx.id));

      logger.info({ transaction_id: tx.id, order_id: tx.orderId, status: newStatus }, "Xendit payment status updated");

      if (newStatus === "paid") {
        const adId = extractAdRequestId(tx.orderId);
        if (adId) await activateAdRequest(adId);
        await handleBookingDepositPaid(tx.orderId, payload.payment_id ?? payload.id);
        if (tx.shopId) {
          dispatchWebhookEvent(tx.shopId, "payment.paid", {
            order_id: tx.orderId,
            transaction_id: tx.id,
            gateway: "xendit",
            amount: tx.amount,
            payment_method: tx.paymentMethod,
            paid_at: paidAt?.toISOString(),
          }).catch(() => {/* fire-and-forget */});
        }
      }
    }

    if (logId) {
      await db
        .update(webhookLogs)
        .set({ status: "processed", relatedTransactionId: tx.id })
        .where(eq(webhookLogs.id, logId));
    }

    res.json({ received: true, status: newStatus });
  } catch (err: unknown) {
    logger.error({ err }, "Xendit webhook processing error");
    if (logId) {
      await db
        .update(webhookLogs)
        .set({ status: "error", processingError: err instanceof Error ? err.message : String(err) })
        .where(eq(webhookLogs.id, logId));
    }
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

router.get("/payments/webhooks/recent", async (_req: Request, res: Response) => {
  const logs = await db
    .select()
    .from(webhookLogs)
    .orderBy(webhookLogs.receivedAt)
    .limit(50);
  res.json({ logs: logs.reverse() });
});

router.get("/payments/gateway-config", (_req: Request, res: Response) => {
  const settings = mergeGatewaySettings(null);
  res.json({
    midtrans_enabled: settings.midtrans_enabled,
    midtrans_client_key: settings.midtrans_client_key,
    midtrans_mode: settings.midtrans_mode,
    xendit_enabled: settings.xendit_enabled,
  });
});

// ── F6-1: Auto Refund ke Gateway ───────────────────────────────────────────
// POST /api/payments/refund
// Body: { order_id, amount, reason? }
// Mencari transaksi yang "paid" → kirim refund ke Midtrans/Xendit → update status
router.post("/payments/refund", async (req: Request, res: Response) => {
  const { order_id, amount, reason } = req.body as {
    order_id: string;
    amount?: number;
    reason?: string;
  };

  if (!order_id) {
    res.status(400).json({ error: "order_id wajib diisi" });
    return;
  }

  const txRows = await db
    .select()
    .from(paymentTransactions)
    .where(eq(paymentTransactions.orderId, order_id))
    .orderBy(paymentTransactions.createdAt);

  const paid = txRows.filter((t) => t.status === "paid");
  if (paid.length === 0) {
    res.status(404).json({ error: "Tidak ada transaksi yang lunas untuk order ini" });
    return;
  }

  const tx = paid[paid.length - 1]!;
  const refundAmount = amount ? Math.round(amount) : Math.round(Number(tx.amount));
  const refundReason = reason ?? "Pembatalan order";

  const settings = mergeGatewaySettings(null);

  try {
    let gatewayResult: Record<string, unknown> = {};

    if (tx.gateway === "midtrans" && tx.gatewayTransactionId) {
      if (!settings.midtrans_enabled || !settings.midtrans_server_key) {
        res.status(422).json({ error: "Midtrans belum dikonfigurasi" });
        return;
      }
      const config = buildMidtransConfig(settings);
      const refundKey = `refund-${order_id}-${Date.now()}`;
      const result = await refundMidtransTransaction(config, tx.gatewayTransactionId, {
        refund_key: refundKey,
        amount: refundAmount,
        reason: refundReason,
      });
      gatewayResult = result as unknown as Record<string, unknown>;

    } else if (tx.gateway === "xendit" && tx.gatewayTransactionId) {
      if (!settings.xendit_enabled || !settings.xendit_secret_key) {
        res.status(422).json({ error: "Xendit belum dikonfigurasi" });
        return;
      }
      const config = buildXenditConfig(settings);
      const result = await refundXenditPayment(config, {
        invoice_id: tx.gatewayTransactionId,
        amount: refundAmount,
        external_id: `refund-${order_id}-${Date.now()}`,
        reason: refundReason,
      });
      gatewayResult = result as unknown as Record<string, unknown>;

    } else if (tx.gateway === "manual") {
      gatewayResult = { note: "Refund manual — transfer balik ke rekening pelanggan" };
    } else {
      res.status(422).json({ error: "Gateway tidak didukung untuk refund otomatis" });
      return;
    }

    await db
      .update(paymentTransactions)
      .set({
        status: "refunded",
        gatewayResponse: { ...((tx.gatewayResponse as Record<string, unknown>) ?? {}), refund: gatewayResult },
        updatedAt: new Date(),
      })
      .where(eq(paymentTransactions.id, tx.id));

    logger.info({ order_id, gateway: tx.gateway, amount: refundAmount }, "Refund processed");

    res.json({
      ok: true,
      order_id,
      gateway: tx.gateway,
      refund_amount: refundAmount,
      reason: refundReason,
      gateway_result: gatewayResult,
    });
  } catch (err: unknown) {
    logger.error({ err, order_id }, "Refund failed");
    const message = err instanceof Error ? err.message : "Gagal memproses refund";
    res.status(502).json({ error: message });
  }
});

export default router;
