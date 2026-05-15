import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatIDR } from "@/lib/format";
import { toast } from "sonner";
import { MessageCircle, Plane, Hotel, MapPin, Phone, CalendarDays, Star } from "lucide-react";
import type { ThemeHomeProps } from "../types";

type UmrohPackage = {
  id: string; name: string; description: string | null;
  departure_date: string | null; return_date: string | null; duration_days: number | null;
  hotel_makkah: string | null; hotel_madinah: string | null; airline: string | null;
  price_quad: number | null; price_triple: number | null; price_double: number | null;
  cover_image_url: string | null; quota_total: number | null; quota_filled: number;
};
type Facility = { id: string; title: string; description: string | null; icon: string };
type FAQ = { id: string; question: string; answer: string; category: string };
type Flyer = { id: string; title: string; image_url: string };
type Testimonial = { id: string; name: string; quote: string; rating: number | null; photo_url: string | null; role_or_trip: string | null };

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
      const [p, fac, faq, fl, t] = await Promise.all([
        supabase.from("umroh_packages").select("*").eq("shop_id", shop.id).eq("is_active", true).order("sort_order"),
        supabase.from("umroh_facilities").select("*").eq("shop_id", shop.id).order("sort_order"),
        supabase.from("umroh_faqs").select("*").eq("shop_id", shop.id).order("sort_order"),
        supabase.from("flyers").select("id,title,image_url").eq("shop_id", shop.id).eq("is_active", true).order("sort_order"),
        supabase.from("testimonials").select("id,name,quote,rating,photo_url,role_or_trip").eq("shop_id", shop.id).eq("is_active", true).order("sort_order").limit(8),
      ]);
      setPackages((p.data ?? []) as UmrohPackage[]);
      setFacilities((fac.data ?? []) as Facility[]);
      setFaqs((faq.data ?? []) as FAQ[]);
      setFlyers((fl.data ?? []) as Flyer[]);
      setTestimonials((t.data ?? []) as Testimonial[]);
    })();
  }, [shop]);

  const wa = shop.whatsapp || shop.phone || "";
  const waLink = (msg: string) => `https://wa.me/${wa.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`;

  async function submitLead() {
    if (!selectedPkg) return;
    if (form.name.length < 2 || form.phone.replace(/\D/g, "").length < 8) {
      toast.error("Nama & nomor WA wajib diisi");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("leads").insert({
      shop_id: shop.id,
      source: "umroh_register",
      linked_id: selectedPkg.id,
      linked_type: "umroh_package",
      full_name: form.name,
      phone: form.phone,
      message: form.note || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Pendaftaran terkirim. Kami akan menghubungi Anda.");
    if (wa) window.open(waLink(`Halo, saya ${form.name} ingin daftar paket: ${selectedPkg.name}`), "_blank");
    setSelectedPkg(null);
    setForm({ name: "", phone: "", note: "" });
  }

  const minPrice = (p: UmrohPackage) => Math.min(...[p.price_quad, p.price_triple, p.price_double].filter((x): x is number => typeof x === "number"));

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-background">
      {/* HERO */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-700 to-emerald-900 text-white">
        <div className="container mx-auto px-4 py-16 sm:py-24 text-center">
          <Badge className="bg-emerald-600/40 border-emerald-400 text-emerald-50 mb-4">Travel & Umroh Resmi</Badge>
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">{shop.name}</h1>
          {shop.description && <p className="max-w-2xl mx-auto text-emerald-100 text-lg">{shop.description}</p>}
          {wa && (
            <Button asChild size="lg" className="mt-8 bg-white text-emerald-800 hover:bg-emerald-50">
              <a href={waLink(`Halo ${shop.name}, saya ingin info paket umroh`)} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-2 h-5 w-5" /> Konsultasi via WhatsApp
              </a>
            </Button>
          )}
        </div>
      </section>

      {/* PAKET */}
      {packages.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Paket Perjalanan</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((p) => (
              <Card key={p.id} className="overflow-hidden flex flex-col">
                {p.cover_image_url && <img src={p.cover_image_url} alt={p.name} className="h-48 w-full object-cover" />}
                <div className="p-4 flex-1 flex flex-col">
                  <h3 className="font-bold text-lg">{p.name}</h3>
                  {p.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
                  <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                    {p.departure_date && <div className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{new Date(p.departure_date).toLocaleDateString("id-ID")}{p.duration_days && ` · ${p.duration_days} hari`}</div>}
                    {p.airline && <div className="flex items-center gap-1"><Plane className="h-3.5 w-3.5" />{p.airline}</div>}
                    {p.hotel_makkah && <div className="flex items-center gap-1"><Hotel className="h-3.5 w-3.5" />Mekkah: {p.hotel_makkah}</div>}
                    {p.hotel_madinah && <div className="flex items-center gap-1"><Hotel className="h-3.5 w-3.5" />Madinah: {p.hotel_madinah}</div>}
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground">Mulai dari</p>
                    <p className="text-xl font-bold text-emerald-700">{Number.isFinite(minPrice(p)) ? formatIDR(minPrice(p)) : "Hubungi"}</p>
                  </div>
                  {p.quota_total && (
                    <p className="text-xs text-muted-foreground mt-1">Sisa kuota: {Math.max(0, p.quota_total - p.quota_filled)} / {p.quota_total}</p>
                  )}
                  <Button className="mt-4 bg-emerald-700 hover:bg-emerald-800" onClick={() => setSelectedPkg(p)}>Daftar Sekarang</Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* FASILITAS */}
      {facilities.length > 0 && (
        <section className="bg-emerald-50/50 py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6 text-center">Fasilitas</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {facilities.map((f) => (
                <Card key={f.id} className="p-4 text-center">
                  <div className="text-2xl mb-2">{f.icon || "✓"}</div>
                  <h3 className="font-semibold">{f.title}</h3>
                  {f.description && <p className="text-xs text-muted-foreground mt-1">{f.description}</p>}
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FLYER */}
      {flyers.length > 0 && (
        <section className="container mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold mb-6 text-center">Galeri Brosur</h2>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {flyers.map((f) => (
              <a key={f.id} href={f.image_url} target="_blank" rel="noreferrer" className="block group">
                <img src={f.image_url} alt={f.title} className="w-full aspect-[3/4] object-cover rounded-lg group-hover:opacity-90 transition" />
                {f.title && <p className="mt-1 text-xs text-center text-muted-foreground">{f.title}</p>}
              </a>
            ))}
          </div>
        </section>
      )}

      {/* TESTIMONI */}
      {testimonials.length > 0 && (
        <section className="bg-emerald-50/50 py-12">
          <div className="container mx-auto px-4">
            <h2 className="text-2xl font-bold mb-6 text-center">Testimoni Jamaah</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <Card key={t.id} className="p-4">
                  <div className="flex items-center gap-3 mb-2">
                    {t.photo_url ? (
                      <img src={t.photo_url} alt={t.name} className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold">{t.name[0]}</div>
                    )}
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      {t.role_or_trip && <p className="text-xs text-muted-foreground">{t.role_or_trip}</p>}
                    </div>
                  </div>
                  {t.rating && (
                    <div className="flex gap-0.5 mb-1">
                      {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />)}
                    </div>
                  )}
                  <p className="text-sm italic text-muted-foreground">"{t.quote}"</p>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {faqs.length > 0 && (
        <section className="container mx-auto px-4 py-12 max-w-3xl">
          <h2 className="text-2xl font-bold mb-6 text-center">FAQ & Syarat Dokumen</h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details key={f.id} className="rounded-lg border p-4 group">
                <summary className="font-semibold cursor-pointer flex items-center justify-between">
                  <span>{f.question}</span>
                  <Badge variant="outline" className="text-xs ml-2">{f.category === "documents" ? "Dokumen" : "Umum"}</Badge>
                </summary>
                <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* CONTACT */}
      <footer className="border-t bg-emerald-900 text-emerald-50 py-8">
        <div className="container mx-auto px-4 text-sm space-y-2">
          {shop.address && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{shop.address}</p>}
          {shop.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" />{shop.phone}</p>}
        </div>
      </footer>

      {/* WA FAB */}
      {wa && (
        <a href={waLink(`Halo ${shop.name}, saya ingin tanya seputar umroh`)} target="_blank" rel="noreferrer"
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg hover:scale-110 transition">
          <MessageCircle className="h-7 w-7" />
        </a>
      )}

      {/* DAFTAR MODAL */}
      {selectedPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedPkg(null)}>
          <Card className="w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Pendaftaran: {selectedPkg.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">Isi data Anda, tim kami akan menghubungi via WhatsApp.</p>
            <div className="space-y-3">
              <Input placeholder="Nama lengkap" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input placeholder="Nomor WhatsApp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Textarea placeholder="Catatan (opsional)" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedPkg(null)}>Batal</Button>
              <Button className="flex-1 bg-emerald-700 hover:bg-emerald-800" disabled={submitting} onClick={submitLead}>
                {submitting ? "Mengirim..." : "Kirim Pendaftaran"}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
