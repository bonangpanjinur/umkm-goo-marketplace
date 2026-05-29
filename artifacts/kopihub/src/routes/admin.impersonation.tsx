import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserCog, Search, Store, ExternalLink, LogOut, ShieldAlert, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/impersonation")({
  head: () => ({ meta: [{ title: "Impersonasi Akun — Admin" }] }), component: AdminImpersonation });

const IMPERSONATE_KEY = "umkmgo_impersonate_shop_id";

type Shop = { id: string; name: string; slug: string; plan: string; owner_email: string | null };

function AdminImpersonation() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shops, setShops] = useState<Shop[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [logMsg, setLogMsg] = useState<string | null>(null);

  const current = localStorage.getItem(IMPERSONATE_KEY);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("shops")
      .select("id, name, slug, plan")
      .order("name") as any;

    const shopList: Shop[] = [];
    for (const s of data ?? []) {
      shopList.push({ ...s, owner_email: null });
    }
    setShops(shopList);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const logAudit = async (shopId: string, shopName: string, action: "start" | "end") => {
    await supabase.from("system_audit" as any).insert({
      source: "admin",
      action: `impersonation_${action}`,
      actor_id: user?.id,
      metadata: { shop_id: shopId, shop_name: shopName, admin_email: user?.email },
    });
  };

  const startImpersonate = async (shop: Shop) => {
    setImpersonating(shop.id);
    localStorage.setItem(IMPERSONATE_KEY, shop.id);
    await logAudit(shop.id, shop.name, "start");
    setLogMsg(`Mode Support aktif: ${shop.name}`);
    toast.success(`Sekarang melihat sebagai "${shop.name}"`);
    setImpersonating(null);
    navigate({ to: "/pos-app" });
  };

  const stopImpersonate = async () => {
    const sid = current;
    localStorage.removeItem(IMPERSONATE_KEY);
    if (sid) {
      const s = shops.find((x) => x.id === sid);
      if (s) await logAudit(s.id, s.name, "end");
    }
    setLogMsg(null);
    toast.info("Keluar dari Mode Support");
  };

  const filtered = shops.filter(
    (s) =>
      !q ||
      s.name.toLowerCase().includes(q.toLowerCase()) ||
      s.slug.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6" /> Impersonation Admin
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Akses dashboard toko sebagai mode support — semua aksi dicatat di Audit Log
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {current && (
        <Card className="p-4 border-amber-300 bg-amber-50 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-800">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold text-sm">Mode Support Aktif</p>
              <p className="text-xs">
                {logMsg ?? `Anda sedang mengakses toko ID: ${current}`}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={stopImpersonate} className="border-amber-400 text-amber-800 hover:bg-amber-100 shrink-0">
            <LogOut className="h-3.5 w-3.5 mr-1" />
            Keluar Mode Support
          </Button>
        </Card>
      )}

      <Card className="p-4 border-blue-200 bg-blue-50/50">
        <div className="flex items-start gap-2 text-blue-800 text-sm">
          <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Fitur ini hanya untuk keperluan support teknis. Setiap akses dicatat secara otomatis di{" "}
            <strong>Audit Log</strong>. Jangan digunakan untuk kepentingan pribadi.
          </p>
        </div>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Cari toko…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          Tidak ada toko ditemukan
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const isActive = current === s.id;
            return (
              <Card key={s.id} className={`p-4 ${isActive ? "border-amber-300 bg-amber-50/30" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Store className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{s.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${s.plan === "pro" ? "border-primary text-primary" : ""}`}
                        >
                          {s.plan.toUpperCase()}
                        </Badge>
                        {isActive && (
                          <Badge className="text-[10px] bg-amber-500 hover:bg-amber-500">
                            Mode Aktif
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">/s/{s.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={`/s/${s.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button size="sm" variant="ghost" className="h-8 px-2">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </a>
                    {isActive ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={stopImpersonate}
                        className="border-amber-400 text-amber-800 hover:bg-amber-100"
                      >
                        <LogOut className="h-3.5 w-3.5 mr-1" />
                        Keluar
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => startImpersonate(s)}
                        disabled={impersonating === s.id}
                      >
                        <UserCog className="h-3.5 w-3.5 mr-1" />
                        {impersonating === s.id ? "Masuk…" : "Masuk sebagai"}
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
