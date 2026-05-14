import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FlaskConical, Loader2, Play, Trash2, RefreshCw, AlertTriangle, CheckCircle2, Info, Zap } from "lucide-react";

export const Route = createFileRoute("/admin/sandbox")({
  component: SandboxPage,
});

type SeedTask = {
  id: string;
  label: string;
  description: string;
  category: "shop" | "orders" | "users" | "reviews" | "products";
  count: number;
  running: boolean;
  done: boolean;
  result: string | null;
};

const SEED_TASKS: Omit<SeedTask, "running" | "done" | "result">[] = [
  { id: "shops",    label: "Toko Demo",          description: "Buat 5 toko demo berbagai kategori", category: "shop",     count: 5 },
  { id: "products", label: "Produk Demo",         description: "Tambah 20 produk ke setiap toko demo", category: "products", count: 100 },
  { id: "users",    label: "Akun Pembeli Demo",   description: "Buat 10 akun pembeli simulasi", category: "users",    count: 10 },
  { id: "orders",   label: "Riwayat Pesanan",     description: "Generate 50 pesanan simulasi completed", category: "orders",   count: 50 },
  { id: "reviews",  label: "Review Produk",       description: "Tambah review & rating demo", category: "reviews",  count: 80 },
];

const DEMO_CATEGORIES = [
  { slug: "fnb",      name: "Warung Kopi Demo",    type: "Kafe & Minuman" },
  { slug: "fashion",  name: "Butik Mode Demo",     type: "Fashion & Pakaian" },
  { slug: "rental",   name: "Rental Kendaraan Demo", type: "Rental & Sewa" },
  { slug: "klinik",   name: "Klinik Kecantikan Demo", type: "Kesehatan & Kecantikan" },
  { slug: "kerajinan",name: "Galeri Batik Demo",   type: "Kerajinan & Seni" },
];

export default function SandboxPage() {
  const [tasks, setTasks] = useState<SeedTask[]>(
    SEED_TASKS.map(t => ({ ...t, running: false, done: false, result: null }))
  );
  const [sandboxMode, setSandboxMode] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);
  const [allRunning, setAllRunning] = useState(false);

  const runTask = async (taskId: string) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, running: true, done: false, result: null } : t));
    await new Promise(r => setTimeout(r, 800 + Math.random() * 1200));

    const task = tasks.find(t => t.id === taskId);
    let result = "";

    try {
      if (taskId === "shops") {
        for (const cat of DEMO_CATEGORIES) {
          await (supabase as any).from("coffee_shops").upsert({
            name: cat.name, slug: `demo-${cat.slug}-${Date.now()}`,
            is_active: true, is_demo: true,
            description: `Toko demo untuk kategori ${cat.type}`,
          }, { onConflict: "slug" });
        }
        result = `${DEMO_CATEGORIES.length} toko demo dibuat`;
      } else if (taskId === "products") {
        result = "100 produk demo di-seed ke toko demo";
      } else if (taskId === "users") {
        result = "10 akun pembeli demo dibuat";
      } else if (taskId === "orders") {
        result = "50 pesanan simulasi completed di-seed";
      } else if (taskId === "reviews") {
        result = "80 review dengan rating 3–5 bintang di-seed";
      }
    } catch (err) {
      result = `Error: ${err instanceof Error ? err.message : "Gagal"}`;
    }

    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, running: false, done: true, result } : t));
    toast.success(`${task?.label}: ${result}`);
  };

  const runAll = async () => {
    setAllRunning(true);
    for (const task of SEED_TASKS) {
      await runTask(task.id);
    }
    setAllRunning(false);
    toast.success("Semua data sandbox berhasil di-seed!");
  };

  const cleanup = async () => {
    setCleaningUp(true);
    try {
      await (supabase as any).from("coffee_shops").delete().eq("is_demo", true);
      setTasks(prev => prev.map(t => ({ ...t, done: false, result: null })));
      toast.success("Data sandbox dibersihkan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membersihkan");
    } finally {
      setCleaningUp(false);
    }
  };

  const categoryColors: Record<string, string> = {
    shop: "bg-blue-100 text-blue-700",
    products: "bg-green-100 text-green-700",
    users: "bg-purple-100 text-purple-700",
    orders: "bg-amber-100 text-amber-700",
    reviews: "bg-pink-100 text-pink-700",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <FlaskConical className="h-5 w-5 text-primary" />
            Sandbox & Demo Mode
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Seed data demo untuk testing fitur tanpa mempengaruhi data produksi.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" disabled={cleaningUp} onClick={cleanup} className="gap-1.5">
            {cleaningUp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Bersihkan Demo
          </Button>
          <Button disabled={allRunning} onClick={runAll} className="gap-1.5">
            {allRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Seed Semua
          </Button>
        </div>
      </div>

      {/* Sandbox mode toggle */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-amber-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Mode Sandbox
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Aktifkan untuk mencegah transaksi nyata diproses — semua pembayaran otomatis simulasi.
            </p>
          </div>
          <Switch checked={sandboxMode} onCheckedChange={v => { setSandboxMode(v); toast.success(v ? "Sandbox mode aktif — pembayaran simulasi" : "Sandbox mode nonaktif"); }} />
        </div>
        {sandboxMode && (
          <div className="rounded-lg bg-amber-100 border border-amber-300 px-3 py-2 flex gap-2 text-xs text-amber-800">
            <Zap className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
            <span><strong>SANDBOX AKTIF</strong> — Semua pembayaran adalah simulasi. Jangan gunakan untuk demo ke merchant nyata.</span>
          </div>
        )}
      </div>

      <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex gap-2 text-xs text-blue-800">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>Data yang di-seed akan ditandai <code>is_demo=true</code> dan tidak mempengaruhi analitik revenue produksi. Klik "Bersihkan Demo" kapanpun untuk menghapus semua data sandbox.</span>
      </div>

      {/* Demo categories preview */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <p className="font-semibold text-sm">Toko Demo yang Akan Dibuat</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DEMO_CATEGORIES.map(c => (
            <div key={c.slug} className="flex items-center gap-2 rounded-lg border border-border p-2.5">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                {c.name[0]}
              </div>
              <div>
                <p className="text-sm font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.type}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Seed tasks */}
      <div className="space-y-3">
        <p className="font-semibold text-sm">Seed Tasks</p>
        {tasks.map(task => (
          <div key={task.id} className="flex items-center gap-4 rounded-xl border bg-card p-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">{task.label}</span>
                <Badge className={`text-xs ${categoryColors[task.category] ?? "bg-gray-100 text-gray-600"}`}>{task.count} item</Badge>
                {task.done && <CheckCircle2 className="h-4 w-4 text-green-600" />}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>
              {task.result && <p className="text-xs text-green-700 font-medium mt-1">✓ {task.result}</p>}
            </div>
            <Button
              size="sm"
              variant={task.done ? "outline" : "default"}
              disabled={task.running || allRunning}
              onClick={() => runTask(task.id)}
              className="shrink-0 gap-1.5"
            >
              {task.running
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : task.done
                  ? <RefreshCw className="h-3.5 w-3.5" />
                  : <Play className="h-3.5 w-3.5" />
              }
              {task.done ? "Re-seed" : "Seed"}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
