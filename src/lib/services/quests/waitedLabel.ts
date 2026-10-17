const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/**
 * How long a claim has waited on the Game Master, for its row on the Approvals screen: "waited 5m", "waited 3h",
 * "waited 2d". A claim under a minute old reads "just arrived". An unreadable or future timestamp gives "" so the row
 * shows nothing rather than a wrong number.
 */
export const waitedLabel = (completedAt: string, now: number = Date.now()): string => {
  const sentAt = new Date(completedAt).getTime();
  const isUnreadable = !completedAt || Number.isNaN(sentAt);
  if (isUnreadable) return "";
  const waited = now - sentAt;
  const isFuture = waited < 0;
  if (isFuture) return "";
  const isUnderMinute = waited < MINUTE_MS;
  if (isUnderMinute) return "just arrived";
  const isUnderHour = waited < HOUR_MS;
  if (isUnderHour) return `waited ${Math.floor(waited / MINUTE_MS)}m`;
  const isUnderDay = waited < DAY_MS;
  if (isUnderDay) return `waited ${Math.floor(waited / HOUR_MS)}h`;
  return `waited ${Math.floor(waited / DAY_MS)}d`;
};
