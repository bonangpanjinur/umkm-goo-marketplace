/**
 * F2-4: RajaOngkir proxy endpoint.
 * Memproksikan request cek ongkir ke RajaOngkir API (Starter tier).
 *
 * POST /api/rajaongkir/cost
 * Body: { origin: string, destination: string, weight: number, courier: string, api_key: string }
 *
 * POST /api/rajaongkir/city
 * Body: { api_key: string }
 *
 * API key dikirim dari frontend (dari shop_api_keys tabel) — server hanya sebagai proxy
 * untuk menghindari CORS error saat memanggil RajaOngkir langsung dari browser.
 */
import { Router, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";

const router = Router();

const RO_BASE = "https://api.rajaongkir.com/starter";
const RO_PRO_BASE = "https://api.rajaongkir.com/pro";

type City = {
  city_id: string;
  city_name: string;
  type: string;
  province: string;
  postal_code: string;
};

// In-memory city cache per api_key (TTL 1 jam)
const cityCache = new Map<string, { fetchedAt: number; cities: City[] }>();

async function fetchCities(apiKey: string, tier: "starter" | "pro" = "starter"): Promise<City[]> {
  const now = Date.now();
  const cached = cityCache.get(apiKey);
  if (cached && now - cached.fetchedAt < 60 * 60 * 1000) {
    return cached.cities;
  }

  const base = tier === "pro" ? RO_PRO_BASE : RO_BASE;
  const res = await fetch(`${base}/city`, { headers: { key: apiKey } });
  if (!res.ok) throw new Error(`RajaOngkir /city HTTP ${res.status}`);
  const json = (await res.json()) as { rajaongkir?: { results?: City[] } };
  const cities: City[] = json?.rajaongkir?.results ?? [];
  cityCache.set(apiKey, { fetchedAt: now, cities });
  return cities;
}

function normalize(s: string) {
  return s.toLowerCase().replace(/kota|kabupaten|kab\.?/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function findCity(cities: City[], query: string): City | null {
  const q = normalize(query);
  if (!q) return null;
  let hit = cities.find((c) => normalize(c.city_name) === q);
  if (hit) return hit;
  hit = cities.find((c) => normalize(c.city_name).startsWith(q));
  if (hit) return hit;
  hit = cities.find((c) => normalize(c.city_name).includes(q));
  if (hit) return hit;
  const qTokens = q.split(" ").filter(Boolean);
  hit = cities.find((c) => qTokens.every((t) => normalize(c.city_name).includes(t)));
  return hit ?? null;
}

// ── POST /api/rajaongkir/city ────────────────────────────────────────────────
router.post("/rajaongkir/city", async (req: Request, res: Response) => {
  const { api_key, tier = "starter" } = req.body as { api_key?: string; tier?: string };
  if (!api_key) { res.status(400).json({ error: "api_key wajib diisi" }); return; }

  try {
    const cities = await fetchCities(api_key, tier === "pro" ? "pro" : "starter");
    res.json({ cities });
  } catch (err: unknown) {
    logger.error({ err }, "[rajaongkir] city fetch error");
    res.status(502).json({ error: err instanceof Error ? err.message : "Gagal ambil daftar kota" });
  }
});

// ── POST /api/rajaongkir/cost ────────────────────────────────────────────────
router.post("/rajaongkir/cost", async (req: Request, res: Response) => {
  const {
    api_key,
    origin,
    destination,
    weight = 1000,
    couriers = ["jne", "pos", "tiki"],
    tier = "starter",
  } = req.body as {
    api_key?: string;
    origin?: string;
    destination?: string;
    weight?: number;
    couriers?: string[];
    tier?: string;
  };

  if (!api_key || !origin || !destination) {
    res.status(400).json({ error: "api_key, origin, dan destination wajib diisi" });
    return;
  }

  const safeTier = tier === "pro" ? "pro" : "starter";
  const base = safeTier === "pro" ? RO_PRO_BASE : RO_BASE;

  // Starter hanya support jne, pos, tiki
  const STARTER_SUPPORTED = new Set(["jne", "pos", "tiki"]);
  const requestedCouriers = Array.isArray(couriers) ? couriers : [couriers];
  const unsupportedCouriers: string[] = [];
  const activeCouriers =
    safeTier === "starter"
      ? requestedCouriers.filter((c) => {
          const ok = STARTER_SUPPORTED.has(c.toLowerCase());
          if (!ok) unsupportedCouriers.push(c);
          return ok;
        })
      : requestedCouriers;

  if (activeCouriers.length === 0) {
    res.status(400).json({ error: "Tidak ada kurir yang didukung untuk tier ini", unsupported_couriers: unsupportedCouriers });
    return;
  }

  try {
    const cities = await fetchCities(api_key, safeTier);
    const originMatch = findCity(cities, origin);
    const destMatch = findCity(cities, destination);

    if (!originMatch) {
      res.status(404).json({ error: `Kota asal "${origin}" tidak ditemukan` });
      return;
    }
    if (!destMatch) {
      res.status(404).json({ error: `Kota tujuan "${destination}" tidak ditemukan` });
      return;
    }

    const safeWeight = Math.max(1, Math.min(150000, Number(weight) || 1000));

    const results = (
      await Promise.all(
        activeCouriers.map(async (courier) => {
          try {
            const body = new URLSearchParams({
              origin: originMatch.city_id,
              destination: destMatch.city_id,
              weight: String(safeWeight),
              courier: courier.toLowerCase(),
            });
            const r = await fetch(`${base}/cost`, {
              method: "POST",
              headers: { key: api_key, "content-type": "application/x-www-form-urlencoded" },
              body,
            });
            if (!r.ok) return [];
            const json = (await r.json()) as { rajaongkir?: { results?: any[] } };
            const arr = json?.rajaongkir?.results?.[0];
            if (!arr) return [];
            const courierName: string = arr.name ?? courier;
            return (arr.costs ?? []).map((c: any) => ({
              courier: courierName,
              service: c.service,
              description: c.description,
              cost: c?.cost?.[0]?.value ?? 0,
              etd: c?.cost?.[0]?.etd ? `${c.cost[0].etd} hari` : "-",
            }));
          } catch {
            return [];
          }
        }),
      )
    ).flat().sort((a, b) => a.cost - b.cost);

    res.json({
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
      unsupported_couriers: unsupportedCouriers,
    });
  } catch (err: unknown) {
    logger.error({ err }, "[rajaongkir] cost error");
    res.status(502).json({ error: err instanceof Error ? err.message : "Gagal cek ongkir" });
  }
});

export default router;
