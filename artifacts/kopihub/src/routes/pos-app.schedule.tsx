import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Loader2,
  Plus,
  Trash2,
  CalendarDays,
  UserPlus,
  History,
  Wand2,
  AlertCircle,
  ArrowRight,
  PencilLine,
  PlusCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/schedule")({
  component: SchedulePage,
});

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const DAYS_LONG = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

type Shift = {
  id: string;
  user_id: string;
  outlet_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  note: string | null;
};
type Member = {
  user_id: string;
  role: string;
  display_name: string | null;
  avatar_url: string | null;
  source: "account" | "manual";
  manual_id?: string;
};
type Outlet = { id: string; name: string };

type AuditEntry = {
  id: string;
  action: string;
  actor_id: string | null;
  target_user_id: string | null;
  meta: any;
  created_at: string;
};

const PRESETS: { key: string; label: string; start: string; end: string }[] = [
  { key: "morning", label: "Pagi (07:00–15:00)", start: "07:00", end: "15:00" },
  { key: "mid", label: "Siang (11:00–19:00)", start: "11:00", end: "19:00" },
  { key: "evening", label: "Malam (15:00–23:00)", start: "15:00", end: "23:00" },
  { key: "custom", label: "Custom", start: "08:00", end: "16:00" },
];

function hhmm(t: string) {
  return t.slice(0, 5);
}

function fmtRel(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru saja";
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  return `${d} hari lalu`;
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart < bEnd && aEnd > bStart;
}

function SchedulePage() {
  const { shop, loading: shopLoading } = useCurrentShop();

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit/create single shift
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Shift | null>(null);
  const [userId, setUserId] = useState("");
  const [outletId, setOutletId] = useState("");
  const [day, setDay] = useState("1");
  const [startT, setStartT] = useState("08:00");
  const [endT, setEndT] = useState("16:00");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [overlapWarn, setOverlapWarn] = useState<string | null>(null);

  // Add manual staff
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("cashier");
  const [newOutletId, setNewOutletId] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [adding, setAdding] = useState(false);

  // Audit sheet
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditEntries, setAuditEntries] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [actorMap, setActorMap] = useState<Record<string, string>>({});

  // Template generator
  const [tmplOpen, setTmplOpen] = useState(false);
  const [tmplStep, setTmplStep] = useState<1 | 2>(1);
  const [tmplPreset, setTmplPreset] = useState("morning");
  const [tmplStart, setTmplStart] = useState("07:00");
  const [tmplEnd, setTmplEnd] = useState("15:00");
  const [tmplDays, setTmplDays] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));
  const [tmplOutletId, setTmplOutletId] = useState("");
  const [tmplRoleFilter, setTmplRoleFilter] = useState<string>("all");
  const [tmplSelectedMembers, setTmplSelectedMembers] = useState<Set<string>>(new Set());
  const [tmplRows, setTmplRows] = useState<TmplRow[]>([]);
  const [tmplSaving, setTmplSaving] = useState(false);

  type TmplRow = {
    key: string;
    user_id: string;
    name: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
    outlet_id: string;
    skip: boolean;
    conflict: string | null;
  };

  async function addStaff() {
    if (!shop || !newName.trim()) return;
    setAdding(true);
    const { error } = await supabase.from("staff_members").insert({
      shop_id: shop.id,
      outlet_id: newOutletId || null,
      name: newName.trim(),
      role: newRole as "manager" | "cashier" | "barista",
      phone: newPhone.trim() || null,
    });
    setAdding(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pegawai ditambahkan");
    setNewName("");
    setNewPhone("");
    setAddOpen(false);
    load();
  }

  async function removeManualStaff(manualId: string, name: string) {
    if (!confirm(`Hapus pegawai "${name}"? Semua jadwalnya juga akan dihapus.`)) return;
    await supabase.from("shifts").delete().eq("user_id", manualId);
    const { error } = await supabase.from("staff_members").delete().eq("id", manualId);
    if (error) toast.error(error.message);
    else {
      toast.success("Pegawai dihapus");
      load();
    }
  }

  async function load() {
    if (!shop) return;
    setLoading(true);
    const [s, r, o, sm] = await Promise.all([
      supabase.from("shifts").select("*").eq("shop_id", shop.id).order("day_of_week"),
      supabase.from("user_roles").select("user_id, role, is_active").eq("shop_id", shop.id),
      supabase.from("outlets").select("id, name").eq("shop_id", shop.id),
      supabase.from("staff_members").select("id, name, role, avatar_url, is_active").eq("shop_id", shop.id).order("created_at"),
    ]);
    const roles = ((r.data ?? []) as { user_id: string; role: string; is_active: boolean | null }[]).filter(
      (x) => x.is_active !== false,
    );
    const ids = [...new Set(roles.map((x) => x.user_id))];
    let mems: Member[] = [];
    if (ids.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url")
        .in("id", ids);
      const byId = new Map((profs ?? []).map((p) => [p.id, p]));
      mems = roles.map((rr) => ({
        user_id: rr.user_id,
        role: rr.role,
        display_name: byId.get(rr.user_id)?.display_name ?? null,
        avatar_url: byId.get(rr.user_id)?.avatar_url ?? null,
        source: "account" as const,
      }));
    }
    const manualMems: Member[] = ((sm.data ?? []) as Array<{ id: string; name: string; role: string; avatar_url: string | null; is_active: boolean | null }>)
      .filter((m) => m.is_active !== false)
      .map((m) => ({
        user_id: m.id,
        manual_id: m.id,
        role: m.role,
        display_name: m.name,
        avatar_url: m.avatar_url,
        source: "manual" as const,
      }));
    setShifts((s.data ?? []) as Shift[]);
    setMembers([...mems, ...manualMems]);
    setOutlets((o.data ?? []) as Outlet[]);
    if (!outletId && o.data && o.data.length > 0) setOutletId(o.data[0].id);
    if (!newOutletId && o.data && o.data.length > 0) setNewOutletId(o.data[0].id);
    if (!tmplOutletId && o.data && o.data.length > 0) setTmplOutletId(o.data[0].id);
    setLoading(false);
  }

  useEffect(() => {
    if (shop) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id]);

  useEffect(() => {
    if (!shop) return;
    const channel = supabase
      .channel(`schedule-sync-${shop.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_members", filter: `shop_id=eq.${shop.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "shifts", filter: `shop_id=eq.${shop.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "user_roles", filter: `shop_id=eq.${shop.id}` }, () => load())
      .subscribe();
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener("focus", onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id]);

  // Helpers
  function findOverlap(uid: string, dow: number, start: string, end: string, exceptId?: string) {
    return shifts.find(
      (s) =>
        s.user_id === uid &&
        s.day_of_week === dow &&
        s.id !== exceptId &&
        rangesOverlap(start, end, hhmm(s.start_time), hhmm(s.end_time)),
    );
  }

  function memberName(uid: string | null) {
    if (!uid) return "—";
    return members.find((m) => m.user_id === uid)?.display_name ?? actorMap[uid] ?? "Pegawai";
  }

  // Live overlap warning while editing
  useEffect(() => {
    if (!open || !userId) {
      setOverlapWarn(null);
      return;
    }
    if (endT <= startT) {
      setOverlapWarn("Jam selesai harus setelah jam mulai.");
      return;
    }
    const c = findOverlap(userId, Number(day), startT, endT, editing?.id);
    if (c) {
      setOverlapWarn(`Bentrok dengan shift ${hhmm(c.start_time)}–${hhmm(c.end_time)}.`);
    } else {
      setOverlapWarn(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId, day, startT, endT, shifts, editing?.id]);

  function openNew(uid: string, dow: number) {
    setEditing(null);
    setUserId(uid);
    setDay(String(dow));
    setOutletId(outlets[0]?.id ?? "");
    setStartT("08:00");
    setEndT("16:00");
    setNote("");
    setOpen(true);
  }

  function openEdit(sh: Shift) {
    setEditing(sh);
    setUserId(sh.user_id);
    setOutletId(sh.outlet_id);
    setDay(String(sh.day_of_week));
    setStartT(hhmm(sh.start_time));
    setEndT(hhmm(sh.end_time));
    setNote(sh.note ?? "");
    setOpen(true);
  }

  function friendlyShiftError(msg: string): string {
    if (msg.includes("shift_overlap")) {
      const m = msg.match(/shift_overlap:\s*(.+)/);
      return m ? `Tidak bisa simpan: ${m[1]}` : "Bentrok dengan shift lain.";
    }
    if (msg.includes("shift_invalid_range")) return "Jam selesai harus setelah jam mulai.";
    return msg;
  }

  async function save() {
    if (!shop || !userId || !outletId) return;
    if (overlapWarn) {
      toast.error(overlapWarn);
      return;
    }
    setSaving(true);
    const payload = {
      shop_id: shop.id,
      user_id: userId,
      outlet_id: outletId,
      day_of_week: Number(day),
      start_time: startT,
      end_time: endT,
      note: note.trim() || null,
    };
    if (editing) {
      const { error } = await supabase.from("shifts").update(payload).eq("id", editing.id);
      if (error) {
        toast.error(friendlyShiftError(error.message));
        setSaving(false);
        return;
      }
      toast.success("Jadwal diperbarui");
    } else {
      const { error } = await supabase.from("shifts").insert(payload);
      if (error) {
        toast.error(friendlyShiftError(error.message));
        setSaving(false);
        return;
      }
      toast.success("Jadwal ditambahkan");
    }
    setSaving(false);
    setOpen(false);
    load();
  }

  async function remove(sh: Shift) {
    const { error } = await supabase.from("shifts").delete().eq("id", sh.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Dihapus");
      load();
    }
  }

  // ---- Audit sheet ----
  async function openAudit() {
    setAuditOpen(true);
    if (!shop) return;
    setAuditLoading(true);
    const { data, error } = await supabase
      .from("staff_audit_logs")
      .select("id, action, actor_id, target_user_id, meta, created_at")
      .eq("shop_id", shop.id)
      .like("action", "shift_%")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) {
      toast.error(error.message);
      setAuditLoading(false);
      return;
    }
    const entries = (data ?? []) as AuditEntry[];
    const actorIds = [...new Set(entries.map((e) => e.actor_id).filter(Boolean) as string[])];
    if (actorIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name")
        .in("id", actorIds);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p) => {
        map[p.id] = p.display_name ?? "Pengguna";
      });
      setActorMap(map);
    }
    setAuditEntries(entries);
    setAuditLoading(false);
  }

  // ---- Template generator ----
  function openTemplate() {
    setTmplStep(1);
    setTmplPreset("morning");
    setTmplStart("07:00");
    setTmplEnd("15:00");
    setTmplDays(new Set([1, 2, 3, 4, 5]));
    setTmplOutletId(outlets[0]?.id ?? "");
    setTmplRoleFilter("all");
    setTmplSelectedMembers(new Set());
    setTmplRows([]);
    setTmplOpen(true);
  }

  function applyPreset(key: string) {
    setTmplPreset(key);
    const p = PRESETS.find((x) => x.key === key);
    if (p && key !== "custom") {
      setTmplStart(p.start);
      setTmplEnd(p.end);
    }
  }

  const tmplCandidates = useMemo(
    () => members.filter((m) => tmplRoleFilter === "all" || m.role === tmplRoleFilter),
    [members, tmplRoleFilter],
  );

  function toTmplStep2() {
    if (tmplDays.size === 0) {
      toast.error("Pilih minimal 1 hari.");
      return;
    }
    if (tmplEnd <= tmplStart) {
      toast.error("Jam selesai harus setelah jam mulai.");
      return;
    }
    if (!tmplOutletId) {
      toast.error("Pilih outlet.");
      return;
    }
    const selected = tmplCandidates.filter((m) => tmplSelectedMembers.has(m.user_id));
    if (selected.length === 0) {
      toast.error("Pilih minimal 1 pegawai.");
      return;
    }
    const rows: TmplRow[] = [];
    selected.forEach((m) => {
      [...tmplDays].sort().forEach((dow) => {
        const conflict = findOverlap(m.user_id, dow, tmplStart, tmplEnd);
        rows.push({
          key: `${m.user_id}-${dow}`,
          user_id: m.user_id,
          name: m.display_name ?? "—",
          day_of_week: dow,
          start_time: tmplStart,
          end_time: tmplEnd,
          outlet_id: tmplOutletId,
          skip: !!conflict,
          conflict: conflict ? `Bentrok ${hhmm(conflict.start_time)}–${hhmm(conflict.end_time)}` : null,
        });
      });
    });
    setTmplRows(rows);
    setTmplStep(2);
  }

  function updateTmplRow(idx: number, patch: Partial<TmplRow>) {
    setTmplRows((rows) => {
      const next = [...rows];
      const r = { ...next[idx], ...patch };
      // Recompute conflict if times changed
      if (patch.start_time !== undefined || patch.end_time !== undefined) {
        const c = findOverlap(r.user_id, r.day_of_week, r.start_time, r.end_time);
        r.conflict = c ? `Bentrok ${hhmm(c.start_time)}–${hhmm(c.end_time)}` : null;
      }
      next[idx] = r;
      return next;
    });
  }

  async function saveTemplate() {
    if (!shop) return;
    const toInsert = tmplRows.filter((r) => !r.skip);
    if (toInsert.length === 0) {
      toast.error("Tidak ada baris untuk disimpan.");
      return;
    }
    setTmplSaving(true);
    let ok = 0;
    let fail = 0;
    for (const r of toInsert) {
      const { error } = await supabase.from("shifts").insert({
        shop_id: shop.id,
        user_id: r.user_id,
        outlet_id: r.outlet_id,
        day_of_week: r.day_of_week,
        start_time: r.start_time,
        end_time: r.end_time,
      });
      if (error) fail++;
      else ok++;
    }
    setTmplSaving(false);
    if (ok > 0) toast.success(`${ok} jadwal dibuat${fail > 0 ? `, ${fail} dilewati (bentrok)` : ""}`);
    else toast.error(`Semua ${fail} baris ditolak (bentrok / invalid)`);
    setTmplOpen(false);
    load();
  }

  const shiftsByCell = useMemo(() => {
    const map = new Map<string, Shift[]>();
    shifts.forEach((s) => {
      const k = `${s.user_id}-${s.day_of_week}`;
      map.set(k, [...(map.get(k) ?? []), s]);
    });
    return map;
  }, [shifts]);

  if (shopLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jadwal kerja</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Atur shift mingguan untuk setiap pegawai.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openAudit}>
            <History className="mr-2 h-4 w-4" /> Riwayat
          </Button>
          <Button variant="outline" onClick={openTemplate} disabled={members.length === 0 || outlets.length === 0}>
            <Wand2 className="mr-2 h-4 w-4" /> Buat dari template
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Tambah pegawai
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
            <CalendarDays className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold">Belum ada pegawai</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Tambahkan pegawai untuk mulai membuat jadwal shift.
          </p>
          <Button className="mt-4" onClick={() => setAddOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" /> Tambah pegawai
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2.5 text-left">Pegawai</th>
                {DAYS.map((d) => (
                  <th key={d} className="px-2 py-2.5 text-center w-32">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {members.map((m) => (
                <tr key={m.user_id}>
                  <td className="px-3 py-2 align-top">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-semibold uppercase">
                        {m.avatar_url ? (
                          <img src={m.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                          (m.display_name ?? "?").charAt(0)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">{m.display_name ?? "—"}</span>
                          {m.source === "manual" && (
                            <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">manual</span>
                          )}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                          {m.role}
                        </div>
                      </div>
                      {m.source === "manual" && m.manual_id && (
                        <button
                          onClick={() => removeManualStaff(m.manual_id!, m.display_name ?? "")}
                          className="text-muted-foreground hover:text-destructive"
                          title="Hapus pegawai"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                  {DAYS.map((_, dow) => {
                    const cell = shiftsByCell.get(`${m.user_id}-${dow}`) ?? [];
                    return (
                      <td key={dow} className="px-1 py-2 align-top">
                        <div className="space-y-1">
                          {cell.map((sh) => (
                            <button
                              key={sh.id}
                              onClick={() => openEdit(sh)}
                              className="block w-full rounded-md bg-primary/10 px-2 py-1 text-left text-xs font-medium text-primary hover:bg-primary/20"
                            >
                              {hhmm(sh.start_time)}–{hhmm(sh.end_time)}
                            </button>
                          ))}
                          <button
                            onClick={() => openNew(m.user_id, dow)}
                            className="flex w-full items-center justify-center rounded-md border border-dashed border-border py-1 text-xs text-muted-foreground hover:bg-muted/50"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit/create shift dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit shift" : "Tambah shift"}</DialogTitle>
            <DialogDescription className="text-xs">
              {memberName(userId)} · {DAYS_LONG[Number(day)]}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Hari</Label>
                <Select value={day} onValueChange={setDay}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d, i) => (
                      <SelectItem key={i} value={String(i)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Outlet</Label>
                <Select value={outletId} onValueChange={setOutletId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {outlets.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Mulai</Label>
                <Input type="time" value={startT} onChange={(e) => setStartT(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Selesai</Label>
                <Input type="time" value={endT} onChange={(e) => setEndT(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Catatan (opsional)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Mis. Shift pagi" />
            </div>
            {overlapWarn && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{overlapWarn}</span>
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-between sm:justify-between">
            <div>
              {editing && (
                <Button
                  variant="ghost"
                  onClick={() => { remove(editing); setOpen(false); }}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> Hapus
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>Batal</Button>
              <Button onClick={save} disabled={saving || !!overlapWarn}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add manual staff */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Tambah pegawai</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nama pegawai *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Mis. Budi Santoso" autoFocus />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Peran</Label>
                <Select value={newRole} onValueChange={setNewRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="cashier">Kasir</SelectItem>
                    <SelectItem value="barista">Barista</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Outlet</Label>
                <Select value={newOutletId} onValueChange={setNewOutletId}>
                  <SelectTrigger><SelectValue placeholder="Pilih outlet" /></SelectTrigger>
                  <SelectContent>
                    {outlets.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>No. HP / WhatsApp (opsional)</Label>
              <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
            </div>
            <p className="text-xs text-muted-foreground">
              Pegawai ini ditambahkan tanpa akun login — hanya untuk dijadwalkan.
              Untuk akses POS, undang lewat halaman Pegawai.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>Batal</Button>
            <Button onClick={addStaff} disabled={adding || !newName.trim()}>
              {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <UserPlus className="mr-2 h-4 w-4" /> Simpan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template generator dialog */}
      <Dialog open={tmplOpen} onOpenChange={setTmplOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Buat jadwal dari template</DialogTitle>
            <DialogDescription>
              {tmplStep === 1 ? "Step 1 dari 2 — pilih jam, hari, dan pegawai." : "Step 2 dari 2 — sesuaikan, lalu simpan."}
            </DialogDescription>
          </DialogHeader>

          {tmplStep === 1 ? (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Template jam</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {PRESETS.map((p) => (
                    <button
                      key={p.key}
                      onClick={() => applyPreset(p.key)}
                      className={`rounded-md border px-2.5 py-2 text-left text-xs transition ${
                        tmplPreset === p.key ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Mulai</Label>
                  <Input type="time" value={tmplStart} onChange={(e) => { setTmplStart(e.target.value); setTmplPreset("custom"); }} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Selesai</Label>
                  <Input type="time" value={tmplEnd} onChange={(e) => { setTmplEnd(e.target.value); setTmplPreset("custom"); }} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Hari</Label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        const next = new Set(tmplDays);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        setTmplDays(next);
                      }}
                      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition ${
                        tmplDays.has(i) ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Outlet</Label>
                  <Select value={tmplOutletId} onValueChange={setTmplOutletId}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {outlets.map((o) => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Filter peran</Label>
                  <Select value={tmplRoleFilter} onValueChange={(v) => { setTmplRoleFilter(v); setTmplSelectedMembers(new Set()); }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua peran</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="cashier">Kasir</SelectItem>
                      <SelectItem value="barista">Barista</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Pegawai ({tmplSelectedMembers.size}/{tmplCandidates.length})</Label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => {
                      if (tmplSelectedMembers.size === tmplCandidates.length) {
                        setTmplSelectedMembers(new Set());
                      } else {
                        setTmplSelectedMembers(new Set(tmplCandidates.map((m) => m.user_id)));
                      }
                    }}
                  >
                    {tmplSelectedMembers.size === tmplCandidates.length ? "Kosongkan" : "Pilih semua"}
                  </button>
                </div>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {tmplCandidates.length === 0 ? (
                    <p className="py-4 text-center text-xs text-muted-foreground">Tidak ada pegawai dengan peran ini.</p>
                  ) : (
                    tmplCandidates.map((m) => (
                      <label key={m.user_id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted/50">
                        <Checkbox
                          checked={tmplSelectedMembers.has(m.user_id)}
                          onCheckedChange={(v) => {
                            const next = new Set(tmplSelectedMembers);
                            if (v) next.add(m.user_id);
                            else next.delete(m.user_id);
                            setTmplSelectedMembers(next);
                          }}
                        />
                        <span className="text-sm">{m.display_name ?? "—"}</span>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">· {m.role}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              <div className="text-xs text-muted-foreground">
                {tmplRows.filter((r) => !r.skip).length} jadwal akan dibuat ·{" "}
                {tmplRows.filter((r) => r.conflict).length} bentrok terdeteksi
              </div>
              <div className="max-h-[50vh] overflow-y-auto rounded-md border border-border">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-muted/60 text-muted-foreground">
                    <tr>
                      <th className="w-8 px-2 py-2"></th>
                      <th className="px-2 py-2 text-left">Pegawai</th>
                      <th className="px-2 py-2 text-left">Hari</th>
                      <th className="px-2 py-2 text-left">Mulai</th>
                      <th className="px-2 py-2 text-left">Selesai</th>
                      <th className="px-2 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {tmplRows.map((r, idx) => (
                      <tr key={r.key} className={r.skip ? "opacity-50" : ""}>
                        <td className="px-2 py-1.5">
                          <Checkbox
                            checked={!r.skip}
                            onCheckedChange={(v) => updateTmplRow(idx, { skip: !v })}
                          />
                        </td>
                        <td className="px-2 py-1.5 font-medium">{r.name}</td>
                        <td className="px-2 py-1.5">{DAYS[r.day_of_week]}</td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="time"
                            value={r.start_time}
                            onChange={(e) => updateTmplRow(idx, { start_time: e.target.value })}
                            className="h-7 w-24 text-xs"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            type="time"
                            value={r.end_time}
                            onChange={(e) => updateTmplRow(idx, { end_time: e.target.value })}
                            className="h-7 w-24 text-xs"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          {r.conflict ? (
                            <span className="text-destructive">{r.conflict}</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between">
            <div>
              {tmplStep === 2 && (
                <Button variant="ghost" onClick={() => setTmplStep(1)}>Kembali</Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setTmplOpen(false)}>Batal</Button>
              {tmplStep === 1 ? (
                <Button onClick={toTmplStep2}>
                  Pratinjau <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={saveTemplate} disabled={tmplSaving || tmplRows.filter((r) => !r.skip).length === 0}>
                  {tmplSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Simpan {tmplRows.filter((r) => !r.skip).length} jadwal
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit log sheet */}
      <Sheet open={auditOpen} onOpenChange={setAuditOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <History className="h-4 w-4" /> Riwayat perubahan jadwal
            </SheetTitle>
            <SheetDescription>50 perubahan terakhir di toko ini.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {auditLoading ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : auditEntries.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Belum ada perubahan tercatat.</p>
            ) : (
              auditEntries.map((e) => {
                const target = memberName(e.target_user_id);
                const actor = e.actor_id ? actorMap[e.actor_id] ?? "Pengguna" : "Sistem";
                const dow = e.meta?.day_of_week;
                const before = e.meta?.before;
                const after = e.meta?.after;
                let icon = <PencilLine className="h-3.5 w-3.5" />;
                let verb = "mengubah shift";
                let color = "bg-amber-500/15 text-amber-600 dark:text-amber-400";
                if (e.action === "shift_create") {
                  icon = <PlusCircle className="h-3.5 w-3.5" />;
                  verb = "membuat shift";
                  color = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400";
                } else if (e.action === "shift_delete") {
                  icon = <XCircle className="h-3.5 w-3.5" />;
                  verb = "menghapus shift";
                  color = "bg-destructive/15 text-destructive";
                }
                return (
                  <div key={e.id} className="rounded-lg border border-border bg-card p-3">
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${color}`}>
                        {icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm">
                          <span className="font-medium">{actor}</span>{" "}
                          <span className="text-muted-foreground">{verb} untuk</span>{" "}
                          <span className="font-medium">{target}</span>
                          {dow !== undefined && (
                            <span className="text-muted-foreground"> · {DAYS_LONG[dow]}</span>
                          )}
                        </div>
                        {e.action === "shift_update" && before && after ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {hhmm(before.start_time)}–{hhmm(before.end_time)}{" "}
                            <ArrowRight className="mx-1 inline h-3 w-3" />{" "}
                            {hhmm(after.start_time)}–{hhmm(after.end_time)}
                          </div>
                        ) : after ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {hhmm(after.start_time)}–{hhmm(after.end_time)}
                          </div>
                        ) : before ? (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {hhmm(before.start_time)}–{hhmm(before.end_time)}
                          </div>
                        ) : null}
                        <div className="mt-0.5 text-[10px] text-muted-foreground">{fmtRel(e.created_at)}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
