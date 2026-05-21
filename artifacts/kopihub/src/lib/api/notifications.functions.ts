import { supabase } from "@/integrations/supabase/client";

// Tabel `notifications`:
//   recipient_user_id, shop_id, type, title, body, link, severity,
//   read_at, dismissed_at, dedupe_key, created_at
//
// Semantik:
// - read_at   = sudah dibaca (badge unread hilang, item masih tampak)
// - dismissed_at = ditutup user (hilang dari daftar aktif)

export async function listMyNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("notifications" as any)
    .select("id, type, title, body, link, severity, read_at, created_at")
    .eq("recipient_user_id", user.id)
    .is("dismissed_at", null)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function markNotification({ data }: { data: { id: string; action: "read" | "dismiss" } }) {
  const now = new Date().toISOString();
  const update = data.action === "dismiss"
    ? { read_at: now, dismissed_at: now }
    : { read_at: now };
  const { error } = await supabase.from("notifications" as any).update(update).eq("id", data.id);
  if (error) throw error;
  return { ok: true };
}

export async function dismissAllNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("not_authenticated");
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("notifications" as any)
    .update({ read_at: now, dismissed_at: now })
    .eq("recipient_user_id", user.id)
    .is("dismissed_at", null);
  if (error) throw error;
  return { ok: true };
}

export async function markAllNotificationsRead() {
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
