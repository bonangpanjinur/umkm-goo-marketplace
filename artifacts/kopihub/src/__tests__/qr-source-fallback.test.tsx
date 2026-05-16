import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Receipt } from "@/components/pos/receipt";
import { KitchenTicket } from "@/components/pos/kitchen-ticket";

const baseReceiptProps = {
  shopName: "KopiHub",
  outletName: "Outlet A",
  orderNo: "0001",
  cashierName: "Kasir",
  date: new Date("2026-05-16T10:00:00Z"),
  items: [{ menu_item_id: "", name: "Kopi Susu", unit_price: 20000, quantity: 1 }],
  subtotal: 20000,
  total: 20000,
  paymentMethod: "cash" as const,
  amountTendered: 20000,
  changeDue: 0,
};

describe("QR Meja source fallback rendering", () => {
  it("customer receipt shows 'Sumber: QR Meja' even when table_label is null", () => {
    const html = renderToStaticMarkup(
      <Receipt {...baseReceiptProps} source="QR Meja" customerName={undefined} />,
    );
    expect(html).toContain("Sumber");
    expect(html).toContain("QR Meja");
  });

  it("kitchen ticket shows 'Sumber: QR Meja' even when customerName is null", () => {
    const html = renderToStaticMarkup(
      <KitchenTicket
        orderNo="0001"
        date={new Date("2026-05-16T10:00:00Z")}
        outletName="Outlet A"
        customerName={null}
        items={baseReceiptProps.items}
        source="QR Meja"
      />,
    );
    expect(html).toContain("Sumber: QR Meja");
  });

  it("preview (same Receipt component) renders consistent QR Meja label", () => {
    // Preview uses the same Receipt component as print + customer view
    const html = renderToStaticMarkup(
      <Receipt
        {...baseReceiptProps}
        source="QR Meja"
        customerName="QR Meja (no. meja belum tercatat)"
      />,
    );
    expect(html).toContain("QR Meja");
    expect(html).toContain("(no. meja belum tercatat)");
  });

  it("does not render source line when source is null", () => {
    const html = renderToStaticMarkup(
      <Receipt {...baseReceiptProps} source={null} />,
    );
    expect(html).not.toContain("Sumber:");
  });
});