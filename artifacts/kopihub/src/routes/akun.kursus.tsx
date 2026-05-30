import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  BookOpen,
  PlayCircle,
  Clock,
  CheckCircle2,
  Loader2,
  ChevronRight,
} from "lucide-react";

export const Route = createFileRoute("/akun/kursus")({
  head: () => ({ meta: [{ title: "Kursus Saya — Akun" }] }),
  component: KursusSayaPage,
});

type EnrolledCourse = {
  id: string;
  menu_item_id: string;
  enrolled_at: string;
  course: {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    price: number;
    shop: { name: string; slug: string } | null;
  } | null;
  total_lessons: number;
  completed_lessons: number;
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function KursusSayaPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        // Get enrollments with course info
        const { data: enrollments, error: err } = await (supabase as any)
          .from("course_enrollments")
          .select(`
            id,
            menu_item_id,
            enrolled_at,
            course:menu_items!menu_item_id(
              id, name, description, image_url, price,
              shop:shops(name, slug)
            )
          `)
          .eq("user_id", user.id)
          .order("enrolled_at", { ascending: false });

        if (err) throw err;

        const items: EnrolledCourse[] = (enrollments ?? []).map((e: any) => ({
          ...e,
          total_lessons: 0,
          completed_lessons: 0,
        }));

        if (items.length === 0) {
          setCourses([]);
          return;
        }

        // Get all modules for enrolled courses
        const courseIds = items.map((i) => i.menu_item_id);
        const { data: modules } = await (supabase as any)
          .from("course_modules")
          .select("id, menu_item_id")
          .in("menu_item_id", courseIds);

        const moduleIds = (modules ?? []).map((m: any) => m.id);
        const moduleMap: Record<string, string> = {}; // module_id → menu_item_id
        for (const m of modules ?? []) {
          moduleMap[m.id] = m.menu_item_id;
        }

        // Get all lessons
        let lessonMap: Record<string, string[]> = {}; // menu_item_id → [lesson_ids]
        if (moduleIds.length) {
          const { data: lessons } = await (supabase as any)
            .from("course_lessons")
            .select("id, module_id")
            .in("module_id", moduleIds);

          for (const l of lessons ?? []) {
            const courseId = moduleMap[l.module_id];
            if (courseId) {
              lessonMap[courseId] = [...(lessonMap[courseId] ?? []), l.id];
            }
          }
        }

        // Get completed lessons for this user
        const allLessonIds = Object.values(lessonMap).flat();
        let completedMap: Record<string, Set<string>> = {}; // menu_item_id → Set<lesson_id>

        if (allLessonIds.length) {
          const { data: progress } = await (supabase as any)
            .from("lesson_progress")
            .select("lesson_id")
            .eq("user_id", user.id)
            .not("completed_at", "is", null)
            .in("lesson_id", allLessonIds);

          // We need reverse lookup: lesson_id → courseId
          const lessonToCourse: Record<string, string> = {};
          for (const [cid, lids] of Object.entries(lessonMap)) {
            for (const lid of lids) lessonToCourse[lid] = cid;
          }

          for (const p of progress ?? []) {
            const cid = lessonToCourse[p.lesson_id];
            if (cid) {
              if (!completedMap[cid]) completedMap[cid] = new Set();
              completedMap[cid].add(p.lesson_id);
            }
          }
        }

        setCourses(
          items.map((item) => ({
            ...item,
            total_lessons: lessonMap[item.menu_item_id]?.length ?? 0,
            completed_lessons: completedMap[item.menu_item_id]?.size ?? 0,
          }))
        );
      } catch (e: any) {
        const msg: string = e?.message ?? "";
        if (msg.includes("42P01") || msg.toLowerCase().includes("does not exist") || msg.toLowerCase().includes("relation")) {
          setError("fitur_belum_aktif");
        } else {
          setError(msg);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-7 w-36" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card overflow-hidden">
              <Skeleton className="aspect-video w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-2 w-full rounded-full mt-3" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold">Kursus Saya</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Semua kursus yang kamu ikuti — akses seumur hidup.
        </p>
      </div>

      {error === "fitur_belum_aktif" && (
        <div className="rounded-xl border border-dashed border-border p-14 text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-3 text-base font-medium">Fitur kursus belum aktif</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Fitur kursus & e-learning belum tersedia di platform ini. Cek kembali nanti.
          </p>
        </div>
      )}
      {error && error !== "fitur_belum_aktif" && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Gagal memuat: {error}
        </div>
      )}

      {!error && courses.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-14 text-center">
          <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-3 text-base font-medium">Belum ada kursus</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Kursus yang kamu beli akan muncul di sini untuk bisa langsung dipelajari.
          </p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary hover:underline">
            Jelajahi Kursus →
          </Link>
        </div>
      )}

      {courses.length > 0 && (
        <div className="space-y-4">
          {courses.map((item) => {
            const pct = item.total_lessons > 0
              ? Math.round((item.completed_lessons / item.total_lessons) * 100)
              : 0;
            const isCompleted = item.total_lessons > 0 && item.completed_lessons === item.total_lessons;

            return (
              <div key={item.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex gap-4 p-4">
                  {/* Thumbnail */}
                  <div className="shrink-0">
                    {item.course?.image_url ? (
                      <img
                        src={item.course.image_url}
                        alt={item.course?.name}
                        className="h-20 w-20 rounded-lg object-cover"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-lg bg-purple-100 flex items-center justify-center">
                        <GraduationCap className="h-8 w-8 text-purple-500" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm leading-snug">
                          {item.course?.name ?? "Kursus"}
                        </p>
                        {item.course?.shop && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            dari{" "}
                            <Link
                              to="/toko/$slug"
                              params={{ slug: item.course.shop.slug }}
                              className="text-primary hover:underline"
                            >
                              {item.course.shop.name}
                            </Link>
                          </p>
                        )}
                      </div>
                      {isCompleted && (
                        <Badge className="bg-green-500 hover:bg-green-500 text-[10px] shrink-0">
                          <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                          Selesai
                        </Badge>
                      )}
                    </div>

                    {/* Progress */}
                    <div className="mt-3 space-y-1">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          {item.completed_lessons}/{item.total_lessons} pelajaran selesai
                        </span>
                        <span className="font-medium text-foreground">{pct}%</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
                    </div>

                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <Link to="/akun/kursus/$courseId" params={{ courseId: item.menu_item_id }}>
                        <Button size="sm" className="gap-2 h-8 bg-purple-600 hover:bg-purple-700">
                          <PlayCircle className="h-3.5 w-3.5" />
                          {pct === 0 ? "Mulai Belajar" : pct === 100 ? "Tonton Ulang" : "Lanjut Belajar"}
                        </Button>
                      </Link>
                      <span className="text-[10px] text-muted-foreground">
                        Terdaftar {fmtDate(item.enrolled_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
