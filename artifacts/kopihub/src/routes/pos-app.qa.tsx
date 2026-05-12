import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Loader2, MessageCircle, CheckCircle2, EyeOff } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/qa")({
  head: () => ({ meta: [{ title: "Q&A Produk" }] }),
  component: QAPage,
});

type QA = {
  id: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  is_hidden: boolean;
  created_at: string;
  product: { name: string } | null;
};

type Tab = "unanswered" | "answered";

function QAPage() {
  const { shop } = useCurrentShop();
  const [items, setItems] = useState<QA[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("unanswered");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [hiding, setHiding] = useState<string | null>(null);

  const load = async () => {
    if (!shop?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("product_qa")
      .select("id, question, answer, answered_at, is_hidden, created_at, product:menu_items(name)")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(200);
    setItems((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [shop?.id]);

  const answer = async (id: string) => {
    const text = drafts[id]?.trim();
    if (!text) { toast.error("Tulis jawaban terlebih dahulu"); return; }
    setSaving(id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("product_qa")
      .update({ answer: text.slice(0, 2000), answered_by: user?.id, answered_at: new Date().toISOString() })
      .eq("id", id);
    setSaving(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Jawaban terkirim!");
    setDrafts((d) => { const n = { ...d }; delete n[id]; return n; });
    load();
  };

  const toggleHide = async (qa: QA) => {
    setHiding(qa.id);
    const { error } = await supabase
      .from("product_qa")
      .update({ is_hidden: !qa.is_hidden })
      .eq("id", qa.id);
    setHiding(null);
    if (error) toast.error(error.message);
    else load();
  };

  const unanswered = items.filter((q) => !q.answer && !q.is_hidden);
  const answered = items.filter((q) => q.answer);
  const displayed = tab === "unanswered" ? unanswered : answered;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Q&A Produk</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Pertanyaan dari calon pembeli tentang produkmu.
          </p>
        </div>
        {unanswered.length > 0 && (
          <Badge variant="destructive" className="text-xs">
            {unanswered.length} belum dijawab
          </Badge>
        )}
      </div>

      <div className="flex gap-2 border-b border-border">
        {(["unanswered", "answered"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-2 px-1 text-sm font-medium transition-colors border-b-2 ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "unanswered"
              ? `Perlu Dijawab${unanswered.length > 0 ? ` (${unanswered.length})` : ""}`
              : `Sudah Dijawab (${answered.length})`
            }
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">
          <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {tab === "unanswered"
              ? "Tidak ada pertanyaan yang perlu dijawab."
              : "Belum ada pertanyaan yang terjawab."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((qa) => (
            <div key={qa.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  <HelpCircle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  <div className="min-w-0">
                    {qa.product && (
                      <p className="text-[11px] text-muted-foreground mb-0.5">
                        Produk: <span className="font-medium">{qa.product.name}</span>
                      </p>
                    )}
                    <p className="text-sm font-medium leading-snug">{qa.question}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(qa.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleHide(qa)}
                  disabled={hiding === qa.id}
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  title={qa.is_hidden ? "Tampilkan" : "Sembunyikan"}
                >
                  {hiding === qa.id
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <EyeOff className="h-4 w-4" />
                  }
                </button>
              </div>

              {qa.answer ? (
                <div className="ml-6 rounded-md bg-primary/5 border border-primary/10 px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-semibold text-primary">Jawabanmu</span>
                    {qa.answered_at && (
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        {new Date(qa.answered_at).toLocaleDateString("id-ID")}
                      </span>
                    )}
                  </div>
                  <p className="text-sm whitespace-pre-line leading-snug">{qa.answer}</p>
                </div>
              ) : (
                <div className="ml-6 space-y-2">
                  <Textarea
                    placeholder="Tulis jawaban yang membantu calon pembeli…"
                    value={drafts[qa.id] ?? ""}
                    onChange={(e) => setDrafts((d) => ({ ...d, [qa.id]: e.target.value }))}
                    rows={3}
                    maxLength={2000}
                  />
                  <Button
                    size="sm"
                    onClick={() => answer(qa.id)}
                    disabled={saving === qa.id}
                  >
                    {saving === qa.id && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
                    Kirim Jawaban
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
