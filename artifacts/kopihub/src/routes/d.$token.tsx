import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FolderUp, Download, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/d/$token")({
  head: () => ({ meta: [{ title: "Hasil Kerja Anda" }] }),
  component: DeliveryView,
});

function DeliveryView() {
  const { token } = Route.useParams();
  const [loading, setLoading] = useState(true);
  const [d, setD] = useState<any | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("job_deliverables")
        .select("id, customer_name, title, description, external_url, file_url, file_name, status, sent_at, received_at")
        .eq("delivery_token", token)
        .in("status", ["sent", "received", "revision", "completed"])
        .maybeSingle();
      setD(data);
      if (data && data.status === "sent") {
        await (supabase as any).from("job_deliverables")
          .update({ status: "received", received_at: new Date().toISOString() })
          .eq("id", data.id);
      }
      setLoading(false);
    })();
  }, [token]);

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!d) return (
    <div className="flex min-h-screen items-center justify-center p-6 text-center">
      <div>
        <FolderUp className="mx-auto h-10 w-10 text-muted-foreground opacity-40" />
        <p className="mt-3 font-medium">Link tidak ditemukan</p>
        <p className="mt-1 text-sm text-muted-foreground">Mungkin sudah dihapus atau belum dikirim oleh merchant.</p>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> Pengiriman dikonfirmasi
        </div>
        <h1 className="mt-2 text-2xl font-bold">{d.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">Untuk: {d.customer_name}</p>
        {d.description && <p className="mt-3 text-sm">{d.description}</p>}

        <div className="mt-5 space-y-2">
          {d.external_url && (
            <a href={d.external_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between rounded-lg border p-3 hover:border-primary hover:bg-primary/5">
              <span className="flex items-center gap-2 text-sm font-medium"><ExternalLink className="h-4 w-4 text-primary" /> Buka link eksternal (Drive / WeTransfer)</span>
              <span className="text-xs text-muted-foreground">↗</span>
            </a>
          )}
          {d.file_url && (
            <a href={d.file_url} download className="flex items-center justify-between rounded-lg border p-3 hover:border-primary hover:bg-primary/5">
              <span className="flex items-center gap-2 text-sm font-medium"><Download className="h-4 w-4 text-primary" /> {d.file_name ?? "Unduh File"}</span>
              <span className="text-xs text-muted-foreground">↓</span>
            </a>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
          Ada revisi atau pertanyaan? Hubungi langsung merchant via WhatsApp yang sebelumnya mengirim link ini.
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Powered by UMKMgo
      </p>
    </div>
  );
}
