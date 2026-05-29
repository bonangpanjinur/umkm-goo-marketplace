import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Video, Plus, Trash2, Pencil, Loader2, Calendar, Clock, User, Phone,
  CheckCircle2, XCircle, Link2, Copy, MessageSquare,
} from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/telemedicine")({
  head: () => ({ meta: [{ title: "Telemedicine / Konsultasi Video — Merchant" }] }),
  component: TelemedicinePage,
});

type ConsultSlot = {
  id: string;
  doctor_name: string;
  specialty: string | null;
  slot_date: string;
  slot_time: string;
  duration_minutes: number;
  price: number;
  platform: string;
  meeting_link: string | null;
  max_patients: number;
  booked_count: number;
  is_active: boolean;
  notes: string | null;
};
type ConsultSession = {
  id: string;
  slot_id: string;
  patient_name: string;
  patient_phone: string | null;
  patient_email: string | null;
  status: string;
  complaint: string | null;
  meeting_link: string | null;
  created_at: string;
  slot?: { slot_date: string; slot_time: string; doctor_name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu", confirmed: "Dikonfirmasi", ongoing: "Berlangsung", completed: "Selesai", cancelled: "Dibatalkan",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700", confirmed: "bg-blue-100 text-blue-700",
  ongoing: "bg-green-100 text-green-700", completed: "bg-gray-100 text-gray-600", cancelled: "bg-red-100 text-red-700",
};
const PLATFORMS = ["Google Meet", "Zoom", "Jitsi Meet", "WhatsApp Video", "Lainnya"];

function defaultSlotForm() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return {
    doctor_name: "", specialty: "", slot_date: d.toISOString().slice(0, 10),
    slot_time: "09:00", duration_minutes: 30, price: 0,
    platform: "Google Meet", meeting_link: "", max_patients: 1, notes: "", is_active: true,
  };
}

export default function TelemedicinePage() {
  const { shop } = useCurrentShop();
  const [slots, setSlots] = useState<ConsultSlot[]>([]);
  const [sessions, setSessions] = useState<ConsultSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("slots");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<ConsultSlot | null>(null);
  const [form, setForm] = useState(defaultSlotForm());
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");

  const load = useCallback(async () => {
    if (!shop) return;
    setLoading(true);
    const [{ data: sl }, { data: se }] = await Promise.all([
      (supabase as any).from("consultation_slots").select("*").eq("shop_id", shop.id).order("slot_date").order("slot_time"),
      (supabase as any).from("consultation_sessions").select("*, slot:consultation_slots(slot_date, slot_time, doctor_name)").eq("shop_id", shop.id).order("created_at", { ascending: false }),
    ]);
    setSlots((sl ?? []) as ConsultSlot[]);
    setSessions((se ?? []) as ConsultSession[]);
    setLoading(false);
  }, [shop]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(defaultSlotForm()); setShowDialog(true); };
  const openEdit = (s: ConsultSlot) => {
    setEditing(s);
    setForm({
      doctor_name: s.doctor_name, specialty: s.specialty ?? "", slot_date: s.slot_date,
      slot_time: s.slot_time, duration_minutes: s.duration_minutes, price: s.price,
      platform: s.platform, meeting_link: s.meeting_link ?? "", max_patients: s.max_patients,
      notes: s.notes ?? "", is_active: s.is_active,
    });
    setShowDialog(true);
  };

  const save = async () => {
    if (!shop || !form.doctor_name || !form.slot_date) { toast.error("Nama dokter dan tanggal slot wajib diisi"); return; }
    setSaving(true);
    const payload: any = {
      shop_id: shop.id, doctor_name: form.doctor_name.trim(),
      specialty: form.specialty.trim() || null, slot_date: form.slot_date,
      slot_time: form.slot_time, duration_minutes: Number(form.duration_minutes),
      price: Number(form.price), platform: form.platform,
      meeting_link: form.meeting_link.trim() || null, max_patients: Number(form.max_patients),
      notes: form.notes.trim() || null, is_active: form.is_active,
    };
    const { error } = editing
      ? await (supabase as any).from("consultation_slots").update(payload).eq("id", editing.id)
      : await (supabase as any).from("consultation_slots").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Slot diperbarui" : "Slot konsultasi dibuat");
    setShowDialog(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus slot ini?")) return;
    await (supabase as any).from("consultation_slots").delete().eq("id", id);
    load();
  };

  const updateSession = async (id: string, patch: object) => {
    const { error } = await (supabase as any).from("consultation_sessions").update(patch).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Status diperbarui"); load(); }
  };

  const copyLink = (link: string) => { navigator.clipboard.writeText(link); toast.success("Link disalin"); };

  const filteredSessions = filterStatus === "all" ? sessions : sessions.filter(s => s.status === filterStatus);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Video className="h-6 w-6" /> Telemedicine / Konsultasi Video</h1>
          <p className="mt-1 text-sm text-muted-foreground">Kelola slot konsultasi dan sesi video dengan pasien secara online.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Buat Slot</Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="slots">Slot Konsultasi ({slots.length})</TabsTrigger>
          <TabsTrigger value="sessions">Sesi Pasien ({sessions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="slots">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : slots.length === 0 ? (
            <Card className="flex flex-col items-center py-16 text-center gap-3">
              <Video className="h-10 w-10 text-muted-foreground/40" />
              <p className="font-semibold">Belum ada slot konsultasi</p>
              <p className="text-sm text-muted-foreground">Buat slot pertama untuk mulai menerima pasien online.</p>
              <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Buat Slot</Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {slots.map(s => (
                <Card key={s.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold">{s.doctor_name}</span>
                        {s.specialty && <Badge variant="outline" className="text-[11px]">{s.specialty}</Badge>}
                        <Badge className={s.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"} variant="outline">
                          {s.is_active ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{new Date(s.slot_date).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{s.slot_time} ({s.duration_minutes} menit)</span>
                        <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" />{s.booked_count}/{s.max_patients} pasien</span>
                        <span className="font-semibold text-foreground">{s.price > 0 ? formatIDR(s.price) : "Gratis"}</span>
                        <Badge variant="outline" className="text-[11px]">{s.platform}</Badge>
                      </div>
                      {s.meeting_link && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-blue-600">
                          <Link2 className="h-3 w-3" />
                          <span className="truncate max-w-xs">{s.meeting_link}</span>
                          <button onClick={() => copyLink(s.meeting_link!)} className="ml-1 hover:text-blue-800"><Copy className="h-3 w-3" /></button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sessions">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {["all", "pending", "confirmed", "ongoing", "completed", "cancelled"].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {s === "all" ? "Semua" : STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          {filteredSessions.length === 0 ? (
            <Card className="flex flex-col items-center py-14 text-center gap-3">
              <User className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Belum ada sesi pasien</p>
            </Card>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="min-w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>{["Pasien", "Slot", "Dokter", "Status", "Keluhan", "Aksi"].map(h => (<th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>))}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredSessions.map(s => (
                    <tr key={s.id} className="hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <div className="font-medium">{s.patient_name}</div>
                        {s.patient_phone && <div className="text-xs text-muted-foreground">{s.patient_phone}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {s.slot ? `${new Date(s.slot.slot_date).toLocaleDateString("id-ID")} ${s.slot.slot_time}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-xs">{s.slot?.doctor_name ?? "-"}</td>
                      <td className="px-4 py-3">
                        <Badge className={`text-[11px] ${STATUS_COLOR[s.status] ?? ""}`} variant="outline">{STATUS_LABEL[s.status] ?? s.status}</Badge>
                      </td>
                      <td className="px-4 py-3 text-xs max-w-[200px]"><p className="line-clamp-2">{s.complaint ?? "-"}</p></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {s.status === "pending" && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-green-700" onClick={() => updateSession(s.id, { status: "confirmed" })}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Konfirmasi
                            </Button>
                          )}
                          {s.status === "confirmed" && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-blue-700" onClick={() => updateSession(s.id, { status: "ongoing" })}>
                              <Video className="h-3.5 w-3.5 mr-1" /> Mulai
                            </Button>
                          )}
                          {s.status === "ongoing" && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-gray-700" onClick={() => updateSession(s.id, { status: "completed" })}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Selesai
                            </Button>
                          )}
                          {["pending", "confirmed"].includes(s.status) && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-red-500" onClick={() => updateSession(s.id, { status: "cancelled" })}>
                              <XCircle className="h-3.5 w-3.5 mr-1" /> Batal
                            </Button>
                          )}
                          {s.patient_phone && (
                            <a href={`https://wa.me/${s.patient_phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">
                              <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600">
                                <MessageSquare className="h-3.5 w-3.5 mr-1" /> WA
                              </Button>
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Slot" : "Buat Slot Konsultasi"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Nama Dokter / Konsultan</Label>
                <Input className="mt-1" value={form.doctor_name} onChange={e => setForm(f => ({ ...f, doctor_name: e.target.value }))} placeholder="Dr. Budi Santoso" />
              </div>
              <div>
                <Label>Spesialisasi (opsional)</Label>
                <Input className="mt-1" value={form.specialty} onChange={e => setForm(f => ({ ...f, specialty: e.target.value }))} placeholder="Umum, Gigi, Kulit..." />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Tanggal</Label>
                <Input className="mt-1" type="date" value={form.slot_date} onChange={e => setForm(f => ({ ...f, slot_date: e.target.value }))} />
              </div>
              <div>
                <Label>Jam Mulai</Label>
                <Input className="mt-1" type="time" value={form.slot_time} onChange={e => setForm(f => ({ ...f, slot_time: e.target.value }))} />
              </div>
              <div>
                <Label>Durasi (menit)</Label>
                <Input className="mt-1" type="number" min={10} value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Biaya Konsultasi (Rp)</Label>
                <Input className="mt-1" type="number" min={0} value={form.price || ""} onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} placeholder="0 = Gratis" />
              </div>
              <div>
                <Label>Maks. Pasien / Slot</Label>
                <Input className="mt-1" type="number" min={1} value={form.max_patients} onChange={e => setForm(f => ({ ...f, max_patients: Number(e.target.value) }))} />
              </div>
            </div>
            <div>
              <Label>Platform Video</Label>
              <Select value={form.platform} onValueChange={v => setForm(f => ({ ...f, platform: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{PLATFORMS.map(p => (<SelectItem key={p} value={p}>{p}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link Meeting (opsional)</Label>
              <Input className="mt-1" value={form.meeting_link} onChange={e => setForm(f => ({ ...f, meeting_link: e.target.value }))} placeholder="https://meet.google.com/..." />
            </div>
            <div>
              <Label>Catatan (opsional)</Label>
              <Textarea className="mt-1" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="slot-active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
              <label htmlFor="slot-active" className="text-sm cursor-pointer">Slot aktif (bisa dipesan pasien)</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editing ? "Simpan" : "Buat Slot"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
