const SUPABASE_URL = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "";
const SUPABASE_SERVICE_KEY = process.env["SUPABASE_SERVICE_KEY"] ?? process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";

/**
 * Update a single row in a Supabase table via the REST API.
 * Uses service role key (or fallback to publishable key) to bypass RLS.
 */
export async function supabaseUpdate(
  table: string,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn("[supabase-admin] SUPABASE_URL or service key not set; skipping update");
    return;
  }
  const url = `${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase PATCH ${table} failed ${res.status}: ${text}`);
  }
}

/**
 * Insert a row into a Supabase table via the REST API.
 */
export async function supabaseInsert(
  table: string,
  row: Record<string, unknown>,
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_SERVICE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_KEY}`,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(row),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase INSERT ${table} failed ${res.status}: ${text}`);
  }
}
