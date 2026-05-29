import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, Phone, Store } from "lucide-react";

export const Route = createFileRoute("/kurir/profile")({
  head: () => ({ meta: [{ title: "Profil Kurir — UMKMgo" }] }),
  component: CourierProfile,
});

type Row = {
  id: string;
  name: string;
  phone: string | null;
  plate_number: string | null;
  is_active: boolean;
  shop: { name: string; slug: string | null } | null;
};

function CourierProfile() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("couriers")
        .select("id,name,phone,plate_number,is_active,shop:shops(name,slug)")
        .eq("user_id", user.id);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-1 text-xl font-semibold">Profil Kurir</h1>
      <p className="mb-4 text-xs text-muted-foreground">{user?.email}</p>

      <h2 className="mb-2 text-sm font-medium text-muted-foreground">Terdaftar di toko</h2>
      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Belum terdaftar di toko manapun.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="rounded-lg border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{r.shop?.name ?? "—"}</span>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    r.is_active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {r.is_active ? "Aktif" : "Nonaktif"}
                </span>
              </div>
              <div className="mt-1 grid gap-0.5 text-xs text-muted-foreground">
                <div>👤 Nama: {r.name}</div>
                {r.phone && (
                  <div className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {r.phone}
                  </div>
                )}
                {r.plate_number && <div>🏍️ Plat: {r.plate_number}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        Untuk mengubah data profil (nomor HP, plat nomor) atau menambah toko, hubungi pemilik toko.
      </p>
    </div>
  );
}
