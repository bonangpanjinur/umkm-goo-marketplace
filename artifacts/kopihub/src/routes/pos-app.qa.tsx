import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Loader2, MessageCircle, CheckCircle2, EyeOff, Pin, PinOff } from "lucide-react";
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
  is_pinned: boolean;
  created_at: string;
  product: { name: string } | null;
};

type Tab = "unanswered" | "answered" | "faq";

function QAPage() {
  const { shop } = useCurrentShop();
  const [items, setItems] = useState<QA[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("unanswered");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [hiding, setHiding] = useState<string | null>(null);
  const [pinning, setPinning] = useState<string | null>(null);

  const load = async () => {
    if (!shop?.id) return;
    setLoading(true);
    const { data } = await supabase
      .from("product_qa")
      .select("id, question, answer, answered_at, is_hidden, is_pinned, created_at, product:menu_items(name)")
      .eq("shop_id", shop.id)
      .order("is_pinned", { ascending: false })
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

  const togglePin = async (qa: QA) => {
    if (!qa.answer) {
      toast.error("Pertanyaan harus dijawab dulu sebelum dijadikan FAQ.");
      return;
    }
    setPinning(qa.id);
    const { error } = await supabase
      .from("product_qa")
      .update({ is_pinned: !qa.is_pinned })
      .eq("id", qa.id);
    setPinning(null);
    if (error) toast.error(error.message);
    else {
      toast.success(qa.is_pinned ? "Dihapus dari FAQ penting." : "✅ Ditandai sebagai FAQ penting! Akan muncul di atas halaman produk.");
      load();
    }
  };

  const unanswered = items.filter((q) => !q.answer && !q.is_hidden);
  const answered   = items.filter((q) => !!q.answer && !q.is_pinned);
  const faq        = items.filter((q) => q.is_pinned && !!q.answer);

  const displayed: QA[] =
    tab === "unanswered" ? unanswered :
    tab === "faq"        ? faq :
    answered;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Q&A Produk</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tandai pertanyaan yang sering ditanya sebagai <strong>Penting</strong> — otomatis muncul sebagai FAQ di halaman produk.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {faq.length > 0 && (
            <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
              <Pin className="h-3 w-3 mr-1" />
              {faq.length} FAQ
            </Badge>
          )}
          {unanswered.length > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unanswered.length} belum dijawab
            </Badge>
          )}
        </div>
      </div>

      {/* FAQ hint */}
      {faq.length === 0 && answered.length > 0 && tab === "answered" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3">
          <Pin className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-800">
            Klik ikon <strong>Pin</strong> pada jawaban untuk menjadikannya FAQ — pertanyaan itu akan muncul di bagian paling atas halaman produk di marketplace.
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {(["unanswered", "answered", "faq"] as Tab[]).map((t) => (
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
              : t === "faq"
              ? `⭐ FAQ Penting${faq.length > 0 ? ` (${faq.length})` : ""}`
              : `Sudah Dijawab (${answered.length})`}
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
              : tab === "faq"
              ? "Belum ada FAQ. Jawab pertanyaan lalu tandai sebagai Penting."
              : "Belum ada pertanyaan yang terjawab."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayed.map((qa) => (
            <div
              key={qa.id}
              className={`rounded-xl border bg-card p-4 space-y-3 transition-colors ${
                qa.is_pinned ? "border-amber-300 bg-amber-50/40" : "border-border"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2 min-w-0">
                  {qa.is_pinned
                    ? <Pin className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                    : <HelpCircle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                  }
                  <div className="min-w-0">
                    {qa.product && (
                      <p className="text-[11px] text-muted-foreground mb-0.5">
                        Produk: <span className="font-medium">{(qa.product as any).name ?? ""}</span>
                      </p>
                    )}
                    <p className="text-sm font-medium leading-snug">{qa.question}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(qa.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Pin/FAQ button — only for answered items */}
                  {qa.answer && (
                    <button
                      onClick={() => togglePin(qa)}
                      disabled={pinning === qa.id}
                      title={qa.is_pinned ? "Hapus dari FAQ penting" : "Tandai sebagai FAQ penting (muncul di atas halaman produk)"}
                      className={`p-1.5 rounded-md transition-colors ${
                        qa.is_pinned
                          ? "text-amber-500 bg-amber-100 hover:bg-amber-200"
                          : "text-muted-foreground hover:text-amber-500 hover:bg-amber-50"
                      }`}
                    >
                      {pinning === qa.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : qa.is_pinned
                        ? <PinOff className="h-4 w-4" />
                        : <Pin className="h-4 w-4" />
                      }
                    </button>
                  )}
                  <button
                    onClick={() => toggleHide(qa)}
                    disabled={hiding === qa.id}
                    title={qa.is_hidden ? "Tampilkan kembali" : "Sembunyikan dari publik"}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    {hiding === qa.id
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <EyeOff className="h-4 w-4" />
                    }
                  </button>
                </div>
              </div>

              {qa.answer ? (
                <div className="ml-6 rounded-md bg-primary/5 border border-primary/10 px-3 py-2">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[11px] font-semibold text-primary">Jawabanmu</span>
                    {qa.is_pinned && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-300 text-amber-700">
                        ⭐ FAQ
                      </Badge>
                    )}
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
