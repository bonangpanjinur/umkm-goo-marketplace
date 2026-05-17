import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import { formatIDR } from "@/lib/format";

type Range = "today" | "7d" | "30d" | "month";

function rangeStart(r: Range): Date {
  const now = new Date();
  const d = new Date(now);
  if (r === "today") { d.setHours(0,0,0,0); return d; }
  if (r === "7d") { d.setDate(d.getDate() - 6); d.setHours(0,0,0,0); return d; }
  if (r === "30d") { d.setDate(d.getDate() - 29); d.setHours(0,0,0,0); return d; }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}
function isoDate(d: Date) { return d.toISOString().slice(0, 10); }

const PIE_COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--chart-2, 200 70% 50%))",
  "hsl(var(--chart-3, 30 80% 55%))",
  "hsl(var(--chart-4, 280 60% 60%))",
  "hsl(var(--muted-foreground))",
];

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-border bg-card p-4 ${className}`}>
      <div className="mb-3 text-sm font-semibold">{title}</div>
      {children}
    </div>
  );
}
function Kpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1.5 text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}
function Empty({ msg = "Tidak ada data pada rentang ini" }: { msg?: string }) {
  return <div className="flex h-[180px] items-center justify-center text-sm text-muted-foreground">{msg}</div>;
}
function Spinner() {
  return <div className="flex h-40 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
}

// =================== RENTAL ===================
export function RentalReport({ shopId, range }: { shopId: string; range: Range }) {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const start = isoDate(rangeStart(range));
      const [bRes, uRes] = await Promise.all([
        supabase.from("rental_bookings").select("id, unit_id, start_date, end_date, status, total_amount").eq("shop_id", shopId).gte("start_date", start),
        supabase.from("rental_units").select("id, name, category, is_active").eq("shop_id", shopId),
      ]);
      if (!alive) return;
      setBookings((bRes.data ?? []) as any[]);
      setUnits((uRes.data ?? []) as any[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [shopId, range]);

  const stats = useMemo(() => {
    const active = units.filter(u => u.is_active);
    const totalUnits = active.length;
    const start = rangeStart(range);
    const today = new Date(); today.setHours(0,0,0,0);
    const days = Math.max(1, Math.ceil((today.getTime() - start.getTime()) / 86400000) + 1);
    const possibleUnitDays = totalUnits * days;

    let bookedDays = 0;
    let revenue = 0;
    bookings.forEach(b => {
      if (b.status === "cancelled") return;
      const s = new Date(b.start_date); const e = new Date(b.end_date);
      const d = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000));
      bookedDays += d;
      revenue += Number(b.total_amount ?? 0);
    });
    const occupancy = possibleUnitDays > 0 ? (bookedDays / possibleUnitDays) * 100 : 0;

    // per unit
    const unitMap = new Map<string, { name: string; days: number; revenue: number }>();
    units.forEach(u => unitMap.set(u.id, { name: u.name, days: 0, revenue: 0 }));
    bookings.forEach(b => {
      if (b.status === "cancelled") return;
      const cur = unitMap.get(b.unit_id);
      if (!cur) return;
      const s = new Date(b.start_date); const e = new Date(b.end_date);
      cur.days += Math.max(1, Math.ceil((e.getTime() - s.getTime()) / 86400000));
      cur.revenue += Number(b.total_amount ?? 0);
    });
    const perUnit = [...unitMap.values()].sort((a,b) => b.days - a.days);

    return { totalUnits, days, possibleUnitDays, bookedDays, occupancy, revenue, perUnit };
  }, [bookings, units, range]);

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Tingkat hunian" value={`${stats.occupancy.toFixed(1)}%`} sub={`${stats.bookedDays}/${stats.possibleUnitDays} unit-hari`} />
        <Kpi label="Unit aktif" value={String(stats.totalUnits)} />
        <Kpi label="Booking" value={String(bookings.filter(b=>b.status!=="cancelled").length)} />
        <Kpi label="Omzet rental" value={formatIDR(stats.revenue)} />
      </div>
      <Card title="Hari tersewa per unit">
        {stats.perUnit.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={Math.max(180, stats.perUnit.length * 28)}>
            <BarChart data={stats.perUnit} layout="vertical" margin={{ left: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" fontSize={11} stroke="hsl(var(--muted-foreground))" />
              <YAxis type="category" dataKey="name" fontSize={11} stroke="hsl(var(--muted-foreground))" width={100} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="days" fill="hsl(var(--primary))" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
}

// =================== TRAVEL ===================
export function TravelReport({ shopId }: { shopId: string; range: Range }) {
  const [loading, setLoading] = useState(true);
  const [pkgs, setPkgs] = useState<any[]>([]);
  const [manifest, setManifest] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const [pRes, mRes] = await Promise.all([
        supabase.from("umroh_packages").select("id, name, departure_date, quota_total").eq("shop_id", shopId).order("departure_date", { ascending: true }),
        supabase.from("travel_jamaah_manifest").select("id, package_id, status").eq("shop_id", shopId),
      ]);
      if (!alive) return;
      setPkgs((pRes.data ?? []) as any[]);
      setManifest((mRes.data ?? []) as any[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [shopId]);

  const rows = useMemo(() => {
    const map = new Map<string, number>();
    manifest.forEach(m => { if (m.status !== "cancelled") map.set(m.package_id, (map.get(m.package_id) ?? 0) + 1); });
    return pkgs.map(p => {
      const filled = map.get(p.id) ?? 0;
      const quota = Number(p.quota_total ?? 0);
      const pct = quota > 0 ? (filled / quota) * 100 : 0;
      return { ...p, filled, quota, pct };
    });
  }, [pkgs, manifest]);

  const totalFilled = rows.reduce((s, r) => s + r.filled, 0);
  const totalQuota = rows.reduce((s, r) => s + r.quota, 0);
  const overallPct = totalQuota > 0 ? (totalFilled / totalQuota) * 100 : 0;

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Rata-rata terisi" value={`${overallPct.toFixed(1)}%`} sub={`${totalFilled}/${totalQuota} jamaah`} />
        <Kpi label="Paket aktif" value={String(pkgs.length)} />
        <Kpi label="Total jamaah" value={String(manifest.filter(m=>m.status!=="cancelled").length)} />
      </div>
      <Card title="Pengisian per paket">
        {rows.length === 0 ? <Empty /> : (
          <div className="space-y-3">
            {rows.map(r => (
              <div key={r.id}>
                <div className="flex items-center justify-between text-sm">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.filled}/{r.quota} ({r.pct.toFixed(0)}%)
                    {r.departure_date && <> · {new Date(r.departure_date).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}</>}
                  </div>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${Math.min(100, r.pct)}%` }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// =================== KURSUS ===================
export function KursusReport({ shopId }: { shopId: string; range: Range }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [enrolls, setEnrolls] = useState<any[]>([]);
  const [progress, setProgress] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const { data: courses } = await supabase.from("menu_items").select("id, name").eq("shop_id", shopId);
      const courseIds = (courses ?? []).map(c => c.id);
      const [eRes, pRes] = courseIds.length ? await Promise.all([
        supabase.from("course_enrollments").select("id, menu_item_id, user_id").in("menu_item_id", courseIds),
        supabase.from("course_certificates").select("menu_item_id, user_id").in("menu_item_id", courseIds),
      ]) : [{ data: [] as any[] }, { data: [] as any[] }];
      if (!alive) return;
      setItems(courses ?? []);
      setEnrolls((eRes.data ?? []) as any[]);
      setProgress((pRes.data ?? []) as any[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [shopId]);

  const rows = useMemo(() => {
    const enrMap = new Map<string, number>();
    const compMap = new Map<string, number>();
    enrolls.forEach(e => enrMap.set(e.menu_item_id, (enrMap.get(e.menu_item_id) ?? 0) + 1));
    progress.forEach(p => compMap.set(p.menu_item_id, (compMap.get(p.menu_item_id) ?? 0) + 1));
    return items
      .map(it => {
        const enr = enrMap.get(it.id) ?? 0;
        const comp = compMap.get(it.id) ?? 0;
        const pct = enr > 0 ? (comp / enr) * 100 : 0;
        return { id: it.id, name: it.name, enr, comp, pct };
      })
      .filter(r => r.enr > 0)
      .sort((a, b) => b.enr - a.enr);
  }, [items, enrolls, progress]);

  const totalEnr = rows.reduce((s,r) => s + r.enr, 0);
  const totalComp = rows.reduce((s,r) => s + r.comp, 0);
  const completion = totalEnr > 0 ? (totalComp / totalEnr) * 100 : 0;

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Total pendaftar" value={String(totalEnr)} />
        <Kpi label="Sertifikat terbit" value={String(totalComp)} />
        <Kpi label="Tingkat kelulusan" value={`${completion.toFixed(1)}%`} />
      </div>
      <Card title="Penyelesaian per kelas">
        {rows.length === 0 ? <Empty /> : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-2 py-1.5 text-left">Kelas</th><th className="px-2 py-1.5 text-right">Pendaftar</th><th className="px-2 py-1.5 text-right">Lulus</th><th className="px-2 py-1.5 text-right">%</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="px-2 py-2 font-medium">{r.name}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.enr}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.comp}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.pct.toFixed(0)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// =================== KLINIK ===================
export function KlinikReport({ shopId, range }: { shopId: string; range: Range }) {
  const [loading, setLoading] = useState(true);
  const [visits, setVisits] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const start = rangeStart(range).toISOString();
      const [vRes, pRes] = await Promise.all([
        supabase.from("patient_visits").select("id, visit_date, icd10_code, icd10_label").eq("shop_id", shopId).gte("visit_date", start),
        supabase.from("patient_records").select("id, payer_type").eq("shop_id", shopId),
      ]);
      if (!alive) return;
      setVisits((vRes.data ?? []) as any[]);
      setPatients((pRes.data ?? []) as any[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [shopId, range]);

  const byDay = useMemo(() => {
    const map = new Map<string, number>();
    visits.forEach(v => {
      const d = new Date(v.visit_date).toISOString().slice(0,10);
      map.set(d, (map.get(d) ?? 0) + 1);
    });
    return [...map.entries()].sort((a,b) => a[0].localeCompare(b[0])).map(([d, c]) => ({
      label: new Date(d).toLocaleDateString("id-ID", { day:"numeric", month:"short" }),
      count: c,
    }));
  }, [visits]);

  const topDx = useMemo(() => {
    const map = new Map<string, { code: string; label: string; count: number }>();
    visits.forEach(v => {
      if (!v.icd10_code) return;
      const cur = map.get(v.icd10_code) ?? { code: v.icd10_code, label: v.icd10_label ?? "—", count: 0 };
      cur.count += 1;
      map.set(v.icd10_code, cur);
    });
    return [...map.values()].sort((a,b) => b.count - a.count).slice(0, 10);
  }, [visits]);

  const byPayer = useMemo(() => {
    const map = new Map<string, number>();
    patients.forEach(p => { const k = p.payer_type ?? "umum"; map.set(k, (map.get(k) ?? 0) + 1); });
    return [...map.entries()].map(([name, value]) => ({ name: name.toUpperCase(), value }));
  }, [patients]);

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Kpi label="Kunjungan" value={String(visits.length)} />
        <Kpi label="Pasien terdaftar" value={String(patients.length)} />
        <Kpi label="Rata-rata / hari" value={byDay.length ? (visits.length / byDay.length).toFixed(1) : "0"} />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Kunjungan harian" className="lg:col-span-2">
          {byDay.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={byDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis allowDecimals={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card title="Penjamin pasien">
          {byPayer.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byPayer} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={(d:any) => d.name}>
                  {byPayer.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
      <Card title="10 diagnosis terbanyak (ICD-10)">
        {topDx.length === 0 ? <Empty msg="Belum ada visit dengan ICD-10" /> : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-2 py-1.5 text-left">Kode</th><th className="px-2 py-1.5 text-left">Diagnosis</th><th className="px-2 py-1.5 text-right">Kunjungan</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {topDx.map(r => (
                <tr key={r.code}>
                  <td className="px-2 py-2 font-mono text-xs">{r.code}</td>
                  <td className="px-2 py-2">{r.label}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

// =================== JASA / SALON — Lead to booking ===================
export function LeadConversionReport({ shopId, range }: { shopId: string; range: Range }) {
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const start = rangeStart(range).toISOString();
      const [lRes, bRes] = await Promise.all([
        supabase.from("leads").select("id, status, source, created_at").eq("shop_id", shopId).gte("created_at", start),
        supabase.from("bookings").select("id, status, created_at").eq("shop_id", shopId).gte("created_at", start),
      ]);
      if (!alive) return;
      setLeads((lRes.data ?? []) as any[]);
      setBookings((bRes.data ?? []) as any[]);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [shopId, range]);

  const totalLeads = leads.length;
  const wonLeads = leads.filter(l => ["won","converted","booked"].includes((l.status ?? "").toLowerCase())).length;
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => ["confirmed","completed","paid"].includes((b.status ?? "").toLowerCase())).length;
  const leadConv = totalLeads > 0 ? (wonLeads / totalLeads) * 100 : 0;
  const bookConv = totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0;

  const bySource = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach(l => { const k = l.source ?? "manual"; map.set(k, (map.get(k) ?? 0) + 1); });
    return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
  }, [leads]);

  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    leads.forEach(l => { const k = l.status ?? "new"; map.set(k, (map.get(k) ?? 0) + 1); });
    return [...map.entries()].map(([name, value]) => ({ name: name.toUpperCase(), value }));
  }, [leads]);

  if (loading) return <Spinner />;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total leads" value={String(totalLeads)} />
        <Kpi label="Leads → booking" value={`${leadConv.toFixed(1)}%`} sub={`${wonLeads} won`} />
        <Kpi label="Total booking" value={String(totalBookings)} />
        <Kpi label="Booking confirmed" value={`${bookConv.toFixed(1)}%`} sub={`${confirmedBookings} confirmed`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Status leads">
          {byStatus.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={(d:any) => d.name}>
                  {byStatus.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
        <Card title="Sumber leads">
          {bySource.length === 0 ? <Empty /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bySource} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis type="category" dataKey="name" fontSize={11} stroke="hsl(var(--muted-foreground))" width={100} />
                <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  );
}
