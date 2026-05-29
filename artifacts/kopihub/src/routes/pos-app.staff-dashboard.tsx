import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useCurrentShop } from "@/lib/use-shop";
import { formatIDR } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Loader2, LayoutDashboard, Clock, ShoppingBag, Banknote, CalendarCheck } from "lucide-react";

export const Route = createFileRoute("/pos-app/staff-dashboard")({
  head: () => ({ meta: [{ title: "Dashboard Saya — Merchant" }] }),
  component: StaffDashboard,
});

type ShiftRow = {
  day_of_week: number;
  start_time: string;
  end_time: string;
  note: string | null;
};

type AttendanceRow = {
  id: string;
  business_date: string;
  clock_in: string;
  clock_out: string | null;
  duration_minutes: number | null;
};

type OrderStat = {
  total_orders: number;
  total_sales: number;
};

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function StaffDashboard() {
  const { user } = useAuth();
  const { shop, outlet, loading: shopLoading } = useCurrentShop();
  const [shifts, setShifts] = useState<ShiftRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow | null>(null);
  const [recentAttendances, setRecentAttendances] = useState<AttendanceRow[]>([]);
  const [orderStat, setOrderStat] = useState<OrderStat>({ total_orders: 0, total_sales: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !shop || !outlet) return;
    (async () => {
      const today = new Date().toISOString().split("T")[0];
      const todayDow = new Date().getDay();

      const [shiftsRes, attendanceRes, recentAttRes, ordersRes] = await Promise.all([
        supabase
          .from("shifts")
          .select("day_of_week,start_time,end_time,note")
          .eq("shop_id", shop.id)
          .eq("user_id", user.id)
          .order("day_of_week"),
        supabase
          .from("attendances")
          .select("id,business_date,clock_in,clock_out,duration_minutes")
          .eq("shop_id", shop.id)
          .eq("user_id", user.id)
          .eq("business_date", today)
          .maybeSingle(),
        supabase
          .from("attendances")
          .select("id,business_date,clock_in,clock_out,duration_minutes")
          .eq("shop_id", shop.id)
          .eq("user_id", user.id)
          .order("clock_in", { ascending: false })
          .limit(7),
        supabase
          .from("orders")
          .select("id,total")
          .eq("outlet_id", outlet.id)
          .gte("created_at", today + "T00:00:00")
          .lte("created_at", today + "T23:59:59")
          .in("status", ["completed", "paid"]),
      ]);

      setShifts((shiftsRes.data ?? []) as ShiftRow[]);
      setAttendance((attendanceRes.data ?? null) as AttendanceRow | null);
      setRecentAttendances((recentAttRes.data ?? []) as AttendanceRow[]);

      const orders = (ordersRes.data ?? []) as { id: string; total: number }[];
      setOrderStat({
        total_orders: orders.length,
        total_sales: orders.reduce((s, o) => s + Number(o.total || 0), 0),
      });

      setLoading(false);
    })();
  }, [user, shop?.id, outlet?.id]);

  if (shopLoading || loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!shop || !user) return null;

  const today = new Date();
  const todayDow = today.getDay();
  const todayShift = shifts.find((s) => s.day_of_week === todayDow);

  const formatDuration = (minutes: number | null) => {
    if (!minutes) return "—";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}j ${m}m` : `${m}m`;
  };

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex items-center gap-2">
        <LayoutDashboard className="h-5 w-5" />
        <div>
          <h1 className="text-xl font-semibold">Dashboard Pribadi</h1>
          <p className="text-xs text-muted-foreground">{shop.name} · {today.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card className="p-4 text-center">
          <ShoppingBag className="mx-auto mb-1.5 h-5 w-5 text-primary" />
          <p className="text-2xl font-bold">{orderStat.total_orders}</p>
          <p className="text-xs text-muted-foreground">Order hari ini</p>
        </Card>
        <Card className="p-4 text-center">
          <Banknote className="mx-auto mb-1.5 h-5 w-5 text-emerald-600" />
          <p className="text-base font-bold">{formatIDR(orderStat.total_sales)}</p>
          <p className="text-xs text-muted-foreground">Penjualan hari ini</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Absensi Hari Ini</h2>
          </div>
          {attendance ? (
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Masuk</span>
                <span className="font-medium">
                  {new Date(attendance.clock_in).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Keluar</span>
                <span className="font-medium">
                  {attendance.clock_out
                    ? new Date(attendance.clock_out).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                    : <span className="text-amber-600">Belum absen keluar</span>}
                </span>
              </div>
              {attendance.duration_minutes && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Durasi</span>
                  <span className="font-medium">{formatDuration(attendance.duration_minutes)}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada catatan absensi hari ini.</p>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarCheck className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Jadwal Shift</h2>
          </div>
          {todayShift ? (
            <div className="space-y-1 text-sm">
              <div className="rounded-md bg-primary/10 px-3 py-2">
                <p className="font-semibold text-primary">Hari ini ({DAYS[todayDow]})</p>
                <p>{todayShift.start_time} – {todayShift.end_time}</p>
                {todayShift.note && <p className="text-xs text-muted-foreground mt-0.5">{todayShift.note}</p>}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Tidak ada shift terjadwal hari ini.</p>
          )}
          {shifts.filter((s) => s.day_of_week !== todayDow).slice(0, 3).map((s) => (
            <div key={s.day_of_week} className="mt-1.5 flex items-center justify-between text-xs text-muted-foreground">
              <span>{DAYS[s.day_of_week]}</span>
              <span>{s.start_time} – {s.end_time}</span>
            </div>
          ))}
        </Card>
      </div>

      {recentAttendances.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Riwayat Absensi (7 Terakhir)</h2>
          <div className="space-y-1">
            {recentAttendances.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {new Date(a.business_date).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" })}
                </span>
                <span>
                  {new Date(a.clock_in).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  {" → "}
                  {a.clock_out
                    ? new Date(a.clock_out).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                    : "—"}
                </span>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  {formatDuration(a.duration_minutes)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
