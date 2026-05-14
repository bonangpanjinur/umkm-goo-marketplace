/**
 * M-18 Edge Function: send-review-requests
 *
 * Dapat dipanggil via:
 *   a) Supabase Dashboard → Edge Functions → Cron  (jadwal harian 09:00 WIB / 02:00 UTC)
 *   b) HTTP POST manual untuk testing
 *
 * Env vars (otomatis tersedia di Supabase Edge Runtime):
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Opsional — atur CRON_SECRET di Supabase Secrets untuk mengamankan endpoint:
 *   Authorization: Bearer <CRON_SECRET>
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req: Request) => {
  // Opsional: verifikasi CRON_SECRET jika di-set
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret) {
    const auth = req.headers.get("Authorization") ?? "";
    if (auth !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Panggil fungsi PostgreSQL yang sudah didefinisikan di migration
  const { data, error } = await supabase.rpc("fn_send_review_requests");

  if (error) {
    console.error("[send-review-requests] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const sent = data as number;
  console.log(`[send-review-requests] Sent ${sent} review request(s).`);

  return new Response(
    JSON.stringify({ ok: true, sent }),
    { headers: { "Content-Type": "application/json" } },
  );
});
