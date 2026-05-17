import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Scheduler tunggal untuk seluruh notifikasi & automasi periodik UMKMgo.
 *
 * URL: /api/public/hooks/scheduler
 * Dipanggil pg_cron (lihat migration cron) tiap 15 menit.
 *
 * Tugas:
 * 1. Obat hampir ED (≤30 hari) → notif owner klinik.
 * 2. Stok rendah: ingredients & medications.
 * 3. Maintenance rental due (next_service_at ≤ 7 hari).
 * 4. Batch travel ≤7 hari + slot tersisa <20%.
 * 5. Auto-cancel order pending lewat deadline (platform_settings).
 *
 * Idempotency: setiap notif pakai `dedupe_key` unik per (shop, item, bucket waktu)
 * sehingga rerun tidak menggandakan baris di `owner_notifications`.
 */

type NotifRow = {
  shop_id: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  severity?: "info" | "warning" | "critical";
  dedupe_key: string;
};

async function insertNotifs(rows: NotifRow[]): Promise<number> {
  if (rows.length === 0) return 0;
  // ON CONFLICT (shop_id, dedupe_key) DO NOTHING via upsert.
  const { error, count } = await supabaseAdmin
    .from("owner_notifications")
    .upsert(rows, { onConflict: "shop_id,dedupe_key", ignoreDuplicates: true, count: "exact" });
  if (error) console.error("[scheduler] notif insert", error);
  return count ?? 0;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysFromNow(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function checkExpiringMeds(): Promise<NotifRow[]> {
  const limit = daysFromNow(30);
  const { data, error } = await supabaseAdmin
    .from("medications")
    .select("id, shop_id, name, expiry_date, stock")
    .eq("is_active", true)
    .not("expiry_date", "is", null)
    .lte("expiry_date", limit)
    .gt("stock", 0);
  if (error) { console.error("[scheduler] meds", error); return []; }
  return (data ?? []).map((m) => ({
    shop_id: m.shop_id,
    type: "med_expiring",
    title: `Obat hampir ED: ${m.name}`,
    body: `${m.name} ED ${m.expiry_date} (stok ${m.stock}).`,
    link: `/pos-app/medications`,
    severity: "warning" as const,
    dedupe_key: `med_ed:${m.id}:${m.expiry_date}`,
  }));
}

async function checkLowStock(): Promise<NotifRow[]> {
  const out: NotifRow[] = [];
  const week = today().slice(0, 8); // bucket per minggu (kasar): YYYY-MM-

  const { data: ings } = await supabaseAdmin
    .from("ingredients")
    .select("id, shop_id, name, current_stock, min_stock, unit")
    .eq("is_active", true);
  for (const i of ings ?? []) {
    if (Number(i.current_stock) <= Number(i.min_stock) && Number(i.min_stock) > 0) {
      out.push({
        shop_id: i.shop_id,
        type: "low_stock_ingredient",
        title: `Stok rendah: ${i.name}`,
        body: `${i.current_stock} ${i.unit} (min ${i.min_stock}).`,
        link: `/pos-app/inventory`,
        severity: "warning",
        dedupe_key: `low_ing:${i.id}:${week}`,
      });
    }
  }

  const { data: meds } = await supabaseAdmin
    .from("medications")
    .select("id, shop_id, name, stock, low_stock_threshold, unit")
    .eq("is_active", true);
  for (const m of meds ?? []) {
    if (m.stock <= m.low_stock_threshold && m.low_stock_threshold > 0) {
      out.push({
        shop_id: m.shop_id,
        type: "low_stock_med",
        title: `Stok obat rendah: ${m.name}`,
        body: `${m.stock} ${m.unit ?? "pcs"} (min ${m.low_stock_threshold}).`,
        link: `/pos-app/medications`,
        severity: "warning",
        dedupe_key: `low_med:${m.id}:${week}`,
      });
    }
  }
  return out;
}

async function checkRentalMaintenance(): Promise<NotifRow[]> {
  const limit = daysFromNow(7);
  const { data, error } = await supabaseAdmin
    .from("rental_units")
    .select("id, shop_id, name, unit_code, next_service_at")
    .eq("is_active", true)
    .not("next_service_at", "is", null)
    .lte("next_service_at", limit);
  if (error) { console.error("[scheduler] rental", error); return []; }
  return (data ?? []).map((u) => ({
    shop_id: u.shop_id,
    type: "rental_maintenance_due",
    title: `Servis ${u.name}${u.unit_code ? ` (${u.unit_code})` : ""}`,
    body: `Jadwal servis ${u.next_service_at}.`,
    link: `/pos-app/rental`,
    severity: "info" as const,
    dedupe_key: `rental_svc:${u.id}:${u.next_service_at}`,
  }));
}

async function checkTravelBatches(): Promise<NotifRow[]> {
  const limit = daysFromNow(7);
  const { data, error } = await supabaseAdmin
    .from("umroh_packages")
    .select("id, shop_id, name, departure_date, quota_total, quota_filled")
    .eq("is_active", true)
    .not("departure_date", "is", null)
    .lte("departure_date", limit)
    .gte("departure_date", today());
  if (error) { console.error("[scheduler] travel", error); return []; }
  return (data ?? [])
    .filter((p) => {
      if (!p.quota_total || p.quota_total <= 0) return true;
      return p.quota_filled / p.quota_total < 0.8;
    })
    .map((p) => ({
      shop_id: p.shop_id,
      type: "travel_batch_low_fill",
      title: `Batch ${p.name} berangkat ${p.departure_date}`,
      body: p.quota_total
        ? `Terisi ${p.quota_filled}/${p.quota_total}.`
        : `Kuota belum ditetapkan.`,
      link: `/pos-app/travel`,
      severity: "warning" as const,
      dedupe_key: `travel:${p.id}:${p.departure_date}`,
    }));
}

async function autoCancelPendingOrders(): Promise<number> {
  // Baca platform_settings (default 24 jam).
  const { data: settings } = await supabaseAdmin
    .from("platform_settings")
    .select("key, value")
    .in("key", ["auto_cancel_hours", "auto_cancel_enabled"]);
  let hours = 24;
  let enabled = true;
  for (const row of settings ?? []) {
    if (row.key === "auto_cancel_hours") hours = Number(row.value) || 24;
    if (row.key === "auto_cancel_enabled") enabled = row.value !== "false";
  }
  if (!enabled) return 0;

  const cutoff = new Date(Date.now() - hours * 3600_000).toISOString();
  const { data, error } = await supabaseAdmin
    .from("orders")
    .update({ status: "cancelled" })
    .in("status", ["pending", "awaiting_payment"])
    .lt("created_at", cutoff)
    .select("id");
  if (error) { console.error("[scheduler] auto-cancel", error); return 0; }
  return data?.length ?? 0;
}

export const Route = createFileRoute("/api/public/hooks/scheduler")({
  server: {
    handlers: {
      POST: async () => {
        const started = Date.now();
        const results: Record<string, number> = {};

        try {
          const [meds, lowStock, rental, travel] = await Promise.all([
            checkExpiringMeds(),
            checkLowStock(),
            checkRentalMaintenance(),
            checkTravelBatches(),
          ]);

          results.med_expiring = await insertNotifs(meds);
          results.low_stock = await insertNotifs(lowStock);
          results.rental_maintenance = await insertNotifs(rental);
          results.travel_batches = await insertNotifs(travel);
          results.auto_cancelled = await autoCancelPendingOrders();
        } catch (e) {
          console.error("[scheduler] fatal", e);
          return new Response(
            JSON.stringify({ ok: false, error: (e as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({
            ok: true,
            elapsed_ms: Date.now() - started,
            results,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
      GET: async () => new Response("ok"),
    },
  },
});
