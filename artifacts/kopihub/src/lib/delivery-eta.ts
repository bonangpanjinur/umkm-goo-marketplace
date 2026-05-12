/**
 * Delivery ETA utility functions for F4-4
 * Calculates estimated delivery time based on delivery settings,
 * delivery zones, and shop operating hours.
 */

function parseHM(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export type DeliveryWindow = {
  open: boolean;
  opensAt: string | null;
  closesAt: string | null;
};

/**
 * Checks if delivery is currently available based on delivery_settings
 * open_time / close_time, and falls back to shop open_hours if not set.
 */
export function getDeliveryWindow(
  openTime: string | null,
  closeTime: string | null,
  now: Date = new Date()
): DeliveryWindow {
  if (!openTime && !closeTime) {
    return { open: true, opensAt: null, closesAt: null };
  }

  const cur = now.getHours() * 60 + now.getMinutes();

  if (openTime && closeTime) {
    const o = parseHM(openTime);
    const c = parseHM(closeTime);
    const open = c >= o ? cur >= o && cur < c : cur >= o || cur < c;
    return {
      open,
      opensAt: openTime,
      closesAt: closeTime,
    };
  }

  if (openTime && !closeTime) {
    const o = parseHM(openTime);
    return { open: cur >= o, opensAt: openTime, closesAt: null };
  }

  if (!openTime && closeTime) {
    const c = parseHM(closeTime);
    return { open: cur < c, opensAt: null, closesAt: closeTime };
  }

  return { open: true, opensAt: null, closesAt: null };
}

/** Format minutes into human-readable Indonesian string */
export function formatEta(minMinutes: number, maxMinutes: number): string {
  if (minMinutes === maxMinutes) {
    return formatMinutes(minMinutes);
  }
  return `${formatMinutes(minMinutes)}–${formatMinutes(maxMinutes)}`;
}

function formatMinutes(m: number): string {
  if (m < 60) return `${m} mnt`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  if (rem === 0) return `${h} jam`;
  return `${h} jam ${rem} mnt`;
}

/** Format time string (HH:mm) to human-readable */
export function formatTime(t: string): string {
  return t.length === 5 ? t : t.substring(0, 5);
}

/** Compute arrival time from now + ETA minutes */
export function estimatedArrivalTime(
  minMinutes: number,
  maxMinutes: number,
  now: Date = new Date()
): { earliest: string; latest: string } {
  const earliest = new Date(now.getTime() + minMinutes * 60 * 1000);
  const latest = new Date(now.getTime() + maxMinutes * 60 * 1000);
  const fmt = (d: Date) =>
    d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  return { earliest: fmt(earliest), latest: fmt(latest) };
}
