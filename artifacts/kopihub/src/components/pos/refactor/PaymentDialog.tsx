import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Check,
  QrCode,
  Banknote,
  Loader2,
  Truck,
  Clock,
  MapPin,
  Calculator,
} from "lucide-react";
import { formatIDR } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";

type OutletCourier = {
  id: string;
  courier_name: string;
  service_type: string;
  base_fee: number;
  per_km_fee: number;
  min_order: number;
  free_above: number | null;
  max_distance_km: number | null;
  eta_min_minutes: number;
  eta_max_minutes: number;
  is_active: boolean;
};

export type DeliveryInfo = {
  courier_id: string;
  courier_name: string;
  service_type: string;
  distance_km: number;
  base_fee: number;
  per_km_fee: number;
  fee: number;
  is_free: boolean;
  eta_min: number;
  eta_max: number;
  address: string | null;
};

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  subtotal?: number;
  serviceCharge?: number;
  tax?: number;
  outletId?: string | null;
  onConfirm: (
    method: string,
    amount: number,
    extras: {
      customer_name: string | null;
      table_label: string | null;
      delivery?: DeliveryInfo | null;
    }
  ) => Promise<void>;
}

export function PaymentDialog({
  open,
  onOpenChange,
  total: baseTotal,
  subtotal,
  serviceCharge = 0,
  tax = 0,
  outletId,
  onConfirm,
}: PaymentDialogProps) {
  const [method, setMethod] = useState<"cash" | "qris">("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [tableLabel, setTableLabel] = useState("");

  // Delivery state
  const [isDelivery, setIsDelivery] = useState(false);
  const [couriers, setCouriers] = useState<OutletCourier[]>([]);
  const [courierId, setCourierId] = useState<string>("");
  const [distance, setDistance] = useState("3");
  const [address, setAddress] = useState("");

  useEffect(() => {
    if (open) {
      setMethod("cash");
      setCashAmount("");
      setLoading(false);
      setCustomerName("");
      setTableLabel("");
      setIsDelivery(false);
      setCourierId("");
      setDistance("3");
      setAddress("");
    }
  }, [open]);

  // Load outlet couriers when delivery enabled
  useEffect(() => {
    if (!open || !isDelivery || !outletId) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("outlet_couriers")
        .select(
          "id, courier_name, service_type, base_fee, per_km_fee, min_order, free_above, max_distance_km, eta_min_minutes, eta_max_minutes, is_active",
        )
        .eq("outlet_id", outletId)
        .eq("is_active", true)
        .order("sort_order")
        .order("courier_name");
      const list = (data ?? []) as OutletCourier[];
      setCouriers(list);
      if (list.length && !courierId) setCourierId(list[0].id);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isDelivery, outletId]);

  const orderSubtotal = subtotal ?? baseTotal;
  const selectedCourier = couriers.find((c) => c.id === courierId) ?? null;
  const distNum = Number(distance || 0);

  const deliveryCalc = (() => {
    if (!isDelivery || !selectedCourier) return null;
    const c = selectedCourier;
    if (c.max_distance_km != null && distNum > c.max_distance_km) {
      return { status: "out_of_range" as const, c };
    }
    if (c.min_order > orderSubtotal) {
      return { status: "below_min" as const, c };
    }
    const isFree = c.free_above != null && orderSubtotal >= c.free_above;
    const rawFee = Math.max(0, Math.round(c.base_fee + c.per_km_fee * distNum));
    const fee = isFree ? 0 : rawFee;
    return { status: "ok" as const, c, fee, rawFee, isFree };
  })();

  const deliveryFee =
    deliveryCalc?.status === "ok" ? deliveryCalc.fee : 0;
  const total = baseTotal + deliveryFee;

  const amount = Number(cashAmount || 0);
  const change = amount - total;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      let delivery: DeliveryInfo | null = null;
      if (isDelivery && deliveryCalc?.status === "ok") {
        const c = deliveryCalc.c;
        delivery = {
          courier_id: c.id,
          courier_name: c.courier_name,
          service_type: c.service_type,
          distance_km: distNum,
          base_fee: c.base_fee,
          per_km_fee: c.per_km_fee,
          fee: deliveryCalc.fee,
          is_free: deliveryCalc.isFree,
          eta_min: c.eta_min_minutes,
          eta_max: c.eta_max_minutes,
          address: address.trim() || null,
        };
      }
      await onConfirm(method, method === "cash" ? amount : total, {
        customer_name: customerName.trim() || null,
        table_label: tableLabel.trim() || null,
        delivery,
      });
    } finally {
      setLoading(false);
    }
  };

  const deliveryBlocked =
    isDelivery &&
    (deliveryCalc?.status === "out_of_range" ||
      deliveryCalc?.status === "below_min" ||
      (isDelivery && !selectedCourier));

  const quickCash = [total, 20000, 50000, 100000].filter((v) => v >= total);
  const next10k = Math.ceil(total / 10000) * 10000;
  const next50k = Math.ceil(total / 50000) * 50000;
  const suggestions = Array.from(new Set([...quickCash, next10k, next50k]))
    .sort((a, b) => a - b)
    .slice(0, 4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Pembayaran</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Breakdown */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="tabular-nums">{formatIDR(subtotal ?? baseTotal)}</span>
            </div>
            {serviceCharge > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="tabular-nums">{formatIDR(serviceCharge)}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pajak</span>
                <span className="tabular-nums">{formatIDR(tax)}</span>
              </div>
            )}

            {isDelivery && deliveryCalc?.status === "ok" && (
              <>
                <div className="my-1.5 border-t border-dashed" />
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Truck className="h-3 w-3" /> Ongkir — {deliveryCalc.c.courier_name}
                  <Badge variant="outline" className="text-[9px] py-0 px-1 ml-1">
                    {deliveryCalc.c.service_type}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tarif dasar</span>
                  <span className="tabular-nums">{formatIDR(deliveryCalc.c.base_fee)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Per km × {distNum} km ({formatIDR(deliveryCalc.c.per_km_fee)}/km)
                  </span>
                  <span className="tabular-nums">
                    {formatIDR(Math.round(deliveryCalc.c.per_km_fee * distNum))}
                  </span>
                </div>
                {deliveryCalc.isFree ? (
                  <div className="flex justify-between font-medium">
                    <span className="text-emerald-600 dark:text-emerald-400">
                      Gratis ongkir 🎉
                    </span>
                    <span className="tabular-nums">
                      <span className="line-through text-muted-foreground mr-1.5">
                        {formatIDR(deliveryCalc.rawFee)}
                      </span>
                      {formatIDR(0)}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between font-medium">
                    <span>Total ongkir</span>
                    <span className="tabular-nums">{formatIDR(deliveryCalc.fee)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-muted-foreground pt-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    ETA {deliveryCalc.c.eta_min_minutes}–{deliveryCalc.c.eta_max_minutes} menit
                  </span>
                </div>
              </>
            )}

            <div className="my-1.5 border-t" />
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">Total Tagihan</span>
              <span className="text-2xl font-bold text-primary tabular-nums">
                {formatIDR(total)}
              </span>
            </div>
          </div>

          {/* Identitas */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="cust-name" className="text-xs">Atas Nama</Label>
              <Input
                id="cust-name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Nama pelanggan"
                maxLength={60}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="table-label" className="text-xs">
                {isDelivery ? "Catatan" : "Meja (opsional)"}
              </Label>
              <Input
                id="table-label"
                value={tableLabel}
                onChange={(e) => setTableLabel(e.target.value)}
                placeholder={isDelivery ? "Catatan internal" : "Mis. 5 / VIP-2"}
                maxLength={20}
              />
            </div>
          </div>

          {/* Delivery toggle */}
          {outletId && (
            <div className="rounded-lg border p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Pesanan Delivery</p>
                    <p className="text-[11px] text-muted-foreground">
                      Hitung ongkir otomatis dari tarif outlet.
                    </p>
                  </div>
                </div>
                <Switch checked={isDelivery} onCheckedChange={setIsDelivery} />
              </div>

              {isDelivery && (
                <div className="space-y-2.5 pt-1 border-t">
                  {couriers.length === 0 ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400 pt-2">
                      Belum ada tarif kurir di outlet ini. Atur dulu di
                      menu <b>Kurir &amp; Ongkir Outlet</b>.
                    </p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Kurir</Label>
                          <Select value={courierId} onValueChange={setCourierId}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Pilih" />
                            </SelectTrigger>
                            <SelectContent>
                              {couriers.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.courier_name} · {c.service_type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs flex items-center gap-1">
                            <Calculator className="h-3 w-3" /> Jarak (km)
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            step="0.1"
                            value={distance}
                            onChange={(e) => setDistance(e.target.value)}
                            className="h-9"
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Alamat tujuan
                        </Label>
                        <Textarea
                          rows={2}
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Alamat lengkap pelanggan…"
                          maxLength={300}
                        />
                      </div>

                      {deliveryCalc?.status === "out_of_range" && (
                        <p className="text-xs text-destructive">
                          Jarak melebihi batas {deliveryCalc.c.max_distance_km} km.
                        </p>
                      )}
                      {deliveryCalc?.status === "below_min" && (
                        <p className="text-xs text-destructive">
                          Min order delivery {formatIDR(deliveryCalc.c.min_order)}.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Payment method */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={method === "cash" ? "default" : "outline"}
              className="h-16 flex-col gap-1.5"
              onClick={() => setMethod("cash")}
            >
              <Banknote className="h-5 w-5" />
              Tunai
            </Button>
            <Button
              variant={method === "qris" ? "default" : "outline"}
              className="h-16 flex-col gap-1.5"
              onClick={() => setMethod("qris")}
            >
              <QrCode className="h-5 w-5" />
              QRIS
            </Button>
          </div>

          {method === "cash" && (
            <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="space-y-2">
                <Label>Uang Diterima</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    Rp
                  </span>
                  <Input
                    type="number"
                    className="pl-10 text-lg font-semibold"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {suggestions.map((v) => (
                  <Button
                    key={v}
                    variant="outline"
                    size="sm"
                    data-testid="cash-suggestion"
                    data-amount={v}
                    onClick={() => setCashAmount(v.toString())}
                  >
                    {formatIDR(v)}
                  </Button>
                ))}
              </div>

              {amount >= total && (
                <div className="rounded-lg bg-primary/5 p-3 text-center border border-primary/10">
                  <div className="text-xs text-muted-foreground">Kembalian</div>
                  <div className="text-xl font-bold text-primary">
                    {formatIDR(change)}
                  </div>
                </div>
              )}
            </div>
          )}

          {method === "qris" && (
            <div className="flex flex-col items-center justify-center py-3 space-y-3 animate-in fade-in zoom-in-95">
              <div className="rounded-xl border-2 border-dashed p-6">
                <QrCode className="h-20 w-20 text-muted-foreground opacity-20" />
              </div>
              <p className="text-xs text-muted-foreground text-center px-8">
                Scan QRIS pada terminal atau tunjukkan QR statis kepada pelanggan.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            className="w-full h-12 text-lg"
            data-testid="confirm-payment"
            disabled={
              loading ||
              deliveryBlocked ||
              (method === "cash" && amount < total)
            }
            onClick={handleConfirm}
          >
            {loading ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Check className="mr-2 h-5 w-5" />
            )}
            Selesaikan Pesanan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
