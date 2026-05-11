import { pgTable, uuid, text, numeric, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const paymentTransactions = pgTable(
  "payment_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").notNull(),
    gateway: text("gateway").notNull(),
    gatewayTransactionId: text("gateway_transaction_id"),
    status: text("status").notNull().default("pending"),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("IDR"),
    paymentMethod: text("payment_method"),
    paymentUrl: text("payment_url"),
    snapToken: text("snap_token"),
    gatewayResponse: jsonb("gateway_response"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    expiredAt: timestamp("expired_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_pt_order_id").on(t.orderId),
    index("idx_pt_gateway_txid").on(t.gatewayTransactionId),
    index("idx_pt_status").on(t.status),
  ],
);

export const webhookLogs = pgTable(
  "webhook_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gateway: text("gateway").notNull(),
    event: text("event"),
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("received"),
    processingError: text("processing_error"),
    relatedTransactionId: uuid("related_transaction_id"),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("idx_wl_gateway").on(t.gateway),
    index("idx_wl_received_at").on(t.receivedAt),
  ],
);

export const insertPaymentTransactionSchema = createInsertSchema(paymentTransactions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const selectPaymentTransactionSchema = createSelectSchema(paymentTransactions);

export type InsertPaymentTransaction = z.infer<typeof insertPaymentTransactionSchema>;
export type PaymentTransaction = typeof paymentTransactions.$inferSelect;

export const insertWebhookLogSchema = createInsertSchema(webhookLogs).omit({ id: true, receivedAt: true });
export type InsertWebhookLog = z.infer<typeof insertWebhookLogSchema>;
export type WebhookLog = typeof webhookLogs.$inferSelect;
