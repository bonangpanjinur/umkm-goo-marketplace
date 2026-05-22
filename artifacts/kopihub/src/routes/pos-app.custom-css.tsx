import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Code2, Sparkles, AlertTriangle, CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { TampilanTabs } from "@/components/TampilanTabs";
import { useShop } from "@/lib/use-shop";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/pos-app/custom-css")({ component: CustomCSSPage });

const STARTER = `/* Custom CSS untuk storefront toko Anda (Paket Pro) */\n/* Perubahan hanya mempengaruhi tampilan toko publik Anda */\n\n`;

const SNIPPETS = [
  { label: "Sembunyikan footer", css: `/* Sembunyikan footer toko */\n.storefront-footer {\n  display: none;\n}` },
  { label: "Ubah warna tombol CTA", css: `/* Warna tombol utama */\n.btn-primary {\n  background-color: #e63946;\n  border-color: #e63946;\n}\n.btn-primary:hover {\n  background-color: #c1121f;\n}` },
  { label: "Font produk lebih besar", css: `/* Nama produk di listing */\n.product-card .product-name {\n  font-size: 1.1rem;\n  font-weight: 700;\n}` },
  { label: "Background header kustom", css: `/* Header storefront */\n.storefront-header {\n  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n  color: white;\n}` },
];

export default function CustomCSSPage() {
  const { shop, loading: loadingShop } = useShop();
  const [css, setCss] = useState(STARTER);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const charCount = css.length;
  const MAX_CHARS = 10000;

  useEffect(() => {
    if (!shop?.id) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("shops")
        .select("custom_css")
        .eq("id", shop.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) { toast.error(error.message); setLoaded(true); return; }
      setCss((data as any)?.custom_css || STARTER);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [shop?.id]);

  async function save() {
    if (!shop?.id) { toast.error("Toko belum siap"); return; }
    if (charCount > MAX_CHARS) { toast.error("CSS melebihi batas 10.000 karakter"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("shops")
      .update({ custom_css: css })
      .eq("id", shop.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setSaved(true);
    toast.success("Custom CSS disimpan & diterapkan ke storefront");
    setTimeout(() => setSaved(false), 3000);
  }

  function insertSnippet(snippet: string) {
    setCss(c => c + "\n" + snippet + "\n");
  }

  const busy = loadingShop || !loaded;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
      <TampilanTabs />
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Code2 className="h-5 w-5 text-primary" /> Custom CSS Editor
            <Badge className="text-xs bg-purple-600 hover:bg-purple-600">Pro</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">Edit CSS langsung untuk kustomisasi tampilan storefront</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCss(STARTER)} disabled={busy}>
            <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
          </Button>
          <Button size="sm" onClick={save} disabled={saving || busy}>
            {saved ? <><CheckCircle2 className="h-4 w-4 mr-1.5" /> Tersimpan</> : saving ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Menyimpan...</> : "Simpan & Terapkan"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          CSS yang salah dapat merusak tampilan toko. Selalu test setelah menyimpan.
          CSS hanya mempengaruhi <strong>storefront publik</strong>, bukan dashboard.
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Editor CSS</p>
            <span className={`text-xs ${charCount > MAX_CHARS ? "text-destructive font-medium" : "text-muted-foreground"}`}>
              {charCount.toLocaleString("id-ID")} / {MAX_CHARS.toLocaleString("id-ID")} karakter
            </span>
          </div>
          <textarea
            className="w-full h-80 rounded-lg border border-border bg-zinc-950 text-green-400 font-mono text-sm p-4 resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
            value={css}
            onChange={e => { setCss(e.target.value); setSaved(false); }}
            spellCheck={false}
            disabled={busy}
            placeholder={busy ? "Memuat..." : ""}
          />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Snippet Siap Pakai
          </p>
          <div className="space-y-2">
            {SNIPPETS.map(s => (
              <Card key={s.label} className="p-3">
                <p className="text-xs font-medium">{s.label}</p>
                <pre className="text-[10px] text-muted-foreground mt-1 overflow-hidden line-clamp-3 font-mono">{s.css}</pre>
                <Button variant="outline" size="sm" className="w-full mt-2 h-7 text-xs" onClick={() => insertSnippet(s.css)} disabled={busy}>
                  + Tambahkan
                </Button>
              </Card>
            ))}
          </div>

          <Card className="p-3 bg-muted/50">
            <p className="text-xs font-medium mb-1">Variabel CSS yang tersedia</p>
            {["--color-primary", "--color-background", "--color-text", "--font-body", "--border-radius"].map(v => (
              <code key={v} className="block text-[10px] text-muted-foreground font-mono py-0.5">{v}</code>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
