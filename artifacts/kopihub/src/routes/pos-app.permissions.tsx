import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck, Store, Users, Filter } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  StaffPermissionsDialog,
  type StaffPermissionsTarget,
} from "@/components/staff-permissions-dialog";
import { STAFF_ROLE_LABELS } from "@/lib/use-staff";
import { logStaffAction } from "@/lib/staff-audit";

export const Route = createFileRoute("/pos-app/permissions")({
  component: PermissionsPage,
});

type ShopRow = {
  id: string;
  name: string;
  business_category_id: string | null;
  business_categories: { id: string; name: string; slug: string } | null;
};

type StaffRow = {
  user_id: string;
  shop_id: string;
  role: string;
  allowed_modules: string[] | null;
  name: string;
  email: string;
};

function PermissionsPage() {
  const { user } = useAuth();
  const [shops, setShops] = useState<ShopRow[]>([]);
  const [staffByShop, setStaffByShop] = useState<Record<string, StaffRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [target, setTarget] = useState<StaffPermissionsTarget | null>(null);

  async function load() {
    if (!user) return;
    setLoading(true);
    const { data: shopsData } = await supabase
      .from("shops")
      .select("id, name, business_category_id, business_categories(id, name, slug)")
      .eq("owner_id", user.id)
      .order("name");
    const list = (shopsData ?? []) as unknown as ShopRow[];
    setShops(list);

    if (list.length === 0) {
      setStaffByShop({});
      setLoading(false);
      return;
    }

    const shopIds = list.map((s) => s.id);
    const [{ data: roles }, { data: perms }] = await Promise.all([
      supabase
        .from("user_roles")
        .select("user_id, shop_id, role")
        .in("shop_id", shopIds),
      supabase
        .from("staff_permissions")
        .select("user_id, shop_id, role, allowed_modules")
        .in("shop_id", shopIds),
    ]);

    const userIds = Array.from(
      new Set([...(roles ?? []).map((r: any) => r.user_id)]),
    );
    const { data: profiles } = userIds.length
      ? await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", userIds)
      : { data: [] as any[] };
    const profileMap = new Map(
      (profiles ?? []).map((p: any) => [p.id, p]),
    );
    const permMap = new Map(
      (perms ?? []).map((p: any) => [`${p.shop_id}:${p.user_id}`, p]),
    );

    const grouped: Record<string, StaffRow[]> = {};
    for (const r of roles ?? []) {
      const rr = r as any;
      if (rr.role === "owner" || rr.role === "super_admin") continue;
      const prof = profileMap.get(rr.user_id) as any;
      const perm = permMap.get(`${rr.shop_id}:${rr.user_id}`) as any;
      const row: StaffRow = {
        user_id: rr.user_id,
        shop_id: rr.shop_id,
        role: rr.role,
        allowed_modules: perm?.allowed_modules ?? null,
        name: prof?.full_name ?? prof?.email ?? rr.user_id.slice(0, 8),
        email: prof?.email ?? "",
      };
      grouped[rr.shop_id] = [...(grouped[rr.shop_id] ?? []), row];
    }
    setStaffByShop(grouped);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const categories = useMemo(() => {
    const map = new Map<string, { id: string; name: string; slug: string }>();
    for (const s of shops) {
      if (s.business_categories) map.set(s.business_categories.id, s.business_categories);
    }
    return Array.from(map.values());
  }, [shops]);

  const filteredShops = useMemo(() => {
    const q = search.trim().toLowerCase();
    return shops.filter((s) => {
      if (filterCat !== "all" && s.business_category_id !== filterCat) return false;
      if (!q) return true;
      const inShop = s.name.toLowerCase().includes(q);
      const inStaff = (staffByShop[s.id] ?? []).some(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q),
      );
      return inShop || inStaff;
    });
  }, [shops, search, filterCat, staffByShop]);

  async function applyCategoryTemplate(catId: string) {
    if (!confirm("Terapkan template hak akses default ke semua staf di kategori ini? Hak akses sebelumnya akan ditimpa.")) return;
    const targetShops = shops.filter((s) => s.business_category_id === catId);
    if (targetShops.length === 0) return;
    const catSlug = targetShops[0].business_categories?.slug ?? "";
    // Template default per kategori — modul dasar yang aman untuk staf operasional
    const baseModules = ["pos", "orders", "online-orders", "shifts", "attendance", "antrian", "customers"];
    const fnbExtra = ["kds", "kitchen-load"];
    const retailExtra = ["inventory", "stok"];
    const tpl = [
      ...baseModules,
      ...(catSlug === "fnb" ? fnbExtra : []),
      ...(catSlug === "retail" ? retailExtra : []),
    ];

    let updated = 0;
    for (const s of targetShops) {
      const staff = staffByShop[s.id] ?? [];
      for (const st of staff) {
        const { error } = await supabase
          .from("staff_permissions")
          .upsert(
            {
              shop_id: s.id,
              user_id: st.user_id,
              role: st.role,
              allowed_modules: tpl,
            },
            { onConflict: "shop_id,user_id" },
          );
        if (!error) {
          updated += 1;
          logStaffAction({
            shopId: s.id,
            action: "staff.permissions_update",
            targetUserId: st.user_id,
            targetName: st.name,
            meta: { template: "category", category_slug: catSlug, modules: tpl },
          });
        }
      }
    }
    toast.success(`Template diterapkan ke ${updated} staf`);
    load();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <ShieldCheck className="h-6 w-6 text-primary" /> Hak Akses Staf
        </h1>
        <p className="text-sm text-muted-foreground">
          Kelola hak akses staf per outlet. Terapkan template kategori bisnis
          untuk menyamakan akses cepat di semua outlet sejenis.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Input
            placeholder="Cari outlet atau staf…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterCat} onValueChange={setFilterCat}>
          <SelectTrigger className="w-[200px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Kategori usaha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua kategori</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filterCat !== "all" && (
          <Button variant="outline" onClick={() => applyCategoryTemplate(filterCat)}>
            Terapkan template kategori
          </Button>
        )}
      </div>

      {filteredShops.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Tidak ada outlet yang cocok dengan filter.
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredShops.map((s) => {
            const staff = staffByShop[s.id] ?? [];
            return (
              <Card key={s.id} className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{s.name}</span>
                    {s.business_categories && (
                      <Badge variant="secondary" className="text-[10px]">
                        {s.business_categories.name}
                      </Badge>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="h-3 w-3" /> {staff.length} staf
                  </span>
                </div>
                {staff.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    Belum ada staf di outlet ini.
                  </div>
                ) : (
                  <ul className="divide-y">
                    {staff.map((st) => {
                      const mods = st.allowed_modules;
                      return (
                        <li
                          key={`${st.shop_id}-${st.user_id}`}
                          className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">{st.name}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{st.email || "—"}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {STAFF_ROLE_LABELS[st.role as keyof typeof STAFF_ROLE_LABELS] ?? st.role}
                              </Badge>
                              <span>
                                {mods === null
                                  ? "default role"
                                  : `${mods.length} modul`}
                              </span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setTarget({
                                user_id: st.user_id,
                                shop_id: st.shop_id,
                                name: st.name,
                                role: st.role,
                              })
                            }
                          >
                            Atur hak akses
                          </Button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <StaffPermissionsDialog
        target={target}
        onClose={() => {
          setTarget(null);
          load();
        }}
      />
    </div>
  );
}
