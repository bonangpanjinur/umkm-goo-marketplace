const API_BASE = import.meta.env.VITE_API_URL ?? "/api";

export interface InitiatePaymentPayload {
  order_id: string;
  amount: number;
  payment_method: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  items?: Array<{ id: string; name: string; price: number; quantity: number }>;
  success_redirect_url?: string;
  failure_redirect_url?: string;
}

export interface InitiatePaymentResult {
  gateway: "midtrans" | "xendit" | "manual";
  transaction_id: string;
  snap_token?: string;
  payment_url?: string;
  invoice_id?: string;
  status: "pending" | "paid" | "failed";
}

export interface PaymentStatusResult {
  order_id: string;
  transaction_id: string;
  gateway: string;
  status: "pending" | "paid" | "failed" | "expired";
  payment_method?: string;
  payment_url?: string;
  snap_token?: string;
  paid_at?: string;
  amount?: string;
  currency?: string;
}

export async function initiatePayment(
  payload: InitiatePaymentPayload,
): Promise<InitiatePaymentResult> {
  const res = await fetch(`${API_BASE}/payments/initiate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Gagal membuat transaksi pembayaran");
  return data as InitiatePaymentResult;
}

export async function getPaymentStatus(orderId: string): Promise<PaymentStatusResult> {
  const res = await fetch(`${API_BASE}/payments/${encodeURIComponent(orderId)}/status`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Gagal mendapatkan status pembayaran");
  return data as PaymentStatusResult;
}

export function isGatewayPaymentMethod(method: string): boolean {
  return ["gopay", "ovo", "shopeepay", "dana", "cc", "qris", "xendit_invoice"].includes(method);
}

export function openMidtransSnap(snapToken: string, callbacks: {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
}): void {
  const w = window as unknown as Record<string, unknown>;
  if (!w["snap"]) {
    console.warn("Midtrans Snap.js belum dimuat");
    if (callbacks.onError) callbacks.onError({ message: "Midtrans Snap tidak tersedia" });
    return;
  }
  const snap = w["snap"] as {
    pay: (token: string, options: typeof callbacks) => void;
  };
  snap.pay(snapToken, {
    onSuccess: callbacks.onSuccess,
    onPending: callbacks.onPending,
    onError: callbacks.onError,
    onClose: callbacks.onClose,
  });
}
