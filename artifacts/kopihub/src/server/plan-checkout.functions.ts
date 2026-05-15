import { supabase } from "@/integrations/supabase/client";

/**
 * createPlanCheckout — buat invoice paket lalu sambung ke payment gateway (Midtrans/Xendit).
 *
 * Versi MVP: invoice dibuat via RPC `create_plan_invoice`, lalu jika provider ≠ manual,
 * server fn ini menyiapkan payload checkout & menyimpan checkout_url placeholder.
 * Eksekusi panggilan HTTP ke Midtrans/Xendit dilakukan di TanStack server function
 * (memanggil endpoint provider dengan SERVER_KEY dari env). Untuk environment tanpa
 * server function, owner melakukan pembayaran via halaman manual transfer.
 */
export async function createPlanCheckout({
  data,
}: {
  data: { planCode: string; provider: "midtrans" | "xendit" | "manual" | "qris" };
}) {
  // 1. Buat invoice via RPC
  const { data: invoice, error: invErr } = await supabase.rpc("create_plan_invoice" as any, {
    _plan_code: data.planCode,
  });
  if (invErr) throw invErr;

  const invoiceId =
    typeof invoice === "string"
      ? invoice
      : (invoice as any)?.id ?? (invoice as any)?.invoice_id;

  // 2. Update payment_method
  await supabase
    .from("plan_invoices" as any)
    .update({ payment_method: data.provider })
    .eq("id", invoiceId);

  // 3. Untuk manual / qris — tidak perlu redirect, owner upload bukti dari halaman billing
  if (data.provider === "manual" || data.provider === "qris") {
    return { invoiceId, checkoutUrl: null, provider: data.provider };
  }

  // 4. Untuk Midtrans/Xendit — minta server function (admin-managed) untuk
  // membuat sesi checkout. Fallback: balikkan invoiceId dan biarkan owner
  // upload bukti manual jika gateway belum dikonfigurasi.
  try {
    const { data: session, error: sessErr } = await supabase.functions.invoke(
      "create-plan-checkout-session",
      { body: { invoiceId, provider: data.provider } }
    );
    if (sessErr) throw sessErr;
    const checkoutUrl = (session as any)?.checkout_url ?? null;
    if (checkoutUrl) {
      await supabase
        .from("plan_invoices" as any)
        .update({ checkout_url: checkoutUrl, provider_ref: (session as any)?.provider_ref ?? null })
        .eq("id", invoiceId);
    }
    return { invoiceId, checkoutUrl, provider: data.provider };
  } catch (e) {
    // Gateway belum dikonfigurasi atau function tidak tersedia.
    // Tetap kembalikan invoice — owner bisa upload bukti dari halaman billing.
    console.warn("Gateway session not created:", (e as Error).message);
    return { invoiceId, checkoutUrl: null, provider: data.provider };
  }
}