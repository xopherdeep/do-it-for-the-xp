/**
 * Wake quests (docs/Quest-Rooms-Spec.md section 9, "Temple Quests tab"): a shipped temple's quest rooms hold quest
 * templates that sleep until the family has a quest for their beast. The Game Master picks heroes and ticks the dormant
 * templates, and the quests the templates describe are made: `tq-<templeId>-<slug>`, a Solo Mission for the picked
 * heroes, starting this Monday, paid by difficulty, with the library's beast adopted into the bestiary.
 *
 * A beast that already has a live family quest is not given a second one: it is skipped and listed as "uses your
 * quest". A record that already has the quest's id is never written over. Everything here is pure except
 * `commitWake`, which writes only through the two writers it is handed (the normal DBs, which merge by id).
 */
import { startOfWeek } from "date-fns";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { RoomQuestTemplate } from "@/lib/engine/core/dungeons/types";
import { adoptLibraryBeast, isClassicBeast } from "@/lib/services/bestiary/librarySuggest";
import { scheduleLabel } from "@/lib/services/quests/QuestLabels";
import { questBeastId, questTier, type QuestTier } from "@/lib/services/temples/questRooms";
import {
  gmResolution,
  libraryEntryOf,
  questRoomCells,
  type QuestLayout,
  type QuestRoomCell,
} from "@/lib/services/temples/templeQuestRows";

/** The prefix of every quest a temple wakes. */
const WAKE_PREFIX = "tq";

/** The beast's part of a woken quest's id: "beast-dish-goblin" is "dish-goblin". It names a template whichever layout holds it. */
export const wakeSlugOf = (beastId: string): string => beastId.replace(/^beast-/, "");

/** The id of the quest a temple's template wakes: `tq-shadow-temple-dish-goblin`. */
export const wakeQuestId = (templeId: string, beastId: string): string => `${WAKE_PREFIX}-${templeId}-${wakeSlugOf(beastId)}`;

/** True for a quest a temple woke: its id is `tq-<templeId>-<slug>` (wakeQuestId), whichever temple woke it. */
export const isWokenQuest = (quest: Pick<Achievement, "id">): boolean => String(quest.id ?? "").startsWith(`${WAKE_PREFIX}-`);

/** This week's Monday at midnight (local time): the day woken quests start, so weekly windows begin on a Monday. */
export const mondayOf = (now: Date): Date => startOfWeek(now, { weekStartsOn: 1 });

/** "made-up" -> "Made Up", for a beast nobody named a chore for. */
const titleCase = (slug: string): string =>
  slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

/** What the woken quest is called: the library's chore for the beast, else the beast's name, else its id spelled out. */
const choreOf = (beastId: string, beasts: readonly Beast[]): string => {
  const entry = libraryEntryOf(beastId);
  const hasLibraryChore = entry !== undefined && !isClassicBeast(entry);
  if (hasLibraryChore) return entry.chore;
  const owned = beasts.find((beast) => String(beast.id) === beastId);
  return owned?.name ?? titleCase(beastId.replace(/^beast-/, ""));
};

/** The name the Game Master knows a beast by: the family's own, else the library's, else a stand-in. */
const beastNameOf = (beastId: string, beasts: readonly Beast[]): string =>
  beasts.find((beast) => String(beast.id) === beastId)?.name ?? libraryEntryOf(beastId)?.name ?? "a beast";

/**
 * The quest a template describes, for the heroes picked. The form's rules pay it (xp 100x, gp 10x, ap 1x the
 * difficulty); the fields a template does not set stay unset, so the strike clock falls back to the difficulty's
 * default and the quest has no due time of its own.
 */
export function questFromTemplate(
  templeId: string,
  template: RoomQuestTemplate,
  heroIds: readonly string[],
  name: string,
  now: Date
): Achievement {
  const difficulty = Number(template.difficulty) || 1;
  const isCustom = template.basicSchedule === "custom";
  const hasTimesOfDay = Boolean(template.timesOfDay?.length);
  const hasEstimate = Number(template.estimatedMinutes) > 0;
  return {
    id: wakeQuestId(templeId, String(template.beastId)),
    achievementName: name,
    categoryId: "",
    beastId: String(template.beastId),
    subAchievementIds: [],
    requiresApproval: false,
    bonusAchievement: false,
    type: "individual",
    assignee: [...heroIds],
    startsOn: mondayOf(now).toISOString(),
    endsOn: "",
    dueByTime: template.dueByTime ?? "",
    ...(hasTimesOfDay ? { timesOfDay: [...(template.timesOfDay ?? [])] } : {}),
    basicSchedule: template.basicSchedule,
    scheduleType: isCustom ? "custom" : "basic",
    showDailyUntilComplete: template.basicSchedule === "daily",
    customFrequency: 1,
    customPeriodType: template.customPeriodType ?? "day",
    customPeriodNumber: 1,
    repeatOnDays: [...(template.repeatOnDays ?? [])],
    difficulty,
    ...(hasEstimate ? { estimatedMinutes: Number(template.estimatedMinutes) } : {}),
    xp: difficulty * 100,
    gp: difficulty * 10,
    ap: difficulty,
    adventureType: "beast",
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// What the sheet offers
// ---------------------------------------------------------------------------------------------------------------------

/** One template of the temple as the Wake quests sheet lists it. */
export interface WakeChoice {
  beastId: string;
  template: RoomQuestTemplate;
  /** The family's name for the beast, else the library's */
  beastName: string;
  /** The portrait number (NNN.webp), when the beast has one */
  avatar?: number;
  /** What the quest will be called: the beast's chore */
  questName: string;
  /** How many rooms of the temple hold this template */
  rooms: number;
  tier: QuestTier;
  difficulty: number;
  /** "Daily", "Weekly on Mon, Tue" */
  schedule: string;
  /** The live family quest that already fills the room(s): "uses your quest", not tickable. None means it sleeps. */
  quest?: Achievement;
}

const TIER_ORDER: readonly QuestTier[] = ["boss", "miniboss", "monster"];

/**
 * The templates of a temple's quest rooms, each beast once however many rooms hold it, boss rooms first. A room whose
 * Game Master's pick is a live quest has nothing to wake and is left out. A template a live quest fills carries that
 * quest; the others sleep.
 */
export function wakeChoices(
  layout: QuestLayout | null | undefined,
  quests: readonly Achievement[],
  beasts: readonly Beast[]
): WakeChoice[] {
  const byBeast = new Map<string, WakeChoice>();
  for (const cell of questRoomCells(layout)) {
    const template = cell.room.content?.quest;
    if (!template) continue;
    const resolution = gmResolution(cell.room, quests);
    const isFilledByPick = resolution.kind === "quest" && resolution.source === "questId";
    if (isFilledByPick) continue;

    const beastId = String(template.beastId);
    const seen = byBeast.get(beastId);
    if (seen) {
      seen.rooms += 1;
      continue;
    }
    const entry = libraryEntryOf(beastId);
    const owned = beasts.find((beast) => String(beast.id) === beastId);
    const difficulty = Number(template.difficulty) || 0;
    byBeast.set(beastId, {
      beastId,
      template,
      beastName: beastNameOf(beastId, beasts),
      avatar: owned?.avatar || entry?.avatar || undefined,
      questName: choreOf(beastId, beasts),
      rooms: 1,
      tier: questTier(difficulty),
      difficulty,
      schedule: scheduleLabel({
        basicSchedule: template.basicSchedule,
        repeatOnDays: template.repeatOnDays,
        customPeriodType: template.customPeriodType,
      }),
      quest: resolution.kind === "quest" ? resolution.quest : undefined,
    });
  }
  return [...byBeast.values()].sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
}

/**
 * The quest rooms that may wake without the Game Master ticking them (Quick Start, a hero's first walk into a temple):
 * rooms built as monster rooms whose template is a monster's too (questTier of its difficulty). Miniboss and boss rooms
 * wait for the Game Master's Wake quests. In reading order, like questRoomCells.
 */
export function monsterTemplateCells(layout: QuestLayout | null | undefined): QuestRoomCell[] {
  return questRoomCells(layout).filter((cell) => {
    const template = cell.room.content?.quest;
    if (!template) return false;
    const isMonsterRoom = cell.tier === "monster";
    const isMonsterTemplate = questTier(Number(template.difficulty)) === "monster";
    return isMonsterRoom && isMonsterTemplate;
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// The plan
// ---------------------------------------------------------------------------------------------------------------------

export interface WakeInput {
  templeId: string;
  /** The templates the Game Master ticked */
  templates: readonly RoomQuestTemplate[];
  /** The heroes the woken quests are assigned to */
  heroIds: readonly string[];
  /** Every quest record the family has, drafts too: a draft holds its id */
  quests: readonly Achievement[];
  /** The family's bestiary */
  beasts: readonly Beast[];
  now: Date;
}

export type WakeSkipReason = "usesQuest" | "idTaken";

/** A ticked template that was not woken, and why. */
export interface WakeSkip {
  beastId: string;
  beastName: string;
  reason: WakeSkipReason;
  /** The quest in the way: the live one that uses the beast, or the record that holds the id */
  quest: Achievement;
  /** One line for the result: 'Dish Goblin: uses your quest "Banish the Dish Goblin"' */
  line: string;
}

export interface WakePlan {
  /** The quests to create, in the order ticked */
  quests: Achievement[];
  /** The library beasts to adopt first, once each; none that the bestiary already has */
  beasts: Beast[];
  skipped: WakeSkip[];
  /** Why nothing can be woken yet; null when the plan is good to go */
  problem: string | null;
}

/** Why the sheet cannot wake anything yet, in words; null when it can. */
export function wakeProblem(heroIds: readonly string[], templates: readonly RoomQuestTemplate[]): string | null {
  const hasNoHeroes = !heroIds.length;
  if (hasNoHeroes) return "Pick at least one hero.";
  const hasNoTemplates = !templates.length;
  if (hasNoTemplates) return "Tick at least one quest to wake.";
  return null;
}

/** An existing quest is for everyone picked: an Open Bounty is for all, any other quest for its assignees. */
const isForAll = (quest: Achievement, heroIds: readonly string[]): boolean => {
  const isOpenBounty = quest.type === "asNeeded";
  if (isOpenBounty) return true;
  const assigned = (quest.assignee ?? []).map(String);
  return heroIds.every((id) => assigned.includes(String(id)));
};

const usesQuestLine = (name: string, quest: Achievement, heroIds: readonly string[]): string => {
  const base = `${name}: uses your quest "${quest.achievementName}"`;
  return isForAll(quest, heroIds) ? base : `${base} (not for everyone you picked: add them there)`;
};

const idTakenLine = (name: string, held: Achievement): string =>
  held.draft
    ? `${name}: a draft of it waits in the Compendium, left as it is`
    : `${name}: already woken, left as it is`;

/**
 * What waking the ticked templates does. A template is skipped when the family already has a live quest for its beast
 * ("uses your quest": a quest with no beast of its own counts through the library's suggestion, the rule a room finds
 * its quest by, and a quest planned a moment ago counts for the next room that asks for the same beast), or when a
 * record already holds the quest's id (it may have been edited since; it is never written over). Drafts are not live.
 */
export function planWake(input: WakeInput): WakePlan {
  const problem = wakeProblem(input.heroIds, input.templates);
  if (problem) return { quests: [], beasts: [], skipped: [], problem };

  const known: Achievement[] = [...input.quests];
  const quests: Achievement[] = [];
  const skipped: WakeSkip[] = [];
  const adopt = new Map<string, Beast>();
  const owned = new Set(input.beasts.map((beast) => String(beast.id)));

  for (const template of input.templates) {
    const beastId = String(template.beastId);
    const beastName = beastNameOf(beastId, input.beasts);
    const id = wakeQuestId(input.templeId, beastId);

    const filler = known.find((quest) => !quest.draft && questBeastId(quest) === beastId);
    if (filler) {
      skipped.push({ beastId, beastName, reason: "usesQuest", quest: filler, line: usesQuestLine(beastName, filler, input.heroIds) });
      continue;
    }
    const holder = known.find((quest) => String(quest.id) === id);
    if (holder) {
      skipped.push({ beastId, beastName, reason: "idTaken", quest: holder, line: idTakenLine(beastName, holder) });
      continue;
    }

    const made = questFromTemplate(input.templeId, template, input.heroIds, choreOf(beastId, input.beasts), input.now);
    quests.push(made);
    known.push(made);

    const entry = libraryEntryOf(beastId);
    const isMissing = entry && !owned.has(beastId) && !adopt.has(beastId);
    if (isMissing) adopt.set(beastId, adoptLibraryBeast(entry));
  }

  return { quests, beasts: [...adopt.values()], skipped, problem: null };
}

// ---------------------------------------------------------------------------------------------------------------------
// The writes
// ---------------------------------------------------------------------------------------------------------------------

/** The two places a wake writes. The screen hands over the normal DBs (AchievementDb.setTask, BestiaryDb.setBeast). */
export interface WakeWriters {
  saveBeast: (beast: Beast) => Promise<unknown>;
  saveQuest: (quest: Achievement) => Promise<unknown>;
}

export interface WakeDone {
  woken: Achievement[];
  adopted: Beast[];
}

/**
 * Writes a plan: the beasts first, so a fight can load them the moment its quest exists, then the quests. A plan with a
 * problem or nothing to make writes nothing. A write that fails stops the rest and throws: what was written stays,
 * and waking again skips it (the id is taken) and carries on with what is left.
 */
export async function commitWake(plan: WakePlan, writers: WakeWriters): Promise<WakeDone> {
  const done: WakeDone = { woken: [], adopted: [] };
  const hasProblem = Boolean(plan.problem);
  if (hasProblem) return done;
  for (const beast of plan.beasts) {
    await writers.saveBeast(beast);
    done.adopted.push(beast);
  }
  for (const quest of plan.quests) {
    await writers.saveQuest(quest);
    done.woken.push(quest);
  }
  return done;
}
