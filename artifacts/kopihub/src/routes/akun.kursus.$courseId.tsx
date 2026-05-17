import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  PlayCircle,
  Lock,
  Eye,
  Loader2,
  ArrowLeft,
  Clock,
  BookOpen,
  Video,
  GraduationCap,
} from "lucide-react";

export const Route = createFileRoute("/akun/kursus/$courseId")({
  head: () => ({ meta: [{ title: "Pelajaran Kursus — Akun" }] }),
  component: KursusPlayerPage,
});

type CourseInfo = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  shop: { name: string; slug: string } | null;
};

type Lesson = {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_minutes: number;
  sort_order: number;
  is_free_preview: boolean;
};

type Module = {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  lessons: Lesson[];
};

type ProgressMap = Record<string, { completed_at: string | null; watch_seconds: number }>;

function fmtDuration(mins: number) {
  if (!mins) return null;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h) return `${h}j ${m}m`;
  return `${m}m`;
}

function embedUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    // YouTube
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (yt) return `https://www.youtube.com/embed/${yt[1]}?rel=0&modestbranding=1`;
    // Vimeo
    const vimeo = url.match(/vimeo\.com\/(\d+)/);
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
    // Loom
    const loom = url.match(/loom\.com\/share\/([a-z0-9]+)/i);
    if (loom) return `https://www.loom.com/embed/${loom[1]}`;
    // Return as-is for direct video URLs
    return url;
  } catch {
    return url;
  }
}

function isDirectVideo(url: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(url);
}

function KursusPlayerPage() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();

  const [course, setCourse] = useState<CourseInfo | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [progressMap, setProgressMap] = useState<ProgressMap>({});
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [markingDone, setMarkingDone] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);

  const loadCourse = useCallback(async () => {
    if (!user || !courseId) return;
    setLoading(true);
    try {
      // Course info
      const { data: courseData, error: ce } = await (supabase as any)
        .from("menu_items")
        .select("id, name, description, image_url, shop:shops(name, slug)")
        .eq("id", courseId)
        .single();
      if (ce) throw ce;
      setCourse(courseData);

      // Enrollment check
      const { data: enrollment } = await (supabase as any)
        .from("course_enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("menu_item_id", courseId)
        .maybeSingle();
      setIsEnrolled(!!enrollment);

      // Modules + Lessons
      const { data: mods, error: me } = await (supabase as any)
        .from("course_modules")
        .select("id, title, description, sort_order")
        .eq("menu_item_id", courseId)
        .order("sort_order", { ascending: true });
      if (me) throw me;

      const modIds = (mods ?? []).map((m: any) => m.id);
      let allLessons: Lesson[] = [];
      if (modIds.length) {
        const { data: lsns } = await (supabase as any)
          .from("course_lessons")
          .select("id, module_id, title, description, video_url, duration_minutes, sort_order, is_free_preview")
          .in("module_id", modIds)
          .order("sort_order", { ascending: true });
        allLessons = lsns ?? [];
      }

      const builtModules: Module[] = (mods ?? []).map((m: any) => ({
        ...m,
        lessons: allLessons.filter((l) => l.module_id === m.id),
      }));
      setModules(builtModules);

      // Expand first module, select first lesson by default
      if (builtModules.length > 0) {
        setExpandedModules(new Set([builtModules[0].id]));
        if (builtModules[0].lessons.length > 0) {
          setActiveLesson(builtModules[0].lessons[0]);
        }
      }

      // Progress
      const allLessonIds = allLessons.map((l) => l.id);
      if (allLessonIds.length && user) {
        const { data: prog } = await (supabase as any)
          .from("lesson_progress")
          .select("lesson_id, completed_at, watch_seconds")
          .eq("user_id", user.id)
          .in("lesson_id", allLessonIds);
        const map: ProgressMap = {};
        for (const p of prog ?? []) {
          map[p.lesson_id] = { completed_at: p.completed_at, watch_seconds: p.watch_seconds };
        }
        setProgressMap(map);
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [user, courseId]);

  useEffect(() => { loadCourse(); }, [loadCourse]);

  const toggleModule = (modId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(modId)) next.delete(modId);
      else next.add(modId);
      return next;
    });
  };

  const markComplete = async (lesson: Lesson) => {
    if (!user) return;
    setMarkingDone(true);
    const { error } = await (supabase as any)
      .from("lesson_progress")
      .upsert({
        user_id: user.id,
        lesson_id: lesson.id,
        completed_at: new Date().toISOString(),
        watch_seconds: videoRef.current?.currentTime ? Math.round(videoRef.current.currentTime) : 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,lesson_id" });
    setMarkingDone(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pelajaran ditandai selesai!");
    setProgressMap((prev) => ({
      ...prev,
      [lesson.id]: { completed_at: new Date().toISOString(), watch_seconds: 0 },
    }));

    // Auto-advance to next lesson
    const allLessons = modules.flatMap((m) => m.lessons);
    const idx = allLessons.findIndex((l) => l.id === lesson.id);
    if (idx >= 0 && idx < allLessons.length - 1) {
      const next = allLessons[idx + 1];
      setActiveLesson(next);
      // Make sure the next lesson's module is expanded
      setExpandedModules((prev) => new Set([...prev, next.module_id]));
    }
  };

  const markIncomplete = async (lesson: Lesson) => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from("lesson_progress")
      .upsert({
        user_id: user.id,
        lesson_id: lesson.id,
        completed_at: null,
        watch_seconds: 0,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,lesson_id" });
    if (error) { toast.error(error.message); return; }
    setProgressMap((prev) => ({
      ...prev,
      [lesson.id]: { completed_at: null, watch_seconds: 0 },
    }));
  };

  // ── Stats ──────────────────────────────────────────────────────
  const allLessons = modules.flatMap((m) => m.lessons);
  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter((l) => progressMap[l.id]?.completed_at).length;
  const pct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const embed = activeLesson ? embedUrl(activeLesson.video_url) : null;
  const isDirect = activeLesson ? isDirectVideo(activeLesson.video_url) : false;
  const isCompleted = activeLesson ? !!progressMap[activeLesson.id]?.completed_at : false;
  const canWatch = isEnrolled || activeLesson?.is_free_preview;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Kursus tidak ditemukan.</p>
        <Link to="/akun/kursus">
          <Button variant="outline" size="sm" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Kembali ke Kursus Saya
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link to="/akun/kursus" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-3.5 w-3.5" />
        Kembali ke Kursus Saya
      </Link>

      {/* Course title + progress */}
      <div>
        <h2 className="text-xl font-bold">{course.name}</h2>
        {course.shop && (
          <p className="text-xs text-muted-foreground mt-0.5">
            dari{" "}
            <Link to="/toko/$slug" params={{ slug: course.shop.slug }} className="text-primary hover:underline">
              {course.shop.name}
            </Link>
          </p>
        )}
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              {completedCount}/{totalLessons} pelajaran selesai
            </span>
            <span className="font-semibold text-foreground">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>
        {pct === 100 && (
          <div className="mt-2 flex items-center gap-1.5 text-sm text-green-600 font-medium">
            <CheckCircle2 className="h-4 w-4" />
            Kursus selesai! Selamat!
          </div>
        )}
      </div>

      {/* Main layout: video + sidebar */}
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">

        {/* ── Video player ──────────────────────────────────────── */}
        <div className="space-y-4">
          {activeLesson ? (
            <div className="space-y-3">
              {/* Video */}
              <div className="rounded-xl overflow-hidden bg-black aspect-video">
                {!canWatch ? (
                  <div className="h-full flex flex-col items-center justify-center text-white gap-3">
                    <Lock className="h-10 w-10 opacity-60" />
                    <p className="text-sm font-medium">Beli kursus ini untuk akses penuh</p>
                    {course.shop && (
                      <Link to="/toko/$slug" params={{ slug: course.shop.slug }}>
                        <Button size="sm" variant="secondary">Lihat Toko</Button>
                      </Link>
                    )}
                  </div>
                ) : embed ? (
                  isDirect ? (
                    <video
                      ref={videoRef}
                      src={embed}
                      controls
                      className="w-full h-full"
                    />
                  ) : (
                    <iframe
                      src={embed}
                      title={activeLesson.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  )
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-white/60 gap-2">
                    <Video className="h-12 w-12" />
                    <p className="text-sm">URL video belum tersedia</p>
                  </div>
                )}
              </div>

              {/* Lesson info + actions */}
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base leading-snug">{activeLesson.title}</h3>
                    {activeLesson.duration_minutes > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {fmtDuration(activeLesson.duration_minutes)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {activeLesson.is_free_preview && (
                      <Badge variant="secondary" className="text-[10px]">
                        <Eye className="h-2.5 w-2.5 mr-1" />
                        Pratinjau Gratis
                      </Badge>
                    )}
                    {isEnrolled && (
                      isCompleted ? (
                        <Button
                          size="sm" variant="outline"
                          className="gap-1.5 h-8 text-green-600 border-green-300 hover:bg-green-50"
                          onClick={() => markIncomplete(activeLesson)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Selesai
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="gap-1.5 h-8 bg-purple-600 hover:bg-purple-700"
                          onClick={() => markComplete(activeLesson)}
                          disabled={markingDone}
                        >
                          {markingDone ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          Tandai Selesai
                        </Button>
                      )
                    )}
                  </div>
                </div>

                {activeLesson.description && (
                  <p className="text-sm text-muted-foreground">{activeLesson.description}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border aspect-video flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <PlayCircle className="h-12 w-12 opacity-40" />
              <p className="text-sm">Pilih pelajaran di sebelah kanan untuk mulai belajar</p>
            </div>
          )}
        </div>

        {/* ── Module sidebar ────────────────────────────────────── */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
            Daftar Materi
          </p>
          {modules.length === 0 && (
            <div className="rounded-lg border border-dashed border-border p-6 text-center">
              <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="text-xs text-muted-foreground">Belum ada materi</p>
            </div>
          )}
          {modules.map((mod, mi) => {
            const isExpanded = expandedModules.has(mod.id);
            const modCompleted = mod.lessons.filter((l) => progressMap[l.id]?.completed_at).length;
            const modTotal = mod.lessons.length;

            return (
              <div key={mod.id} className="rounded-lg border border-border overflow-hidden">
                {/* Module header */}
                <button
                  className="w-full flex items-center gap-2 px-3 py-2.5 bg-muted/30 hover:bg-muted/60 transition-colors text-left"
                  onClick={() => toggleModule(mod.id)}
                >
                  <span className="flex items-center justify-center h-5 w-5 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold shrink-0">
                    {mi + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold leading-tight truncate">{mod.title}</p>
                    <p className="text-[10px] text-muted-foreground">{modCompleted}/{modTotal} selesai</p>
                  </div>
                  {isExpanded
                    ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  }
                </button>

                {/* Lessons */}
                {isExpanded && (
                  <div>
                    {mod.lessons.map((lesson, li) => {
                      const done = !!progressMap[lesson.id]?.completed_at;
                      const isActive = activeLesson?.id === lesson.id;
                      const locked = !isEnrolled && !lesson.is_free_preview;

                      return (
                        <button
                          key={lesson.id}
                          className={`w-full flex items-start gap-2 px-3 py-2.5 text-left transition-colors border-t border-border/50 ${
                            isActive
                              ? "bg-purple-50 border-l-2 border-l-purple-500"
                              : "hover:bg-muted/30"
                          } ${locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          onClick={() => {
                            if (!locked) {
                              setActiveLesson(lesson);
                              setExpandedModules((prev) => new Set([...prev, lesson.module_id]));
                            }
                          }}
                          disabled={locked}
                        >
                          {done ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                          ) : locked ? (
                            <Lock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className={`text-xs leading-snug ${isActive ? "font-medium text-purple-700" : ""}`}>
                              {li + 1}. {lesson.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {lesson.duration_minutes > 0 && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Clock className="h-2.5 w-2.5" />
                                  {fmtDuration(lesson.duration_minutes)}
                                </span>
                              )}
                              {lesson.is_free_preview && !isEnrolled && (
                                <span className="text-[10px] text-green-600 font-medium">Gratis</span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
