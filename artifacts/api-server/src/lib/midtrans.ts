import { httpFetch } from "./fetch-types.js";

const MIDTRANS_SANDBOX_BASE = "https://app.sandbox.midtrans.com";
const MIDTRANS_PRODUCTION_BASE = "https://app.midtrans.com";

export type MidtransMode = "sandbox" | "production";

export interface MidtransConfig {
  serverKey: string;
  mode: MidtransMode;
}

export interface MidtransSnapPayload {
  transaction_details: {
    order_id: string;
    gross_amount: number;
  };
  customer_details?: {
    first_name?: string;
    phone?: string;
    email?: string;
  };
  item_details?: Array<{
    id: string;
    price: number;
    quantity: number;
    name: string;
  }>;
  expiry?: {
    unit: "day" | "hour" | "minute";
    duration: number;
  };
}

export interface MidtransSnapResponse {
  token: string;
  redirect_url: string;
}

export interface MidtransNotification {
  order_id: string;
  transaction_id: string;
  transaction_status: string;
  fraud_status?: string;
  payment_type?: string;
  gross_amount?: string;
  signature_key?: string;
  status_code?: string;
}

function buildAuthHeader(serverKey: string): string {
  return "Basic " + Buffer.from(serverKey + ":").toString("base64");
}

export async function createSnapTransaction(
  config: MidtransConfig,
  payload: MidtransSnapPayload,
): Promise<MidtransSnapResponse> {
  const base = config.mode === "production" ? MIDTRANS_PRODUCTION_BASE : MIDTRANS_SANDBOX_BASE;
  const res = await httpFetch(`${base}/snap/v1/transactions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: buildAuthHeader(config.serverKey),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Midtrans Snap error ${res.status}: ${body}`);
  }

  return res.json() as Promise<MidtransSnapResponse>;
}

export async function getMidtransTransactionStatus(
  config: MidtransConfig,
  orderId: string,
): Promise<Record<string, unknown>> {
  const base = config.mode === "production" ? MIDTRANS_PRODUCTION_BASE : MIDTRANS_SANDBOX_BASE;
  const res = await httpFetch(`${base}/v2/${encodeURIComponent(orderId)}/status`, {
    headers: {
      Accept: "application/json",
      Authorization: buildAuthHeader(config.serverKey),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Midtrans status error ${res.status}: ${body}`);
  }

  return res.json() as Promise<Record<string, unknown>>;
}

import crypto from "node:crypto";

export function verifyMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string,
  signatureKey: string,
): boolean {
  const hash = crypto
    .createHash("sha512")
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest("hex");
  return hash === signatureKey;
}

export function isMidtransPaymentSuccess(notification: MidtransNotification): boolean {
  const { transaction_status, fraud_status } = notification;
  return (
    transaction_status === "capture" && (fraud_status === "accept" || !fraud_status)
  ) || transaction_status === "settlement";
}

export function isMidtransPaymentFailed(notification: MidtransNotification): boolean {
  return ["deny", "cancel", "expire", "failure"].includes(notification.transaction_status);
}

export interface MidtransRefundPayload {
  refund_key: string;
  amount: number;
  reason: string;
}

export interface MidtransRefundResponse {
  transaction_id: string;
  order_id: string;
  refund_key: string;
  refund_amount: string;
  refund_status: string;
  reason: string;
}

export async function refundMidtransTransaction(
  config: MidtransConfig,
  gatewayTransactionId: string,
  payload: MidtransRefundPayload,
): Promise<MidtransRefundResponse> {
  const base = config.mode === "production" ? MIDTRANS_PRODUCTION_BASE : MIDTRANS_SANDBOX_BASE;
  const res = await httpFetch(
    `${base}/v2/${encodeURIComponent(gatewayTransactionId)}/refund`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: buildAuthHeader(config.serverKey),
      },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Midtrans refund error ${res.status}: ${body}`);
  }

  return res.json() as Promise<MidtransRefundResponse>;
}
