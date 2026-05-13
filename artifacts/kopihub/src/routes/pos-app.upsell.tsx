import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, Plus, Trash2, Loader2, Pin, PinOff, Sparkles, Search } from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/upsell")({
  head: () => ({ meta: [{ title: "Sering Dibeli Bersama — Upselling Engine" }] }),
  component: UpsellPage,
});

type Product = { id: string; name: string; price: number; image_url: string | null };
type Suggestion = {
  id: string;
  product_id: string;
  suggested_id: string;
  score: number;
  position: number;
  source: "auto" | "manual";
  is_pinned: boolean;
};

function UpsellPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState("");

  // Load shop products
  useEffect(() => {
    if (!shop?.id) return;
    (async () => {
      const { data } = await supabase
        .from("menu_items")
        .select("id, name, price, image_url")
        .eq("shop_id" as any, shop.id)
        .eq("is_available" as any, true)
        .order("name", { ascending: true })
        .limit(500) as any;
      setProducts((data ?? []) as Product[]);
      if ((data ?? []).length && !selectedId) setSelectedId(data[0].id);
    })();
  }, [shop?.id]);

  // Load suggestions for selected product
  useEffect(() => {
    if (!selectedId) { setSuggestions([]); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("product_upsell_suggestions" as any)
        .select("id, product_id, suggested_id, score, position, source, is_pinned")
        .eq("product_id" as any, selectedId)
        .order("is_pinned" as any, { ascending: false })
        .order("position" as any, { ascending: true }) as any;
      setSuggestions((data ?? []) as Suggestion[]);
      setLoading(false);
    })();
  }, [selectedId]);

  const productsById = useMemo(() => {
    const m = new Map<string, Product>();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const pickerProducts = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const existingIds = new Set(suggestions.map((s) => s.suggested_id));
    return products.filter(
      (p) => p.id !== selectedId && !existingIds.has(p.id) && (q ? p.name.toLowerCase().includes(q) : true),
    );
  }, [products, suggestions, pickerQuery, selectedId]);

  async function refreshSuggestions() {
    if (!selectedId) return;
    const { data } = await supabase
      .from("product_upsell_suggestions" as any)
      .select("id, product_id, suggested_id, score, position, source, is_pinned")
      .eq("product_id" as any, selectedId)
      .order("is_pinned" as any, { ascending: false })
      .order("position" as any, { ascending: true }) as any;
    setSuggestions((data ?? []) as Suggestion[]);
  }

  async function addSuggestion(suggestedId: string) {
    if (!selectedId) return;
    const nextPos = (suggestions[suggestions.length - 1]?.position ?? 0) + 1;
    const { error } = await supabase.from("product_upsell_suggestions" as any).insert({
      product_id: selectedId,
      suggested_id: suggestedId,
      source: "manual",
      is_pinned: true,
      position: nextPos,
    } as any);
    if (error) { toast.error(error.message); return; }
    toast.success("Saran ditambahkan & dipin");
    setPickerOpen(false);
    setPickerQuery("");
    refreshSuggestions();
  }

  async function togglePin(s: Suggestion) {
    const { error } = await supabase
      .from("product_upsell_suggestions" as any)
      .update({ is_pinned: !s.is_pinned } as any)
      .eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    refreshSuggestions();
  }

  async function removeSuggestion(s: Suggestion) {
    const { error } = await supabase
      .from("product_upsell_suggestions" as any)
      .delete()
      .eq("id", s.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Saran dihapus");
    refreshSuggestions();
  }

  const selectedProduct = selectedId ? productsById.get(selectedId) : null;
  const autoCount = suggestions.filter((s) => s.source === "auto").length;
  const manualCount = suggestions.filter((s) => s.source === "manual").length;

  if (shopLoading) {
    return <div className="p-8 text-muted-foreground">Memuat toko…</div>;
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> Sering Dibeli Bersama
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Atur produk rekomendasi yang muncul di halaman produk pelanggan untuk meningkatkan nilai keranjang.
          Saran <span className="font-medium">otomatis</span> dihitung tiap minggu dari pola pembelian 90 hari terakhir.
          <span className="font-medium"> Pin</span> saran agar tidak tergantikan saat job otomatis dijalankan.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6">
        {/* Product list */}
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <div className="p-3 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari produk…"
                className="pl-8 h-9"
              />
            </div>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">Belum ada produk.</div>
            ) : (
              filteredProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border last:border-b-0 hover:bg-muted/50 transition-colors ${
                    selectedId === p.id ? "bg-primary/10" : ""
                  }`}
                >
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-muted-foreground">{formatIDR(p.price)}</div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Suggestions panel */}
        <div className="border border-border rounded-xl bg-card">
          {selectedProduct ? (
            <>
              <div className="p-4 border-b border-border flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Produk dipilih</div>
                  <div className="text-base font-semibold">{selectedProduct.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {autoCount} saran otomatis · {manualCount} manual
                  </div>
                </div>
                <Button onClick={() => setPickerOpen(true)} size="sm" className="gap-1.5">
                  <Plus className="h-4 w-4" /> Tambah Saran
                </Button>
              </div>

              {pickerOpen && (
                <div className="p-3 border-b border-border bg-muted/30">
                  <div className="relative mb-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      autoFocus
                      value={pickerQuery}
                      onChange={(e) => setPickerQuery(e.target.value)}
                      placeholder="Cari produk untuk ditambah…"
                      className="pl-8 h-9"
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto rounded-lg border border-border bg-card">
                    {pickerProducts.slice(0, 50).map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addSuggestion(p.id)}
                        className="w-full text-left px-3 py-2 hover:bg-muted/50 border-b border-border last:border-b-0 text-sm"
                      >
                        <div className="font-medium truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground">{formatIDR(p.price)}</div>
                      </button>
                    ))}
                    {pickerProducts.length === 0 && (
                      <div className="p-3 text-xs text-muted-foreground text-center">
                        Tidak ada produk lain.
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => { setPickerOpen(false); setPickerQuery(""); }}
                  >
                    Tutup
                  </Button>
                </div>
              )}

              <div className="p-4">
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin" /> Memuat saran…
                  </div>
                ) : suggestions.length === 0 ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">
                    <Layers className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    Belum ada saran untuk produk ini.<br />
                    Tambah manual atau tunggu job otomatis (Minggu 10:00 WIB) dari data penjualan.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {suggestions.map((s) => {
                      const p = productsById.get(s.suggested_id);
                      return (
                        <div
                          key={s.id}
                          className="flex items-center gap-3 p-3 border border-border rounded-lg hover:border-primary/40 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{p?.name ?? s.suggested_id}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                              {p && <span>{formatIDR(p.price)}</span>}
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                  s.source === "auto"
                                    ? "bg-blue-500/10 text-blue-600"
                                    : "bg-emerald-500/10 text-emerald-600"
                                }`}
                              >
                                {s.source === "auto" ? "OTO" : "MANUAL"}
                              </span>
                              {s.source === "auto" && s.score > 0 && (
                                <span>· {Math.round(s.score)}× co-purchase</span>
                              )}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => togglePin(s)}
                            title={s.is_pinned ? "Lepas pin" : "Pin saran"}
                          >
                            {s.is_pinned ? (
                              <Pin className="h-4 w-4 text-primary fill-primary" />
                            ) : (
                              <PinOff className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeSuggestion(s)}
                            title="Hapus saran"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-sm text-muted-foreground">
              Pilih produk di kiri untuk mengatur sarannya.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
