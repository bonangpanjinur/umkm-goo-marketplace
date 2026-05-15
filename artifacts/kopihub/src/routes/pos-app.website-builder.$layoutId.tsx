import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense } from "react";
import { useEntitlements } from "@/lib/use-entitlements";
import { useCurrentShop } from "@/lib/use-shop";
import {
  getLayout,
  saveLayout,
  publishLayout,
  listVersions,
  restoreVersion,
  type PageLayout,
  type PageLayoutVersion,
} from "@/server/page-layouts.functions";
import { BuilderProvider } from "@/builder/BuilderContext";
import { builderConfig } from "@/builder/config";
import { toast } from "sonner";
import {
  ArrowLeft, Save, Eye, EyeOff, ExternalLink, Loader2, Lock,
  Monitor, Tablet, Smartphone, History, RotateCcw, X,
} from "lucide-react";
import "@measured/puck/puck.css";

const Puck = lazy(() => import("@measured/puck").then((m) => ({ default: m.Puck })));

export const Route = createFileRoute("/pos-app/website-builder/$layoutId")({
  component: BuilderEditorPage,
});

type Viewport = "desktop" | "tablet" | "mobile";
const VIEWPORT_WIDTH: Record<Viewport, string> = {
  desktop: "100%",
  tablet: "820px",
  mobile: "390px",
};

function BuilderEditorPage() {
  const { layoutId } = useParams({ from: "/pos-app/website-builder/$layoutId" });
  const navigate = useNavigate();
  const { hasFeature, loading: entLoading } = useEntitlements();
  const { shop } = useCurrentShop();
  const allowed = hasFeature("website_builder");
  const [layout, setLayout] = useState<PageLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<PageLayoutVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  // bump key to force Puck remount when we restore an old version
  const [puckKey, setPuckKey] = useState(0);

  useEffect(() => {
    if (entLoading) return;
    if (!allowed) { setLoading(false); return; }
    (async () => {
      try {
        const l = await getLayout(layoutId);
        if (!l) { toast.error("Halaman tidak ditemukan"); navigate({ to: "/pos-app/website-builder" }); return; }
        setLayout(l);
        setData(l.puck_data);
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [layoutId, allowed, entLoading, navigate]);

  const openHistory = async () => {
    setHistoryOpen(true);
    setVersionsLoading(true);
    try {
      setVersions(await listVersions(layoutId));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    if (!confirm("Pulihkan versi ini? Versi saat ini akan disimpan ke riwayat.")) return;
    try {
      const restored = await restoreVersion(layoutId, versionId);
      setData(restored);
      setPuckKey((k) => k + 1);
      const fresh = await getLayout(layoutId);
      if (fresh) setLayout(fresh);
      toast.success("Versi dipulihkan");
      setHistoryOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  if (entLoading || loading) {
    return (
      <div className="p-10 grid place-items-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="p-6 max-w-xl mx-auto rounded-xl border border-border bg-card text-center space-y-3">
        <Lock className="w-10 h-10 mx-auto text-primary" />
        <h2 className="text-xl font-bold">Fitur Pro</h2>
        <p className="text-muted-foreground text-sm">Aktifkan paket Pro untuk menggunakan Website Builder.</p>
        <Link to="/pos-app/website-builder" className="inline-block px-4 py-2 rounded-lg border border-border text-sm">
          Kembali
        </Link>
      </div>
    );
  }

  if (!layout || !data) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card gap-2 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/pos-app/website-builder"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-muted text-sm"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Link>
          <div className="min-w-0">
            <p className="font-medium truncate">{layout.title}</p>
            <p className="text-xs text-muted-foreground">
              {layout.is_published ? "Dipublikasikan" : "Draft"} · diperbarui{" "}
              {new Date(layout.updated_at).toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        {/* Viewport switcher */}
        <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
          {([
            ["desktop", Monitor, "Desktop"],
            ["tablet", Tablet, "Tablet"],
            ["mobile", Smartphone, "Mobile"],
          ] as const).map(([v, Icon, label]) => (
            <button
              key={v}
              onClick={() => setViewport(v)}
              title={label}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs ${
                viewport === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openHistory}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted"
            title="Riwayat versi"
          >
            <History className="w-3.5 h-3.5" /> Riwayat
          </button>
          {shop?.slug ? (
            <a
              href={`/s/${shop.slug}?preview=1`}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Preview
            </a>
          ) : null}
          <button
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                await saveLayout(layout.id, data);
                toast.success("Tersimpan");
                setLayout({ ...layout, puck_data: data, updated_at: new Date().toISOString() });
              } catch (e) {
                toast.error((e as Error).message);
              } finally { setSaving(false); }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Simpan
          </button>
          <button
            onClick={async () => {
              try {
                await saveLayout(layout.id, data);
                await publishLayout(layout.id, !layout.is_published);
                toast.success(layout.is_published ? "Halaman dijadikan draft" : "Halaman dipublikasikan");
                setLayout({ ...layout, is_published: !layout.is_published });
              } catch (e) {
                toast.error((e as Error).message);
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90"
          >
            {layout.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {layout.is_published ? "Unpublish" : "Publish"}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden relative">
        <div
          className="h-full mx-auto transition-all duration-200 bg-background"
          style={{
            maxWidth: VIEWPORT_WIDTH[viewport],
            boxShadow: viewport !== "desktop" ? "0 0 0 1px hsl(var(--border))" : undefined,
          }}
        >
          <BuilderProvider value={{ slug: shop?.slug ?? "", shopId: shop?.id }}>
            <Suspense fallback={<div className="p-10 text-center text-muted-foreground">Memuat editor…</div>}>
              <Puck
                key={puckKey}
                config={builderConfig as never}
                data={data as never}
                onChange={(d: unknown) => setData(d)}
                onPublish={async (d: unknown) => {
                  setData(d);
                  try {
                    await saveLayout(layout.id, d);
                    await publishLayout(layout.id, true);
                    toast.success("Dipublikasikan");
                    setLayout({ ...layout, is_published: true, puck_data: d });
                  } catch (e) { toast.error((e as Error).message); }
                }}
              />
            </Suspense>
          </BuilderProvider>
        </div>

        {historyOpen ? (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-stretch justify-end z-10">
            <div className="w-full max-w-md bg-card border-l border-border flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold">Riwayat Versi</h3>
                </div>
                <button onClick={() => setHistoryOpen(false)} className="p-1 rounded hover:bg-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {versionsLoading ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Memuat…
                  </div>
                ) : versions.length === 0 ? (
                  <p className="p-6 text-center text-muted-foreground text-sm">
                    Belum ada riwayat. Setiap simpan/publish akan dicatat di sini.
                  </p>
                ) : (
                  versions.map((v) => (
                    <div key={v.id} className="rounded-lg border border-border p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-xs uppercase tracking-wide">
                            {v.reason === "publish" ? "📢 Publish" :
                             v.reason === "unpublish" ? "🙈 Unpublish" :
                             v.reason === "before-restore" ? "↩️ Sebelum pulihkan" :
                             "💾 Simpan otomatis"}
                            {v.is_published_snapshot ? " · live" : ""}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(v.created_at).toLocaleString("id-ID")}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRestore(v.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-xs hover:bg-muted"
                        >
                          <RotateCcw className="w-3 h-3" /> Pulihkan
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
