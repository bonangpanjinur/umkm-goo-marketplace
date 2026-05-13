import { Clock } from "lucide-react";

export type TimelineEntry = {
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "Menunggu",
  accepted: "Diterima",
  in_progress: "Dikerjakan",
  completed: "Selesai",
  rejected: "Ditolak",
  cancelled: "Dibatalkan",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-500",
  accepted: "bg-emerald-500",
  in_progress: "bg-blue-500",
  completed: "bg-green-600",
  rejected: "bg-rose-500",
  cancelled: "bg-muted-foreground",
};

export function CustomOrderTimeline({ history }: { history: TimelineEntry[] }) {
  if (!history?.length) {
    return (
      <p className="text-xs text-muted-foreground italic flex items-center gap-1">
        <Clock className="h-3 w-3" /> Belum ada riwayat
      </p>
    );
  }
  return (
    <ol className="relative border-l border-border ml-2 space-y-3 pl-4">
      {history.map((h, i) => (
        <li key={i} className="relative">
          <span
            className={`absolute -left-[22px] top-1 h-3 w-3 rounded-full ring-2 ring-background ${
              STATUS_COLOR[h.to_status] ?? "bg-muted-foreground"
            }`}
          />
          <div className="text-sm font-medium">
            {STATUS_LABEL[h.to_status] ?? h.to_status}
            {h.from_status && (
              <span className="text-xs text-muted-foreground font-normal ml-1">
                (dari {STATUS_LABEL[h.from_status] ?? h.from_status})
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(h.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
          </div>
          {h.note && <div className="text-xs mt-1 bg-muted/40 rounded px-2 py-1 whitespace-pre-wrap">{h.note}</div>}
        </li>
      ))}
    </ol>
  );
}
