import { createFileRoute, Link, useParams, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, lazy, Suspense, useCallback } from "react";
import { useEntitlements } from "@/lib/use-entitlements";
import { useCurrentShop } from "@/lib/use-shop";
import {
  getLayout,
  saveLayout,
  publishLayout,
  schedulePublish,
  listVersions,
  restoreVersion,
  getVersion,
  type PageLayout,
  type PageLayoutVersion,
} from "@/server/page-layouts.functions";
import { BuilderProvider } from "@/builder/BuilderContext";
import { builderConfig } from "@/builder/config";
import { diffPuckData } from "@/builder/diff";
import { toast } from "sonner";
import {
  ArrowLeft, Eye, EyeOff, ExternalLink, Loader2, Lock,
  Monitor, Tablet, Smartphone, History, RotateCcw, X, CalendarClock,
  Plus, Minus, Edit3, Move, GitCompare,
} from "lucide-react";
import "@measured/puck/puck.css";

const Puck = lazy(() => import("@measured/puck").then((m) => ({ default: m.Puck })));

export const Route = createFileRoute("/pos-app/website-builder/$layoutId")({
  component: BuilderEditorPage,
});

type Viewport = "desktop" | "tablet" | "mobile";
const VIEWPORT_WIDTH: Record<Viewport, string> = { desktop: "100%", tablet: "820px", mobile: "390px" };

type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

function BuilderEditorPage() {
  const { layoutId } = useParams({ from: "/pos-app/website-builder/$layoutId" });
  const navigate = useNavigate();
  const { hasFeature, loading: entLoading } = useEntitlements();
  const { shop } = useCurrentShop();
  const allowed = hasFeature("website_builder");
  const [layout, setLayout] = useState<PageLayout | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<unknown>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState<PageLayoutVersion[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [diffTarget, setDiffTarget] = useState<PageLayoutVersion | null>(null);
  const [puckKey, setPuckKey] = useState(0);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleAt, setScheduleAt] = useState<string>("");

  // Autosave
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);
  const latestDataRef = useRef<unknown>(null);

  useEffect(() => {
    if (entLoading) return;
    if (!allowed) { setLoading(false); return; }
    (async () => {
      try {
        const l = await getLayout(layoutId);
        if (!l) { toast.error("Halaman tidak ditemukan"); navigate({ to: "/pos-app/website-builder" }); return; }
        setLayout(l);
        setData(l.puck_data);
        latestDataRef.current = l.puck_data;
        if (l.scheduled_publish_at) setScheduleAt(toLocalInput(l.scheduled_publish_at));
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [layoutId, allowed, entLoading, navigate]);

  const performSave = useCallback(async () => {
    if (!layout || inFlightRef.current) return;
    inFlightRef.current = true;
    setSaveState("saving");
    try {
      await saveLayout(layout.id, latestDataRef.current);
      setSaveState("saved");
      setLastSavedAt(new Date());
    } catch (e) {
      setSaveState("error");
      toast.error("Autosave gagal: " + (e as Error).message);
    } finally {
      inFlightRef.current = false;
    }
  }, [layout]);

  // Trigger debounced autosave whenever data changes
  const handleChange = useCallback((d: unknown) => {
    setData(d);
    latestDataRef.current = d;
    setSaveState("dirty");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { performSave(); }, 1500);
  }, [performSave]);

  // Save on tab close / unmount if dirty
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveState === "dirty" || saveState === "saving") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [saveState]);

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
      latestDataRef.current = restored;
      setPuckKey((k) => k + 1);
      const fresh = await getLayout(layoutId);
      if (fresh) setLayout(fresh);
      setSaveState("saved");
      setLastSavedAt(new Date());
      toast.success("Versi dipulihkan");
      setHistoryOpen(false);
      setDiffTarget(null);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const openDiff = async (v: PageLayoutVersion) => {
    if (!v.puck_data) {
      try { v = (await getVersion(v.id)) as PageLayoutVersion; } catch { /* ignore */ }
    }
    setDiffTarget(v);
  };

  const submitSchedule = async () => {
    if (!layout) return;
    try {
      // Save current edit first so the scheduled publish reflects latest content
      await performSave();
      const iso = scheduleAt ? new Date(scheduleAt).toISOString() : null;
      if (iso && new Date(iso).getTime() < Date.now() - 60_000) {
        toast.error("Waktu jadwal harus di masa depan");
        return;
      }
      await schedulePublish(layout.id, iso);
      setLayout({ ...layout, scheduled_publish_at: iso });
      toast.success(iso ? "Publish dijadwalkan" : "Jadwal dibatalkan");
      setScheduleOpen(false);
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
            <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
              <SaveBadge state={saveState} lastSavedAt={lastSavedAt} />
              <span className="hidden sm:inline">·</span>
              <span>{layout.is_published ? "Live" : "Draft"}</span>
              {layout.scheduled_publish_at ? (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-primary">
                    <CalendarClock className="w-3 h-3" />
                    {new Date(layout.scheduled_publish_at).toLocaleString("id-ID")}
                  </span>
                </>
              ) : null}
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

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setScheduleOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-muted"
            title="Jadwalkan publish"
          >
            <CalendarClock className="w-3.5 h-3.5" /> Jadwal
          </button>
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
            onClick={async () => {
              try {
                await performSave();
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
                onChange={handleChange}
                onPublish={async (d: unknown) => {
                  latestDataRef.current = d;
                  setData(d);
                  try {
                    await saveLayout(layout.id, d);
                    await publishLayout(layout.id, true);
                    toast.success("Dipublikasikan");
                    setLayout({ ...layout, is_published: true, puck_data: d });
                    setSaveState("saved");
                    setLastSavedAt(new Date());
                  } catch (e) { toast.error((e as Error).message); }
                }}
              />
            </Suspense>
          </BuilderProvider>
        </div>

        {historyOpen ? (
          <HistoryPanel
            versions={versions}
            loading={versionsLoading}
            currentData={data}
            diffTarget={diffTarget}
            onClose={() => { setHistoryOpen(false); setDiffTarget(null); }}
            onPickDiff={openDiff}
            onClearDiff={() => setDiffTarget(null)}
            onRestore={handleRestore}
          />
        ) : null}

        {scheduleOpen ? (
          <ScheduleModal
            value={scheduleAt}
            onChange={setScheduleAt}
            currentSchedule={layout.scheduled_publish_at}
            onClose={() => setScheduleOpen(false)}
            onSubmit={submitSchedule}
            onClear={async () => {
              setScheduleAt("");
              try {
                await schedulePublish(layout.id, null);
                setLayout({ ...layout, scheduled_publish_at: null });
                toast.success("Jadwal dihapus");
                setScheduleOpen(false);
              } catch (e) { toast.error((e as Error).message); }
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function SaveBadge({ state, lastSavedAt }: { state: SaveState; lastSavedAt: Date | null }) {
  if (state === "saving") return <span className="inline-flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Menyimpan…</span>;
  if (state === "dirty") return <span className="text-amber-600 dark:text-amber-400">● Belum disimpan</span>;
  if (state === "error") return <span className="text-destructive">⚠ Autosave gagal</span>;
  if (state === "saved" && lastSavedAt) return <span className="text-green-600 dark:text-green-400">✓ Tersimpan {lastSavedAt.toLocaleTimeString("id-ID")}</span>;
  return <span>Siap</span>;
}

function HistoryPanel(props: {
  versions: PageLayoutVersion[];
  loading: boolean;
  currentData: unknown;
  diffTarget: PageLayoutVersion | null;
  onClose: () => void;
  onPickDiff: (v: PageLayoutVersion) => void;
  onClearDiff: () => void;
  onRestore: (id: string) => void;
}) {
  const { versions, loading, currentData, diffTarget, onClose, onPickDiff, onClearDiff, onRestore } = props;
  const diff = diffTarget ? diffPuckData(diffTarget.puck_data, currentData) : null;

  return (
    <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-stretch justify-end z-10">
      <div className="w-full max-w-md bg-card border-l border-border flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">{diffTarget ? "Perbandingan Versi" : "Riwayat Versi"}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>

        {diffTarget ? (
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <button onClick={onClearDiff} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Kembali ke daftar
            </button>
            <div className="rounded-lg border border-border p-3 bg-muted/30 text-sm">
              <p className="font-medium text-xs uppercase tracking-wide">
                {labelReason(diffTarget.reason)}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(diffTarget.created_at).toLocaleString("id-ID")}
              </p>
              <p className="text-xs mt-2">
                Membandingkan: <strong>versi tsb</strong> → <strong>kanvas saat ini</strong>
              </p>
            </div>
            {diff && diff.blocks.length === 0 && !diff.rootChanged ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Tidak ada perbedaan dengan kanvas saat ini.
              </p>
            ) : (
              <ul className="space-y-2">
                {diff?.rootChanged ? (
                  <li className="rounded-md border border-border p-2 text-xs flex items-center gap-2">
                    <Edit3 className="w-3.5 h-3.5 text-primary" />
                    <span>Pengaturan halaman (root) berubah</span>
                  </li>
                ) : null}
                {diff?.blocks.map((e, i) => (
                  <DiffEntry key={i} entry={e} />
                ))}
              </ul>
            )}
            <button
              onClick={() => onRestore(diffTarget.id)}
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:opacity-90"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Pulihkan versi ini
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {loading ? (
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
                    <div className="min-w-0">
                      <p className="font-medium text-xs uppercase tracking-wide">
                        {labelReason(v.reason)}{v.is_published_snapshot ? " · live" : ""}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(v.created_at).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => onPickDiff(v)}
                        title="Lihat perbedaan"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-xs hover:bg-muted"
                      >
                        <GitCompare className="w-3 h-3" /> Diff
                      </button>
                      <button
                        onClick={() => onRestore(v.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-xs hover:bg-muted"
                      >
                        <RotateCcw className="w-3 h-3" /> Pulihkan
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function DiffEntry({ entry }: { entry: ReturnType<typeof diffPuckData>["blocks"][number] }) {
  const base = "rounded-md border p-2 text-xs flex items-start gap-2";
  if (entry.kind === "added") {
    return (
      <li className={`${base} border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-900`}>
        <Plus className="w-3.5 h-3.5 text-green-600 dark:text-green-400 mt-0.5" />
        <span><strong>{entry.type}</strong> ditambahkan di posisi {entry.index + 1}</span>
      </li>
    );
  }
  if (entry.kind === "removed") {
    return (
      <li className={`${base} border-destructive/30 bg-destructive/5`}>
        <Minus className="w-3.5 h-3.5 text-destructive mt-0.5" />
        <span><strong>{entry.type}</strong> dihapus dari posisi {entry.index + 1}</span>
      </li>
    );
  }
  if (entry.kind === "moved") {
    return (
      <li className={`${base} border-border bg-muted/40`}>
        <Move className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
        <span><strong>{entry.type}</strong> dipindahkan dari posisi {entry.from + 1} → {entry.to + 1}</span>
      </li>
    );
  }
  return (
    <li className={`${base} border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900`}>
      <Edit3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 mt-0.5" />
      <span>
        <strong>{entry.type}</strong> diubah di posisi {entry.index + 1}
        <span className="block text-muted-foreground mt-0.5">
          Field: {entry.fields.join(", ")}
        </span>
      </span>
    </li>
  );
}

function ScheduleModal(props: {
  value: string;
  onChange: (v: string) => void;
  currentSchedule: string | null;
  onClose: () => void;
  onSubmit: () => void;
  onClear: () => void;
}) {
  const { value, onChange, currentSchedule, onClose, onSubmit, onClear } = props;
  return (
    <div
      className="absolute inset-0 z-20 bg-background/70 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Jadwalkan Publish</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Halaman akan otomatis dipublikasikan pada waktu yang Anda pilih (zona waktu lokal).
            Setiap autosave terbaru akan ikut terbit.
          </p>
          <div>
            <label className="text-xs font-medium block mb-1">Tanggal & jam</label>
            <input
              type="datetime-local"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              min={toLocalInput(new Date().toISOString())}
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm"
            />
          </div>
          {currentSchedule ? (
            <div className="text-xs text-muted-foreground rounded-md bg-muted/50 p-2">
              Jadwal aktif: {new Date(currentSchedule).toLocaleString("id-ID")}
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-2 pt-2">
            {currentSchedule ? (
              <button
                onClick={onClear}
                className="px-3 py-2 rounded-md border border-destructive/30 text-destructive text-sm hover:bg-destructive/10"
              >
                Batalkan jadwal
              </button>
            ) : <span />}
            <div className="flex items-center gap-2 ml-auto">
              <button onClick={onClose} className="px-3 py-2 rounded-md border border-border text-sm hover:bg-muted">
                Batal
              </button>
              <button
                onClick={onSubmit}
                disabled={!value}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm hover:opacity-90 disabled:opacity-50"
              >
                <CalendarClock className="w-3.5 h-3.5" /> Jadwalkan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function labelReason(r: string | null): string {
  switch (r) {
    case "publish": return "📢 Publish";
    case "unpublish": return "🙈 Unpublish";
    case "before-restore": return "↩️ Sebelum pulihkan";
    case "scheduled-publish": return "⏰ Publish terjadwal";
    case "auto-save": return "💾 Simpan otomatis";
    default: return r || "💾 Simpan";
  }
}

// Convert ISO string → value usable in <input type="datetime-local"> (local TZ, no seconds)
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Save(_p: { className?: string }) { return null; }
void Save;
