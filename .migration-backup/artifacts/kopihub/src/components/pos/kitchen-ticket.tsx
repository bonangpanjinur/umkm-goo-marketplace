import type { CartItem } from "@/lib/cart";

type Props = {
  orderNo: string;
  date: Date;
  outletName?: string;
  customerName?: string | null;
  items: CartItem[];
  station?: string;
};

/** Simple thermal-friendly kitchen ticket. Renders inside a hidden print
 * container; styling comes from .receipt + @media print rules in styles.css. */
export function KitchenTicket({ orderNo, date, outletName, customerName, items, station }: Props) {
  return (
    <div className="receipt p-2 font-mono text-[12px] leading-tight">
      <div className="text-center font-bold text-[14px]">TIKET DAPUR</div>
      {station && <div className="text-center uppercase">{station}</div>}
      <div className="my-1 border-t border-dashed" />
      <div className="flex justify-between">
        <span>#{orderNo}</span>
        <span>{date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      {outletName && <div className="text-[11px]">{outletName}</div>}
      {customerName && <div className="text-[11px]">Pelanggan: {customerName}</div>}
      <div className="my-1 border-t border-dashed" />
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i}>
            <div className="font-bold">
              {it.quantity}× {it.name}
            </div>
            {it.note && <div className="pl-3 italic">» {it.note}</div>}
          </li>
        ))}
      </ul>
      <div className="my-1 border-t border-dashed" />
      <div className="text-center text-[10px]">— selesai —</div>
    </div>
  );
}
