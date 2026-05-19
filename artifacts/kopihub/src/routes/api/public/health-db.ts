import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/health-db")({
  server: {
    handlers: {
      GET: async () => {
        const result: {
          ok: boolean;
          checked_at: string;
          business_categories: {
            exists: boolean;
            row_count: number | null;
            error: string | null;
          };
          schema_version: string | null;
          schema_version_error: string | null;
        } = {
          ok: false,
          checked_at: new Date().toISOString(),
          business_categories: { exists: false, row_count: null, error: null },
          schema_version: null,
          schema_version_error: null,
        };

        try {
          const { count, error } = await supabaseAdmin
            .from("business_categories")
            .select("*", { count: "exact", head: true });
          if (error) {
            result.business_categories.error = error.message;
          } else {
            result.business_categories.exists = true;
            result.business_categories.row_count = count ?? 0;
          }
        } catch (e) {
          result.business_categories.error = e instanceof Error ? e.message : String(e);
        }

        try {
          const { data, error } = await (supabaseAdmin as any)
            .schema("supabase_migrations")
            .from("schema_migrations")
            .select("version")
            .order("version", { ascending: false })
            .limit(1);
          if (error) {
            result.schema_version_error = error.message;
          } else if (data && data.length > 0) {
            result.schema_version = String(data[0].version);
          }
        } catch (e) {
          result.schema_version_error = e instanceof Error ? e.message : String(e);
        }

        result.ok = result.business_categories.exists;

        return new Response(JSON.stringify(result, null, 2), {
          status: result.ok ? 200 : 503,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
