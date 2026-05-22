import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  ClipboardList, Plus, Loader2, Search, MessageSquare,
  ChevronDown, ChevronUp, Eye, Send, ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/pos-app/studio-brief")({
  head: () => ({ meta: [{ title: "Brief Form Sesi Foto" }] }),
  component: StudioBriefPage,
});

type Brief = {
  id: string;
  client_name: string;
  client_phone: string | null;
  session_date: string | null;
  package_name: string | null;
  location_preference: string | null;
  mood_vibe: string | null;
  outfit_count: number;
  reference_style: string | null;
  special_requests: string | null;
  props_needed: string | null;
  status: "pending" | "submitted" | "reviewed";
  token: string;
  created_at: string;
};

const STATUS_META = {
  pending:   { label: "Belum Diisi",  cls: "bg-gray-100 text-gray-600" },
  submitted: { label: "Sudah Diisi",  cls: "bg-green-100 text-green-700" },
  reviewed:  { label: "Ditinjau",     cls: "bg-blue-100 text-blue-700" },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

const MOOD_OPTIONS = [
  "Natural & Candid", "Cinematic & Dramatic", "Soft & Pastel", "Dark & Moody",
  "Bright & Airy", "Editorial / Fashion", "Fun & Colorful", "Vintage / Retro",
];

export default function StudioBriefPage() {
  const { shop } = useCurrentShop();
  const [briefs, setBriefs] = useState<Brief[]>([]);
  const [loading, setLoading] = useState(true);
const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewBrief, setViewBrief] = useState<Brief | null>(null);
  const [form, setForm] = useState({
    client_name: "",
    client_phone: "",
    session_date: "",
    package_name: "",
  });

  const load = useCallback(async (shopId: string) => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("studio_briefs")
      .select("*")
      .eq("shop_id", shopId)
      .order("created_at", { ascending: false });
    if (error?.message?.includes("exist")) setShowSql(true);
    setBriefs((data ?? []) as Brief[]);
    setLoading(false);
  }, []);

  useEffect(() => { if (shop?.id) load(shop.id); }, [shop?.id, load]);

  const sendBriefLink = async () => {
    if (!shop || !form.client_name.trim()) {
      toast.error("Nama klien wajib diisi");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await (supabase as any)
        .from("studio_briefs")
        .insert({
          shop_id: shop.id,
          client_name: form.client_name.trim(),
          client_phone: form.client_phone.trim() || null,
          session_date: form.session_date || null,
          package_name: form.package_name.trim() || null,
          status: "pending",
        })
        .select()
        .single();
      if (error) throw error;

      const brief = data as Brief;
      const briefLink = `${window.location.origin}/brief/${brief.token}`;

      if (form.client_phone.trim()) {
        const msg = `Halo ${brief.client_name}! 👋\n\nSesi foto kamu sudah terdaftar${form.session_date ? ` pada ${fmtDate(form.session_date)}` : ""}.\n\nSebelum sesi, mohon isi brief singkat berikut agar hasil foto lebih sesuai dengan visi kamu:\n\n🔗 ${briefLink}\n\nHanya butuh 2-3 menit. Terima kasih!`;
        window.open(
          `https://wa.me/${form.client_phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`,
          "_blank"
        );
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/brief/${brief.token}`);
        toast.success("Link brief disalin ke clipboard");
      }

      toast.success("Brief berhasil dibuat & link dikirim");
      setOpen(false);
      setForm({ client_name: "", client_phone: "", session_date: "", package_name: "" });
      load(shop.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal membuat brief");
    } finally {
      setSaving(false);
    }
  };

  const markReviewed = async (brief: Brief) => {
    await (supabase as any)
      .from("studio_briefs")
      .update({ status: "reviewed" })
      .eq("id", brief.id);
    setBriefs(prev => prev.map(b => b.id === brief.id ? { ...b, status: "reviewed" } : b));
    toast.success("Brief ditandai sudah ditinjau");
  };

  const copyLink = async (token: string) => {
    await navigator.clipboard.writeText(`${window.location.origin}/brief/${token}`);
    toast.success("Link disalin");
  };

  const filtered = briefs.filter(b =>
    !search.trim() ||
    b.client_name.toLowerCase().includes(search.toLowerCase()) ||
    (b.package_name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  if (!shop) return <div className="p-6 text-muted-foreground">Memuat toko...</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <ClipboardList className="h-5 w-5 text-primary" /> Brief Form Sesi Foto
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Kirim link brief ke klien sebelum sesi — mood, gaya, outfit, permintaan khusus.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          <Send className="h-4 w-4" /> Kirim Brief ke Klien
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Cari nama klien atau paket..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
          <ClipboardList className="mx-auto h-10 w-10 opacity-30 mb-3" />
          <p className="font-medium">Belum ada brief</p>
          <p className="text-sm mt-1">Kirim link brief ke klien sebelum sesi agar hasilnya lebih sesuai ekspektasi</p>
          <Button className="mt-4 gap-1.5" onClick={() => setOpen(true)}>
            <Send className="h-4 w-4" /> Kirim Brief Pertama
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(brief => {
            const sm = STATUS_META[brief.status];
            const isExpanded = expandedId === brief.id;
            return (
              <div key={brief.id} className="rounded-xl border bg-card overflow-hidden">
                <button
                  className="w-full text-left p-4 hover:bg-accent/20 transition"
                  onClick={() => setExpandedId(isExpanded ? null : brief.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{brief.client_name}</span>
                        <Badge className={`text-xs ${sm.cls}`}>{sm.label}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {brief.package_name && `${brief.package_name} · `}
                        {brief.session_date ? fmtDate(brief.session_date) : "Tanggal belum ditentukan"}
                        {brief.client_phone && ` · ${brief.client_phone}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {brief.status === "submitted" && (
                        <Button
                          size="sm" variant="outline"
                          className="h-7 text-xs"
                          onClick={e => { e.stopPropagation(); setViewBrief(brief); }}
                        >
                          <Eye className="h-3 w-3 mr-1" /> Lihat Brief
                        </Button>
                      )}
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 w-7 p-0 text-muted-foreground"
                        onClick={e => { e.stopPropagation(); copyLink(brief.token); }}
                        title="Salin link"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                    {brief.status === "submitted" && (
                      <div className="grid gap-3 sm:grid-cols-2 text-sm">
                        {brief.location_preference && (
                          <div><span className="text-muted-foreground">Lokasi:</span> <span className="font-medium">{brief.location_preference}</span></div>
                        )}
                        {brief.mood_vibe && (
                          <div><span className="text-muted-foreground">Mood/Vibe:</span> <span className="font-medium">{brief.mood_vibe}</span></div>
                        )}
                        <div><span className="text-muted-foreground">Outfit:</span> <span className="font-medium">{brief.outfit_count} outfit</span></div>
                        {brief.reference_style && (
                          <div className="sm:col-span-2"><span className="text-muted-foreground">Referensi:</span> <span className="font-medium">{brief.reference_style}</span></div>
                        )}
                        {brief.props_needed && (
                          <div className="sm:col-span-2"><span className="text-muted-foreground">Props:</span> <span className="font-medium">{brief.props_needed}</span></div>
                        )}
                        {brief.special_requests && (
                          <div className="sm:col-span-2"><span className="text-muted-foreground">Permintaan khusus:</span> <span className="font-medium">{brief.special_requests}</span></div>
                        )}
                      </div>
                    )}

                    {brief.status === "pending" && (
                      <p className="text-sm text-amber-600">Klien belum mengisi brief. Ingatkan via WhatsApp:</p>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      {brief.client_phone && (
                        <Button
                          size="sm" variant="outline"
                          className="text-xs h-7 gap-1"
                          onClick={() => {
                            const link = `${window.location.origin}/brief/${brief.token}`;
                            const msg = brief.status === "pending"
                              ? `Halo ${brief.client_name}, mohon lengkapi brief sesi foto kamu ya: ${link}`
                              : `Halo ${brief.client_name}, brief kamu sudah kami terima! Sampai ketemu di sesi foto 📸`;
                            window.open(`https://wa.me/${brief.client_phone!.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
                          }}
                        >
                          <MessageSquare className="h-3 w-3" /> WA Klien
                        </Button>
                      )}
                      {brief.status === "submitted" && (
                        <Button
                          size="sm" variant="outline"
                          className="text-xs h-7 text-blue-700 border-blue-200"
                          onClick={() => markReviewed(brief)}
                        >
                          Tandai Ditinjau
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Send brief dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" /> Kirim Brief ke Klien
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Nama Klien <span className="text-destructive">*</span></Label>
              <Input
                value={form.client_name}
                onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
                placeholder="Nama klien"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nomor WhatsApp Klien</Label>
              <Input
                value={form.client_phone}
                onChange={e => setForm(f => ({ ...f, client_phone: e.target.value }))}
                placeholder="08xx... (link otomatis dikirim via WA)"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal Sesi</Label>
              <Input
                type="date"
                value={form.session_date}
                onChange={e => setForm(f => ({ ...f, session_date: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nama Paket</Label>
              <Input
                value={form.package_name}
                onChange={e => setForm(f => ({ ...f, package_name: e.target.value }))}
                placeholder="Basic, Standard, Premium, dll."
              />
            </div>
            <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              Klien akan menerima link form untuk mengisi: lokasi pilihan, mood/vibe, jumlah outfit, referensi, dan permintaan khusus.
              {!form.client_phone && " Jika WA tidak diisi, link akan disalin ke clipboard."}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={sendBriefLink} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              {form.client_phone ? "Kirim via WhatsApp" : "Salin Link Brief"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View brief detail dialog */}
      {viewBrief && (
        <Dialog open onOpenChange={() => setViewBrief(null)}>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Brief — {viewBrief.client_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              {[
                ["Paket", viewBrief.package_name],
                ["Tanggal Sesi", viewBrief.session_date ? fmtDate(viewBrief.session_date) : null],
                ["Lokasi Pilihan", viewBrief.location_preference],
                ["Mood / Vibe", viewBrief.mood_vibe],
                ["Jumlah Outfit", viewBrief.outfit_count ? `${viewBrief.outfit_count} outfit` : null],
                ["Referensi / Inspirasi", viewBrief.reference_style],
                ["Props yang Dibutuhkan", viewBrief.props_needed],
                ["Permintaan Khusus", viewBrief.special_requests],
              ].filter(([, v]) => !!v).map(([k, v]) => (
                <div key={String(k)} className="flex gap-2">
                  <span className="text-muted-foreground w-36 shrink-0">{k}:</span>
                  <span className="font-medium">{v}</span>
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewBrief(null)}>Tutup</Button>
              {viewBrief.status === "submitted" && (
                <Button onClick={() => { markReviewed(viewBrief); setViewBrief(null); }}>
                  Tandai Ditinjau
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
