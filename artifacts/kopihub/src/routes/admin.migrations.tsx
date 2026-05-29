import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2, CheckCircle2, XCircle, Play, RefreshCw, Database,
  AlertTriangle, Info, ChevronDown, ChevronUp,
} from "lucide-react";

export const Route = createFileRoute("/admin/migrations")({
  head: () => ({ meta: [{ title: "Database Migrations — Admin" }] }),
  component: AdminMigrations,
});

type MigrationStatus = {
  id: string;
  label: string;
  applied: boolean;
  error?: string;
};

type RunResult = {
  id: string;
  label?: string;
  ok: boolean;
  error?: string;
};

const MIGRATION_DESCRIPTIONS: Record<string, { desc: string; tables: string[] }> = {
  fase2: {
    desc: "Marketing campaigns, storefront layouts, digital product versions, kolom flash_sale pada menu items.",
    tables: ["marketing_campaigns", "campaign_recipients", "storefront_layouts", "digital_product_versions"],
  },
  fase3_4: {
    desc: "Flash sales, promo codes, happy hour rules, kategori bisnis baru.",
    tables: ["flash_sales", "promo_codes", "happy_hour_rules"],
  },
  fase6_7: {
    desc: "Group buy, subscription plans, consultation slots, live sessions, kolom lokasi pada shops, RPC shops_nearby.",
    tables: ["group_buys", "product_subscription_plans", "consultation_slots", "live_sessions"],
  },
  fase8_9: {
    desc: "Bulk pricing rules, restock subscribers, webhook events, API keys, fungsi commission, auto-cancel, GDPR erase.",
    tables: ["bulk_pricing_rules", "restock_subscribers", "webhook_events", "api_keys"],
  },
  fase10: {
    desc: "Courier ratings, kolom saldo kurir, withdrawal requests untuk kurir.",
    tables: ["courier_ratings"],
  },
};

function AdminMigrations() {
  const [statuses, setStatuses] = useState<MigrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasDbUrl, setHasDbUrl] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [runResults, setRunResults] = useState<RunResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [adminSecret, setAdminSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  const loadStatus = async (secret: string) => {
    if (!secret) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/migrations/status", {
        headers: { "x-admin-secret": secret },
      });
      if (res.status === 401) {
        toast.error("ADMIN_SECRET salah");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setStatuses(data.migrations ?? []);
      setHasDbUrl(data.has_db_url ?? false);
    } catch {
      toast.error("Tidak dapat menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async (id: string) => {
    if (!adminSecret) { toast.error("Masukkan ADMIN_SECRET terlebih dahulu"); return; }
    setRunning(id);
    setRunResults([]);
    try {
      const res = await fetch("/api/admin/migrations/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-secret": adminSecret,
        },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      setRunResults(data.results ?? []);
      setShowResults(true);
      if (data.ok) {
        toast.success(id === "all" ? "Semua migration berhasil!" : "Migration berhasil!");
        loadStatus(adminSecret);
      } else {
        toast.error("Migration gagal. Lihat detail di bawah.");
      }
    } catch {
      toast.error("Gagal menghubungi server");
    } finally {
      setRunning(null);
    }
  };

  const appliedCount = statuses.filter((s) => s.applied).length;
  const pendingCount = statuses.filter((s) => !s.applied).length;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="h-6 w-6 text-primary" />
          Database Migrations
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jalankan SQL migration Fase A ke Supabase. Semua migration bersifat idempotent (aman dijalankan berulang).
        </p>
      </div>

      {/* Admin Secret Input */}
      <Card className="p-4 space-y-3">
        <div className="font-medium text-sm">Autentikasi Admin</div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showSecret ? "text" : "password"}
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadStatus(adminSecret)}
              placeholder="Masukkan ADMIN_SECRET..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm pr-10 font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShowSecret((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showSecret ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            </button>
          </div>
          <Button variant="outline" onClick={() => loadStatus(adminSecret)} disabled={!adminSecret}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Cek Status
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          ADMIN_SECRET ada di Replit Secrets. Dibutuhkan untuk menjalankan migration.
        </p>
      </Card>

      {/* DB URL Warning */}
      {!loading && adminSecret && !hasDbUrl && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-800 space-y-2">
            <div className="font-semibold">SUPABASE_DB_URL belum dikonfigurasi</div>
            <div>
              Untuk menjalankan migration, tambahkan <code className="bg-red-100 px-1 rounded">SUPABASE_DB_URL</code> ke Replit Secrets.
            </div>
            <div>
              Cara mendapatkannya:
              <ol className="list-decimal list-inside mt-1 space-y-1">
                <li>Buka <strong>Supabase Dashboard → Settings → Database</strong></li>
                <li>Di bagian <strong>Connection string</strong>, pilih <strong>Transaction Pooler</strong> atau <strong>Session Pooler</strong></li>
                <li>Salin URL (format: <code className="bg-red-100 px-1 rounded">postgresql://postgres.[ref]:[password]@...</code>)</li>
                <li>Tambahkan sebagai secret <code className="bg-red-100 px-1 rounded">SUPABASE_DB_URL</code> di Replit</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Summary */}
      {!loading && statuses.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <Badge className="bg-green-100 text-green-700 text-sm px-3 py-1">
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            {appliedCount} sudah diterapkan
          </Badge>
          {pendingCount > 0 && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 text-sm px-3 py-1">
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              {pendingCount} belum dijalankan
            </Badge>
          )}
          {pendingCount > 0 && hasDbUrl && (
            <Button
              size="sm"
              onClick={() => runMigration("all")}
              disabled={running !== null}
              className="ml-auto"
            >
              {running === "all" ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Play className="h-4 w-4 mr-1.5" />
              )}
              Jalankan Semua ({pendingCount})
            </Button>
          )}
        </div>
      )}

      {/* Migration List */}
      {loading && adminSecret ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Memuat status migration...</span>
        </div>
      ) : statuses.length === 0 && adminSecret ? (
        <div className="text-center text-muted-foreground py-8">
          Klik "Cek Status" untuk melihat status migration.
        </div>
      ) : !adminSecret ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
          <Database className="h-8 w-8 mx-auto mb-2 opacity-40" />
          <div className="text-sm">Masukkan ADMIN_SECRET dan klik "Cek Status" untuk memulai.</div>
        </div>
      ) : (
        <div className="space-y-3">
          {statuses.map((status, idx) => {
            const desc = MIGRATION_DESCRIPTIONS[status.id];
            const isRunning = running === status.id;
            return (
              <Card key={status.id} className={`p-4 ${status.applied ? "opacity-75" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {status.applied ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="font-medium text-sm">
                        {idx + 1}. {status.label}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={status.applied
                            ? "bg-green-100 text-green-700 text-xs"
                            : "bg-amber-100 text-amber-700 text-xs"}
                        >
                          {status.applied ? "Applied" : "Pending"}
                        </Badge>
                        {!status.applied && hasDbUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => runMigration(status.id)}
                            disabled={running !== null}
                          >
                            {isRunning ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <Play className="h-3.5 w-3.5 mr-1" />
                            )}
                            Jalankan
                          </Button>
                        )}
                      </div>
                    </div>
                    {desc && (
                      <p className="mt-1 text-xs text-muted-foreground">{desc.desc}</p>
                    )}
                    {desc && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {desc.tables.map((t) => (
                          <code key={t} className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono">
                            {t}
                          </code>
                        ))}
                      </div>
                    )}
                    {status.error && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                        {status.error}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Run Results */}
      {runResults.length > 0 && (
        <Card className="overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent transition-colors"
            onClick={() => setShowResults((s) => !s)}
          >
            <div className="font-medium text-sm flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              Hasil Eksekusi ({runResults.filter((r) => r.ok).length}/{runResults.length} berhasil)
            </div>
            {showResults ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {showResults && (
            <div className="border-t border-border divide-y divide-border">
              {runResults.map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-start gap-3">
                  {r.ok ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{r.label ?? r.id}</div>
                    {r.error && (
                      <pre className="mt-1 text-xs text-red-600 whitespace-pre-wrap break-words bg-red-50 rounded p-2">
                        {r.error}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Info Box */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 flex gap-2">
        <Info className="h-4 w-4 mt-0.5 shrink-0" />
        <div>
          <strong>Info:</strong> Semua migration menggunakan <code className="bg-blue-100 px-1 rounded">IF NOT EXISTS</code> —
          aman dijalankan berkali-kali tanpa efek samping. Jika migration sudah diterapkan sebagian,
          jalankan ulang tidak akan membuat duplikat atau error.
        </div>
      </div>
    </div>
  );
}
