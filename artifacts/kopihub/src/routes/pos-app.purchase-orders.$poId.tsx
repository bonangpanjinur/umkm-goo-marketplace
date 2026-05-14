import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, ArrowLeft, CheckCircle2, X, Trash2, Send, Printer, Eye, Save, Settings2,
  History, Pencil, AlertCircle, FileText, Package, TrendingUp, ArrowRight, Info,
} from "lucide-react";
import { toast } from "sonner";
import { formatIDR } from "@/lib/format";


export const Route = createFileRoute("/pos-app/purchase-orders/$poId")({
  component: PODetailPage,
});

type PO = {
  id: string;
  po_no: string;
  status: "draft" | "ordered" | "received" | "cancelled";
  shop_id: string;
  supplier_id: string | null;
  order_date: string;
  expected_date: string | null;
  received_date: string | null;
  subtotal: number;
  tax: number;
  total: number;
  note: string | null;
  created_at: string;
};
type POItem = {
  id: string;
  ingredient_id: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
  received_qty: number;
};
type Ingredient = { id: string; name: string; unit: string; current_stock?: number; cost_per_unit?: number };
type Supplier = { id: string; name: string; phone: string | null; contact_name: string | null; address?: string | null; email?: string | null };
type Shop = { id: string; name: string; address?: string | null; phone?: string | null; email?: string | null; logo_url?: string | null };
type AuditEntry = {
  id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  reason: string | null;
  actor_name: string | null;
  created_at: string;
};

type PaperSize = "a4" | "letter" | "thermal80" | "thermal58";
type MarginMode = "narrow" | "normal" | "wide";
type Orientation = "portrait" | "landscape";
type PrintPrefs = {
  paper: PaperSize;
  margin: MarginMode;
  orientation: Orientation;
  tray: string;        // free-text printer tray hint, e.g. "Tray 1"
  printerName: string; // free-text printer name, just a reminder
  zoom: number;       // 0.5 – 1.4
  fitToPage: boolean;
  showTax: boolean;
  showNotes: boolean;
  showShipping: boolean;
  activePresetId: string | null;
};

type PrinterPreset = {
  id: string;
  name: string;
  prefs: Omit<PrintPrefs, "activePresetId">;
};

const PREFS_KEY = "po-print-prefs/v1";
const PRESETS_KEY = "po-printer-presets/v1";
const DEFAULT_PRESET_KEY = "po-printer-default/v1";

function loadDefaultPresetId(): string | null {
  if (typeof window === "undefined") return null;
  try { return localStorage.getItem(DEFAULT_PRESET_KEY); } catch { return null; }
}
function saveDefaultPresetId(id: string | null) {
  try {
    if (id) localStorage.setItem(DEFAULT_PRESET_KEY, id);
    else localStorage.removeItem(DEFAULT_PRESET_KEY);
  } catch { /* noop */ }
}
const DEFAULT_PREFS: PrintPrefs = {
  paper: "a4",
  margin: "normal",
  orientation: "portrait",
  tray: "",
  printerName: "",
  zoom: 1,
  fitToPage: false,
  showTax: true,
  showNotes: true,
  showShipping: true,
  activePresetId: null,
};

function loadPrefs(): PrintPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { return DEFAULT_PREFS; }
}

function loadPresets(): PrinterPreset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function savePresets(list: PrinterPreset[]) {
  try { localStorage.setItem(PRESETS_KEY, JSON.stringify(list)); } catch { /* noop */ }
}

const PAPER_LABEL: Record<PaperSize, string> = {
  a4: "A4 (210 × 297 mm)",
  letter: "Letter (216 × 279 mm)",
  thermal80: "Thermal 80 mm",
  thermal58: "Thermal 58 mm",
};

/** Format a YYYY-MM-DD or ISO date to id-ID long form: "29 April 2026". */
function formatDateID(d: string | null | undefined): string {
  if (!d) return "—";
  const dt = new Date(d.length <= 10 ? `${d}T00:00:00` : d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

/** Normalize PO no for display — uppercase, trim, ensure "PO-" prefix. */
function formatPONo(raw: string): string {
  const s = (raw ?? "").trim().toUpperCase();
  if (!s) return "—";
  return /^PO[-_]/i.test(s) ? s : `PO-${s}`;
}

function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function auditActionLabel(action: string): string {
  const map: Record<string, string> = {
    status_change: "Perubahan status",
    received: "PO diterima",
    deleted: "PO dihapus",
    draft_edited: "Draft diperbarui",
    created: "PO dibuat",
  };
  return map[action] ?? action;
}
function auditStatusLabel(s: string): string {
  return ({ draft: "Draft", ordered: "Sudah dipesan", received: "Diterima", cancelled: "Dibatalkan" } as Record<string, string>)[s] ?? s;
}

function statusBadge(status: PO["status"]) {
  const map: Record<PO["status"], string> = {
    draft: "bg-muted text-muted-foreground",
    ordered: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
    received: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
    cancelled: "bg-destructive/15 text-destructive",
  };
  const label = { draft: "Draft", ordered: "Sudah dipesan", received: "Diterima", cancelled: "Dibatalkan" }[status];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${map[status]}`}>{label}</span>;
}

function PODetailPage() {
  const { poId } = Route.useParams();
  const nav = useNavigate();
  const [po, setPo] = useState<PO | null>(null);
  const [items, setItems] = useState<POItem[]>([]);
  const [ingMap, setIngMap] = useState<Record<string, Ingredient>>({});
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"summary" | "items" | "history">("summary");

  // Modal states
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [receiveOpen, setReceiveOpen] = useState(false);

  // Draft editing
  const [editMode, setEditMode] = useState(false);
  const [editItems, setEditItems] = useState<POItem[]>([]);
  const [editNote, setEditNote] = useState("");

  const [prefs, setPrefs] = useState<PrintPrefs>(() => loadPrefs());
  const [presets, setPresets] = useState<PrinterPreset[]>(() => loadPresets());
  const [defaultPresetId, setDefaultPresetId] = useState<string | null>(() => loadDefaultPresetId());
  const [presetName, setPresetName] = useState("");

  // Persist prefs whenever they change
  useEffect(() => {
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* noop */ }
  }, [prefs]);

  // Apply prefs to <body> as data attributes so CSS can react
  useEffect(() => {
    const b = document.body;
    b.dataset.poPaper = prefs.paper;
    b.dataset.poMargin = prefs.margin;
    b.dataset.poOrient = prefs.orientation;
    return () => {
      delete b.dataset.poPaper;
      delete b.dataset.poMargin;
      delete b.dataset.poOrient;
    };
  }, [prefs.paper, prefs.margin, prefs.orientation]);

  // Inject a per-paper @page rule for the actual printout
  useEffect(() => {
    const id = "po-page-rule";
    let style = document.getElementById(id) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      document.head.appendChild(style);
    }
    const orient = prefs.orientation;
    let size: string;
    switch (prefs.paper) {
      case "letter":    size = `Letter ${orient}`; break;
      case "thermal80": size = "80mm auto"; break;
      case "thermal58": size = "58mm auto"; break;
      default:          size = `A4 ${orient}`; break;
    }
    style.textContent = `@media print { @page { size: ${size}; margin: 0; } }`;
    return () => { if (style) style.textContent = ""; };
  }, [prefs.paper, prefs.orientation]);

  function applyPreset(id: string) {
    const found = presets.find((p) => p.id === id);
    if (!found) return;
    setPrefs({ ...found.prefs, activePresetId: found.id });
    toast.success(`Preset "${found.name}" diterapkan`);
  }
  function saveCurrentAsPreset() {
    const name = presetName.trim();
    if (!name) { toast.error("Beri nama preset dulu"); return; }
    const id = crypto.randomUUID();
    const { activePresetId: _omit, ...rest } = prefs;
    void _omit;
    const next = [...presets, { id, name, prefs: rest }];
    setPresets(next); savePresets(next);
    setPrefs((p) => ({ ...p, activePresetId: id }));
    setPresetName("");
    toast.success(`Preset "${name}" disimpan di perangkat ini`);
  }
  function updateActivePreset() {
    if (!prefs.activePresetId) return;
    const { activePresetId: _omit, ...rest } = prefs;
    void _omit;
    const next = presets.map((p) => p.id === prefs.activePresetId ? { ...p, prefs: rest } : p);
    setPresets(next); savePresets(next);
    toast.success("Preset diperbarui");
  }
  function deleteActivePreset() {
    if (!prefs.activePresetId) return;
    const target = presets.find((p) => p.id === prefs.activePresetId);
    if (!target) return;
    if (!confirm(`Hapus preset "${target.name}"?`)) return;
    const next = presets.filter((p) => p.id !== prefs.activePresetId);
    setPresets(next); savePresets(next);
    setPrefs((p) => ({ ...p, activePresetId: null }));
    if (defaultPresetId === target.id) {
      setDefaultPresetId(null);
      saveDefaultPresetId(null);
    }
  }
  function toggleDefaultPreset(makeDefault: boolean) {
    if (makeDefault) {
      if (!prefs.activePresetId) { toast.error("Pilih preset dulu"); return; }
      setDefaultPresetId(prefs.activePresetId);
      saveDefaultPresetId(prefs.activePresetId);
      const name = presets.find((p) => p.id === prefs.activePresetId)?.name ?? "Preset";
      toast.success(`"${name}" dipakai otomatis tiap buka Print Preview`);
    } else {
      setDefaultPresetId(null);
      saveDefaultPresetId(null);
      toast.success("Default preset dihapus");
    }
  }

  /** Open the Print Preview, applying the saved default preset (if any)
   *  whenever it differs from the currently-loaded prefs. */
  function openPreview() {
    if (defaultPresetId) {
      const def = presets.find((p) => p.id === defaultPresetId);
      if (def && prefs.activePresetId !== def.id) {
        setPrefs({ ...def.prefs, activePresetId: def.id });
      }
    }
    setPreviewOpen(true);
  }


  async function load() {
    setLoading(true);
    const { data: poData, error } = await supabase.from("purchase_orders").select("*").eq("id", poId).single();
    if (error || !poData) { toast.error(error?.message ?? "PO tidak ditemukan"); setLoading(false); return; }
    setPo(poData as PO);
    const [itRes, ingRes, supRes, shopRes, auditRes] = await Promise.all([
      supabase.from("purchase_order_items").select("*").eq("po_id", poId),
      supabase.from("ingredients").select("id, name, unit, current_stock, cost_per_unit").eq("shop_id", poData.shop_id),
      poData.supplier_id
        ? supabase.from("suppliers").select("id, name, phone, contact_name, address, email").eq("id", poData.supplier_id).single()
        : Promise.resolve({ data: null }),
      supabase.from("coffee_shops").select("id, name, address, phone, email, logo_url").eq("id", poData.shop_id).single(),
      supabase.from("po_audit_log").select("id, action, from_status, to_status, reason, actor_name, created_at").eq("po_id", poId).order("created_at", { ascending: false }),
    ]);
    const itList = (itRes.data ?? []) as POItem[];
    setItems(itList);
    setEditItems(itList);
    setEditNote((poData as PO).note ?? "");
    const map: Record<string, Ingredient> = {};
    ((ingRes.data ?? []) as Ingredient[]).forEach((i) => { map[i.id] = i; });
    setIngMap(map);
    setSupplier((supRes as { data: Supplier | null }).data ?? null);
    setShop((shopRes as { data: Shop | null }).data ?? null);
    setAudit((auditRes.data ?? []) as AuditEntry[]);
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [poId]);

  async function logAudit(action: string, fromStatus: PO["status"] | null, toStatus: PO["status"] | null, reason: string | null) {
    if (!po) return;
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("po_audit_log").insert({
      po_id: po.id,
      shop_id: po.shop_id,
      action,
      from_status: fromStatus,
      to_status: toStatus,
      reason,
      actor_id: auth.user?.id ?? null,
      actor_name: auth.user?.email ?? null,
    });
  }

  async function setStatus(status: PO["status"], reason: string | null = null) {
    if (!po) return;
    setBusy(true);
    const fromStatus = po.status;
    const { error } = await supabase.from("purchase_orders").update({ status }).eq("id", po.id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    await logAudit("status_change", fromStatus, status, reason);
    toast.success("Status diperbarui");
    await load();
    setBusy(false);
  }

  async function confirmCancel() {
    if (!cancelReason.trim()) { toast.error("Alasan pembatalan wajib diisi"); return; }
    await setStatus("cancelled", cancelReason.trim());
    setCancelOpen(false);
    setCancelReason("");
  }

  async function confirmReceive() {
    if (!po) return;
    setBusy(true);
    const fromStatus = po.status;
    const { error } = await supabase.rpc("receive_purchase_order", { _po_id: po.id });
    if (error) { toast.error(error.message); setBusy(false); return; }
    await logAudit("received", fromStatus, "received", null);
    toast.success("PO diterima — stok & HPP diperbarui");
    setReceiveOpen(false);
    await load();
    setBusy(false);
  }

  function printStockPreview() {
    if (!po) return;
    const rows = stockPreview.map((p) => {
      const delta = p.newCost - p.currentCost;
      const arrow = delta > 0.5 ? "↑" : delta < -0.5 ? "↓" : "";
      return `<tr>
        <td>${escapeHtml(p.name)}</td>
        <td style="text-align:right">${p.currentStock} ${escapeHtml(p.unit)} → <b>${p.newStock} ${escapeHtml(p.unit)}</b> <span style="color:#059669">(+${p.addQty})</span></td>
        <td style="text-align:right">${formatIDR(p.currentCost)} → <b>${formatIDR(p.newCost)}</b> ${arrow ? `<span style="color:${delta > 0 ? "#d97706" : "#059669"}">${arrow} ${formatIDR(Math.abs(delta))}</span>` : ""}</td>
      </tr>`;
    }).join("");
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Preview Terima — ${formatPONo(po.po_no)}</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:24px;color:#111}
        h1{font-size:18px;margin:0 0 4px}
        .meta{color:#6b7280;font-size:12px;margin-bottom:16px}
        table{width:100%;border-collapse:collapse;font-size:13px}
        th,td{border-bottom:1px solid #e5e7eb;padding:8px 10px;vertical-align:top}
        th{background:#f9fafb;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.04em;color:#6b7280}
        .total{margin-top:16px;font-weight:600}
        @media print{button{display:none}}
      </style></head><body>
      <h1>Preview Terima Stok — ${formatPONo(po.po_no)}</h1>
      <div class="meta">${escapeHtml(supplier?.name ?? "Tanpa supplier")} · ${formatDateID(po.order_date)}</div>
      <table>
        <thead><tr><th>Bahan</th><th style="text-align:right">Stok</th><th style="text-align:right">HPP rata-rata</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="total">Total nilai pembelian: ${formatIDR(po.total)}</div>
      <p style="margin-top:24px;color:#6b7280;font-size:11px">Pratinjau ini belum dikonfirmasi. Stok & HPP baru akan diterapkan setelah Anda menekan "Konfirmasi terima".</p>
      <button onclick="window.print()" style="margin-top:16px;padding:8px 14px">Cetak</button>
      </body></html>`;
    const w = window.open("", "_blank", "width=820,height=720");
    if (!w) { toast.error("Popup diblokir browser"); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch { /* noop */ } }, 250);
  }

  async function confirmDelete() {
    if (!po) return;
    if (!deleteReason.trim()) { toast.error("Alasan penghapusan wajib diisi"); return; }
    setBusy(true);
    await logAudit("deleted", po.status, null, deleteReason.trim());
    await supabase.from("purchase_order_items").delete().eq("po_id", po.id);
    const { error } = await supabase.from("purchase_orders").delete().eq("id", po.id);
    if (error) { toast.error(error.message); setBusy(false); return; }
    toast.success("PO dihapus");
    nav({ to: "/pos-app/purchase-orders" });
  }

  // Draft editing helpers
  function clampNum(v: unknown): number {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  }
  function updateEditItem(id: string, patch: Partial<POItem>) {
    setEditItems((arr) => arr.map((it) => {
      if (it.id !== id) return it;
      const next = { ...it, ...patch };
      if (patch.quantity !== undefined) next.quantity = clampNum(patch.quantity);
      if (patch.unit_cost !== undefined) next.unit_cost = clampNum(patch.unit_cost);
      const qty = Number(next.quantity) || 0;
      const cost = Number(next.unit_cost) || 0;
      return { ...next, subtotal: Math.round(qty * cost * 100) / 100 };
    }));
  }
  function removeEditItem(id: string) {
    setEditItems((arr) => arr.filter((it) => it.id !== id));
  }
  const editSubtotal = useMemo(() => editItems.reduce((s, it) => s + Number(it.subtotal || 0), 0), [editItems]);
  const editTotal = editSubtotal + Number(po?.tax ?? 0);
  const editErrors = useMemo(() => {
    const errs: Record<string, string> = {};
    for (const it of editItems) {
      if (!(Number(it.quantity) > 0)) errs[it.id] = "Qty harus lebih dari 0";
      else if (Number(it.unit_cost) < 0) errs[it.id] = "Harga tidak boleh negatif";
    }
    return errs;
  }, [editItems]);
  const editValid = editItems.length > 0 && Object.keys(editErrors).length === 0;

  async function saveDraftEdits() {
    if (!po) return;
    if (!editValid) {
      toast.error(editItems.length === 0 ? "Tidak ada item yang bisa disimpan" : "Periksa kembali qty & harga");
      return;
    }
    setBusy(true);
    // Update each existing item
    const original = new Map(items.map((it) => [it.id, it]));
    const ops: Promise<unknown>[] = [];
    for (const it of editItems) {
      const orig = original.get(it.id);
      if (!orig) continue;
      if (orig.quantity !== it.quantity || orig.unit_cost !== it.unit_cost || orig.subtotal !== it.subtotal) {
        ops.push(
          supabase.from("purchase_order_items")
            .update({ quantity: it.quantity, unit_cost: it.unit_cost, subtotal: it.subtotal })
            .eq("id", it.id),
        );
      }
    }
    // Deletes
    const remainingIds = new Set(editItems.map((it) => it.id));
    for (const orig of items) {
      if (!remainingIds.has(orig.id)) {
        ops.push(supabase.from("purchase_order_items").delete().eq("id", orig.id));
      }
    }
    // Update PO totals + note
    ops.push(
      supabase.from("purchase_orders")
        .update({ subtotal: editSubtotal, total: editTotal, note: editNote || null })
        .eq("id", po.id),
    );
    const results = await Promise.all(ops);
    const firstError = results.find((r): r is { error: { message: string } } =>
      typeof r === "object" && r !== null && "error" in r && (r as { error: unknown }).error != null,
    );
    if (firstError) { toast.error(firstError.error.message); setBusy(false); return; }
    await logAudit("draft_edited", po.status, po.status, null);
    toast.success("Perubahan draft disimpan");
    setEditMode(false);
    await load();
    setBusy(false);
  }

  // Stock preview for receive modal
  const stockPreview = useMemo(() => {
    return items.map((it) => {
      const ig = ingMap[it.ingredient_id];
      const currentStock = Number(ig?.current_stock ?? 0);
      const currentCost = Number(ig?.cost_per_unit ?? 0);
      const qty = Number(it.quantity);
      const newStock = currentStock + qty;
      // Weighted average HPP
      const newCost = newStock > 0
        ? ((currentStock * currentCost) + (qty * Number(it.unit_cost))) / newStock
        : Number(it.unit_cost);
      return {
        id: it.id,
        name: ig?.name ?? "—",
        unit: ig?.unit ?? "",
        currentStock,
        addQty: qty,
        newStock,
        currentCost,
        newCost,
      };
    });
  }, [items, ingMap]);

  // Compute fit-to-page zoom: scale paper width to fit available preview area.
  const previewMaxPx = 760; // approximate inner dialog width budget
  const basePaperPx: Record<PaperSize, number> = {
    a4: 794,         // 210mm @ ~96dpi
    letter: 816,     // 216mm
    thermal80: 302,  // 80mm
    thermal58: 219,  // 58mm
  };
  const isThermal = prefs.paper === "thermal80" || prefs.paper === "thermal58";
  const isLandscape = prefs.orientation === "landscape" && !isThermal;
  const paperPx = isLandscape
    ? (prefs.paper === "letter" ? 1054 : 1123) // 279mm/297mm @ ~96dpi
    : basePaperPx[prefs.paper];
  const fitZoom = useMemo(
    () => Math.min(1, previewMaxPx / paperPx),
    [paperPx],
  );
  const effectiveZoom = prefs.fitToPage ? fitZoom : prefs.zoom;

  if (loading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  }
  if (!po) {
    return <div className="mx-auto max-w-2xl px-4 py-10 text-center text-muted-foreground">PO tidak ditemukan.</div>;
  }

  const statusLabel = { draft: "Draft", ordered: "Sudah dipesan", received: "Diterima", cancelled: "Dibatalkan" }[po.status];

  return (
    <>
    <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 lg:py-10 print:hidden">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link to="/pos-app/purchase-orders" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Kembali ke daftar PO
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={openPreview}>
            <Eye className="mr-1.5 h-4 w-4" />Preview
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()}><Printer className="mr-1.5 h-4 w-4" />Cetak</Button>
        </div>
      </div>


      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{formatPONo(po.po_no)}</h1>
            <div className="mt-2 flex items-center gap-2">
              {statusBadge(po.status)}
              {audit.length > 0 && (
                <Badge variant="outline" className="text-xs font-normal">
                  <History className="mr-1 h-3 w-3" /> {audit.length} aktivitas
                </Badge>
              )}
            </div>
          </div>
          <div className="text-right text-sm">
            <div className="text-muted-foreground">Tanggal terbit: <span className="text-foreground">{formatDateID(po.order_date)}</span></div>
            {po.expected_date && <div className="text-muted-foreground">Kedatangan: <span className="text-foreground">{formatDateID(po.expected_date)}</span></div>}
            {po.received_date && <div className="text-muted-foreground">Diterima: <span className="text-foreground">{formatDateID(po.received_date)}</span></div>}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="mt-5">
          <TabsList>
            <TabsTrigger value="summary"><FileText className="mr-1.5 h-3.5 w-3.5" /> Ringkasan</TabsTrigger>
            <TabsTrigger value="items"><Package className="mr-1.5 h-3.5 w-3.5" /> Item ({items.length})</TabsTrigger>
            <TabsTrigger value="history"><History className="mr-1.5 h-3.5 w-3.5" /> Riwayat ({audit.length})</TabsTrigger>
          </TabsList>

          {/* RINGKASAN */}
          <TabsContent value="summary" className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Supplier</div>
                {supplier ? (
                  <div className="mt-1">
                    <Link to="/pos-app/suppliers" className="font-medium hover:underline">{supplier.name}</Link>
                    {supplier.contact_name && <div className="text-xs text-muted-foreground">{supplier.contact_name}</div>}
                    {supplier.phone && <div className="text-xs text-muted-foreground">{supplier.phone}</div>}
                  </div>
                ) : <div className="mt-1 text-sm text-muted-foreground">— tidak ditentukan —</div>}
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Catatan</div>
                <div className="mt-1 text-sm whitespace-pre-wrap">{po.note || <span className="text-muted-foreground">—</span>}</div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="text-xs text-muted-foreground">Subtotal</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{formatIDR(po.subtotal)}</div>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <div className="text-xs text-muted-foreground">Pajak</div>
                <div className="mt-1 text-lg font-semibold tabular-nums">{formatIDR(po.tax)}</div>
              </div>
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-3">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="mt-1 text-lg font-bold tabular-nums text-primary">{formatIDR(po.total)}</div>
              </div>
            </div>

            {po.status === "received" && (
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="mr-1.5 inline h-4 w-4" />
                PO sudah diterima — stok bahan dan HPP rata-rata otomatis terupdate.
              </div>
            )}
          </TabsContent>

          {/* ITEM */}
          <TabsContent value="items" className="mt-4">
            {po.status === "draft" && (
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-sm text-muted-foreground">
                  {editMode ? "Mode edit — ubah qty atau harga, lalu simpan." : "Item dalam PO ini."}
                </div>
                <div className="flex gap-2">
                  {editMode ? (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => { setEditMode(false); setEditItems(items); setEditNote(po.note ?? ""); }}>Batal</Button>
                      <Button size="sm" onClick={saveDraftEdits} disabled={busy || !editValid}>
                        {busy ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                        Simpan perubahan
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit draft
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Bahan</th>
                    <th className="px-3 py-2.5 text-right">Qty</th>
                    <th className="px-3 py-2.5 text-right">Harga / unit</th>
                    <th className="px-3 py-2.5 text-right">Subtotal</th>
                    {po.status === "received" && <th className="px-3 py-2.5 text-right">Diterima</th>}
                    {editMode && <th className="px-3 py-2.5"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(editMode ? editItems : items).map((it) => {
                    const ig = ingMap[it.ingredient_id];
                    if (editMode) {
                      const rowErr = editErrors[it.id];
                      return (
                        <tr key={it.id} className={rowErr ? "bg-destructive/5" : undefined}>
                          <td className="px-3 py-2 font-medium align-top">
                            {ig?.name ?? "—"}
                            {rowErr && (
                              <div className="mt-0.5 text-[11px] text-destructive flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" /> {rowErr}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right align-top">
                            <Input
                              type="number" min="0" step="0.01"
                              className={`h-8 w-24 ml-auto text-right tabular-nums ${rowErr?.includes("Qty") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                              value={it.quantity === 0 ? "" : it.quantity}
                              placeholder="0"
                              onChange={(e) => updateEditItem(it.id, { quantity: e.target.value === "" ? 0 : Number(e.target.value) })}
                              onKeyDown={(e) => { if (e.key === "-" || e.key === "e") e.preventDefault(); }}
                            />
                          </td>
                          <td className="px-3 py-2 text-right align-top">
                            <Input
                              type="number" min="0" step="1"
                              className={`h-8 w-32 ml-auto text-right tabular-nums ${rowErr?.includes("Harga") ? "border-destructive focus-visible:ring-destructive" : ""}`}
                              value={it.unit_cost === 0 ? "" : it.unit_cost}
                              placeholder="0"
                              onChange={(e) => updateEditItem(it.id, { unit_cost: e.target.value === "" ? 0 : Number(e.target.value) })}
                              onKeyDown={(e) => { if (e.key === "-" || e.key === "e") e.preventDefault(); }}
                            />
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums align-top">{formatIDR(it.subtotal)}</td>
                          <td className="px-3 py-2 text-right align-top">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeEditItem(it.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={it.id}>
                        <td className="px-3 py-2.5 font-medium">{ig?.name ?? "—"}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{Number(it.quantity)} {ig?.unit}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{formatIDR(it.unit_cost)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{formatIDR(it.subtotal)}</td>
                        {po.status === "received" && (
                          <td className="px-3 py-2.5 text-right tabular-nums text-emerald-600">+{Number(it.received_qty)} {ig?.unit}</td>
                        )}
                      </tr>
                    );
                  })}
                  {(editMode ? editItems : items).length === 0 && (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">Tidak ada item.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {editMode && (
              <div className="mt-3">
                <Label className="text-xs text-muted-foreground">Catatan</Label>
                <Textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} className="mt-1" rows={2} />
              </div>
            )}

            <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="tabular-nums">{formatIDR(editMode ? editSubtotal : po.subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Pajak</span><span className="tabular-nums">{formatIDR(po.tax)}</span></div>
              <div className="flex justify-between border-t border-border pt-1.5 text-base font-semibold"><span>Total</span><span className="tabular-nums">{formatIDR(editMode ? editTotal : po.total)}</span></div>
            </div>
          </TabsContent>

          {/* RIWAYAT */}
          <TabsContent value="history" className="mt-4">
            {audit.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                Belum ada riwayat aktivitas.
              </div>
            ) : (
              <ol className="relative space-y-3 border-l border-border pl-4">
                {audit.map((a) => (
                  <li key={a.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-primary ring-4 ring-background" />
                    <div className="rounded-lg border border-border bg-background p-3">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-medium">{auditActionLabel(a.action)}</span>
                        {a.from_status && a.to_status && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            {auditStatusLabel(a.from_status)} <ArrowRight className="h-3 w-3" /> {auditStatusLabel(a.to_status)}
                          </span>
                        )}
                      </div>
                      {a.reason && (
                        <div className="mt-1.5 rounded bg-muted/40 px-2 py-1 text-xs text-foreground">
                          <span className="text-muted-foreground">Alasan:</span> {a.reason}
                        </div>
                      )}
                      <div className="mt-1.5 text-xs text-muted-foreground">
                        {a.actor_name ?? "Sistem"} · {new Date(a.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </TabsContent>
        </Tabs>

        {po.status !== "received" && po.status !== "cancelled" && !editMode && (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-2 print:hidden">
            {po.status === "draft" && (
              <>
                <Button variant="ghost" onClick={() => setDeleteOpen(true)} disabled={busy} className="text-destructive hover:text-destructive">
                  <Trash2 className="mr-1.5 h-4 w-4" /> Hapus
                </Button>
                <Button variant="outline" onClick={() => setCancelOpen(true)} disabled={busy}>
                  <X className="mr-1.5 h-4 w-4" /> Batalkan
                </Button>
                <Button onClick={() => setStatus("ordered")} disabled={busy}>
                  <Send className="mr-1.5 h-4 w-4" /> Order ke supplier
                </Button>
              </>
            )}
            {po.status === "ordered" && (
              <>
                <Button variant="outline" onClick={() => setCancelOpen(true)} disabled={busy}>
                  <X className="mr-1.5 h-4 w-4" /> Batalkan
                </Button>
                <Button onClick={() => setReceiveOpen(true)} disabled={busy}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                  Terima & update stok
                </Button>
              </>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Cancel modal */}
    <Dialog open={cancelOpen} onOpenChange={(o) => { if (!busy) setCancelOpen(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            Batalkan PO
          </DialogTitle>
          <DialogDescription>
            PO <span className="font-medium text-foreground">{formatPONo(po.po_no)}</span> akan diset menjadi <span className="font-medium text-foreground">Dibatalkan</span>. Tindakan ini akan tercatat di riwayat.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-sm">Alasan pembatalan <span className="text-destructive">*</span></Label>
          <Textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="mis. Salah supplier, harga tidak sesuai, dsb."
            rows={3}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setCancelOpen(false)} disabled={busy}>Tutup</Button>
          <Button variant="destructive" onClick={confirmCancel} disabled={busy || !cancelReason.trim()}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <X className="mr-1.5 h-4 w-4" />}
            Konfirmasi pembatalan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete modal */}
    <Dialog open={deleteOpen} onOpenChange={(o) => { if (!busy) setDeleteOpen(o); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-destructive/15 text-destructive">
              <Trash2 className="h-5 w-5" />
            </div>
            Hapus PO permanen
          </DialogTitle>
          <DialogDescription>
            PO <span className="font-medium text-foreground">{formatPONo(po.po_no)}</span> beserta seluruh item akan dihapus permanen. Riwayat tetap tersimpan untuk audit.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label className="text-sm">Alasan penghapusan <span className="text-destructive">*</span></Label>
          <Textarea
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            placeholder="mis. Dibuat duplikat, data uji coba, dsb."
            rows={3}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setDeleteOpen(false)} disabled={busy}>Tutup</Button>
          <Button variant="destructive" onClick={confirmDelete} disabled={busy || !deleteReason.trim()}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Trash2 className="mr-1.5 h-4 w-4" />}
            Hapus permanen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Receive modal — stock & HPP preview */}
    <Dialog open={receiveOpen} onOpenChange={(o) => { if (!busy) setReceiveOpen(o); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            Terima & update stok
          </DialogTitle>
          <DialogDescription>
            Tinjau perubahan stok dan HPP rata-rata berikut sebelum mengonfirmasi.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto -mx-6 px-6">
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Bahan</th>
                  <th className="px-3 py-2 text-right">Stok</th>
                  <th className="px-3 py-2 text-right">HPP rata-rata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {stockPreview.map((p) => {
                  const costDelta = p.newCost - p.currentCost;
                  return (
                    <tr key={p.id}>
                      <td className="px-3 py-2.5 font-medium">{p.name}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        <div className="text-muted-foreground text-xs">{p.currentStock} {p.unit}</div>
                        <div className="flex items-center justify-end gap-1 font-medium">
                          <ArrowRight className="h-3 w-3 text-emerald-600" />
                          {p.newStock} {p.unit}
                          <span className="text-xs text-emerald-600">(+{p.addQty})</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        <div className="text-muted-foreground text-xs">{formatIDR(p.currentCost)}</div>
                        <div className="flex items-center justify-end gap-1 font-medium">
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          {formatIDR(p.newCost)}
                          {Math.abs(costDelta) >= 0.5 && (
                            <span className={`text-xs ${costDelta > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                              {costDelta > 0 ? "↑" : "↓"} {formatIDR(Math.abs(costDelta))}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><TrendingUp className="h-3.5 w-3.5" /> Total nilai pembelian</div>
              <div className="mt-1 text-lg font-bold tabular-nums">{formatIDR(po.total)}</div>
            </div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400"><Info className="h-3.5 w-3.5" /> Setelah konfirmasi</div>
              <div className="mt-1 text-xs text-muted-foreground">Stok & HPP rata-rata otomatis ter-update; status PO menjadi <span className="font-medium text-foreground">Diterima</span>.</div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="outline" onClick={printStockPreview} disabled={busy}>
            <Printer className="mr-1.5 h-4 w-4" /> Cetak preview
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setReceiveOpen(false)} disabled={busy}>Tutup</Button>
            <Button onClick={confirmReceive} disabled={busy} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1.5 h-4 w-4" />}
              Konfirmasi terima
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Print-only sheet */}
    <div className="po-print">
      <POSheetBody po={po} items={items} ingMap={ingMap} supplier={supplier} shop={shop} statusLabel={statusLabel} prefs={prefs} />
    </div>

    {/* Print preview dialog */}
    <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
      <DialogContent className="max-w-[min(96vw,1100px)] max-h-[94vh] overflow-hidden p-0 gap-0 bg-muted/40 flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 print:hidden">
          <DialogTitle>Preview cetak — {formatPONo(po.po_no)}</DialogTitle>
        </DialogHeader>

        {/* Printer presets — saved per device (localStorage) */}
        <div className="border-y bg-accent/30 px-5 py-3 print:hidden">
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Settings2 className="h-3.5 w-3.5" /> Preset printer (tersimpan di perangkat ini)
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={prefs.activePresetId ?? "__none"}
                onValueChange={(v) => v === "__none"
                  ? setPrefs((p) => ({ ...p, activePresetId: null }))
                  : applyPreset(v)}
              >
                <SelectTrigger className="h-8 w-[220px]"><SelectValue placeholder="Pilih preset…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">— Tanpa preset —</SelectItem>
                  {presets.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}{defaultPresetId === p.id ? "  · default" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {prefs.activePresetId && (
                <>
                  <div className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1">
                    <Switch
                      id="default-preset"
                      checked={defaultPresetId === prefs.activePresetId}
                      onCheckedChange={toggleDefaultPreset}
                    />
                    <Label htmlFor="default-preset" className="text-xs">Pakai sebagai default</Label>
                  </div>
                  <Button variant="outline" size="sm" onClick={updateActivePreset}>Simpan perubahan</Button>
                  <Button variant="ghost" size="sm" onClick={deleteActivePreset} className="text-destructive hover:text-destructive">
                    <Trash2 className="mr-1 h-3.5 w-3.5" /> Hapus
                  </Button>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="mis. Epson Kasir A4"
                className="h-8 w-[220px]"
              />
              <Button size="sm" onClick={saveCurrentAsPreset}>
                <Save className="mr-1 h-3.5 w-3.5" /> Simpan sebagai baru
              </Button>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="grid gap-3 border-b bg-background px-5 py-3 text-sm md:grid-cols-2 lg:grid-cols-3 print:hidden">
          <div className="flex items-center gap-2">
            <Label className="w-20 shrink-0 text-xs text-muted-foreground">Kertas</Label>
            <Select value={prefs.paper} onValueChange={(v) => setPrefs((p) => ({ ...p, paper: v as PaperSize }))}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="a4">{PAPER_LABEL.a4}</SelectItem>
                <SelectItem value="letter">{PAPER_LABEL.letter}</SelectItem>
                <SelectItem value="thermal80">{PAPER_LABEL.thermal80}</SelectItem>
                <SelectItem value="thermal58">{PAPER_LABEL.thermal58}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="w-20 shrink-0 text-xs text-muted-foreground">Orientasi</Label>
            <Select
              value={prefs.orientation}
              onValueChange={(v) => setPrefs((p) => ({ ...p, orientation: v as Orientation }))}
              disabled={isThermal}
            >
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="w-20 shrink-0 text-xs text-muted-foreground">Margin</Label>
            <Select value={prefs.margin} onValueChange={(v) => setPrefs((p) => ({ ...p, margin: v as MarginMode }))}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="narrow">Sempit (8 mm)</SelectItem>
                <SelectItem value="normal">Normal (12–14 mm)</SelectItem>
                <SelectItem value="wide">Lebar (20–22 mm)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="w-20 shrink-0 text-xs text-muted-foreground">Printer</Label>
            <Input
              value={prefs.printerName}
              onChange={(e) => setPrefs((p) => ({ ...p, printerName: e.target.value }))}
              placeholder="mis. Epson L3210"
              className="h-8"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="w-20 shrink-0 text-xs text-muted-foreground">Tray</Label>
            <Input
              value={prefs.tray}
              onChange={(e) => setPrefs((p) => ({ ...p, tray: e.target.value }))}
              placeholder="mis. Tray 1 / Manual"
              className="h-8"
            />
          </div>
          <div className="flex items-center gap-3">
            <Label className="w-20 shrink-0 text-xs text-muted-foreground">Zoom</Label>
            <Slider
              value={[Math.round(prefs.zoom * 100)]}
              min={50} max={140} step={5}
              disabled={prefs.fitToPage}
              onValueChange={([v]) => setPrefs((p) => ({ ...p, zoom: v / 100 }))}
              className="flex-1"
            />
            <span className="w-10 text-right tabular-nums text-xs text-muted-foreground">
              {Math.round(effectiveZoom * 100)}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="fit" checked={prefs.fitToPage} onCheckedChange={(v) => setPrefs((p) => ({ ...p, fitToPage: v }))} />
            <Label htmlFor="fit" className="text-xs">Fit to page</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="tax" checked={prefs.showTax} onCheckedChange={(v) => setPrefs((p) => ({ ...p, showTax: v }))} />
            <Label htmlFor="tax" className="text-xs">Tampilkan pajak</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="notes" checked={prefs.showNotes} onCheckedChange={(v) => setPrefs((p) => ({ ...p, showNotes: v }))} />
            <Label htmlFor="notes" className="text-xs">Tampilkan catatan</Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="ship" checked={prefs.showShipping} onCheckedChange={(v) => setPrefs((p) => ({ ...p, showShipping: v }))} />
            <Label htmlFor="ship" className="text-xs">Alamat pengiriman</Label>
          </div>
          <div className="flex items-center justify-end gap-2 lg:col-span-3">
            {(prefs.tray || prefs.printerName) && (
              <span className="mr-auto text-xs text-muted-foreground">
                Tip: pilih “{prefs.printerName || "printer Anda"}”{prefs.tray ? ` · ${prefs.tray}` : ""} di dialog cetak browser.
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={() => setPrefs(DEFAULT_PREFS)}>Reset</Button>
          </div>
        </div>

        {/* Scaled preview area */}
        <div className="flex-1 overflow-auto px-4 py-6">
          <div
            style={{
              width: paperPx * effectiveZoom,
              margin: "0 auto",
            }}
          >
            <div className="po-preview" style={{ ["--po-zoom" as string]: String(effectiveZoom) }}>
              <POSheetBody po={po} items={items} ingMap={ingMap} supplier={supplier} shop={shop} statusLabel={statusLabel} prefs={prefs} />
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t bg-background print:hidden">
          <Button variant="outline" onClick={() => setPreviewOpen(false)}>Tutup</Button>
          <Button onClick={() => { setPreviewOpen(false); setTimeout(() => window.print(), 150); }}>
            <Printer className="mr-1.5 h-4 w-4" /> Cetak sekarang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function POSheetBody({
  po, items, ingMap, supplier, shop, statusLabel, prefs,
}: {
  po: PO;
  items: POItem[];
  ingMap: Record<string, Ingredient>;
  supplier: Supplier | null;
  shop: Shop | null;
  statusLabel: string;
  prefs: PrintPrefs;
}) {
  return (
    <>
      <div className="row">
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          {shop?.logo_url && (
            <img src={shop.logo_url} alt="" style={{ height: 48, width: 48, objectFit: "contain", borderRadius: 6 }} />
          )}
          <div>
            <h1>Purchase Order</h1>
            <div className="muted" style={{ marginTop: 4, fontSize: "10pt", fontWeight: 600 }}>{shop?.name ?? ""}</div>
            {shop?.address && <div className="muted" style={{ fontSize: "9.5pt" }}>{shop.address}</div>}
            {(shop?.phone || shop?.email) && (
              <div className="muted" style={{ fontSize: "9.5pt" }}>
                {[shop.phone, shop.email].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div className={`stamp ${po.status}`}>{statusLabel}</div>
          <div style={{ marginTop: 8, fontWeight: 700, fontSize: "12pt", letterSpacing: "0.02em" }}>
            {formatPONo(po.po_no)}
          </div>
          <div className="muted" style={{ fontSize: "9.5pt" }}>Tanggal terbit: {formatDateID(po.order_date)}</div>
          {po.expected_date && <div className="muted" style={{ fontSize: "9.5pt" }}>Kedatangan: {formatDateID(po.expected_date)}</div>}
          {po.received_date && <div className="muted" style={{ fontSize: "9.5pt" }}>Diterima: {formatDateID(po.received_date)}</div>}
        </div>
      </div>

      <div className="grid-2">
        <div className="box">
          <div className="label">Supplier</div>
          {supplier ? (
            <div style={{ marginTop: 4 }}>
              <div style={{ fontWeight: 600 }}>{supplier.name}</div>
              {supplier.contact_name && <div>{supplier.contact_name}</div>}
              {supplier.phone && <div className="muted">{supplier.phone}</div>}
              {supplier.email && <div className="muted">{supplier.email}</div>}
              {supplier.address && <div className="muted" style={{ marginTop: 2 }}>{supplier.address}</div>}
            </div>
          ) : <div className="muted" style={{ marginTop: 4 }}>— tidak ditentukan —</div>}
        </div>
        {prefs.showShipping && (
          <div className="box">
            <div className="label">Alamat pengiriman</div>
            <div style={{ marginTop: 4, fontWeight: 600 }}>{shop?.name ?? "—"}</div>
            {shop?.address && <div className="muted" style={{ fontSize: "9.5pt", marginTop: 2 }}>{shop.address}</div>}
            <div className="muted" style={{ fontSize: "9.5pt", marginTop: 6 }}>
              Dicetak: {new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}
            </div>
          </div>
        )}
      </div>

      <table>
        <thead>
          <tr>
            <th style={{ width: "6%" }}>#</th>
            <th>Bahan</th>
            <th className="num" style={{ width: "14%" }}>Qty</th>
            <th className="num" style={{ width: "20%" }}>Harga / unit</th>
            <th className="num" style={{ width: "20%" }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it, idx) => {
            const ig = ingMap[it.ingredient_id];
            return (
              <tr key={it.id}>
                <td>{idx + 1}</td>
                <td>{ig?.name ?? "—"}</td>
                <td className="num">{Number(it.quantity)} {ig?.unit}</td>
                <td className="num">{formatIDR(it.unit_cost)}</td>
                <td className="num">{formatIDR(it.subtotal)}</td>
              </tr>
            );
          })}
          {items.length === 0 && (
            <tr><td colSpan={5} style={{ textAlign: "center", padding: "16px 0" }} className="muted">Tidak ada item.</td></tr>
          )}
        </tbody>
      </table>

      <div className="totals">
        <div className="line"><span className="muted">Subtotal</span><span className="num">{formatIDR(po.subtotal)}</span></div>
        {prefs.showTax && Number(po.tax) > 0 && (
          <div className="line"><span className="muted">Pajak</span><span className="num">{formatIDR(po.tax)}</span></div>
        )}
        <div className="line grand"><span>Total</span><span className="num">{formatIDR(po.total)}</span></div>
      </div>

      {prefs.showNotes && po.note && (
        <div className="note">
          <div className="label">Catatan</div>
          <div style={{ marginTop: 4 }}>{po.note}</div>
        </div>
      )}

      <div className="footer">
        <div className="sign">Hormat kami,<br/>{shop?.name ?? ""}</div>
        <div className="sign">Penerima,<br/>{supplier?.name ?? ""}</div>
      </div>
    </>
  );
}
