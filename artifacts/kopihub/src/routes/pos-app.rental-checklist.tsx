import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentShop } from "@/lib/use-shop";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ClipboardCheck,
  Plus,
  Loader2,
  RefreshCcw,
  Pencil,
  Trash2,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Printer,
  Eye,
  ChevronDown,
  ChevronUp,
  Settings2,
  Car,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/pos-app/rental-checklist")({
  head: () => ({ meta: [{ title: "Checklist Kondisi Rental" }] }),
  component: RentalChecklistPage,
});

// ─── Default checklist items untuk kendaraan ─────────────────────────────────
const DEFAULT_ITEMS = [
  { label: "Bodi Depan",       category: "Eksterior" },
  { label: "Bodi Belakang",    category: "Eksterior" },
  { label: "Bodi Kanan",       category: "Eksterior" },
  { label: "Bodi Kiri",        category: "Eksterior" },
  { label: "Kaca Depan",       category: "Eksterior" },
  { label: "Kaca Belakang",    category: "Eksterior" },
  { label: "Lampu Depan",      category: "Lampu" },
  { label: "Lampu Belakang",   category: "Lampu" },
  { label: "Lampu Sein",       category: "Lampu" },
  { label: "Velg Kiri Depan",  category: "Ban & Velg" },
  { label: "Velg Kanan Depan", category: "Ban & Velg" },
  { label: "Velg Kiri Belakang",  category: "Ban & Velg" },
  { label: "Velg Kanan Belakang", category: "Ban & Velg" },
  { label: "Interior Depan",   category: "Interior" },
  { label: "Interior Belakang",category: "Interior" },
  { label: "Dashboard",        category: "Interior" },
  { label: "Sabuk Pengaman",   category: "Interior" },
  { label: "Kunci & Remote",   category: "Kelengkapan" },
  { label: "STNK / Surat",     category: "Kelengkapan" },
  { label: "Ban Serep",        category: "Kelengkapan" },
  { label: "Segitiga Pengaman",category: "Kelengkapan" },
  { label: "P3K",              category: "Kelengkapan" },
];

// ─── Types ────────────────────────────────────────────────────────────────────
type ItemStatus = "ok" | "damaged" | "missing";

type CheckItem = {
  label: string;
  category: string;
  status: ItemStatus;
  notes: string;
  photo_data: string | null; // base64
};

type Checklist = {
  id: string;
  booking_id: string | null;
  unit_id: string | null;
  type: "before" | "after";
  customer_name: string;
  customer_phone: string | null;
  odometer_km: number | null;
  fuel_level: string | null;
  items: CheckItem[];
  signature_data: string | null;
  signed_by: string | null;
  signed_at: string | null;
  general_notes: string | null;
  created_at: string;
};

type RentalUnit = { id: string; name: string; unit_code: string | null };

const STATUS_CONFIG: Record<ItemStatus, { label: string; color: string; icon: React.ReactNode }> = {
  ok:      { label: "Baik",    color: "bg-green-100 text-green-800 border-green-300",  icon: <CheckCircle2 className="w-4 h-4 text-green-600" /> },
  damaged: { label: "Rusak",   color: "bg-amber-100 text-amber-800 border-amber-300",  icon: <AlertTriangle className="w-4 h-4 text-amber-600" /> },
  missing: { label: "Hilang",  color: "bg-red-100 text-red-800 border-red-300",        icon: <XCircle className="w-4 h-4 text-red-600" /> },
};

const FUEL_LEVELS = ["E", "1/4", "1/2", "3/4", "F"];

// ─── Signature Pad ────────────────────────────────────────────────────────────
function SignaturePad({
  onSave,
  existing,
}: {
  onSave: (data: string) => void;
  existing: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  function getPos(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    drawing.current = true;
    e.preventDefault();
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e293b";
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setHasStrokes(true);
    e.preventDefault();
  }

  function endDraw() { drawing.current = false; }

  function clear() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
  }

  function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
    toast.success("Tanda tangan disimpan");
  }

  return (
    <div className="space-y-2">
      <Label>Tanda Tangan Digital</Label>
      {existing ? (
        <div className="space-y-2">
          <img src={existing} alt="Tanda tangan" className="border rounded-lg h-24 bg-white" />
          <Button size="sm" variant="outline" onClick={() => onSave("")}>Ganti Tanda Tangan</Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white">
            <canvas
              ref={canvasRef}
              width={480}
              height={120}
              className="w-full touch-none cursor-crosshair"
              onMouseDown={startDraw}
              onMouseMove={draw}
              onMouseUp={endDraw}
              onMouseLeave={endDraw}
              onTouchStart={startDraw}
              onTouchMove={draw}
              onTouchEnd={endDraw}
            />
          </div>
          <p className="text-xs text-gray-400">Tanda tangan di kotak di atas (gunakan mouse atau sentuhan layar)</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={clear} disabled={!hasStrokes}>
              Hapus
            </Button>
            <Button size="sm" onClick={save} disabled={!hasStrokes}>
              Simpan Tanda Tangan
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
function RentalChecklistPage() {
  const { shop } = useCurrentShop();

  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [units, setUnits] = useState<RentalUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbReady, setDbReady] = useState(true);
  const [tab, setTab] = useState<"list" | "new">("list");

  // Form state
  const [formType, setFormType] = useState<"before" | "after">("before");
  const [formUnitId, setFormUnitId] = useState("");
  const [formCustomerName, setFormCustomerName] = useState("");
  const [formCustomerPhone, setFormCustomerPhone] = useState("");
  const [formOdometer, setFormOdometer] = useState("");
  const [formFuel, setFormFuel] = useState("F");
  const [formNotes, setFormNotes] = useState("");
  const [formItems, setFormItems] = useState<CheckItem[]>([]);
  const [formSignature, setFormSignature] = useState<string | null>(null);
  const [formSignedBy, setFormSignedBy] = useState("");
  const [saving, setSaving] = useState(false);

  // View dialog
  const [viewChecklist, setViewChecklist] = useState<Checklist | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // ── Load data ──────────────────────────────────────────────────────────────
  async function loadData() {
    if (!shop?.id) return;
    setLoading(true);
    try {
      const [{ data: cl, error: e1 }, { data: u, error: e2 }] = await Promise.all([
        supabase.from("rental_checklists").select("*").eq("shop_id", shop.id).order("created_at", { ascending: false }).limit(100),
        supabase.from("rental_units").select("id, name, unit_code").eq("shop_id", shop.id).eq("is_active", true).order("name"),
      ]);

      if (e1?.code === "42P01") { setDbReady(false); setLoading(false); return; }
      setDbReady(true);
      setChecklists((cl as Checklist[]) ?? []);
      setUnits((u as RentalUnit[]) ?? []);
    } catch { setDbReady(false); }
    finally { setLoading(false); }
  }

  useEffect(() => { if (shop?.id) loadData(); }, [shop?.id]);

  // ── Reset form ────────────────────────────────────────────────────────────
  function initForm(type: "before" | "after") {
    setFormType(type);
    setFormCustomerName("");
    setFormCustomerPhone("");
    setFormOdometer("");
    setFormFuel("F");
    setFormNotes("");
    setFormSignature(null);
    setFormSignedBy("");
    setFormItems(DEFAULT_ITEMS.map((it) => ({ ...it, status: "ok" as ItemStatus, notes: "", photo_data: null })));
    setExpandedCategories(new Set(["Eksterior", "Lampu", "Ban & Velg", "Interior", "Kelengkapan"]));
    setTab("new");
  }

  // ── Update item ───────────────────────────────────────────────────────────
  function updateItem(idx: number, patch: Partial<CheckItem>) {
    setFormItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  // ── Photo upload ──────────────────────────────────────────────────────────
  function handlePhoto(idx: number, file: File) {
    const reader = new FileReader();
    reader.onload = (e) => updateItem(idx, { photo_data: e.target?.result as string });
    reader.readAsDataURL(file);
  }

  // ── Save checklist ────────────────────────────────────────────────────────
  async function handleSave() {
    if (!shop?.id || !formCustomerName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        shop_id: shop.id,
        unit_id: formUnitId || null,
        type: formType,
        customer_name: formCustomerName.trim(),
        customer_phone: formCustomerPhone.trim() || null,
        odometer_km: formOdometer ? parseInt(formOdometer) : null,
        fuel_level: formFuel || null,
        items: formItems,
        signature_data: formSignature || null,
        signed_by: formSignedBy.trim() || null,
        signed_at: formSignature ? new Date().toISOString() : null,
        general_notes: formNotes.trim() || null,
      };
      const { error } = await supabase.from("rental_checklists").insert(payload);
      if (error) throw error;
      toast.success("Checklist berhasil disimpan");
      await loadData();
      setTab("list");
    } catch (e: unknown) {
      toast.error("Gagal menyimpan: " + (e as Error).message);
    } finally { setSaving(false); }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("Hapus checklist ini?")) return;
    const { error } = await supabase.from("rental_checklists").delete().eq("id", id);
    if (error) toast.error(error.message);
    else { toast.success("Dihapus"); await loadData(); }
  }

  // ── Print ─────────────────────────────────────────────────────────────────
  function handlePrint(cl: Checklist) {
    const win = window.open("", "_blank");
    if (!win) return;
    const itemsByCategory: Record<string, CheckItem[]> = {};
    for (const it of cl.items) {
      (itemsByCategory[it.category] ??= []).push(it);
    }
    const categoryHTML = Object.entries(itemsByCategory).map(([cat, items]) => `
      <tr><td colspan="3" style="background:#f1f5f9;font-weight:600;padding:6px 10px">${cat}</td></tr>
      ${items.map((it) => `
        <tr>
          <td style="padding:6px 10px">${it.label}</td>
          <td style="padding:6px 10px;font-weight:600;color:${it.status==="ok"?"#16a34a":it.status==="damaged"?"#d97706":"#dc2626"}">${it.status === "ok" ? "✓ Baik" : it.status === "damaged" ? "⚠ Rusak" : "✗ Hilang"}</td>
          <td style="padding:6px 10px;color:#64748b">${it.notes || "-"}</td>
        </tr>
        ${it.photo_data ? `<tr><td colspan="3" style="padding:4px 10px"><img src="${it.photo_data}" style="height:80px;border-radius:4px;border:1px solid #e2e8f0"/></td></tr>` : ""}
      `).join("")}
    `).join("");
    win.document.write(`<!DOCTYPE html><html><head><title>Checklist Kondisi — ${cl.type === "before" ? "SEBELUM" : "SESUDAH"}</title>
    <style>body{font-family:sans-serif;padding:24px;color:#1e293b}h1{font-size:18px}h2{font-size:14px;color:#475569}table{width:100%;border-collapse:collapse;margin-top:12px}td{border:1px solid #e2e8f0;vertical-align:top;font-size:13px}@media print{button{display:none}}</style></head><body>
    <h1>Checklist Kondisi Unit — ${cl.type === "before" ? "SEBELUM SEWA" : "SESUDAH SEWA"}</h1>
    <h2>${shop?.name ?? ""} • ${new Date(cl.created_at).toLocaleDateString("id-ID", { day:"numeric",month:"long",year:"numeric" })}</h2>
    <table>
      <tr style="background:#f8fafc"><td><b>Pelanggan</b></td><td colspan="2">${cl.customer_name} ${cl.customer_phone ? "· " + cl.customer_phone : ""}</td></tr>
      ${cl.odometer_km ? `<tr><td><b>Odometer</b></td><td colspan="2">${cl.odometer_km.toLocaleString("id-ID")} km</td></tr>` : ""}
      ${cl.fuel_level ? `<tr><td><b>BBM</b></td><td colspan="2">${cl.fuel_level}</td></tr>` : ""}
    </table>
    <table style="margin-top:16px"><tr style="background:#f8fafc"><td><b>Item</b></td><td><b>Kondisi</b></td><td><b>Catatan</b></td></tr>${categoryHTML}</table>
    ${cl.general_notes ? `<p style="margin-top:12px"><b>Catatan umum:</b> ${cl.general_notes}</p>` : ""}
    <div style="margin-top:24px;display:flex;gap:48px">
      <div><p style="font-size:12px">Merchant</p><div style="border:1px solid #cbd5e1;height:64px;width:180px;margin-top:8px"></div></div>
      <div><p style="font-size:12px">Pelanggan — ${cl.signed_by || cl.customer_name}</p>
        ${cl.signature_data ? `<img src="${cl.signature_data}" style="height:64px;border:1px solid #cbd5e1;margin-top:8px"/>` : '<div style="border:1px solid #cbd5e1;height:64px;width:180px;margin-top:8px"></div>'}
      </div>
    </div>
    <script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
  }

  // ── Group items by category ────────────────────────────────────────────────
  const itemsByCategory = formItems.reduce<Record<string, { idx: number; item: CheckItem }[]>>((acc, item, idx) => {
    (acc[item.category] ??= []).push({ idx, item });
    return acc;
  }, {});

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }

  // ── Count issues in form ──────────────────────────────────────────────────
  const issueCount = formItems.filter((it) => it.status !== "ok").length;

  if (loading) return (
    <div className="p-8 flex items-center gap-2 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin" /> Memuat data...
    </div>
  );

  if (!dbReady) return (
    <div className="p-8 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <ClipboardCheck className="w-7 h-7 text-blue-600" />
        <h1 className="text-2xl font-bold">Checklist Kondisi Rental</h1>
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-3">
        <p className="font-semibold text-amber-800">Setup database diperlukan</p>
        <p className="text-sm text-amber-700">
          Jalankan <code className="bg-white px-1 rounded text-xs">supabase/migrations/f19_rental_checklist.sql</code> dan{" "}
          <code className="bg-white px-1 rounded text-xs">f18_digital_queue.sql</code> (jika belum) di Supabase Dashboard → SQL Editor.
        </p>
        <Button size="sm" onClick={() => { setDbReady(true); setLoading(true); loadData(); }}>
          <RefreshCcw className="w-4 h-4 mr-1" /> Coba Lagi
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold">Checklist Kondisi Rental</h1>
            <p className="text-sm text-gray-500">Dokumentasi kondisi unit sebelum & sesudah disewa</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant={tab === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("list")}
          >
            Riwayat
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
            size="sm"
            onClick={() => initForm("before")}
          >
            <Plus className="w-4 h-4" /> Buat Checklist
          </Button>
        </div>
      </div>

      {/* ── Tab: Riwayat ── */}
      {tab === "list" && (
        <div className="space-y-3">
          {checklists.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center space-y-3">
              <ClipboardCheck className="w-12 h-12 text-gray-200 mx-auto" />
              <p className="text-gray-400">Belum ada checklist. Buat checklist pertama untuk unit rental Anda.</p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => initForm("before")} className="bg-blue-600 hover:bg-blue-700 text-white">
                  <Plus className="w-4 h-4 mr-1" /> Sebelum Sewa
                </Button>
                <Button variant="outline" onClick={() => initForm("after")}>
                  <Plus className="w-4 h-4 mr-1" /> Sesudah Sewa
                </Button>
              </div>
            </div>
          ) : (
            checklists.map((cl) => {
              const damaged = (cl.items as CheckItem[]).filter((it) => it.status === "damaged").length;
              const missing = (cl.items as CheckItem[]).filter((it) => it.status === "missing").length;
              const unit = units.find((u) => u.id === cl.unit_id);
              return (
                <div key={cl.id} className="rounded-xl border bg-white p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg p-2 ${cl.type === "before" ? "bg-blue-50" : "bg-green-50"}`}>
                      <Car className={`w-6 h-6 ${cl.type === "before" ? "text-blue-500" : "text-green-500"}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className={cl.type === "before" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
                          {cl.type === "before" ? "Sebelum Sewa" : "Sesudah Sewa"}
                        </Badge>
                        {damaged > 0 && <Badge className="bg-amber-100 text-amber-800">{damaged} rusak</Badge>}
                        {missing > 0 && <Badge className="bg-red-100 text-red-800">{missing} hilang</Badge>}
                        {cl.signature_data && <Badge className="bg-purple-100 text-purple-800">✓ Ditandatangani</Badge>}
                      </div>
                      <p className="font-semibold mt-1">{cl.customer_name}</p>
                      <p className="text-xs text-gray-500">
                        {unit ? `${unit.name}${unit.unit_code ? " · " + unit.unit_code : ""}` : "Unit tidak diketahui"}
                        {" · "}
                        {new Date(cl.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setViewChecklist(cl)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handlePrint(cl)}>
                      <Printer className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => handleDelete(cl.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Tab: Form Baru ── */}
      {tab === "new" && (
        <div className="space-y-6">
          {/* Type toggle */}
          <div className="flex gap-3">
            {(["before", "after"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFormType(t)}
                className={`flex-1 rounded-xl border-2 py-3 text-sm font-semibold transition-all ${
                  formType === t
                    ? t === "before"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-green-500 bg-green-50 text-green-700"
                    : "border-gray-200 text-gray-500 hover:border-gray-300"
                }`}
              >
                {t === "before" ? "📋 Sebelum Sewa" : "✅ Sesudah Sewa"}
              </button>
            ))}
          </div>

          {/* Info dasar */}
          <div className="rounded-xl border bg-white p-5 space-y-4">
            <h2 className="font-semibold text-gray-700 flex items-center gap-2">
              <Settings2 className="w-4 h-4" /> Informasi Rental
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Unit Kendaraan</Label>
                <Select value={formUnitId} onValueChange={setFormUnitId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih unit (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}{u.unit_code ? ` (${u.unit_code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Nama Pelanggan *</Label>
                <Input
                  placeholder="Nama lengkap"
                  value={formCustomerName}
                  onChange={(e) => setFormCustomerName(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>No. HP</Label>
                <Input
                  placeholder="08xx-xxxx-xxxx"
                  value={formCustomerPhone}
                  onChange={(e) => setFormCustomerPhone(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Odometer (km)</Label>
                <Input
                  type="number"
                  placeholder="mis. 12500"
                  value={formOdometer}
                  onChange={(e) => setFormOdometer(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Level BBM</Label>
                <Select value={formFuel} onValueChange={setFormFuel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_LEVELS.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Items checklist */}
          <div className="rounded-xl border bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4" /> Kondisi Per Item
              </h2>
              {issueCount > 0 && (
                <Badge className="bg-amber-100 text-amber-800">{issueCount} masalah ditemukan</Badge>
              )}
            </div>

            <div className="space-y-3">
              {Object.entries(itemsByCategory).map(([category, items]) => (
                <div key={category} className="border rounded-lg overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
                    onClick={() => toggleCategory(category)}
                  >
                    <span>{category}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-normal text-gray-400">
                        {items.filter(({ item }) => item.status !== "ok").length > 0
                          ? `${items.filter(({ item }) => item.status !== "ok").length} masalah`
                          : "Semua baik"}
                      </span>
                      {expandedCategories.has(category) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {expandedCategories.has(category) && (
                    <div className="divide-y">
                      {items.map(({ idx, item }) => (
                        <div key={idx} className={`p-3 space-y-2 ${item.status !== "ok" ? "bg-amber-50/40" : ""}`}>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium">{item.label}</span>
                            <div className="flex gap-1.5">
                              {(["ok", "damaged", "missing"] as ItemStatus[]).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => updateItem(idx, { status: s })}
                                  className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                                    item.status === s
                                      ? STATUS_CONFIG[s].color + " border-current"
                                      : "border-gray-200 text-gray-400 hover:border-gray-300"
                                  }`}
                                >
                                  {STATUS_CONFIG[s].label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {item.status !== "ok" && (
                            <div className="flex gap-2">
                              <Input
                                className="text-sm h-8"
                                placeholder="Catatan kerusakan/keterangan..."
                                value={item.notes}
                                onChange={(e) => updateItem(idx, { notes: e.target.value })}
                              />
                              <label className="cursor-pointer">
                                <div className={`h-8 px-2.5 flex items-center gap-1 rounded-md border text-xs font-medium transition-colors ${item.photo_data ? "bg-blue-50 border-blue-300 text-blue-700" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                                  <Camera className="w-3.5 h-3.5" />
                                  {item.photo_data ? "✓" : "Foto"}
                                </div>
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  className="sr-only"
                                  onChange={(e) => e.target.files?.[0] && handlePhoto(idx, e.target.files[0])}
                                />
                              </label>
                            </div>
                          )}
                          {item.photo_data && (
                            <img src={item.photo_data} alt={item.label} className="h-20 rounded border object-cover" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Catatan umum */}
          <div className="rounded-xl border bg-white p-5 space-y-3">
            <h2 className="font-semibold text-gray-700">Catatan Umum</h2>
            <Textarea
              placeholder="Catatan tambahan tentang kondisi unit..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Tanda tangan */}
          <div className="rounded-xl border bg-white p-5 space-y-4">
            <h2 className="font-semibold text-gray-700">Tanda Tangan Pelanggan</h2>
            <div className="space-y-1">
              <Label>Nama Penanda Tangan</Label>
              <Input
                placeholder="Nama pelanggan yang menandatangani"
                value={formSignedBy}
                onChange={(e) => setFormSignedBy(e.target.value)}
              />
            </div>
            <SignaturePad
              existing={formSignature}
              onSave={(data) => setFormSignature(data || null)}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pb-8">
            <Button variant="outline" onClick={() => setTab("list")}>Batal</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
              onClick={handleSave}
              disabled={saving || !formCustomerName.trim()}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ClipboardCheck className="w-4 h-4 mr-2" />}
              Simpan Checklist {formType === "before" ? "Sebelum Sewa" : "Sesudah Sewa"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Dialog: View Checklist ── */}
      <Dialog open={!!viewChecklist} onOpenChange={() => setViewChecklist(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {viewChecklist && (() => {
            const cl = viewChecklist;
            const itemsByCat = (cl.items as CheckItem[]).reduce<Record<string, CheckItem[]>>((acc, it) => {
              (acc[it.category] ??= []).push(it);
              return acc;
            }, {});
            const unit = units.find((u) => u.id === cl.unit_id);
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Badge className={cl.type === "before" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
                      {cl.type === "before" ? "Sebelum Sewa" : "Sesudah Sewa"}
                    </Badge>
                    Checklist Kondisi
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                  {/* Info */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-gray-500">Pelanggan:</span> <strong>{cl.customer_name}</strong></div>
                    {cl.customer_phone && <div><span className="text-gray-500">HP:</span> {cl.customer_phone}</div>}
                    {unit && <div><span className="text-gray-500">Unit:</span> {unit.name}</div>}
                    {cl.odometer_km && <div><span className="text-gray-500">Odometer:</span> {cl.odometer_km.toLocaleString("id-ID")} km</div>}
                    {cl.fuel_level && <div><span className="text-gray-500">BBM:</span> {cl.fuel_level}</div>}
                    <div><span className="text-gray-500">Tanggal:</span> {new Date(cl.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div>
                  </div>

                  {/* Items */}
                  {Object.entries(itemsByCat).map(([cat, items]) => (
                    <div key={cat}>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1.5">{cat}</p>
                      <div className="space-y-1.5">
                        {items.map((it, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <span className="shrink-0 mt-0.5">{STATUS_CONFIG[it.status].icon}</span>
                            <div className="flex-1">
                              <span className={it.status !== "ok" ? "font-medium" : ""}>{it.label}</span>
                              {it.notes && <span className="text-gray-500"> — {it.notes}</span>}
                              {it.photo_data && (
                                <img src={it.photo_data} alt={it.label} className="h-16 rounded mt-1 border object-cover" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {cl.general_notes && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">Catatan Umum</p>
                      <p className="text-sm text-gray-700">{cl.general_notes}</p>
                    </div>
                  )}

                  {cl.signature_data && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-1">
                        Tanda Tangan — {cl.signed_by || cl.customer_name}
                      </p>
                      <img src={cl.signature_data} alt="Tanda tangan" className="h-20 border rounded bg-white" />
                    </div>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setViewChecklist(null)}>Tutup</Button>
                  <Button onClick={() => handlePrint(cl)} className="gap-2">
                    <Printer className="w-4 h-4" /> Cetak
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
