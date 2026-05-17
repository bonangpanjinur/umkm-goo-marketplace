import { supabase } from "@/integrations/supabase/client";

/**
 * Tulis baris ke `staff_audit_logs` untuk aksi sensitif.
 * Best-effort: kegagalan log TIDAK boleh menggagalkan aksi user.
 *
 * Skema tabel: shop_id, actor_id, target_user_id?, target_email?, target_name?,
 *              action, meta (jsonb)
 *
 * Pakai di:
 *  - Void / cancel order
 *  - Refund
 *  - Edit harga menu
 *  - Hapus record (menu, customer, dll)
 *  - Akses laporan keuangan / withdrawal
 */
export type AuditAction =
  | "order.void"
  | "order.refund"
  | "order.edit"
  | "menu.edit_price"
  | "menu.delete"
  | "customer.delete"
  | "finance.view"
  | "finance.withdraw"
  | "shift.close"
  | "inventory.adjust"
  | "staff.permissions_update";

export async function logStaffAction(params: {
  shopId: string;
  action: AuditAction;
  targetUserId?: string;
  targetEmail?: string;
  targetName?: string;
  meta?: Record<string, unknown>;
}) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("staff_audit_logs").insert({
      shop_id: params.shopId,
      actor_id: u.user.id,
      action: params.action,
      target_user_id: params.targetUserId ?? null,
      target_email: params.targetEmail ?? null,
      target_name: params.targetName ?? null,
      meta: params.meta ?? {},
    });
  } catch (err) {
    // Sengaja silent — audit log tidak boleh blok aksi user
    if (import.meta.env.DEV) console.warn("[audit] gagal tulis log:", err);
  }
}
