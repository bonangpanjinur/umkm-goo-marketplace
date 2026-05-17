import { forwardRef } from "react";
import { formatIDR } from "@/lib/format";
import type { CartItem } from "@/lib/cart";

type Props = {
  shopName: string;
  outletName: string;
  orderNo: string;
  date: Date;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  courierName?: string | null;
  trackingNumber?: string | null;
  deliveryFee?: number;
  total: number;
  items: CartItem[];
  note?: string | null;
};

/** Separate courier slip — printed alongside the customer receipt for
 * delivery orders. Includes address + courier name in large type so the
 * driver can read it at a glance. */
export const CourierReceipt = forwardRef<HTMLDivElement, Props>(function CourierReceipt(
  {
    shopName,
    outletName,
    orderNo,
    date,
    customerName,
    customerPhone,
    deliveryAddress,
    courierName,
    trackingNumber,
    deliveryFee = 0,
    total,
    items,
    note,
  },
  ref,
) {
  return (
    <div ref={ref} className="receipt-58" data-receipt-type="courier" data-testid="courier-receipt">
      <div className="r-center r-bold">SURAT JALAN KURIR</div>
      <div className="r-center r-small">{shopName}{outletName ? ` · ${outletName}` : ""}</div>
      <div className="r-divider" />
      <div className="r-row">
        <span>No</span>
        <span>#{orderNo}</span>
      </div>
      <div className="r-row">
        <span>Tanggal</span>
        <span>
          {date.toLocaleDateString("id-ID")} {date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
      <div className="r-divider" />
      <div className="r-bold">KURIR</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{courierName || "—"}</div>
      {trackingNumber && <div className="r-small">Resi: {trackingNumber}</div>}
      <div className="r-divider" />
      <div className="r-bold">PENERIMA</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{customerName || "—"}</div>
      {customerPhone && <div className="r-small">Telp. {customerPhone}</div>}
      <div className="r-divider" />
      <div className="r-bold">ALAMAT PENGIRIMAN</div>
      <div style={{ fontSize: 13, lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
        {deliveryAddress || "(alamat tidak tersedia)"}
      </div>
      <div className="r-divider" />
      <div className="r-bold">ISI PAKET</div>
      {items.map((it, idx) => (
        <div key={idx} className="r-row r-small">
          <span>{it.quantity}× {it.name}</span>
        </div>
      ))}
      <div className="r-divider" />
      <div className="r-row">
        <span>Ongkir</span>
        <span>{formatIDR(deliveryFee)}</span>
      </div>
      <div className="r-row r-bold">
        <span>TOTAL TAGIHAN</span>
        <span>{formatIDR(total)}</span>
      </div>
      {note && (
        <>
          <div className="r-divider" />
          <div className="r-small"><b>Catatan:</b> {note}</div>
        </>
      )}
      <div className="r-divider" />
      <div className="r-row r-small" style={{ marginTop: 8 }}>
        <span>Diserahkan</span>
        <span>Diterima</span>
      </div>
      <div className="r-row" style={{ marginTop: 28, borderTop: "1px dashed #000", paddingTop: 4 }}>
        <span className="r-small">(...........)</span>
        <span className="r-small">(...........)</span>
      </div>
    </div>
  );
});
