import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Subscribe ke perubahan tabel `orders` untuk satu shop.
 * Tampilkan toast + opsional play sound saat order baru masuk.
 *
 * Pakai di shell POS owner & shell kurir.
 *
 * @param shopId  ID toko yang ingin dipantau
 * @param opts.statusFilter  Filter status pesanan (mis. ['ready'] untuk kurir)
 * @param opts.onInsert  Callback tambahan saat order baru masuk
 * @param opts.playSound  Putar bunyi notifikasi sederhana (Web Audio)
 */
export function useRealtimeOrders(
  shopId: string | null | undefined,
  opts: {
    statusFilter?: string[];
    onInsert?: (order: Record<string, unknown>) => void;
    onChange?: () => void; // dipanggil di setiap INSERT/UPDATE yang lolos filter (untuk invalidate cache)
    playSound?: boolean;
    label?: string; // mis. "Order baru" / "Order siap diantar"
  } = {},
) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    if (!shopId) return;
    const channel = supabase
      .channel(`orders:${shopId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "orders",
          filter: `shop_id=eq.${shopId}`,
        },
        (payload) => {
          const o = payload.new as Record<string, unknown>;
          const status = (o.status as string) ?? "";
          const filter = optsRef.current.statusFilter;
          if (filter && filter.length > 0 && !filter.includes(status)) return;

          const label = optsRef.current.label ?? "Order baru masuk";
          toast.success(label, { description: `#${String(o.id).slice(0, 8)}` });

          if (optsRef.current.playSound) playBeep();
          optsRef.current.onInsert?.(o);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `shop_id=eq.${shopId}`,
        },
        (payload) => {
          const o = payload.new as Record<string, unknown>;
          const old = payload.old as Record<string, unknown>;
          // Notify kurir kalau order baru menjadi 'ready'
          const filter = optsRef.current.statusFilter;
          if (
            filter &&
            filter.includes(o.status as string) &&
            old.status !== o.status
          ) {
            toast.success(optsRef.current.label ?? "Order siap diantar", {
              description: `#${String(o.id).slice(0, 8)}`,
            });
            if (optsRef.current.playSound) playBeep();
            optsRef.current.onInsert?.(o);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId]);
}

let _ctx: AudioContext | null = null;
function playBeep() {
  try {
    _ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const ctx = _ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // ignore
  }
}
