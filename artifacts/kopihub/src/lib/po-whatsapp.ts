// Helpers untuk template pesan WhatsApp Purchase Order.
import { formatIDR } from "./format";

export type WATemplate = "ringkas" | "lengkap" | "formal";

export const WA_TEMPLATE_LABELS: Record<WATemplate, string> = {
  ringkas: "Ringkas",
  lengkap: "Lengkap",
  formal: "Formal",
};

export const WA_TEMPLATE_DESC: Record<WATemplate, string> = {
  ringkas: "Hanya no PO + total, untuk supplier yang sudah biasa.",
  lengkap: "No PO, tanggal, kedatangan, total + catatan.",
  formal: "Sapaan formal lengkap dengan rincian + tanda tangan toko.",
};

const PREF_KEY = "po-wa-template/v1";

export function loadTemplate(): WATemplate {
  if (typeof window === "undefined") return "lengkap";
  try {
    const v = localStorage.getItem(PREF_KEY);
    if (v === "ringkas" || v === "lengkap" || v === "formal") return v;
  } catch { /* noop */ }
  return "lengkap";
}
export function saveTemplate(t: WATemplate) {
  try { localStorage.setItem(PREF_KEY, t); } catch { /* noop */ }
}

export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return "";
  const d = raw.replace(/[^\d+]/g, "").replace(/^\+?62/, "0").replace(/\D/g, "");
  return d.startsWith("0") ? `62${d.slice(1)}` : d;
}

type POForWA = {
  po_no: string;
  order_date: string;
  expected_date?: string | null;
  total: number;
  note?: string | null;
};

export function buildWAMessage(opts: {
  template: WATemplate;
  supplierName: string;
  shopName?: string | null;
  po: POForWA;
}): string {
  const { template, supplierName, shopName, po } = opts;
  const sup = supplierName || "Bapak/Ibu";
  switch (template) {
    case "ringkas":
      return `Halo ${sup}, mohon proses PO ${po.po_no} dengan total ${formatIDR(po.total)}. Terima kasih.`;
    case "lengkap":
      return (
        `Halo ${sup},\n\nMohon proses Purchase Order berikut:\n` +
        `• No PO: ${po.po_no}\n` +
        `• Tanggal: ${po.order_date}\n` +
        (po.expected_date ? `• Kedatangan: ${po.expected_date}\n` : "") +
        `• Total: ${formatIDR(po.total)}\n` +
        (po.note ? `\nCatatan: ${po.note}\n` : "") +
        `\nTerima kasih.`
      );
    case "formal":
      return (
        `Yth. ${sup},\n\n` +
        `Bersama ini kami sampaikan Purchase Order dari ${shopName ?? "kami"}:\n\n` +
        `No PO  : ${po.po_no}\n` +
        `Tanggal: ${po.order_date}\n` +
        (po.expected_date ? `Kedatangan: ${po.expected_date}\n` : "") +
        `Total  : ${formatIDR(po.total)}\n` +
        (po.note ? `\nCatatan tambahan:\n${po.note}\n` : "") +
        `\nMohon konfirmasi penerimaan PO ini. Terima kasih atas kerjasamanya.\n\n` +
        `Hormat kami,\n${shopName ?? ""}`
      );
  }
}

export function openWA(phone: string, message: string) {
  const p = normalizePhone(phone);
  if (!p) return false;
  window.open(`https://wa.me/${p}?text=${encodeURIComponent(message)}`, "_blank");
  return true;
}
