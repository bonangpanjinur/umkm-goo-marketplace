import { Router } from "express";
import { logger } from "../lib/logger.js";
import { httpFetch } from "../lib/fetch-types.js";

const router = Router();

const SUPABASE_URL = () => process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "";
const SERVICE_KEY = () =>
  process.env["SUPABASE_SERVICE_ROLE_KEY"] ??
  process.env["SUPABASE_SERVICE_KEY"] ??
  "";

function adminHeaders() {
  const key = SERVICE_KEY();
  return {
    "Content-Type": "application/json",
    apikey: key,
    Authorization: `Bearer ${key}`,
  };
}

async function getCallerUserId(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7);
  const url = `${SUPABASE_URL()}/auth/v1/user`;
  const res = await httpFetch(url, {
    headers: {
      apikey: SERVICE_KEY(),
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { id?: string };
  return data?.id ?? null;
}

async function assertOwnsShop(userId: string, shopId: string): Promise<boolean> {
  const url = `${SUPABASE_URL()}/rest/v1/shops?select=id&id=eq.${encodeURIComponent(shopId)}&owner_id=eq.${encodeURIComponent(userId)}&limit=1`;
  const res = await httpFetch(url, { headers: adminHeaders() });
  if (!res.ok) return false;
  const rows = (await res.json()) as Array<{ id: string }>;
  return rows.length > 0;
}

async function findUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
  const url = `${SUPABASE_URL()}/auth/v1/admin/users?email=${encodeURIComponent(email)}`;
  const res = await httpFetch(url, { headers: adminHeaders() });
  if (!res.ok) return null;
  const data = (await res.json()) as { users?: Array<{ id: string; email: string }> };
  const u = data.users?.find((x) => (x.email ?? "").toLowerCase() === email.toLowerCase());
  return u ?? null;
}

function badRequest(res: import("express").Response, message: string) {
  res.status(400).json({ ok: false, error: message });
}

function ensureConfigured(res: import("express").Response): boolean {
  if (!SUPABASE_URL() || !SERVICE_KEY()) {
    res.status(500).json({ ok: false, error: "Server tidak terkonfigurasi (SUPABASE_SERVICE_ROLE_KEY hilang)" });
    return false;
  }
  return true;
}

/**
 * POST /api/staff/create-user
 * body: { shop_id, email, password, full_name?, role, outlet_id?, phone?, avatar_url? }
 * Creates an auth user (or links existing one), assigns role in user_roles,
 * upserts profile, and optionally inserts staff_members entry.
 */
router.post("/staff/create-user", async (req, res) => {
  if (!ensureConfigured(res)) return;
  const callerId = await getCallerUserId(req.headers["authorization"] as string | undefined);
  if (!callerId) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  const shop_id = String(body["shop_id"] ?? "");
  const email = String(body["email"] ?? "").trim().toLowerCase();
  const password = String(body["password"] ?? "");
  const full_name = body["full_name"] ? String(body["full_name"]).trim() : null;
  const role = String(body["role"] ?? "");
  const outlet_id = body["outlet_id"] ? String(body["outlet_id"]) : null;
  const phone = body["phone"] ? String(body["phone"]).trim() : null;
  const avatar_url = body["avatar_url"] ? String(body["avatar_url"]) : null;
  const create_staff_member = body["create_staff_member"] !== false;

  if (!shop_id) return badRequest(res, "shop_id wajib");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest(res, "Email tidak valid");
  if (!password || password.length < 6) return badRequest(res, "Kata sandi minimal 6 karakter");
  if (!["manager", "cashier", "barista"].includes(role)) return badRequest(res, "Peran tidak valid");

  const owns = await assertOwnsShop(callerId, shop_id);
  if (!owns) {
    res.status(403).json({ ok: false, error: "Anda bukan pemilik toko ini" });
    return;
  }

  // 1) Create or fetch auth user
  let userId: string | null = null;
  const createRes = await httpFetch(`${SUPABASE_URL()}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name },
    }),
  });
  if (createRes.ok) {
    const u = (await createRes.json()) as { id?: string };
    userId = u.id ?? null;
  } else {
    const errText = await createRes.text();
    // Email exists → look it up and update its password instead
    if (/already|exist|registered/i.test(errText)) {
      const existing = await findUserByEmail(email);
      if (!existing) {
        res.status(409).json({ ok: false, error: "Email sudah terdaftar tapi tidak ditemukan" });
        return;
      }
      userId = existing.id;
      // Update password for existing user (admin override)
      await httpFetch(`${SUPABASE_URL()}/auth/v1/admin/users/${userId}`, {
        method: "PUT",
        headers: adminHeaders(),
        body: JSON.stringify({ password, email_confirm: true }),
      });
    } else {
      logger.error({ errText }, "[staff] create user failed");
      res.status(500).json({ ok: false, error: "Gagal membuat akun: " + errText });
      return;
    }
  }
  if (!userId) {
    res.status(500).json({ ok: false, error: "User ID tidak diperoleh" });
    return;
  }

  // 2) Upsert profile (display_name + avatar)
  await httpFetch(`${SUPABASE_URL()}/rest/v1/profiles?on_conflict=id`, {
    method: "POST",
    headers: { ...adminHeaders(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({
      id: userId,
      display_name: full_name || email.split("@")[0],
      avatar_url,
    }),
  });

  // 3) Upsert user_roles for this shop
  // Delete any existing role row for this user+shop, then insert fresh
  await httpFetch(
    `${SUPABASE_URL()}/rest/v1/user_roles?user_id=eq.${userId}&shop_id=eq.${shop_id}`,
    { method: "DELETE", headers: adminHeaders() },
  );
  const roleRes = await httpFetch(`${SUPABASE_URL()}/rest/v1/user_roles`, {
    method: "POST",
    headers: { ...adminHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: userId, shop_id, role, outlet_id }),
  });
  if (!roleRes.ok) {
    const t = await roleRes.text();
    logger.warn({ t }, "[staff] role insert failed");
  }

  // 4) Optionally also create staff_members entry (so the candidate appears in schedule)
  if (create_staff_member) {
    await httpFetch(`${SUPABASE_URL()}/rest/v1/staff_members`, {
      method: "POST",
      headers: { ...adminHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify({
        shop_id,
        outlet_id,
        name: full_name || email.split("@")[0],
        role,
        phone,
        avatar_url,
        user_id: userId,
      }),
    });
  }

  res.json({ ok: true, user_id: userId, email });
});

/**
 * POST /api/staff/set-password
 * body: { shop_id, user_id, password }
 * Owner sets/overrides a staff user's password.
 */
router.post("/staff/set-password", async (req, res) => {
  if (!ensureConfigured(res)) return;
  const callerId = await getCallerUserId(req.headers["authorization"] as string | undefined);
  if (!callerId) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const shop_id = String(body["shop_id"] ?? "");
  const user_id = String(body["user_id"] ?? "");
  const password = String(body["password"] ?? "");
  if (!shop_id || !user_id) return badRequest(res, "shop_id & user_id wajib");
  if (!password || password.length < 6) return badRequest(res, "Kata sandi minimal 6 karakter");

  if (!(await assertOwnsShop(callerId, shop_id))) {
    res.status(403).json({ ok: false, error: "Bukan pemilik toko" });
    return;
  }

  // Verify target user is actually staff of this shop
  const checkUrl = `${SUPABASE_URL()}/rest/v1/user_roles?select=id&user_id=eq.${user_id}&shop_id=eq.${shop_id}&limit=1`;
  const cr = await httpFetch(checkUrl, { headers: adminHeaders() });
  const rows = (await cr.json()) as Array<unknown>;
  if (rows.length === 0) {
    res.status(403).json({ ok: false, error: "User bukan pegawai toko ini" });
    return;
  }

  const upRes = await httpFetch(`${SUPABASE_URL()}/auth/v1/admin/users/${user_id}`, {
    method: "PUT",
    headers: adminHeaders(),
    body: JSON.stringify({ password }),
  });
  if (!upRes.ok) {
    const t = await upRes.text();
    res.status(500).json({ ok: false, error: t });
    return;
  }
  res.json({ ok: true });
});

/**
 * POST /api/staff/reset-password
 * body: { shop_id, email }
 * Returns an action_link the owner can share. Also triggers Supabase
 * to send a recovery email if SMTP is configured.
 */
router.post("/staff/reset-password", async (req, res) => {
  if (!ensureConfigured(res)) return;
  const callerId = await getCallerUserId(req.headers["authorization"] as string | undefined);
  if (!callerId) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const shop_id = String(body["shop_id"] ?? "");
  let email = String(body["email"] ?? "").trim().toLowerCase();
  const user_id = body["user_id"] ? String(body["user_id"]) : "";
  const redirect_to = body["redirect_to"] ? String(body["redirect_to"]) : undefined;
  if (!shop_id || (!email && !user_id)) return badRequest(res, "shop_id & (email|user_id) wajib");
  if (!(await assertOwnsShop(callerId, shop_id))) {
    res.status(403).json({ ok: false, error: "Bukan pemilik toko" });
    return;
  }

  // Resolve email from user_id if needed
  if (!email && user_id) {
    const ur = await httpFetch(`${SUPABASE_URL()}/auth/v1/admin/users/${user_id}`, {
      headers: adminHeaders(),
    });
    if (!ur.ok) {
      res.status(404).json({ ok: false, error: "User tidak ditemukan" });
      return;
    }
    const ud = (await ur.json()) as { email?: string };
    email = (ud.email ?? "").toLowerCase();
    if (!email) {
      res.status(404).json({ ok: false, error: "Email user tidak ditemukan" });
      return;
    }
  }

  const linkRes = await httpFetch(`${SUPABASE_URL()}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({
      type: "recovery",
      email,
      ...(redirect_to ? { redirect_to } : {}),
    }),
  });
  if (!linkRes.ok) {
    const t = await linkRes.text();
    res.status(500).json({ ok: false, error: t });
    return;
  }
  const data = (await linkRes.json()) as { action_link?: string; properties?: { action_link?: string } };
  const action_link = data.action_link ?? data.properties?.action_link ?? null;
  res.json({ ok: true, action_link });
});

/**
 * POST /api/staff/delete-user
 * body: { shop_id, user_id, hard_delete?: boolean }
 * By default just removes role from this shop. If hard_delete, removes auth user too.
 */
router.post("/staff/delete-user", async (req, res) => {
  if (!ensureConfigured(res)) return;
  const callerId = await getCallerUserId(req.headers["authorization"] as string | undefined);
  if (!callerId) {
    res.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const shop_id = String(body["shop_id"] ?? "");
  const user_id = String(body["user_id"] ?? "");
  if (!shop_id || !user_id) return badRequest(res, "shop_id & user_id wajib");
  if (!(await assertOwnsShop(callerId, shop_id))) {
    res.status(403).json({ ok: false, error: "Bukan pemilik toko" });
    return;
  }
  await httpFetch(
    `${SUPABASE_URL()}/rest/v1/user_roles?user_id=eq.${user_id}&shop_id=eq.${shop_id}`,
    { method: "DELETE", headers: adminHeaders() },
  );
  await audit(shop_id, callerId, { target_user_id: user_id, action: "remove_login" });
  res.json({ ok: true });
});

async function audit(
  shop_id: string,
  actor_id: string,
  payload: {
    target_user_id?: string | null;
    target_email?: string | null;
    target_name?: string | null;
    action: string;
    meta?: Record<string, unknown>;
  },
) {
  try {
    await httpFetch(`${SUPABASE_URL()}/rest/v1/staff_audit_logs`, {
      method: "POST",
      headers: { ...adminHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify({
        shop_id,
        actor_id,
        target_user_id: payload.target_user_id ?? null,
        target_email: payload.target_email ?? null,
        target_name: payload.target_name ?? null,
        action: payload.action,
        meta: payload.meta ?? {},
      }),
    });
  } catch (e) {
    logger.warn({ e }, "[staff] audit insert failed");
  }
}

/**
 * POST /api/staff/update-role
 * body: { shop_id, user_id, role?, outlet_id?, is_active? }
 */
router.post("/staff/update-role", async (req, res) => {
  if (!ensureConfigured(res)) return;
  const callerId = await getCallerUserId(req.headers["authorization"] as string | undefined);
  if (!callerId) { res.status(401).json({ ok: false, error: "Unauthorized" }); return; }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const shop_id = String(body["shop_id"] ?? "");
  const user_id = String(body["user_id"] ?? "");
  if (!shop_id || !user_id) return badRequest(res, "shop_id & user_id wajib");
  if (!(await assertOwnsShop(callerId, shop_id))) {
    res.status(403).json({ ok: false, error: "Bukan pemilik toko" }); return;
  }
  const patch: Record<string, unknown> = {};
  if (body["role"] !== undefined) {
    const r = String(body["role"]);
    if (!["manager", "cashier", "barista"].includes(r)) return badRequest(res, "Peran tidak valid");
    patch["role"] = r;
  }
  if (body["outlet_id"] !== undefined) patch["outlet_id"] = body["outlet_id"] ? String(body["outlet_id"]) : null;
  if (body["is_active"] !== undefined) patch["is_active"] = !!body["is_active"];
  if (Object.keys(patch).length === 0) return badRequest(res, "Tidak ada perubahan");

  const r = await httpFetch(
    `${SUPABASE_URL()}/rest/v1/user_roles?user_id=eq.${user_id}&shop_id=eq.${shop_id}`,
    { method: "PATCH", headers: { ...adminHeaders(), Prefer: "return=minimal" }, body: JSON.stringify(patch) },
  );
  if (!r.ok) { const t = await r.text(); res.status(500).json({ ok: false, error: t }); return; }
  await audit(shop_id, callerId, { target_user_id: user_id, action: "update_role", meta: patch });
  res.json({ ok: true });
});

/**
 * POST /api/staff/resend-invitation
 * body: { shop_id, invitation_id }
 * Extends expires_at by 14 days and rotates the token.
 */
router.post("/staff/resend-invitation", async (req, res) => {
  if (!ensureConfigured(res)) return;
  const callerId = await getCallerUserId(req.headers["authorization"] as string | undefined);
  if (!callerId) { res.status(401).json({ ok: false, error: "Unauthorized" }); return; }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const shop_id = String(body["shop_id"] ?? "");
  const invitation_id = String(body["invitation_id"] ?? "");
  if (!shop_id || !invitation_id) return badRequest(res, "shop_id & invitation_id wajib");
  if (!(await assertOwnsShop(callerId, shop_id))) {
    res.status(403).json({ ok: false, error: "Bukan pemilik toko" }); return;
  }
  const newToken = (globalThis.crypto?.randomUUID?.() ?? "").replace(/-/g, "") || `${Date.now()}${Math.random()}`.replace(/\D/g, "");
  const newExpiry = new Date(Date.now() + 14 * 86400000).toISOString();
  const r = await httpFetch(
    `${SUPABASE_URL()}/rest/v1/staff_invitations?id=eq.${invitation_id}&shop_id=eq.${shop_id}&select=email,token,expires_at`,
    {
      method: "PATCH",
      headers: { ...adminHeaders(), Prefer: "return=representation" },
      body: JSON.stringify({ token: newToken, expires_at: newExpiry }),
    },
  );
  if (!r.ok) { res.status(500).json({ ok: false, error: await r.text() }); return; }
  const rows = (await r.json()) as Array<{ email: string; token: string; expires_at: string }>;
  if (rows.length === 0) { res.status(404).json({ ok: false, error: "Undangan tidak ditemukan" }); return; }
  await audit(shop_id, callerId, {
    target_email: rows[0].email,
    action: "resend_invitation",
    meta: { invitation_id, new_expires_at: newExpiry },
  });
  res.json({ ok: true, token: rows[0].token, expires_at: rows[0].expires_at });
});

/**
 * POST /api/staff/promote-to-login
 * body: { shop_id, staff_member_id, email, password }
 * Creates auth user from a manual staff entry, links via user_roles.
 */
router.post("/staff/promote-to-login", async (req, res) => {
  if (!ensureConfigured(res)) return;
  const callerId = await getCallerUserId(req.headers["authorization"] as string | undefined);
  if (!callerId) { res.status(401).json({ ok: false, error: "Unauthorized" }); return; }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const shop_id = String(body["shop_id"] ?? "");
  const staff_member_id = String(body["staff_member_id"] ?? "");
  const email = String(body["email"] ?? "").trim().toLowerCase();
  const password = String(body["password"] ?? "");
  if (!shop_id || !staff_member_id) return badRequest(res, "shop_id & staff_member_id wajib");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest(res, "Email tidak valid");
  if (!password || password.length < 6) return badRequest(res, "Kata sandi minimal 6 karakter");
  if (!(await assertOwnsShop(callerId, shop_id))) {
    res.status(403).json({ ok: false, error: "Bukan pemilik toko" }); return;
  }

  // Fetch the manual staff member
  const sr = await httpFetch(
    `${SUPABASE_URL()}/rest/v1/staff_members?id=eq.${staff_member_id}&shop_id=eq.${shop_id}&select=id,name,role,outlet_id,phone,avatar_url`,
    { headers: adminHeaders() },
  );
  const sm = (await sr.json()) as Array<{ id: string; name: string; role: string; outlet_id: string | null; phone: string | null; avatar_url: string | null }>;
  if (sm.length === 0) { res.status(404).json({ ok: false, error: "Pegawai manual tidak ditemukan" }); return; }
  const member = sm[0];

  // Create or fetch auth user
  let userId: string | null = null;
  const cRes = await httpFetch(`${SUPABASE_URL()}/auth/v1/admin/users`, {
    method: "POST",
    headers: adminHeaders(),
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: member.name } }),
  });
  if (cRes.ok) {
    userId = ((await cRes.json()) as { id?: string }).id ?? null;
  } else {
    const t = await cRes.text();
    if (/already|exist|registered/i.test(t)) {
      const ex = await findUserByEmail(email);
      if (!ex) { res.status(409).json({ ok: false, error: "Email terdaftar tapi tidak ditemukan" }); return; }
      userId = ex.id;
      await httpFetch(`${SUPABASE_URL()}/auth/v1/admin/users/${userId}`, {
        method: "PUT", headers: adminHeaders(),
        body: JSON.stringify({ password, email_confirm: true }),
      });
    } else { res.status(500).json({ ok: false, error: t }); return; }
  }
  if (!userId) { res.status(500).json({ ok: false, error: "User ID tidak diperoleh" }); return; }

  // Upsert profile
  await httpFetch(`${SUPABASE_URL()}/rest/v1/profiles?on_conflict=id`, {
    method: "POST",
    headers: { ...adminHeaders(), Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify({ id: userId, display_name: member.name, avatar_url: member.avatar_url }),
  });

  // Insert role
  await httpFetch(`${SUPABASE_URL()}/rest/v1/user_roles?user_id=eq.${userId}&shop_id=eq.${shop_id}`, {
    method: "DELETE", headers: adminHeaders(),
  });
  await httpFetch(`${SUPABASE_URL()}/rest/v1/user_roles`, {
    method: "POST",
    headers: { ...adminHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify({ user_id: userId, shop_id, role: member.role, outlet_id: member.outlet_id }),
  });

  // Link the manual staff_members row to the new auth user so the UI can dedupe
  await httpFetch(
    `${SUPABASE_URL()}/rest/v1/staff_members?id=eq.${staff_member_id}&shop_id=eq.${shop_id}`,
    {
      method: "PATCH",
      headers: { ...adminHeaders(), Prefer: "return=minimal" },
      body: JSON.stringify({ user_id: userId }),
    },
  );

  await audit(shop_id, callerId, {
    target_user_id: userId, target_email: email, target_name: member.name,
    action: "promote_to_login", meta: { staff_member_id },
  });
  res.json({ ok: true, user_id: userId, email });
});

/**
 * POST /api/staff/set-manual-active
 * body: { shop_id, staff_member_id, is_active }
 */
router.post("/staff/set-manual-active", async (req, res) => {
  if (!ensureConfigured(res)) return;
  const callerId = await getCallerUserId(req.headers["authorization"] as string | undefined);
  if (!callerId) { res.status(401).json({ ok: false, error: "Unauthorized" }); return; }
  const body = (req.body ?? {}) as Record<string, unknown>;
  const shop_id = String(body["shop_id"] ?? "");
  const staff_member_id = String(body["staff_member_id"] ?? "");
  const is_active = !!body["is_active"];
  if (!shop_id || !staff_member_id) return badRequest(res, "shop_id & staff_member_id wajib");
  if (!(await assertOwnsShop(callerId, shop_id))) {
    res.status(403).json({ ok: false, error: "Bukan pemilik toko" }); return;
  }
  const r = await httpFetch(
    `${SUPABASE_URL()}/rest/v1/staff_members?id=eq.${staff_member_id}&shop_id=eq.${shop_id}`,
    { method: "PATCH", headers: { ...adminHeaders(), Prefer: "return=minimal" }, body: JSON.stringify({ is_active }) },
  );
  if (!r.ok) { res.status(500).json({ ok: false, error: await r.text() }); return; }
  await audit(shop_id, callerId, {
    action: is_active ? "activate_manual" : "deactivate_manual",
    meta: { staff_member_id },
  });
  res.json({ ok: true });
});

export default router;
