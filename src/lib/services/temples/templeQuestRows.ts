/**
 * The temple's Quests tab as pure rules (docs/Quest-Rooms-Spec.md section 9, "Temple Quests tab"): which cells of the
 * maze are quest rooms, which quest each holds from the Game Master's side (no hero, no board), the size of the temple,
 * and the rows the tab shows: the quest or "Dormant: Dust Dervish, no quest yet", its schedule and heroes, a status dot
 * for each hero, and a flag when the room's tier and the quest's tier disagree. No storage, no Vue: the tab loads the
 * quests, the bestiary and each hero's board and calls `buildTempleQuests`.
 *
 * Classic beast rooms are not rows: the tab keeps listing them the way it always did.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { Room, RoomQuestTemplate } from "@/lib/engine/core/dungeons/types";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import type { HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import { browseLibrary, type LibraryEntry } from "@/lib/services/bestiary/librarySuggest";
import { DIFFICULTY_NAMES, TIER_NAMES, assigneeLabel, scheduleLabel } from "@/lib/services/quests/QuestLabels";
import {
  headlineQuest,
  isListRoom,
  questBeastId,
  questTier,
  roomQuestIds,
  roomQuestState,
  sizedRoomOf,
  templeSize,
  type QuestTier,
  type RoomQuestResolution,
  type RoomQuestStatus,
  type SizedRoom,
  type TempleSize,
} from "@/lib/services/temples/questRooms";
import { describeTempleSize } from "@/lib/services/temples/templeAudit";
import debug from "@/lib/utils/debug";

// ---------------------------------------------------------------------------------------------------------------------
// The quest rooms of a maze
// ---------------------------------------------------------------------------------------------------------------------

/** The part of a temple the tab reads: a saved temple's layout, the editor's copy and a bare layout all fit. */
export interface QuestLayout {
  maze?: string[][] | Record<string, string[][]> | null;
  rooms?: Record<string, Room> | null;
}

/** One cell of the maze that holds a quest room. */
export interface QuestRoomCell {
  /** `1F:3,4`: the floor, then the row and column. Unique in a temple, where the room's symbol may be shared. */
  key: string;
  /** The token in the maze (and the key of the room's definition) */
  symbol: string;
  room: Room;
  floor: string;
  row: number;
  col: number;
  /** What the room was built as: a monster, miniboss or boss room */
  tier: QuestTier;
}

const COMBAT_TIERS: readonly string[] = ["monster", "miniboss", "boss"];

const isQuestRoom = (room: Room | undefined): room is Room => roomQuestIds(room).length > 0 || Boolean(room?.content?.quest);

/**
 * Every cell of every floor that holds a quest room (a `questId`, a list of `questIds` or a shipped template) and is
 * a combat room, in reading order. A token many cells share is one row for each cell: each is a room of its own.
 */
export function questRoomCells(layout?: QuestLayout | null): QuestRoomCell[] {
  const rooms = layout?.rooms;
  const maze = layout?.maze;
  const isLayoutEmpty = !rooms || !maze;
  if (isLayoutEmpty) return [];
  const floors: Array<[string, string[][]]> = Array.isArray(maze) ? [["1F", maze]] : Object.entries(maze);
  const cells: QuestRoomCell[] = [];
  for (const [floor, grid] of floors) {
    grid.forEach((cols, row) =>
      (cols ?? []).forEach((symbol, col) => {
        const room = rooms[symbol];
        const isCombatQuestRoom = isQuestRoom(room) && COMBAT_TIERS.includes(room.type);
        if (isCombatQuestRoom) {
          cells.push({ key: `${floor}:${row},${col}`, symbol, room, floor, row, col, tier: room.type as QuestTier });
        }
      })
    );
  }
  return cells;
}

// ---------------------------------------------------------------------------------------------------------------------
// Which quest a room holds, from the Game Master's side
// ---------------------------------------------------------------------------------------------------------------------

/**
 * What a quest room holds with no hero in mind, the way the Game Master reads the family's quests:
 * - the quest the editor picked (`questId`), when it is live; a room that lists several (`questIds`) is read by the
 *   biggest live quest in the list;
 * - else the first live quest whose beast is the template's (a quest with no beast of its own counts through the
 *   library's suggestion for its name, the rule a room finds its quest by);
 * - else the room is dormant (it has a template) or an empty lair (it has none).
 * A draft is not live: heroes never see it, so it cannot hold a room. A classic room is never resolved.
 */
export function gmResolution(room: Room, quests: readonly Achievement[]): RoomQuestResolution {
  const template = room.content?.quest;
  const isClassic = roomQuestIds(room).length === 0 && !template;
  if (isClassic) return { kind: "classic" };

  const live = quests.filter((quest) => !quest.draft);
  const picked = headlineQuest(room, live);
  if (picked) return { kind: "quest", quest: picked, source: "questId" };
  if (!template) return { kind: "emptyLair" };

  const wanted = String(template.beastId);
  const filler = live.find((quest) => questBeastId(quest) === wanted);
  if (filler) return { kind: "quest", quest: filler, source: "template" };
  return { kind: "dormant", template };
}

let libraryById: Map<string, LibraryEntry> | null = null;

/** A library beast (a chore beast or a classic one) by id; the library never changes while the app runs. */
export function libraryEntryOf(id: string): LibraryEntry | undefined {
  libraryById ??= new Map(browseLibrary().map((entry) => [String(entry.id), entry]));
  return libraryById.get(id);
}

// ---------------------------------------------------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------------------------------------------------

/** A hero's quest board, as `QuestEngine.getQuestBoardForUser` reads it (with the hero's item effects). */
export interface HeroBoard {
  board: readonly QuestBoardItem[];
  effects?: HeroQuestEffects;
}

/** A hero of the family and their board; `board` is null when it could not be read (the hero gets no dot). */
export interface QuestHero {
  id: string;
  /** The nickname the dot and the heroes line use */
  nick: string;
  board: HeroBoard | null;
}

/** What one hero's board says about a room, for the dot beside the hero's name. */
export interface HeroDot {
  heroId: string;
  name: string;
  status: RoomQuestStatus;
  /** "Mia: tamed": for a long press and a screen reader */
  label: string;
}

const DOT_WORDS: Record<RoomQuestStatus, string> = {
  lurking: "the beast is here",
  pending: "tied up, waiting on the Game Master",
  cleared: "tamed",
  away: "not due, the lair is empty",
  notYours: "not their quest",
  dormant: "no quest of theirs here, plays the classic fight",
  classic: "a classic beast room",
  emptyLair: "an empty lair",
};

export type TempleQuestRowKind = "quest" | "dormant" | "emptyLair";

export interface TempleQuestRow {
  key: string;
  symbol: string;
  floor: string;
  row: number;
  col: number;
  /** What the room was built as (the group it is listed under) */
  roomTier: QuestTier;
  kind: TempleQuestRowKind;
  /** The quest's name, "Dormant: Dust Dervish, no quest yet" or "Empty lair: its quest is gone" */
  title: string;
  quest?: Achievement;
  /** How many more quests fill this room for other heroes (Mia's Dish Goblin beside Sam's) */
  moreQuests: number;
  beastId?: string;
  beastName: string;
  /** The portrait number (NNN.webp), when the beast has one */
  avatar?: number;
  /** The quest's difficulty, or the template's when the room is dormant ("if woken") */
  difficulty?: number;
  /** "Moderate"; empty when the difficulty is not a step of the slider */
  difficultyName: string;
  /** What the difficulty makes the quest (questTier); none for an empty lair */
  tier?: QuestTier;
  /** "Monster", "Miniboss" or "Boss": the quest's chip; empty for an empty lair */
  tierName: string;
  /** "Simple 2 · Dish Goblin"; a dormant room says "Moderate 5 · if woken" */
  facts: string;
  /** scheduleLabel of the quest or of the template: "Daily", "Weekly on Mon, Wed" */
  schedule: string;
  /** "Daily · Kia, Mia": when it comes and for whom */
  when: string;
  /** assigneeLabel: "Mia, Sam", "Anyone"; empty for a room nobody has woken */
  heroes: string;
  approval: boolean;
  dots: HeroDot[];
  /** "Boss room holds a Miniboss quest (3)" when the quest's tier is not the room's */
  mismatch: string | null;
}

export interface TempleQuestsInput {
  layout?: QuestLayout | null;
  /** Every quest record the family has (drafts are left out where they cannot hold a room) */
  quests: readonly Achievement[];
  /** The family's bestiary */
  beasts: readonly Beast[];
  heroes: readonly QuestHero[];
  now: Date;
}

export interface TempleQuestsView {
  rows: TempleQuestRow[];
  /** The rows by the tier the room was built as, boss first (the order the tab lists them in) */
  groups: Record<QuestTier, TempleQuestRow[]>;
  size: TempleSize;
  /** "Size 17 of 21 · 9 if woken" */
  sizeLine: string;
}

interface BeastFace {
  name: string;
  avatar?: number;
}

/** A beast as the tab names and draws it: the family's own, else the library's, else a stand-in. */
const faceOf = (beastId: string | undefined, beasts: readonly Beast[], missing: string): BeastFace => {
  if (!beastId) return { name: missing };
  const shown = beasts.find((beast) => String(beast.id) === beastId) ?? libraryEntryOf(beastId);
  return { name: shown?.name ?? missing, avatar: shown?.avatar || undefined };
};

/** "Simple 2" for a step of the slider, "5" for a value between the steps, "" when unset. */
const difficultyText = (difficulty: number, name: string): string => [name, difficulty > 0 ? String(difficulty) : ""].filter(Boolean).join(" ");

const joinFacts = (...parts: string[]): string => parts.filter(Boolean).join(" · ");

const templateSchedule = (template: RoomQuestTemplate): string =>
  scheduleLabel({
    basicSchedule: template.basicSchedule,
    repeatOnDays: template.repeatOnDays,
    customPeriodType: template.customPeriodType,
  });

/** A hero's dot for a room, from their board. A quest the rules cannot read leaves the dot out. */
const dotOf = (cell: QuestRoomCell, hero: QuestHero, liveQuests: readonly Achievement[], now: Date) => {
  if (!hero.board) return null;
  try {
    const state = roomQuestState(cell.room, hero.id, hero.board.board, now, { effects: hero.board.effects, liveQuests });
    const dot: HeroDot = { heroId: hero.id, name: hero.nick, status: state.status, label: `${hero.nick}: ${DOT_WORDS[state.status]}` };
    return { dot, quest: state.quest };
  } catch (error) {
    debug.warn(`[TempleQuests] could not read ${hero.nick}'s board for room ${cell.key}`, error);
    return null;
  }
};

const rowOf = (cell: QuestRoomCell, input: TempleQuestsInput, liveQuests: readonly Achievement[]) => {
  const { beasts, heroes, now } = input;
  const resolution = gmResolution(cell.room, input.quests);
  const base = {
    key: cell.key,
    symbol: cell.symbol,
    floor: cell.floor,
    row: cell.row,
    col: cell.col,
    roomTier: cell.tier,
    moreQuests: 0,
    dots: [] as HeroDot[],
    approval: false,
    heroes: "",
    mismatch: null as string | null,
  };

  if (resolution.kind === "dormant") {
    const { template } = resolution;
    const face = faceOf(String(template.beastId), beasts, "a beast");
    const difficulty = Number(template.difficulty) || 0;
    const difficultyName = DIFFICULTY_NAMES[difficulty] ?? "";
    const schedule = templateSchedule(template);
    const tier = questTier(difficulty);
    const row: TempleQuestRow = {
      ...base,
      kind: "dormant",
      title: `Dormant: ${face.name}, no quest yet`,
      beastId: String(template.beastId),
      beastName: face.name,
      avatar: face.avatar,
      difficulty,
      difficultyName,
      tier,
      tierName: TIER_NAMES[tier],
      facts: joinFacts(difficultyText(difficulty, difficultyName), "if woken"),
      schedule,
      when: schedule,
    };
    return { row, resolution };
  }

  if (resolution.kind !== "quest") {
    const row: TempleQuestRow = {
      ...base,
      kind: "emptyLair",
      title: "Empty lair: its quest is gone",
      beastName: "No beast",
      difficultyName: "",
      tierName: "",
      facts: "",
      schedule: "",
      when: "",
    };
    return { row, resolution };
  }

  const { quest } = resolution;
  const beastId = questBeastId(quest);
  const face = faceOf(beastId, beasts, "No beast");
  const difficulty = Number(quest.difficulty) || 0;
  const users = heroes.map((hero) => ({ id: hero.id, name: { nick: hero.nick } }));

  const read = heroes
    .map((hero) => dotOf(cell, hero, liveQuests, now))
    .filter((item): item is NonNullable<typeof item> => item !== null);
  const others = new Set(read.map((item) => item.quest && String(item.quest.id)).filter((id): id is string => Boolean(id)));
  others.delete(String(quest.id));

  // A list room holds quests of every size on purpose, so only a single-quest room can disagree with its tier
  const isList = isListRoom(cell.room);
  const heldIds = new Set(roomQuestIds(cell.room).filter((id) => liveQuests.some((live) => String(live.id) === id)));
  heldIds.delete(String(quest.id));

  const questTierOfRoom = questTier(difficulty);
  const isMismatched = !isList && questTierOfRoom !== cell.tier;
  const difficultyName = DIFFICULTY_NAMES[difficulty] ?? "";
  const schedule = scheduleLabel(quest);
  const heroesLine = assigneeLabel(quest, users);
  const row: TempleQuestRow = {
    ...base,
    kind: "quest",
    title: quest.achievementName || "Unnamed quest",
    quest,
    moreQuests: isList ? heldIds.size : others.size,
    beastId,
    beastName: face.name,
    avatar: face.avatar,
    difficulty,
    difficultyName,
    tier: questTierOfRoom,
    tierName: TIER_NAMES[questTierOfRoom],
    facts: joinFacts(difficultyText(difficulty, difficultyName), face.name),
    schedule,
    when: joinFacts(schedule, heroesLine),
    heroes: heroesLine,
    approval: Boolean(quest.requiresApproval),
    dots: read.map((item) => item.dot),
    mismatch: isMismatched ? `${TIER_NAMES[cell.tier]} room holds a ${TIER_NAMES[questTierOfRoom]} quest (${difficulty})` : null,
  };
  return { row, resolution };
};

/**
 * The Quests tab of a temple: a row for each quest room, grouped by the tier the room was built as, and the temple's
 * size (the quests' difficulties added up, a dormant template counted at its own difficulty and told apart as
 * "if woken"). The size is the same for every hero; the dots are each hero's own board.
 */
export function buildTempleQuests(input: TempleQuestsInput): TempleQuestsView {
  const liveQuests = input.quests.filter((quest) => !quest.draft);
  const groups: Record<QuestTier, TempleQuestRow[]> = { boss: [], miniboss: [], monster: [] };
  const rows: TempleQuestRow[] = [];
  const shares: SizedRoom[] = [];

  for (const cell of questRoomCells(input.layout)) {
    const { row, resolution } = rowOf(cell, input, liveQuests);
    rows.push(row);
    groups[row.roomTier].push(row);
    const share = sizedRoomOf(resolution);
    if (share) shares.push(share);
  }

  const size = templeSize(shares);
  return { rows, groups, size, sizeLine: describeTempleSize(size) };
}
