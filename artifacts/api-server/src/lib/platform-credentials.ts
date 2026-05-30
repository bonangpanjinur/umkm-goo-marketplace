/**
 * Platform Credentials — Fase B
 * Membaca API credentials dari Supabase `platform_settings` menggunakan service role key.
 * Fallback ke environment variables.
 * Cache TTL: 5 menit.
 */
import { logger } from "./logger.js";

const SUPABASE_URL = process.env["SUPABASE_URL"] ?? "";
const SUPABASE_SERVICE_KEY = process.env["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
const CACHE_TTL_MS = 5 * 60 * 1_000;

export type PlatformCredentials = {
  midtrans_server_key?: string;
  midtrans_client_key?: string;
  midtrans_mode?: "sandbox" | "production";
  midtrans_enabled?: boolean;
  xendit_secret_key?: string;
  xendit_webhook_token?: string;
  xendit_mode?: "test" | "live";
  xendit_enabled?: boolean;
  resend_api_key?: string;
  email_from?: string;
  vapid_public_key?: string;
  vapid_private_key?: string;
  vapid_subject?: string;
  wa_api_key?: string;
  wa_api_provider?: string;
  wa_phone?: string;
  admin_secret?: string;
  rajaongkir_api_key?: string;
  supabase_service_key?: string;
};

const CRED_SETTING_KEYS = [
  "payment_credentials",
  "email_credentials",
  "push_credentials",
  "wa_credentials",
  "system_credentials",
];

let _cache: PlatformCredentials | null = null;
let _cacheExpiry = 0;

export async function getPlatformCredentials(): Promise<PlatformCredentials> {
  if (_cache && Date.now() < _cacheExpiry) return _cache;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    _cache = {};
    _cacheExpiry = Date.now() + 60_000;
    return _cache;
  }

  try {
    const keysParam = CRED_SETTING_KEYS.map((k) => `"${k}"`).join(",");
    const url = `${SUPABASE_URL}/rest/v1/platform_settings?key=in.(${CRED_SETTING_KEYS.join(",")})&select=key,value`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      logger.warn({ status: res.status }, "[platform-creds] Supabase query gagal");
      _cache = {};
      _cacheExpiry = Date.now() + 60_000;
      return _cache;
    }

    const rows: Array<{ key: string; value: unknown }> = await res.json();
    const merged: PlatformCredentials = {};
    for (const row of rows) {
      const val = typeof row.value === "string" ? JSON.parse(row.value) : (row.value ?? {});
      Object.assign(merged, val);
    }
    _cache = merged;
    _cacheExpiry = Date.now() + CACHE_TTL_MS;
    logger.info({ keys: rows.map((r) => r.key) }, "[platform-creds] Credentials dimuat dari Supabase");
    return _cache;
  } catch (err) {
    logger.error({ err }, "[platform-creds] Gagal muat credentials dari Supabase");
    _cache = {};
    _cacheExpiry = Date.now() + 60_000;
    return {};
  }
}

export function invalidateCredentialsCache(): void {
  _cache = null;
  _cacheExpiry = 0;
  logger.info("[platform-creds] Cache credentials dihapus");
}

/** Ambil satu credential, fallback ke env var */
export async function getCredential(key: keyof PlatformCredentials): Promise<string | undefined> {
  const creds = await getPlatformCredentials();
  const val = creds[key];
  if (typeof val === "string" && val.trim()) return val;
  const envKey = String(key).toUpperCase();
  return process.env[envKey] ?? undefined;
}
