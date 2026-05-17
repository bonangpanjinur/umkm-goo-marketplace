/**
 * Server-only crypto helpers for webhook signature verification.
 *
 * Uses Web Crypto API (globalThis.crypto.subtle) instead of `node:crypto`
 * so the module is safe to bundle in any runtime (Cloudflare Workers,
 * Node 20+, browser). The `.server.ts` suffix is kept as a convention
 * marker — these helpers are only ever invoked from server route handlers.
 */

function toBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyMidtrans(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
  serverKey: string,
): Promise<boolean> {
  const concat = `${orderId}${statusCode}${grossAmount}${serverKey}`;
  const digest = await globalThis.crypto.subtle.digest("SHA-512", toBytes(concat));
  const expected = toHex(digest);
  return timingSafeEqualBytes(toBytes(signatureKey), toBytes(expected));
}

export function verifyXendit(rawToken: string | null, callbackToken: string): boolean {
  if (!rawToken) return false;
  return timingSafeEqualBytes(toBytes(rawToken), toBytes(callbackToken));
}
