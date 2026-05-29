import { Router } from "express";
import { logger } from "../lib/logger.js";
import { httpFetch } from "../lib/fetch-types.js";

const router = Router();

const GEMINI_MODEL = "gemini-1.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function getAISettings(): Promise<{ gemini_api_key: string; enabled: boolean } | null> {
  const SUPABASE_URL = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"] ?? "";
  const SUPABASE_KEY =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "";
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;

  try {
    const res = await httpFetch(
      `${SUPABASE_URL}/rest/v1/platform_settings?key=eq.ai_settings&select=value&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) return null;
    const rows = await res.json() as Array<{ value: unknown }>;
    if (!rows?.[0]?.value) return null;
    const val =
      typeof rows[0].value === "string" ? JSON.parse(rows[0].value) : rows[0].value;
    return val as { gemini_api_key: string; enabled: boolean };
  } catch {
    return null;
  }
}

async function imageUrlToBase64(
  url: string,
): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await httpFetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const mimeType = contentType.split(";")[0].trim();
    const buf = await res.arrayBuffer();
    const data = Buffer.from(buf).toString("base64");
    return { data, mimeType };
  } catch {
    return null;
  }
}

router.post("/ai/generate-description", async (req, res) => {
  const { name, image_url, category, price } = req.body as {
    name?: string;
    image_url?: string;
    category?: string;
    price?: number;
  };

  if (!name && !image_url) {
    res.status(400).json({ error: "Butuh minimal nama produk atau foto." });
    return;
  }

  const aiSettings = await getAISettings();
  if (!aiSettings?.enabled || !aiSettings?.gemini_api_key) {
    res.status(503).json({
      error:
        "Fitur AI belum diaktifkan. Hubungi admin untuk mengatur Gemini API Key di panel Super Admin → Pengaturan AI.",
    });
    return;
  }

  const ctxParts: string[] = [];
  if (name) ctxParts.push(`Nama produk: ${name}`);
  if (category) ctxParts.push(`Kategori: ${category}`);
  if (price) ctxParts.push(`Harga: Rp ${Number(price).toLocaleString("id-ID")}`);

  const prompt = `Kamu adalah copywriter e-commerce untuk UMKM Indonesia yang ahli membuat deskripsi produk menarik.

Informasi produk:
${ctxParts.join("\n")}
${image_url ? "(Lihat foto produk yang dilampirkan)" : ""}

Hasilkan respons HANYA dalam format JSON berikut, tanpa teks apapun di luar JSON:
{
  "description": "deskripsi produk 2-3 kalimat yang menarik, persuasif, dan alami dalam Bahasa Indonesia",
  "tags": ["tag-seo-1", "tag-seo-2", "tag-seo-3", "tag-seo-4", "tag-seo-5"]
}

Aturan ketat:
- Deskripsi: 2-3 kalimat, bahasa Indonesia yang hangat dan mengundang, tidak berlebihan
- Tags: 5-8 kata kunci SEO relevan, huruf kecil, gunakan-tanda-hubung untuk frasa multi-kata
- Jika ada foto, deskripsikan visual yang terlihat dan tambahkan ke konteks
- Output HANYA JSON valid, tidak ada markdown, tidak ada komentar`;

  try {
    const parts: unknown[] = [{ text: prompt }];

    if (image_url) {
      const imgData = await imageUrlToBase64(image_url);
      if (imgData) {
        parts.push({ inlineData: { mimeType: imgData.mimeType, data: imgData.data } });
      }
    }

    const geminiRes = await httpFetch(
      `${GEMINI_BASE}/${GEMINI_MODEL}:generateContent?key=${aiSettings.gemini_api_key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.75, maxOutputTokens: 512 },
        }),
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      logger.error({ status: geminiRes.status, body: errText }, "Gemini API error");
      res.status(502).json({ error: "Gagal menghubungi Gemini. Periksa API key di pengaturan." });
      return;
    }

    const geminiData = await geminiRes.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn({ text }, "Gemini response has no JSON");
      res.status(502).json({ error: "Respons AI tidak dapat diparsing. Coba lagi." });
      return;
    }

    const parsed = JSON.parse(jsonMatch[0]) as { description?: string; tags?: string[] };
    res.json({
      description: parsed.description ?? "",
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    });
  } catch (err) {
    logger.error({ err }, "AI generate description failed");
    res.status(500).json({ error: "Terjadi kesalahan saat memproses permintaan AI." });
  }
});

export default router;
