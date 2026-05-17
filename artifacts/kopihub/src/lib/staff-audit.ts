import { supabase } from "@/integrations/supabase/client";

/**
 * Tulis baris ke `staff_audit_logs` untuk aksi sensitif.
 * Best-effort: kegagalan log TIDAK boleh menggagalkan aksi user.
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
  | "inventory.adjust";

export async function logStaffAction(params: {
  shopId: string;
  action: AuditAction;
  targetType?: string; // mis. 'order', 'menu_item'
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("staff_audit_logs").insert({
      shop_id: params.shopId,
      user_id: u.user.id,
      action: params.action,
      target_type: params.targetType ?? null,
      target_id: params.targetId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch (err) {
    // Sengaja silent — audit log tidak boleh blok aksi user
    if (import.meta.env.DEV) console.warn("[audit] gagal tulis log:", err);
  }
}
