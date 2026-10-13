/**
 * Quest ambushes (docs/Quest-Rooms-Spec.md 5.9): when a random encounter springs, a chore that is overdue
 * sends its own beast instead of a free one. This module only decides which quest that is, and what the OS
 * alert says about it. No storage, no Vue, nothing throws.
 *
 * An overdue quest is the board's one due-date rule (QuestSchedule.isQuestOverdue: a window's last day, the Ice
 * Wand's extension, Chronos' pause). A quest with no due time is an "anytime" chore: it is always waiting, and
 * ambushes after any overdue one. A quest with no beast never ambushes, because the Game Master chose
 * "No beast" or the library has none to suggest.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import {
  effectiveDeadline,
  isDayOff,
  isQuestOverdue,
  type HeroQuestEffects,
} from "@/lib/engine/quests/QuestSchedule";
import { clampMarks, isPlainRecord, type QuestGrudge, type QuestGrudges } from "@/lib/services/battle/questGrudge";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { CLASSIC_BEASTS } from "@/lib/services/core/classicBeasts";
import { questBeastId } from "@/lib/services/temples/questRooms";

/** How long a quest leaves a hero alone after it has ambushed them. Tunable. */
export const QUEST_AMBUSH_COOLDOWN_MS = 60 * 60 * 1000;

/**
 * What the ambush rule reads about one quest: the one field of a `questGrudges` entry (spec 5.7) it needs.
 * The record handed in is the hero's own, keyed by quest id, so a grudge entry with more fields fits as it is.
 */
export interface AmbushMemory {
  /** When this quest last ambushed the hero: epoch milliseconds or an ISO string */
  lastAmbushAt?: number | string | null;
}

export type AmbushMemories = Readonly<Record<string, AmbushMemory | undefined>>;

/** The quest that wins an encounter, the beast it sends and the deadline it missed. */
export interface QuestAmbush {
  quest: Achievement;
  beastId: string;
  deadline: Date;
}

/** An epoch-millisecond stamp from a number or an ISO string; null for anything unreadable. */
const stampOf = (value: unknown): number | null => {
  const isNumber = typeof value === "number";
  if (isNumber) return Number.isFinite(value) ? value : null;
  const isIsoText = typeof value === "string";
  if (!isIsoText) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
};

/** True while `at` is less than `cooldownMs` behind `now`. A stamp from the future (a clock set back) is stale. */
const isWithinCooldown = (at: number, now: number, cooldownMs: number): boolean => {
  const age = now - at;
  return age >= 0 && age < cooldownMs;
};

const isCoolingDown = (memory: AmbushMemory | undefined, now: number, cooldownMs: number): boolean => {
  const at = stampOf(memory?.lastAmbushAt);
  return at !== null && isWithinCooldown(at, now, cooldownMs);
};

/**
 * The quest whose beast takes this encounter, or null when the encounter stays a free fight. `board` is the
 * hero's own board (it already holds only the quests they can see), `grudges` their per-quest record of when
 * each quest last ambushed them. A quest qualifies when it is open, not waiting on the Game Master, overdue
 * at `now`, has a beast, and has not ambushed this hero within `cooldownMs`. The oldest deadline goes first
 * (a tie goes to the quest listed first). Gale's Wind (a day off) ambushes nothing.
 */
export function pickQuestAmbush(
  board: readonly QuestBoardItem[],
  effects: HeroQuestEffects | undefined,
  grudges: AmbushMemories,
  now: Date,
  cooldownMs: number = QUEST_AMBUSH_COOLDOWN_MS
): QuestAmbush | null {
  if (isDayOff(effects, now)) return null;
  const nowMs = now.getTime();

  let best: QuestAmbush | null = null;
  for (const { quest, status, pending } of board) {
    const isSettled = status !== "open" || pending || quest.draft;
    if (isSettled) continue;
    if (isCoolingDown(grudges?.[String(quest.id)], nowMs, cooldownMs)) continue;

    const beastId = questBeastId(quest);
    const missedDeadline = effectiveDeadline(quest, effects, now);
    const isAnytime = !missedDeadline;
    const isLate = isQuestOverdue(quest, effects, now);
    const isWaiting = isAnytime || isLate;
    if (!beastId || !isWaiting) continue;

    const deadline = missedDeadline ?? now;
    const isOlderThanBest = !best || deadline.getTime() < best.deadline.getTime();
    if (isOlderThanBest) best = { quest, beastId, deadline };
  }
  return best;
}

/**
 * The hero's grudge record (spec 5.7) after `questId` ambushed them at `nowMs`: that quest's `lastAmbushAt` is stamped and
 * the marks it holds stay. Entries that are done with (no marks, and a cooldown that is over) are dropped, so the record
 * never grows past the quests that hold a grudge or rest now; entries it cannot read go too. Returns a new record.
 */
export function withAmbushStamped(
  grudges: unknown,
  questId: string,
  nowMs: number,
  cooldownMs: number = QUEST_AMBUSH_COOLDOWN_MS
): QuestGrudges {
  const previous = isPlainRecord(grudges) ? grudges : {};
  const next: QuestGrudges = {};
  for (const [id, entry] of Object.entries(previous)) {
    const grudge = id === questId ? null : asGrudge(entry);
    if (!grudge) continue;
    const stamp = stampOf(grudge.lastAmbushAt);
    const isResting = stamp !== null && isWithinCooldown(stamp, nowMs, cooldownMs);
    const isDoneWith = clampMarks(grudge.marks) === 0 && !isResting;
    if (!isDoneWith) next[id] = grudge;
  }
  const held = asGrudge(previous[questId]);
  next[questId] = { ...held, marks: clampMarks(held?.marks), lastAmbushAt: nowMs };
  return next;
}

/** A grudge entry from whatever the profile holds, or null for anything that is not an object. */
const asGrudge = (value: unknown): QuestGrudge | null => (isPlainRecord(value) ? (value as unknown as QuestGrudge) : null);

/** "Classic Beast 012": a name still waiting to be replaced says nothing about the beast. */
const PLACEHOLDER_NAME = /^Classic Beast \d+$/;

let libraryNames: ReadonlyMap<string, string> | null = null;

/** The library's name for a beast id (a chore beast, or a classic beast the family has named), else undefined. */
export function libraryBeastName(beastId: string): string | undefined {
  libraryNames ??= new Map(
    [...BEAST_LIBRARY, ...CLASSIC_BEASTS]
      .filter((beast) => !PLACEHOLDER_NAME.test(beast.name))
      .map((beast) => [String(beast.id), beast.name] as const)
  );
  return libraryNames.get(String(beastId));
}

/** "The Dish Goblin" for "Dish Goblin" (a name that already starts with The is left alone), "A beast" for none. */
const beastWithArticle = (beast: string | undefined): string => {
  if (!beast) return "A beast";
  return /^the\s/i.test(beast) ? beast : `The ${beast}`;
};

/**
 * The OS alert for an ambush the hero is away from. With the beast and the chore named it says which one is
 * waiting; with neither it is the plain "a beast" alert a free encounter rings.
 */
export function ambushAlertCopy(names: { beastName?: string; questName?: string }): { title: string; body: string } {
  const beast = names.beastName?.trim();
  const quest = names.questName?.trim();
  return {
    title: `⚔️ ${beastWithArticle(beast)} blocks your path!`,
    body: quest ? `${quest} is waiting. Come back and fight!` : "Come back and fight!",
  };
}
