import type { MidtransConfig } from "./midtrans.js";
import type { XenditConfig } from "./xendit.js";

export interface GatewaySettings {
  midtrans_enabled: boolean;
  midtrans_server_key: string | null;
  midtrans_client_key: string | null;
  midtrans_mode: "sandbox" | "production";
  xendit_enabled: boolean;
  xendit_secret_key: string | null;
  xendit_webhook_token: string | null;
  xendit_mode: "test" | "live";
  manual_transfer_enabled: boolean;
  qris_enabled: boolean;
}

const DEFAULTS: GatewaySettings = {
  midtrans_enabled: false,
  midtrans_server_key: null,
  midtrans_client_key: null,
  midtrans_mode: "sandbox",
  xendit_enabled: false,
  xendit_secret_key: null,
  xendit_webhook_token: null,
  xendit_mode: "test",
  manual_transfer_enabled: true,
  qris_enabled: false,
};

export function getMidtransConfigFromEnv(): MidtransConfig | null {
  const serverKey = process.env["MIDTRANS_SERVER_KEY"];
  if (!serverKey) return null;
  return {
    serverKey,
    mode: (process.env["MIDTRANS_MODE"] as "sandbox" | "production") || "sandbox",
  };
}

export function getXenditConfigFromEnv(): XenditConfig | null {
  const secretKey = process.env["XENDIT_SECRET_KEY"];
  const webhookToken = process.env["XENDIT_WEBHOOK_TOKEN"] || "";
  if (!secretKey) return null;
  return {
    secretKey,
    webhookToken,
    mode: (process.env["XENDIT_MODE"] as "test" | "live") || "test",
  };
}

export function mergeGatewaySettings(
  dbSettings: Partial<GatewaySettings> | null | undefined,
): GatewaySettings {
  const base = { ...DEFAULTS, ...(dbSettings ?? {}) };
  const envMidtrans = getMidtransConfigFromEnv();
  if (envMidtrans) {
    base.midtrans_server_key = envMidtrans.serverKey;
    base.midtrans_mode = envMidtrans.mode;
    base.midtrans_enabled = true;
  }
  const envXendit = getXenditConfigFromEnv();
  if (envXendit) {
    base.xendit_secret_key = envXendit.secretKey;
    base.xendit_webhook_token = envXendit.webhookToken;
    base.xendit_mode = envXendit.mode;
    base.xendit_enabled = true;
  }
  return base;
}

export function buildMidtransConfig(settings: GatewaySettings): MidtransConfig {
  if (!settings.midtrans_server_key) {
    throw new Error("Midtrans server key tidak dikonfigurasi");
  }
  return {
    serverKey: settings.midtrans_server_key,
    mode: settings.midtrans_mode,
  };
}

export function buildXenditConfig(settings: GatewaySettings): XenditConfig {
  if (!settings.xendit_secret_key) {
    throw new Error("Xendit secret key tidak dikonfigurasi");
  }
  return {
    secretKey: settings.xendit_secret_key,
    webhookToken: settings.xendit_webhook_token || "",
    mode: settings.xendit_mode,
  };
}
