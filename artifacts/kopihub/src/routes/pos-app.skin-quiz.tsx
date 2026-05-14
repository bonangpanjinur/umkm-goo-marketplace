import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Sparkles, Plus, Pencil, Trash2, Loader2, CheckCircle2, ChevronRight, X } from "lucide-react";

export const Route = createFileRoute("/pos-app/skin-quiz")({
  head: () => ({ meta: [{ title: "Quiz Rekomendasi Produk" }] }),
  component: SkinQuizPage,
});

type QuizQuestion = {
  id: string;
  question: string;
  options: { label: string; skin_type: string }[];
};

type SkinResult = {
  id: string;
  skin_type: string;
  label: string;
  description: string;
  product_ids: string[];
  product_names: string[];
};

type QuizConfig = {
  id: string;
  title: string;
  subtitle: string | null;
  is_active: boolean;
  questions: QuizQuestion[];
  results: SkinResult[];
};

const SQL_HINT = `CREATE TABLE IF NOT EXISTS public.shop_skin_quiz (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Kenali Jenis Kulitmu',
  subtitle text,
  is_active boolean NOT NULL DEFAULT false,
  questions jsonb NOT NULL DEFAULT '[]',
  results jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);`;

const DEFAULT_QUESTIONS: QuizQuestion[] = [
  {
    id: "q1",
    question: "Bagaimana kondisi kulit wajah kamu di siang hari?",
    options: [
      { label: "Berminyak di seluruh area", skin_type: "oily" },
      { label: "Kering dan terasa tegang", skin_type: "dry" },
      { label: "Berminyak di T-zone, kering di pipi", skin_type: "combination" },
      { label: "Mudah merah atau gatal", skin_type: "sensitive" },
    ],
  },
  {
    id: "q2",
    question: "Seberapa sering kulitmu berjerawat?",
    options: [
      { label: "Sering (setiap minggu)", skin_type: "oily" },
      { label: "Jarang atau tidak pernah", skin_type: "dry" },
      { label: "Kadang-kadang di hidung/dagu", skin_type: "combination" },
      { label: "Mudah breakout karena produk", skin_type: "sensitive" },
    ],
  },
];

const DEFAULT_RESULTS: SkinResult[] = [
  { id: "r1", skin_type: "oily", label: "Kulit Berminyak", description: "Kulitmu cenderung bersinar dan mudah berjerawat. Butuh produk oil-control dan non-comedogenic.", product_ids: [], product_names: [] },
  { id: "r2", skin_type: "dry", label: "Kulit Kering", description: "Kulitmu butuh hidrasi ekstra. Pilih produk dengan kandungan hyaluronic acid dan ceramide.", product_ids: [], product_names: [] },
  { id: "r3", skin_type: "combination", label: "Kulit Kombinasi", description: "Zona T berminyak, pipi kering. Butuh produk yang menyeimbangkan kadar minyak.", product_ids: [], product_names: [] },
  { id: "r4", skin_type: "sensitive", label: "Kulit Sensitif", description: "Kulitmu mudah bereaksi. Pilih produk bebas parfum, hypoallergenic, dan sudah uji dermatologis.", product_ids: [], product_names: [] },
];

export default function SkinQuizPage() {
  const { shop } = useCurrentShop();
  const [config, setConfig] = useState<QuizConfig | null>(null);
  const [menuItems, setMenuItems] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSql, setShowSql] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editResultIdx, setEditResultIdx] = useState<number | null>(null);
  const [editQuestionIdx, setEditQuestionIdx] = useState<number | null>(null);

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const [quizRes, menuRes] = await Promise.all([
      (supabase as any).from("shop_skin_quiz").select("*").eq("shop_id", shopId).maybeSingle(),
      (supabase as any).from("menu_items").select("id, name").eq("shop_id", shopId).eq("is_available", true).order("name").limit(100),
    ]);
    if (quizRes.error?.message?.includes("exist")) setShowSql(true);
    setConfig(quizRes.data ?? {
      id: "", title: "Kenali Jenis Kulitmu", subtitle: "Jawab 2 pertanyaan, dapatkan rekomendasi produk terbaik", is_active: false,
      questions: DEFAULT_QUESTIONS, results: DEFAULT_RESULTS,
    });
    setMenuItems(menuRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const save = async () => {
    if (!shop || !config) return;
    setSaving(true);
    try {
      if (config.id) {
        await (supabase as any).from("shop_skin_quiz").update(config).eq("id", config.id);
      } else {
        const { data } = await (supabase as any).from("shop_skin_quiz").insert({ ...config, shop_id: shop.id }).select().maybeSingle();
        if (data) setConfig(c => c ? { ...c, id: data.id } : c);
      }
      toast.success("Quiz disimpan");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal");
    } finally { setSaving(false); }
  };

  const upd = <K extends keyof QuizConfig>(k: K, v: QuizConfig[K]) =>
    setConfig(c => c ? { ...c, [k]: v } : c);

  const toggleProduct = (resultIdx: number, productId: string, productName: string) => {
    if (!config) return;
    const results = [...config.results];
    const r = { ...results[resultIdx] };
    if (r.product_ids.includes(productId)) {
      r.product_ids = r.product_ids.filter(id => id !== productId);
      r.product_names = r.product_names.filter(n => n !== productName);
    } else {
      r.product_ids = [...r.product_ids, productId];
      r.product_names = [...r.product_names, productName];
    }
    results[resultIdx] = r;
    setConfig(c => c ? { ...c, results } : c);
  };

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold"><Sparkles className="h-5 w-5 text-primary" /> Quiz Rekomendasi Produk</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">Quiz interaktif jenis kulit — tampil di halaman toko, arahkan ke produk yang tepat.</p>
        </div>
        <Button onClick={save} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Simpan Quiz
        </Button>
      </div>

      {showSql && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-800">Tabel quiz belum ada:</p>
          <pre className="mt-2 rounded bg-amber-100 p-2 text-xs font-mono overflow-x-auto">{SQL_HINT}</pre>
        </div>
      )}

      {loading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : config ? (
        <div className="space-y-5">
          {/* Basic settings */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Pengaturan Dasar</p>
              <div className="flex items-center gap-2">
                <Switch checked={config.is_active} onCheckedChange={v => upd("is_active", v)} />
                <span className="text-sm">{config.is_active ? "Aktif" : "Nonaktif"}</span>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Judul Quiz</Label>
              <Input value={config.title} onChange={e => upd("title", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Subtitle (opsional)</Label>
              <Input value={config.subtitle ?? ""} onChange={e => upd("subtitle", e.target.value)} placeholder="Jawab 2 pertanyaan singkat..." />
            </div>
          </div>

          {/* Pertanyaan */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <p className="font-semibold">Pertanyaan Quiz ({config.questions.length})</p>
            {config.questions.map((q, qi) => (
              <div key={q.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-medium">{qi + 1}. {q.question}</span>
                  <Button size="sm" variant="ghost" onClick={() => setEditQuestionIdx(qi)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1">
                  {q.options.map(o => <Badge key={o.skin_type} variant="secondary" className="text-xs">{o.label}</Badge>)}
                </div>
              </div>
            ))}
          </div>

          {/* Hasil quiz */}
          <div className="rounded-xl border bg-card p-4 space-y-3">
            <p className="font-semibold">Hasil & Produk Rekomendasi</p>
            {config.results.map((r, ri) => (
              <div key={r.id} className="rounded-lg border border-border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-sm">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.description}</p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => setEditResultIdx(ri)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {r.product_names.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {r.product_names.map(n => <Badge key={n} className="bg-primary/10 text-primary text-xs">{n}</Badge>)}
                  </div>
                )}
                {r.product_names.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Belum ada produk dipilih. Klik edit untuk tambah produk rekomendasi.</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Edit result dialog */}
      {editResultIdx !== null && config && (
        <Dialog open onOpenChange={() => setEditResultIdx(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Hasil: {config.results[editResultIdx].label}</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Deskripsi</Label>
                <Textarea rows={3} value={config.results[editResultIdx].description}
                  onChange={e => {
                    const results = [...config.results];
                    results[editResultIdx] = { ...results[editResultIdx], description: e.target.value };
                    setConfig(c => c ? { ...c, results } : c);
                  }} />
              </div>
              <div className="space-y-2">
                <Label>Produk Rekomendasi</Label>
                <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
                  {menuItems.map(m => {
                    const checked = config.results[editResultIdx].product_ids.includes(m.id);
                    return (
                      <label key={m.id} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent cursor-pointer">
                        <input type="checkbox" checked={checked} onChange={() => toggleProduct(editResultIdx, m.id, m.name)} className="rounded" />
                        <span className="text-sm">{m.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => { setEditResultIdx(null); toast.success("Perubahan disimpan (klik Simpan Quiz untuk finalisasi)"); }}>Selesai</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
