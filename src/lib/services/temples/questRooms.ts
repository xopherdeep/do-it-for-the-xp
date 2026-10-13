/**
 * Quest rooms, the pure rules (docs/Quest-Rooms-Spec.md sections 5.1-5.3): the tier a quest's difficulty
 * makes, the attack factor of each tier, the size of a temple, which quest a room holds and what the room
 * says about it for a hero. No storage, no Vue.
 *
 * Do not import QuestLabels here: its `tierLabel` reads this module, and the two must not form a cycle.
 */
import { addDays, startOfDay } from "date-fns";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Room, RoomQuestTemplate } from "@/lib/engine/core/dungeons/types";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import {
  dayKeyOf,
  getEffectiveWindow,
  getQuestWindow,
  type HeroQuestEffects,
  type QuestScheduleInput,
} from "@/lib/engine/quests/QuestSchedule";
import { suggestBeasts } from "@/lib/services/bestiary/librarySuggest";

/** The three kinds of quest room, weakest first. */
export const QUEST_TIERS = ["monster", "miniboss", "boss"] as const;
export type QuestTier = (typeof QUEST_TIERS)[number];

/** A temple whose quests add up to this much difficulty is full. Informational: it never blocks a save. */
export const TEMPLE_FULL_SIZE = 21;

/** The first difficulty of each tier above the monster (the Fibonacci slider's 3 and 8). */
const MINIBOSS_FROM = 3;
const BOSS_FROM = 8;

/**
 * How much harder a quest's beast hits for each tier: a monster is the plain strike, a miniboss 1.2x,
 * a boss 1.5x. Tunable. It replaces the old "a boss is harder to escape" odds.
 */
export const TIER_ATTACK_FACTOR: Record<QuestTier, number> = {
  monster: 1,
  miniboss: 1.2,
  boss: 1.5,
};

/**
 * The tier a difficulty makes: 1-2 a monster, 3-5 a miniboss, 8 and up a boss. A legacy value between two
 * steps rounds down (6 and 7 are minibosses, 9-12 bosses); a missing or non-positive one is a monster.
 */
export function questTier(difficulty?: number): QuestTier {
  const value = Number(difficulty);
  const isMonster = !(value >= MINIBOSS_FROM); // also true for NaN
  if (isMonster) return "monster";
  return value >= BOSS_FROM ? "boss" : "miniboss";
}

/** The attack factor a tier gives its beast (see TIER_ATTACK_FACTOR). */
export function tierAttackFactor(tier: QuestTier): number {
  return TIER_ATTACK_FACTOR[tier];
}

/**
 * One room's part in the size of a temple. `difficulty` is the difficulty of the quest the room holds, or of
 * its template when the room is dormant (no family quest fills it yet). Leave out rooms that hold no quest
 * (traps, classic beast rooms, empty lairs, non-combat rooms).
 */
export interface SizedRoom {
  difficulty: number;
  /** True when no live quest fills the room and the difficulty is the template's ("if woken"). */
  dormant?: boolean;
}

export interface TempleSize {
  /** Every room's difficulty added up, dormant ones included. */
  total: number;
  /** The part of the total that live quests make. */
  awake: number;
  /** The part of the total that dormant templates make: what the temple grows by when they wake. */
  dormant: number;
  /** How many rooms are dormant. */
  dormantRooms: number;
  /** The total has reached TEMPLE_FULL_SIZE. */
  isFull: boolean;
}

/** A difficulty that counts toward the size: unset, broken and negative values count for nothing. */
const sizeOf = (difficulty: number): number => {
  const value = Number(difficulty);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

/**
 * The size of a temple: the sum of the difficulties of its quest rooms, with dormant rooms counted at their
 * template's difficulty and told apart so the screen can grey them ("if woken"). Values are added as they
 * stand; only the tier rounds a legacy value down.
 */
export function templeSize(rooms: readonly SizedRoom[]): TempleSize {
  let awake = 0;
  let dormant = 0;
  let dormantRooms = 0;
  for (const room of rooms) {
    const isDormant = Boolean(room.dormant);
    if (isDormant) {
      dormant += sizeOf(room.difficulty);
      dormantRooms++;
    } else {
      awake += sizeOf(room.difficulty);
    }
  }
  const total = awake + dormant;
  return { total, awake, dormant, dormantRooms, isFull: total >= TEMPLE_FULL_SIZE };
}

// ---------------------------------------------------------------------------------------------------------------------
// Which quest a room holds (5.2)
// ---------------------------------------------------------------------------------------------------------------------

/** The library's top suggestion for a quest name never changes while the app runs, and the screens ask often. */
const suggestedBeastIds = new Map<string, string | undefined>();

/**
 * A quest's beast: its own `beastId`, else the top library suggestion for its name (decision 5). The Game Master
 * can change it on the quest form; nothing is rewritten here.
 */
export function questBeastId(quest: Pick<Achievement, "beastId" | "achievementName" | "noBeast">): string | undefined {
  const hasOwnBeast = Boolean(quest.beastId);
  if (hasOwnBeast) return String(quest.beastId);
  // The parent chose "No beast" on the quest form (QR14): no suggestion stands in for one
  if (quest.noBeast) return undefined;
  const name = String(quest.achievementName ?? "");
  const isUnasked = !suggestedBeastIds.has(name);
  if (isUnasked) {
    const top = suggestBeasts(name, 1)[0];
    suggestedBeastIds.set(name, top ? String(top.id) : undefined);
  }
  return suggestedBeastIds.get(name);
}

/** A room's `questIds` when it is a list of at least one id; anything else there (none, empty, not a list) is no list */
function questListOf(room: Partial<Room> | null | undefined): string[] | undefined {
  const listed = room?.content?.questIds;
  const isList = Array.isArray(listed) && listed.length > 0;
  return isList ? listed : undefined;
}

/** True for a room that lists its quests in `questIds`, read the way roomQuestIds reads it; a `questId` room is not one */
export const isListRoom = (room: Partial<Room> | null | undefined): boolean => questListOf(room) !== undefined;

/**
 * The quests a room holds, in order: its `questIds` when it lists any, else its one `questId`, else none. A single
 * `questId` reads as a list of one, so the rules below only ever deal with lists.
 */
export function roomQuestIds(room: Partial<Room> | null | undefined): string[] {
  const listed = questListOf(room);
  if (listed) return listed.map(String);
  const single = room?.content?.questId;
  return single ? [String(single)] : [];
}

/** The live (non-draft) quests a room holds, in its order; a quest it names that is gone or only a draft is left out. */
export function liveRoomQuests(room: Partial<Room> | null | undefined, quests: readonly Achievement[]): Achievement[] {
  return roomQuestIds(room).flatMap((id) => quests.find((quest) => String(quest.id) === id && !quest.draft) ?? []);
}

/**
 * The quest a room is known by: the biggest of the live (non-draft) quests it holds, ties to the one listed first.
 * Screens that need one quest to name or size a whole room ask for this.
 */
export function headlineQuest(
  room: Partial<Room> | null | undefined,
  quests: readonly Achievement[]
): Achievement | undefined {
  const difficultyOf = (quest: Achievement): number => Number(quest.difficulty) || 0;
  const held = liveRoomQuests(room, quests);
  // A later quest takes over only when it is strictly bigger, so ties stay with the one listed first
  return held.reduce<Achievement | undefined>(
    (headline, quest) => (!headline || difficultyOf(quest) > difficultyOf(headline) ? quest : headline),
    undefined
  );
}

/** True for a room that holds a quest (or several) or a shipped quest template; a classic beast room is not one. */
export const isQuestRoom = (room: Partial<Room>): boolean =>
  roomQuestIds(room).length > 0 || Boolean(room.content?.quest);

/**
 * What a room holds for one hero:
 * - `classic`: a beast room (no `questId`, no `quest`); never resolved.
 * - `quest`: a live quest, with the hero's board row when the board has one (it has none while Gale's Wind hides
 *   the board). `source` says whether the Game Master picked it (`questId`) or the template matched it.
 * - `notYours`: the Game Master's quest exists but is not for this hero: its beast sleeps here.
 * - `dormant`: nothing fills the template yet; the room plays as a classic fight with the template's beast.
 * - `emptyLair`: the Game Master's quest is gone and the room has no template: no fight.
 */
export type RoomQuestResolution =
  | { kind: "classic" }
  | { kind: "emptyLair" }
  | { kind: "dormant"; template: RoomQuestTemplate }
  | { kind: "notYours"; quest: Achievement }
  | { kind: "quest"; quest: Achievement; item?: QuestBoardItem; source: "questId" | "template" };

/** QuestEngine.isVisibleToUser: an Open Bounty is for everyone, any other quest for its assignees. */
const isVisibleToHero = (quest: Achievement, heroId: string): boolean =>
  quest.type === "asNeeded" || (quest.assignee ?? []).map(String).includes(String(heroId));

/** How the hero's board row reads: the four states of a quest that is on the board (or hidden from it). */
type RowReading = "lurking" | "pending" | "cleared" | "away";

/** A quest the board has no row for (Gale's Wind hides the board) reads away, like one that is not due. */
const readRow = (item?: QuestBoardItem): RowReading => {
  const isAway = !item || item.status === "notDue";
  if (isAway) return "away";
  const isOpen = item.status === "open";
  if (isOpen) return "lurking";
  return item.pending ? "pending" : "cleared";
};

/** Which quest a template prefers: an open one, then a claim waiting, then a done one, then one that is away. */
const PREFERENCE: Record<RowReading, number> = { lurking: 0, pending: 1, cleared: 2, away: 3 };

/** One of the Game Master's picks: on the hero's board, else among the live quests (visible: no row; else asleep). */
const resolvePick = (
  questId: string,
  heroId: string,
  board: readonly QuestBoardItem[],
  liveQuests: readonly Achievement[]
): RoomQuestResolution | null => {
  const item = board.find((row) => String(row.quest.id) === questId && !row.quest.draft);
  if (item) return { kind: "quest", quest: item.quest, item, source: "questId" };
  const live = liveQuests.find((quest) => String(quest.id) === questId && !quest.draft);
  if (!live) return null;
  return isVisibleToHero(live, heroId)
    ? { kind: "quest", quest: live, source: "questId" }
    : { kind: "notYours", quest: live };
};

/**
 * The Game Master's picks for a room, met by one hero: the pick that is for them and reads best (open before
 * pending before done before away; ties go to the one listed first), else the first pick asleep for them, else null.
 */
const resolvePicks = (
  ids: readonly string[],
  heroId: string,
  board: readonly QuestBoardItem[],
  liveQuests: readonly Achievement[]
): RoomQuestResolution | null => {
  const picks = ids.flatMap((id) => resolvePick(id, heroId, board, liveQuests) ?? []);
  const isForTheHero = (pick: RoomQuestResolution): pick is Extract<RoomQuestResolution, { kind: "quest" }> =>
    pick.kind === "quest";
  // Array.sort is stable: two picks that read the same keep the order the room lists them in
  const [best] = picks.filter(isForTheHero).sort((a, b) => PREFERENCE[readRow(a.item)] - PREFERENCE[readRow(b.item)]);
  return best ?? picks.find((pick) => pick.kind === "notYours") ?? null;
};

/** The best live quest visible to the hero whose beast is the template's, or null. */
const matchTemplate = (
  template: RoomQuestTemplate,
  heroId: string,
  board: readonly QuestBoardItem[],
  liveQuests: readonly Achievement[]
): RoomQuestResolution | null => {
  const wanted = String(template.beastId);
  const boardIds = new Set(board.map((row) => String(row.quest.id)));
  const candidates: { quest: Achievement; item?: QuestBoardItem }[] = [
    ...board.filter((item) => !item.quest.draft).map((item) => ({ quest: item.quest, item })),
    // visible quests the board hides (Gale's Wind) still hold the room: it reads away, not dormant
    ...liveQuests
      .filter((quest) => !quest.draft && !boardIds.has(String(quest.id)) && isVisibleToHero(quest, heroId))
      .map((quest) => ({ quest })),
  ];
  const preferenceOf = (candidate: { item?: QuestBoardItem }) => PREFERENCE[readRow(candidate.item)];
  // Array.sort is stable: two quests that read the same keep the order they came in
  const [best] = candidates
    .filter((candidate) => questBeastId(candidate.quest) === wanted)
    .sort((a, b) => preferenceOf(a) - preferenceOf(b));
  return best ? { kind: "quest", quest: best.quest, item: best.item, source: "template" } : null;
};

/**
 * Which quest a room holds for this hero (5.2), in the spec's order:
 *  1. `content.questId` / `content.questIds` (the Game Master's picks): the pick that is for the hero and reads best,
 *     open before pending before done before away, ties to the one listed first; a pick that is gone or a draft does
 *     not count, and when every live pick is for someone else the room sleeps for the hero;
 *  2. `content.quest` (the shipped template): the live quest visible to the hero whose beast is the template's,
 *     open before pending before done before away; ties go to the first;
 *  3. the room is dormant.
 * A classic room is never resolved. Picks that no longer resolve and have no template are an empty lair.
 *
 * `visibleQuests` is the hero's board (QuestEngine.getQuestBoardForUser): the quests visible to them, each with
 * its status. `liveQuests` is every live quest in the family (QuestEngine.getAllQuests): without it a Game
 * Master's pick that is not on the board cannot be told from a deleted one, so it reads as an empty lair; with
 * it the pick is `notYours` for a hero it is not for, and a quest the board hides (Gale's Wind) is still found.
 */
export function resolveRoomQuest(
  room: Partial<Room>,
  heroId: string,
  visibleQuests: readonly QuestBoardItem[],
  liveQuests: readonly Achievement[] = []
): RoomQuestResolution {
  const questIds = roomQuestIds(room);
  const template = room.content?.quest;
  const isClassic = questIds.length === 0 && !template;
  if (isClassic) return { kind: "classic" };

  const picked = resolvePicks(questIds, heroId, visibleQuests, liveQuests);
  if (picked) return picked;
  if (!template) return { kind: "emptyLair" };
  return matchTemplate(template, heroId, visibleQuests, liveQuests) ?? { kind: "dormant", template };
}

// ---------------------------------------------------------------------------------------------------------------------
// A room's status for a hero (5.3)
// ---------------------------------------------------------------------------------------------------------------------

/**
 * What a quest room says to a hero:
 * - `lurking`: the board item is open. The beast is here (a fight; the doors seal if the room locks on enter).
 * - `pending`: done, and a claim waits for the Game Master. Tied up; no fight.
 * - `cleared`: done. Nothing left but the smell; no fight.
 * - `away`: the quest is not due (not this day, snoozed, Gale's Wind, ended). The lair is empty; no fight.
 * - `notYours`: the quest is not for this hero. Its beast sleeps here; no fight.
 * - `dormant`: no live quest fills the template. A classic fight with the template's beast.
 * - `classic`: a classic beast room. The classic rules.
 * - `emptyLair`: the Game Master's quest is gone and there is no template. No fight; the editor flags it.
 */
export type RoomQuestStatus =
  | "lurking"
  | "pending"
  | "cleared"
  | "away"
  | "notYours"
  | "dormant"
  | "classic"
  | "emptyLair";

/**
 * A resolved room's status. It is the board's own reading, so the room and the board never disagree: it restores
 * when the board item opens again (a daily quest the next day, a weekly one the next 7-day window, a
 * `repeatOnDays` one the next listed day, a custom one the next period, a `once` one never; a rejected claim
 * stops counting, so the beast is back at once; a quest done several times a window lurks until its allowance
 * is used).
 */
export function roomQuestStatus(resolution: RoomQuestResolution): RoomQuestStatus {
  switch (resolution.kind) {
    case "quest":
      return readRow(resolution.item);
    case "notYours":
      return "notYours";
    default:
      return resolution.kind;
  }
}

/**
 * Which occurrence of the quest the hero is in: `${questId}@${day the current window opened}`. It names the
 * window a clear belongs to, is derived from the schedule every time and is never stored. Null when the quest
 * has no window on `now` (not due, snoozed, not begun or ended).
 */
export function questOccurrenceKey(quest: QuestScheduleInput, now: Date, effects?: HeroQuestEffects): string | null {
  const window = getEffectiveWindow(quest, effects, now);
  return window ? `${quest.id}@${dayKeyOf(window.start)}` : null;
}

/** The farthest ahead the next day a quest is due is looked for. */
const RETURN_HORIZON_DAYS = 400;

/**
 * When the beast is back after `now`: the first day the quest is due again, as that day's midnight ("Back
 * tomorrow", "Back Sat."). Windows are contiguous, so after a clear this is the window's end, or the next listed
 * day for a `repeatOnDays` quest. Null when it never is (a `once` quest, one that has ended). The screens ask only
 * when they have a label to write: it scans the calendar.
 */
export function questReturnsAt(quest: QuestScheduleInput, now: Date, effects?: HeroQuestEffects): Date | null {
  const current = getEffectiveWindow(quest, effects, now);
  const isOnceUnderWay = Boolean(current) && quest.basicSchedule === "once";
  if (isOnceUnderWay) return null;
  let day = current ? startOfDay(current.end) : addDays(startOfDay(now), 1);
  const starts = quest.startsOn ? new Date(quest.startsOn) : null;
  const beginsLater = !current && starts && !Number.isNaN(starts.getTime()) && startOfDay(starts) > day;
  if (beginsLater) day = startOfDay(starts);
  for (let step = 0; step < RETURN_HORIZON_DAYS; step++, day = addDays(day, 1)) {
    const isDue = getQuestWindow(quest, day) !== null;
    if (isDue) return day;
  }
  return null;
}

export interface RoomQuestOptions {
  /** The hero's item effects (snoozes, pull-ins, Gale's Wind), the same ones the board was read with */
  effects?: HeroQuestEffects;
  /** Every live quest in the family (resolveRoomQuest) */
  liveQuests?: readonly Achievement[];
}

/** Everything the temple needs to know about one quest room for one hero. */
export interface RoomQuestState {
  status: RoomQuestStatus;
  resolution: RoomQuestResolution;
  /** The quest in the room (also when it sleeps for this hero); none for a dormant, classic or empty room */
  quest?: Achievement;
  /** The hero's board row for that quest, when the board has one */
  item?: QuestBoardItem;
  /** The room's beast: the quest's, else the template's when dormant */
  beastId?: string;
  /** The quest's difficulty, or the template's when dormant */
  difficulty?: number;
  /** What the difficulty makes the room (questTier) */
  tier?: QuestTier;
  /** questOccurrenceKey of a lurking, pending or cleared room; null otherwise */
  occurrence: string | null;
}

const BOARD_DRIVEN: readonly RoomQuestStatus[] = ["lurking", "pending", "cleared"];

/** A room's resolution, status, beast, tier and occurrence for a hero at `now`, from the hero's board. */
export function roomQuestState(
  room: Partial<Room>,
  heroId: string,
  board: readonly QuestBoardItem[],
  now: Date,
  options: RoomQuestOptions = {}
): RoomQuestState {
  const resolution = resolveRoomQuest(room, heroId, board, options.liveQuests);
  const status = roomQuestStatus(resolution);
  const base = { status, resolution, occurrence: null };
  switch (resolution.kind) {
    case "dormant": {
      const { beastId, difficulty } = resolution.template;
      return { ...base, beastId: String(beastId), difficulty, tier: questTier(difficulty) };
    }
    case "quest":
    case "notYours": {
      const { quest } = resolution;
      return {
        ...base,
        quest,
        item: resolution.kind === "quest" ? resolution.item : undefined,
        beastId: questBeastId(quest),
        difficulty: quest.difficulty,
        tier: questTier(quest.difficulty),
        occurrence: BOARD_DRIVEN.includes(status) ? questOccurrenceKey(quest, now, options.effects) : null,
      };
    }
    default:
      return base;
  }
}

/**
 * The room's part in the size of its temple (templeSize): the quest's difficulty, or the template's when the room
 * is dormant. A quest asleep for this hero still counts: the temple is the same size for everyone. Classic rooms
 * and empty lairs hold no quest and are left out (null).
 */
export function sizedRoomOf(resolution: RoomQuestResolution): SizedRoom | null {
  switch (resolution.kind) {
    case "quest":
    case "notYours":
      return { difficulty: Number(resolution.quest.difficulty) || 0 };
    case "dormant":
      return { difficulty: Number(resolution.template.difficulty) || 0, dormant: true };
    default:
      return null;
  }
}
