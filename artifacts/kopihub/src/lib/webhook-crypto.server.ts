/**
 * Server-only crypto helpers for webhook signature verification.
 *
 * The `.server.ts` suffix + the `block-server-only-imports` plugin in
 * vite.config.ts guarantee this file never lands in the client bundle.
 * Any client-side `import` of this module — direct or transitive —
 * fails the Vite build immediately.
 */
import { createHash, timingSafeEqual } from "node:crypto";

export function verifyMidtrans(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
  serverKey: string,
): boolean {
  const concat = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const exp = createHash("sha512").update(concat).digest("hex");
  try {
    const a = Buffer.from(signatureKey);
    const b = Buffer.from(exp);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function verifyXendit(rawToken: string | null, callbackToken: string): boolean {
  if (!rawToken) return false;
  try {
    const a = Buffer.from(rawToken);
    const b = Buffer.from(callbackToken);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}