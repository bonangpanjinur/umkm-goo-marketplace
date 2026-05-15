import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageCircle, Phone, MapPin, Sparkles, Star, Award } from "lucide-react";
import type { ThemeHomeProps } from "../types";

type Offering = {
  id: string; title: string; short_desc: string | null; long_desc: string | null;
  price_label: string | null; cover_image_url: string | null; category: string | null;
};
type Flyer = { id: string; title: string; image_url: string };
type Testimonial = { id: string; name: string; quote: string; rating: number | null; photo_url: string | null; role_or_trip: string | null };
type About = { story: string | null; vision: string | null; certifications: unknown; credentials: unknown; team: unknown };

export default function SalesProHome({ shop }: ThemeHomeProps) {
  const [offerings, setOfferings] = useState<Offering[]>([]);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [about, setAbout] = useState<About | null>(null);
  const [selected, setSelected] = useState<Offering | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", note: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!shop) return;
    (async () => {
      const [o, fl, t, a] = await Promise.all([
        supabase.from("sales_offerings").select("*").eq("shop_id", shop.id).eq("is_active", true).order("sort_order"),
        supabase.from("flyers").select("id,title,image_url").eq("shop_id", shop.id).eq("is_active", true).order("sort_order"),
        supabase.from("testimonials").select("id,name,quote,rating,photo_url,role_or_trip").eq("shop_id", shop.id).eq("is_active", true).order("sort_order").limit(8),
        supabase.from("shop_about").select("*").eq("shop_id", shop.id).maybeSingle(),
      ]);
      setOfferings((o.data ?? []) as Offering[]);
      setFlyers((fl.data ?? []) as Flyer[]);
      setTestimonials((t.data ?? []) as Testimonial[]);
      setAbout((a.data ?? null) as About | null);
    })();
  }, [shop]);

  const wa = shop.whatsapp || shop.phone || "";
  const waLink = (msg: string) => `https://wa.me/${wa.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;

  async function submitLead() {
    if (form.name.length < 2 || form.phone.replace(/\D/g, "").length < 8) {
      toast.error("Nama & nomor WA wajib diisi");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("leads").insert({
      shop_id: shop.id,
      source: "sales_inquiry",
      linked_id: selected?.id ?? null,
      linked_type: selected ? "sales_offering" : null,
      full_name: form.name,
      phone: form.phone,
      message: form.note || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Inquiry terkirim. Kami akan segera menghubungi Anda.");
    if (wa) window.open(waLink(`Halo, saya ${form.name}${selected ? ` tertarik dengan: ${selected.title}` : " ingin info layanan"}`), "_blank");
    setSelected(null);
    setForm({ name: "", phone: "", note: "" });
  }

  const certifications = Array.isArray(about?.certifications) ? (about?.certifications as string[]) : [];
  const credentials = Array.isArray(about?.credentials) ? (about?.credentials as string[]) : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-background">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-800 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
        <div className="container relative mx-auto px-4 py-20 sm:py-28 text-center">
          <Badge className="bg-white/20 border-white/30 text-white mb-4">Layanan Profesional</Badge>
          <h1 className="text-4xl sm:text-6xl font-bold mb-4 tracking-tight">{shop.name}</h1>
          {shop.tagline && <p className="text-xl text-purple-100 mb-2">{shop.tagline}</p>}
          {shop.description && <p className="max-w-2xl mx-auto text-purple-100/90">{shop.description}</p>}
          <div className="mt-8 flex gap-3 justify-center flex-wrap">
            {wa && (
              <Button asChild size="lg" className="bg-white text-purple-800 hover:bg-purple-50">
                <a href={waLink(`Halo ${shop.name}, saya ingin diskusi layanan`)} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 h-5 w-5" /> Hubungi via WA
                </a>
              </Button>
            )}
            <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/40 hover:bg-white/20" asChild>
              <a href="#kontak">Konsultasi Gratis</a>
            </Button>
          </div>
        </div>
      </section>

      {/* OFFERINGS */}
      {offerings.length > 0 && (
        <section className="container mx-auto px-4 py-14">
          <h2 className="text-3xl font-bold text-center mb-2">Layanan Kami</h2>
          <p className="text-muted-foreground text-center mb-8">Pilih layanan yang sesuai kebutuhan Anda</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {offerings.map((o) => (
              <Card key={o.id} className="overflow-hidden flex flex-col hover:shadow-lg transition">
                {o.cover_image_url && <img src={o.cover_image_url} alt={o.title} className="h-44 w-full object-cover" />}
                <div className="p-5 flex-1 flex flex-col">
                  {o.category && <Badge variant="outline" className="self-start mb-2 text-xs">{o.category}</Badge>}
                  <h3 className="font-bold text-lg">{o.title}</h3>
                  {o.short_desc && <p className="text-sm text-muted-foreground mt-1">{o.short_desc}</p>}
                  {o.price_label && <p className="mt-3 text-lg font-bold text-purple-700">{o.price_label}</p>}
                  <Button className="mt-4 bg-purple-700 hover:bg-purple-800" onClick={() => setSelected(o)}>
                    <MessageCircle className="mr-2 h-4 w-4" /> Tanya Layanan
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* FLYERS / PORTFOLIO */}
      {flyers.length > 0 && (
        <section className="bg-slate-50 py-14">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-8">Portofolio & Brosur</h2>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {flyers.map((f) => (
                <a key={f.id} href={f.image_url} target="_blank" rel="noreferrer" className="block group">
                  <img src={f.image_url} alt={f.title} className="w-full aspect-square object-cover rounded-lg group-hover:scale-105 transition" />
                  {f.title && <p className="mt-1 text-xs text-center text-muted-foreground">{f.title}</p>}
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TESTIMONIALS */}
      {testimonials.length > 0 && (
        <section className="container mx-auto px-4 py-14">
          <h2 className="text-3xl font-bold text-center mb-8">Apa Kata Klien</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.id} className="p-5">
                {t.rating && (
                  <div className="flex gap-0.5 mb-2">
                    {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />)}
                  </div>
                )}
                <p className="italic text-muted-foreground">"{t.quote}"</p>
                <div className="flex items-center gap-3 mt-4">
                  {t.photo_url ? (
                    <img src={t.photo_url} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold">{t.name[0]}</div>
                  )}
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    {t.role_or_trip && <p className="text-xs text-muted-foreground">{t.role_or_trip}</p>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* ABOUT */}
      {(about?.story || about?.vision || certifications.length > 0 || credentials.length > 0) && (
        <section className="bg-slate-50 py-14">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-3xl font-bold text-center mb-8">Tentang Kami</h2>
            {about?.story && <p className="text-muted-foreground whitespace-pre-wrap mb-6">{about.story}</p>}
            {about?.vision && (
              <div className="mb-6">
                <h3 className="font-bold flex items-center gap-2 mb-1"><Sparkles className="h-5 w-5 text-purple-700" />Visi</h3>
                <p className="text-muted-foreground">{about.vision}</p>
              </div>
            )}
            {(certifications.length > 0 || credentials.length > 0) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {[...certifications, ...credentials].map((c, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-white border">
                    <Award className="h-5 w-5 text-purple-700 shrink-0 mt-0.5" />
                    <p className="text-sm">{c}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* CONTACT FORM */}
      <section id="kontak" className="container mx-auto px-4 py-14 max-w-2xl">
        <h2 className="text-3xl font-bold text-center mb-2">Konsultasi Gratis</h2>
        <p className="text-muted-foreground text-center mb-6">Tinggalkan kontak, tim kami akan menghubungi Anda</p>
        <Card className="p-6">
          <div className="space-y-3">
            <Input placeholder="Nama lengkap" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="Nomor WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Textarea placeholder="Ceritakan kebutuhan Anda" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} rows={4} />
          </div>
          <Button className="w-full mt-4 bg-purple-700 hover:bg-purple-800" disabled={submitting} onClick={submitLead}>
            {submitting ? "Mengirim..." : "Kirim Inquiry"}
          </Button>
        </Card>
      </section>

      <footer className="border-t bg-slate-900 text-slate-300 py-8">
        <div className="container mx-auto px-4 text-sm space-y-2">
          {shop.address && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{shop.address}</p>}
          {shop.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" />{shop.phone}</p>}
        </div>
      </footer>

      {wa && (
        <a href={waLink(`Halo ${shop.name}`)} target="_blank" rel="noreferrer"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg hover:scale-110 transition">
          <MessageCircle className="h-7 w-7" />
        </a>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <Card className="w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">{selected.title}</h3>
            {selected.long_desc && <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">{selected.long_desc}</p>}
            <div className="space-y-3">
              <Input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Textarea placeholder="Pertanyaan / kebutuhan" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSelected(null)}>Batal</Button>
              <Button className="flex-1 bg-purple-700 hover:bg-purple-800" disabled={submitting} onClick={submitLead}>Kirim</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
