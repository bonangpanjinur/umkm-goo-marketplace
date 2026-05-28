// ============================================================
// printReceipt — build and send a POS receipt via WebUSB
// No window.print(), no browser dialog, no PDF.
// ============================================================

import { EscPosBuilder, formatCurrency, type PaperWidth } from "./escpos";
import { printerService } from "./printerService";

export type ReceiptItem = {
  name: string;
  qty: number;
  price: number;
};

export type ReceiptData = {
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  cash: number;
  change: number;
  orderId?: string;
  cashierName?: string;
  note?: string;
  footer?: string;
  paper?: PaperWidth;
};

// ── Build raw ESC/POS bytes from receipt data ─────────────────

export function buildReceiptBytes(receipt: ReceiptData): Uint8Array {
  const paper: PaperWidth = receipt.paper ?? "58";

  const b = new EscPosBuilder(paper);

  const ts = new Date();
  const dateStr = ts.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timeStr = ts.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ── Header ───────────────────────────────────────────────
  b.feed(1)
    .boldCenter(receipt.shopName);

  if (receipt.shopAddress) {
    b.center(receipt.shopAddress);
  }
  if (receipt.shopPhone) {
    b.center(receipt.shopPhone);
  }
  b.feed(1)
    .divider();

  // ── Meta ─────────────────────────────────────────────────
  b.row("Tanggal", `${dateStr} ${timeStr}`);
  if (receipt.orderId) b.row("No. Order", `#${receipt.orderId}`);
  if (receipt.cashierName) b.row("Kasir", receipt.cashierName);
  b.divider();

  // ── Items ────────────────────────────────────────────────
  for (const item of receipt.items) {
    const lineTotal = item.qty * item.price;
    if (item.name.length <= 20) {
      b.row(
        `${item.qty}x ${item.name}`,
        formatCurrency(lineTotal, ""),
      );
    } else {
      b.text(item.name);
      b.row(
        `  ${item.qty}x ${formatCurrency(item.price, "")}`,
        formatCurrency(lineTotal, ""),
      );
    }
  }
  b.divider();

  // ── Totals ───────────────────────────────────────────────
  if (receipt.discount && receipt.discount > 0) {
    b.row("Subtotal", formatCurrency(receipt.subtotal, ""));
    b.row("Diskon", `-${formatCurrency(receipt.discount, "")}`);
  }
  if (receipt.tax && receipt.tax > 0) {
    b.row("Pajak", formatCurrency(receipt.tax, ""));
  }
  b.boldRow("TOTAL", formatCurrency(receipt.total, ""));
  b.row("TUNAI", formatCurrency(receipt.cash, ""));
  b.boldRow("KEMBALI", formatCurrency(receipt.change, ""));
  b.divider();

  // ── Note ─────────────────────────────────────────────────
  if (receipt.note) {
    b.center(receipt.note);
  }

  // ── Footer ───────────────────────────────────────────────
  b.center(receipt.footer ?? "Terima kasih atas kunjungan Anda!");
  b.feed(1);
  b.cut();

  return b.build();
}

// ── Print via WebUSB ─────────────────────────────────────────

export async function printReceipt(receipt: ReceiptData): Promise<void> {
  const bytes = buildReceiptBytes(receipt);
  await printerService.print(bytes);
}

// ── Auto-print after successful transaction ──────────────────

export type TransactionResult = {
  success: boolean;
  orderId?: string;
  cashierName?: string;
  items: ReceiptItem[];
  subtotal: number;
  discount?: number;
  tax?: number;
  total: number;
  cash: number;
  change: number;
};

export type ShopConfig = {
  shopName: string;
  shopAddress?: string;
  shopPhone?: string;
  paper?: PaperWidth;
  footer?: string;
};

/**
 * Call this after a transaction completes to automatically print the receipt.
 * Only prints if the printer is connected and transaction succeeded.
 */
export async function autoPrintAfterTransaction(
  transaction: TransactionResult,
  shop: ShopConfig,
  onError?: (err: Error) => void,
): Promise<boolean> {
  if (!transaction.success) return false;

  const receipt: ReceiptData = {
    shopName: shop.shopName,
    shopAddress: shop.shopAddress,
    shopPhone: shop.shopPhone,
    items: transaction.items,
    subtotal: transaction.subtotal,
    discount: transaction.discount,
    tax: transaction.tax,
    total: transaction.total,
    cash: transaction.cash,
    change: transaction.change,
    orderId: transaction.orderId,
    cashierName: transaction.cashierName,
    paper: shop.paper ?? "58",
    footer: shop.footer,
  };

  try {
    await printReceipt(receipt);
    return true;
  } catch (err) {
    if (onError) onError(err instanceof Error ? err : new Error(String(err)));
    return false;
  }
}
