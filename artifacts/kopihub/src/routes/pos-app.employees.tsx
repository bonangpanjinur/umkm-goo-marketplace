import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Trash2, Users, Copy, Check, Mail, UserPlus, Phone, Pencil, Upload, X, KeyRound, RotateCcw, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? "/api";

async function callStaffApi(path: string, body: Record<string, unknown>) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(`${API_BASE}/staff/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) {
    throw new Error(json?.error || `HTTP ${res.status}`);
  }
  return json;
}

function genPassword(len = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) out += chars[arr[i] % chars.length];
  return out;
}


export const Route = createFileRoute("/pos-app/employees")({
  component: EmployeesPage,
});

type RoleRow = {
  id: string;
  user_id: string;
  role: string;
  outlet_id: string | null;
  profile?: { display_name: string | null; avatar_url: string | null } | null;
};
type Invitation = {
  id: string;
  email: string;
  role: string;
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};
type Outlet = { id: string; name: string };
type StaffMember = {
  id: string;
  name: string;
  role: string;
  outlet_id: string | null;
  phone: string | null;
  avatar_url: string | null;
  created_at: string;
};

const ROLES = [
  { value: "manager", label: "Manager" },
  { value: "cashier", label: "Kasir" },
  { value: "barista", label: "Barista" },
];

function roleLabel(r: string) {
  return ROLES.find((x) => x.value === r)?.label ?? r;
}

function EmployeesPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const { user } = useAuth();
  const [members, setMembers] = useState<RoleRow[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("cashier");
  const [outletId, setOutletId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Manual add / edit
  const [manualOpen, setManualOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualRole, setManualRole] = useState("cashier");
  const [manualOutletId, setManualOutletId] = useState<string>("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualAvatar, setManualAvatar] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [manualWithLogin, setManualWithLogin] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [manualPassword, setManualPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);
  const [lastCredentials, setLastCredentials] = useState<{ email: string; password: string } | null>(null);

  // Password / reset dialogs for active members
  const [pwDialog, setPwDialog] = useState<{ userId: string; name: string } | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [resetLink, setResetLink] = useState<{ name: string; link: string } | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!shop) return;
    setLoading(true);
    const [r, i, o, s] = await Promise.all([
      supabase.from("user_roles").select("id, user_id, role, outlet_id").eq("shop_id", shop.id),
      supabase
        .from("staff_invitations")
        .select("id, email, role, token, expires_at, accepted_at, created_at")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false }),
      supabase.from("outlets").select("id, name").eq("shop_id", shop.id),
      supabase
        .from("staff_members")
        .select("id, name, role, outlet_id, phone, avatar_url, created_at")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false }),
    ]);
    const rows = (r.data ?? []) as RoleRow[];
    // Hydrate profiles
    const userIds = [...new Set(rows.map((x) => x.user_id))];
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", userIds);
      const byId = new Map((profs ?? []).map((p) => [p.id, p]));
      rows.forEach((row) => {
        row.profile = byId.get(row.user_id) ?? null;
      });
    }
    setMembers(rows);
    setInvitations((i.data ?? []) as Invitation[]);
    setOutlets((o.data ?? []) as Outlet[]);
    setStaffMembers((s.data ?? []) as StaffMember[]);
    if (!outletId && o.data && o.data.length > 0) {
      setOutletId(o.data[0].id);
      setManualOutletId(o.data[0].id);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (shop) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id]);

  async function invite() {
    if (!shop || !user || !email.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("staff_invitations").insert({
      shop_id: shop.id,
      outlet_id: outletId || null,
      email: email.trim().toLowerCase(),
      role: role as "manager" | "cashier" | "barista",
      invited_by: user.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success("Undangan dibuat — bagikan tautannya");
      setEmail("");
      setOpen(false);
      load();
    }
    setSaving(false);
  }

  async function revokeInvitation(id: string) {
    if (!confirm("Batalkan undangan ini?")) return;
    const { error } = await supabase.from("staff_invitations").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Dibatalkan");
      load();
    }
  }

  async function removeMember(m: RoleRow) {
    if (!confirm(`Keluarkan pegawai ini dari toko?`)) return;
    const { error } = await supabase.from("user_roles").delete().eq("id", m.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Pegawai dikeluarkan");
      load();
    }
  }

  function inviteUrl(token: string) {
    return `${window.location.origin}/invite/${token}`;
  }

  async function copy(token: string) {
    await navigator.clipboard.writeText(inviteUrl(token));
    setCopied(token);
    setTimeout(() => setCopied(null), 1500);
  }

  function resetManualForm() {
    setEditingId(null);
    setManualName("");
    setManualPhone("");
    setManualAvatar("");
    setManualRole("cashier");
    setManualOutletId(outlets[0]?.id ?? "");
    setManualWithLogin(false);
    setManualEmail("");
    setManualPassword("");
    setShowPassword(false);
    setLastInviteUrl(null);
    setLastCredentials(null);
  }

  function openEditManual(sm: StaffMember) {
    setEditingId(sm.id);
    setManualName(sm.name);
    setManualRole(sm.role);
    setManualOutletId(sm.outlet_id ?? "");
    setManualPhone(sm.phone ?? "");
    setManualAvatar(sm.avatar_url ?? "");
    setManualWithLogin(false);
    setManualEmail("");
    setLastInviteUrl(null);
    setManualOpen(true);
  }

  async function handleAvatarUpload(file: File) {
    if (!shop) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Format harus JPG, PNG, atau WEBP");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran maksimal 2MB");
      return;
    }
    setUploadingAvatar(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${shop.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("staff-avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (upErr) {
      toast.error(upErr.message);
      setUploadingAvatar(false);
      return;
    }
    const { data } = supabase.storage.from("staff-avatars").getPublicUrl(path);
    setManualAvatar(data.publicUrl);
    setUploadingAvatar(false);
    toast.success("Foto terupload");
  }

  function validateManual(): string | null {
    const name = manualName.trim();
    if (!name) return "Nama wajib diisi";
    if (name.length < 2) return "Nama terlalu pendek";
    const phone = manualPhone.trim();
    if (phone && !/^[0-9+\-\s]{6,20}$/.test(phone)) return "No. HP hanya boleh angka (6-20 digit)";
    if (manualOutletId && !outlets.some((o) => o.id === manualOutletId)) {
      return "Outlet tidak valid untuk toko ini";
    }
    if (manualWithLogin && !editingId) {
      const em = manualEmail.trim();
      if (!em) return "Email wajib diisi untuk akses login";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return "Format email tidak valid";
    }
    return null;
  }

  async function addManual() {
    if (!shop) return;
    const err = validateManual();
    if (err) {
      toast.error(err);
      return;
    }
    setManualSaving(true);
    const phone = manualPhone.trim().replace(/[\s-]/g, "") || null;
    const payload = {
      outlet_id: manualOutletId || null,
      name: manualName.trim(),
      role: manualRole as "manager" | "cashier" | "barista",
      phone,
      avatar_url: manualAvatar.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from("staff_members").update(payload).eq("id", editingId)
      : await supabase.from("staff_members").insert({ ...payload, shop_id: shop.id });
    if (error) {
      toast.error(error.message);
      setManualSaving(false);
      return;
    }

    // Bonus: kalau "beri akses login" → buat undangan email + tampilkan link
    if (!editingId && manualWithLogin && user) {
      const em = manualEmail.trim().toLowerCase();
      const { data: invData, error: invErr } = await supabase
        .from("staff_invitations")
        .insert({
          shop_id: shop.id,
          outlet_id: manualOutletId || null,
          email: em,
          role: manualRole as "manager" | "cashier" | "barista",
          invited_by: user.id,
        })
        .select("token")
        .single();
      if (invErr) {
        toast.error("Pegawai tersimpan, tapi gagal buat undangan: " + invErr.message);
      } else if (invData) {
        const url = `${window.location.origin}/invite/${invData.token}`;
        setLastInviteUrl(url);
        try {
          await navigator.clipboard.writeText(url);
          toast.success("Pegawai ditambahkan & tautan login disalin");
        } catch {
          toast.success("Pegawai ditambahkan — bagikan tautan login");
        }
        setManualSaving(false);
        load();
        return; // keep dialog open so owner can copy link
      }
    }

    toast.success(editingId ? "Pegawai diperbarui" : "Pegawai ditambahkan");
    resetManualForm();
    setManualOpen(false);
    load();
    setManualSaving(false);
  }

  async function removeManual(id: string) {
    if (!confirm("Hapus pegawai ini? Semua jadwalnya juga akan dihapus.")) return;
    await supabase.from("shifts").delete().eq("user_id", id);
    const { error } = await supabase.from("staff_members").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Pegawai dihapus");
      load();
    }
  }

  if (shopLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pending = invitations.filter((i) => !i.accepted_at);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pegawai</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Undang tim, atur peran, dan kelola akses ke POS.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog
            open={manualOpen}
            onOpenChange={(o) => {
              setManualOpen(o);
              if (!o) resetManualForm();
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => resetManualForm()}>
                <UserPlus className="mr-2 h-4 w-4" /> Tambah pegawai
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit pegawai" : "Tambah pegawai"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-accent">
                    {manualAvatar ? (
                      <img src={manualAvatar} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-lg font-semibold uppercase text-accent-foreground">
                        {manualName.charAt(0) || "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleAvatarUpload(f);
                        e.target.value = "";
                      }}
                    />
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingAvatar}
                      >
                        {uploadingAvatar ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {manualAvatar ? "Ganti foto" : "Upload foto"}
                      </Button>
                      {manualAvatar && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setManualAvatar("")}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">JPG/PNG/WEBP, maks 2MB</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Nama lengkap <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="cth. Andi Saputra"
                    maxLength={120}
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Peran</Label>
                    <Select value={manualRole} onValueChange={setManualRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Outlet</Label>
                    <Select value={manualOutletId} onValueChange={setManualOutletId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih outlet" />
                      </SelectTrigger>
                      <SelectContent>
                        {outlets.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>No. HP (opsional)</Label>
                  <Input
                    value={manualPhone}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^0-9+\-\s]/g, "");
                      setManualPhone(v);
                    }}
                    inputMode="tel"
                    placeholder="08xxxxxxxxxx"
                    maxLength={20}
                  />
                </div>
                {!editingId && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={manualWithLogin}
                        onChange={(e) => setManualWithLogin(e.target.checked)}
                        className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">Beri akses login ke POS</div>
                        <div className="text-xs text-muted-foreground">
                          Kirim tautan undangan supaya pegawai bisa masuk dan pakai POS sesuai perannya.
                        </div>
                      </div>
                    </label>
                    {manualWithLogin && (
                      <div className="mt-3 space-y-2">
                        <Label className="text-xs">Email pegawai</Label>
                        <Input
                          type="email"
                          value={manualEmail}
                          onChange={(e) => setManualEmail(e.target.value)}
                          placeholder="pegawai@toko.com"
                          maxLength={255}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Pegawai harus daftar/masuk dengan email yang sama untuk menerima akses.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {lastInviteUrl && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      <Check className="h-4 w-4" /> Tautan login siap dibagikan
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Input value={lastInviteUrl} readOnly className="text-xs" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          await navigator.clipboard.writeText(lastInviteUrl);
                          toast.success("Tersalin");
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}

                {!manualWithLogin && !lastInviteUrl && (
                  <p className="text-xs text-muted-foreground">
                    Tanpa akses login, pegawai hanya muncul di Jadwal & catatan internal.
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setManualOpen(false)}>
                  Batal
                </Button>
                <Button onClick={addManual} disabled={manualSaving || uploadingAvatar || !manualName.trim()}>
                  {manualSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingId ? "Simpan perubahan" : "Simpan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Mail className="mr-2 h-4 w-4" /> Undang via email
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Undang pegawai</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pegawai@toko.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    Pegawai harus daftar dengan email yang sama untuk menerima undangan.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Peran</Label>
                    <Select value={role} onValueChange={setRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((r) => (
                          <SelectItem key={r.value} value={r.value}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Outlet</Label>
                    <Select value={outletId} onValueChange={setOutletId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih outlet" />
                      </SelectTrigger>
                      <SelectContent>
                        {outlets.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button onClick={invite} disabled={saving || !email.trim()}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Buat undangan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
              ANGGOTA AKTIF ({members.length})
            </h2>
            {members.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                  <Users className="h-6 w-6" />
                </div>
                <p className="text-sm text-muted-foreground">Belum ada pegawai. Mulai dengan mengundang.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Nama</th>
                      <th className="px-4 py-2.5 text-left">Peran</th>
                      <th className="px-4 py-2.5 text-left">Outlet</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {members.map((m) => {
                      const outlet = outlets.find((o) => o.id === m.outlet_id);
                      return (
                        <tr key={m.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold uppercase text-accent-foreground">
                                {m.profile?.avatar_url ? (
                                  <img src={m.profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                                ) : (
                                  (m.profile?.display_name ?? "?").charAt(0)
                                )}
                              </div>
                              <span className="font-medium">{m.profile?.display_name ?? "—"}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium">
                              {roleLabel(m.role)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {outlet?.name ?? "Semua"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeMember(m)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {staffMembers.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
                PEGAWAI MANUAL ({staffMembers.length})
              </h2>
              <div className="overflow-hidden rounded-xl border border-border bg-card">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Nama</th>
                      <th className="px-4 py-2.5 text-left">Peran</th>
                      <th className="px-4 py-2.5 text-left">Outlet</th>
                      <th className="px-4 py-2.5 text-left">No. HP</th>
                      <th className="px-4 py-2.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {staffMembers.map((sm) => {
                      const outlet = outlets.find((o) => o.id === sm.outlet_id);
                      return (
                        <tr key={sm.id} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-xs font-semibold uppercase text-accent-foreground">
                                {sm.avatar_url ? (
                                  <img src={sm.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                                ) : (
                                  sm.name.charAt(0)
                                )}
                              </div>
                              <span className="font-medium">{sm.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium">
                              {roleLabel(sm.role)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{outlet?.name ?? "Semua"}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {sm.phone ? (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {sm.phone}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditManual(sm)}
                                title="Edit pegawai"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeManual(sm.id)}
                                className="text-destructive hover:text-destructive"
                                title="Hapus pegawai"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {pending.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
                UNDANGAN BELUM DITERIMA ({pending.length})
              </h2>
              <div className="space-y-2">
                {pending.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium">{inv.email}</div>
                        <div className="text-xs text-muted-foreground">
                          {roleLabel(inv.role)} · kadaluarsa{" "}
                          {new Date(inv.expires_at).toLocaleDateString("id-ID")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => copy(inv.token)}>
                        {copied === inv.token ? (
                          <>
                            <Check className="mr-1.5 h-3.5 w-3.5" /> Tersalin
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1.5 h-3.5 w-3.5" /> Salin tautan
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => revokeInvitation(inv.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
