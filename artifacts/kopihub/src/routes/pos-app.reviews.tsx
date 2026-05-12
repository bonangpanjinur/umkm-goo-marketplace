import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Star, Loader2, MessageSquare, BadgeCheck, EyeOff, Eye, RefreshCw,
  ThumbsUp, ThumbsDown, Minus, Flag, ShieldAlert, Send, TrendingUp,
  BarChart3, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/pos-app/reviews")({
  head: () => ({ meta: [{ title: "Ulasan Pelanggan" }] }),
  component: ReviewsPage,
});

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  photos: string[] | null;
  is_verified_purchase: boolean;
  is_hidden: boolean;
  is_flagged: boolean;
  flag_reason: string | null;
  shop_reply: string | null;
  shop_replied_at: string | null;
  created_at: string;
  product_name: string;
};

type Tab = "semua" | "perlu-balas" | "sentimen" | "moderasi";

// ── Client-side sentiment helpers ─────────────────────────────────────────────
const POS_WORDS = ["enak","bagus","mantap","lezat","segar","cepat","ramah","memuaskan","sempurna","luar biasa","recommended","top","best","puas","suka","keren","nikmat","gurih","manis","bersih","nyaman","friendly","pelayanan","worth","murah"];
const NEG_WORDS = ["buruk","jelek","lama","lambat","dingin","basi","hambar","mengecewakan","kurang","pahit","keras","kering","mahal","kotor","kasar","kecewa","mengantri","lelet","tengik","bau","sempit","ribet","susah"];
const ID_STOP   = new Set(["yang","dan","di","ke","dari","ini","itu","dengan","untuk","pada","adalah","ada","juga","saya","kami","nya","tidak","tapi","atau","sudah","bisa","kalau","jadi","lebih","sangat","aja","ya","banget","karena","cukup","masih","seperti","kali","mau","pun","deh","sih","nih","dong","yg","jg","jd"]);

function sentimentOf(rating: number, comment: string | null): "positif" | "negatif" | "netral" {
  if (rating >= 4) return "positif";
  if (rating <= 2) return "negatif";
  if (!comment) return "netral";
  const lo = comment.toLowerCase();
  const pos = POS_WORDS.filter(w => lo.includes(w)).length;
  const neg = NEG_WORDS.filter(w => lo.includes(w)).length;
  return pos > neg ? "positif" : neg > pos ? "negatif" : "netral";
}

function getKeywords(reviews: Review[]) {
  const freq: Record<string, { count: number; type: "positif" | "negatif" | "other" }> = {};
  for (const r of reviews) {
    if (!r.comment) continue;
    const words = r.comment.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(w => w.length >= 4 && !ID_STOP.has(w));
    for (const w of words) {
      if (!freq[w]) freq[w] = { count: 0, type: POS_WORDS.includes(w) ? "positif" : NEG_WORDS.includes(w) ? "negatif" : "other" };
      freq[w].count++;
    }
  }
  return Object.entries(freq).sort((a, b) => b[1].count - a[1].count).slice(0, 30);
}

// ── Sub-components ────────────────────────────────────────────────────────────
function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "xs" }) {
  const cls = size === "xs" ? "h-3 w-3" : "h-3.5 w-3.5";
  return (
    <span className="flex">
      {[1,2,3,4,5].map(n => (
        <Star key={n} className={`${cls} ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`} />
      ))}
    </span>
  );
}

function SentimentBadge({ s }: { s: "positif" | "negatif" | "netral" }) {
  const map = {
    positif: { cls: "bg-emerald-100 text-emerald-700", icon: <ThumbsUp className="h-3 w-3" /> },
    negatif: { cls: "bg-red-100 text-red-700",         icon: <ThumbsDown className="h-3 w-3" /> },
    netral:  { cls: "bg-slate-100 text-slate-600",     icon: <Minus className="h-3 w-3" /> },
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${map[s].cls}`}>
      {map[s].icon} {s}
    </span>
  );
}

// ── Sentiment Analysis Tab ────────────────────────────────────────────────────
function SentimentTab({ reviews }: { reviews: Review[] }) {
  const positif = reviews.filter(r => sentimentOf(r.rating, r.comment) === "positif");
  const negatif = reviews.filter(r => sentimentOf(r.rating, r.comment) === "negatif");
  const netral  = reviews.filter(r => sentimentOf(r.rating, r.comment) === "netral");
  const total   = reviews.length;

  const ratingDist = [5,4,3,2,1].map(n => ({
    label: `${n}★`,
    count: reviews.filter(r => r.rating === n).length,
  }));

  const avg = total > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : "—";
  const keywords = getKeywords(reviews);
  const posKw  = keywords.filter(([w]) => POS_WORDS.includes(w));
  const negKw  = keywords.filter(([w]) => NEG_WORDS.includes(w));
  const othKw  = keywords.filter(([,d]) => d.type === "other").slice(0, 10);

  return (
    <div className="space-y-5">
      {/* Overview */}
      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border bg-card p-4 text-center sm:col-span-1">
          <p className="text-3xl font-bold">{avg}</p>
          <div className="flex justify-center mt-1"><Stars rating={Math.round(Number(avg))} /></div>
          <p className="text-xs text-muted-foreground mt-1">{total} ulasan</p>
        </div>
        {([
          { label: "Positif", count: positif.length, color: "emerald", icon: <ThumbsUp className="h-4 w-4" /> },
          { label: "Netral",  count: netral.length,  color: "slate",   icon: <Minus     className="h-4 w-4" /> },
          { label: "Negatif", count: negatif.length, color: "red",     icon: <ThumbsDown className="h-4 w-4" /> },
        ] as const).map(({ label, count, color, icon }) => (
          <div key={label} className={`rounded-xl border p-4 ${
            color === "emerald" ? "border-emerald-100 bg-emerald-50 text-emerald-700" :
            color === "red"     ? "border-red-100 bg-red-50 text-red-700" :
            "border-slate-100 bg-slate-50 text-slate-600"
          }`}>
            <div className="flex items-center gap-1.5 mb-1">{icon}<span className="text-xs font-semibold">{label}</span></div>
            <p className="text-2xl font-bold">{count}</p>
            <p className="text-xs opacity-70">{total > 0 ? Math.round((count / total) * 100) : 0}% dari total</p>
          </div>
        ))}
      </div>

      {/* Distribution chart */}
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Distribusi Rating
        </p>
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={ratingDist} layout="vertical" margin={{ top: 0, right: 50, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
            <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis type="category" dataKey="label" tick={{ fontSize: 13 }} tickLine={false} axisLine={false} width={28} />
            <Tooltip formatter={(v: number) => [`${v} ulasan`]} />
            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} maxBarSize={22}
              label={{ position: "right", fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Keywords */}
      <div className="grid gap-4 sm:grid-cols-2">
        {posKw.length > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold text-emerald-800 mb-2 flex items-center gap-1.5">
              <ThumbsUp className="h-3.5 w-3.5" /> Kata Positif Sering Disebut
            </p>
            <div className="flex flex-wrap gap-1.5">
              {posKw.map(([w, { count }]) => (
                <span key={w} className="rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                  {w} <span className="opacity-60 text-[10px]">×{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
        {negKw.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-1.5">
              <ThumbsDown className="h-3.5 w-3.5" /> Kata Negatif Sering Disebut
            </p>
            <div className="flex flex-wrap gap-1.5">
              {negKw.map(([w, { count }]) => (
                <span key={w} className="rounded-full bg-red-100 border border-red-200 px-2.5 py-0.5 text-xs font-medium text-red-800">
                  {w} <span className="opacity-60 text-[10px]">×{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
        {othKw.length > 0 && (
          <div className="rounded-xl border bg-card p-4 sm:col-span-2">
            <p className="text-xs font-semibold mb-2 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" /> Topik Sering Disebut Customer
            </p>
            <div className="flex flex-wrap gap-1.5">
              {othKw.map(([w, { count }]) => (
                <span key={w} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">
                  {w} <span className="opacity-60 text-[10px]">×{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Negatif yang belum dibalas */}
      {negatif.filter(r => !r.shop_reply && !r.is_hidden).length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
            <ThumbsDown className="h-4 w-4" />
            Ulasan Negatif Belum Dibalas — segera tangani untuk menjaga reputasi
          </p>
          {negatif.filter(r => !r.shop_reply && !r.is_hidden).map(r => (
            <div key={r.id} className="rounded-lg border border-red-100 bg-red-50/50 px-4 py-3">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Stars rating={r.rating} size="xs" />
                <span className="text-xs text-muted-foreground">{r.product_name}</span>
                <span className="ml-auto text-[11px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString("id-ID")}</span>
              </div>
              {r.comment && <p className="text-sm text-foreground/80 leading-snug">{r.comment}</p>}
              <p className="mt-1.5 text-[11px] font-medium text-red-600">⚠ Balas dari tab "Semua Ulasan"</p>
            </div>
          ))}
        </div>
      )}

      {total === 0 && (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Belum ada ulasan untuk dianalisis.
        </div>
      )}
    </div>
  );
}

// ── Review Card ───────────────────────────────────────────────────────────────
function ReviewCard({
  r, onReply, onToggleHide, onFlag,
}: {
  r: Review;
  onReply: (id: string, text: string) => Promise<void>;
  onToggleHide: (r: Review) => Promise<void>;
  onFlag: (r: Review, reason: string) => Promise<void>;
}) {
  const [draft, setDraft]         = useState(r.shop_reply ?? "");
  const [editing, setEditing]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [showFlag, setShowFlag]   = useState(false);
  const [flagTxt, setFlagTxt]     = useState(r.flag_reason ?? "");
  const sentiment = sentimentOf(r.rating, r.comment);

  const submitReply = async () => {
    if (!draft.trim()) { toast.error("Tulis balasan terlebih dahulu"); return; }
    setSaving(true);
    await onReply(r.id, draft.trim());
    setSaving(false);
    setEditing(false);
  };

  const submitFlag = async () => {
    if (!flagTxt.trim()) { toast.error("Tulis alasan pelaporan"); return; }
    setSaving(true);
    await onFlag(r, flagTxt.trim());
    setSaving(false);
    setShowFlag(false);
  };

  return (
    <div className={`rounded-xl border bg-card overflow-hidden transition-opacity ${r.is_hidden ? "opacity-55 border-dashed" : "border-border"}`}>
      {/* Card header */}
      <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{r.product_name}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Stars rating={r.rating} size="xs" />
            <SentimentBadge s={sentiment} />
            {r.is_verified_purchase && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 rounded-full px-1.5 py-0.5">
                <BadgeCheck className="h-3 w-3" />Terverifikasi
              </span>
            )}
            {r.is_hidden && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 rounded-full px-1.5 py-0.5">
                <EyeOff className="h-3 w-3" />Disembunyikan
              </span>
            )}
            {r.is_flagged && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-700 bg-orange-100 rounded-full px-1.5 py-0.5">
                <Flag className="h-3 w-3" />Dilaporkan
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted-foreground mr-1">
            {new Date(r.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "2-digit" })}
          </span>
          {/* Hide/show toggle */}
          <button onClick={() => onToggleHide(r)} title={r.is_hidden ? "Tampilkan kembali" : "Sembunyikan dari publik"}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
            {r.is_hidden ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
          {/* Flag */}
          <button onClick={() => setShowFlag(!showFlag)} title="Laporkan ke admin"
            className={`rounded-md p-1.5 transition-colors ${r.is_flagged ? "text-orange-500 bg-orange-50" : "text-muted-foreground hover:bg-muted hover:text-orange-500"}`}>
            <Flag className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {r.comment && <p className="text-sm whitespace-pre-line leading-relaxed">{r.comment}</p>}

        {r.photos && r.photos.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {r.photos.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                <img src={url} alt="" className="h-16 w-16 rounded-lg object-cover border hover:opacity-90 transition" />
              </a>
            ))}
          </div>
        )}

        {/* Flag box (F6-3) */}
        {showFlag && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 space-y-2">
            <p className="text-xs font-semibold text-orange-800 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5" />
              Laporkan ke admin platform untuk ditinjau
            </p>
            <Textarea rows={2} placeholder="Alasan pelaporan (mis: spam, tidak relevan, menyesatkan)…"
              value={flagTxt} onChange={e => setFlagTxt(e.target.value)} maxLength={300} className="text-xs" />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-100"
                onClick={submitFlag} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Flag className="h-3.5 w-3.5 mr-1" />}
                Laporkan
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowFlag(false)}>Batal</Button>
            </div>
          </div>
        )}

        {/* Reply area (F6-1) */}
        {r.shop_reply && !editing ? (
          <div className="rounded-lg bg-muted/60 border border-border/60 p-3">
            <div className="text-xs font-semibold text-primary mb-1 flex items-center gap-1 flex-wrap">
              <MessageSquare className="h-3 w-3" />
              Balasanmu
              {r.shop_replied_at && (
                <span className="font-normal text-muted-foreground ml-1">
                  · {new Date(r.shop_replied_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                </span>
              )}
              <button onClick={() => { setDraft(r.shop_reply ?? ""); setEditing(true); }}
                className="ml-auto text-[11px] text-primary hover:underline font-medium">Edit</button>
            </div>
            <p className="text-sm whitespace-pre-line">{r.shop_reply}</p>
          </div>
        ) : !r.is_hidden ? (
          <div className="space-y-2">
            <Textarea
              autoFocus={editing}
              placeholder="Tulis balasan yang ramah dan informatif… Balasan akan tampil publik di halaman produk."
              rows={2}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              maxLength={1000}
              className="text-sm"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={submitReply} disabled={saving || !draft.trim()}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                {editing ? "Simpan" : "Balas"}
              </Button>
              {editing && <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Batal</Button>}
              <span className="text-xs text-muted-foreground ml-auto">{draft.length}/1000</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function ReviewsPage() {
  const { shop } = useCurrentShop();
  const [reviews,     setReviews]     = useState<Review[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [tab,         setTab]         = useState<Tab>("semua");
  const [filterStar,  setFilterStar]  = useState<number | null>(null);
  const [filterReply, setFilterReply] = useState<"all" | "pending" | "replied">("all");
  const [sort,        setSort]        = useState<"newest" | "oldest" | "lowest">("newest");

  const load = async () => {
    if (!shop?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("product_reviews")
      .select("id, rating, comment, photos, is_verified_purchase, is_hidden, is_flagged, flag_reason, shop_reply, shop_replied_at, created_at, product_id, menu_items(name)")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) { toast.error(error.message); setLoading(false); return; }
    setReviews(
      ((data ?? []) as any[]).map(r => ({
        ...r,
        is_flagged:   r.is_flagged ?? false,
        flag_reason:  r.flag_reason ?? null,
        product_name: r.menu_items?.name ?? "Produk",
      }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, [shop?.id]);

  const onReply = async (id: string, text: string) => {
    const { error } = await supabase.from("product_reviews").update({
      shop_reply: text.slice(0, 1000),
      shop_replied_at: new Date().toISOString(),
    }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Balasan terkirim! Tampil di halaman produk.");
    setReviews(prev => prev.map(r => r.id === id ? { ...r, shop_reply: text, shop_replied_at: new Date().toISOString() } : r));
  };

  const onToggleHide = async (r: Review) => {
    const { error } = await supabase.from("product_reviews").update({ is_hidden: !r.is_hidden }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success(r.is_hidden ? "Ulasan ditampilkan kembali" : "Ulasan disembunyikan dari publik");
    setReviews(prev => prev.map(x => x.id === r.id ? { ...x, is_hidden: !r.is_hidden } : x));
  };

  const onFlag = async (r: Review, reason: string) => {
    const { error } = await supabase.from("product_reviews").update({ is_flagged: true, flag_reason: reason }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Dilaporkan. Admin platform akan meninjau dalam 1×24 jam.");
    setReviews(prev => prev.map(x => x.id === r.id ? { ...x, is_flagged: true, flag_reason: reason } : x));
  };

  // Derived counts
  const perluBalas = reviews.filter(r => !r.shop_reply && !r.is_hidden);
  const flagged    = reviews.filter(r => r.is_flagged || r.is_hidden);
  const visibleAll = reviews.filter(r => !r.is_hidden);
  const total      = visibleAll.length;
  const avg        = total > 0 ? (visibleAll.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : "0.0";
  const starCounts = [0,0,0,0,0]; visibleAll.forEach(r => { if (r.rating >= 1 && r.rating <= 5) starCounts[r.rating - 1]++; });

  // Filtered list
  const displayed = useMemo(() => {
    let list = tab === "perlu-balas" ? perluBalas : tab === "moderasi" ? reviews : reviews;
    if (tab !== "moderasi") {
      if (filterStar !== null) list = list.filter(r => r.rating === filterStar);
      if (filterReply === "pending") list = list.filter(r => !r.shop_reply && !r.is_hidden);
      if (filterReply === "replied") list = list.filter(r => !!r.shop_reply);
    }
    if (sort === "newest") list = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sort === "oldest") list = [...list].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    if (sort === "lowest") list = [...list].sort((a, b) => a.rating - b.rating);
    return list;
  }, [reviews, tab, filterStar, filterReply, sort]);

  const TABS: { key: Tab; label: string; count?: number; warn?: boolean }[] = [
    { key: "semua",       label: "Semua Ulasan",      count: reviews.length },
    { key: "perlu-balas", label: "Perlu Dibalas",     count: perluBalas.length, warn: perluBalas.length > 0 },
    { key: "sentimen",    label: "Analisis Sentimen" },
    { key: "moderasi",    label: "Moderasi",          count: flagged.length, warn: flagged.length > 0 },
  ];

  return (
    <div className="p-4 sm:p-6 max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Star className="h-5 w-5 fill-amber-400 text-amber-400" /> Ulasan Pembeli
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Balas ulasan, analisis sentimen, dan moderasi konten tidak relevan.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-amber-700">{avg}</span>
              <span className="text-xs text-amber-600">({total})</span>
            </div>
          )}
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Summary bar chart (compact) */}
      {!loading && total > 0 && tab !== "sentimen" && (
        <div className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row gap-4 items-center">
          <div className="text-center shrink-0">
            <p className="text-4xl font-bold">{avg}</p>
            <div className="flex justify-center mt-1">
              {[1,2,3,4,5].map(n => (
                <Star key={n} className={`h-3.5 w-3.5 ${n <= Math.round(Number(avg)) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/25"}`} />
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{total} ulasan</p>
          </div>
          <div className="flex-1 w-full space-y-1">
            {[5,4,3,2,1].map(s => {
              const c = starCounts[s-1];
              const pct = total > 0 ? Math.round((c / total) * 100) : 0;
              return (
                <div key={s} className="flex items-center gap-2 text-xs">
                  <span className="w-3 text-right text-muted-foreground">{s}</span>
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-4 text-right text-muted-foreground">{c}</span>
                </div>
              );
            })}
          </div>
          <div className="flex flex-col gap-2 shrink-0 text-sm w-full sm:w-auto">
            <div className="flex items-center justify-between rounded-lg bg-red-50 px-3 py-2 gap-6">
              <span className="text-red-700 font-medium text-xs">Perlu dibalas</span>
              <span className="text-lg font-bold text-red-700">{perluBalas.length}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 gap-6">
              <span className="text-muted-foreground text-xs">Sudah dibalas</span>
              <span className="text-lg font-semibold">{reviews.filter(r => !!r.shop_reply).length}</span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setTab(t.key); setFilterStar(null); setFilterReply("all"); }}
            className={`pb-2 px-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors shrink-0 ${
              tab === t.key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                t.warn ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"
              }`}>{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div>
      ) : tab === "sentimen" ? (
        <SentimentTab reviews={reviews} />
      ) : (
        <>
          {/* Moderasi banner */}
          {tab === "moderasi" && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 flex items-start gap-3">
              <ShieldAlert className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-semibold">Moderasi Ulasan</p>
                <p className="text-xs mt-0.5">
                  Sembunyikan ulasan spam atau tidak relevan dari publik. Laporkan konten melanggar agar admin platform meninjau dan mengambil tindakan.
                </p>
              </div>
            </div>
          )}

          {/* Filters (non-moderasi) */}
          {tab !== "moderasi" && (
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex gap-1">
                <button onClick={() => setFilterStar(null)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${filterStar === null ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                  Semua ★
                </button>
                {[5,4,3,2,1].map(s => (
                  <button key={s} onClick={() => setFilterStar(filterStar === s ? null : s)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${filterStar === s ? "bg-amber-400 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                    ★{s}
                  </button>
                ))}
              </div>
              <div className="h-4 w-px bg-border" />
              {(["all","pending","replied"] as const).map(f => (
                <button key={f} onClick={() => setFilterReply(f)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${filterReply === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                  {f === "all" ? "Semua" : f === "pending" ? `Belum dibalas${perluBalas.length > 0 ? ` (${perluBalas.length})` : ""}` : "Sudah dibalas"}
                </button>
              ))}
              <div className="h-4 w-px bg-border" />
              <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
                className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground">
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
                <option value="lowest">Rating terendah</option>
              </select>
              <span className="ml-auto text-xs text-muted-foreground">{displayed.length} ulasan</span>
            </div>
          )}

          {/* Review list */}
          {displayed.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <Star className="mx-auto mb-2 h-8 w-8 text-muted-foreground opacity-30" />
              <p className="text-sm text-muted-foreground">
                {tab === "perlu-balas" ? "Semua ulasan sudah dibalas! 🎉" : "Tidak ada ulasan ditemukan."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayed.map(r => (
                <ReviewCard key={r.id} r={r} onReply={onReply} onToggleHide={onToggleHide} onFlag={onFlag} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
