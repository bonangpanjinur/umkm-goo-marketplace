/**
 * Edge Function: shipping-cost
 *
 * Live RajaOngkir cek ongkir proxy.
 * - Auth: Bearer <user JWT> dari supabase client (sudah otomatis attach).
 * - Verifikasi user adalah owner toko sebelum baca API key.
 * - Resolve nama kota → city_id via RajaOngkir /city (di-cache di memory worker).
 * - Panggil /cost per kurir, gabungkan hasil.
 *
 * Body: {
 *   shop_id: string,
 *   origin: string,        // nama kota / kecamatan
 *   destination: string,
 *   weight: number,        // gram
 *   couriers?: string[],   // ['jne','sicepat',...] - fallback ke config shop_api_keys
 * }
 *
 * Response: {
 *   origin_match: { id, name, type, province },
 *   destination_match: { id, name, type, province },
 *   results: [{ courier, service, description, cost, etd }],
 * }
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Endpoint RajaOngkir Starter (publik gratis). Pro: /pro/... — bisa diaktifkan dengan tier=pro di config.
const RO_BASE = "https://api.rajaongkir.com/starter";

// City list di-cache per worker (TTL ~ lifetime worker, max 1 jam).
type City = { city_id: string; city_name: string; type: string; province: string; postal_code: string };
let cityCache: { fetchedAt: number; key: string; cities: City[] } | null = null;

async function fetchCities(apiKey: string): Promise<City[]> {
  const now = Date.now();
  if (cityCache && cityCache.key === apiKey && now - cityCache.fetchedAt < 60 * 60 * 1000) {
    return cityCache.cities;
  }
  const res = await fetch(`${RO_BASE}/city`, { headers: { key: apiKey } });
  if (!res.ok) throw new Error(`RajaOngkir /city HTTP ${res.status}`);
  const json = await res.json();
  const cities: City[] = json?.rajaongkir?.results ?? [];
  cityCache = { fetchedAt: now, key: apiKey, cities };
  return cities;
}

function normalize(s: string) {
  return s.toLowerCase().replace(/kota|kabupaten|kab\.?/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function findCity(cities: City[], query: string): City | null {
  const q = normalize(query);
  if (!q) return null;
  // Exact match name
  let hit = cities.find((c) => normalize(c.city_name) === q);
  if (hit) return hit;
  // Starts with
  hit = cities.find((c) => normalize(c.city_name).startsWith(q));
  if (hit) return hit;
  // Contains
  hit = cities.find((c) => normalize(c.city_name).includes(q));
  if (hit) return hit;
  // Token overlap
  const qTokens = q.split(" ").filter(Boolean);
  hit = cities.find((c) => qTokens.every((t) => normalize(c.city_name).includes(t)));
  return hit ?? null;
}

type CostResult = { courier: string; service: string; description: string; cost: number; etd: string };

async function fetchCost(
  apiKey: string,
  origin: string,
  destination: string,
  weight: number,
  courier: string,
): Promise<CostResult[]> {
  const body = new URLSearchParams({ origin, destination, weight: String(weight), courier });
  const res = await fetch(`${RO_BASE}/cost`, {
    method: "POST",
    headers: { key: apiKey, "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return [];
  const json = await res.json();
  const arr = json?.rajaongkir?.results?.[0];
  if (!arr) return [];
  const courierName: string = arr.name ?? courier;
  const costs = arr.costs ?? [];
  return costs.map((c: any) => ({
    courier: courierName,
    service: c.service,
    description: c.description,
    cost: c?.cost?.[0]?.value ?? 0,
    etd: c?.cost?.[0]?.etd ? `${c.cost[0].etd} hari` : "-",
  }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "content-type": "application/json", ...corsHeaders },
    });
  }

  try {
    // Auth: identifikasi user dari bearer token.
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json", ...corsHeaders },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json", ...corsHeaders },
      });
    }
    const userId = userData.user.id;

    const payload = await req.json().catch(() => ({}));
    const shopId = String(payload.shop_id ?? "");
    const origin = String(payload.origin ?? "").trim();
    const destination = String(payload.destination ?? "").trim();
    const weight = Math.max(1, Math.min(150000, Number(payload.weight) || 1000));
    const requestedCouriers: string[] = Array.isArray(payload.couriers) ? payload.couriers : [];

    if (!shopId || !origin || !destination) {
      return new Response(JSON.stringify({ error: "shop_id, origin, destination wajib diisi" }), {
        status: 400,
        headers: { "content-type": "application/json", ...corsHeaders },
      });
    }

    // Verifikasi user adalah owner toko (atau super_admin) — pakai RPC has_role / is_shop_owner.
    const { data: shopRow, error: shopErr } = await admin
      .from("shops")
      .select("id, owner_id")
      .eq("id", shopId)
      .maybeSingle();
    if (shopErr || !shopRow) {
      return new Response(JSON.stringify({ error: "Toko tidak ditemukan" }), {
        status: 404,
        headers: { "content-type": "application/json", ...corsHeaders },
      });
    }
    if (shopRow.owner_id !== userId) {
      const { data: isAdmin } = await admin.rpc("has_role", {
        _user_id: userId,
        _role: "super_admin",
      });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { "content-type": "application/json", ...corsHeaders },
        });
      }
    }

    // Ambil API key + config kurir
    const { data: keyRow } = await admin
      .from("shop_api_keys")
      .select("api_key, config, is_active")
      .eq("shop_id", shopId)
      .eq("provider", "rajaongkir")
      .maybeSingle();
    if (!keyRow || !keyRow.is_active || !keyRow.api_key) {
      return new Response(
        JSON.stringify({ error: "API key RajaOngkir belum dikonfigurasi untuk toko ini" }),
        { status: 400, headers: { "content-type": "application/json", ...corsHeaders } },
      );
    }
    const apiKey: string = keyRow.api_key;
    const configCouriers: string[] = Array.isArray((keyRow.config as any)?.couriers)
      ? (keyRow.config as any).couriers
      : [];
    let couriers = (requestedCouriers.length > 0 ? requestedCouriers : configCouriers)
      .map((c) => String(c).toLowerCase().trim())
      .filter(Boolean);
    if (couriers.length === 0) couriers = ["jne", "pos", "tiki"];

    // RajaOngkir Starter hanya mendukung jne, pos, tiki. Filter dulu agar tidak gagal.
    const STARTER_SUPPORTED = new Set(["jne", "pos", "tiki"]);
    const unsupported = couriers.filter((c) => !STARTER_SUPPORTED.has(c));
    couriers = couriers.filter((c) => STARTER_SUPPORTED.has(c));

    // Resolve city
    const cities = await fetchCities(apiKey);
    const originMatch = findCity(cities, origin);
    const destMatch = findCity(cities, destination);
    if (!originMatch || !destMatch) {
      return new Response(
        JSON.stringify({
          error: !originMatch
            ? `Kota asal "${origin}" tidak ditemukan di RajaOngkir`
            : `Kota tujuan "${destination}" tidak ditemukan di RajaOngkir`,
        }),
        { status: 404, headers: { "content-type": "application/json", ...corsHeaders } },
      );
    }

    // Fetch cost per courier
    const all = await Promise.all(
      couriers.map((c) => fetchCost(apiKey, originMatch.city_id, destMatch.city_id, weight, c)),
    );
    const results = all.flat().sort((a, b) => a.cost - b.cost);

    return new Response(
      JSON.stringify({
        origin_match: {
          id: originMatch.city_id,
          name: `${originMatch.type} ${originMatch.city_name}`,
          province: originMatch.province,
        },
        destination_match: {
          id: destMatch.city_id,
          name: `${destMatch.type} ${destMatch.city_name}`,
          province: destMatch.province,
        },
        results,
        unsupported_couriers: unsupported,
      }),
      { status: 200, headers: { "content-type": "application/json", ...corsHeaders } },
    );
  } catch (e) {
    console.error("shipping-cost error", e);
    return new Response(JSON.stringify({ error: (e as Error).message ?? "Internal error" }), {
      status: 500,
      headers: { "content-type": "application/json", ...corsHeaders },
    });
  }
});
