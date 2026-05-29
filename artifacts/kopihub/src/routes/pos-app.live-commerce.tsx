import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Radio, Plus, Trash2, Pencil, Loader2, Eye, ShoppingBag, Copy, ExternalLink, Users, Video,
} from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/live-commerce")({
  head: () => ({ meta: [{ title: "Live Commerce — Merchant" }] }),
  component: LiveCommercePage,
});

type MenuItem = { id: string; name: string; price: number; image_url: string | null };
type LiveSession = {
  id: string;
  title: string;
  description: string | null;
  status: "scheduled" | "live" | "ended";
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  stream_url: string | null;
  viewer_count: number;
  order_count: number;
  total_sales: number;
  products: string[];
  created_at: string;
};

const STATUS_LABEL: Record<string, string> = { scheduled: "Terjadwal", live: "LIVE", ended: "Selesai" };
const STATUS_COLOR: Record<string, string> = {
  scheduled: "bg-amber-100 text-amber-700", live: "bg-red-500 text-white animate-pulse", ended: "bg-gray-100 text-gray-600",
};

function defaultForm() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return { title: "", description: "", scheduled_at: d.toISOString().slice(0, 16), stream_url: "", products: [] as string[] };
}

export default function LiveCommercePage() {
  const { shop } = useCurrentShop();
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("sessions");
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<LiveSession | null>(null);
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!shop) return;
    setLoading(true);
    const [{ data: ls }, { data: mi }] = await Promise.all([
      (supabase as any).from("live_sessions").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false }),
      supabase.from("menu_items").select("id,name,price,image_url").eq("shop_id", shop.id).eq("is_active", true).order("name"),
    ]);
    setSessions((ls ?? []) as LiveSession[]);
    setMenuItems((mi as MenuItem[]) ?? []);
    setLoading(false);
  }, [shop]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => { setEditing(null); setForm(defaultForm()); setShowDialog(true); };
  const openEdit = (s: LiveSession) => {
    setEditing(s);
    setForm({ title: s.title, description: s.description ?? "", scheduled_at: s.scheduled_at ? new Date(s.scheduled_at).toISOString().slice(0, 16) : "", stream_url: s.stream_url ?? "", products: s.products ?? [] });
    setShowDialog(true);
  };

  const save = async () => {
    if (!shop || !form.title) { toast.error("Judul sesi wajib diisi"); return; }
    setSaving(true);
    const payload: any = {
      shop_id: shop.id, title: form.title.trim(), description: form.description.trim() || null,
      scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      stream_url: form.stream_url.trim() || null,
      products: form.products, status: editing?.status ?? "scheduled",
    };
    const { error } = editing
      ? await (supabase as any).from("live_sessions").update(payload).eq("id", editing.id)
      : await (supabase as any).from("live_sessions").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Sesi diperbarui" : "Sesi live dibuat");
    setShowDialog(false);
    load();
  };

  const goLive = async (s: LiveSession) => {
    await (supabase as any).from("live_sessions").update({ status: "live", started_at: new Date().toISOString() }).eq("id", s.id);
    toast.success("Sesi live dimulai! 🔴");
    load();
  };

  const endLive = async (s: LiveSession) => {
    await (supabase as any).from("live_sessions").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", s.id);
    toast.success("Sesi live berakhir");
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus sesi ini?")) return;
    await (supabase as any).from("live_sessions").delete().eq("id", id);
    load();
  };

  const copyLink = (s: LiveSession) => {
    const url = `${window.location.origin}/live/${shop?.slug ?? ""}?session=${s.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Link live disalin");
  };

  const toggleProduct = (id: string) => {
    setForm(f => ({
      ...f,
      products: f.products.includes(id) ? f.products.filter(p => p !== id) : [...f.products, id],
    }));
  };

  const activeSessions = sessions.filter(s => s.status !== "ended");
  const endedSessions = sessions.filter(s => s.status === "ended");

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Radio className="h-6 w-6 text-red-500" /> Live Commerce</h1>
          <p className="mt-1 text-sm text-muted-foreground">Jual produk secara live — tampilkan, promosikan, dan terima pesanan real-time.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Buat Sesi Live</Button>
      </div>

      {activeSessions.length > 0 && (
        <div className="mb-6 space-y-3">
          {activeSessions.map(s => (
            <Card key={s.id} className={`p-4 ${s.status === "live" ? "border-red-400 bg-red-50/40" : ""}`}>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold">{s.title}</span>
                    <Badge className={`text-[11px] ${STATUS_COLOR[s.status]}`}>{STATUS_LABEL[s.status]}</Badge>
                  </div>
                  {s.description && <p className="text-xs text-muted-foreground line-clamp-1">{s.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1 flex-wrap">
                    {s.status === "live" && (
                      <>
                        <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{s.viewer_count} penonton</span>
                        <span className="flex items-center gap-1"><ShoppingBag className="h-3.5 w-3.5" />{s.order_count} pesanan · {formatIDR(s.total_sales)}</span>
                      </>
                    )}
                    {s.scheduled_at && s.status === "scheduled" && (
                      <span>Dijadwalkan: {new Date(s.scheduled_at).toLocaleString("id-ID")}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {s.status === "scheduled" && (
                    <Button size="sm" className="bg-red-500 hover:bg-red-600" onClick={() => goLive(s)}>
                      <Radio className="h-3.5 w-3.5 mr-1" /> Mulai Live
                    </Button>
                  )}
                  {s.status === "live" && (
                    <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={() => endLive(s)}>
                      Akhiri Sesi
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => copyLink(s)}><Copy className="h-4 w-4" /></Button>
                  <a href={`/live/${shop?.slug ?? ""}?session=${s.id}`} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="ghost"><ExternalLink className="h-4 w-4" /></Button>
                  </a>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                  {s.status === "scheduled" && (
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : sessions.length === 0 ? (
        <Card className="flex flex-col items-center py-16 text-center gap-3">
          <Radio className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-semibold">Belum ada sesi live</p>
          <p className="text-sm text-muted-foreground max-w-xs">Buat sesi live pertama dan mulai jual produk secara langsung kepada pelanggan.</p>
          <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Buat Sesi Live</Button>
        </Card>
      ) : endedSessions.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">Riwayat Sesi</h3>
          <div className="space-y-2">
            {endedSessions.map(s => (
              <Card key={s.id} className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <span className="font-medium text-sm">{s.title}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                      {s.ended_at && <span>{new Date(s.ended_at).toLocaleDateString("id-ID")}</span>}
                      <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{s.viewer_count}</span>
                      <span className="flex items-center gap-1"><ShoppingBag className="h-3 w-3" />{s.order_count} pesanan · {formatIDR(s.total_sales)}</span>
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editing ? "Edit Sesi" : "Buat Sesi Live"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Judul Sesi</Label>
              <Input className="mt-1" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Flash Sale Malam Ini! 🔥" />
            </div>
            <div>
              <Label>Deskripsi (opsional)</Label>
              <Textarea className="mt-1" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>Jadwal Mulai (opsional)</Label>
              <Input className="mt-1" type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} />
            </div>
            <div>
              <Label>Stream URL (YouTube Live / RTMP / lainnya — opsional)</Label>
              <Input className="mt-1" value={form.stream_url} onChange={e => setForm(f => ({ ...f, stream_url: e.target.value }))} placeholder="https://youtube.com/live/..." />
            </div>
            <div>
              <Label>Produk Unggulan</Label>
              <p className="text-xs text-muted-foreground mb-2">Pilih produk yang akan ditampilkan saat live</p>
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded-lg p-2">
                {menuItems.map(m => (
                  <label key={m.id} className="flex items-center gap-2 cursor-pointer p-1.5 rounded hover:bg-muted/40">
                    <input type="checkbox" checked={form.products.includes(m.id)} onChange={() => toggleProduct(m.id)} className="rounded" />
                    {m.image_url && <img src={m.image_url} alt="" className="h-7 w-7 rounded object-cover" />}
                    <span className="text-sm flex-1 min-w-0 truncate">{m.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{formatIDR(m.price)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}{editing ? "Simpan" : "Buat Sesi"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
