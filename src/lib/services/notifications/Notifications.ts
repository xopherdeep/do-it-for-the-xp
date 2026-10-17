import { format } from "date-fns";
import { POINT_ICONS } from "@/constants/POINT_ICONS";

/**
 * The hero's notification feed, the pure part: what a notification is, how two are told apart
 * (dedupe), the "due in 2 h" copy and the order the modal shows them in. The Pinia store
 * (`src/lib/store/stores/notifications.ts`) keeps and persists them; the producers
 * (`questWatch.ts`, the user store's level-ups, the Approvals screen, the shop) build them here.
 */

export type XpNotificationKind =
  | "quest-due"
  | "quest-overdue"
  | "approved"
  | "rejected"
  | "level-up"
  | "blood-moon"
  | "purchase"
  | "power-cast"
  | "hospital"
  | "gold"
  | "weekly-recap"
  | "system";

export interface XpNotification {
  id: string;
  /** The hero the notification belongs to (a profile id) */
  heroId: string;
  kind: XpNotificationKind;
  title: string;
  body: string;
  /** ISO timestamp */
  createdAt: string;
  /** ISO timestamp, set once the hero has seen it */
  readAt?: string;
  /** A router path the row follows when tapped */
  link?: string;
  /**
   * What the notification is about (a quest id, a quest log entry id, a temple id, "level-7").
   * With `kind` and the day it was made, it is the dedupe key: one quest-due per quest per day.
   */
  refId?: string;
}

export type NewXpNotification = Pick<XpNotification, "heroId" | "kind" | "title" | "body"> &
  Partial<Pick<XpNotification, "id" | "createdAt" | "link" | "refId">>;

/** Keep at most this many notifications per hero; the oldest fall off the end. */
export const MAX_NOTIFICATIONS_PER_HERO = 200;

/** The calendar day of a notification, the granularity dedupe works at. */
export const dayOf = (at: Date | string): string => format(new Date(at), "yyyy-MM-dd");

/** The dedupe key: kind + what it is about + the day it was made. */
export const dedupeKeyOf = (kind: XpNotificationKind, refId: string | undefined, at: Date | string): string =>
  `${kind}:${refId ?? ""}:${dayOf(at)}`;

export const dedupeKeyOfNotification = (notification: XpNotification): string =>
  dedupeKeyOf(notification.kind, notification.refId, notification.createdAt);

/**
 * True when `existing` already holds a notification with the same kind, refId and day as `candidate`.
 * Notifications without a refId are never duplicates of each other (a second system note is a second note).
 */
export const isDuplicate = (candidate: NewXpNotification, existing: readonly XpNotification[]): boolean => {
  const hasNoRef = !candidate.refId;
  if (hasNoRef) return false;
  const key = dedupeKeyOf(candidate.kind, candidate.refId, candidate.createdAt ?? new Date());
  return existing.some((entry) => entry.heroId === candidate.heroId && dedupeKeyOfNotification(entry) === key);
};

let counter = 0;
/** A unique id without a dependency: time + a counter + a little noise. */
export const newNotificationId = (now: Date = new Date()): string => {
  counter = (counter + 1) % 100000;
  return `ntf-${now.getTime().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
};

/** A complete notification from the fields a producer knows. */
export const makeNotification = (input: NewXpNotification, now: Date = new Date()): XpNotification => ({
  id: input.id ?? newNotificationId(now),
  heroId: String(input.heroId),
  kind: input.kind,
  title: input.title,
  body: input.body,
  createdAt: input.createdAt ?? now.toISOString(),
  ...(input.link ? { link: input.link } : {}),
  ...(input.refId ? { refId: String(input.refId) } : {}),
});

/** Newest first; ties keep their order. */
export const sortNewestFirst = (notifications: readonly XpNotification[]): XpNotification[] =>
  [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

export const isUnread = (notification: XpNotification): boolean => !notification.readAt;

export const unreadCountOf = (notifications: readonly XpNotification[]): number =>
  notifications.filter(isUnread).length;

/**
 * "due in 2 h", "due in 45 min", "due now", "1 h overdue". Hours are rounded to the nearest half hour
 * read as "1 h 30 min"; under an hour it is minutes; within a minute it is "due now".
 */
export const dueInCopy = (deadline: Date, now: Date): string => {
  const diffMs = deadline.getTime() - now.getTime();
  const late = diffMs < 0;
  const minutes = Math.round(Math.abs(diffMs) / 60000);
  const isDueNow = minutes < 1;
  if (isDueNow) return "due now";
  const span = spanCopy(minutes);
  return late ? `${span} overdue` : `due in ${span}`;
};

const spanCopy = (minutes: number): string => {
  const isUnderAnHour = minutes < 60;
  if (isUnderAnHour) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
};

/** The clock a deadline falls at, for the body copy: "by 5:30pm". */
export const byClockCopy = (deadline: Date): string => `by ${format(deadline, "h:mma").toLowerCase()}`;

/** When the row shows it was made: today's rows only carry the clock, older ones the date too. */
export const whenCopy = (createdAt: string, now: Date = new Date()): string => {
  const at = new Date(createdAt);
  return dayOf(at) === dayOf(now) ? format(at, "h:mm a") : format(at, "MMM d, h:mm a");
};

/** The Font Awesome duotone icon of each kind, for the RPG rows. */
export const iconOfKind = (kind: XpNotificationKind): string => {
  switch (kind) {
    case "quest-due":
      return "fa-hourglass-half";
    case "quest-overdue":
      return "fa-alarm-exclamation";
    case "approved":
      return "fa-check-double";
    case "rejected":
      return "fa-times-octagon";
    case "level-up":
      return "fa-arrow-alt-circle-up";
    case "blood-moon":
      return "fa-moon";
    case "purchase":
      return "fa-shopping-bag";
    case "power-cast":
      return POINT_ICONS.ap.icon;
    case "hospital":
      return "fa-hospital";
    case "gold":
      return "fa-coins";
    case "weekly-recap":
      return "fa-scroll-old";
    default:
      return "fa-bell";
  }
};

/** The hero's quest page, where quest notifications lead. */
export const questBoardLink = (heroId: string, questId?: string): string =>
  questId ? `/my-tasks/${heroId}/task/${questId}/` : `/my-tasks/${heroId}/`;

// ---------------------------------------------------------------------------
// Ready-made notifications: the producers call these so the copy lives in one place.
// ---------------------------------------------------------------------------

export const questDueNotification = (
  heroId: string,
  quest: { id: string | number; achievementName: string },
  deadline: Date,
  now: Date
): NewXpNotification => ({
  heroId,
  kind: "quest-due",
  refId: String(quest.id),
  title: quest.achievementName,
  body: `${capitalize(dueInCopy(deadline, now))}, ${byClockCopy(deadline)}.`,
  link: questBoardLink(heroId, String(quest.id)),
  createdAt: now.toISOString(),
});

export const questOverdueNotification = (
  heroId: string,
  quest: { id: string | number; achievementName: string },
  deadline: Date | null,
  now: Date
): NewXpNotification => ({
  heroId,
  kind: "quest-overdue",
  refId: String(quest.id),
  title: quest.achievementName,
  body: deadline ? `Overdue: it was due ${byClockCopy(deadline)}.` : "Overdue.",
  link: questBoardLink(heroId, String(quest.id)),
  createdAt: now.toISOString(),
});

export const approvedNotification = (
  heroId: string,
  entry: { id: string; questId: string; questName: string },
  rewardLine: string
): NewXpNotification => ({
  heroId,
  kind: "approved",
  refId: entry.id,
  title: "Quest approved!",
  body: rewardLine ? `"${entry.questName}" earned you ${rewardLine}.` : `"${entry.questName}" was approved.`,
  link: questBoardLink(heroId),
});

export const rejectedNotification = (
  heroId: string,
  entry: { id: string; questId: string; questName: string },
  note?: string
): NewXpNotification => ({
  heroId,
  kind: "rejected",
  refId: entry.id,
  title: "Quest sent back",
  body: note ? `"${entry.questName}" was not approved: ${note}` : `"${entry.questName}" was not approved. It is open again.`,
  link: questBoardLink(heroId, entry.questId),
});

export const levelUpNotification = (heroId: string, newLevel: number, levelsGained = 1): NewXpNotification => ({
  heroId,
  kind: "level-up",
  refId: `level-${newLevel}`,
  title: `Level ${newLevel}!`,
  body:
    levelsGained > 1
      ? `You climbed ${levelsGained} levels. HP and MP are full again.`
      : "You grew stronger. HP and MP are full again.",
});

/**
 * The blood moon reset a temple. The temple engine (TempleSystem) calls
 * `useNotificationsStore().push(bloodMoonNotification(heroId, temple))` when it resets one;
 * this helper only builds the notification.
 */
export const bloodMoonNotification = (
  heroId: string,
  temple: { id: string; name: string },
  night: Date = new Date()
): NewXpNotification => ({
  heroId,
  kind: "blood-moon",
  refId: temple.id,
  title: "Blood moon",
  body: `The blood moon rose over ${temple.name}. Its doors, chests and guardians have returned.`,
  createdAt: night.toISOString(),
});

/** A shop purchase the GM settled: delivered or refunded. */
interface SettledPurchase {
  id: string;
  itemName: string;
  price: number;
  status: "fulfilled" | "refunded";
}

export const purchaseNotification = (
  heroId: string,
  entry: SettledPurchase
): NewXpNotification => ({
  heroId,
  kind: "purchase",
  refId: entry.id,
  title: entry.status === "fulfilled" ? "Delivered!" : "Refunded",
  body:
    entry.status === "fulfilled"
      ? `"${entry.itemName}" is yours.`
      : `"${entry.itemName}" was refunded: ${entry.price} GP is back in your wallet.`,
  link: `/my-gold-points/${heroId}/`,
});

const capitalize = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
