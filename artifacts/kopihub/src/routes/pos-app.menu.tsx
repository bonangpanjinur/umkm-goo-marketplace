import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2, UtensilsCrossed, Upload, ImageIcon, AlertTriangle, TrendingUp, TrendingDown, SlidersHorizontal, ExternalLink, Sparkles, X, Copy, Check, Info, Apple, Recycle, Clock, Droplet, Tag as TagIcon, Zap, Boxes, Settings2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ModifierManager } from "@/components/modifier-manager";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";
import { logStaffAction } from "@/lib/staff-audit";

export const Route = createFileRoute("/pos-app/menu")({
  component: MenuPage,
});

type Category = { id: string; name: string };
type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  category_id: string | null;
  track_stock: boolean;
  recipe_yield: number;
  flash_price: number | null;
  flash_starts_at: string | null;
  flash_ends_at: string | null;
  accepts_custom_order?: boolean | null;
  skin_type_tags?: string[] | null;
  restock_deadline?: string | null;
  condition_grade?: string | null;
  nutrition_info?: { calories?: number; protein?: number; carbs?: number; fat?: number; fiber?: number } | null;
  production_days?: number | null;
};

type HPPRow = {
  menu_item_id: string;
  hpp: number;
  margin: number;
  margin_percent: number;
  recipe_count: number;
};

type RecipeRow = {
  id: string;
  menu_item_id: string;
  ingredient_id: string;
  quantity: number;
};

type IngredientRow = {
  id: string;
  name: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  cost_per_unit: number;
};

const NO_CATEGORY = "__none__";

function MenuPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const [hpp, setHpp] = useState<Record<string, HPPRow>>({});
  const [recipes, setRecipes] = useState<RecipeRow[]>([]);
  const [ingredients, setIngredients] = useState<Record<string, IngredientRow>>({});

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [price, setPrice] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>(NO_CATEGORY);
  const [available, setAvailable] = useState(true);
  const [trackStock, setTrackStock] = useState(false);
  const [recipeYield, setRecipeYield] = useState<string>("1");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [flashPrice, setFlashPrice] = useState<string>("");
  const [flashStarts, setFlashStarts] = useState<string>("");
  const [flashEnds, setFlashEnds] = useState<string>("");
  const [acceptsCustomOrder, setAcceptsCustomOrder] = useState(false);
  const [skinTypeTags, setSkinTypeTags] = useState<string[]>([]);
  const [restockDeadline, setRestockDeadline] = useState<string>("");
  const [nutritionCal, setNutritionCal] = useState<string>("");
  const [nutritionProtein, setNutritionProtein] = useState<string>("");
  const [nutritionCarbs, setNutritionCarbs] = useState<string>("");
  const [nutritionFat, setNutritionFat] = useState<string>("");
  const [nutritionFiber, setNutritionFiber] = useState<string>("");
  const [productionDays, setProductionDays] = useState<string>("");
  const [conditionGrade, setConditionGrade] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const batchAbortRef = useRef(false);
  const [modifierItem, setModifierItem] = useState<MenuItem | null>(null);

  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiTags, setAiTags] = useState<string[]>([]);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [copiedDescId, setCopiedDescId] = useState<string | null>(null);

  const [batchOpen, setBatchOpen] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchTotal, setBatchTotal] = useState(0);
  const [batchSuccess, setBatchSuccess] = useState(0);
  const [batchErrors, setBatchErrors] = useState<string[]>([]);
  const [batchDone, setBatchDone] = useState(false);
  const [batchCurrentName, setBatchCurrentName] = useState("");

  async function load() {
    if (!shop) return;
    setLoading(true);
    const [cats, mi, hp, rc, ing] = await Promise.all([
      supabase
        .from("categories")
        .select("id, name")
        .eq("shop_id", shop.id)
        .order("sort_order", { ascending: true }),
      supabase
        .from("menu_items")
        .select("id, name, description, price, image_url, is_available, category_id, track_stock, recipe_yield, flash_price, flash_starts_at, flash_ends_at, accepts_custom_order, skin_type_tags, restock_deadline, nutrition_info, production_days, condition_grade")
        .eq("shop_id", shop.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("menu_hpp_view")
        .select("menu_item_id, hpp, margin, margin_percent, recipe_count")
        .eq("shop_id", shop.id),
      supabase
        .from("recipes")
        .select("id, menu_item_id, ingredient_id, quantity"),
      supabase
        .from("ingredients")
        .select("id, name, unit, current_stock, min_stock, cost_per_unit")
        .eq("shop_id", shop.id)
        .eq("is_active", true),
    ]);
    if (cats.error) toast.error(cats.error.message);
    if (mi.error) toast.error(mi.error.message);
    setCategories(cats.data ?? []);
    setItems((mi.data ?? []) as MenuItem[]);
    const hMap: Record<string, HPPRow> = {};
    ((hp.data ?? []) as HPPRow[]).forEach((row) => { if (row.menu_item_id) hMap[row.menu_item_id] = row; });
    setHpp(hMap);
    setRecipes((rc.data ?? []) as RecipeRow[]);
    const iMap: Record<string, IngredientRow> = {};
    ((ing.data ?? []) as IngredientRow[]).forEach((i) => { iMap[i.id] = i; });
    setIngredients(iMap);
    setLoading(false);
  }

  useEffect(() => {
    if (shop) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop?.id]);

  function openNew() {
    setEditing(null);
    setName("");
    setDesc("");
    setPrice("");
    setCategoryId(NO_CATEGORY);
    setAvailable(true);
    setTrackStock(false);
    setRecipeYield("1");
    setImageUrl(null);
    setFlashPrice("");
    setFlashStarts("");
    setFlashEnds("");
    setAcceptsCustomOrder(false);
    setSkinTypeTags([]);
    setRestockDeadline("");
    setNutritionCal(""); setNutritionProtein(""); setNutritionCarbs(""); setNutritionFat(""); setNutritionFiber("");
    setProductionDays("");
    setConditionGrade("");
    setAiTags([]);
    setOpen(true);
  }

  function toLocalInput(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60000);
    return local.toISOString().slice(0, 16);
  }

  function openEdit(it: MenuItem) {
    setEditing(it);
    setName(it.name);
    setDesc(it.description ?? "");
    setPrice(String(it.price));
    setCategoryId(it.category_id ?? NO_CATEGORY);
    setAvailable(it.is_available);
    setTrackStock(Boolean(it.track_stock));
    setRecipeYield(String(it.recipe_yield ?? 1));
    setImageUrl(it.image_url);
    setFlashPrice(it.flash_price != null ? String(it.flash_price) : "");
    setFlashStarts(toLocalInput(it.flash_starts_at));
    setFlashEnds(toLocalInput(it.flash_ends_at));
    setAcceptsCustomOrder(Boolean(it.accepts_custom_order));
    setSkinTypeTags((it as any).skin_type_tags ?? []);
    setRestockDeadline(it.restock_deadline ?? "");
    const ni = (it as any).nutrition_info ?? {};
    setNutritionCal(ni.calories != null ? String(ni.calories) : "");
    setNutritionProtein(ni.protein != null ? String(ni.protein) : "");
    setNutritionCarbs(ni.carbs != null ? String(ni.carbs) : "");
    setNutritionFat(ni.fat != null ? String(ni.fat) : "");
    setNutritionFiber(ni.fiber != null ? String(ni.fiber) : "");
    setProductionDays((it as any).production_days != null ? String((it as any).production_days) : "");
    setConditionGrade((it as any).condition_grade ?? "");
    setAiTags([]);
    setOpen(true);
  }

  async function generateWithAI() {
    if (!name.trim() && !imageUrl) {
      toast.error("Isi nama produk atau upload foto terlebih dahulu.");
      return;
    }
    setAiGenerating(true);
    try {
      const categoryName = categories.find((c) => c.id === categoryId)?.name;
      const res = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          image_url: imageUrl ?? undefined,
          category: categoryName,
          price: price ? Number(price) : undefined,
        }),
      });
      const data = await res.json() as { description?: string; tags?: string[]; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Gagal menghasilkan deskripsi.");
        return;
      }
      if (data.description) setDesc(data.description);
      if (data.tags?.length) setAiTags(data.tags);
      toast.success("Deskripsi dan tag SEO berhasil dibuat!");
    } catch {
      toast.error("Gagal menghubungi server AI.");
    } finally {
      setAiGenerating(false);
    }
  }

  async function generateForItem(it: MenuItem) {
    setGeneratingIds((prev) => new Set(prev).add(it.id));
    try {
      const categoryName = categories.find((c) => c.id === it.category_id)?.name;
      const res = await fetch("/api/ai/generate-description", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: it.name,
          image_url: it.image_url ?? undefined,
          category: categoryName,
          price: it.price,
        }),
      });
      const data = await res.json() as { description?: string; error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Gagal menghasilkan deskripsi.");
        return;
      }
      if (data.description) {
        const { error } = await supabase
          .from("menu_items")
          .update({ description: data.description })
          .eq("id", it.id);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success(`Deskripsi "${it.name}" berhasil dibuat!`);
          load();
        }
      }
    } catch {
      toast.error("Gagal menghubungi server AI.");
    } finally {
      setGeneratingIds((prev) => {
        const next = new Set(prev);
        next.delete(it.id);
        return next;
      });
    }
  }

  function copyTag(tag: string) {
    navigator.clipboard.writeText(tag).then(() => {
      setCopiedTag(tag);
      setTimeout(() => setCopiedTag(null), 1500);
    });
  }

  async function runBatchGenerate() {
    const targets = items.filter((it) => !it.description?.trim());
    if (targets.length === 0) return;
    setBatchRunning(true);
    setBatchProgress(0);
    setBatchTotal(targets.length);
    setBatchSuccess(0);
    setBatchErrors([]);
    setBatchDone(false);
    batchAbortRef.current = false;

    let successCount = 0;
    const errorList: string[] = [];

    for (let i = 0; i < targets.length; i++) {
      if (batchAbortRef.current) break;

      const item = targets[i];
      setBatchCurrentName(item.name);
      setBatchProgress(i + 1);

      try {
        const categoryName = categories.find((c) => c.id === item.category_id)?.name;
        const res = await fetch("/api/ai/generate-description", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: item.name,
            image_url: item.image_url ?? undefined,
            category: categoryName,
            price: item.price,
          }),
        });
        const data = await res.json() as { description?: string; error?: string };
        if (!res.ok) {
          errorList.push(`${item.name}: ${data.error ?? "Gagal"}`);
          setBatchErrors([...errorList]);
        } else if (data.description) {
          const { error } = await supabase
            .from("menu_items")
            .update({ description: data.description })
            .eq("id", item.id);
          if (error) {
            errorList.push(`${item.name}: ${error.message}`);
            setBatchErrors([...errorList]);
          } else {
            successCount++;
            setBatchSuccess(successCount);
          }
        }
      } catch {
        errorList.push(`${item.name}: Kesalahan jaringan`);
        setBatchErrors([...errorList]);
      }

      if (i < targets.length - 1 && !batchAbortRef.current) {
        await new Promise<void>((r) => setTimeout(r, 4000));
      }
    }

    setBatchRunning(false);
    setBatchDone(true);
    setBatchCurrentName("");
    load();
  }

  function openBatch() {
    const count = items.filter((it) => !it.description?.trim()).length;
    if (count === 0) { toast.info("Semua produk sudah punya deskripsi."); return; }
    setBatchDone(false);
    setBatchProgress(0);
    setBatchSuccess(0);
    setBatchErrors([]);
    setBatchCurrentName("");
    batchAbortRef.current = false;
    setBatchOpen(true);
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !shop) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Maksimal 5MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${shop.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("menu-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      toast.error(error.message);
    } else {
      const { data } = supabase.storage.from("menu-images").getPublicUrl(path);
      setImageUrl(data.publicUrl);
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function save() {
    if (!shop || !name.trim()) return;
    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Harga tidak valid");
      return;
    }
    setSaving(true);
    const yieldNum = Math.max(1, Number(recipeYield) || 1);
    const fpNum = flashPrice.trim() === "" ? null : Number(flashPrice);
    if (fpNum != null && (isNaN(fpNum) || fpNum < 0 || fpNum >= priceNum)) {
      toast.error("Harga flash harus lebih kecil dari harga normal");
      setSaving(false);
      return;
    }
    const payload = {
      shop_id: shop.id,
      name: name.trim(),
      description: desc.trim() || null,
      price: priceNum,
      image_url: imageUrl,
      is_available: available,
      category_id: categoryId === NO_CATEGORY ? null : categoryId,
      track_stock: trackStock,
      recipe_yield: yieldNum,
      flash_price: fpNum,
      flash_starts_at: fpNum != null && flashStarts ? new Date(flashStarts).toISOString() : null,
      flash_ends_at: fpNum != null && flashEnds ? new Date(flashEnds).toISOString() : null,
      accepts_custom_order: acceptsCustomOrder,
      skin_type_tags: skinTypeTags.length > 0 ? skinTypeTags : null,
      restock_deadline: restockDeadline || null,
      nutrition_info: (nutritionCal || nutritionProtein || nutritionCarbs || nutritionFat || nutritionFiber) ? {
        ...(nutritionCal ? { calories: Number(nutritionCal) } : {}),
        ...(nutritionProtein ? { protein: Number(nutritionProtein) } : {}),
        ...(nutritionCarbs ? { carbs: Number(nutritionCarbs) } : {}),
        ...(nutritionFat ? { fat: Number(nutritionFat) } : {}),
        ...(nutritionFiber ? { fiber: Number(nutritionFiber) } : {}),
      } : null,
      production_days: productionDays ? Number(productionDays) : null,
      condition_grade: conditionGrade || null,
    } as any;
    if (editing) {
      const oldPrice = editing.price;
      const { error } = await supabase.from("menu_items").update(payload).eq("id", editing.id);
      if (error) toast.error(error.message);
      else {
        toast.success("Menu diperbarui");
        // Audit: log perubahan harga (termasuk flash price) — best effort
        if (shop && oldPrice !== priceNum) {
          logStaffAction({
            shopId: shop.id,
            action: "menu.edit_price",
            meta: {
              menu_item_id: editing.id,
              menu_name: editing.name,
              old_price: oldPrice,
              new_price: priceNum,
              old_flash_price: editing.flash_price,
              new_flash_price: fpNum,
            },
          });
        }
      }
    } else {
      const { error } = await supabase.from("menu_items").insert(payload);
      if (error) toast.error(error.message);
      else toast.success("Menu ditambahkan");
    }
    setSaving(false);
    setOpen(false);
    load();
  }

  async function remove(it: MenuItem) {
    if (!confirm(`Hapus menu "${it.name}"?`)) return;
    const { error } = await supabase.from("menu_items").delete().eq("id", it.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Menu dihapus");
      if (shop) {
        logStaffAction({
          shopId: shop.id,
          action: "menu.delete",
          meta: { menu_item_id: it.id, menu_name: it.name, price: it.price },
        });
      }
      load();
    }
  }

  const filtered = items.filter((it) => {
    if (filter === "no_description") return !it.description?.trim();
    if (filter === "all") return true;
    if (filter === NO_CATEGORY) return !it.category_id;
    return it.category_id === filter;
  });

  const noDescCount = items.filter((it) => !it.description?.trim()).length;

  if (shopLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Menu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Daftar produk yang dijual. Bisa dipakai di POS dan etalase publik.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua kategori</SelectItem>
              <SelectItem value={NO_CATEGORY}>Tanpa kategori</SelectItem>
              {noDescCount > 0 && (
                <SelectItem value="no_description">
                  <span className="flex items-center gap-1.5">
                    Tanpa deskripsi
                    <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                      {noDescCount}
                    </span>
                  </span>
                </SelectItem>
              )}
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {shop?.slug && (
            <a
              href={`/katalog/${shop.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted/30 transition-colors"
            >
              <ExternalLink className="h-4 w-4" /> Bagikan Katalog
            </a>
          )}
          <a
            href="/pos-app/menu/import"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted/30 transition-colors"
          >
            <Upload className="h-4 w-4" /> Import CSV
          </a>
          {noDescCount > 0 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setFilter("no_description")}
                className="inline-flex items-center gap-1.5 rounded-l-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/50"
                title="Tampilkan produk tanpa deskripsi"
              >
                <AlertTriangle className="h-4 w-4" />
                Tanpa Deskripsi
                <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                  {noDescCount}
                </span>
              </button>
              <button
                type="button"
                onClick={openBatch}
                className="inline-flex items-center gap-1.5 rounded-r-md border border-l-0 border-violet-200 bg-violet-50 px-3 py-1.5 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/50"
                title="Generate deskripsi AI untuk semua produk tanpa deskripsi"
              >
                <Sparkles className="h-4 w-4" />
                Generate Massal
              </button>
            </div>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="mr-2 h-4 w-4" /> Menu baru
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] gap-0 p-0 overflow-hidden flex flex-col">
              <DialogHeader className="px-6 py-4 border-b">
                <DialogTitle className="flex items-center gap-2">
                  <UtensilsCrossed className="h-5 w-5 text-primary" />
                  {editing ? "Edit menu" : "Menu baru"}
                </DialogTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Isi info dasar dulu — fitur lanjutan opsional dan bisa diatur kapan saja.
                </p>
              </DialogHeader>

              <Tabs defaultValue="basic" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="mx-6 mt-3 grid grid-cols-4 w-auto">
                  <TabsTrigger value="basic" className="text-xs gap-1.5">
                    <Info className="h-3.5 w-3.5" /> Dasar
                  </TabsTrigger>
                  <TabsTrigger value="stock" className="text-xs gap-1.5">
                    <Boxes className="h-3.5 w-3.5" /> Stok & Resep
                  </TabsTrigger>
                  <TabsTrigger value="promo" className="text-xs gap-1.5">
                    <Zap className="h-3.5 w-3.5" /> Promo
                  </TabsTrigger>
                  <TabsTrigger value="advanced" className="text-xs gap-1.5">
                    <Settings2 className="h-3.5 w-3.5" /> Lanjutan
                  </TabsTrigger>
                </TabsList>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {/* ===== TAB: DASAR ===== */}
                  <TabsContent value="basic" className="mt-0 space-y-4 focus-visible:outline-none">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        className="group relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/40 transition-colors hover:bg-muted hover:border-primary/50"
                        aria-label="Unggah foto menu"
                      >
                        {imageUrl ? (
                          <>
                            <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                              <span className="text-[11px] font-medium text-white">Ganti foto</span>
                            </div>
                          </>
                        ) : uploading ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-muted-foreground">
                            <ImageIcon className="h-6 w-6" />
                            <span className="text-[10px] font-medium">Foto menu</span>
                          </div>
                        )}
                      </button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFile}
                      />
                      <div className="flex-1 space-y-2">
                        <div className="space-y-1.5">
                          <Label htmlFor="m-name">Nama menu <span className="text-destructive">*</span></Label>
                          <Input
                            id="m-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Mis. Cappuccino"
                            autoFocus
                          />
                        </div>
                        {imageUrl && (
                          <button
                            type="button"
                            onClick={() => setImageUrl(null)}
                            className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                          >
                            Hapus foto
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="m-price">Harga (Rp) <span className="text-destructive">*</span></Label>
                        <Input
                          id="m-price"
                          type="number"
                          inputMode="numeric"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="25000"
                        />
                        {price && Number(price) > 0 && (
                          <p className="text-[11px] text-muted-foreground tabular-nums">
                            {formatIDR(Number(price))}
                          </p>
                        )}
                      </div>
                      <div className="space-y-1.5">
                        <Label>Kategori</Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NO_CATEGORY}>Tanpa kategori</SelectItem>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="m-desc">Deskripsi <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                        <button
                          type="button"
                          onClick={generateWithAI}
                          disabled={aiGenerating || (!name.trim() && !imageUrl)}
                          className="flex items-center gap-1.5 rounded-md bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 transition-colors hover:bg-violet-100 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/50"
                        >
                          {aiGenerating ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Sparkles className="h-3 w-3" />
                          )}
                          {aiGenerating ? "Membuat..." : "Buat dengan AI"}
                        </button>
                      </div>
                      <Textarea
                        id="m-desc"
                        rows={3}
                        value={desc}
                        onChange={(e) => setDesc(e.target.value)}
                        placeholder="Deskripsi singkat produk…"
                      />
                      {aiTags.length > 0 && (
                        <div className="rounded-md border border-violet-200 bg-violet-50/60 p-2.5 dark:border-violet-800 dark:bg-violet-950/30">
                          <div className="mb-1.5 flex items-center justify-between">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
                              Tag SEO
                            </span>
                            <button
                              type="button"
                              onClick={() => setAiTags([])}
                              className="text-muted-foreground hover:text-destructive transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {aiTags.map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => copyTag(tag)}
                                className="flex items-center gap-1 rounded-full border border-violet-200 bg-white px-2 py-0.5 text-[11px] font-medium text-violet-700 transition-colors hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-300 dark:hover:bg-violet-900"
                              >
                                {copiedTag === tag ? (
                                  <Check className="h-2.5 w-2.5 text-emerald-500" />
                                ) : (
                                  <Copy className="h-2.5 w-2.5 opacity-50" />
                                )}
                                #{tag}
                              </button>
                            ))}
                          </div>
                          <p className="mt-1.5 text-[10px] text-muted-foreground">
                            Klik tag untuk menyalin.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
                      <div className="pr-3">
                        <div className="text-sm font-medium">Tersedia di POS & etalase</div>
                        <div className="text-xs text-muted-foreground">
                          Matikan jika sedang habis atau di-pause.
                        </div>
                      </div>
                      <Switch checked={available} onCheckedChange={setAvailable} />
                    </div>

                    {!available && (
                      <div className="space-y-1.5 rounded-lg border border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20 px-3 py-2.5">
                        <Label htmlFor="m-restock-deadline" className="text-sm flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-amber-600" />
                          Estimasi tersedia kembali
                        </Label>
                        <Input
                          id="m-restock-deadline"
                          type="date"
                          value={restockDeadline}
                          onChange={(e) => setRestockDeadline(e.target.value)}
                        />
                        <p className="text-[11px] text-muted-foreground">
                          Ditampilkan ke pembeli dan disertakan di pesan WA blast.
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  {/* ===== TAB: STOK & RESEP ===== */}
                  <TabsContent value="stock" className="mt-0 space-y-4 focus-visible:outline-none">
                    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
                      <div className="pr-3">
                        <div className="text-sm font-medium">Lacak stok bahan</div>
                        <div className="text-xs text-muted-foreground">
                          Stok bahan dikurangi otomatis saat menu terjual.
                        </div>
                      </div>
                      <Switch checked={trackStock} onCheckedChange={setTrackStock} />
                    </div>

                    <div className="space-y-1.5 rounded-lg border border-border bg-card px-3 py-3">
                      <Label>Yield resep <span className="text-muted-foreground font-normal">(porsi per resep)</span></Label>
                      <Input type="number" min={1} step="1" value={recipeYield}
                        onChange={(e) => setRecipeYield(e.target.value)} />
                      <p className="text-[11px] text-muted-foreground">
                        Mis. 1 batch sirup → 20 porsi. HPP per porsi = total bahan ÷ yield.
                      </p>
                    </div>

                    {editing && (() => {
                      const h = hpp[editing.id];
                      const rs = recipes.filter((r) => r.menu_item_id === editing.id);
                      if (!h && rs.length === 0) {
                        return (
                          <div className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-4 text-xs text-muted-foreground text-center">
                            Belum ada resep. Tambahkan di halaman <strong>Resep</strong> agar HPP & margin terhitung.
                          </div>
                        );
                      }
                      const pct = Number(h?.margin_percent ?? 0);
                      const tone = pct >= 30 ? "text-emerald-600" : pct >= 10 ? "text-amber-600" : "text-destructive";
                      return (
                        <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold uppercase tracking-wide text-muted-foreground">Breakdown HPP</span>
                            <span className={`font-bold ${tone}`}>Margin {pct}%</span>
                          </div>
                          <div className="flex justify-between"><span>HPP</span><span className="tabular-nums font-medium">{formatIDR(Number(h?.hpp ?? 0))}</span></div>
                          <div className="flex justify-between"><span>Harga</span><span className="tabular-nums font-medium">{formatIDR(Number(price) || 0)}</span></div>
                          <div className="flex justify-between"><span>Margin</span><span className="tabular-nums font-medium">{formatIDR(Number(h?.margin ?? 0))}</span></div>
                          {rs.length > 0 && (
                            <div className="border-t border-border pt-1.5 mt-1.5 space-y-0.5">
                              {rs.map((r) => {
                                const ig = ingredients[r.ingredient_id];
                                return (
                                  <div key={r.id} className="flex justify-between text-muted-foreground">
                                    <span>{ig?.name ?? "—"} × {r.quantity}{ig?.unit ? ` ${ig.unit}` : ""}</span>
                                    <span className="tabular-nums">{formatIDR((ig?.cost_per_unit ?? 0) * r.quantity)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </TabsContent>

                  {/* ===== TAB: PROMO ===== */}
                  <TabsContent value="promo" className="mt-0 space-y-4 focus-visible:outline-none">
                    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                            <Zap className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-sm font-semibold">Flash sale</div>
                            <div className="text-[11px] text-muted-foreground">
                              Diskon terjadwal dengan waktu mulai & berakhir.
                            </div>
                          </div>
                        </div>
                        {flashPrice && (
                          <button type="button" onClick={() => { setFlashPrice(""); setFlashStarts(""); setFlashEnds(""); }}
                            className="text-[11px] text-muted-foreground hover:text-destructive">
                            Hapus
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="space-y-1">
                          <Label className="text-[11px]">Harga flash</Label>
                          <Input type="number" inputMode="numeric" value={flashPrice}
                            onChange={(e) => setFlashPrice(e.target.value)} placeholder="20000" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Mulai</Label>
                          <Input type="datetime-local" value={flashStarts}
                            onChange={(e) => setFlashStarts(e.target.value)} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Berakhir</Label>
                          <Input type="datetime-local" value={flashEnds}
                            onChange={(e) => setFlashEnds(e.target.value)} />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
                      <div className="pr-3">
                        <div className="text-sm font-medium">Terima Custom Order</div>
                        <div className="text-xs text-muted-foreground">
                          Pembeli bisa kirim brief khusus (ukuran, warna, request).
                        </div>
                      </div>
                      <Switch checked={acceptsCustomOrder} onCheckedChange={setAcceptsCustomOrder} />
                    </div>
                  </TabsContent>

                  {/* ===== TAB: LANJUTAN ===== */}
                  <TabsContent value="advanced" className="mt-0 space-y-4 focus-visible:outline-none">
                    {/* Nutrisi */}
                    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                          <Apple className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">Informasi nutrisi</div>
                          <div className="text-[11px] text-muted-foreground">Per porsi — tampil di halaman produk.</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="space-y-1">
                          <Label className="text-[11px]">Kalori (kkal)</Label>
                          <Input type="number" min={0} step="1" value={nutritionCal} onChange={e => setNutritionCal(e.target.value)} placeholder="250" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Protein (g)</Label>
                          <Input type="number" min={0} step="0.1" value={nutritionProtein} onChange={e => setNutritionProtein(e.target.value)} placeholder="8" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Karbo (g)</Label>
                          <Input type="number" min={0} step="0.1" value={nutritionCarbs} onChange={e => setNutritionCarbs(e.target.value)} placeholder="35" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Lemak (g)</Label>
                          <Input type="number" min={0} step="0.1" value={nutritionFat} onChange={e => setNutritionFat(e.target.value)} placeholder="10" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px]">Serat (g)</Label>
                          <Input type="number" min={0} step="0.1" value={nutritionFiber} onChange={e => setNutritionFiber(e.target.value)} placeholder="3" />
                        </div>
                      </div>
                    </div>

                    {/* Pre-loved */}
                    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-teal-100 text-teal-600 dark:bg-teal-950/40 dark:text-teal-400">
                          <Recycle className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">Label pre-loved</div>
                          <div className="text-[11px] text-muted-foreground">Untuk produk bekas — tentukan grade kondisi.</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1 sm:grid-cols-4">
                        {[
                          { val: "", label: "Bukan", desc: "Barang baru" },
                          { val: "A", label: "Grade A", desc: "Seperti baru" },
                          { val: "B", label: "Grade B", desc: "Sedikit bekas" },
                          { val: "C", label: "Grade C", desc: "Bekas pakai" },
                        ].map(({ val, label, desc }) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setConditionGrade(val)}
                            className={`flex flex-col items-start rounded-md border px-2.5 py-2 text-left text-xs transition-all ${
                              conditionGrade === val
                                ? val === "" ? "border-foreground/30 bg-muted text-foreground" : "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300 ring-1 ring-emerald-400/30"
                                : "border-border bg-background text-muted-foreground hover:bg-muted/40"
                            }`}
                          >
                            <span className="font-semibold">{label}</span>
                            <span className="mt-0.5 text-[10px] opacity-70">{desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Estimasi produksi */}
                    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                          <Clock className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">Estimasi waktu produksi</div>
                          <div className="text-[11px] text-muted-foreground">Untuk produk custom/handmade.</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Input type="number" min={1} step="1" value={productionDays} onChange={e => setProductionDays(e.target.value)} placeholder="3" className="w-24" />
                        <span className="text-sm text-muted-foreground">hari kerja</span>
                        {productionDays && <button type="button" onClick={() => setProductionDays("")} className="text-[11px] text-muted-foreground hover:text-destructive ml-auto">Hapus</button>}
                      </div>
                    </div>

                    {/* Skin type */}
                    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                          <Droplet className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold">Tag jenis kulit</div>
                          <div className="text-[11px] text-muted-foreground">Khusus produk skincare.</div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {["Berminyak", "Kering", "Kombinasi", "Sensitif", "Normal", "Semua Jenis Kulit"].map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setSkinTypeTags(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])}
                            className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${skinTypeTags.includes(type) ? "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300" : "bg-background text-muted-foreground border-border hover:bg-muted/60"}`}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                      {skinTypeTags.length > 0 && (
                        <button type="button" onClick={() => setSkinTypeTags([])} className="text-[10px] text-muted-foreground hover:text-destructive">
                          Hapus semua tag
                        </button>
                      )}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>

              <DialogFooter className="px-6 py-3 border-t bg-muted/20">
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button onClick={save} disabled={saving || uploading || !name.trim()}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editing ? "Simpan perubahan" : "Tambah menu"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <UtensilsCrossed className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold">Belum ada menu</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            Tambahkan item pertama Anda — minuman, makanan, atau merchandise.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((it) => {
            const cat = categories.find((c) => c.id === it.category_id)?.name;
            const h = hpp[it.id];
            const pct = Number(h?.margin_percent ?? 0);
            const hasHpp = !!h && Number(h.hpp) > 0;
            const marginTone = pct >= 30 ? "text-emerald-700 bg-emerald-500/15"
              : pct >= 10 ? "text-amber-700 bg-amber-500/15"
              : "text-destructive bg-destructive/15";
            // Low-stock check: any recipe ingredient at/under min stock
            const itemRecipes = recipes.filter((r) => r.menu_item_id === it.id);
            const lowIngs = itemRecipes
              .map((r) => ingredients[r.ingredient_id])
              .filter((ig): ig is IngredientRow => !!ig && ig.min_stock > 0 && Number(ig.current_stock) <= Number(ig.min_stock));
            const outIngs = itemRecipes
              .map((r) => ({ r, ig: ingredients[r.ingredient_id] }))
              .filter(({ r, ig }) => ig && Number(ig.current_stock) < Number(r.quantity));
            return (
              <div
                key={it.id}
                className="group flex gap-3 rounded-xl border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {it.image_url ? (
                    <img src={it.image_url} alt={it.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/50">
                      <ImageIcon className="h-6 w-6" />
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{it.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {cat ?? "Tanpa kategori"}
                      </div>
                    </div>
                    {!it.is_available && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        Off
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-medium">{formatIDR(it.price)}</span>
                    {(it as any).condition_grade && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                        title={`Pre-loved Kondisi ${(it as any).condition_grade}`}>
                        ♻️ Kond. {(it as any).condition_grade}
                      </span>
                    )}
                    {hasHpp && (
                      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${marginTone}`}
                        title={`HPP ${formatIDR(Number(h.hpp))} · Margin ${formatIDR(Number(h.margin))}`}>
                        {pct >= 10 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                        {pct}%
                      </span>
                    )}
                    {it.track_stock && outIngs.length > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-semibold text-destructive"
                        title={`Bahan kurang: ${outIngs.map(({ ig }) => ig?.name).join(", ")}`}>
                        <AlertTriangle className="h-2.5 w-2.5" /> Habis
                      </span>
                    )}
                    {it.track_stock && outIngs.length === 0 && lowIngs.length > 0 && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700"
                        title={`Bahan menipis: ${lowIngs.map((ig) => ig.name).join(", ")}`}>
                        <AlertTriangle className="h-2.5 w-2.5" /> Low {lowIngs.length}
                      </span>
                    )}
                  </div>
                  {it.description?.trim() ? (
                    <>
                      <div className="group/desc mt-1.5 flex items-start gap-1">
                        <p className="line-clamp-2 flex-1 text-[11px] leading-snug text-muted-foreground">
                          {it.description.trim()}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(it.description!.trim());
                            setCopiedDescId(it.id);
                            setTimeout(() => setCopiedDescId(null), 1500);
                          }}
                          title="Salin deskripsi"
                          className="shrink-0 rounded p-0.5 text-muted-foreground/40 opacity-0 transition-opacity hover:text-muted-foreground group-hover/desc:opacity-100"
                        >
                          {copiedDescId === it.id ? (
                            <Check className="h-3 w-3 text-emerald-500" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </button>
                      </div>
                      {(() => {
                        const len = it.description.trim().length;
                        const color = len < 50
                          ? "text-amber-500"
                          : len <= 300
                          ? "text-emerald-600"
                          : "text-destructive";
                        const label = len < 50 ? "terlalu pendek" : len > 300 ? "terlalu panjang" : "ideal";
                        return (
                          <span className={`mt-0.5 block text-[10px] tabular-nums ${color}`}>
                            {len} karakter · {label}
                          </span>
                        );
                      })()}
                    </>
                  ) : (
                    <p className="mt-1.5 text-[11px] italic text-muted-foreground/50">
                      Belum ada deskripsi
                    </p>
                  )}
                  <div className="mt-auto flex items-center gap-1 pt-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(it)} title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setModifierItem(it)} title="Varian & Modifier">
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => generateForItem(it)}
                      disabled={generatingIds.has(it.id)}
                      title={it.description?.trim() ? "Generate ulang deskripsi AI" : "Generate deskripsi AI"}
                      className="text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                    >
                      {generatingIds.has(it.id) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(it)}
                      className="text-destructive hover:text-destructive"
                      title="Hapus"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modifierItem && shop && (
        <ModifierManager
          open={!!modifierItem}
          onClose={() => setModifierItem(null)}
          menuItemId={modifierItem.id}
          menuItemName={modifierItem.name}
          shopId={shop.id}
        />
      )}

      <Dialog open={batchOpen} onOpenChange={(v) => {
        if (batchRunning) return;
        setBatchOpen(v);
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-violet-500" />
              Generate Deskripsi Massal
            </DialogTitle>
          </DialogHeader>

          {!batchRunning && !batchDone && (
            <div className="space-y-4 py-1">
              <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-800 dark:bg-violet-950/30">
                <p className="text-sm font-medium text-violet-800 dark:text-violet-200">
                  {noDescCount} produk belum punya deskripsi
                </p>
                <p className="mt-1 text-xs text-violet-600/80 dark:text-violet-400">
                  AI akan membuatkan deskripsi menarik + tag SEO untuk setiap produk secara otomatis. Deskripsi yang sudah ada tidak akan diubah.
                </p>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3 text-xs text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                <strong>Estimasi waktu:</strong> ~{Math.ceil(noDescCount * 4 / 60)} menit
                ({noDescCount} produk × 4 detik/produk untuk menghindari batas rate Gemini)
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setBatchOpen(false)}>Batal</Button>
                <Button onClick={runBatchGenerate} className="bg-violet-600 hover:bg-violet-700 text-white">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Mulai Generate
                </Button>
              </DialogFooter>
            </div>
          )}

          {batchRunning && (
            <div className="space-y-4 py-1">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Memproses…</span>
                  <span className="font-medium tabular-nums">{batchProgress} / {batchTotal}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all duration-500"
                    style={{ width: `${(batchProgress / batchTotal) * 100}%` }}
                  />
                </div>
                {batchCurrentName && (
                  <p className="truncate text-xs text-muted-foreground">
                    Sedang: <span className="font-medium text-foreground">{batchCurrentName}</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <Check className="h-4 w-4" /> {batchSuccess} berhasil
                </span>
                {batchErrors.length > 0 && (
                  <span className="flex items-center gap-1.5 text-destructive">
                    <X className="h-4 w-4" /> {batchErrors.length} gagal
                  </span>
                )}
              </div>
              <DialogFooter>
                <Button variant="ghost" size="sm" onClick={() => { batchAbortRef.current = true; }}
                  className="text-muted-foreground">
                  Batalkan
                </Button>
              </DialogFooter>
            </div>
          )}

          {batchDone && (
            <div className="space-y-4 py-1">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
                  Selesai!
                </p>
                <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-400">
                  {batchSuccess} produk berhasil dibuatkan deskripsi.
                  {batchErrors.length > 0 && ` ${batchErrors.length} produk gagal.`}
                </p>
              </div>
              {batchErrors.length > 0 && (
                <div className="max-h-32 overflow-y-auto rounded-md border border-destructive/20 bg-destructive/5 p-3 space-y-1">
                  <p className="text-xs font-medium text-destructive mb-1">Produk yang gagal:</p>
                  {batchErrors.map((e, i) => (
                    <p key={i} className="text-[11px] text-muted-foreground">{e}</p>
                  ))}
                </div>
              )}
              <DialogFooter>
                <Button onClick={() => setBatchOpen(false)}>Tutup</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
