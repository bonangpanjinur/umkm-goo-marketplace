import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useEntitlements } from "@/lib/use-entitlements";
import {
  listMyLayouts,
  createLayout,
  publishLayout,
  deleteLayout,
  listStarterTemplates,
  type PageLayout,
} from "@/lib/api/page-layouts.functions";
import { toast } from "sonner";
import {
  Sparkles, Plus, Edit3, Trash2, ExternalLink, Eye, EyeOff, Lock, X, LayoutTemplate,
} from "lucide-react";
import { TampilanTabs } from "@/components/TampilanTabs";

export const Route = createFileRoute("/pos-app/website-builder")({
  component: BuilderListPage,
});

const PAGE_TYPE_LABEL: Record<PageLayout["page_type"], string> = {
  home: "Halaman Utama",
  menu_detail: "Detail Menu",
  cart: "Keranjang",
  checkout: "Checkout",
  custom: "Halaman Custom",
};

function BuilderListPage() {
  const { hasFeature, loading: entLoading } = useEntitlements();
  const allowed = hasFeature("website_builder");
  const [layouts, setLayouts] = useState<PageLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [creating, setCreating] = useState<string | null>(null);
  const templates = listStarterTemplates();

  const reload = async () => {
    try {
      const list = await listMyLayouts();
      setLayouts(list);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!entLoading && allowed) reload();
    else if (!entLoading) setLoading(false);
  }, [entLoading, allowed]);

  const createFromTemplate = async (templateId: string) => {
    const tpl = templates.find((t) => t.id === templateId);
    if (!tpl) return;
    setCreating(templateId);
    try {
      // Cek apakah sudah ada halaman utama. Jika sudah, buat sebagai halaman custom
      // dengan slug unik agar tidak menabrak unique index (shop_id, page_type, slug).
      const hasHome = layouts.some((l) => l.page_type === "home" && !l.slug);
      const isHome = !hasHome;
      const uniqueSlug = `${tpl.id}-${Date.now().toString(36)}`;
      const layout = await createLayout({
        page_type: isHome ? "home" : "custom",
        slug: isHome ? null : uniqueSlug,
        title: isHome ? `Halaman Utama — ${tpl.name}` : `${tpl.name}`,
        puck_data: tpl.data,
      });
      toast.success(isHome ? "Halaman utama dibuat" : "Halaman baru dibuat dari template");
      window.location.href = `/pos-app/website-builder/${layout.id}`;
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCreating(null);
    }
  };

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
          <p className="text-muted-foreground">
            Bangun tampilan website toko Anda sendiri dengan editor drag-and-drop. Aktifkan paket Pro
            untuk mengakses fitur ini.
          </p>
          <Link
            to="/pos-app/billing"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium text-sm hover:opacity-90"
          >
            <Sparkles className="w-4 h-4" />
            Lihat Paket Pro
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <TampilanTabs />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" /> Website Builder
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Susun tampilan halaman toko Anda secara drag-and-drop. Halaman yang dipublikasikan akan
            ditampilkan di storefront menggantikan tema bawaan.
          </p>
        </div>
        <button
          onClick={() => setPickerOpen(true)}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Buat Halaman Baru
        </button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Memuat…</p>
      ) : layouts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-3">
          <LayoutTemplate className="w-10 h-10 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">Belum ada halaman. Pilih template starter untuk memulai dengan cepat.</p>
          <button
            onClick={() => setPickerOpen(true)}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> Pilih Template
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {layouts.map((l) => (
            <div key={l.id} className="rounded-xl border border-border bg-card p-4 flex items-center gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate">{l.title}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {PAGE_TYPE_LABEL[l.page_type]}
                    {l.slug ? ` /${l.slug}` : ""}
                  </span>
                  {l.is_published ? (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400 inline-flex items-center gap-1">
                      <Eye className="w-3 h-3" /> Publish
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 inline-flex items-center gap-1">
                      <EyeOff className="w-3 h-3" /> Draft
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Diperbarui {new Date(l.updated_at).toLocaleString("id-ID")}
                </p>
              </div>
              <Link
                to="/pos-app/website-builder/$layoutId"
                params={{ layoutId: l.id }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit
              </Link>
              <button
                onClick={async () => {
                  try {
                    await publishLayout(l.id, !l.is_published);
                    toast.success(l.is_published ? "Halaman dijadikan draft" : "Halaman dipublikasikan");
                    reload();
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted"
              >
                {l.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {l.is_published ? "Unpublish" : "Publish"}
              </button>
              <button
                onClick={async () => {
                  if (!confirm("Hapus halaman ini? Tindakan tidak bisa dibatalkan.")) return;
                  try {
                    await deleteLayout(l.id);
                    toast.success("Halaman dihapus");
                    reload();
                  } catch (e) {
                    toast.error((e as Error).message);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/30 text-destructive text-sm hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {pickerOpen ? (
        <div
          className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm grid place-items-center p-4"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full max-w-3xl bg-card border border-border rounded-2xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Pilih Template Starter</h2>
              </div>
              <button onClick={() => setPickerOpen(false)} className="p-1.5 rounded-md hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 grid sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => createFromTemplate(t.id)}
                  disabled={creating !== null}
                  className="text-left rounded-xl border border-border bg-background p-4 hover:border-primary/50 hover:shadow-sm transition disabled:opacity-50"
                >
                  <div className="text-3xl">{t.emoji}</div>
                  <p className="font-semibold mt-2">{t.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                  {creating === t.id ? (
                    <p className="text-xs text-primary mt-2">Membuat halaman…</p>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
