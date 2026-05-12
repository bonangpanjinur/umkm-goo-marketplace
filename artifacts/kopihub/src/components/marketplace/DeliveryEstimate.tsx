import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Truck, Clock, MapPin, PackageCheck } from "lucide-react";
import { getDeliveryWindow, formatEta, estimatedArrivalTime, formatTime } from "@/lib/delivery-eta";

type DeliverySettings = {
  delivery_enabled: boolean;
  pickup_enabled: boolean;
  mode: "flat" | "zone";
  open_time: string | null;
  close_time: string | null;
  min_eta_minutes: number;
  max_eta_minutes: number;
  notes: string | null;
};

type DeliveryZone = {
  id: string;
  name: string;
  fee: number;
  area_note: string | null;
  is_active: boolean;
  min_eta_minutes: number;
  max_eta_minutes: number;
};

type ShopHours = {
  open_hours: unknown;
};

function Skeleton() {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 space-y-2 animate-pulse">
      <div className="h-4 w-40 rounded bg-muted/60" />
      <div className="h-3 w-56 rounded bg-muted/40" />
    </div>
  );
}

export function DeliveryEstimate({ shopId }: { shopId: string }) {
  const [settings, setSettings] = useState<DeliverySettings | null>(null);
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: s }, { data: z }] = await Promise.all([
        supabase
          .from("delivery_settings")
          .select(
            "delivery_enabled, pickup_enabled, mode, open_time, close_time, min_eta_minutes, max_eta_minutes, notes"
          )
          .eq("shop_id", shopId)
          .maybeSingle(),
        supabase
          .from("delivery_zones")
          .select("id, name, fee, area_note, is_active, min_eta_minutes, max_eta_minutes")
          .eq("shop_id", shopId)
          .eq("is_active", true)
          .order("sort_order"),
      ]);
      if (!cancelled) {
        setSettings(s as DeliverySettings | null);
        setZones((z ?? []) as DeliveryZone[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [shopId]);

  if (loading) return <Skeleton />;
  if (!settings) return null;
  if (!settings.delivery_enabled && !settings.pickup_enabled) return null;

  const now = new Date();
  const window = getDeliveryWindow(settings.open_time, settings.close_time, now);
  const isZoneMode = settings.mode === "zone";
  const activeZones = zones.filter((z) => z.is_active);

  return (
    <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Truck className="h-4 w-4 text-primary shrink-0" />
        Estimasi Pengiriman
      </h3>

      {settings.delivery_enabled && (
        <DeliveryAvailability
          window={window}
          isZoneMode={isZoneMode}
          zones={activeZones}
          flatMinEta={settings.min_eta_minutes ?? 30}
          flatMaxEta={settings.max_eta_minutes ?? 60}
          now={now}
        />
      )}

      {settings.pickup_enabled && (
        <div className="flex items-start gap-2 text-sm text-muted-foreground">
          <PackageCheck className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
          <span>Tersedia opsi <strong className="text-foreground">ambil sendiri</strong> di toko</span>
        </div>
      )}

      {settings.notes && (
        <p className="text-xs text-muted-foreground border-t border-border pt-2 leading-relaxed">
          {settings.notes}
        </p>
      )}
    </div>
  );
}

function DeliveryAvailability({
  window,
  isZoneMode,
  zones,
  flatMinEta,
  flatMaxEta,
  now,
}: {
  window: ReturnType<typeof getDeliveryWindow>;
  isZoneMode: boolean;
  zones: DeliveryZone[];
  flatMinEta: number;
  flatMaxEta: number;
  now: Date;
}) {
  if (!window.open) {
    return (
      <div className="flex items-start gap-2 text-sm">
        <Clock className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
        <div>
          <span className="font-medium text-amber-700 dark:text-amber-400">Delivery sedang tutup</span>
          {window.opensAt && (
            <span className="text-muted-foreground"> — buka pukul {formatTime(window.opensAt)}</span>
          )}
        </div>
      </div>
    );
  }

  if (isZoneMode && zones.length > 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex h-2 w-2 rounded-full bg-green-500 shrink-0" />
          <span className="font-medium text-green-700 dark:text-green-400">Delivery tersedia sekarang</span>
          {window.closesAt && (
            <span className="text-xs text-muted-foreground">hingga {formatTime(window.closesAt)}</span>
          )}
        </div>
        <div className="space-y-1.5 pl-4">
          {zones.map((z) => {
            const arrival = estimatedArrivalTime(z.min_eta_minutes, z.max_eta_minutes, now);
            return (
              <div key={z.id} className="flex items-start justify-between gap-2 text-xs">
                <div className="flex items-start gap-1.5 min-w-0">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-foreground">{z.name}</span>
                    {z.area_note && (
                      <span className="text-muted-foreground"> · {z.area_note}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-medium text-foreground">
                    ~{formatEta(z.min_eta_minutes, z.max_eta_minutes)}
                  </div>
                  <div className="text-muted-foreground">
                    tiba {arrival.earliest}–{arrival.latest}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  const arrival = estimatedArrivalTime(flatMinEta, flatMaxEta, now);
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-sm">
        <span className="inline-flex h-2 w-2 rounded-full bg-green-500 shrink-0" />
        <span className="font-medium text-green-700 dark:text-green-400">Delivery tersedia sekarang</span>
        {window.closesAt && (
          <span className="text-xs text-muted-foreground">hingga {formatTime(window.closesAt)}</span>
        )}
      </div>
      <div className="flex items-baseline gap-1 pl-4 text-sm">
        <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
        <span className="text-muted-foreground">Estimasi tiba dalam</span>
        <span className="font-semibold text-foreground">
          ~{formatEta(flatMinEta, flatMaxEta)}
        </span>
        <span className="text-muted-foreground text-xs">
          (sekitar pukul {arrival.earliest}–{arrival.latest})
        </span>
      </div>
    </div>
  );
}
