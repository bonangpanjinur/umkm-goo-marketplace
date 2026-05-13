// Helper untuk deeplink pelacakan resi kurir Indonesia.
// Daftar kurir umum + builder URL pelacakan publik.

export type CourierKey =
  | "jne" | "jnt" | "sicepat" | "anteraja" | "ninja"
  | "pos" | "tiki" | "lion" | "wahana" | "gosend" | "grab" | "lalamove" | "other";

export const COURIERS: { key: CourierKey; label: string }[] = [
  { key: "jne",      label: "JNE" },
  { key: "jnt",      label: "J&T Express" },
  { key: "sicepat",  label: "SiCepat" },
  { key: "anteraja", label: "AnterAja" },
  { key: "ninja",    label: "Ninja Xpress" },
  { key: "pos",      label: "POS Indonesia" },
  { key: "tiki",     label: "TIKI" },
  { key: "lion",     label: "Lion Parcel" },
  { key: "wahana",   label: "Wahana" },
  { key: "gosend",   label: "GoSend" },
  { key: "grab",     label: "GrabExpress" },
  { key: "lalamove", label: "Lalamove" },
  { key: "other",    label: "Kurir Lainnya" },
];

export function courierLabel(key?: string | null): string {
  if (!key) return "Kurir";
  const found = COURIERS.find(c => c.key === key.toLowerCase());
  return found?.label ?? key;
}

export function getCourierTrackUrl(courier?: string | null, awb?: string | null): string | null {
  if (!awb) return null;
  const code = (awb || "").trim();
  if (!code) return null;
  const c = (courier || "").toLowerCase();
  switch (c) {
    case "jne":      return `https://www.jne.co.id/id/tracking/trace/${encodeURIComponent(code)}`;
    case "jnt":      return `https://www.jet.co.id/track?awb=${encodeURIComponent(code)}`;
    case "sicepat":  return `https://www.sicepat.com/checkAwb/${encodeURIComponent(code)}`;
    case "anteraja": return `https://www.anteraja.id/tracking/${encodeURIComponent(code)}`;
    case "ninja":    return `https://www.ninjaxpress.co/id-id/tracking?id=${encodeURIComponent(code)}`;
    case "pos":      return `https://www.posindonesia.co.id/id/tracking?Barcode=${encodeURIComponent(code)}`;
    case "tiki":     return `https://www.tiki.id/id/tracking?awb=${encodeURIComponent(code)}`;
    case "lion":     return `https://lionparcel.com/track-shipment?awb=${encodeURIComponent(code)}`;
    case "wahana":   return `https://www.wahana.com/track/${encodeURIComponent(code)}`;
    default:         return `https://cekresi.com/?noresi=${encodeURIComponent(code)}`;
  }
}
