import { useEffect } from "react";

type Meta = { name?: string; property?: string; content: string };

function upsertMeta(m: Meta) {
  const sel = m.name ? `meta[name="${m.name}"]` : `meta[property="${m.property}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(sel);
  if (!el) {
    el = document.createElement("meta");
    if (m.name) el.setAttribute("name", m.name);
    if (m.property) el.setAttribute("property", m.property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", m.content);
}

export function useSeo(opts: {
  title?: string;
  description?: string;
  image?: string | null;
  url?: string;
  type?: "website" | "product" | "article";
  jsonLd?: object | null;
}) {
  useEffect(() => {
    if (opts.title) document.title = opts.title;
    const tags: Meta[] = [];
    if (opts.description) {
      tags.push({ name: "description", content: opts.description });
      tags.push({ property: "og:description", content: opts.description });
    }
    if (opts.title) tags.push({ property: "og:title", content: opts.title });
    if (opts.image) {
      tags.push({ property: "og:image", content: opts.image });
      tags.push({ name: "twitter:image", content: opts.image });
    }
    if (opts.url) tags.push({ property: "og:url", content: opts.url });
    if (opts.type) tags.push({ property: "og:type", content: opts.type });
    tags.push({ name: "twitter:card", content: opts.image ? "summary_large_image" : "summary" });
    tags.forEach(upsertMeta);

    let script: HTMLScriptElement | null = null;
    if (opts.jsonLd) {
      script = document.createElement("script");
      script.type = "application/ld+json";
      script.text = JSON.stringify(opts.jsonLd);
      script.dataset.seo = "1";
      document.head.appendChild(script);
    }
    return () => {
      if (script && script.parentNode) script.parentNode.removeChild(script);
    };
  }, [opts.title, opts.description, opts.image, opts.url, opts.type, JSON.stringify(opts.jsonLd ?? null)]);
}
