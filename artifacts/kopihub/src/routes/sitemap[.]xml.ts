import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { CITIES } from "@/lib/cities";

// TODO: replace with project domain once a custom domain is set.
const BASE_URL = "";

interface SitemapEntry {
  path: string;
  changefreq?: "daily" | "weekly" | "monthly";
  priority?: string;
  lastmod?: string;
}

function escapeXml(s: string) {
  return s.replace(/[<>&'"]/g, (c) =>
    c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === "&" ? "&amp;" : c === "'" ? "&apos;" : "&quot;",
  );
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "daily", priority: "1.0" },
          { path: "/kategori", changefreq: "weekly", priority: "0.8" },
          { path: "/search", changefreq: "weekly", priority: "0.6" },
          { path: "/pricing", changefreq: "monthly", priority: "0.5" },
          { path: "/features", changefreq: "monthly", priority: "0.5" },
        ];

        // Fetch categories & shops directly (no auth, anon-readable).
        const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        if (url && key) {
          const sb = createClient(url, key, { auth: { persistSession: false } });

          const { data: cats } = await sb
            .from("business_categories")
            .select("slug, updated_at")
            .eq("is_active", true);
          for (const c of cats ?? []) {
            entries.push({
              path: `/kategori/${c.slug}`,
              changefreq: "weekly",
              priority: "0.7",
              lastmod: (c as any).updated_at?.slice(0, 10),
            });
            for (const city of CITIES) {
              entries.push({
                path: `/kategori/${c.slug}/${city.toLowerCase()}`,
                changefreq: "weekly",
                priority: "0.6",
              });
            }
          }

          const { data: shops } = await sb
            .from("shops")
            .select("slug, updated_at")
            .eq("is_active", true)
            .limit(1000);
          // Only /toko/{slug} is canonical for SEO. /s/{slug} is a buyer-side
          // mini-storefront utility; we link it via rel="canonical" on the page
          // itself instead of advertising both URLs to crawlers.
          for (const s of shops ?? []) {
            entries.push({
              path: `/toko/${s.slug}`,
              changefreq: "weekly",
              priority: "0.7",
              lastmod: (s as any).updated_at?.slice(0, 10),
            });
          }
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${escapeXml(e.path)}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ].filter(Boolean).join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
