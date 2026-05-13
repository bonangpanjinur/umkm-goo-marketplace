import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MarketplaceHeader, MarketplaceFooter } from "@/components/marketplace/MarketplaceHeader";
import { Loader2, Sparkles, ChevronLeft, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/toko/$slug/custom-order")({
  validateSearch: (s: Record<string, unknown>) => ({ produk: typeof s.produk === "string" ? s.produk : undefined }),
  component: CustomOrderForm,
});

function CustomOrderForm() {
  const { slug } = Route.useParams();
  const { produk } = Route.useSearch();
  const [shop, setShop] = useState<{ id: string; name: string } | null>(null);
  const [product, setProduct] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [desc, setDesc] = useState("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [deadline, setDeadline] = useState("");
  const [refUrl, setRefUrl] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from("coffee_shops").select("id, name").eq("slug", slug).maybeSingle();
      if (s) {
        setShop(s);
        if (produk) {
          const { data: p } = await (supabase as any).from("menu_items").select("id, name").eq("id", produk).maybeSingle();
          if (p) setProduct(p);
        }
      }
      setLoading(false);
    })();
  }, [slug, produk]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!shop) return;
    if (!name.trim() || !contact.trim() || !desc.trim()) {
      toast.error("Nama, kontak, dan deskripsi wajib diisi");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from("custom_order_requests").insert({
      shop_id: shop.id,
      product_id: product?.id ?? null,
      customer_name: name.trim(),
      customer_contact: contact.trim(),
      description: desc.trim(),
      budget_min: budgetMin ? Number(budgetMin) : null,
      budget_max: budgetMax ? Number(budgetMax) : null,
      deadline: deadline || null,
      reference_image_url: refUrl.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    try { localStorage.setItem(`kopihub:custom-order-contact:${slug}`, contact.trim()); } catch {}
    setSubmitted(true);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!shop) return <div className="p-12 text-center">Toko tidak ditemukan.</div>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MarketplaceHeader />
      <main className="flex-1 mx-auto max-w-2xl w-full px-4 py-8">
        <Link to="/toko/$slug" params={{ slug }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ChevronLeft className="h-4 w-4" /> Kembali ke {shop.name}
        </Link>

        {submitted ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="mt-4 text-xl font-bold">Permintaan terkirim!</h1>
            <p className="mt-2 text-sm text-muted-foreground">Tim {shop.name} akan menghubungi kamu di {contact} secepatnya.</p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              <Link to="/toko/$slug" params={{ slug }}>
                <Button variant="outline">Kembali ke toko</Button>
              </Link>
              <Link to="/toko/$slug/custom-order/status" params={{ slug }}>
                <Button>Lihat Status Permintaan</Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 space-y-4">
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Form Custom Order</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Kirim brief pesanan khusus ke {shop.name}{product ? ` untuk produk "${product.name}"` : ""}.
              </p>
              <Link
                to="/toko/$slug/custom-order/status"
                params={{ slug }}
                className="text-xs text-primary hover:underline mt-2 inline-block"
              >
                Sudah pernah kirim? Cek status permintaanmu →
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Nama lengkap *</Label>
                <Input className="mt-1" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <Label>WhatsApp / kontak *</Label>
                <Input className="mt-1" value={contact} onChange={e => setContact(e.target.value)} placeholder="08xxxxxxxxxx" required />
              </div>
            </div>

            <div>
              <Label>Deskripsi pesanan *</Label>
              <Textarea className="mt-1" rows={5} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Jelaskan ukuran, warna, bahan, jumlah, dan request khusus lainnya…" required />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Budget minimum (Rp)</Label>
                <Input className="mt-1" type="number" min={0} value={budgetMin} onChange={e => setBudgetMin(e.target.value)} placeholder="100000" />
              </div>
              <div>
                <Label>Budget maksimum (Rp)</Label>
                <Input className="mt-1" type="number" min={0} value={budgetMax} onChange={e => setBudgetMax(e.target.value)} placeholder="500000" />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Deadline (opsional)</Label>
                <Input className="mt-1" type="date" value={deadline} onChange={e => setDeadline(e.target.value)} />
              </div>
              <div>
                <Label>URL gambar referensi (opsional)</Label>
                <Input className="mt-1" value={refUrl} onChange={e => setRefUrl(e.target.value)} placeholder="https://…" />
              </div>
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Mengirim…</> : "Kirim Permintaan"}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">Penjual akan menghubungi kamu lewat kontak yang kamu kirim.</p>
          </form>
        )}
      </main>
      <MarketplaceFooter />
    </div>
  );
}
