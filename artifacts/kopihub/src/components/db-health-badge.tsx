import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type HealthState = {
  ok: boolean;
  row_count: number | null;
  error: string | null;
  project_ref: string;
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

function extractRef(url: string | undefined): string {
  if (!url) return "(unset)";
  const m = url.match(/https?:\/\/([^.]+)\./);
  return m?.[1] ?? "(invalid)";
}

export function DbHealthBadge({ className = "" }: { className?: string }) {
  const [data, setData] = useState<HealthState | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const project_ref = extractRef(SUPABASE_URL);
    try {
      const { count, error } = await supabase
        .from("business_categories")
        .select("id", { count: "exact", head: true });
      if (error) {
        setData({ ok: false, row_count: null, error: error.message, project_ref });
      } else {
        setData({ ok: true, row_count: count ?? 0, error: null, project_ref });
      }
    } catch (e) {
      setData({
        ok: false,
        row_count: null,
        error: e instanceof Error ? e.message : String(e),
        project_ref,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <div
        className={`flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground ${className}`}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Mengecek status database…
      </div>
    );
  }

  if (!data) return null;

  const ok = data.ok;

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs ${
        ok
          ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400"
          : "border-destructive/40 bg-destructive/5 text-destructive"
      } ${className}`}
    >
      {ok ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5" />
      )}
      <span className="font-medium">
        {ok ? "Database OK" : "Database bermasalah"}
      </span>
      <span className="text-muted-foreground">
        ·{" "}
        {data.ok
          ? `business_categories: ${data.row_count ?? 0} baris`
          : `business_categories tidak ditemukan${data.error ? ` (${data.error})` : ""}`}
      </span>
      <span className="ml-auto inline-flex items-center gap-1 text-muted-foreground">
        <Database className="h-3 w-3" />
        ref: {data.project_ref}
      </span>
      <button
        onClick={load}
        className="underline text-muted-foreground hover:text-foreground"
      >
        Refresh
      </button>
    </div>
  );
}
