import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";
import { MessageCircle, Plane, Hotel, BookOpen, MapPin, Phone } from "lucide-react";
import type { ThemeHomeProps } from "../types";

type UmrohPackage = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number | null;
  departure_date: string | null;
  image_url: string | null;
  hotel_makkah: string | null;
  hotel_madinah: string | null;
  airline: string | null;
};
type Facility = { id: string; title: string; icon: string | null };
type FAQ = { id: string; question: string; answer: string };
type Flyer = { id: string; title: string | null; image_url: string };
type Testimonial = { id: string; name: string; message: string; rating: number | null; image_url: string | null };

export default function UmrohHome({ shop }: ThemeHomeProps) {
  const [packages, setPackages] = useState<UmrohPackage[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [flyers, setFlyers] = useState<Flyer[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [selectedPkg, setSelectedPkg] = useState<UmrohPackage | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", note: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!shop) return;
    (async () => {
      const [p, f, q, fl, t] = await Promise.all([
        supabase.from("umroh_packages").select("*").eq("shop_id", shop.id).order("departure_date", { ascending: true }),
        supabase.from("umroh_facilities").select("id,title,icon").eq("shop_id", shop.id),
        supabase.from("umroh_faqs").select("id,question,answer").eq("shop_id", shop.id),
        supabase.from("flyers").select("id,title,image_url").eq("shop_id", shop.id).order("created_at", { ascending: false }),
        supabase.from("testimonials").select("id,name,message,rating,image_url").eq("shop_id", shop.id).order("created_at", { ascending: false }).limit(6),
      ]);
      setPackages((p.data ?? []) as UmrohPackage[]);
      setFacilities((f.data ?? []) as Facility[]);
      setFaqs((q.data ?? []) as FAQ[]);
      setFlyers((fl.data ?? []) as Flyer[]);
      setTestimonials((t.data ?? []) as Testimonial[]);
    })();
  }, [shop]);

  const wa = (shop.whatsapp || shop.phone || "").replace(/\D/g, "");
  const waLink = (text: string) => wa ? `https://wa.me/${wa}?text=${encodeURIComponent(text)}` : "#";

  const submitLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error("Nama dan WhatsApp wajib diisi");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("leads").insert({
      shop_id: shop.id,
      name: form.name,
      phone: form.phone,
      note: form.note,
      source: selectedPkg ? `Umroh: ${selectedPkg.name}` : "Storefront Umroh",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Gagal mengirim pendaftaran");
      return;
    }
    toast.success("Pendaftaran terkirim. Kami akan menghubungi via WhatsApp.");
    if (wa) {
      const msg = `Assalamualaikum, saya ${form.name} ingin daftar ${selectedPkg?.name ?? "umroh"}. ${form.note}`;
      window.open(waLink(msg), "_blank");
    }
    setForm({ name: "", phone: "", note: "" });
    setSelectedPkg(null);
  };

  return (
    <div className="space-y-12 pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-700 p-8 text-emerald-50 sm:p-12">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-emerald-400/20 blur-3xl" />
        <div className="relative space-y-4">
          <Badge className="bg-amber-400 text-emerald-950 hover:bg-amber-400">Travel Umroh Terpercaya</Badge>
          <h1 className="font-serif text-3xl font-bold leading-tight sm:text-5xl">{shop.name}</h1>
          {shop.description && <p className="max-w-2xl text-emerald-100/90">{shop.description}</p>}
          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild size="lg" className="bg-amber-400 text-emerald-950 hover:bg-amber-300">
              <a href="#paket"><Plane className="mr-2 h-4 w-4" /> Lihat Paket</a>
            </Button>
            {wa && (
              <Button asChild size="lg" variant="outline" className="border-emerald-100/40 bg-transparent text-emerald-50 hover:bg-emerald-50/10">
                <a href={waLink(`Assalamualaikum, saya ingin tanya tentang paket umroh ${shop.name}`)} target="_blank" rel="noopener">
                  <MessageCircle className="mr-2 h-4 w-4" /> Konsultasi WA
                </a>
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Paket */}
      <section id="paket" className="space-y-6">
        <header>
          <h2 className="font-serif text-2xl font-bold">Paket Umroh</h2>
          <p className="text-sm text-muted-foreground">Pilih paket yang sesuai kebutuhan jamaah</p>
        </header>
        {packages.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Belum ada paket tersedia.</Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                {p.image_url && <img src={p.image_url} alt={p.name} className="h-40 w-full object-cover" />}
                <div className="space-y-3 p-5">
                  <h3 className="font-serif text-lg font-bold">{p.name}</h3>
                  {p.description && <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {p.duration_days && <div>🗓 {p.duration_days} hari</div>}
                    {p.departure_date && <div>✈️ Berangkat {new Date(p.departure_date).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>}
                    {p.airline && <div>Maskapai: {p.airline}</div>}
                    {p.hotel_makkah && <div><Hotel className="mr-1 inline h-3 w-3" />Makkah: {p.hotel_makkah}</div>}
                    {p.hotel_madinah && <div><Hotel className="mr-1 inline h-3 w-3" />Madinah: {p.hotel_madinah}</div>}
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <span className="font-serif text-xl font-bold text-emerald-700">{formatIDR(Number(p.price))}</span>
                    <Button size="sm" onClick={() => { setSelectedPkg(p); document.getElementById("daftar")?.scrollIntoView({ behavior: "smooth" }); }} className="bg-emerald-700 hover:bg-emerald-800">Daftar</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Fasilitas */}
      {facilities.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold">Fasilitas</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {facilities.map((f) => (
              <Card key={f.id} className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">✓</div>
                <span className="text-sm font-medium">{f.title}</span>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Galeri Flyer */}
      {flyers.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold">Galeri & Flyer</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {flyers.map((fl) => (
              <a key={fl.id} href={fl.image_url} target="_blank" rel="noopener" className="group overflow-hidden rounded-lg">
                <img src={fl.image_url} alt={fl.title ?? ""} className="aspect-square w-full object-cover transition group-hover:scale-105" />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Testimoni */}
      {testimonials.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold">Testimoni Jamaah</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {testimonials.map((t) => (
              <Card key={t.id} className="space-y-2 p-5">
                <div className="flex items-center gap-3">
                  {t.image_url ? <img src={t.image_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="h-10 w-10 rounded-full bg-emerald-100" />}
                  <div>
                    <p className="text-sm font-semibold">{t.name}</p>
                    {t.rating && <p className="text-xs text-amber-500">{"★".repeat(t.rating)}</p>}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">"{t.message}"</p>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-serif text-2xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5" /> FAQ & Syarat Dokumen</h2>
          <div className="space-y-2">
            {faqs.map((f) => (
              <details key={f.id} className="group rounded-lg border bg-card p-4">
                <summary className="cursor-pointer text-sm font-semibold">{f.question}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Form pendaftaran */}
      <section id="daftar" className="rounded-2xl border bg-card p-6 sm:p-8">
        <h2 className="font-serif text-2xl font-bold">Daftar Sekarang</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          {selectedPkg ? <>Paket terpilih: <span className="font-semibold text-foreground">{selectedPkg.name}</span></> : "Isi data jamaah, tim kami akan menghubungi via WhatsApp."}
        </p>
        <form onSubmit={submitLead} className="grid gap-3 sm:grid-cols-2">
          <Input placeholder="Nama lengkap" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Input placeholder="No. WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <Textarea placeholder="Catatan (jumlah jamaah, request khusus, dll)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className="sm:col-span-2" />
          <Button type="submit" disabled={submitting} className="bg-emerald-700 hover:bg-emerald-800 sm:col-span-2">
            {submitting ? "Mengirim..." : "Kirim Pendaftaran"}
          </Button>
        </form>
      </section>

      {/* Kontak */}
      <section className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
        {shop.address && <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {shop.address}</p>}
        {shop.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {shop.phone}</p>}
      </section>

      {/* WA FAB */}
      {wa && (
        <a href={waLink(`Assalamualaikum, saya ingin tanya tentang ${shop.name}`)} target="_blank" rel="noopener"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition hover:scale-110 hover:bg-green-600">
          <MessageCircle className="h-6 w-6" />
        </a>
      )}
    </div>
  );
}
