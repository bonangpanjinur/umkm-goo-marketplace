import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Info, Loader2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/about-page")({
  head: () => ({ meta: [{ title: "Halaman Tentang — Merchant" }] }),
  component: Page,
});

function Page() {
  const { shop, loading } = useCurrentShop();
  const [story, setStory] = useState("");
  const [vision, setVision] = useState("");
  const [certs, setCerts] = useState<string[]>([]);
  const [creds, setCreds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shop) return;
    (async () => {
      const { data } = await supabase.from("shop_about").select("*").eq("shop_id", shop.id).maybeSingle();
      if (data) {
        setStory(data.story ?? "");
        setVision(data.vision ?? "");
        setCerts(Array.isArray(data.certifications) ? (data.certifications as string[]) : []);
        setCreds(Array.isArray(data.credentials) ? (data.credentials as string[]) : []);
      }
    })();
  }, [shop?.id]);

  async function save() {
    if (!shop) return;
    setSaving(true);
    const { error } = await supabase.from("shop_about").upsert({
      shop_id: shop.id, story, vision, certifications: certs, credentials: creds, team: [],
    }, { onConflict: "shop_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tersimpan");
  }

  if (loading || !shop) return <div className="p-6"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const ListEditor = ({ label, items, setItems }: { label: string; items: string[]; setItems: (v: string[]) => void }) => (
    <div>
      <Label>{label}</Label>
      <div className="space-y-2 mt-1">
        {items.map((it, i) => (
          <div key={i} className="flex gap-2">
            <Input value={it} onChange={(e) => { const n = [...items]; n[i] = e.target.value; setItems(n); }} />
            <Button variant="outline" size="icon" onClick={() => setItems(items.filter((_, idx) => idx !== i))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setItems([...items, ""])}><Plus className="h-3 w-3 mr-1" />Tambah</Button>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4 sm:p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1 flex items-center gap-2"><Info className="h-6 w-6" />Halaman Tentang</h1>
      <p className="text-sm text-muted-foreground mb-6">Cerita, visi, sertifikasi, dan kredensial bisnis</p>
      <Card className="p-6 space-y-4">
        <div><Label>Cerita / Story</Label><Textarea value={story} onChange={(e) => setStory(e.target.value)} rows={5} /></div>
        <div><Label>Visi</Label><Textarea value={vision} onChange={(e) => setVision(e.target.value)} rows={3} /></div>
        <ListEditor label="Sertifikasi" items={certs} setItems={setCerts} />
        <ListEditor label="Kredensial / Penghargaan" items={creds} setItems={setCreds} />
        <Button onClick={save} disabled={saving}>{saving ? "Menyimpan..." : "Simpan"}</Button>
      </Card>
    </div>
  );
}
