import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Phone, Calendar, ImageIcon, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/custom-orders")({
  head: () => ({ meta: [{ title: "Permintaan Custom — Merchant" }] }),
  component: CustomOrdersPage,
});

type Req = {
  id: string;
  customer_name: string;
  customer_contact: string;
  description: string;
  budget_min: number | null;
  budget_max: number | null;
  deadline: string | null;
  reference_image_url: string | null;
  status: string;
  owner_note: string | null;
  product_id: string | null;
  created_at: string;
};

const STATUS = [
  { v: "pending",   l: "Menunggu",  cls: "bg-amber-100 text-amber-700" },
  { v: "accepted",  l: "Diterima",  cls: "bg-emerald-100 text-emerald-700" },
  { v: "rejected",  l: "Ditolak",   cls: "bg-rose-100 text-rose-700" },
  { v: "completed", l: "Selesai",   cls: "bg-sky-100 text-sky-700" },
];

function CustomOrdersPage() {
  const { shop, loading: shopLoading } = useCurrentShop();
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!shop?.id) return;
    load();
  }, [shop?.id]);

  async function load() {
    if (!shop?.id) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("custom_order_requests")
      .select("*")
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data ?? []) as Req[]);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await (supabase as any).from("custom_order_requests").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Status diperbarui"); load(); }
  }

  async function saveNote(id: string) {
    const { error } = await (supabase as any).from("custom_order_requests").update({ owner_note: note }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Catatan disimpan"); setEditing(null); load(); }
  }

  if (shopLoading || loading) {
    return <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>;
  }

  const filtered = filter === "all" ? items : items.filter(i => i.status === filter);

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2"><FileText className="h-5 w-5" /> Permintaan Custom Order</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Brief pesanan khusus dari pembeli untuk produk yang menerima custom order.</p>
      </div>

      <div className="flex gap-2 flex-wrap text-xs">
        <button onClick={() => setFilter("all")} className={`px-3 py-1 rounded-full font-medium ${filter==="all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>Semua ({items.length})</button>
        {STATUS.map(s => (
          <button key={s.v} onClick={() => setFilter(s.v)} className={`px-3 py-1 rounded-full font-medium ${filter===s.v ? "bg-primary text-primary-foreground" : s.cls}`}>{s.l} ({items.filter(i => i.status === s.v).length})</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-sm text-muted-foreground">
          Belum ada permintaan custom order.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const st = STATUS.find(s => s.v === r.status) ?? STATUS[0];
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="font-semibold">{r.customer_name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <Phone className="h-3 w-3" /> {r.customer_contact}
                      <span>•</span>
                      <span>{new Date(r.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span>
                    </div>
                  </div>
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full ${st.cls}`}>{st.l}</span>
                </div>

                <p className="text-sm whitespace-pre-wrap">{r.description}</p>

                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {(r.budget_min || r.budget_max) && (
                    <span>Budget: Rp {(r.budget_min ?? 0).toLocaleString("id-ID")} – Rp {(r.budget_max ?? 0).toLocaleString("id-ID")}</span>
                  )}
                  {r.deadline && (
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Deadline: {new Date(r.deadline).toLocaleDateString("id-ID")}</span>
                  )}
                  {r.reference_image_url && (
                    <a href={r.reference_image_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      <ImageIcon className="h-3 w-3" /> Lihat referensi <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {editing === r.id ? (
                  <div className="space-y-2">
                    <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} placeholder="Catatan internal…" />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveNote(r.id)}>Simpan</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditing(null)}>Batal</Button>
                    </div>
                  </div>
                ) : r.owner_note ? (
                  <div className="text-xs bg-muted/40 rounded-md p-2">
                    <span className="font-medium">Catatan: </span>{r.owner_note}
                    <button className="ml-2 text-primary hover:underline" onClick={() => { setEditing(r.id); setNote(r.owner_note ?? ""); }}>Edit</button>
                  </div>
                ) : (
                  <button className="text-xs text-primary hover:underline" onClick={() => { setEditing(r.id); setNote(""); }}>+ Tambah catatan</button>
                )}

                <div className="flex gap-2 flex-wrap pt-2 border-t border-border">
                  <a href={`https://wa.me/${r.customer_contact.replace(/\D/g,"")}`} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="outline">Hubungi WhatsApp</Button>
                  </a>
                  {STATUS.filter(s => s.v !== r.status).map(s => (
                    <Button key={s.v} size="sm" variant="outline" onClick={() => updateStatus(r.id, s.v)}>
                      Tandai {s.l}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
