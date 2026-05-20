import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, ShieldCheck, Plus, Trash2, Pencil, Store, MapPin } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { STAFF_ROLE_LABELS } from "@/lib/use-staff";
import { logStaffAction } from "@/lib/staff-audit";

export const Route = createFileRoute("/pos-app/role-mapping")({
  component: RoleMappingPage,
});

// Role enum yang relevan untuk dipetakan owner.
// `owner` & `super_admin` di-exclude — di-handle sistem.
const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "manager", label: "Manajer" },
  { value: "supervisor", label: STAFF_ROLE_LABELS.supervisor },
  { value: "cashier", label: "Kasir" },
  { value: "barista", label: "Barista" },
  { value: "pelayan", label: STAFF_ROLE_LABELS.pelayan },
  { value: "koki", label: STAFF_ROLE_LABELS.koki },
  { value: "gudang", label: STAFF_ROLE_LABELS.gudang },
  { value: "helper", label: STAFF_ROLE_LABELS.helper },
  { value: "courier", label: "Kurir" },
  { value: "customer", label: "Pelanggan" },
];

const ALL_OUTLETS = "__all__";

type Shop = { id: string; name: string };
type Outlet = { id: string; shop_id: string; name: string };
type Profile = { id: string; display_name: string | null };
type RoleRow = {
  id: string;
  user_id: string;
  role: string;
  shop_id: string;
  outlet_id: string | null;
  is_active: boolean;
  created_at: string;
};

function RoleMappingPage() {
  const { user } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState<string>("");
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [rows, setRows] = useState<RoleRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ mode: "add" | "edit"; row?: RoleRow } | null>(null);

  // Load owner's shops
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("shops")
        .select("id, name")
        .eq("owner_id", user.id)
        .order("name");
      const list = (data ?? []) as Shop[];
      setShops(list);
      if (list.length && !shopId) setShopId(list[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function load() {
    if (!shopId) return;
    setLoading(true);
    const [{ data: outletData }, { data: roleData }] = await Promise.all([
      supabase.from("outlets").select("id, shop_id, name").eq("shop_id", shopId).order("name"),
      supabase
        .from("user_roles")
        .select("id, user_id, role, shop_id, outlet_id, is_active, created_at")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false }),
    ]);
    setOutlets((outletData ?? []) as Outlet[]);
    const list = (roleData ?? []) as RoleRow[];
    setRows(list.filter((r) => r.role !== "owner" && r.role !== "super_admin"));

    const userIds = Array.from(new Set(list.map((r) => r.user_id)));
    if (userIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", userIds);
      const map: Record<string, Profile> = {};
      (profs ?? []).forEach((p: any) => (map[p.id] = p));
      setProfiles(map);
    } else {
      setProfiles({});
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const name = profiles[r.user_id]?.display_name ?? r.user_id;
      return (
        name.toLowerCase().includes(q) ||
        r.role.toLowerCase().includes(q) ||
        r.user_id.toLowerCase().includes(q)
      );
    });
  }, [rows, profiles, search]);

  const outletName = (id: string | null) =>
    id ? outlets.find((o) => o.id === id)?.name ?? "—" : "Semua outlet";

  async function handleDelete(row: RoleRow) {
    if (!confirm(`Cabut role "${row.role}" dari pengguna ini?`)) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", row.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logStaffAction({
      shopId: row.shop_id,
      action: "role.revoke",
      targetUserId: row.user_id,
      targetName: profiles[row.user_id]?.display_name ?? undefined,
      meta: { role: row.role, outlet_id: row.outlet_id },
    });
    toast.success("Role dicabut");
    load();
  }

  if (loading && !shops.length) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!shops.length) {
    return (
      <Card className="m-4 p-10 text-center text-sm text-muted-foreground">
        Anda belum memiliki outlet/toko untuk dikelola.
      </Card>
    );
  }

  return (
    <div className="space-y-5 p-4">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold">
          <ShieldCheck className="h-6 w-6 text-primary" /> Pemetaan Role &amp; Outlet
        </h1>
        <p className="text-sm text-muted-foreground">
          Atur role (kasir, barista, pelanggan, dll) dan tentukan outlet mana
          yang dapat diakses tiap pengguna. Setiap perubahan tercatat di Log Audit.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={shopId} onValueChange={setShopId}>
          <SelectTrigger className="w-[240px]">
            <Store className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {shops.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Cari nama atau role…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Button className="ml-auto" onClick={() => setDialog({ mode: "add" })}>
          <Plus className="mr-2 h-4 w-4" /> Tambah Role
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          Belum ada role yang dipetakan. Klik "Tambah Role".
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {filtered.map((r) => {
              const prof = profiles[r.user_id];
              return (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {prof?.display_name ?? r.user_id.slice(0, 8)}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="secondary">
                        {STAFF_ROLE_LABELS[r.role as keyof typeof STAFF_ROLE_LABELS] ?? r.role}
                      </Badge>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {outletName(r.outlet_id)}
                      </span>
                      {!r.is_active && <Badge variant="outline">Nonaktif</Badge>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => setDialog({ mode: "edit", row: r })}>
                      <Pencil className="mr-1 h-3 w-3" /> Ubah
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(r)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {dialog && (
        <RoleDialog
          mode={dialog.mode}
          row={dialog.row}
          shopId={shopId}
          outlets={outlets}
          existingProfiles={Object.values(profiles)}
          onClose={() => setDialog(null)}
          onSaved={() => {
            setDialog(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function RoleDialog({
  mode, row, shopId, outlets, existingProfiles, onClose, onSaved,
}: {
  mode: "add" | "edit";
  row?: RoleRow;
  shopId: string;
  outlets: Outlet[];
  existingProfiles: Profile[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [userId, setUserId] = useState(row?.user_id ?? "");
  const [role, setRole] = useState(row?.role ?? "cashier");
  const [outletId, setOutletId] = useState<string>(row?.outlet_id ?? ALL_OUTLETS);
  const [isActive, setIsActive] = useState(row?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  // Untuk mode add, owner bisa pilih dari profil staf yang sudah ada di shop
  // atau paste user_id langsung.
  const [profileSearch, setProfileSearch] = useState("");
  const filteredProfiles = useMemo(() => {
    const q = profileSearch.trim().toLowerCase();
    if (!q) return existingProfiles;
    return existingProfiles.filter((p) =>
      (p.display_name ?? "").toLowerCase().includes(q) || p.id.toLowerCase().includes(q),
    );
  }, [existingProfiles, profileSearch]);

  async function handleSave() {
    if (!userId.trim()) {
      toast.error("Pilih atau isi User ID terlebih dahulu");
      return;
    }
    setSaving(true);
    const payload = {
      user_id: userId.trim(),
      role,
      shop_id: shopId,
      outlet_id: outletId === ALL_OUTLETS ? null : outletId,
      is_active: isActive,
    };

    try {
      if (mode === "add") {
        const { error } = await supabase.from("user_roles").insert(payload as any);
        if (error) throw error;
        await logStaffAction({
          shopId,
          action: "role.assign",
          targetUserId: payload.user_id,
          meta: { role: payload.role, outlet_id: payload.outlet_id, is_active: payload.is_active },
        });
        toast.success("Role ditambahkan");
      } else if (row) {
        const { error } = await supabase.from("user_roles").update(payload as any).eq("id", row.id);
        if (error) throw error;
        await logStaffAction({
          shopId,
          action: "role.update",
          targetUserId: payload.user_id,
          meta: {
            before: { role: row.role, outlet_id: row.outlet_id, is_active: row.is_active },
            after: { role: payload.role, outlet_id: payload.outlet_id, is_active: payload.is_active },
          },
        });
        toast.success("Role diperbarui");
      }
      onSaved();
    } catch (e: any) {
      toast.error(e?.message ?? "Gagal menyimpan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Tambah Role" : "Ubah Role"}</DialogTitle>
          <DialogDescription>
            Pilih pengguna, role, dan outlet yang dapat diakses.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === "add" && (
            <div className="space-y-2">
              <Label>Pengguna</Label>
              <Input
                placeholder="Cari staf yang sudah ada atau tempel User ID…"
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
              />
              {filteredProfiles.length > 0 && (
                <div className="max-h-32 overflow-y-auto rounded-md border bg-muted/30">
                  {filteredProfiles.slice(0, 8).map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => { setUserId(p.id); setProfileSearch(p.display_name ?? p.id); }}
                      className={`block w-full px-3 py-2 text-left text-sm hover:bg-muted ${userId === p.id ? "bg-muted" : ""}`}
                    >
                      <div className="font-medium">{p.display_name ?? "(tanpa nama)"}</div>
                      <div className="text-[10px] text-muted-foreground">{p.id}</div>
                    </button>
                  ))}
                </div>
              )}
              <Input
                placeholder="atau tempel User ID di sini"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Outlet</Label>
            <Select value={outletId} onValueChange={setOutletId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_OUTLETS}>Semua outlet</SelectItem>
                {outlets.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Pilih outlet spesifik untuk membatasi akses, atau "Semua outlet" untuk akses penuh di toko ini.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label>Aktif</Label>
              <p className="text-xs text-muted-foreground">Matikan untuk menonaktifkan tanpa menghapus.</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}