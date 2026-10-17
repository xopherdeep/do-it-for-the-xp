/**
 * The once-a-week "This week in the village" notification, the pure part.
 *
 * It tells about the last WHOLE calendar week (Monday to Sunday unless told otherwise), so the first time a hero opens
 * the app in a new week the feed holds the week that just ended. One per week: the feed is checked for the week's
 * `refId` (the store's own dedupe is per day, which would let it repeat). A week nobody did a chore in stays silent:
 * there is nothing to be proud of yet, and a recap that shames is worse than none. Pure: the watch that feeds it and
 * pushes the result is `services/notifications/weeklyRecapWatch.ts`.
 */
import type { NewXpNotification, XpNotification } from "@/lib/services/notifications/Notifications";
import { weeklyRecap } from "./weeklyRecap";
import type { RecapEntry, RecapHeroRef, RecapLevelUp, WeeklyRecap } from "./weeklyRecap";

/** The recap's address for a hero (the Game Master reads the whole family on it too) */
export const recapLink = (heroId: string): string => `/my-recap/${encodeURIComponent(heroId)}/`;

/** What the notification is about, one per week */
export const recapRefId = (weekFrom: string): string => `week-${weekFrom}`;

/** The notification for `heroId` out of a finished week's recap, or null when there is nothing to celebrate */
export const weeklyRecapNotification = (recap: WeeklyRecap, heroId: string): NewXpNotification | null => {
  if (recap.isEmpty) return null;
  const mine = recap.heroes.find((hero) => hero.heroId === String(heroId));
  const hasOwnChores = Boolean(mine) && mine!.chores > 0;
  const body = hasOwnChores
    ? `You finished ${mine!.chores} ${mine!.chores === 1 ? "chore" : "chores"} and earned ${mine!.xp} XP. ${recap.lines[0]}`
    : recap.lines[0];
  return {
    heroId: String(heroId),
    kind: "weekly-recap",
    refId: recapRefId(recap.from),
    title: "This week in the village",
    body,
    link: recapLink(heroId),
  };
};

export interface WeeklyRecapNoticeInput {
  entries: ReadonlyArray<RecapEntry | null | undefined>;
  heroes: readonly RecapHeroRef[];
  heroId: string;
  /** The hero's feed as it is now, to keep it to one a week */
  feed: readonly XpNotification[];
  now: Date;
  weekStartsOn?: number;
  levelUps?: readonly RecapLevelUp[];
}

/** The week's notification if the hero's feed does not hold it yet, else null */
export const pickWeeklyRecapNotice = (input: WeeklyRecapNoticeInput): NewXpNotification | null => {
  const recap = weeklyRecap(input.entries, input.heroes, input.now, {
    span: "previous",
    weekStartsOn: input.weekStartsOn,
    levelUps: input.levelUps,
  });
  const refId = recapRefId(recap.from);
  const isAlreadyTold = input.feed.some((entry) => entry.kind === "weekly-recap" && entry.refId === refId);
  if (isAlreadyTold) return null;
  return weeklyRecapNotification(recap, input.heroId);
};
