import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bell, Check } from "lucide-react";
import { MarketplaceHeader } from "@/components/marketplace/MarketplaceHeader";

export const Route = createFileRoute("/akun/notifikasi")({
  component: NotifikasiPage,
});

type N = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  severity: string;
  read_at: string | null;
  created_at: string;
};

const SEV: Record<string, string> = {
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-destructive",
  danger: "bg-destructive",
};

function NotifikasiPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<N[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("recipient_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);
    setItems((data || []) as N[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const markAll = async () => {
    await supabase.rpc("mark_all_notifications_read");
    load();
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl p-6 text-center">
        <p className="mb-3 text-sm">Silakan login untuk melihat notifikasi.</p>
        <Link to="/login"><Button>Login</Button></Link>
      </div>
    );
  }

  return (
    <>
      <MarketplaceHeader />
      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2"><Bell className="h-5 w-5" /> Notifikasi</h1>
          <Button size="sm" variant="outline" onClick={markAll}><Check className="h-3 w-3 mr-1" />Tandai semua</Button>
        </div>
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">Memuat…</p>
        ) : items.length === 0 ? (
          <Card className="p-12 text-center text-sm text-muted-foreground">Belum ada notifikasi</Card>
        ) : (
          <ul className="space-y-2">
            {items.map((n) => {
              const dot = SEV[n.severity] || SEV.info;
              const content = (
                <Card className={`flex gap-3 p-3 hover:bg-muted/40 transition ${n.read_at ? "opacity-60" : ""}`}>
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("id-ID")}</p>
                  </div>
                </Card>
              );
              return (
                <li key={n.id}>
                  {n.link ? <Link to={n.link as any}>{content}</Link> : content}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
