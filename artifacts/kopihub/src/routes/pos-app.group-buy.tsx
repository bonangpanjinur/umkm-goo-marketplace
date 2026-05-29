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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Users, Plus, Trash2, Pencil, Loader2, ShoppingBag, Clock, CheckCircle2, XCircle, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/pos-app/group-buy")({
  head: () => ({ meta: [{ title: "Group Buy / Patungan — Merchant" }] }),
  component: GroupBuyPage,
});

type MenuItem = { id: string; name: string; price: number };
type GroupBuy = {
  id: string;
  menu_item_id: string;
  title: string;
  description: string | null;
  original_price: number;
  group_price: number;
  min_participants: number;
  max_participants: number | null;
  current_participants: number;
  status: "draft" | "open" | "success" | "failed" | "cancelled";
  deadline_at: string;
  created_at: string;
  menu_item?: { name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft", open: "Terbuka", success: "Berhasil", failed: "Gagal", cancelled: "Dibatalkan",
};
const STATUS_COLOR: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  open: "bg-blue-100 text-blue-700",
  success: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-500",
};

function defaultForm() {
  const d = new Date(Date.now() + 7 * 86400000);
  return {
    menu_item_id: "", title: "", description: "",
    group_price: 0, min_participants: 5, max_participants: "" as number | "",
    deadline_at: d.toISOString().slice(0, 16),
  };
}

export default function GroupBuyPage() {
  const { shop } = useCurrentShop();
  const [campaigns, setCampaigns] = useState<GroupBuy[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<GroupBuy | null>(null);
  const [form, setForm] = useState(defaultForm());
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!shop) return;
    setLoading(true);
    const [{ data: gbs }, { data: items }] = await Promise.all([
      (supabase as any).from("group_buys").select("*, menu_item:menu_items(name)").eq("shop_id", shop.id).order("created_at", { ascending: false }),
      supabase.from("menu_items").select("id,name,price").eq("shop_id", shop.id).eq("is_active", true).order("name"),
    ]);
    setCampaigns((gbs ?? []) as GroupBuy[]);
    setMenuItems((items as MenuItem[]) ?? []);
    setLoading(false);
  }, [shop]);

  useEffect(() => { load(); }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm(defaultForm());
    setShowDialog(true);
  };

  const openEdit = (gb: GroupBuy) => {
    setEditing(gb);
    setForm({
      menu_item_id: gb.menu_item_id,
      title: gb.title,
      description: gb.description ?? "",
      group_price: gb.group_price,
      min_participants: gb.min_participants,
      max_participants: gb.max_participants ?? "",
      deadline_at: new Date(gb.deadline_at).toISOString().slice(0, 16),
    });
    setShowDialog(true);
  };

  const save = async () => {
    if (!shop) return;
    if (!form.menu_item_id || !form.title || form.group_price <= 0) {
      toast.error("Produk, judul, dan harga grup wajib diisi");
      return;
    }
    setSaving(true);
    const menuItem = menuItems.find(m => m.id === form.menu_item_id);
    const payload: any = {
      shop_id: shop.id,
      menu_item_id: form.menu_item_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      original_price: menuItem?.price ?? form.group_price,
      group_price: Number(form.group_price),
      min_participants: Number(form.min_participants),
      max_participants: form.max_participants !== "" ? Number(form.max_participants) : null,
      deadline_at: new Date(form.deadline_at).toISOString(),
      status: editing?.status ?? "open",
    };
    const { error } = editing
      ? await (supabase as any).from("group_buys").update(payload).eq("id", editing.id)
      : await (supabase as any).from("group_buys").insert(payload);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? "Kampanye diperbarui" : "Kampanye group buy dibuat");
    setShowDialog(false);
    load();
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await (supabase as any).from("group_buys").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Status diperbarui"); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Hapus kampanye ini? Peserta yang sudah bergabung akan dinotifikasi.")) return;
    setDeleting(id);
    await (supabase as any).from("group_buys").delete().eq("id", id);
    setDeleting(null);
    load();
  };

  const discountPct = (gb: GroupBuy) =>
    gb.original_price > 0 ? Math.round((1 - gb.group_price / gb.original_price) * 100) : 0;

  const progressPct = (gb: GroupBuy) =>
    gb.min_participants > 0
      ? Math.min(100, Math.round((gb.current_participants / gb.min_participants) * 100))
      : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" /> Group Buy / Patungan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Buat kampanye pembelian bersama — harga lebih murah jika kuota terpenuhi.
          </p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Buat Kampanye</Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : campaigns.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <Users className="h-10 w-10 text-muted-foreground/40" />
          <p className="font-semibold">Belum ada kampanye group buy</p>
          <p className="text-sm text-muted-foreground max-w-xs">Buat kampanye pertama untuk menarik lebih banyak pembeli dengan harga kolektif.</p>
          <Button className="mt-2" onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Buat Kampanye</Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {campaigns.map(gb => (
            <Card key={gb.id} className="p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold">{gb.title}</span>
                    <Badge className={`text-[11px] ${STATUS_COLOR[gb.status]}`}>{STATUS_LABEL[gb.status]}</Badge>
                    {discountPct(gb) > 0 && (
                      <Badge className="bg-red-100 text-red-700 text-[11px]">Hemat {discountPct(gb)}%</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    {gb.menu_item?.name} · Harga grup: <b className="text-foreground">{formatIDR(gb.group_price)}</b>{" "}
                    <s className="text-muted-foreground/60 text-[11px]">{formatIDR(gb.original_price)}</s>
                  </p>
                  {gb.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{gb.description}</p>}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {gb.current_participants} / {gb.min_participants} peserta min.
                      {gb.max_participants && ` (maks ${gb.max_participants})`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Deadline: {new Date(gb.deadline_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                      <span>Progress kuota</span>
                      <span>{progressPct(gb)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${progressPct(gb) >= 100 ? "bg-green-500" : "bg-primary"}`}
                        style={{ width: `${progressPct(gb)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {gb.status === "open" && (
                    <>
                      <Button size="sm" variant="outline" className="text-green-700 border-green-300" onClick={() => updateStatus(gb.id, "success")}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Tutup Berhasil
                      </Button>
                      <Button size="sm" variant="outline" className="text-red-700 border-red-300" onClick={() => updateStatus(gb.id, "cancelled")}>
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Batalkan
                      </Button>
                    </>
                  )}
                  {gb.status === "draft" && (
                    <Button size="sm" variant="outline" className="text-blue-700 border-blue-300" onClick={() => updateStatus(gb.id, "open")}>
                      Buka
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => openEdit(gb)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => remove(gb.id)} disabled={deleting === gb.id}>
                    {deleting === gb.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Kampanye" : "Buat Group Buy Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Produk / Menu</Label>
              <Select value={form.menu_item_id} onValueChange={v => setForm(f => ({ ...f, menu_item_id: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih produk..." /></SelectTrigger>
                <SelectContent>
                  {menuItems.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name} — {formatIDR(m.price)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Judul Kampanye</Label>
              <Input className="mt-1" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Contoh: Patungan Kopi Batch April!" />
            </div>
            <div>
              <Label>Deskripsi (opsional)</Label>
              <Textarea className="mt-1" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Jelaskan manfaat group buy ini..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Harga Grup (Rp)</Label>
                <Input className="mt-1" type="number" min={0} value={form.group_price || ""} onChange={e => setForm(f => ({ ...f, group_price: Number(e.target.value) }))} placeholder="0" />
                {form.menu_item_id && menuItems.find(m => m.id === form.menu_item_id) && (
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Harga normal: {formatIDR(menuItems.find(m => m.id === form.menu_item_id)!.price)}
                  </p>
                )}
              </div>
              <div>
                <Label>Min. Peserta</Label>
                <Input className="mt-1" type="number" min={2} value={form.min_participants} onChange={e => setForm(f => ({ ...f, min_participants: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Maks. Peserta (opsional)</Label>
                <Input className="mt-1" type="number" min={2} value={form.max_participants} onChange={e => setForm(f => ({ ...f, max_participants: e.target.value === "" ? "" : Number(e.target.value) }))} placeholder="Tak terbatas" />
              </div>
              <div>
                <Label>Deadline</Label>
                <Input className="mt-1" type="datetime-local" value={form.deadline_at} onChange={e => setForm(f => ({ ...f, deadline_at: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Batal</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              {editing ? "Simpan Perubahan" : "Buat Kampanye"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
