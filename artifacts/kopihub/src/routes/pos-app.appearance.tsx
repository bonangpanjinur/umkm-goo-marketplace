import { createFileRoute, Link } from "@tanstack/react-router";
import { useEntitlements } from "@/lib/use-entitlements";
import { useShop } from "@/lib/use-shop";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Check, Lock, Palette, ExternalLink, Monitor, Tablet, Smartphone, RefreshCw, Sparkles, Eye, X } from "lucide-react";
import { toast } from "sonner";
import { useState, useRef, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pos-app/appearance")({ component: AppearancePage });

type Viewport = "mobile" | "tablet" | "desktop";

const VIEWPORT_MAP: Record<Viewport, { w: string; label: string; icon: typeof Monitor }> = {
  mobile:  { w: "375px",  label: "Mobile",  icon: Smartphone },
  tablet:  { w: "768px",  label: "Tablet",  icon: Tablet },
  desktop: { w: "100%",   label: "Desktop", icon: Monitor },
};

function AppearancePage() {
  const { entitlements, themes, activeThemeKey, planCode, monthsActive, loading, reload } = useEntitlements();
  const { shop } = useShop();
  const [busy, setBusy] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [iframeKey, setIframeKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [recommendedKey, setRecommendedKey] = useState<string | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [previewThemeKey, setPreviewThemeKey] = useState<string | null>(null);

  useEffect(() => {
    if (!shop?.id) return;
    (async () => {
      const { data: s } = await supabase
        .from("shops")
        .select("business_category_id")
        .eq("id", shop.id)
        .maybeSingle();
      const catId = (s as any)?.business_category_id;
      if (!catId) { setRecommendedKey(null); setCategoryName(null); return; }
      const { data: cat } = await supabase
        .from("business_categories")
        .select("name, recommended_theme_key")
        .eq("id", catId)
        .maybeSingle();
      setRecommendedKey((cat as any)?.recommended_theme_key ?? null);
      setCategoryName((cat as any)?.name ?? null);
    })();
  }, [shop?.id]);

  const sortedThemes = useMemo(() => {
    if (!recommendedKey) return themes;
    return [...themes].sort((a, b) => {
      if (a.key === recommendedKey) return -1;
      if (b.key === recommendedKey) return 1;
      return 0;
    });
  }, [themes, recommendedKey]);

  const storefrontUrl = shop?.slug ? `/s/${shop.slug}` : null;
  const previewUrl = storefrontUrl ? `${window.location.origin}${storefrontUrl}?preview=1` : null;


  const apply = async (key: string) => {
    setBusy(key);
    try {
      const { setShopTheme } = await import("@/server/entitlements.functions");
      await setShopTheme({ data: { themeKey: key } });
      toast.success("Tema diaktifkan");
      await reload();
      setIframeKey((k) => k + 1);
    } catch (e) {
      toast.error((e as Error).message);
    } finally { setBusy(null); }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-8">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          <h1 className="text-2xl font-bold">Tampilan Toko</h1>
        </div>
        {storefrontUrl && (
          <a href={storefrontUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm">
              <ExternalLink className="h-4 w-4 mr-1.5" />
              Buka Storefront
            </Button>
          </a>
        )}
      </div>

      {previewUrl && (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-2">
            <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5">
              {(Object.entries(VIEWPORT_MAP) as [Viewport, typeof VIEWPORT_MAP[Viewport]][]).map(([key, vp]) => {
                const Icon = vp.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setViewport(key)}
                    className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs transition-colors ${
                      viewport === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {vp.label}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2 min-w-0 flex-1 mx-2">
              <div className="flex-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground truncate">
                {window.location.origin}{storefrontUrl}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setIframeKey((k) => k + 1)}
                title="Refresh preview"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
            <a href={storefrontUrl!} target="_blank" rel="noopener noreferrer">
              <Button variant="ghost" size="icon" className="h-7 w-7" title="Buka di tab baru">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          </div>
          <div className="bg-muted/50 flex justify-center py-4 px-4" style={{ minHeight: "480px" }}>
            <div
              className="bg-background overflow-hidden rounded-lg border border-border shadow-md transition-all duration-300"
              style={{ width: VIEWPORT_MAP[viewport].w, maxWidth: "100%", height: "480px" }}
            >
              <iframe
                key={iframeKey}
                ref={iframeRef}
                src={previewUrl}
                className="h-full w-full"
                title="Storefront Preview"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>
          </div>
          <div className="border-t border-border bg-muted/20 px-4 py-2 text-center text-xs text-muted-foreground">
            Preview langsung storefront toko Anda · Klik "Buka Storefront" untuk tampilan penuh
          </div>
        </Card>
      )}

      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">Paket aktif</div>
          <div className="text-lg font-bold uppercase">{planCode}</div>
          <div className="text-xs text-muted-foreground">{monthsActive.toFixed(1)} bulan berlangganan</div>
        </div>
        <Link to="/pos-app/billing"><Button variant="outline" size="sm">Upgrade Paket</Button></Link>
      </Card>

      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pilih Tema</h2>
          {recommendedKey && recommendedKey !== activeThemeKey && (
            <Button size="sm" variant="outline" onClick={() => apply(recommendedKey)} disabled={busy === recommendedKey}>
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Pakai Rekomendasi
            </Button>
          )}
        </div>
        {categoryName && recommendedKey && (
          <p className="mb-3 text-xs text-muted-foreground">
            Kategori toko: <strong>{categoryName}</strong> — kami rekomendasikan tema yang paling cocok.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedThemes.map((t) => {
            const active = t.key === activeThemeKey;
            const isRecommended = t.key === recommendedKey;
            return (
              <Card key={t.key} className={`p-4 relative ${active ? "ring-2 ring-primary" : ""} ${isRecommended && !active ? "ring-1 ring-amber-400" : ""}`}>
                {isRecommended && (
                  <span className="absolute -top-2 left-3 inline-flex items-center gap-1 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow-sm">
                    <Sparkles className="h-3 w-3" />Rekomendasi
                  </span>
                )}
                <div className="aspect-video rounded-lg bg-muted mb-3 overflow-hidden flex items-center justify-center text-muted-foreground text-xs">
                  {t.preview_image_url ? <img src={t.preview_image_url} alt={t.name} className="h-full w-full object-cover" /> : t.name}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{t.name}</h3>
                  {active && <span className="text-xs text-primary inline-flex items-center gap-1"><Check className="h-3 w-3" />Aktif</span>}
                  {!t.allowed && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                {!t.allowed && t.reason && <p className="text-xs text-amber-700 mt-2">{t.reason}</p>}
                <div className="mt-3">
                  {t.allowed ? (
                    <Button size="sm" disabled={active || busy === t.key} onClick={() => apply(t.key)}>
                      {busy === t.key ? <Loader2 className="h-4 w-4 animate-spin" /> : active ? "Sedang dipakai" : "Pakai tema ini"}
                    </Button>
                  ) : (
                    <Link to="/pos-app/billing"><Button size="sm" variant="outline">Upgrade untuk akses</Button></Link>
                  )}
                </div>
              </Card>
            );
          })}
          {sortedThemes.length === 0 && <p className="text-sm text-muted-foreground">Belum ada tema tersedia untuk paket ini.</p>}
        </div>
      </div>

      {entitlements && (
        <>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Fitur Paket Anda</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {entitlements.features.map((f) => (
              <div key={f.key} className="flex items-start gap-2 rounded border border-border bg-card p-3 text-sm">
                {f.allowed ? <Check className="h-4 w-4 text-emerald-600 mt-0.5" /> : <Lock className="h-4 w-4 text-muted-foreground mt-0.5" />}
                <div>
                  <div className="font-medium">{f.name}</div>
                  {f.description && <div className="text-xs text-muted-foreground">{f.description}</div>}
                  {!f.allowed && f.reason && <div className="text-xs text-amber-700 mt-1">{f.reason}</div>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
