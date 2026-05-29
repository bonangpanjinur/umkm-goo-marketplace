import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Plus, Pencil, Trash2, Loader2, RefreshCw, Shield, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/admin/multi-admin")({
  head: () => ({ meta: [{ title: "Multi-Admin — Admin" }] }),
  component: MultiAdminPage,
});

type AdminUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: "super_admin" | "finance_admin" | "support_admin" | "content_admin";
  is_active: boolean;
  last_login: string | null;
  created_at: string;
};

const ROLES = [
  { value: "super_admin",   label: "Super Admin",    desc: "Akses penuh ke semua fitur",                          color: "bg-red-100 text-red-700" },
  { value: "finance_admin", label: "Finance Admin",  desc: "Akses ke keuangan, payout, laporan pajak",            color: "bg-blue-100 text-blue-700" },
  { value: "support_admin", label: "Support Admin",  desc: "Akses ke sengketa, users, moderasi konten",           color: "bg-green-100 text-green-700" },
  { value: "content_admin", label: "Content Admin",  desc: "Akses ke banner, iklan, kategori, moderasi produk",   color: "bg-purple-100 text-purple-700" },
];

const PERMISSIONS: Record<string, string[]> = {
  super_admin:   ["Dashboard", "Analytics", "KYC", "Toko", "Tagihan", "Penarikan", "Sengketa", "Paket", "Komisi", "Payment", "Broadcast", "Audit", "Users", "Laporan", "Pajak", "Fraud", "Payout Scheduler", "Onboarding"],
  finance_admin: ["Dashboard", "Tagihan", "Penarikan", "Laporan", "Pajak", "Payout Scheduler"],
  support_admin: ["Dashboard", "Sengketa", "Users", "KYC", "Moderasi"],
  content_admin: ["Dashboard", "Banner", "Iklan", "Kategori", "Moderasi"],
};

function fmtDate(d: string) { return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }); }

export default function MultiAdminPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ email: "", full_name: "", role: "support_admin" as AdminUser["role"], is_active: true });

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("admin_users").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setAdmins((data ?? []) as AdminUser[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ email: "", full_name: "", role: "support_admin", is_active: true }); setOpen(true); };
  const openEdit = (a: AdminUser) => { setEditing(a); setForm({ email: a.email, full_name: a.full_name ?? "", role: a.role, is_active: a.is_active }); setOpen(true); };

  const save = async () => {
    if (!form.email.trim()) { toast.error("Email wajib diisi"); return; }
    setSaving(true);
    try {
      if (editing) { await (supabase as any).from("admin_users").update({ full_name: form.full_name || null, role: form.role, is_active: form.is_active }).eq("id", editing.id); }
      else { await (supabase as any).from("admin_users").insert({ email: form.email, full_name: form.full_name || null, role: form.role, is_active: form.is_active }); }
      toast.success(editing ? "Admin diperbarui" : "Admin baru ditambahkan");
      setOpen(false);
      load();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Gagal"); }
    finally { setSaving(false); }
  };

  const del = async (id: string) => {
    await (supabase as any).from("admin_users").delete().eq("id", id);
    setAdmins(prev => prev.filter(x => x.id !== id));
    toast.success("Admin dihapus");
  };

  const toggleActive = async (a: AdminUser) => {
    await (supabase as any).from("admin_users").update({ is_active: !a.is_active }).eq("id", a.id);
    setAdmins(prev => prev.map(x => x.id === a.id ? { ...x, is_active: !a.is_active } : x));
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><Users className="h-5 w-5 text-primary" /> Multi-Admin & Role Management</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Kelola admin dengan peran berbeda — Finance, Support, Content Admin.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-3.5 w-3.5" /></Button>
          <Button onClick={openNew} className="gap-1.5"><Plus className="h-4 w-4" /> Tambah Admin</Button>
        </div>
      </div>

      {/* Role descriptions */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {ROLES.map(r => (
          <div key={r.value} className={`rounded-xl border p-3 ${r.color.replace("text-", "border-").replace("bg-", "bg-").split(" ")[0]} bg-opacity-30`}>
            <p className={`text-xs font-bold ${r.color.split(" ")[1]}`}>{r.label}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
            <p className="text-xs text-muted-foreground mt-1.5 font-medium">{admins.filter(a => a.role === r.value).length} admin</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : admins.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          <Users className="mx-auto h-8 w-8 opacity-30 mb-2" />
          <p className="text-sm">Belum ada admin tambahan. Tambah admin pertama.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Nama / Email","Role","Hak Akses","Last Login","Status",""].map(h => (
                  <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {admins.map(a => {
                const roleInfo = ROLES.find(r => r.value === a.role);
                const perms = PERMISSIONS[a.role] ?? [];
                return (
                  <tr key={a.id} className={`hover:bg-muted/20 ${!a.is_active ? "opacity-50" : ""}`}>
                    <td className="px-3 py-2.5">
                      <p className="font-medium">{a.full_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{a.email}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge className={`text-xs ${roleInfo?.color ?? "bg-gray-100 text-gray-600"}`}>{roleInfo?.label ?? a.role}</Badge>
                    </td>
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <p className="text-xs text-muted-foreground truncate">{perms.slice(0, 4).join(", ")}{perms.length > 4 && ` +${perms.length - 4}`}</p>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-muted-foreground">{a.last_login ? fmtDate(a.last_login) : "Belum pernah"}</td>
                    <td className="px-3 py-2.5"><Switch checked={a.is_active} onCheckedChange={() => toggleActive(a)} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => del(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing ? "Edit Admin" : "Tambah Admin Baru"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {!editing && (
              <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            )}
            <div className="space-y-1.5"><Label>Nama Lengkap</Label><Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as AdminUser["role"] }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}><span className="font-medium">{r.label}</span> <span className="text-muted-foreground text-xs ml-1">— {r.desc}</span></SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-muted/30 border p-3 text-xs">
              <p className="font-semibold mb-1.5">Hak akses untuk {ROLES.find(r => r.value === form.role)?.label}:</p>
              <div className="flex flex-wrap gap-1">
                {(PERMISSIONS[form.role] ?? []).map(p => <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>)}
              </div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} /><Label>Akun aktif</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button disabled={saving} onClick={save}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
              {editing ? "Simpan" : "Tambah Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
