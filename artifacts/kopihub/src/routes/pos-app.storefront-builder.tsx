import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { TampilanTabs } from "@/components/TampilanTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  LayoutTemplate, Plus, Trash2, GripVertical, Image, Type, Star, Package, Tag, ChevronUp, ChevronDown, Eye
} from "lucide-react";
import { useCurrentShop } from "@/lib/use-shop";
import { UploadableImage } from "@/components/UploadableImage";

export const Route = createFileRoute("/pos-app/storefront-builder")({ component: StorefrontBuilderPage });

type SectionType = "hero_banner" | "featured_products" | "promo_text" | "categories" | "testimonials";

type Section = {
  id: string;
  type: SectionType;
  title: string;
  subtitle?: string;
  image_url?: string;
  button_label?: string;
  button_url?: string;
  enabled: boolean;
};

const SECTION_TEMPLATES: { type: SectionType; label: string; icon: any; description: string }[] = [
  { type: "hero_banner",       label: "Banner Hero",         icon: Image,   description: "Gambar besar dengan teks & tombol CTA" },
  { type: "featured_products", label: "Produk Unggulan",     icon: Package, description: "Grid produk pilihan yang ditonjolkan" },
  { type: "promo_text",        label: "Teks Promo",          icon: Type,    description: "Blok teks promo / pengumuman" },
  { type: "categories",        label: "Kategori Produk",     icon: Tag,     description: "Tampilkan kategori produk sebagai chip" },
  { type: "testimonials",      label: "Ulasan Terpilih",     icon: Star,    description: "Tampilkan ulasan bintang 5 terbaik" },
];

let _id = 1;
function newId() { return `s${_id++}`; }

const defaultSections: Section[] = [
  { id: newId(), type: "hero_banner",       title: "Selamat Datang",   subtitle: "Produk terbaik untuk kamu", button_label: "Belanja Sekarang", button_url: "#", enabled: true },
  { id: newId(), type: "featured_products", title: "Produk Unggulan",  enabled: true },
  { id: newId(), type: "promo_text",        title: "Promo Spesial",    subtitle: "Diskon s/d 30% untuk pembelian pertama!", enabled: true },
];

export default function StorefrontBuilderPage() {
  const { shop } = useCurrentShop();
  const [sections, setSections] = useState<Section[]>(defaultSections);
  const [selected, setSelected] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  function addSection(type: SectionType) {
    const tmpl = SECTION_TEMPLATES.find(t => t.type === type)!;
    setSections(s => [...s, { id: newId(), type, title: tmpl.label, enabled: true }]);
  }

  function removeSection(id: string) {
    setSections(s => s.filter(x => x.id !== id));
    if (selected === id) setSelected(null);
  }

  function moveSection(id: string, dir: -1 | 1) {
    setSections(s => {
      const idx = s.findIndex(x => x.id === id);
      if (idx < 0) return s;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= s.length) return s;
      const arr = [...s];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  }

  function updateSection(id: string, patch: Partial<Section>) {
    setSections(s => s.map(x => x.id === id ? { ...x, ...patch } : x));
  }

  async function save() {
    setSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    toast.success("Layout storefront disimpan");
  }

  const sel = sections.find(s => s.id === selected);
  const tmpl = sel ? SECTION_TEMPLATES.find(t => t.type === sel.type) : null;

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" /> Storefront Builder
          </h1>
          <p className="text-sm text-muted-foreground">Susun tampilan halaman toko kamu</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreview(p => !p)}>
            <Eye className="h-4 w-4 mr-1.5" /> {preview ? "Edit" : "Preview"}
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? "Menyimpan..." : "Simpan Layout"}
          </Button>
        </div>
      </div>

      {preview ? (
        <Card className="p-6 space-y-4">
          <p className="text-xs text-muted-foreground uppercase font-semibold">Preview Storefront</p>
          {sections.filter(s => s.enabled).map(sec => (
            <div key={sec.id} className="rounded-xl border border-border overflow-hidden">
              {sec.type === "hero_banner" && (
                <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-8 text-center">
                  <h2 className="text-2xl font-bold">{sec.title}</h2>
                  {sec.subtitle && <p className="text-muted-foreground mt-1">{sec.subtitle}</p>}
                  {sec.button_label && (
                    <Button className="mt-4">{sec.button_label}</Button>
                  )}
                </div>
              )}
              {sec.type === "featured_products" && (
                <div className="p-4">
                  <h3 className="font-semibold mb-3">{sec.title}</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[1,2,3].map(i => (
                      <div key={i} className="rounded-lg bg-muted h-24 animate-pulse" />
                    ))}
                  </div>
                </div>
              )}
              {sec.type === "promo_text" && (
                <div className="bg-amber-50 border-amber-200 border p-4 text-center">
                  <p className="font-semibold text-amber-800">{sec.title}</p>
                  {sec.subtitle && <p className="text-sm text-amber-700 mt-1">{sec.subtitle}</p>}
                </div>
              )}
              {sec.type === "categories" && (
                <div className="p-4">
                  <h3 className="font-semibold mb-2">{sec.title}</h3>
                  <div className="flex gap-2 flex-wrap">
                    {["Makanan","Minuman","Snack","Dessert"].map(c => (
                      <Badge key={c} variant="secondary">{c}</Badge>
                    ))}
                  </div>
                </div>
              )}
              {sec.type === "testimonials" && (
                <div className="p-4">
                  <h3 className="font-semibold mb-3">{sec.title}</h3>
                  <div className="rounded-lg border p-3 text-sm">
                    <div className="flex gap-0.5 mb-1">{[...Array(5)].map((_, i) => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}</div>
                    <p className="text-muted-foreground">"Produknya bagus, pengiriman cepat!"</p>
                    <p className="text-xs mt-1 font-medium">— Pelanggan</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase">Susunan Halaman ({sections.length} section)</p>
            {sections.map((sec, idx) => {
              const t = SECTION_TEMPLATES.find(x => x.type === sec.type)!;
              const Icon = t.icon;
              return (
                <Card
                  key={sec.id}
                  className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${selected === sec.id ? "border-primary ring-1 ring-primary/30" : "hover:border-primary/40"} ${!sec.enabled ? "opacity-50" : ""}`}
                  onClick={() => setSelected(selected === sec.id ? null : sec.id)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{sec.title}</p>
                    <p className="text-xs text-muted-foreground">{t.label}</p>
                  </div>
                  {!sec.enabled && <Badge variant="secondary" className="text-xs">Nonaktif</Badge>}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={e => { e.stopPropagation(); moveSection(sec.id, -1); }} disabled={idx === 0} className="p-0.5 rounded hover:bg-muted disabled:opacity-30">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); moveSection(sec.id, 1); }} disabled={idx === sections.length - 1} className="p-0.5 rounded hover:bg-muted disabled:opacity-30">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button onClick={e => { e.stopPropagation(); removeSection(sec.id); }} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </Card>
              );
            })}

            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-2">Tambah Section</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {SECTION_TEMPLATES.map(t => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.type}
                      onClick={() => addSection(t.type)}
                      className="flex items-center gap-2.5 rounded-lg border border-dashed border-border p-3 text-left hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    >
                      <Icon className="h-4 w-4 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{t.label}</p>
                        <p className="text-xs text-muted-foreground">{t.description}</p>
                      </div>
                      <Plus className="h-4 w-4 ml-auto text-muted-foreground shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <aside>
            {sel && tmpl ? (
              <Card className="p-4 space-y-3">
                <p className="text-sm font-semibold flex items-center gap-2">
                  <tmpl.icon className="h-4 w-4 text-primary" /> Edit Section
                </p>
                <div>
                  <Label className="text-xs">Judul</Label>
                  <Input className="mt-1" value={sel.title} onChange={e => updateSection(sel.id, { title: e.target.value })} />
                </div>
                {["hero_banner","promo_text"].includes(sel.type) && (
                  <div>
                    <Label className="text-xs">Subjudul / Deskripsi</Label>
                    <Input className="mt-1" value={sel.subtitle ?? ""} onChange={e => updateSection(sel.id, { subtitle: e.target.value })} />
                  </div>
                )}
                {sel.type === "hero_banner" && (
                  <>
                    <div>
                      <Label className="text-xs">Gambar Banner</Label>
                      <UploadableImage value={sel.image_url || null} onChange={(url) => updateSection(sel.id, { image_url: url ?? "" })} bucket="shop-images" pathPrefix={`${shop?.id ?? ""}/storefront`} />
                    </div>
                    <div>
                      <Label className="text-xs">Label Tombol CTA</Label>
                      <Input className="mt-1" value={sel.button_label ?? ""} onChange={e => updateSection(sel.id, { button_label: e.target.value })} />
                    </div>
                    <div>
                      <Label className="text-xs">URL Tombol CTA</Label>
                      <Input className="mt-1" value={sel.button_url ?? ""} placeholder="#produk" onChange={e => updateSection(sel.id, { button_url: e.target.value })} />
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between pt-1 border-t border-border">
                  <Label className="text-xs">Tampilkan section ini</Label>
                  <button
                    onClick={() => updateSection(sel.id, { enabled: !sel.enabled })}
                    className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${sel.enabled ? "bg-primary" : "bg-muted-foreground/30"}`}
                  >
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${sel.enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </Card>
            ) : (
              <Card className="p-6 text-center text-muted-foreground">
                <LayoutTemplate className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Pilih section di kiri untuk mengeditnya</p>
              </Card>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
