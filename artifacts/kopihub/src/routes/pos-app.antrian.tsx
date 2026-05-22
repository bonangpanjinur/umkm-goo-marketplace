import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Hash,
  Play,
  SkipForward,
  CheckCircle2,
  Clock,
  Users,
  Plus,
  StopCircle,
  RefreshCcw,
  Copy,
  QrCode,
  Loader2,
  ChevronRight,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/antrian")({
  head: () => ({ meta: [{ title: "Antrean Digital — Merchant" }] }),
  component: AntreanPage,
});

type QueueSession = {
  id: string;
  shop_id: string;
  session_date: string;
  is_active: boolean;
  avg_service_minutes: number;
  current_number: number;
  label: string | null;
  started_at: string;
  ended_at: string | null;
};

type QueueEntry = {
  id: string;
  session_id: string;
  queue_number: number;
  customer_name: string;
  customer_phone: string | null;
  notes: string | null;
  status: "waiting" | "serving" | "done" | "skipped";
  called_at: string | null;
  done_at: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  waiting: "Menunggu",
  serving: "Sedang Dilayani",
  done: "Selesai",
  skipped: "Dilewati",
};
const STATUS_COLOR: Record<string, string> = {
  waiting: "bg-amber-100 text-amber-800",
  serving: "bg-blue-100 text-blue-800",
  done: "bg-green-100 text-green-800",
  skipped: "bg-gray-100 text-gray-600",
};

function AntreanPage() {
  const { shop } = useCurrentShop();

  const [session, setSession] = useState<QueueSession | null>(null);
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
// Dialog: mulai sesi
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [avgMinutes, setAvgMinutes] = useState("10");
  const [sessionLabel, setSessionLabel] = useState("");

  // Dialog: tambah antrian manual
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addNotes, setAddNotes] = useState("");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function loadSession() {
    if (!shop?.id) return;
    try {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("queue_sessions")
        .select("*")
        .eq("shop_id", shop.id)
        .eq("session_date", today)
        .eq("is_active", true)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error?.code === "42P01") {
setLoading(false);
        return;
      }
setSession(data ?? null);
      if (data) {
        await loadEntries(data.id);
      } else {
        setEntries([]);
      }
    } catch {
} finally {
      setLoading(false);
    }
  }

  async function loadEntries(sessionId: string) {
    const { data } = await supabase
      .from("queue_entries")
      .select("*")
      .eq("session_id", sessionId)
      .order("queue_number", { ascending: true });
    setEntries((data as QueueEntry[]) ?? []);
  }

  useEffect(() => {
    if (shop?.id) {
      loadSession();
      intervalRef.current = setInterval(() => {
        if (session) loadEntries(session.id);
      }, 10000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [shop?.id]);

  // ── Mulai sesi baru ────────────────────────────────────────────────────────
  async function handleStartSession() {
    if (!shop?.id) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc("start_queue_session", {
        p_shop_id: shop.id,
        p_avg_service_minutes: parseInt(avgMinutes) || 10,
        p_label: sessionLabel.trim() || null,
      });
      if (error) throw error;
      setSession(data as QueueSession);
      setEntries([]);
      setShowStartDialog(false);
      toast.success("Sesi antrian dimulai");
    } catch (e: unknown) {
      toast.error("Gagal memulai sesi: " + (e as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  // ── Tutup sesi ────────────────────────────────────────────────────────────
  async function handleEndSession() {
    if (!session) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("queue_sessions")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq("id", session.id);
      if (error) throw error;
      setSession(null);
      setEntries([]);
      toast.success("Sesi antrian ditutup");
    } catch (e: unknown) {
      toast.error("Gagal menutup sesi: " + (e as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  // ── Panggil nomor berikutnya ───────────────────────────────────────────────
  async function handleCallNext() {
    if (!session) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc("call_next_queue", {
        p_session_id: session.id,
      });
      if (error) throw error;
      if (!data) {
        toast.info("Tidak ada antrian yang menunggu");
        return;
      }
      const called = data as QueueEntry;
      toast.success(`Memanggil nomor ${called.queue_number} — ${called.customer_name}`);
      await loadEntries(session.id);
      setSession((prev) =>
        prev ? { ...prev, current_number: called.queue_number } : prev
      );
    } catch (e: unknown) {
      toast.error("Gagal memanggil: " + (e as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  // ── Skip antrian ──────────────────────────────────────────────────────────
  async function handleSkip(entryId: string) {
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc("skip_queue_entry", {
        p_entry_id: entryId,
      });
      if (error) throw error;
      toast.success("Antrian dilewati");
      if (session) await loadEntries(session.id);
    } catch (e: unknown) {
      toast.error("Gagal: " + (e as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  // ── Tambah antrian manual (merchant) ─────────────────────────────────────
  async function handleAddManual() {
    if (!session || !addName.trim()) return;
    setActionLoading(true);
    try {
      const { data, error } = await supabase.rpc("take_queue_number", {
        p_session_id: session.id,
        p_customer_name: addName.trim(),
        p_customer_phone: addPhone.trim() || null,
        p_notes: addNotes.trim() || null,
      });
      if (error) throw error;
      const entry = data as QueueEntry;
      toast.success(`Nomor antrian ${entry.queue_number} dibuat untuk ${entry.customer_name}`);
      await loadEntries(session.id);
      setAddName("");
      setAddPhone("");
      setAddNotes("");
      setShowAddDialog(false);
    } catch (e: unknown) {
      toast.error("Gagal: " + (e as Error).message);
    } finally {
      setActionLoading(false);
    }
  }

  // ── Estimasi tunggu ───────────────────────────────────────────────────────
  function estimasiMenit(queueNumber: number): number {
    if (!session) return 0;
    const waitingBefore = entries.filter(
      (e) => e.status === "waiting" && e.queue_number < queueNumber
    ).length;
    const servingCount = entries.filter((e) => e.status === "serving").length;
    const posisi = Math.max(waitingBefore - servingCount, 0) + 1;
    return posisi * session.avg_service_minutes;
  }

  // ── Link publik antrian ───────────────────────────────────────────────────
  const publicLink = session
    ? `${window.location.origin}/antrian/${session.id}`
    : null;

  function copyLink() {
    if (publicLink) {
      navigator.clipboard.writeText(publicLink);
      toast.success("Link disalin");
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const waitingCount = entries.filter((e) => e.status === "waiting").length;
  const servingEntry = entries.find((e) => e.status === "serving");
  const doneCount = entries.filter((e) => e.status === "done").length;
  const totalToday = entries.length;

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin" /> Memuat data antrian...
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Hash className="w-7 h-7 text-amber-600" />
          <div>
            <h1 className="text-2xl font-bold">Antrean Digital</h1>
            <p className="text-sm text-gray-500">Kelola nomor antrian & estimasi tunggu</p>
          </div>
        </div>
        <div className="flex gap-2">
          {session ? (
            <>
              <Button variant="outline" size="sm" onClick={() => session && loadEntries(session.id)}>
                <RefreshCcw className="w-4 h-4 mr-1" /> Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
                onClick={handleEndSession}
                disabled={actionLoading}
              >
                <StopCircle className="w-4 h-4 mr-1" /> Tutup Sesi
              </Button>
            </>
          ) : (
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => setShowStartDialog(true)}
            >
              <Play className="w-4 h-4 mr-2" /> Mulai Sesi Antrian
            </Button>
          )}
        </div>
      </div>

      {!session ? (
        /* ── Tidak ada sesi aktif ── */
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center space-y-3">
          <Hash className="w-12 h-12 text-gray-300 mx-auto" />
          <p className="text-gray-500 font-medium">Belum ada sesi antrian aktif hari ini</p>
          <p className="text-sm text-gray-400">
            Klik "Mulai Sesi Antrian" untuk membuka loket antrian baru
          </p>
          <Button
            className="bg-amber-600 hover:bg-amber-700 text-white mt-2"
            onClick={() => setShowStartDialog(true)}
          >
            <Play className="w-4 h-4 mr-2" /> Mulai Sesi
          </Button>
        </div>
      ) : (
        <>
          {/* ── Board Utama ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Nomor sedang dilayani */}
            <div className="md:col-span-2 rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white p-6 flex flex-col items-center justify-center gap-3 min-h-[180px]">
              <p className="text-sm font-medium text-blue-600 uppercase tracking-wide">
                Sedang Dilayani
              </p>
              {servingEntry ? (
                <>
                  <div className="text-7xl font-black text-blue-700 leading-none">
                    {String(servingEntry.queue_number).padStart(3, "0")}
                  </div>
                  <p className="text-lg font-semibold text-blue-900">{servingEntry.customer_name}</p>
                  {servingEntry.notes && (
                    <p className="text-sm text-blue-500 italic">{servingEntry.notes}</p>
                  )}
                </>
              ) : (
                <div className="text-5xl font-black text-gray-200">---</div>
              )}
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="rounded-xl border bg-white p-4 flex items-center gap-3">
                <Users className="w-8 h-8 text-amber-500" />
                <div>
                  <div className="text-2xl font-bold text-amber-700">{waitingCount}</div>
                  <div className="text-xs text-gray-500">Menunggu</div>
                </div>
              </div>
              <div className="rounded-xl border bg-white p-4 flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-green-700">{doneCount}</div>
                  <div className="text-xs text-gray-500">Selesai Hari Ini</div>
                </div>
              </div>
              <div className="rounded-xl border bg-white p-4 flex items-center gap-3">
                <Clock className="w-8 h-8 text-purple-400" />
                <div>
                  <div className="text-lg font-bold text-purple-700">
                    {session.avg_service_minutes} mnt/orang
                  </div>
                  <div className="text-xs text-gray-500">Rata-rata waktu layanan</div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Kontrol ── */}
          <div className="flex flex-wrap gap-3">
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
              onClick={handleCallNext}
              disabled={actionLoading || waitingCount === 0}
            >
              {actionLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              Panggil Berikutnya
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowAddDialog(true)}
            >
              <UserPlus className="w-4 h-4" /> Tambah Manual
            </Button>
            {publicLink && (
              <>
                <Button variant="outline" className="gap-2" onClick={copyLink}>
                  <Copy className="w-4 h-4" /> Salin Link Antrian
                </Button>
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={() => window.open(publicLink, "_blank")}
                >
                  <QrCode className="w-4 h-4" /> Buka Halaman Publik
                </Button>
              </>
            )}
          </div>

          {/* ── Info sesi ── */}
          <div className="text-xs text-gray-400 flex flex-wrap gap-4">
            <span>
              Sesi:{" "}
              <strong>{session.label || "Umum"}</strong>
            </span>
            <span>
              Mulai:{" "}
              <strong>
                {new Date(session.started_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </strong>
            </span>
            <span>
              Total hari ini: <strong>{totalToday}</strong>
            </span>
          </div>

          {/* ── Daftar Antrian ── */}
          <div className="space-y-2">
            <h2 className="font-semibold text-gray-700">Daftar Antrian</h2>
            {entries.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-center text-gray-400 text-sm">
                Belum ada antrian — bagikan link atau tambahkan manual
              </div>
            ) : (
              <div className="space-y-2">
                {entries.map((entry) => {
                  const estMenit =
                    entry.status === "waiting" ? estimasiMenit(entry.queue_number) : null;
                  return (
                    <div
                      key={entry.id}
                      className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${
                        entry.status === "serving"
                          ? "border-blue-300 bg-blue-50"
                          : entry.status === "done"
                          ? "border-green-200 bg-green-50 opacity-60"
                          : entry.status === "skipped"
                          ? "border-gray-200 bg-gray-50 opacity-50"
                          : "bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`text-2xl font-black w-14 text-center ${
                            entry.status === "serving"
                              ? "text-blue-700"
                              : entry.status === "done"
                              ? "text-green-600"
                              : "text-gray-700"
                          }`}
                        >
                          {String(entry.queue_number).padStart(3, "0")}
                        </div>
                        <div>
                          <p className="font-semibold">{entry.customer_name}</p>
                          {entry.customer_phone && (
                            <p className="text-xs text-gray-500">{entry.customer_phone}</p>
                          )}
                          {entry.notes && (
                            <p className="text-xs text-gray-400 italic">{entry.notes}</p>
                          )}
                          {estMenit !== null && (
                            <p className="text-xs text-amber-600 mt-0.5">
                              <Clock className="w-3 h-3 inline mr-0.5" />
                              Estimasi tunggu ±{estMenit} menit
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={STATUS_COLOR[entry.status]}>
                          {STATUS_LABEL[entry.status]}
                        </Badge>
                        {entry.status === "waiting" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-gray-400 hover:text-red-500 h-7 px-2"
                            onClick={() => handleSkip(entry.id)}
                            disabled={actionLoading}
                            title="Lewati antrian ini"
                          >
                            <SkipForward className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Dialog: Mulai Sesi ── */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mulai Sesi Antrian</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Label Loket (opsional)</Label>
              <Input
                placeholder="mis. Poli Umum, Kasir 1"
                value={sessionLabel}
                onChange={(e) => setSessionLabel(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Rata-rata Waktu Layanan per Orang</Label>
              <Select value={avgMinutes} onValueChange={setAvgMinutes}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["5", "10", "15", "20", "30", "45", "60"].map((m) => (
                    <SelectItem key={m} value={m}>
                      {m} menit
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                Digunakan untuk menghitung estimasi tunggu per antrian
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDialog(false)}>
              Batal
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleStartSession}
              disabled={actionLoading}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
              Mulai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Tambah Antrian Manual ── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Tambah Antrian Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nama Pasien / Pelanggan *</Label>
              <Input
                placeholder="Nama lengkap"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>No. HP (opsional)</Label>
              <Input
                placeholder="08xx-xxxx-xxxx"
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Keluhan / Catatan (opsional)</Label>
              <Input
                placeholder="mis. Sakit kepala, umum"
                value={addNotes}
                onChange={(e) => setAddNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Batal
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={handleAddManual}
              disabled={actionLoading || !addName.trim()}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-1" />}
              Tambahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
