import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  UtensilsCrossed, Loader2, Check, X, Clock, Users, Calendar,
  Phone, MessageSquare, RefreshCw, ChevronDown, Search,
  CheckCircle2, XCircle, UserCheck, AlertCircle,
} from "lucide-react";

export const Route = createFileRoute("/pos-app/reservasi")({
  component: ReservasiPage,
});

type Reservation = {
  id: string;
  table_name: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  party_size: number;
  reservation_date: string;
  reservation_time: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  cancel_token: string;
  created_at: string;
};

type StatusFilter = "all" | "pending" | "confirmed" | "seated" | "completed" | "cancelled";

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: typeof CheckCircle2 }> = {
  pending:   { label: "Menunggu",    cls: "bg-amber-100 text-amber-700",    icon: Clock },
  confirmed: { label: "Dikonfirmasi",cls: "bg-blue-100 text-blue-700",      icon: CheckCircle2 },
  seated:    { label: "Sudah Duduk", cls: "bg-indigo-100 text-indigo-700",  icon: UserCheck },
  completed: { label: "Selesai",     cls: "bg-green-100 text-green-700",    icon: CheckCircle2 },
  cancelled: { label: "Dibatalkan",  cls: "bg-red-100 text-red-700",        icon: XCircle },
  no_show:   { label: "Tidak Hadir", cls: "bg-gray-100 text-gray-600",      icon: AlertCircle },
};

function fmtDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "short",
  });
}
function fmtTime(t: string) { return t.slice(0, 5); }
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, cls: "bg-muted text-muted-foreground", icon: Clock };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

function ReservasiPage() {
  const { shop } = useCurrentShop();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState(() => new Date().toISOString().split("T")[0]);

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    try {
      let q = (supabase as any)
        .from("table_reservations")
        .select("*")
        .eq("shop_id", shopId)
        .order("reservation_date", { ascending: true })
        .order("reservation_time", { ascending: true })
        .limit(200);

      if (dateFilter) q = q.eq("reservation_date", dateFilter);
      if (filter !== "all") q = q.eq("status", filter);

      const { data, error } = await q;
      if (error) throw error;
      setReservations((data ?? []) as Reservation[]);
    } catch (err) {
      toast.error("Gagal memuat reservasi");
    } finally {
      setLoading(false);
    }
  }, [filter, dateFilter]);

  useEffect(() => {
    if (shop?.id) load(shop.id);
  }, [shop?.id, load]);

  const updateStatus = async (id: string, newStatus: string) => {
    setActionBusy(id + newStatus);
    try {
      const { error } = await (supabase as any)
        .from("table_reservations")
        .update({ status: newStatus })
        .eq("id", id);
      if (error) throw error;
      setReservations(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
      toast.success(`Status diperbarui: ${STATUS_CONFIG[newStatus]?.label ?? newStatus}`);
    } catch {
      toast.error("Gagal memperbarui status");
    } finally {
      setActionBusy(null);
    }
  };

  const filtered = reservations.filter(r => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      r.customer_name.toLowerCase().includes(s) ||
      r.customer_phone.includes(s) ||
      (r.table_name ?? "").toLowerCase().includes(s) ||
      (r.notes ?? "").toLowerCase().includes(s)
    );
  });

  const counts = reservations.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (!shop) {
    return <div className="p-6 text-muted-foreground">Memuat data toko...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              Reservasi Meja
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Kelola reservasi meja dari pelanggan</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => load(shop.id)} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" />
            Muat Ulang
          </Button>
        </div>

        {/* Stats strip */}
        <div className="flex flex-wrap gap-2 mt-3">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = counts[key] ?? 0;
            if (!count) return null;
            return (
              <button
                key={key}
                onClick={() => setFilter(key === filter ? "all" : key as StatusFilter)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  filter === key ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"
                }`}
              >
                {cfg.label} <span className="font-bold">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-border bg-muted/20">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Cari nama, WA, meja..."
            className="pl-8 h-8 text-sm"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="date"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={dateFilter}
            onChange={e => setDateFilter(e.target.value)}
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter("")}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <select
          className="h-8 rounded-md border border-input bg-background px-2 text-sm"
          value={filter}
          onChange={e => setFilter(e.target.value as StatusFilter)}
        >
          <option value="all">Semua Status</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
            <UtensilsCrossed className="h-8 w-8 opacity-30" />
            <p className="text-sm">
              {search || filter !== "all" || dateFilter
                ? "Tidak ada reservasi yang sesuai filter"
                : "Belum ada reservasi hari ini"
              }
            </p>
            {(search || filter !== "all") && (
              <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setFilter("all"); }}>
                Reset Filter
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <ReservationCard
                key={r.id}
                r={r}
                busy={actionBusy}
                onUpdateStatus={updateStatus}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReservationCard({
  r,
  busy,
  onUpdateStatus,
}: {
  r: Reservation;
  busy: string | null;
  onUpdateStatus: (id: string, status: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const endTime = (() => {
    const [hh, mm] = r.reservation_time.split(":").map(Number);
    const end = hh * 60 + mm + r.duration_minutes;
    return `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}`;
  })();

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div
        className="flex items-start gap-4 p-4 cursor-pointer hover:bg-accent/30 transition"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Time column */}
        <div className="shrink-0 text-center min-w-[56px]">
          <p className="text-lg font-bold text-primary">{fmtTime(r.reservation_time)}</p>
          <p className="text-xs text-muted-foreground">s/d {endTime}</p>
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-sm">{r.customer_name}</p>
            <StatusBadge status={r.status} />
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-muted-foreground">
            {r.table_name && (
              <span className="inline-flex items-center gap-1">
                <UtensilsCrossed className="h-3 w-3" /> {r.table_name}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" /> {r.party_size} tamu
            </span>
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3 w-3" /> {r.customer_phone}
            </span>
          </div>
          {r.notes && (
            <p className="mt-1 text-xs text-muted-foreground/80 italic line-clamp-1">
              "{r.notes}"
            </p>
          )}
        </div>

        <ChevronDown className={`shrink-0 h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </div>

      {/* Expanded actions */}
      {expanded && (
        <div className="border-t border-border px-4 py-3 bg-muted/20 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-muted-foreground">Tanggal</span>
              <p className="font-medium">{fmtDate(r.reservation_date)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Durasi</span>
              <p className="font-medium">{r.duration_minutes} menit</p>
            </div>
            {r.customer_email && (
              <div>
                <span className="text-muted-foreground">Email</span>
                <p className="font-medium">{r.customer_email}</p>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Dibuat</span>
              <p className="font-medium">{fmtDateTime(r.created_at)}</p>
            </div>
          </div>

          {r.notes && (
            <div className="rounded-lg bg-background border border-border px-3 py-2 text-xs">
              <span className="font-medium text-muted-foreground">Catatan: </span>
              {r.notes}
            </div>
          )}

          {/* Action buttons based on current status */}
          <div className="flex flex-wrap gap-2">
            {r.status === "pending" && (
              <>
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={!!busy}
                  onClick={() => onUpdateStatus(r.id, "confirmed")}
                >
                  {busy === r.id + "confirmed"
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <Check className="h-3 w-3" />
                  }
                  Konfirmasi
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="gap-1.5"
                  disabled={!!busy}
                  onClick={() => onUpdateStatus(r.id, "cancelled")}
                >
                  {busy === r.id + "cancelled"
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <X className="h-3 w-3" />
                  }
                  Tolak
                </Button>
              </>
            )}
            {r.status === "confirmed" && (
              <>
                <Button
                  size="sm"
                  className="gap-1.5 bg-indigo-600 hover:bg-indigo-700"
                  disabled={!!busy}
                  onClick={() => onUpdateStatus(r.id, "seated")}
                >
                  {busy === r.id + "seated"
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <UserCheck className="h-3 w-3" />
                  }
                  Sudah Duduk
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  disabled={!!busy}
                  onClick={() => onUpdateStatus(r.id, "no_show")}
                >
                  Tidak Hadir
                </Button>
              </>
            )}
            {r.status === "seated" && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
                disabled={!!busy}
                onClick={() => onUpdateStatus(r.id, "completed")}
              >
                {busy === r.id + "completed"
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <CheckCircle2 className="h-3 w-3" />
                }
                Selesai
              </Button>
            )}
            {/* WhatsApp shortcut */}
            <a
              href={`https://wa.me/${r.customer_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                `Halo ${r.customer_name}, reservasi meja Anda (${r.table_name ?? "meja"}) pada ${fmtDate(r.reservation_date)} pukul ${fmtTime(r.reservation_time)} telah ${
                  r.status === "confirmed" ? "dikonfirmasi ✓" : "diperbarui"
                }. Terima kasih!`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100 transition"
            >
              <MessageSquare className="h-3 w-3" />
              WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
