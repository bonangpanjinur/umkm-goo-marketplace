import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useShop } from "@/lib/use-shop";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Video,
  Users,
  GraduationCap,
  RefreshCw,
  Eye,
  Clock,
  ArrowLeft,
  GripVertical,
  CheckCircle2,
  PlayCircle,
  Globe,
  FileText,
  ExternalLink,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export const Route = createFileRoute("/pos-app/kursus")({ component: KursusPage });

type Course = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_available: boolean;
  image_url: string | null;
  total_sold: number;
  enrollment_count: number;
};

type Module = {
  id: string;
  menu_item_id: string;
  title: string;
  description: string | null;
  sort_order: number;
  status: "draft" | "published";
  lesson_count: number;
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
  status: "draft" | "published";
};

type EnrollmentStat = {
  menu_item_id: string;
  count: number;
};

// ─── Course dialog ──────────────────────────────────────────────────────────
const EMPTY_COURSE = { name: "", description: "", price: "", is_available: true };

// ─── Module dialog ──────────────────────────────────────────────────────────
const EMPTY_MODULE = { title: "", description: "", status: "draft" as "draft" | "published" };

// ─── Lesson dialog ──────────────────────────────────────────────────────────
const EMPTY_LESSON = {
  title: "",
  description: "",
  video_url: "",
  duration_minutes: "0",
  is_free_preview: false,
  status: "draft" as "draft" | "published",
};

function fmtDuration(mins: number) {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h) return `${h}j ${m}m`;
  return `${m} menit`;
}

/**
 * Ubah URL video populer (YouTube/Vimeo) menjadi URL embed
 * agar bisa diputar inline di preview.
 */
function toEmbedUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (host === "vimeo.com") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
    if (host.endsWith("loom.com")) {
      const id = u.pathname.split("/share/")[1] ?? u.pathname.split("/").pop();
      if (id) return `https://www.loom.com/embed/${id}`;
    }
    // Fallback: pakai URL apa adanya (cocok untuk .mp4 langsung)
    return url;
  } catch {
    return null;
  }
}

function KursusPage() {
  const { shop } = useShop();

  // ── View state ─────────────────────────────────────────────────
  const [view, setView] = useState<"courses" | "modules">("courses");
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // ── Data ───────────────────────────────────────────────────────
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [lessons, setLessons] = useState<Record<string, Lesson[]>>({});
  const [enrollStats, setEnrollStats] = useState<EnrollmentStat[]>([]);

  // ── Loading ────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [loadingModules, setLoadingModules] = useState(false);

  // ── Course dialog ──────────────────────────────────────────────
  const [courseDialog, setCourseDialog] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseForm, setCourseForm] = useState({ ...EMPTY_COURSE });
  const [savingCourse, setSavingCourse] = useState(false);

  // ── Module dialog ──────────────────────────────────────────────
  const [moduleDialog, setModuleDialog] = useState(false);
  const [editingModule, setEditingModule] = useState<Module | null>(null);
  const [moduleForm, setModuleForm] = useState({ ...EMPTY_MODULE });
  const [savingModule, setSavingModule] = useState(false);

  // ── Lesson dialog ──────────────────────────────────────────────
  const [lessonDialog, setLessonDialog] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [lessonForModule, setLessonForModule] = useState<string | null>(null);
  const [lessonForm, setLessonForm] = useState({ ...EMPTY_LESSON });
  const [savingLesson, setSavingLesson] = useState(false);

  // ── Load courses ───────────────────────────────────────────────
  const loadCourses = useCallback(async () => {
    if (!shop?.id) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("menu_items")
        .select("id, name, description, price, is_available, image_url")
        .eq("shop_id", shop.id)
        .eq("product_type", "course")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const items = data ?? [];
      const ids = items.map((d: any) => d.id);

      // Enrollment counts
      let statMap: Record<string, number> = {};
      if (ids.length) {
        const { data: enrolls } = await (supabase as any)
          .from("course_enrollments")
          .select("menu_item_id")
          .in("menu_item_id", ids);
        for (const e of enrolls ?? []) {
          statMap[e.menu_item_id] = (statMap[e.menu_item_id] ?? 0) + 1;
        }
      }

      // Total sold (from order_items)
      let soldMap: Record<string, number> = {};
      if (ids.length) {
        const { data: sales } = await (supabase as any)
          .from("order_items")
          .select("product_id, quantity")
          .in("product_id", ids);
        for (const s of sales ?? []) {
          soldMap[s.product_id] = (soldMap[s.product_id] ?? 0) + s.quantity;
        }
      }

      setCourses(
        items.map((d: any) => ({
          ...d,
          price: Number(d.price),
          total_sold: soldMap[d.id] ?? 0,
          enrollment_count: statMap[d.id] ?? 0,
        }))
      );
      setEnrollStats(
        ids.map((id: string) => ({ menu_item_id: id, count: statMap[id] ?? 0 }))
      );
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [shop?.id]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  // ── Load modules for a course ──────────────────────────────────
  const loadModules = useCallback(async (courseId: string) => {
    setLoadingModules(true);
    try {
      const { data: mods, error } = await (supabase as any)
        .from("course_modules")
        .select("id, menu_item_id, title, description, sort_order, status")
        .eq("menu_item_id", courseId)
        .order("sort_order", { ascending: true });
      if (error) throw error;

      const modIds = (mods ?? []).map((m: any) => m.id);
      let lessonCountMap: Record<string, number> = {};
      if (modIds.length) {
        const { data: lsns } = await (supabase as any)
          .from("course_lessons")
          .select("module_id")
          .in("module_id", modIds);
        for (const l of lsns ?? []) {
          lessonCountMap[l.module_id] = (lessonCountMap[l.module_id] ?? 0) + 1;
        }
      }

      setModules(
        (mods ?? []).map((m: any) => ({ ...m, lesson_count: lessonCountMap[m.id] ?? 0 }))
      );
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoadingModules(false);
    }
  }, []);

  // ── Load lessons for a module ──────────────────────────────────
  const loadLessons = useCallback(async (moduleId: string) => {
    const { data, error } = await (supabase as any)
      .from("course_lessons")
      .select("id, module_id, title, description, video_url, duration_minutes, sort_order, is_free_preview, status")
      .eq("module_id", moduleId)
      .order("sort_order", { ascending: true });
    if (error) { toast.error(error.message); return; }
    setLessons((prev) => ({ ...prev, [moduleId]: data ?? [] }));
  }, []);

  const toggleModule = useCallback((moduleId: string) => {
    if (expandedModule === moduleId) {
      setExpandedModule(null);
    } else {
      setExpandedModule(moduleId);
      if (!lessons[moduleId]) loadLessons(moduleId);
    }
  }, [expandedModule, lessons, loadLessons]);

  // ── Enter module management view ───────────────────────────────
  const enterCourse = (course: Course) => {
    setSelectedCourse(course);
    setView("modules");
    loadModules(course.id);
  };

  const backToCourses = () => {
    setView("courses");
    setSelectedCourse(null);
    setExpandedModule(null);
    setModules([]);
    setLessons({});
  };

  // ── Course CRUD ────────────────────────────────────────────────
  const openNewCourse = () => {
    setEditingCourse(null);
    setCourseForm({ ...EMPTY_COURSE });
    setCourseDialog(true);
  };

  const openEditCourse = (c: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCourse(c);
    setCourseForm({
      name: c.name,
      description: c.description ?? "",
      price: String(c.price),
      is_available: c.is_available,
    });
    setCourseDialog(true);
  };

  const saveCourse = async () => {
    if (!shop?.id) return;
    if (!courseForm.name.trim()) { toast.error("Nama kursus wajib diisi"); return; }
    setSavingCourse(true);
    const payload = {
      shop_id: shop.id,
      name: courseForm.name.trim(),
      description: courseForm.description?.trim() || null,
      price: Number(courseForm.price) || 0,
      is_available: courseForm.is_available,
      product_type: "course",
      track_stock: false,
    };
    let error: any;
    if (editingCourse) {
      ({ error } = await (supabase as any).from("menu_items").update(payload).eq("id", editingCourse.id));
    } else {
      ({ error } = await (supabase as any).from("menu_items").insert(payload));
    }
    setSavingCourse(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingCourse ? "Kursus diperbarui" : "Kursus ditambahkan");
    setCourseDialog(false);
    loadCourses();
  };

  const deleteCourse = async (c: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Hapus kursus "${c.name}"? Semua modul dan pelajaran di dalamnya akan ikut terhapus.`)) return;
    const { error } = await (supabase as any).from("menu_items").delete().eq("id", c.id);
    if (error) toast.error(error.message);
    else { toast.success("Kursus dihapus"); loadCourses(); }
  };

  // ── Module CRUD ────────────────────────────────────────────────
  const openNewModule = () => {
    setEditingModule(null);
    setModuleForm({ ...EMPTY_MODULE });
    setModuleDialog(true);
  };

  const openEditModule = (m: Module) => {
    setEditingModule(m);
    setModuleForm({
      title: m.title,
      description: m.description ?? "",
      status: m.status,
    });
    setModuleDialog(true);
  };

  const saveModule = async () => {
    if (!selectedCourse) return;
    if (!moduleForm.title.trim()) { toast.error("Judul modul wajib diisi"); return; }
    setSavingModule(true);
    const payload: any = {
      menu_item_id: selectedCourse.id,
      title: moduleForm.title.trim(),
      description: moduleForm.description?.trim() || null,
      status: moduleForm.status,
    };
    // Modul baru → letakkan di akhir
    if (!editingModule) payload.sort_order = modules.length;
    let error: any;
    if (editingModule) {
      ({ error } = await (supabase as any).from("course_modules").update(payload).eq("id", editingModule.id));
    } else {
      ({ error } = await (supabase as any).from("course_modules").insert(payload));
    }
    setSavingModule(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingModule ? "Modul diperbarui" : "Modul ditambahkan");
    setModuleDialog(false);
    loadModules(selectedCourse.id);
  };

  const deleteModule = async (m: Module) => {
    if (!confirm(`Hapus modul "${m.title}"? Semua pelajaran di dalamnya akan ikut terhapus.`)) return;
    const { error } = await (supabase as any).from("course_modules").delete().eq("id", m.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Modul dihapus");
      if (selectedCourse) loadModules(selectedCourse.id);
      if (expandedModule === m.id) setExpandedModule(null);
    }
  };

  // ── Lesson CRUD ────────────────────────────────────────────────
  const openNewLesson = (moduleId: string) => {
    setEditingLesson(null);
    setLessonForModule(moduleId);
    setLessonForm({ ...EMPTY_LESSON });
    setLessonDialog(true);
  };

  const openEditLesson = (l: Lesson) => {
    setEditingLesson(l);
    setLessonForModule(l.module_id);
    setLessonForm({
      title: l.title,
      description: l.description ?? "",
      video_url: l.video_url ?? "",
      duration_minutes: String(l.duration_minutes),
      is_free_preview: l.is_free_preview,
      status: l.status,
    });
    setLessonDialog(true);
  };

  const saveLesson = async () => {
    if (!lessonForModule) return;
    if (!lessonForm.title.trim()) { toast.error("Judul pelajaran wajib diisi"); return; }
    setSavingLesson(true);
    const currentLessons = lessons[lessonForModule] ?? [];
    const payload: any = {
      module_id: lessonForModule,
      title: lessonForm.title.trim(),
      description: lessonForm.description?.trim() || null,
      video_url: lessonForm.video_url?.trim() || null,
      duration_minutes: Number(lessonForm.duration_minutes) || 0,
      is_free_preview: lessonForm.is_free_preview,
      status: lessonForm.status,
    };
    if (!editingLesson) payload.sort_order = currentLessons.length;
    let error: any;
    if (editingLesson) {
      ({ error } = await (supabase as any).from("course_lessons").update(payload).eq("id", editingLesson.id));
    } else {
      ({ error } = await (supabase as any).from("course_lessons").insert(payload));
    }
    setSavingLesson(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editingLesson ? "Pelajaran diperbarui" : "Pelajaran ditambahkan");
    setLessonDialog(false);
    loadLessons(lessonForModule);
    if (selectedCourse) loadModules(selectedCourse.id);
  };

  const deleteLesson = async (l: Lesson) => {
    if (!confirm(`Hapus pelajaran "${l.title}"?`)) return;
    const { error } = await (supabase as any).from("course_lessons").delete().eq("id", l.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Pelajaran dihapus");
      loadLessons(l.module_id);
      if (selectedCourse) loadModules(selectedCourse.id);
    }
  };

  // ── Drag-and-drop reorder ──────────────────────────────────────
  const persistOrder = async (
    table: "course_modules" | "course_lessons",
    orderedIds: string[],
  ) => {
    // Update sort_order untuk semua item sesuai posisi baru.
    // Dilakukan paralel — kalau salah satu gagal, kita revalidate.
    const results = await Promise.all(
      orderedIds.map((id, idx) =>
        (supabase as any).from(table).update({ sort_order: idx }).eq("id", id),
      ),
    );
    const firstErr = results.find((r) => r.error);
    if (firstErr) toast.error(firstErr.error.message);
  };

  const reorderModules = async (oldIndex: number, newIndex: number) => {
    if (!selectedCourse) return;
    if (oldIndex === newIndex) return;
    const next = arrayMove(modules, oldIndex, newIndex).map((m, i) => ({ ...m, sort_order: i }));
    setModules(next); // optimistic
    await persistOrder("course_modules", next.map((m) => m.id));
  };

  const reorderLessons = async (moduleId: string, oldIndex: number, newIndex: number) => {
    if (oldIndex === newIndex) return;
    const list = lessons[moduleId] ?? [];
    const next = arrayMove(list, oldIndex, newIndex).map((l, i) => ({ ...l, sort_order: i }));
    setLessons((prev) => ({ ...prev, [moduleId]: next }));
    await persistOrder("course_lessons", next.map((l) => l.id));
  };

  // ── Toggle status (modul/pelajaran) ─────────────────────────────
  const toggleModuleStatus = async (m: Module) => {
    const next: "draft" | "published" = m.status === "published" ? "draft" : "published";
    const { error } = await (supabase as any).from("course_modules").update({ status: next }).eq("id", m.id);
    if (error) { toast.error(error.message); return; }
    toast.success(next === "published" ? "Modul ditayangkan" : "Modul jadi draft");
    if (selectedCourse) loadModules(selectedCourse.id);
  };

  const toggleLessonStatus = async (l: Lesson) => {
    const next: "draft" | "published" = l.status === "published" ? "draft" : "published";
    const { error } = await (supabase as any).from("course_lessons").update({ status: next }).eq("id", l.id);
    if (error) { toast.error(error.message); return; }
    toast.success(next === "published" ? "Pelajaran ditayangkan" : "Pelajaran jadi draft");
    loadLessons(l.module_id);
  };

  const toggleCourseStatus = async (c: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !c.is_available;
    const { error } = await (supabase as any).from("menu_items").update({ is_available: next }).eq("id", c.id);
    if (error) { toast.error(error.message); return; }
    toast.success(next ? "Kursus ditayangkan" : "Kursus jadi draft");
    loadCourses();
  };

  // ── Preview ────────────────────────────────────────────────────
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLessonIdx, setPreviewLessonIdx] = useState(0);
  const previewSequence = useMemo(() => {
    // Flatten modul → pelajaran sesuai urutan saat ini.
    const out: { module: Module; lesson: Lesson; moduleIdx: number; lessonIdx: number }[] = [];
    modules.forEach((mod, mi) => {
      const ls = lessons[mod.id] ?? [];
      ls.forEach((l, li) => out.push({ module: mod, lesson: l, moduleIdx: mi, lessonIdx: li }));
    });
    return out;
  }, [modules, lessons]);

  const openPreview = async () => {
    // Pastikan semua pelajaran sudah dimuat
    for (const m of modules) {
      if (!lessons[m.id]) await loadLessons(m.id);
    }
    setPreviewLessonIdx(0);
    setPreviewOpen(true);
  };

  // ── Sensors (DnD) ──────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const totalEnrollments = enrollStats.reduce((s, e) => s + e.count, 0);
  const activeCourses = courses.filter((c) => c.is_available).length;
  const totalLessons = Object.values(lessons).reduce((s, ls) => s + ls.length, 0);

  // ══════════════════════════════════════════════════════════════
  //  RENDER
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 space-y-6">

      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          {view === "modules" && (
            <Button variant="ghost" size="icon" onClick={backToCourses} className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <GraduationCap className="h-6 w-6" />
              {view === "modules" && selectedCourse
                ? `Materi: ${selectedCourse.name}`
                : "Kursus Online"}
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {view === "modules"
                ? "Kelola modul dan pelajaran video kursus ini"
                : "Kelola kursus video online & pantau progress pembeli"}
            </p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {view === "courses" && (
            <>
              <Button variant="outline" size="sm" onClick={loadCourses} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button size="sm" onClick={openNewCourse}>
                <Plus className="h-4 w-4 mr-1.5" />
                Tambah Kursus
              </Button>
            </>
          )}
          {view === "modules" && (
            <>
              <Button size="sm" variant="outline" onClick={openPreview} disabled={modules.length === 0}>
                <PlayCircle className="h-4 w-4 mr-1.5" />
                Preview
              </Button>
              <Button size="sm" onClick={openNewModule}>
                <Plus className="h-4 w-4 mr-1.5" />
                Tambah Modul
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ─── Info banner ────────────────────────────────────────── */}
      {view === "courses" && (
        <Card className="p-4 border-purple-200 bg-purple-50/50">
          <div className="flex items-start gap-2 text-purple-800 text-sm">
            <BookOpen className="h-4 w-4 mt-0.5 shrink-0" />
            <p>
              Kursus online terdiri dari modul dan pelajaran video. Pembeli mendapat akses seumur hidup
              setelah pembelian. Pantau progress belajar pembeli secara real-time.
            </p>
          </div>
        </Card>
      )}

      {/* ─── Stats ──────────────────────────────────────────────── */}
      {view === "courses" && (
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-4">
            <p className="text-2xl font-bold">{courses.length}</p>
            <p className="text-xs text-muted-foreground">Total kursus</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold">{totalEnrollments}</p>
            <p className="text-xs text-muted-foreground">Total pendaftar</p>
          </Card>
          <Card className="p-4">
            <p className="text-2xl font-bold">{activeCourses}</p>
            <p className="text-xs text-muted-foreground">Kursus aktif</p>
          </Card>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
           VIEW: COURSES
         ══════════════════════════════════════════════════════════ */}
      {view === "courses" && (
        <>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <GraduationCap className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">Belum ada kursus</p>
              <p className="text-xs text-muted-foreground mt-1">Buat kursus pertama dan tambahkan modul & pelajaran video</p>
              <Button size="sm" className="mt-4" onClick={openNewCourse}>
                <Plus className="h-4 w-4 mr-1.5" />
                Buat Kursus Pertama
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {courses.map((course) => (
                <Card
                  key={course.id}
                  className={`p-4 cursor-pointer hover:border-purple-300 transition-colors ${!course.is_available ? "opacity-60" : ""}`}
                  onClick={() => enterCourse(course)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-semibold">{course.name}</span>
                        {course.is_available ? (
                          <Badge className="text-[10px] bg-green-500 hover:bg-green-500">Aktif</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Nonaktif</Badge>
                        )}
                      </div>
                      {course.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {course.price > 0 ? `Rp ${course.price.toLocaleString("id-ID")}` : "Gratis"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {course.enrollment_count} pendaftar
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          Terjual {course.total_sold}×
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon" variant="ghost" className="h-8 w-8"
                        onClick={(e) => openEditCourse(course, e)}
                        title="Edit kursus"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => deleteCourse(course, e)}
                        title="Hapus kursus"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                      <div className="flex items-center gap-1 text-xs text-primary font-medium ml-1">
                        Kelola Materi
                        <ChevronRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════
           VIEW: MODULES & LESSONS
         ══════════════════════════════════════════════════════════ */}
      {view === "modules" && selectedCourse && (
        <>
          {/* Course summary */}
          <Card className="p-4 bg-purple-50/50 border-purple-200">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="text-sm">
                <span className="font-medium">{selectedCourse.name}</span>
                <span className="text-muted-foreground ml-2">
                  Rp {selectedCourse.price.toLocaleString("id-ID")} · {selectedCourse.enrollment_count} pendaftar
                </span>
              </div>
              <Badge variant="outline" className="text-xs">
                {modules.length} modul · {modules.reduce((s, m) => s + m.lesson_count, 0)} pelajaran
              </Badge>
            </div>
          </Card>

          {loadingModules ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : modules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border py-16 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium">Belum ada modul</p>
              <p className="text-xs text-muted-foreground mt-1">Tambahkan modul pertama, lalu isi dengan pelajaran video</p>
              <Button size="sm" className="mt-4" onClick={openNewModule}>
                <Plus className="h-4 w-4 mr-1.5" />
                Tambah Modul Pertama
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e: DragEndEvent) => {
                const { active, over } = e;
                if (!over || active.id === over.id) return;
                const oldIdx = modules.findIndex((m) => m.id === active.id);
                const newIdx = modules.findIndex((m) => m.id === over.id);
                if (oldIdx >= 0 && newIdx >= 0) reorderModules(oldIdx, newIdx);
              }}
            >
              <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-3">
                  {modules.map((mod, idx) => (
                    <SortableModuleCard
                      key={mod.id}
                      mod={mod}
                      idx={idx}
                      isExpanded={expandedModule === mod.id}
                      lessons={lessons[mod.id] ?? []}
                      sensors={sensors}
                      onToggle={() => toggleModule(mod.id)}
                      onEdit={() => openEditModule(mod)}
                      onDelete={() => deleteModule(mod)}
                      onToggleStatus={() => toggleModuleStatus(mod)}
                      onNewLesson={() => openNewLesson(mod.id)}
                      onEditLesson={(l) => openEditLesson(l)}
                      onDeleteLesson={(l) => deleteLesson(l)}
                      onToggleLessonStatus={(l) => toggleLessonStatus(l)}
                      onReorderLessons={(o, n) => reorderLessons(mod.id, o, n)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </>
      )}

      {/* Preview dialog (modul → pelajaran berurutan) */}
      <CoursePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        course={selectedCourse}
        sequence={previewSequence}
        index={previewLessonIdx}
        setIndex={setPreviewLessonIdx}
      />

      {/* ═══════════════════════════════════════════════════════════
           DIALOGS
         ═══════════════════════════════════════════════════════════ */}

      {/* Course dialog */}
      <Dialog open={courseDialog} onOpenChange={setCourseDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCourse ? "Edit Kursus" : "Tambah Kursus Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nama Kursus *</Label>
              <Input
                value={courseForm.name}
                onChange={(e) => setCourseForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="cth: Kursus Desain Grafis Pemula"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea
                value={courseForm.description}
                onChange={(e) => setCourseForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Apa yang akan dipelajari di kursus ini?"
                rows={3}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Harga (Rp)</Label>
              <Input
                type="number" min={0}
                value={courseForm.price}
                onChange={(e) => setCourseForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="0 = Gratis"
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={courseForm.is_available}
                onCheckedChange={(v) => setCourseForm((f) => ({ ...f, is_available: v }))}
              />
              <Label>Aktif dijual</Label>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setCourseDialog(false)}>
                Batal
              </Button>
              <Button className="flex-1" onClick={saveCourse} disabled={savingCourse}>
                {savingCourse ? "Menyimpan…" : editingCourse ? "Simpan Perubahan" : "Tambah Kursus"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Module dialog */}
      <Dialog open={moduleDialog} onOpenChange={setModuleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingModule ? "Edit Modul" : "Tambah Modul"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Judul Modul *</Label>
              <Input
                value={moduleForm.title}
                onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="cth: Pengenalan Desain, Dasar-dasar Warna"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Deskripsi Modul</Label>
              <Textarea
                value={moduleForm.description}
                onChange={(e) => setModuleForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Gambaran singkat isi modul ini"
                rows={3}
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Switch
                checked={moduleForm.status === "published"}
                onCheckedChange={(v) => setModuleForm((f) => ({ ...f, status: v ? "published" : "draft" }))}
              />
              <div className="flex-1">
                <Label>{moduleForm.status === "published" ? "Tayang" : "Draft"}</Label>
                <p className="text-xs text-muted-foreground">
                  {moduleForm.status === "published"
                    ? "Modul ini terlihat oleh pembeli"
                    : "Modul disimpan tapi belum terlihat oleh pembeli"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setModuleDialog(false)}>Batal</Button>
              <Button className="flex-1" onClick={saveModule} disabled={savingModule}>
                {savingModule ? "Menyimpan…" : editingModule ? "Simpan" : "Tambah Modul"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Lesson dialog */}
      <Dialog open={lessonDialog} onOpenChange={setLessonDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLesson ? "Edit Pelajaran" : "Tambah Pelajaran"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Judul Pelajaran *</Label>
              <Input
                value={lessonForm.title}
                onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="cth: Apa itu Desain Grafis?"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Deskripsi</Label>
              <Textarea
                value={lessonForm.description}
                onChange={(e) => setLessonForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Ringkasan pelajaran ini"
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label>URL Video</Label>
              <Input
                value={lessonForm.video_url}
                onChange={(e) => setLessonForm((f) => ({ ...f, video_url: e.target.value }))}
                placeholder="https://www.youtube.com/watch?v=... atau Vimeo, Loom, dll."
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                YouTube, Vimeo, Loom, atau URL video langsung
              </p>
            </div>
            <div>
              <Label>Durasi (menit)</Label>
              <Input
                type="number" min={0}
                value={lessonForm.duration_minutes}
                onChange={(e) => setLessonForm((f) => ({ ...f, duration_minutes: e.target.value }))}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={lessonForm.is_free_preview}
                onCheckedChange={(v) => setLessonForm((f) => ({ ...f, is_free_preview: v }))}
              />
              <div>
                <Label>Pratinjau Gratis</Label>
                <p className="text-xs text-muted-foreground">Calon pembeli bisa nonton pelajaran ini tanpa beli</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-border p-3">
              <Switch
                checked={lessonForm.status === "published"}
                onCheckedChange={(v) => setLessonForm((f) => ({ ...f, status: v ? "published" : "draft" }))}
              />
              <div className="flex-1">
                <Label>{lessonForm.status === "published" ? "Tayang" : "Draft"}</Label>
                <p className="text-xs text-muted-foreground">
                  {lessonForm.status === "published"
                    ? "Pelajaran ini terlihat oleh pembeli"
                    : "Pelajaran disimpan tapi belum terlihat"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setLessonDialog(false)}>Batal</Button>
              <Button className="flex-1" onClick={saveLesson} disabled={savingLesson}>
                {savingLesson ? "Menyimpan…" : editingLesson ? "Simpan" : "Tambah Pelajaran"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Sortable Module Card (drag-and-drop wrapper)
// ════════════════════════════════════════════════════════════════════════════
function SortableModuleCard(props: {
  mod: Module;
  idx: number;
  isExpanded: boolean;
  lessons: Lesson[];
  sensors: ReturnType<typeof useSensors>;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
  onNewLesson: () => void;
  onEditLesson: (l: Lesson) => void;
  onDeleteLesson: (l: Lesson) => void;
  onToggleLessonStatus: (l: Lesson) => void;
  onReorderLessons: (oldIdx: number, newIdx: number) => void;
}) {
  const { mod, idx, isExpanded, lessons, sensors } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: mod.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors">
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground/60 hover:text-foreground"
            {...attributes}
            {...listeners}
            aria-label="Geser untuk mengurutkan modul"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <span className="flex items-center justify-center h-6 w-6 rounded-full bg-purple-100 text-purple-700 text-xs font-bold shrink-0">
            {idx + 1}
          </span>
          <button
            type="button"
            onClick={props.onToggle}
            className="flex-1 min-w-0 text-left"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-sm">{mod.title}</p>
              {mod.status === "published" ? (
                <Badge className="text-[10px] bg-green-500 hover:bg-green-500">
                  <Globe className="h-2.5 w-2.5 mr-1" />Tayang
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px]">
                  <FileText className="h-2.5 w-2.5 mr-1" />Draft
                </Badge>
              )}
            </div>
            {mod.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{mod.description}</p>
            )}
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-muted-foreground mr-1">{mod.lesson_count} pelajaran</span>
            <Button size="icon" variant="ghost" className="h-7 w-7"
              title={mod.status === "published" ? "Jadikan draft" : "Tayangkan"}
              onClick={props.onToggleStatus}>
              {mod.status === "published"
                ? <FileText className="h-3 w-3" />
                : <Globe className="h-3 w-3" />}
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={props.onEdit}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={props.onDelete}>
              <Trash2 className="h-3 w-3" />
            </Button>
            <button type="button" onClick={props.onToggle} className="ml-1 text-muted-foreground">
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-border bg-muted/20">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={(e: DragEndEvent) => {
                const { active, over } = e;
                if (!over || active.id === over.id) return;
                const o = lessons.findIndex((l) => l.id === active.id);
                const n = lessons.findIndex((l) => l.id === over.id);
                if (o >= 0 && n >= 0) props.onReorderLessons(o, n);
              }}
            >
              <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                {lessons.map((lesson, li) => (
                  <SortableLessonRow
                    key={lesson.id}
                    lesson={lesson}
                    li={li}
                    onEdit={() => props.onEditLesson(lesson)}
                    onDelete={() => props.onDeleteLesson(lesson)}
                    onToggleStatus={() => props.onToggleLessonStatus(lesson)}
                  />
                ))}
              </SortableContext>
            </DndContext>
            <div className="px-4 py-3">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={props.onNewLesson}>
                <Plus className="h-3.5 w-3.5" />
                Tambah Pelajaran
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function SortableLessonRow(props: {
  lesson: Lesson;
  li: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleStatus: () => void;
}) {
  const { lesson, li } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lesson.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}
      className="flex items-center gap-3 px-4 py-3 border-b border-border/50 last:border-b-0 bg-background/40">
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing pl-2 text-muted-foreground/60 hover:text-foreground"
        {...attributes} {...listeners}
        aria-label="Geser untuk mengurutkan pelajaran"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <Video className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium">{li + 1}. {lesson.title}</span>
          {lesson.status === "published" ? (
            <Badge className="text-[10px] bg-green-500 hover:bg-green-500">
              <Globe className="h-2.5 w-2.5 mr-1" />Tayang
            </Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">
              <FileText className="h-2.5 w-2.5 mr-1" />Draft
            </Badge>
          )}
          {lesson.is_free_preview && (
            <Badge variant="secondary" className="text-[10px]">
              <Eye className="h-2.5 w-2.5 mr-1" />Pratinjau
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" />
            {fmtDuration(lesson.duration_minutes)}
          </span>
          {lesson.video_url && (
            <a href={lesson.video_url} target="_blank" rel="noopener noreferrer"
              className="text-primary hover:underline truncate max-w-[180px]"
              onClick={(e) => e.stopPropagation()}>
              {lesson.video_url}
            </a>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="icon" variant="ghost" className="h-7 w-7"
          title={lesson.status === "published" ? "Jadikan draft" : "Tayangkan"}
          onClick={props.onToggleStatus}>
          {lesson.status === "published"
            ? <FileText className="h-3 w-3" />
            : <Globe className="h-3 w-3" />}
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={props.onEdit}>
          <Pencil className="h-3 w-3" />
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={props.onDelete}>
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  Course Preview Dialog (putar alur modul → pelajaran)
// ════════════════════════════════════════════════════════════════════════════
function CoursePreviewDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  course: Course | null;
  sequence: { module: Module; lesson: Lesson; moduleIdx: number; lessonIdx: number }[];
  index: number;
  setIndex: (i: number) => void;
}) {
  const { open, onOpenChange, course, sequence, index, setIndex } = props;
  const current = sequence[index];
  const totalMinutes = sequence.reduce((s, x) => s + (x.lesson.duration_minutes || 0), 0);
  const embed = toEmbedUrl(current?.lesson.video_url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Preview Kursus: {course?.name}
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            {sequence.length} pelajaran · total {fmtDuration(totalMinutes)} · simulasi tampilan pembeli
          </p>
        </DialogHeader>

        {sequence.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Belum ada pelajaran untuk dipreview. Tambahkan modul dan pelajaran terlebih dahulu.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-0">
            {/* Player */}
            <div className="p-5 space-y-3 min-w-0">
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-black flex items-center justify-center">
                {embed ? (
                  <iframe
                    src={embed}
                    title={current.lesson.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="text-center text-muted-foreground text-sm p-6">
                    <Video className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    <p>Pelajaran ini belum memiliki URL video.</p>
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Modul {current.moduleIdx + 1} · Pelajaran {current.lessonIdx + 1}
                </div>
                <h3 className="text-lg font-semibold flex items-center gap-2 flex-wrap">
                  {current.lesson.title}
                  {current.lesson.status === "draft" && (
                    <Badge variant="outline" className="text-[10px]"><FileText className="h-2.5 w-2.5 mr-1" />Draft</Badge>
                  )}
                  {current.lesson.is_free_preview && (
                    <Badge variant="secondary" className="text-[10px]"><Eye className="h-2.5 w-2.5 mr-1" />Pratinjau Gratis</Badge>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground flex items-center gap-3 flex-wrap">
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{fmtDuration(current.lesson.duration_minutes)}</span>
                  <span className="truncate">Bagian dari: <b>{current.module.title}</b></span>
                  {current.lesson.video_url && (
                    <a href={current.lesson.video_url} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1 truncate max-w-[220px]">
                      <ExternalLink className="h-3 w-3" />Buka video
                    </a>
                  )}
                </p>
                {current.lesson.description && (
                  <p className="text-sm text-muted-foreground pt-2">{current.lesson.description}</p>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 gap-2">
                <Button variant="outline" size="sm" disabled={index === 0}
                  onClick={() => setIndex(Math.max(0, index - 1))}>
                  <ChevronLeft className="h-4 w-4 mr-1" />Sebelumnya
                </Button>
                <span className="text-xs text-muted-foreground">
                  {index + 1} / {sequence.length}
                </span>
                <Button size="sm" disabled={index >= sequence.length - 1}
                  onClick={() => setIndex(Math.min(sequence.length - 1, index + 1))}>
                  Berikutnya<ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>

            {/* Sidebar: outline */}
            <div className="border-t md:border-t-0 md:border-l border-border bg-muted/30 max-h-[70vh] overflow-y-auto">
              <div className="p-3 space-y-3">
                {(() => {
                  const grouped: Record<string, { module: Module; items: typeof sequence }> = {};
                  sequence.forEach((s) => {
                    if (!grouped[s.module.id]) grouped[s.module.id] = { module: s.module, items: [] };
                    grouped[s.module.id].items.push(s);
                  });
                  return Object.values(grouped).map((g) => (
                    <div key={g.module.id}>
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground px-1 mb-1">
                        {g.module.title}
                        {g.module.status === "draft" && <FileText className="h-3 w-3" />}
                      </div>
                      <div className="space-y-0.5">
                        {g.items.map((s) => {
                          const i = sequence.indexOf(s);
                          const active = i === index;
                          return (
                            <button
                              key={s.lesson.id}
                              type="button"
                              onClick={() => setIndex(i)}
                              className={`w-full text-left text-xs px-2 py-1.5 rounded flex items-center gap-2 ${
                                active ? "bg-primary text-primary-foreground" : "hover:bg-background/80"
                              }`}
                            >
                              <PlayCircle className="h-3 w-3 shrink-0" />
                              <span className="flex-1 truncate">{s.lesson.title}</span>
                              <span className={`text-[10px] ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                                {fmtDuration(s.lesson.duration_minutes)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
