import { supabase } from "@/integrations/supabase/client";

// Tabel `notifications` skema aktual:
//   recipient_user_id, shop_id, type, title, body, link, severity,
//   read_at, dedupe_key, created_at
// (tidak ada user_id / dismissed_at — "dismiss" dipetakan ke read_at)

export async function listMyNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("notifications" as any)
    .select("id, type, title, body, link, severity, read_at, created_at")
    .eq("recipient_user_id", user.id)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function markNotification({ data }: { data: { id: string; action: "read" | "dismiss" } }) {
  // "dismiss" diperlakukan sama dgn "read" karena tabel tidak punya kolom dismissed_at
  const update = { read_at: new Date().toISOString() };
  const { error } = await supabase.from("notifications" as any).update(update).eq("id", data.id);
  if (error) throw error;
  return { ok: true };
}

export async function dismissAllNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");
  const { error } = await supabase
    .from("notifications" as any)
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_user_id", user.id)
    .is("read_at", null);
  if (error) throw error;
  return { ok: true };
}
