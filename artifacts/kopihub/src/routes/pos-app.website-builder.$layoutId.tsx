import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, lazy, Suspense } from "react";
import { useEntitlements } from "@/lib/use-entitlements";
import { useCurrentShop } from "@/lib/use-shop";
import {
  getLayout,
  saveLayout,
  publishLayout,
  type PageLayout,
} from "@/server/page-layouts.functions";
import { BuilderProvider } from "@/builder/BuilderContext";
import { builderConfig } from "@/builder/config";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye, EyeOff, ExternalLink, Loader2, Lock } from "lucide-react";
import "@measured/puck/puck.css";

// Puck must be client-only — it uses DnD/window APIs
const Puck = lazy(() => import("@measured/puck").then((m) => ({ default: m.Puck })));

export const Route = createFileRoute("/pos-app/website-builder/$layoutId")({
  component: BuilderEditorPage,
});

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
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-card">
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
        <div className="flex items-center gap-2">
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
                // Save current data first
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
      <div className="flex-1 overflow-hidden">
        <BuilderProvider value={{ slug: shop?.slug ?? "", shopId: shop?.id }}>
          <Suspense fallback={<div className="p-10 text-center text-muted-foreground">Memuat editor…</div>}>
            <Puck
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
    </div>
  );
}
