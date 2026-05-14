import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  Trash2,
  Users,
  Copy,
  Check,
  Mail,
  UserPlus,
  Phone,
  Pencil,
  Upload,
  X,
  KeyRound,
  RotateCcw,
  Eye,
  EyeOff,
  Search,
  MoreHorizontal,
  ShieldCheck,
  IdCard,
  AlertTriangle,
} from "lucide-react";
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

// Deterministic avatar color based on name hash
const AVATAR_COLORS = [
  "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  "bg-teal-500/15 text-teal-700 dark:text-teal-300",
  "bg-orange-500/15 text-orange-700 dark:text-orange-300",
];
function colorForName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({ name, url, size = "md" }: { name: string; url?: string | null; size?: "sm" | "md" | "lg" }) {
  const dim = size === "lg" ? "h-16 w-16 text-lg" : size === "sm" ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs";
  if (url) {
    return (
      <div className={`relative shrink-0 overflow-hidden rounded-full ${dim}`}>
        <img src={url} alt={name} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold uppercase ${dim} ${colorForName(name || "?")}`}
    >
      {initialsOf(name || "?")}
    </div>
  );
}

export const Route = createFileRoute("/pos-app/employees")({
  component: EmployeesPage,
});

type RoleRow = {
  id: string;
  user_id: string;
  role: string;
  outlet_id: string | null;
  is_active: boolean;
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
  is_active: boolean;
  hire_date: string | null;
  hourly_rate: number | null;
  notes: string | null;
  created_at: string;
};

type UnifiedRow =
  | {
      kind: "login";
      key: string;
      name: string;
      role: string;
      outlet_id: string | null;
      avatarUrl: string | null;
      phone: null;
      is_active: boolean;
      raw: RoleRow;
    }
  | {
      kind: "manual";
      key: string;
      name: string;
      role: string;
      outlet_id: string | null;
      avatarUrl: string | null;
      phone: string | null;
      is_active: boolean;
      raw: StaffMember;
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

  // Filters
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<string>("all");
  const [filterOutlet, setFilterOutlet] = useState<string>("all");
  const [filterKind, setFilterKind] = useState<string>("all");

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
  const [manualHireDate, setManualHireDate] = useState("");
  const [manualHourlyRate, setManualHourlyRate] = useState("");
  const [manualNotes, setManualNotes] = useState("");

  // Filter status
  const [filterStatus, setFilterStatus] = useState<string>("active");

  // Edit login member dialog
  const [loginEdit, setLoginEdit] = useState<RoleRow | null>(null);
  const [loginEditRole, setLoginEditRole] = useState("cashier");
  const [loginEditOutlet, setLoginEditOutlet] = useState("");
  const [loginEditActive, setLoginEditActive] = useState(true);
  const [loginEditSaving, setLoginEditSaving] = useState(false);

  // Promote-to-login dialog
  const [promoteTarget, setPromoteTarget] = useState<StaffMember | null>(null);
  const [promoteEmail, setPromoteEmail] = useState("");
  const [promotePassword, setPromotePassword] = useState("");
  const [promoteShowPw, setPromoteShowPw] = useState(false);
  const [promoteSaving, setPromoteSaving] = useState(false);
  const [resending, setResending] = useState<string | null>(null);

  // Password / reset dialogs
  const [pwDialog, setPwDialog] = useState<{ userId: string; name: string } | null>(null);
  const [pwValue, setPwValue] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [resetLink, setResetLink] = useState<{ name: string; link: string } | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);

  // Confirm dialogs
  const [confirmRemoveLogin, setConfirmRemoveLogin] = useState<RoleRow | null>(null);
  const [confirmRemoveManual, setConfirmRemoveManual] = useState<StaffMember | null>(null);
  const [confirmRevokeInv, setConfirmRevokeInv] = useState<Invitation | null>(null);
  const [confirmCloseCreds, setConfirmCloseCreds] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!shop) return;
    setLoading(true);
    const [r, i, o, s] = await Promise.all([
      supabase.from("user_roles").select("id, user_id, role, outlet_id, is_active").eq("shop_id", shop.id),
      supabase
        .from("staff_invitations")
        .select("id, email, role, token, expires_at, accepted_at, created_at")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false }),
      supabase.from("outlets").select("id, name").eq("shop_id", shop.id),
      supabase
        .from("staff_members")
        .select("id, name, role, outlet_id, phone, avatar_url, is_active, hire_date, hourly_rate, notes, created_at")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false }),
    ]);
    const rows = (r.data ?? []) as RoleRow[];
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

  const unified = useMemo<UnifiedRow[]>(() => {
    const a: UnifiedRow[] = members.map((m) => ({
      kind: "login",
      key: `l-${m.id}`,
      name: m.profile?.display_name ?? "—",
      role: m.role,
      outlet_id: m.outlet_id,
      avatarUrl: m.profile?.avatar_url ?? null,
      phone: null,
      is_active: m.is_active !== false,
      raw: m,
    }));
    const b: UnifiedRow[] = staffMembers.map((s) => ({
      kind: "manual",
      key: `m-${s.id}`,
      name: s.name,
      role: s.role,
      outlet_id: s.outlet_id,
      avatarUrl: s.avatar_url,
      phone: s.phone,
      is_active: s.is_active !== false,
      raw: s,
    }));
    return [...a, ...b];
  }, [members, staffMembers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return unified.filter((u) => {
      if (filterKind !== "all" && u.kind !== filterKind) return false;
      if (filterRole !== "all" && u.role !== filterRole) return false;
      if (filterStatus === "active" && !u.is_active) return false;
      if (filterStatus === "inactive" && u.is_active) return false;
      if (filterOutlet !== "all") {
        if (filterOutlet === "none" ? u.outlet_id != null : u.outlet_id !== filterOutlet) return false;
      }
      if (q) {
        const hay = `${u.name} ${u.phone ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [unified, search, filterRole, filterOutlet, filterKind, filterStatus]);

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

  async function doRevokeInvitation(id: string) {
    const { error } = await supabase.from("staff_invitations").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Undangan dibatalkan");
      load();
    }
  }

  async function doRemoveMember(m: RoleRow) {
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
    setManualHireDate("");
    setManualHourlyRate("");
    setManualNotes("");
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
    setManualPassword("");
    setShowPassword(false);
    setLastInviteUrl(null);
    setLastCredentials(null);
    setManualHireDate(sm.hire_date ?? "");
    setManualHourlyRate(sm.hourly_rate != null ? String(sm.hourly_rate) : "");
    setManualNotes(sm.notes ?? "");
    setManualOpen(true);
  }

  function openLoginEdit(m: RoleRow) {
    setLoginEdit(m);
    setLoginEditRole(m.role);
    setLoginEditOutlet(m.outlet_id ?? "");
    setLoginEditActive(m.is_active !== false);
  }

  async function saveLoginEdit() {
    if (!shop || !loginEdit) return;
    setLoginEditSaving(true);
    try {
      await callStaffApi("update-role", {
        shop_id: shop.id,
        user_id: loginEdit.user_id,
        role: loginEditRole,
        outlet_id: loginEditOutlet || null,
        is_active: loginEditActive,
      });
      toast.success("Pegawai diperbarui");
      setLoginEdit(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Gagal menyimpan");
    }
    setLoginEditSaving(false);
  }

  async function toggleManualActive(sm: StaffMember) {
    if (!shop) return;
    try {
      await callStaffApi("set-manual-active", {
        shop_id: shop.id,
        staff_member_id: sm.id,
        is_active: !(sm.is_active !== false),
      });
      toast.success(sm.is_active !== false ? "Pegawai dinonaktifkan" : "Pegawai diaktifkan");
      load();
    } catch (e: any) {
      toast.error(e.message || "Gagal mengubah status");
    }
  }

  async function toggleLoginActive(m: RoleRow) {
    if (!shop) return;
    try {
      await callStaffApi("update-role", {
        shop_id: shop.id,
        user_id: m.user_id,
        is_active: !(m.is_active !== false),
      });
      toast.success(m.is_active !== false ? "Akses dinonaktifkan" : "Akses diaktifkan");
      load();
    } catch (e: any) {
      toast.error(e.message || "Gagal mengubah status");
    }
  }

  async function resendInvitation(inv: Invitation) {
    if (!shop) return;
    setResending(inv.id);
    try {
      const res = await callStaffApi("resend-invitation", {
        shop_id: shop.id,
        invitation_id: inv.id,
      });
      const newToken = res.token as string;
      try {
        await navigator.clipboard.writeText(`${window.location.origin}/invite/${newToken}`);
      } catch {}
      toast.success("Tautan baru disalin & masa berlaku diperpanjang");
      load();
    } catch (e: any) {
      toast.error(e.message || "Gagal mengirim ulang");
    }
    setResending(null);
  }

  function openPromote(sm: StaffMember) {
    setPromoteTarget(sm);
    setPromoteEmail("");
    setPromotePassword(genPassword(10));
    setPromoteShowPw(true);
  }

  async function doPromote() {
    if (!shop || !promoteTarget) return;
    const em = promoteEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      toast.error("Format email tidak valid");
      return;
    }
    if (promotePassword.length < 6) {
      toast.error("Kata sandi minimal 6 karakter");
      return;
    }
    setPromoteSaving(true);
    try {
      await callStaffApi("promote-to-login", {
        shop_id: shop.id,
        staff_member_id: promoteTarget.id,
        email: em,
        password: promotePassword,
      });
      try {
        await navigator.clipboard.writeText(`Email: ${em}\nKata sandi: ${promotePassword}`);
      } catch {}
      toast.success("Akun login dibuat & kredensial disalin");
      setPromoteTarget(null);
      load();
    } catch (e: any) {
      toast.error(e.message || "Gagal membuat akun");
    }
    setPromoteSaving(false);
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
      if (!manualPassword || manualPassword.length < 6) return "Kata sandi minimal 6 karakter";
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

    if (!editingId && manualWithLogin) {
      try {
        const em = manualEmail.trim().toLowerCase();
        await callStaffApi("create-user", {
          shop_id: shop.id,
          email: em,
          password: manualPassword,
          full_name: manualName.trim(),
          role: manualRole,
          outlet_id: manualOutletId || null,
          phone,
          avatar_url: manualAvatar.trim() || null,
          create_staff_member: true,
        });
        setLastCredentials({ email: em, password: manualPassword });
        try {
          await navigator.clipboard.writeText(`Email: ${em}\nKata sandi: ${manualPassword}`);
        } catch {}
        toast.success("Akun pegawai dibuat — kredensial siap dibagikan");
        load();
      } catch (e: any) {
        toast.error(e.message || "Gagal membuat akun");
      }
      setManualSaving(false);
      return;
    }

    const payload = {
      outlet_id: manualOutletId || null,
      name: manualName.trim(),
      role: manualRole as "manager" | "cashier" | "barista",
      phone,
      avatar_url: manualAvatar.trim() || null,
      hire_date: manualHireDate || null,
      hourly_rate: manualHourlyRate ? Number(manualHourlyRate) : null,
      notes: manualNotes.trim() || null,
    };
    const { error } = editingId
      ? await supabase.from("staff_members").update(payload).eq("id", editingId)
      : await supabase.from("staff_members").insert({ ...payload, shop_id: shop.id });
    if (error) {
      toast.error(error.message);
      setManualSaving(false);
      return;
    }

    toast.success(editingId ? "Pegawai diperbarui" : "Pegawai ditambahkan");
    resetManualForm();
    setManualOpen(false);
    load();
    setManualSaving(false);
  }

  async function setMemberPassword() {
    if (!shop || !pwDialog) return;
    if (pwValue.length < 6) {
      toast.error("Kata sandi minimal 6 karakter");
      return;
    }
    setPwSaving(true);
    try {
      await callStaffApi("set-password", {
        shop_id: shop.id,
        user_id: pwDialog.userId,
        password: pwValue,
      });
      try { await navigator.clipboard.writeText(pwValue); } catch {}
      toast.success("Kata sandi diperbarui & disalin");
      setPwDialog(null);
      setPwValue("");
    } catch (e: any) {
      toast.error(e.message || "Gagal mengubah sandi");
    }
    setPwSaving(false);
  }

  async function sendResetPassword(m: RoleRow) {
    if (!shop) return;
    setResetting(m.id);
    try {
      const res = await callStaffApi("reset-password", {
        shop_id: shop.id,
        user_id: m.user_id,
        redirect_to: `${window.location.origin}/reset-password`,
      });
      const link = res.action_link as string | null;
      if (link) {
        try { await navigator.clipboard.writeText(link); } catch {}
        setResetLink({ name: m.profile?.display_name ?? "Pegawai", link });
        toast.success("Tautan reset siap dibagikan");
      } else {
        toast.success("Email reset terkirim");
      }
    } catch (e: any) {
      toast.error(e.message || "Gagal kirim reset");
    }
    setResetting(null);
  }

  async function doRemoveManual(id: string) {
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
  const totalAll = members.length + staffMembers.length;

  function invExpiryBadge(inv: Invitation) {
    const days = Math.ceil((new Date(inv.expires_at).getTime() - Date.now()) / 86400000);
    if (days < 0) return <Badge variant="destructive" className="text-[10px]">Kadaluarsa</Badge>;
    if (days <= 2) return <Badge variant="destructive" className="text-[10px]">{days}h lagi</Badge>;
    if (days <= 5) return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 text-[10px]">{days}h lagi</Badge>;
    return <Badge variant="secondary" className="text-[10px]">{days}h lagi</Badge>;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pegawai</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola tim, peran, dan akses ke POS{shop?.name ? ` · ${shop.name}` : ""}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Dialog
            open={manualOpen}
            onOpenChange={(o) => {
              if (!o && lastCredentials) {
                setConfirmCloseCreds(true);
                return;
              }
              setManualOpen(o);
              if (!o) resetManualForm();
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={() => resetManualForm()}>
                <UserPlus className="mr-2 h-4 w-4" /> Tambah pegawai
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit pegawai" : "Tambah pegawai"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
                    {manualAvatar ? (
                      <img src={manualAvatar} alt="" className="h-full w-full object-cover rounded-full" />
                    ) : (
                      <div className={`flex h-full w-full items-center justify-center text-lg font-semibold uppercase ${colorForName(manualName || "?")}`}>
                        {initialsOf(manualName || "?")}
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
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tanggal masuk</Label>
                    <Input type="date" value={manualHireDate} onChange={(e) => setManualHireDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Upah / jam (Rp)</Label>
                    <Input
                      type="number"
                      inputMode="numeric"
                      value={manualHourlyRate}
                      onChange={(e) => setManualHourlyRate(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="cth. 25000"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Catatan internal (opsional)</Label>
                  <textarea
                    value={manualNotes}
                    onChange={(e) => setManualNotes(e.target.value)}
                    placeholder="Catatan untuk owner saja…"
                    maxLength={500}
                    rows={2}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                          Buatkan akun langsung dengan email & kata sandi.
                        </div>
                      </div>
                    </label>
                    {manualWithLogin && (
                      <div className="mt-3 space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Email pegawai</Label>
                          <Input
                            type="email"
                            value={manualEmail}
                            onChange={(e) => setManualEmail(e.target.value)}
                            placeholder="pegawai@toko.com"
                            maxLength={255}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Kata sandi awal</Label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Input
                                type={showPassword ? "text" : "password"}
                                value={manualPassword}
                                onChange={(e) => setManualPassword(e.target.value)}
                                placeholder="Min. 6 karakter"
                                maxLength={72}
                                className="pr-9"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword((s) => !s)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setManualPassword(genPassword(10));
                                setShowPassword(true);
                              }}
                            >
                              Generate
                            </Button>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Bagikan ke pegawai. Mereka bisa ganti dari menu profil.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {lastCredentials && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                      <Check className="h-4 w-4" /> Akun siap dibagikan
                    </div>
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
                      <span className="text-muted-foreground">Email</span>
                      <code className="font-mono">{lastCredentials.email}</code>
                      <span className="text-muted-foreground">Sandi</span>
                      <code className="font-mono">{lastCredentials.password}</code>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await navigator.clipboard.writeText(
                          `Email: ${lastCredentials.email}\nKata sandi: ${lastCredentials.password}`,
                        );
                        toast.success("Tersalin");
                      }}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" /> Salin kredensial
                    </Button>
                  </div>
                )}

                {!manualWithLogin && !lastCredentials && !editingId && (
                  <p className="text-xs text-muted-foreground">
                    Tanpa akses login, pegawai hanya muncul di Jadwal & catatan internal.
                  </p>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (lastCredentials) setConfirmCloseCreds(true);
                    else setManualOpen(false);
                  }}
                >
                  {lastCredentials ? "Tutup" : "Batal"}
                </Button>
                {!lastCredentials && (
                  <Button onClick={addManual} disabled={manualSaving || uploadingAvatar || !manualName.trim()}>
                    {manualSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingId ? "Simpan perubahan" : "Simpan"}
                  </Button>
                )}
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
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <Skeleton className="h-9 w-9 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-7 w-20" />
            </div>
          ))}
        </div>
      ) : totalAll === 0 && pending.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${colorForName("tim")}`}>
            <Users className="h-8 w-8" />
          </div>
          <h3 className="text-lg font-semibold">Belum ada pegawai</h3>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            Tambahkan pegawai langsung agar bisa muncul di Jadwal, atau undang via email supaya
            mereka bisa login ke POS.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button onClick={() => { resetManualForm(); setManualOpen(true); }}>
              <UserPlus className="mr-2 h-4 w-4" /> Tambah pegawai
            </Button>
            <Button variant="outline" onClick={() => setOpen(true)}>
              <Mail className="mr-2 h-4 w-4" /> Undang via email
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1 sm:flex-initial sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau no. HP…"
                className="pl-9"
              />
            </div>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua peran</SelectItem>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterOutlet} onValueChange={setFilterOutlet}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua outlet</SelectItem>
                <SelectItem value="none">Tanpa outlet</SelectItem>
                {outlets.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterKind} onValueChange={setFilterKind}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua tipe</SelectItem>
                <SelectItem value="login">Akses login</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <span className="ml-auto text-xs text-muted-foreground">
              {filtered.length} dari {totalAll} pegawai
            </span>
          </div>

          {/* Unified list */}
          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">Tidak ada pegawai cocok dengan filter.</p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => {
                setSearch(""); setFilterRole("all"); setFilterOutlet("all"); setFilterKind("all");
              }}>
                Reset filter
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Nama</th>
                      <th className="px-4 py-2.5 text-left">Peran</th>
                      <th className="px-4 py-2.5 text-left">Outlet</th>
                      <th className="px-4 py-2.5 text-left">Tipe akses</th>
                      <th className="px-4 py-2.5 text-left">No. HP</th>
                      <th className="px-4 py-2.5 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((u) => {
                      const outlet = outlets.find((o) => o.id === u.outlet_id);
                      return (
                        <tr key={u.key} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={u.name} url={u.avatarUrl} />
                              <span className="font-medium">{u.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium">
                              {roleLabel(u.role)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{outlet?.name ?? "Semua"}</td>
                          <td className="px-4 py-3">
                            {u.kind === "login" ? (
                              <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300">
                                <ShieldCheck className="h-3 w-3" /> Login
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <IdCard className="h-3 w-3" /> Manual
                              </Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {u.phone ? (
                              <span className="inline-flex items-center gap-1">
                                <Phone className="h-3 w-3" /> {u.phone}
                              </span>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <RowActions
                              row={u}
                              onEdit={() => u.kind === "manual" && openEditManual(u.raw)}
                              onChangePw={() => u.kind === "login" && setPwDialog({ userId: u.raw.user_id, name: u.name })}
                              onResetPw={() => u.kind === "login" && sendResetPassword(u.raw)}
                              onRemove={() => {
                                if (u.kind === "login") setConfirmRemoveLogin(u.raw);
                                else setConfirmRemoveManual(u.raw);
                              }}
                              resetting={u.kind === "login" && resetting === u.raw.id}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="space-y-2 md:hidden">
                {filtered.map((u) => {
                  const outlet = outlets.find((o) => o.id === u.outlet_id);
                  return (
                    <div key={u.key} className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
                      <Avatar name={u.name} url={u.avatarUrl} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate font-medium">{u.name}</div>
                          <RowActions
                            row={u}
                            onEdit={() => u.kind === "manual" && openEditManual(u.raw)}
                            onChangePw={() => u.kind === "login" && setPwDialog({ userId: u.raw.user_id, name: u.name })}
                            onResetPw={() => u.kind === "login" && sendResetPassword(u.raw)}
                            onRemove={() => {
                              if (u.kind === "login") setConfirmRemoveLogin(u.raw);
                              else setConfirmRemoveManual(u.raw);
                            }}
                            resetting={u.kind === "login" && resetting === u.raw.id}
                          />
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="rounded-full bg-accent px-2 py-0.5 font-medium text-foreground">
                            {roleLabel(u.role)}
                          </span>
                          {u.kind === "login" ? (
                            <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300">
                              <ShieldCheck className="h-3 w-3" /> Login
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <IdCard className="h-3 w-3" /> Manual
                            </Badge>
                          )}
                          <span>· {outlet?.name ?? "Semua outlet"}</span>
                          {u.phone && <span className="inline-flex items-center gap-1">· <Phone className="h-3 w-3" /> {u.phone}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
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
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{roleLabel(inv.role)}</span>
                          <span>·</span>
                          {invExpiryBadge(inv)}
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
                        onClick={() => setConfirmRevokeInv(inv)}
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

      {/* Set password dialog */}
      <Dialog
        open={!!pwDialog}
        onOpenChange={(o) => {
          if (!o) {
            setPwDialog(null);
            setPwValue("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ubah kata sandi · {pwDialog?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label className="text-xs">Kata sandi baru</Label>
            <div className="flex gap-2">
              <Input
                type="text"
                value={pwValue}
                onChange={(e) => setPwValue(e.target.value)}
                placeholder="Min. 6 karakter"
                maxLength={72}
                autoFocus
              />
              <Button type="button" variant="outline" size="sm" onClick={() => setPwValue(genPassword(10))}>
                Generate
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Kata sandi akan otomatis disalin ke clipboard setelah disimpan.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPwDialog(null)}>
              Batal
            </Button>
            <Button onClick={setMemberPassword} disabled={pwSaving || pwValue.length < 6}>
              {pwSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Simpan sandi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset link result dialog */}
      <Dialog open={!!resetLink} onOpenChange={(o) => !o && setResetLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tautan reset · {resetLink?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Bagikan tautan ini ke pegawai. Tautan berlaku terbatas waktu.
            </p>
            <div className="flex gap-2">
              <Input value={resetLink?.link ?? ""} readOnly className="text-xs font-mono" />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={async () => {
                  if (resetLink) {
                    await navigator.clipboard.writeText(resetLink.link);
                    toast.success("Tersalin");
                  }
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setResetLink(null)}>Selesai</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm: remove login member */}
      <AlertDialog open={!!confirmRemoveLogin} onOpenChange={(o) => !o && setConfirmRemoveLogin(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keluarkan pegawai dari toko?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmRemoveLogin?.profile?.display_name ?? "Pegawai ini"}</strong> akan kehilangan akses ke POS. Akun loginnya tetap ada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmRemoveLogin) doRemoveMember(confirmRemoveLogin);
                setConfirmRemoveLogin(null);
              }}
            >
              Ya, keluarkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm: remove manual */}
      <AlertDialog open={!!confirmRemoveManual} onOpenChange={(o) => !o && setConfirmRemoveManual(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pegawai?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmRemoveManual?.name}</strong> akan dihapus permanen beserta semua jadwal yang terkait.
              Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmRemoveManual) doRemoveManual(confirmRemoveManual.id);
                setConfirmRemoveManual(null);
              }}
            >
              Ya, hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm: revoke invitation */}
      <AlertDialog open={!!confirmRevokeInv} onOpenChange={(o) => !o && setConfirmRevokeInv(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan undangan?</AlertDialogTitle>
            <AlertDialogDescription>
              Undangan untuk <strong>{confirmRevokeInv?.email}</strong> akan dibatalkan dan tautan jadi tidak berlaku.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmRevokeInv) doRevokeInvitation(confirmRevokeInv.id);
                setConfirmRevokeInv(null);
              }}
            >
              Ya, batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm: close credentials dialog without saving */}
      <AlertDialog open={confirmCloseCreds} onOpenChange={setConfirmCloseCreds}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" /> Sudah salin kredensial?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Kata sandi tidak akan ditampilkan lagi setelah dialog ini ditutup. Pastikan kamu sudah menyalin
              dan membagikannya ke pegawai.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Lihat lagi</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmCloseCreds(false);
                setManualOpen(false);
                resetManualForm();
              }}
            >
              Sudah, tutup
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RowActions({
  row,
  onEdit,
  onChangePw,
  onResetPw,
  onRemove,
  resetting,
}: {
  row: UnifiedRow;
  onEdit: () => void;
  onChangePw: () => void;
  onResetPw: () => void;
  onRemove: () => void;
  resetting: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
          <span className="sr-only">Aksi</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Aksi pegawai</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {row.kind === "manual" && (
          <DropdownMenuItem onClick={onEdit}>
            <Pencil className="mr-2 h-3.5 w-3.5" /> Edit info
          </DropdownMenuItem>
        )}
        {row.kind === "login" && (
          <>
            <DropdownMenuItem onClick={onChangePw}>
              <KeyRound className="mr-2 h-3.5 w-3.5" /> Ubah kata sandi
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onResetPw} disabled={resetting}>
              <RotateCcw className="mr-2 h-3.5 w-3.5" /> Kirim tautan reset
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onRemove} className="text-destructive focus:text-destructive">
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          {row.kind === "login" ? "Keluarkan dari toko" : "Hapus pegawai"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
