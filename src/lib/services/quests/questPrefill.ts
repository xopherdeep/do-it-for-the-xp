import { format } from "date-fns";
import type { Achievement } from "@/lib/databases/AchievementDb";
import { TIMES_OF_DAY } from "@/lib/engine/quests/QuestSchedule";
import type { TimeOfDay } from "@/lib/engine/quests/QuestSchedule";

/**
 * A new quest started from the Calendar (the Game Master's "Add New Quest"): the day on screen, the part of the day
 * the tab is on and the hero whose calendar it is travel on the quest form's address as three query keys, and the
 * form fills those fields in. Pure: no router, no storage, no Vue.
 *
 *   ?day=2026-10-14&time=evening&hero=hero-1
 */
export interface QuestPrefillQuery {
  /** Local calendar day, YYYY-MM-DD */
  day?: string;
  /** morning | noon | evening | night */
  time?: string;
  /** The hero's profile id */
  hero?: string;
}

/**
 * The fields of a new quest a prefill may set. Everything else stays the form's default. `beastId` is the family beast
 * a maker just drew ("Make a quest with it"): the Quest Wizard opens on it instead of asking for a chore.
 */
export type QuestPrefill = Partial<Pick<Achievement, "startsOn" | "timesOfDay" | "assignee" | "type">> & { beastId?: string };

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/** The query a Calendar on `day` puts on the form's address. "all" tabs carry no time of day. */
export function prefillQueryFor(day: Date, segment: "all" | TimeOfDay, heroId: string): Record<string, string> {
  const query: Record<string, string> = { day: format(day, "yyyy-MM-dd") };
  const hasTimeOfDay = segment !== "all";
  if (hasTimeOfDay) query.time = segment;
  if (heroId) query.hero = heroId;
  return query;
}

/** A query value as vue-router hands it over: a string, a list of them, or nothing. First string wins. */
const textOf = (value: unknown): string => {
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" ? first.trim() : "";
};

/** The local midnight of a YYYY-MM-DD day, or null for text that is not a real day (2026-02-30, "tomorrow"). */
export function parseDayKey(text: string): Date | null {
  const match = DAY_PATTERN.exec(text);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  const isRealDay = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return isRealDay ? date : null;
}

/**
 * The fields a quest form asks for in its address. What cannot be read is ignored, so a mistyped or old link opens a
 * plain new quest. The day starts the quest (a one-time quest is due on its start day); the time puts it under that
 * part of the day; the hero is the party.
 */
export function questPrefill(query: Record<string, unknown> | undefined): QuestPrefill {
  const prefill: QuestPrefill = {};
  const day = parseDayKey(textOf(query?.day));
  if (day) prefill.startsOn = day.toISOString();
  const time = textOf(query?.time);
  const isTimeOfDay = (TIMES_OF_DAY as string[]).includes(time);
  if (isTimeOfDay) prefill.timesOfDay = [time as TimeOfDay];
  const hero = textOf(query?.hero);
  if (hero) {
    prefill.assignee = [hero];
    prefill.type = "individual";
  }
  return prefill;
}
