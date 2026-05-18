import { useEffect, useState } from "react";

// Allow-list kota besar untuk **sitemap landing pages** (kategori × kota).
// Sengaja kecil & evergreen — setiap entry → 1 URL per kategori di sitemap.
// Untuk **filter UI** kita pakai API publik (useIndonesiaCities) — bukan list ini.
export const CITIES = [
  "Jakarta",
  "Bandung",
  "Surabaya",
  "Yogyakarta",
  "Semarang",
  "Medan",
  "Denpasar",
  "Makassar",
  "Palembang",
  "Malang",
  "Pekanbaru",
  "Banjarmasin",
  "Manado",
  "Padang",
  "Balikpapan",
] as const;

export type CityName = (typeof CITIES)[number];

/**
 * Build OR-pattern untuk `address ilike` yang lebih akurat (whole-word-ish).
 * Mencegah false positive "solo" cocok dengan "Solok".
 *
 * Pakai pada PostgREST query:
 *   q.or(cityIlikeOr("Bandung"))
 */
export function cityIlikeOr(city: string, column = "address") {
  const c = city.trim();
  if (!c) return "";
  return [
    `${column}.ilike.${c}`,         // exact
    `${column}.ilike.${c} %`,       // start
    `${column}.ilike.% ${c}`,       // end
    `${column}.ilike.% ${c} %`,     // middle
    `${column}.ilike.%, ${c}%`,     // ", Bandung..."
    `${column}.ilike.%,${c}%`,      // ",Bandung..."
  ].join(",");
}

// =========================================================================
// External API: kota & kabupaten Indonesia (dev.farizdotid.com — gratis,
// tanpa API key, satu request all-in-one ±514 entri).
// =========================================================================

const API_URL = "https://dev.farizdotid.com/api/daerahindonesia/kota";
const CACHE_KEY = "umkmgo.id_cities.v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

function normalizeCityName(raw: string): string {
  // "KOTA BANDUNG" → "Bandung", "KABUPATEN ACEH SELATAN" → "Aceh Selatan"
  return raw
    .replace(/^(KOTA ADMINISTRASI|KOTA|KABUPATEN ADMINISTRASI|KABUPATEN|KAB\.?)\s+/i, "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

let _inflight: Promise<string[]> | null = null;

export async function fetchIndonesiaCities(): Promise<string[]> {
  // 1. Cache hit
  if (typeof window !== "undefined") {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const { ts, list } = JSON.parse(cached);
        if (Date.now() - ts < CACHE_TTL_MS && Array.isArray(list) && list.length > 0) {
          return list;
        }
      }
    } catch {}
  }

  // 2. Dedupe concurrent requests
  if (_inflight) return _inflight;

  _inflight = (async () => {
    try {
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw: Array<{ nama: string }> = data?.kota_kabupaten ?? [];
      const list = Array.from(
        new Set(raw.map((r) => normalizeCityName(r.nama)).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "id"));

      if (typeof window !== "undefined") {
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), list }));
        } catch {}
      }
      return list;
    } catch {
      // Fallback: pakai allow-list statik kalau API gagal.
      return [...CITIES];
    } finally {
      _inflight = null;
    }
  })();

  return _inflight;
}

export function useIndonesiaCities() {
  const [cities, setCities] = useState<string[]>(() => [...CITIES]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchIndonesiaCities().then((list) => {
      if (alive) {
        setCities(list);
        setLoading(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  return { cities, loading };
}
