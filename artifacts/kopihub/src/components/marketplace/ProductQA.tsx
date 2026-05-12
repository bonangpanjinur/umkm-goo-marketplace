import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronDown, ChevronUp, HelpCircle, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type QA = {
  id: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  created_at: string;
  user_id: string | null;
};

export function ProductQA({ productId, shopId }: { productId: string; shopId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<QA[]>([]);
  const [myItems, setMyItems] = useState<QA[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [question, setQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = async () => {
    const { data: answered } = await supabase
      .from("product_qa")
      .select("id, question, answer, answered_at, created_at, user_id")
      .eq("product_id", productId)
      .eq("is_hidden", false)
      .not("answer", "is", null)
      .order("answered_at", { ascending: false })
      .limit(20);
    setItems((answered as QA[]) ?? []);

    if (user) {
      const { data: mine } = await supabase
        .from("product_qa")
        .select("id, question, answer, answered_at, created_at, user_id")
        .eq("product_id", productId)
        .eq("user_id", user.id)
        .is("answer", null)
        .order("created_at", { ascending: false })
        .limit(5);
      setMyItems((mine as QA[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [productId, user?.id]);

  const submit = async () => {
    if (!user) { toast.error("Masuk terlebih dahulu untuk bertanya."); return; }
    const q = question.trim();
    if (q.length < 5) { toast.error("Pertanyaan terlalu pendek."); return; }
    setSubmitting(true);
    const { error } = await supabase.from("product_qa").insert({
      product_id: productId,
      shop_id: shopId,
      user_id: user.id,
      question: q,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    setQuestion("");
    setShowForm(false);
    setSubmitted(true);
    load();
  };

  if (loading) {
    return (
      <div className="py-6 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {myItems.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            Pertanyaanmu (menunggu jawaban)
          </p>
          {myItems.map((q) => (
            <p key={q.id} className="text-sm text-amber-900 leading-snug">"{q.question}"</p>
          ))}
        </div>
      )}

      {items.length === 0 && myItems.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          Belum ada pertanyaan untuk produk ini. Jadilah yang pertama bertanya!
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((qa) => (
            <div key={qa.id} className="border-b border-border pb-3 last:border-0 space-y-2">
              <div className="flex items-start gap-2">
                <HelpCircle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                <p className="text-sm font-medium leading-snug">{qa.question}</p>
              </div>
              <div className="ml-6 rounded-md bg-primary/5 border border-primary/10 px-3 py-2 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                <div>
                  <p className="text-[10px] font-semibold text-primary mb-0.5">Jawaban Penjual</p>
                  <p className="text-sm leading-snug whitespace-pre-line">{qa.answer}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {submitted && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 flex items-center gap-2">
          <MessageCircle className="h-4 w-4 shrink-0" />
          Pertanyaanmu terkirim! Penjual akan menjawab segera.
        </div>
      )}

      {!submitted && (
        <div>
          {showForm ? (
            <div className="space-y-2">
              <Textarea
                placeholder="Tulis pertanyaanmu tentang produk ini…"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                maxLength={500}
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground text-right">{question.length}/500</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={submit}
                  disabled={submitting || !user}
                >
                  {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  {!user ? "Masuk untuk bertanya" : "Kirim Pertanyaan"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setQuestion(""); }}>
                  Batal
                </Button>
              </div>
              {!user && (
                <p className="text-xs text-muted-foreground">
                  Kamu harus masuk terlebih dahulu untuk mengajukan pertanyaan.
                </p>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowForm(true)}
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              Ada pertanyaan tentang produk ini?
              {showForm ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
