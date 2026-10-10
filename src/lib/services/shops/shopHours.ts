/**
 * Shop opening hours, set by the Game Master on a shop's Hours tab and honoured by the hero's shop.
 *
 * Times are local "HH:MM" (24 hour) strings. A shop with no hours (absent, null or unreadable) is always open,
 * so old shop records and bad data never lock a hero out. A range that ends before it starts (20:00 to 02:00)
 * runs through midnight. The opening minute is open, the closing minute is already closed.
 */

export interface ShopHours {
  open: string;
  close: string;
}

/** What the Hours tab starts from when the Game Master turns "Always open" off. */
export const DEFAULT_SHOP_HOURS: ShopHours = { open: "08:00", close: "20:00" };

const MINUTES_PER_DAY = 24 * 60;

/** Minutes after midnight for "HH:MM", or null when the text is not a clock time. */
export function clockToMinutes(clock: unknown): number | null {
  if (typeof clock !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(clock.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** "07:00" -> "7:00 AM", "00:00" -> "12:00 AM", "12:30" -> "12:30 PM". Unreadable text comes back as given. */
export function formatClock(clock: string): string {
  const total = clockToMinutes(clock);
  if (total === null) return String(clock ?? "");
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours < 12 ? "AM" : "PM";
  const twelveHour = hours % 12 === 0 ? 12 : hours % 12;
  return `${twelveHour}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

/** Both ends as minutes after midnight, or null when there are no usable hours (the shop is always open). */
function readHours(hours: ShopHours | null | undefined): { open: number; close: number } | null {
  if (!hours) return null;
  const open = clockToMinutes(hours.open);
  const close = clockToMinutes(hours.close);
  if (open === null || close === null) return null;
  // Opening and closing at the same minute is not a closure: the shop is open round the clock.
  if (open === close) return null;
  return { open, close };
}

function minutesOf(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

/** Whether the shop is open at `now`. No hours means always open. */
export function isShopOpen(hours: ShopHours | null | undefined, now: Date): boolean {
  const range = readHours(hours);
  if (!range) return true;
  const minute = minutesOf(now);
  if (range.open < range.close) return minute >= range.open && minute < range.close;
  // Overnight: open from the opening time until midnight, and again from midnight until the closing time.
  return minute >= range.open || minute < range.close;
}

/**
 * What the clerk says about the next opening while the shop is closed: "Opens at 7:00 AM" when that is later
 * today, "Opens tomorrow at 7:00 AM" when today's window has passed. Empty when the shop is open right now.
 */
export function opensAtLabel(hours: ShopHours | null | undefined, now: Date): string {
  const range = readHours(hours);
  if (!range || isShopOpen(hours, now)) return "";
  const clock = formatClock(hours!.open);
  return minutesOf(now) < range.open ? `Opens at ${clock}` : `Opens tomorrow at ${clock}`;
}

/** One line for the Game Master and the shop sign: "Always open" or "7:00 AM to 9:00 PM". */
export function hoursSummary(hours: ShopHours | null | undefined): string {
  if (!readHours(hours)) return "Always open";
  return `${formatClock(hours!.open)} to ${formatClock(hours!.close)}`;
}

/** How long the shop stays open each day, in minutes (a full day for an always open shop). */
export function openMinutesPerDay(hours: ShopHours | null | undefined): number {
  const range = readHours(hours);
  if (!range) return MINUTES_PER_DAY;
  return (range.close - range.open + MINUTES_PER_DAY) % MINUTES_PER_DAY;
}
