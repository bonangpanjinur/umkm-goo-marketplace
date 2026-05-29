import { httpFetch } from "./fetch-types.js";

export type XenditMode = "test" | "live";

export interface XenditConfig {
  secretKey: string;
  webhookToken: string;
  mode: XenditMode;
}

const XENDIT_BASE = "https://api.xendit.co";

export interface XenditCreateInvoicePayload {
  external_id: string;
  amount: number;
  payer_email?: string;
  description?: string;
  currency?: string;
  invoice_duration?: number;
  customer?: {
    given_names?: string;
    mobile_number?: string;
    email?: string;
  };
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
    url?: string;
    category?: string;
    type?: string;
  }>;
  success_redirect_url?: string;
  failure_redirect_url?: string;
  payment_methods?: string[];
}

export interface XenditInvoice {
  id: string;
  external_id: string;
  invoice_url: string;
  status: string;
  amount: number;
  currency: string;
  expiry_date: string;
  created: string;
}

export interface XenditWebhookPayload {
  id: string;
  external_id: string;
  status: string;
  payment_method?: string;
  amount: number;
  paid_amount?: number;
  paid_at?: string;
  payment_id?: string;
  payment_channel?: string;
}

function buildAuthHeader(secretKey: string): string {
  return "Basic " + Buffer.from(secretKey + ":").toString("base64");
}

export async function createXenditInvoice(
  config: XenditConfig,
  payload: XenditCreateInvoicePayload,
): Promise<XenditInvoice> {
  const res = await httpFetch(`${XENDIT_BASE}/v2/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: buildAuthHeader(config.secretKey),
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xendit invoice error ${res.status}: ${body}`);
  }

  return res.json() as Promise<XenditInvoice>;
}

export async function getXenditInvoice(
  config: XenditConfig,
  invoiceId: string,
): Promise<XenditInvoice> {
  const res = await httpFetch(`${XENDIT_BASE}/v2/invoices/${encodeURIComponent(invoiceId)}`, {
    headers: {
      Accept: "application/json",
      Authorization: buildAuthHeader(config.secretKey),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Xendit get invoice error ${res.status}: ${body}`);
  }

  return res.json() as Promise<XenditInvoice>;
}

export function verifyXenditWebhookToken(
  receivedToken: string,
  expectedToken: string,
): boolean {
  if (!receivedToken || !expectedToken) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(receivedToken),
      Buffer.from(expectedToken),
    );
  } catch {
    return false;
  }
}

import crypto from "node:crypto";

export function isXenditPaymentSuccess(payload: XenditWebhookPayload): boolean {
  return payload.status === "PAID";
}

export function isXenditPaymentFailed(payload: XenditWebhookPayload): boolean {
  return ["EXPIRED", "FAILED"].includes(payload.status);
}
