import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, Loader2, Award } from "lucide-react";

export const Route = createFileRoute("/pos-app/lesson-progress")({
  head: () => ({ meta: [{ title: "Progress Pelajaran — Merchant" }] }),
  component: Page,
});

type Course = { id: string; name: string };
type Row = { user_id: string; name: string; done: number; total: number; cert: boolean };

function Page() {
  const { shop, loading } = useCurrentShop();
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (shop) loadCourses(); }, [shop?.id]);
  useEffect(() => { if (courseId) loadProgress(); }, [courseId]);

  async function loadCourses() {
    if (!shop) return;
    const { data } = await supabase.from("menu_items").select("id, name").eq("shop_id", shop.id).eq("item_type", "course");
    const list = (data ?? []) as Course[];
    setCourses(list);
    if (list.length && !courseId) setCourseId(list[0].id);
  }

  async function loadProgress() {
    setBusy(true);
    const { data: modules } = await (supabase as any).from("course_modules").select("id").eq("menu_item_id", courseId);
    const modIds = (modules ?? []).map((m: any) => m.id);
    const { data: lessons } = await (supabase as any).from("course_lessons").select("id").in("module_id", modIds.length ? modIds : ["__none__"]);
    const lessonIds: string[] = (lessons ?? []).map((l: any) => l.id);
    const total = lessonIds.length;

    const { data: progress } = await (supabase as any).from("lesson_progress")
      .select("user_id, lesson_id, completed_at")
      .in("lesson_id", lessonIds.length ? lessonIds : ["__none__"]);

    const byUser = new Map<string, number>();
    (progress ?? []).forEach((p: any) => {
      if (p.completed_at) byUser.set(p.user_id, (byUser.get(p.user_id) ?? 0) + 1);
    });

    const { data: certs } = await (supabase as any).from("course_certificates").select("user_id").eq("course_id", courseId);
    const certSet = new Set<string>((certs ?? []).map((c: any) => c.user_id));

    const userIds = Array.from(new Set([...byUser.keys(), ...certSet]));
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", userIds)
      : { data: [] as any[] };
    const nameById = new Map<string, string>();
    (profiles ?? []).forEach((p: any) => nameById.set(p.id, p.full_name ?? p.id.slice(0, 8)));

    const built: Row[] = userIds.map(uid => ({
      user_id: uid, name: nameById.get(uid) ?? uid.slice(0, 8),
      done: byUser.get(uid) ?? 0, total, cert: certSet.has(uid),
    })).sort((a, b) => b.done - a.done);

    setRows(built);
    setBusy(false);
  }

  if (loading) return <div className="p-6"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><GraduationCap className="h-6 w-6 text-primary" /> Progress Pelajaran</h1>
          <p className="text-sm text-muted-foreground mt-1">Pantau penyelesaian student per kursus. Sertifikat otomatis terbit saat 100%.</p>
        </div>
        <Select value={courseId} onValueChange={setCourseId}>
          <SelectTrigger className="w-[280px]"><SelectValue placeholder="Pilih kursus" /></SelectTrigger>
          <SelectContent>{courses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {busy ? <div className="p-6"><Loader2 className="animate-spin" /></div> : courses.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Belum ada kursus. Buat dulu di menu "Kursus Online".</Card>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">Belum ada student yang mulai belajar.</Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-xs">
              <tr>
                <th className="px-3 py-2 text-left">Student</th>
                <th className="px-3 py-2 text-left">Progress</th>
                <th className="px-3 py-2 text-right">Selesai</th>
                <th className="px-3 py-2 text-center">Sertifikat</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const pct = r.total > 0 ? Math.round((r.done / r.total) * 100) : 0;
                return (
                  <tr key={r.user_id} className="border-t">
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2 w-1/2">
                      <div className="flex items-center gap-2">
                        <Progress value={pct} className="h-2 flex-1" />
                        <span className="text-xs text-muted-foreground w-10 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">{r.done} / {r.total}</td>
                    <td className="px-3 py-2 text-center">
                      {r.cert ? <Badge className="gap-1"><Award className="h-3 w-3" />Terbit</Badge> : <span className="text-muted-foreground text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
