/**
 * F1-3: Email service menggunakan Resend API.
 * Digunakan untuk: staff invitation, renewal reminder, invoice notification.
 * Jika RESEND_API_KEY tidak di-set, email akan di-log ke console (dev mode).
 */
import { Resend } from "resend";
import { logger } from "./logger.js";

const apiKey = process.env["RESEND_API_KEY"];
const resend = apiKey ? new Resend(apiKey) : null;

const FROM_DEFAULT =
  process.env["EMAIL_FROM"] ?? "UMKMgo <noreply@umkmgo.id>";

export interface EmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(payload: EmailPayload): Promise<{ ok: boolean; id?: string; error?: string }> {
  const toArr = Array.isArray(payload.to) ? payload.to : [payload.to];

  if (!resend) {
    logger.warn({ to: toArr, subject: payload.subject }, "[email] RESEND_API_KEY tidak di-set — email dilewati (dev mode)");
    return { ok: true, id: "dev-skipped" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_DEFAULT,
      to: toArr,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
    });

    if (error) {
      logger.error({ error, to: toArr }, "[email] Gagal kirim email via Resend");
      return { ok: false, error: error.message };
    }

    logger.info({ id: data?.id, to: toArr, subject: payload.subject }, "[email] Email terkirim");
    return { ok: true, id: data?.id };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err, to: toArr }, "[email] Exception saat kirim email");
    return { ok: false, error: msg };
  }
}

// ── Template helpers ──────────────────────────────────────────────────────────

export function staffInvitationHtml(opts: {
  shopName: string;
  inviterName?: string;
  role: string;
  inviteUrl: string;
  expiresAt: string;
}): string {
  const expDate = new Date(opts.expiresAt).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
  return `
<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Undangan Bergabung</title></head>
<body style="font-family:sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,.08);">
    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">Undangan Bergabung ke ${opts.shopName}</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
      ${opts.inviterName ? `<strong>${opts.inviterName}</strong> mengundang kamu` : "Kamu diundang"} 
      sebagai <strong>${opts.role}</strong> di <strong>${opts.shopName}</strong>.
    </p>
    <a href="${opts.inviteUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">
      Terima Undangan
    </a>
    <p style="color:#9ca3af;font-size:12px;margin-top:20px;">
      Link berlaku hingga ${expDate}. Jangan bagikan link ini ke orang lain.
    </p>
  </div>
</body>
</html>
`.trim();
}

export function renewalReminderHtml(opts: {
  shopName: string;
  daysRemaining: number;
  expiresAt: string;
  renewUrl: string;
}): string {
  const expDate = new Date(opts.expiresAt).toLocaleDateString("id-ID", {
    day: "numeric", month: "long", year: "numeric",
  });
  const urgency = opts.daysRemaining <= 1
    ? "⛔ Paket Pro Anda berakhir HARI INI"
    : opts.daysRemaining <= 3
    ? `⚠️ Paket Pro berakhir dalam ${opts.daysRemaining} hari`
    : `ℹ️ Pengingat: Paket Pro berakhir dalam ${opts.daysRemaining} hari`;

  return `
<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><title>Perpanjang Paket Pro</title></head>
<body style="font-family:sans-serif;background:#f9fafb;margin:0;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;box-shadow:0 1px 4px rgba(0,0,0,.08);">
    <h2 style="margin:0 0 8px;color:#111827;font-size:20px;">${urgency}</h2>
    <p style="color:#6b7280;font-size:14px;margin:0 0 8px;">
      Halo <strong>${opts.shopName}</strong>,
    </p>
    <p style="color:#6b7280;font-size:14px;margin:0 0 24px;">
      Paket Pro toko Anda akan berakhir pada <strong>${expDate}</strong>. 
      Perpanjang sekarang agar fitur premium tetap aktif dan toko tidak terdampak.
    </p>
    <a href="${opts.renewUrl}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:15px;">
      Perpanjang Sekarang
    </a>
    <p style="color:#9ca3af;font-size:12px;margin-top:20px;">
      Email ini dikirim otomatis karena Anda adalah pemilik toko aktif di UMKMgo.
    </p>
  </div>
</body>
</html>
`.trim();
}
