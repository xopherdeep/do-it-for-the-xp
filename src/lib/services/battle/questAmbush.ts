/**
 * Quest ambushes (docs/Quest-Rooms-Spec.md 5.9): when a random encounter springs, a chore that is overdue
 * sends its own beast instead of a free one. This module only decides which quest that is, and what the OS
 * alert says about it. No storage, no Vue, nothing throws.
 *
 * An overdue quest is the board's one due-date rule (QuestSchedule.isQuestOverdue: a window's last day, the Extra
 * Time Power's extension, a pause only old saves carry from Chronos' Clock). A quest with no due time is an
 * "anytime" chore: it is always waiting, and ambushes after any overdue one. A quest with no beast never ambushes,
 * because the Game Master chose "No beast" or the library has none to suggest.
 *
 * A hero with no anytime quest that has a beast (and nothing late) only ever meets free fights, which pay AP only. The
 * last section answers that for the Game Master's quest form: who is in that spot, and the line that tells them.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import {
  dueTimeOn,
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
 * (a tie goes to the quest listed first). A day off ambushes nothing (only old saves carry one: Gale's Wind wrote it).
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
    const isNotAmbushing = !beastId || !isWaiting;
    if (isNotAmbushing) continue;

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

// ---------------------------------------------------------------------------------------------------------------------
// Heroes who only meet free fights (the Game Master's quest form)
// ---------------------------------------------------------------------------------------------------------------------

/** What these checks read off a quest: any Achievement fits, and so does the quest the form is editing. */
export type AmbushQuest = Pick<
  Achievement,
  "id" | "dueByTime" | "type" | "assignee" | "beastId" | "achievementName" | "noBeast" | "draft"
>;

/** Any day will do: whether a quest has a due time does not depend on the day. */
const ANY_DAY = new Date(0);

/** True for a quest with no due time (or one that cannot be read): never late, always waiting, as pickQuestAmbush reads it. */
export const isAnytimeQuest = (quest: Pick<Achievement, "dueByTime">): boolean => dueTimeOn(quest.dueByTime, ANY_DAY) === null;

/** QuestEngine.isVisibleToUser: an Open Bounty is open to every hero, any other quest to the heroes it names. */
const isVisibleTo = (quest: AmbushQuest, heroId: string): boolean =>
  quest.type === "asNeeded" || (quest.assignee ?? []).includes(heroId);

/** A live quest (heroes never see a draft) that sends a beast when it ambushes. */
const sendsBeast = (quest: AmbushQuest): boolean => !quest.draft && Boolean(questBeastId(quest));

/**
 * True when some live quest with a beast can ambush the hero for real: an anytime one, which is always waiting, or a
 * timed one, which sends its beast once it is late. False means every encounter of theirs is a free fight.
 */
export const canAmbushForReal = (quests: readonly AmbushQuest[], heroId: string): boolean =>
  quests.some((quest) => sendsBeast(quest) && isVisibleTo(quest, heroId));

/**
 * Of `heroIds`, those with no anytime quest that has a beast: unless a timed chore runs late, their ambushes are free
 * fights (AP only). Each hero once, in the order given.
 */
export const heroesWithoutAnytimeBeast = (quests: readonly AmbushQuest[], heroIds: readonly string[]): string[] => {
  const waiting = quests.filter((quest) => sendsBeast(quest) && isAnytimeQuest(quest));
  const isCovered = (heroId: string) => waiting.some((quest) => isVisibleTo(quest, heroId));
  return heroIds.filter((heroId, index) => heroIds.indexOf(heroId) === index && !isCovered(heroId));
};

/**
 * The heroes `draft` names who would only meet free fights once it is saved as it stands in the form. The form's quest
 * replaces its own saved copy in `others` and counts as live even while it is still a draft. An Open Bounty names no
 * hero, so it names none here.
 */
export const freeFightHeroes = (draft: AmbushQuest, others: readonly AmbushQuest[]): string[] => {
  if (draft.type === "asNeeded") return [];
  const family = [...others.filter((quest) => quest.id !== draft.id), { ...draft, draft: false }];
  return heroesWithoutAnytimeBeast(family, draft.assignee ?? []);
};

/** "Mia", "Mia and Sam", "Mia, Sam and Joe". */
const namesList = (names: readonly string[]): string =>
  names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

/** The one hint line under the quest's due time for these heroes; empty for none. */
export function freeFightHint(names: readonly string[]): string {
  if (names.length === 0) return "";
  const verb = names.length === 1 ? "has" : "have";
  return (
    `${namesList(names)} ${verb} no anytime quest with a beast, so their ambushes are free fights (AP only) ` +
    "unless a chore runs late. Make this one anytime, with a beast, to send them real fights."
  );
}
