import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Database } from "lucide-react";

type HealthResp = {
  ok: boolean;
  checked_at: string;
  business_categories: { exists: boolean; row_count: number | null; error: string | null };
  schema_version: string | null;
  schema_version_error: string | null;
};

export function DbHealthBadge({ className = "" }: { className?: string }) {
  const [data, setData] = useState<HealthResp | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch("/api/public/health-db", { cache: "no-store" });
      const json = (await res.json()) as HealthResp;
      setData(json);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground ${className}`}>
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Mengecek status database…
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className={`flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive ${className}`}>
        <AlertCircle className="h-3.5 w-3.5" />
        Health check gagal: {err ?? "tidak ada data"}
        <button onClick={load} className="ml-auto underline">Ulang</button>
      </div>
    );
  }

  const ok = data.ok;
  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs ${
        ok
          ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
          : "border-destructive/40 bg-destructive/5 text-destructive"
      } ${className}`}
    >
      {ok ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
      <span className="font-medium">
        {ok ? "Database OK" : "Database bermasalah"}
      </span>
      <span className="text-muted-foreground">
        · business_categories:{" "}
        {data.business_categories.exists
          ? `${data.business_categories.row_count ?? 0} baris`
          : `tidak ditemukan${data.business_categories.error ? ` (${data.business_categories.error})` : ""}`}
      </span>
      <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
        <Database className="h-3 w-3" />
        schema: {data.schema_version ?? "—"}
      </span>
    </div>
  );
}
