import { differenceInCalendarDays } from "date-fns";
import { rewardChips } from "@/components/organisms/XpApp/appChips";
import type { AppChipSpec } from "@/components/organisms/XpApp/appChips";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { QuestRewards } from "@/lib/databases/QuestLogDb";
import { creditLine } from "@/lib/services/creations/creations";
import { scheduleLabel } from "@/lib/services/quests/QuestLabels";
import type { QuestListRow, QuestListStatus } from "@/lib/services/quests/QuestList";
import { questBeastId } from "@/lib/services/temples/questRooms";
import { libraryEntryOf } from "@/lib/services/temples/templeQuestRows";
import { formatQuestName } from "@/lib/utils/format";

/**
 * What the Quest Log app (MyQuests, on the phone apps kit) shows for a quest row. Pure: no storage, no Vue.
 *
 * The Board groups the rows by when they are due (Overdue, Today, This week, Later, then what is already Done);
 * the List keeps them flat in the order `questListFor` sorted them. Both draw the same row: a leading tile (the
 * quest's beast, else its picture, else an icon for its status), a title, a one-line subtitle (steps, schedule,
 * due time), reward chips and a trailing state.
 */

export type QuestWindow = "overdue" | "today" | "week" | "later" | "done";

export const WINDOW_ORDER: readonly QuestWindow[] = ["overdue", "today", "week", "later", "done"];

export const WINDOW_LABELS: Record<QuestWindow, string> = {
  overdue: "Overdue",
  today: "Today",
  week: "This week",
  later: "Later",
  done: "Done",
};

/** Days ahead that still count as "this week" (today is day 0). */
const WEEK_DAYS = 7;

/** The fallback tile of a row with no beast and no picture, per status. */
export const STATUS_ICONS: Record<QuestListStatus, string> = {
  overdue: "alarm-exclamation",
  open: "scroll",
  later: "calendar-day",
  pending: "hourglass-half",
  done: "check-double",
};

const parseDate = (value?: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** The moment a row falls on: its due time, else the day a not-yet-started task begins, else now. */
const momentOf = (row: QuestListRow, now: Date): Date =>
  row.due ?? (row.status === "later" ? parseDate(row.quest.startsOn) : null) ?? now;

/** A quest already used up for its window: tamed, or claimed and waiting on the Game Master. */
const isUsedUp = (status: QuestListStatus): boolean => status === "pending" || status === "done";

/** The due window a row belongs to on the Board. */
export function windowOf(row: QuestListRow, now: Date): QuestWindow {
  const isOverdue = row.status === "overdue";
  if (isOverdue) return "overdue";
  if (isUsedUp(row.status)) return "done";
  const daysAhead = differenceInCalendarDays(momentOf(row, now), now);
  const isDueToday = daysAhead <= 0;
  if (isDueToday) return "today";
  return daysAhead < WEEK_DAYS ? "week" : "later";
}

export interface QuestWindowSection {
  key: QuestWindow;
  label: string;
  rows: QuestListRow[];
}

/** The Board's sections: the rows grouped by due window, empty windows left out, the coming days soonest first. */
export function sectionsByWindow(rows: readonly QuestListRow[], now: Date): QuestWindowSection[] {
  const buckets: Record<QuestWindow, QuestListRow[]> = { overdue: [], today: [], week: [], later: [], done: [] };
  for (const row of rows) buckets[windowOf(row, now)].push(row);
  const byMoment = (a: QuestListRow, b: QuestListRow) => momentOf(a, now).getTime() - momentOf(b, now).getTime();
  buckets.week.sort(byMoment);
  buckets.later.sort(byMoment);
  return WINDOW_ORDER.filter((key) => buckets[key].length).map((key) => ({
    key,
    label: WINDOW_LABELS[key],
    rows: buckets[key],
  }));
}

/** The row a link to one quest points at (a notification's tap), or null when that quest is not on the board. */
export function linkedQuestRow(rows: readonly QuestListRow[], questId: string | number | undefined): QuestListRow | null {
  const hasNoLink = questId === undefined || questId === "";
  if (hasNoLink) return null;
  return rows.find((row) => String(row.quest.id) === String(questId)) ?? null;
}

/** The board status of a quest: used-up quests are done, quests that are not due yet are notDue. */
export function boardStatusOf(status: QuestListStatus): "open" | "done" | "notDue" {
  if (isUsedUp(status)) return "done";
  return status === "later" ? "notDue" : "open";
}

/** "3 steps", "1 step", "" for a quest with no steps. */
export function stepsLabel(quest: Pick<Achievement, "subAchievementIds">): string {
  const steps = quest.subAchievementIds?.length ?? 0;
  if (!steps) return "";
  return `${steps} ${steps === 1 ? "step" : "steps"}`;
}

/** When the row is due, in words: "due 6:00pm", "due Tomorrow 6:00pm"; empty when it has no time or is already used up. */
export function dueText(row: QuestListRow): string {
  if (isUsedUp(row.status)) return "";
  const isOpenAnytime = row.status === "open" && !row.due;
  if (isOpenAnytime) return "";

  return `due ${row.dueLabel}`;
}

/** The row's second line: steps, schedule (a one-off task says nothing) and the due time, on one line. */
export function subtitleOf(row: QuestListRow): string {
  const schedule = scheduleLabel(row.quest);
  const recurring = schedule === "One-time" ? "" : schedule;
  return [stepsLabel(row.quest), recurring, dueText(row)].filter(Boolean).join(" · ");
}

/** The word at the end of a row that cannot be finished from here: Locked, Sent back, Pending, Later, Tamed or "Done by Mia". */
export function stateLabelOf(row: QuestListRow): string {
  const isLocked = Boolean(row.lockedNotice);
  if (isLocked) return "Locked";
  const isSentBack = Boolean(row.sentBack) && (row.status === "open" || row.status === "overdue");
  if (isSentBack) return "Sent back";
  const labels: Partial<Record<QuestListStatus, string>> = { pending: "Pending", later: "Later", done: row.statusLabel };
  return labels[row.status] ?? "";
}

export interface BeastFace {
  /** The portrait number (NNN.webp) of the beast */
  avatar?: number;
  /** A picture the family uploaded for their own beast */
  picture?: string;
}

/** The quest's beast as the tile draws it: the family's own beast, else the library's. Empty for a quest with no beast. */
export function beastFaceOf(quest: Achievement, beasts: readonly Beast[]): BeastFace {
  const beastId = questBeastId(quest);
  if (!beastId) return {};
  const own = beasts.find((beast) => String(beast.id) === beastId);
  const shown = own ?? libraryEntryOf(beastId);
  return {
    avatar: shown?.avatar || undefined,
    picture: own?.localImage || own?.imageUrl || undefined,
  };
}

export interface QuestLogRow {
  id: string;
  title: string;
  subtitle: string;
  /** "Suggested by Jack" on a quest a hero suggested and a Game Master approved; absent on every other quest */
  credit?: string;
  /** The tile's picture: the beast's own picture, else its library portrait, else the quest's own; "" when the tile shows the icon */
  image: string;
  /** The tile's icon when there is no picture (a Font Awesome name) */
  icon: string;
  status: QuestListStatus;
  /** Trailing word of a row that cannot be finished from here ("" for an open one) */
  stateLabel: string;
  /** Tag chip for a quest that is not the hero's alone: "Mia", "Sam +1", "Anyone" */
  who: string;
  rewards: QuestRewards;
  requiresApproval: boolean;
  /** The chore asks for a photo */
  requiresPhoto: boolean;
  /** The chips under the subtitle: the rewards, "GM approves", then who else shares it */
  chips: AppChipSpec[];
  /** Any chip to draw under the subtitle */
  hasChips: boolean;
  /** Open or overdue: the List offers its Done button */
  canFinish: boolean;
  source: QuestListRow;
}

export interface QuestLogContext {
  /** The family's own beasts (the bestiary) */
  beasts: readonly Beast[];
  /** The hero's nick, to tell the quests that are theirs alone from the shared ones */
  heroNick: string;
  /** The URL of a portrait number, or null (the page's webpack require) */
  portraitUrl: (avatar?: number | null) => string | null;
  /** A hero's nick by id, "" for one the family does not know (for the credit line) */
  nickOf: (id: string) => string;
}

/** One quest list row as the Quest Log app draws it. */
export function toLogRow(row: QuestListRow, { beasts, heroNick, portraitUrl, nickOf }: QuestLogContext): QuestLogRow {
  const face = beastFaceOf(row.quest, beasts);
  // A kid's own picture of a beast wins over the library portrait it may also carry
  const image = face.picture || portraitUrl(face.avatar) || row.quest.localImage || row.quest.imageUrl || "";
  // A quest with a creator but no proposal came from a Game Master's wizard: only a hero's suggestion is credited
  const wasSuggested = Boolean(row.quest.proposal);
  const credit = wasSuggested ? creditLine(row.quest, "quest", nickOf) : "";
  const isHeroAlone = row.assigneeName === heroNick;
  const who = isHeroAlone ? "" : row.assigneeName;
  const chips = rewardChips(row.rewards);
  if (row.requiresApproval) chips.push({ kind: "tag", value: "GM approves" });
  if (row.requiresPhoto) chips.push({ kind: "tag", value: "Photo proof" });
  if (who) chips.push({ kind: "tag", value: who });
  return {
    id: row.id,
    title: formatQuestName(row.title),
    subtitle: subtitleOf(row),
    ...(credit ? { credit } : {}),
    image,
    icon: STATUS_ICONS[row.status],
    status: row.status,
    stateLabel: stateLabelOf(row),
    who,
    rewards: row.rewards,
    requiresApproval: row.requiresApproval,
    requiresPhoto: row.requiresPhoto,
    chips,
    hasChips: chips.length > 0,
    canFinish: (row.status === "open" || row.status === "overdue") && !row.lockedNotice,
    source: row,
  };
}
