import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";
import { MessageCircle, Phone, MapPin, Sparkles, CheckCircle2 } from "lucide-react";
import type { ThemeHomeProps } from "../types";

type Offering = {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  features: string[] | null;
};
type Flyer = { id: string; title: string | null; image_url: string };
type Testimonial = { id: string; name: string; message: string; rating: number | null; image_url: string | null; company: string | null };
type About = { headline: string | null; about: string | null; credentials: string[] | null; logo_url: string | null };

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
        supabase.from("sales_offerings").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false }),
        supabase.from("flyers").select("id,title,image_url").eq("shop_id", shop.id).order("created_at", { ascending: false }),
        supabase.from("testimonials").select("id,name,message,rating,image_url,company").eq("shop_id", shop.id).order("created_at", { ascending: false }).limit(6),
        supabase.from("shop_about").select("headline,about,credentials,logo_url").eq("shop_id", shop.id).maybeSingle(),
      ]);
      setOfferings((o.data ?? []) as Offering[]);
      setFlyers((fl.data ?? []) as Flyer[]);
      setTestimonials((t.data ?? []) as Testimonial[]);
      setAbout((a.data ?? null) as About | null);
    })();
  }, [shop]);

  const wa = (shop.whatsapp || shop.phone || "").replace(/\D/g, "");
  const waLink = (text: string) => wa ? `https://wa.me/${wa}?text=${encodeURIComponent(text)}` : "#";

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error("Nama dan No. HP wajib diisi");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("leads").insert({
      shop_id: shop.id,
      name: form.name,
      phone: form.phone,
      note: form.note,
      source: selected ? `Tanya: ${selected.name}` : "Storefront Sales",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Gagal mengirim");
      return;
    }
    toast.success("Permintaan terkirim. Kami segera menghubungi.");
    if (wa) {
      const msg = `Halo, saya ${form.name} tertarik ${selected?.name ?? "layanan Anda"}. ${form.note}`;
      window.open(waLink(msg), "_blank");
    }
    setForm({ name: "", phone: "", note: "" });
    setSelected(null);
  };

  return (
    <div className="space-y-16 pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900 p-8 text-white sm:p-14">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-indigo-400/30 blur-3xl" />
        <div className="relative grid gap-8 lg:grid-cols-2 lg:items-center">
          <div className="space-y-5">
            <Badge className="bg-fuchsia-500 hover:bg-fuchsia-500"><Sparkles className="mr-1 h-3 w-3" /> Profesional & Terpercaya</Badge>
            <h1 className="text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              {about?.headline ?? shop.name}
            </h1>
            {shop.description && <p className="max-w-xl text-lg text-slate-200">{shop.description}</p>}
            <div className="flex flex-wrap gap-3">
              {wa && (
                <Button asChild size="lg" className="bg-green-500 hover:bg-green-600">
                  <a href={waLink(`Halo, saya ingin tanya tentang layanan ${shop.name}`)} target="_blank" rel="noopener">
                    <MessageCircle className="mr-2 h-4 w-4" /> Hubungi via WhatsApp
                  </a>
                </Button>
              )}
              <Button asChild size="lg" variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10">
                <a href="#layanan">Lihat Layanan</a>
              </Button>
            </div>
          </div>
          {about?.logo_url && (
            <div className="flex justify-center lg:justify-end">
              <img src={about.logo_url} alt={shop.name} className="max-h-48 rounded-2xl bg-white/10 p-4 backdrop-blur" />
            </div>
          )}
        </div>
      </section>

      {/* Layanan/Produk */}
      <section id="layanan" className="space-y-6">
        <header>
          <h2 className="text-3xl font-bold tracking-tight">Layanan Kami</h2>
          <p className="text-muted-foreground">Pilih layanan yang sesuai kebutuhan Anda</p>
        </header>
        {offerings.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Belum ada layanan dipublikasikan.</Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {offerings.map((o) => (
              <Card key={o.id} className="group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-xl">
                {o.image_url && <img src={o.image_url} alt={o.name} className="h-44 w-full object-cover" />}
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <h3 className="text-lg font-bold">{o.name}</h3>
                  {o.description && <p className="text-sm text-muted-foreground">{o.description}</p>}
                  {o.features && o.features.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {o.features.slice(0, 4).map((f, i) => (
                        <li key={i} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" /> {f}</li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-auto flex items-center justify-between pt-3">
                    {o.price ? <span className="text-xl font-bold text-indigo-700">{formatIDR(Number(o.price))}</span> : <span className="text-sm text-muted-foreground">Hubungi untuk harga</span>}
                    <Button size="sm" onClick={() => { setSelected(o); document.getElementById("kontak")?.scrollIntoView({ behavior: "smooth" }); }}>
                      Tanya
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Flyer / Portfolio */}
      {flyers.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-3xl font-bold">Portfolio & Flyer</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {flyers.map((fl) => (
              <a key={fl.id} href={fl.image_url} target="_blank" rel="noopener" className="group overflow-hidden rounded-xl">
                <img src={fl.image_url} alt={fl.title ?? ""} className="aspect-[3/4] w-full object-cover transition group-hover:scale-105" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Testimoni */}
      {testimonials.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-3xl font-bold">Apa Kata Klien Kami</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.id} className="space-y-3 p-6">
                {t.rating && <p className="text-amber-500">{"★".repeat(t.rating)}</p>}
                <p className="text-sm">"{t.message}"</p>
                <div className="flex items-center gap-3 pt-2">
                  {t.image_url ? <img src={t.image_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-indigo-100" />}
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    {t.company && <p className="text-xs text-muted-foreground">{t.company}</p>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* About / Kredensial */}
      {about && (about.about || (about.credentials && about.credentials.length > 0)) && (
        <section className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-50 p-8 sm:p-12 dark:from-indigo-950/30 dark:to-purple-950/30">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold">Tentang Kami</h2>
              {about.about && <p className="mt-3 text-muted-foreground">{about.about}</p>}
            </div>
            {about.credentials && about.credentials.length > 0 && (
              <ul className="space-y-2">
                {about.credentials.map((c, i) => (
                  <li key={i} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" /> <span>{c}</span></li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Lead form */}
      <section id="kontak" className="rounded-2xl border bg-card p-6 sm:p-10">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold">Konsultasi Gratis</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {selected ? <>Tertarik: <span className="font-semibold text-foreground">{selected.name}</span></> : "Tinggalkan kontak Anda, kami akan segera menghubungi."}
          </p>
          <form onSubmit={submitLead} className="grid gap-3 sm:grid-cols-2">
            <Input placeholder="Nama" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input placeholder="No. HP / WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Textarea placeholder="Kebutuhan Anda" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="sm:col-span-2" />
            <Button type="submit" disabled={submitting} size="lg" className="bg-indigo-600 hover:bg-indigo-700 sm:col-span-2">
              {submitting ? "Mengirim..." : "Kirim & Lanjut ke WhatsApp"}
            </Button>
          </form>
        </div>
      </section>

      <section className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
        {shop.address && <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {shop.address}</p>}
        {shop.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {shop.phone}</p>}
      </section>

      {wa && (
        <a href={waLink(`Halo, saya ingin tanya tentang ${shop.name}`)} target="_blank" rel="noopener"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition hover:scale-110 hover:bg-green-600">
          <MessageCircle className="h-6 w-6" />
        </a>
      )}
    </div>
  );
}
