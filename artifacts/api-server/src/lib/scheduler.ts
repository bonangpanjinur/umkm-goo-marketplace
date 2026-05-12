import { logger } from "./logger.js";
import { runRenewalNotifications } from "../routes/notifications.js";

const WIB_OFFSET_HOURS = 7; // UTC+7
const TARGET_HOUR_WIB = 9;  // 9:00 AM WIB

/**
 * Returns true if it's currently within the 9 AM WIB window (±5 min tolerance).
 */
function isRenewalTime(): boolean {
  const nowUtc = new Date();
  const wibHour = (nowUtc.getUTCHours() + WIB_OFFSET_HOURS) % 24;
  const wibMinute = nowUtc.getUTCMinutes();
  return wibHour === TARGET_HOUR_WIB && wibMinute < 10;
}

let lastRunDate = "";

/**
 * Tick function — called every 10 minutes.
 * Fires renewal job once per day when the clock enters the 9 AM WIB window.
 */
async function tick() {
  if (!isRenewalTime()) return;
  const today = new Date().toISOString().slice(0, 10);
  if (lastRunDate === today) return; // already ran today

  lastRunDate = today;
  logger.info({ today }, "[scheduler] Running daily renewal notifications");

  try {
    const result = await runRenewalNotifications([1, 3, 7, 14]);
    logger.info(
      { total_sent: result.total_sent, total_found: result.total_found },
      "[scheduler] Renewal job complete",
    );
  } catch (err) {
    logger.error({ err }, "[scheduler] Renewal job failed");
  }
}

const INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

export function startScheduler(): void {
  logger.info(
    { interval_min: INTERVAL_MS / 60_000, target_hour_wib: TARGET_HOUR_WIB },
    "[scheduler] Starting daily renewal scheduler",
  );
  // Run once on startup (in case server restarted during the window)
  tick().catch(() => {});
  setInterval(() => tick().catch(() => {}), INTERVAL_MS);
}
