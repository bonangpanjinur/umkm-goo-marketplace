import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Zap, TicketPercent, Calendar, RefreshCw } from "lucide-react";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/promo-calendar")({
  head: () => ({ meta: [{ title: "Kalender Promo — Merchant" }] }), component: PromoCalendar });

type CalendarEvent = {
  id: string;
  title: string;
  type: "flash" | "voucher";
  start: Date;
  end: Date;
  value?: number;
  valueType?: "percent" | "nominal";
};

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

const MONTH_NAMES = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
const DAY_NAMES = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

export default function PromoCalendar() {
  const { shop } = useShop();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate());

  async function load() {
    if (!shop?.id) return;
    setLoading(true);

    const startOfMonth = new Date(year, month, 1).toISOString();
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    const evts: CalendarEvent[] = [];

    // Flash sales
    const { data: flashItems } = await supabase
      .from("menu_items")
      .select("id, name, flash_price, flash_starts_at, flash_ends_at")
      .eq("shop_id", shop.id)
      .not("flash_starts_at", "is", null)
      .lte("flash_starts_at", endOfMonth)
      .gte("flash_ends_at", startOfMonth);

    for (const item of flashItems ?? []) {
      if (item.flash_starts_at && item.flash_ends_at) {
        evts.push({
          id: `flash-${item.id}`,
          title: item.name,
          type: "flash",
          start: new Date(item.flash_starts_at),
          end: new Date(item.flash_ends_at),
          value: item.flash_price ?? undefined,
        });
      }
    }

    // Vouchers
    const { data: vouchers } = await supabase
      .from("promos")
      .select("id, code, description, type, value, starts_at, expires_at")
      .eq("shop_id", shop.id)
      .or(`starts_at.lte.${endOfMonth},starts_at.is.null`)
      .or(`expires_at.gte.${startOfMonth},expires_at.is.null`);

    for (const v of vouchers ?? []) {
      const start = v.starts_at ? new Date(v.starts_at) : new Date(year, month, 1);
      const end = v.expires_at ? new Date(v.expires_at) : new Date(year, month + 1, 0);
      evts.push({
        id: `voucher-${v.id}`,
        title: v.code + (v.description ? ` — ${v.description}` : ""),
        type: "voucher",
        start,
        end,
        value: v.value,
        valueType: v.type,
      });
    }

    setEvents(evts);
    setLoading(false);
  }

  useEffect(() => { load(); }, [shop?.id, year, month]);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  function eventsOnDay(day: number): CalendarEvent[] {
    const d = new Date(year, month, day);
    return events.filter(e => {
      const start = new Date(e.start); start.setHours(0,0,0,0);
      const end = new Date(e.end); end.setHours(23,59,59,999);
      return d >= start && d <= end;
    });
  }

  const selectedDayEvents = useMemo(() => {
    if (!selectedDay) return [];
    return eventsOnDay(selectedDay);
  }, [selectedDay, events]);

  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" /> Kalender Promo
          </h1>
          <p className="text-sm text-muted-foreground">Lihat jadwal flash sale & voucher aktif</p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-sm">
        <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-amber-500" /> Flash Sale</span>
        <span className="flex items-center gap-1.5"><TicketPercent className="h-4 w-4 text-violet-500" /> Voucher</span>
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-4">
        {/* Calendar */}
        <Card className="p-4">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="font-semibold">{MONTH_NAMES[month]} {year}</span>
            <Button variant="ghost" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAY_NAMES.map(d => (
              <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvts = eventsOnDay(day);
              const flashCount = dayEvts.filter(e => e.type === "flash").length;
              const voucherCount = dayEvts.filter(e => e.type === "voucher").length;
              const isSelected = selectedDay === day;
              const _isToday = isToday(day);
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day === selectedDay ? null : day)}
                  className={`relative aspect-square flex flex-col items-center justify-start pt-1 rounded-lg text-sm transition-colors border border-transparent hover:border-border
                    ${isSelected ? "bg-primary text-primary-foreground" : ""}
                    ${_isToday && !isSelected ? "font-bold text-primary" : ""}
                  `}
                >
                  <span>{day}</span>
                  {dayEvts.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {flashCount > 0 && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-amber-500"}`} />}
                      {voucherCount > 0 && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-violet-500"}`} />}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Day detail panel */}
        <Card className="p-4">
          <h3 className="font-semibold mb-3 text-sm">
            {selectedDay
              ? `${selectedDay} ${MONTH_NAMES[month]} ${year}`
              : "Pilih tanggal"}
          </h3>
          {!selectedDay && (
            <p className="text-sm text-muted-foreground">Klik tanggal di kalender untuk melihat promo aktif.</p>
          )}
          {selectedDay && selectedDayEvents.length === 0 && (
            <p className="text-sm text-muted-foreground">Tidak ada promo aktif pada hari ini.</p>
          )}
          <div className="space-y-2">
            {selectedDayEvents.map(evt => (
              <div key={evt.id} className={`rounded-lg border p-3 text-sm ${evt.type === "flash" ? "border-amber-200 bg-amber-50" : "border-violet-200 bg-violet-50"}`}>
                <div className="flex items-center gap-1.5 mb-1">
                  {evt.type === "flash"
                    ? <Zap className="h-3.5 w-3.5 text-amber-500" />
                    : <TicketPercent className="h-3.5 w-3.5 text-violet-500" />}
                  <Badge variant="outline" className={`text-xs ${evt.type === "flash" ? "border-amber-300 text-amber-700" : "border-violet-300 text-violet-700"}`}>
                    {evt.type === "flash" ? "Flash Sale" : "Voucher"}
                  </Badge>
                </div>
                <p className="font-medium truncate">{evt.title}</p>
                {evt.type === "flash" && evt.value && (
                  <p className="text-xs text-muted-foreground mt-0.5">Harga flash: {formatIDR(evt.value)}</p>
                )}
                {evt.type === "voucher" && evt.value != null && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Diskon: {evt.valueType === "percent" ? `${evt.value}%` : formatIDR(evt.value)}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {evt.start.toLocaleDateString("id-ID")} — {evt.end.toLocaleDateString("id-ID")}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Monthly summary */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3">Semua Promo di {MONTH_NAMES[month]} {year}</h3>
        {loading && <p className="text-sm text-muted-foreground">Memuat...</p>}
        {!loading && events.length === 0 && (
          <p className="text-sm text-muted-foreground">Tidak ada promo aktif bulan ini.</p>
        )}
        <div className="space-y-2">
          {events.map(evt => (
            <div key={evt.id} className="flex items-start gap-3 py-2 border-b last:border-0">
              {evt.type === "flash"
                ? <Zap className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                : <TicketPercent className="h-4 w-4 text-violet-500 mt-0.5 shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{evt.title}</p>
                <p className="text-xs text-muted-foreground">
                  {evt.start.toLocaleDateString("id-ID")} — {evt.end.toLocaleDateString("id-ID")}
                  {evt.value != null && (
                    <> · {evt.valueType === "percent" ? `${evt.value}%` : evt.type === "flash" ? formatIDR(evt.value) : formatIDR(evt.value)} diskon</>
                  )}
                </p>
              </div>
              <Badge variant="secondary" className="text-xs shrink-0">
                {evt.type === "flash" ? "Flash" : "Voucher"}
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
