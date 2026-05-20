import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useEntitlements } from "@/lib/use-entitlements";
import {
  listMyLayouts,
  createLayout,
  deleteLayout,
  listStarterTemplates,
  type PageLayout,
} from "@/lib/api/page-layouts.functions";
import { toast } from "sonner";
import { Sparkles, Plus, Trash2, Edit3, Lock, Loader2, LayoutTemplate, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { TampilanTabs } from "@/components/TampilanTabs";

export const Route = createFileRoute("/pos-app/website-builder/templates")({
  component: TemplatesPage,
});

function TemplatesPage() {
  const navigate = useNavigate();
  const { hasFeature, loading: entLoading } = useEntitlements();
  const allowed = hasFeature("website_builder");
  const templates = listStarterTemplates();
  const [layouts, setLayouts] = useState<PageLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const reload = async () => {
    try {
      const list = await listMyLayouts();
      setLayouts(list);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!entLoading && allowed) reload();
    else if (!entLoading) setLoading(false);
  }, [entLoading, allowed]);

  const handleRefresh = () => {
    setRefreshing(true);
    reload();
  };

  const createFromTemplate = async (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setCreating(templateId);
    try {
      const hasHome = layouts.some((l) => l.page_type === "home" && !l.slug);
      const isHome = !hasHome;
      const uniqueSlug = `${tpl.id}-${Date.now().toString(36)}`;
      const layout = await createLayout({
        page_type: isHome ? "home" : "custom",
        slug: isHome ? null : uniqueSlug,
        title: isHome ? `Halaman Utama — ${tpl.name}` : tpl.name,
        puck_data: tpl.data,
      });
      toast.success(isHome ? "Halaman utama dibuat dari template" : "Halaman baru dibuat dari template");
      navigate({ to: "/pos-app/website-builder/$id", params: { id: layout.id } as any });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(null);
    }
  };

  const recreateFromTemplate = async (templateId: string, existingLayoutId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    if (!confirm(`Buat ulang halaman dari template "${tpl.name}"? Halaman lama berbasis template ini akan dihapus.`)) return;
    setCreating(templateId);
    try {
      await deleteLayout(existingLayoutId);
      await reload();
      await createFromTemplate(templateId);
    } catch (e) {
      toast.error((e as Error).message);
      setCreating(null);
    }
  };

  // Map template → layout yang sudah pernah dibuat dari template tersebut
  const layoutByTemplateName = (tplName: string) =>
    layouts.find((l) => l.title.includes(tplName));

  if (entLoading) return <div className="p-6 text-muted-foreground text-sm">Memuat…</div>;

  if (!allowed) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <TampilanTabs />
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4 max-w-2xl mx-auto">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 grid place-items-center">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Website Builder — Fitur Pro</h1>
          <p className="text-muted-foreground">Aktifkan paket Pro untuk mengakses template website builder.</p>
          <Link to="/pos-app/billing"><Button>Upgrade Paket</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <TampilanTabs />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            <h1 className="text-2xl font-bold">Kelola Template Starter</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Lihat, buat, ganti, atau buat ulang halaman dari template tanpa khawatir error slug.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing || loading}>
            {refreshing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
            {refreshing ? "Memuat ulang…" : "Refresh"}
          </Button>
          <Link to="/pos-app/website-builder">
            <Button variant="outline" size="sm">Kembali ke daftar halaman</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((tpl) => {
            const existing = layoutByTemplateName(tpl.name);
            const isCreating = creating === tpl.id;
            return (
              <Card key={tpl.id} className="p-4 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-3xl">{tpl.emoji}</div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{tpl.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{tpl.description}</p>
                  </div>
                </div>
                {existing ? (
                  <div className="text-xs text-muted-foreground mb-3 rounded border border-border bg-muted/40 px-2 py-1.5">
                    Sudah ada halaman: <strong className="text-foreground">{existing.title}</strong>
                    {existing.is_published && <span className="ml-1 text-emerald-600">• Live</span>}
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground mb-3 italic">Belum dibuat</div>
                )}
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  {existing ? (
                    <>
                      <Link to="/pos-app/website-builder/$id" params={{ id: existing.id } as any}>
                        <Button size="sm" variant="default">
                          <Edit3 className="h-3.5 w-3.5 mr-1.5" />Edit
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={isCreating}
                        onClick={() => recreateFromTemplate(tpl.id, existing.id)}
                      >
                        {isCreating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
                        Buat ulang
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" disabled={isCreating} onClick={() => createFromTemplate(tpl.id)}>
                      {isCreating ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                      Buat halaman
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-4 bg-muted/30">
        <div className="flex items-start gap-3">
          <Sparkles className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <div className="text-xs text-muted-foreground">
            <strong className="text-foreground">Tips:</strong> Hanya boleh ada satu Halaman Utama (slug kosong) per toko.
            Template berikutnya yang Anda buat otomatis menjadi halaman <em>custom</em> dengan slug unik —
            tidak akan menimbulkan error <code className="text-[10px]">duplicate key</code>.
          </div>
        </div>
      </Card>
    </div>
  );
}
