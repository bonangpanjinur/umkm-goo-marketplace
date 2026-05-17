import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stamp, Loader2, Save, Trash2 } from "lucide-react";
import { UploadableImage } from "@/components/UploadableImage";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/studio-watermark")({
  head: () => ({ meta: [{ title: "Watermark Editor — Studio" }] }),
  component: Page,
});

type Pos = "tl" | "tr" | "bl" | "br" | "center" | "tile";
type Settings = {
  logo_url: string | null;
  text: string;
  position: Pos;
  opacity: number;   // 0..1
  scale: number;     // 0.05..0.5  (relative to width)
  rotation: number;  // -180..180
};

const DEFAULT: Settings = {
  logo_url: null, text: "", position: "br", opacity: 0.5, scale: 0.18, rotation: 0,
};

const POSITIONS: { v: Pos; l: string }[] = [
  { v: "tl", l: "Kiri Atas" }, { v: "tr", l: "Kanan Atas" },
  { v: "bl", l: "Kiri Bawah" }, { v: "br", l: "Kanan Bawah" },
  { v: "center", l: "Tengah" }, { v: "tile", l: "Ubin (berulang)" },
];

const SAMPLE = "https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=70&auto=format&fit=crop";

function Page() {
  const { shop, loading } = useCurrentShop();
  const [s, setS] = useState<Settings>(DEFAULT);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shop) return;
    const ws = (shop as { watermark_settings?: Partial<Settings> }).watermark_settings ?? {};
    setS({ ...DEFAULT, ...ws });
  }, [shop?.id]);

  async function save() {
    if (!shop) return;
    setSaving(true);
    const { error } = await supabase.from("shops")
      .update({ watermark_settings: s as never })
      .eq("id", shop.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pengaturan watermark tersimpan");
  }

  async function clearLogo() {
    setS({ ...s, logo_url: null });
  }

  if (loading || !shop) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Stamp className="h-6 w-6" />Watermark Editor</h1>
          <p className="text-sm text-muted-foreground">Atur tampilan watermark untuk preview foto yang dibagikan ke klien</p>
        </div>
        <Button onClick={save} disabled={saving}><Save className="h-4 w-4 mr-1" />{saving ? "Menyimpan..." : "Simpan"}</Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4 space-y-4">
          <div>
            <Label className="mb-2 block">Logo Watermark (PNG transparan disarankan)</Label>
            <UploadableImage
              value={s.logo_url}
              onChange={(url) => setS({ ...s, logo_url: url })}
              bucket="studio-watermarks"
              pathPrefix={shop.id}
            />
            {s.logo_url && (
              <Button size="sm" variant="ghost" onClick={clearLogo} className="mt-2 text-destructive">
                <Trash2 className="h-3 w-3 mr-1" />Hapus logo
              </Button>
            )}
          </div>

          <div>
            <Label>Teks Watermark (opsional)</Label>
            <Input value={s.text} onChange={e => setS({ ...s, text: e.target.value })} placeholder="© Studio Saya" />
            <p className="text-xs text-muted-foreground mt-1">Ditampilkan jika tidak ada logo, atau sebagai pelengkap.</p>
          </div>

          <div>
            <Label>Posisi</Label>
            <Select value={s.position} onValueChange={(v) => setS({ ...s, position: v as Pos })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{POSITIONS.map(p => <SelectItem key={p.v} value={p.v}>{p.l}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div>
            <Label>Opasitas: {Math.round(s.opacity * 100)}%</Label>
            <Slider min={5} max={100} step={5} value={[Math.round(s.opacity * 100)]}
              onValueChange={(v) => setS({ ...s, opacity: v[0] / 100 })} />
          </div>

          <div>
            <Label>Ukuran: {Math.round(s.scale * 100)}% dari lebar foto</Label>
            <Slider min={5} max={50} step={1} value={[Math.round(s.scale * 100)]}
              onValueChange={(v) => setS({ ...s, scale: v[0] / 100 })} />
          </div>

          <div>
            <Label>Rotasi: {s.rotation}°</Label>
            <Slider min={-45} max={45} step={1} value={[s.rotation]}
              onValueChange={(v) => setS({ ...s, rotation: v[0] })} />
          </div>
        </Card>

        <Card className="p-4">
          <Label className="mb-2 block">Preview</Label>
          <WatermarkPreview settings={s} src={SAMPLE} />
          <p className="text-xs text-muted-foreground mt-2">
            Watermark hanya ditambahkan pada preview yang dibagikan ke klien lewat link galeri.
            File asli tetap tersimpan tanpa watermark.
          </p>
        </Card>
      </div>
    </div>
  );
}

function WatermarkPreview({ settings, src }: { settings: Settings; src: string }) {
  const { logo_url, text, position, opacity, scale, rotation } = settings;
  const wmStyle = useMemo<React.CSSProperties>(() => {
    const base: React.CSSProperties = { opacity, transform: `rotate(${rotation}deg)`, pointerEvents: "none" };
    return base;
  }, [opacity, rotation]);

  function posClass(p: Pos): string {
    switch (p) {
      case "tl": return "top-3 left-3";
      case "tr": return "top-3 right-3";
      case "bl": return "bottom-3 left-3";
      case "br": return "bottom-3 right-3";
      case "center": return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
      default: return "";
    }
  }

  const sizePct = `${scale * 100}%`;

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-md bg-muted">
      <img src={src} alt="" className="h-full w-full object-cover" />
      {position === "tile" ? (
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 place-items-center" style={wmStyle}>
          {Array.from({ length: 9 }).map((_, i) => (
            <WatermarkContent key={i} logo={logo_url} text={text} sizePct={sizePct} />
          ))}
        </div>
      ) : (
        <div className={`absolute ${posClass(position)}`} style={{ ...wmStyle, width: sizePct }}>
          <WatermarkContent logo={logo_url} text={text} sizePct="100%" />
        </div>
      )}
    </div>
  );
}

function WatermarkContent({ logo, text, sizePct }: { logo: string | null; text: string; sizePct: string }) {
  if (logo) {
    return (
      <div className="flex flex-col items-center gap-1" style={{ width: sizePct }}>
        <img src={logo} alt="" className="w-full h-auto object-contain drop-shadow" />
        {text && <span className="text-white text-[10px] font-semibold drop-shadow">{text}</span>}
      </div>
    );
  }
  return (
    <span className="text-white font-bold drop-shadow text-base sm:text-lg whitespace-nowrap">
      {text || "Watermark"}
    </span>
  );
}
