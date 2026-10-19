/**
 * Quick Start makes the Howling Spire live (owner 2026-10-18, "set world, wake on arrival"). Quick Start seeds tonight's
 * three quests and three rewards; without this the family walks into the Spire, the plains temple a new hero meets
 * first, and finds only sleeping beasts. So, right after the seed:
 * - tonight's quests go into the Spire's first three monster rooms in walking order (the rooms a hero reaches first from
 *   the entrance: those open without a key, then the nearest behind a locked door), one per room, the way a pack's quests sit in a room (`content.questIds`, as the Moving
 *   House temple holds them). A room that already holds a quest is passed over, and so is one whose token other cells
 *   share (writing it would put the quest in every one of them);
 * - the other monster rooms wake their sleeping templates for every Quick Start hero, exactly as the Temple Quests tab
 *   would (planWake + commitWake: Solo Missions starting this Monday);
 * - the miniboss and boss rooms stay asleep for the Game Master.
 *
 * `quickStartTemplePlan` is pure. `runQuickStartTemple` writes only through the existing writers: the temple record
 * (TempleDb.setTemple, the Temple Creator's own save, which tells the engine through templeChanges), the quests and
 * beasts (commitWake: AchievementDb.setTask, BestiaryDb.setBeast) and each hero's questEffects (the wake remembered,
 * wakeOnEntry.ts), so walking into the Spire later wakes nothing again.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import templeDb, { templeStorage, type TempleInterface } from "@/lib/databases/TempleDb";
import { ensureBuiltInTemples } from "@/lib/engine/core/dungeons/importAllTemples";
import type { Room, RoomQuestTemplate } from "@/lib/engine/core/dungeons/types";
import type { HeroQuestEffects } from "@/lib/engine/quests/QuestSchedule";
import { buildTempleGraph, reachableFrom, type TempleLayout } from "@/lib/engine/dungeons/generator/templeGraph";
import { QUICK_START_PACK } from "@/lib/services/core/packs/catalog/quickStart";
import { lockedFromSides } from "@/lib/services/temples/authoredDoors";
import { roomQuestIds } from "@/lib/services/temples/questRooms";
import type { QuestRoomCell } from "@/lib/services/temples/templeQuestRows";
import {
  entranceFloorOf,
  familyWakeStores,
  floorsOfLayout,
  rememberWake,
  shippedLayoutOf,
  type FamilyWakeStores,
  type PlayedLayout,
} from "@/lib/services/temples/wakeOnEntry";
import { commitWake, monsterTemplateCells, planWake, type WakeInput } from "@/lib/services/temples/wakeTempleQuests";

/** The Howling Spire: the plains temple a new hero meets first. */
export const QUICK_START_TEMPLE_ID = "wind-temple";

/** Tonight's three quests, as the Quick Start pack lists them. */
export const QUICK_START_QUEST_IDS: readonly string[] = (QUICK_START_PACK.content.quests ?? []).map((quest) => String(quest.id));

/** One of tonight's quests and the room it went into. */
export interface PlacedQuest {
  questId: string;
  /** `1F:5,3`: the cell (questRoomCells' key) */
  key: string;
  /** The room's token in the maze, the key of its definition */
  symbol: string;
}

export interface QuickStartTemplePlan<L extends PlayedLayout = PlayedLayout> {
  /** The layout with tonight's quests in their rooms; null when no room took one (there is nothing to write) */
  layout: L | null;
  placed: PlacedQuest[];
  /** The quests no free monster room was left for */
  unplaced: string[];
  /** What the Temple Quests tab would wake, for planWake with the family's quests and bestiary */
  wake: Pick<WakeInput, "templeId" | "templates" | "heroIds" | "now">;
}

/** The layout as the solver walks it: the doors the editor drew as sides, played as locks and walls (registration's rule). */
const walkableLayout = (layout: PlayedLayout): TempleLayout => {
  const rooms: Record<string, Room> = {};
  for (const [symbol, room] of Object.entries(layout.rooms ?? {})) rooms[symbol] = lockedFromSides(room);
  return { entrance: layout.entrance, maze: layout.maze ?? [], rooms };
};

/**
 * Each cell's place in walking order: first the rooms a hero walks to from the entrance with no key (nearest first),
 * then the rooms behind locked doors, nearest first with every door open. A room the walk never reaches comes after
 * them all, in reading order. (The graph is the solver's, read from the layout as stored, so no run is needed.)
 */
const walkingRank = (layout: PlayedLayout): Map<string, number> => {
  const graph = buildTempleGraph(walkableLayout(layout));
  const entrance = graph.entrance;
  if (!entrance) return new Map();
  const lockedDoors = new Set(graph.doors.filter((door) => door.lock !== "none").map((door) => door.id));
  const withoutKeys = reachableFrom(graph, entrance, new Set(), lockedDoors);
  const order = [...new Set([...withoutKeys, ...reachableFrom(graph, entrance)])];
  return new Map(order.map((key, index) => [key, index]));
};

const inWalkingOrder = (cells: QuestRoomCell[], rank: Map<string, number>): QuestRoomCell[] => {
  const placeOf = (cell: QuestRoomCell): number => rank.get(cell.key) ?? Number.MAX_SAFE_INTEGER;
  // Array.sort is stable: rooms the walk does not reach keep their reading order
  return [...cells].sort((a, b) => placeOf(a) - placeOf(b));
};

/** How many cells of the maze each token stands in. */
const tokenUses = (maze: PlayedLayout["maze"]): Map<string, number> => {
  const uses = new Map<string, number>();
  const grids = Array.isArray(maze) ? [maze] : Object.values(maze ?? {});
  for (const grid of grids) {
    for (const line of grid ?? []) {
      for (const token of line ?? []) uses.set(token, (uses.get(token) ?? 0) + 1);
    }
  }
  return uses;
};

/**
 * Where tonight's quests go in the Spire, and what wakes there for the Quick Start heroes (see the top of this file).
 * Pure: the layout handed in is never changed; the one returned is a copy with only the rooms that took a quest
 * changed. A quest the temple already holds is not placed again, so a second run places nothing.
 */
export function quickStartTemplePlan<L extends PlayedLayout>(
  layout: L | null | undefined,
  questIds: readonly string[],
  heroIds: readonly string[],
  now: Date
): QuickStartTemplePlan<L> {
  const wake = { templeId: QUICK_START_TEMPLE_ID, templates: [] as RoomQuestTemplate[], heroIds: [...heroIds], now };
  const hasRooms = Boolean(layout?.maze) && Boolean(layout?.rooms);
  const hasNothingToPlace = !layout || !hasRooms;
  if (hasNothingToPlace) return { layout: null, placed: [], unplaced: [...questIds], wake };

  const rooms: Record<string, Room> = { ...(layout.rooms ?? {}) };
  const held = new Set(Object.values(rooms).flatMap((room) => roomQuestIds(room)));
  const toPlace = [...new Set(questIds.map(String))].filter((id) => !held.has(id));
  const uses = tokenUses(layout.maze);
  const cells = inWalkingOrder(monsterTemplateCells(layout), walkingRank(layout));

  const placed: PlacedQuest[] = [];
  const tookQuest = new Set<string>();
  for (const cell of cells) {
    const hasNothingLeft = toPlace.length === 0;
    if (hasNothingLeft) break;
    const room = rooms[cell.symbol];
    const holdsQuest = roomQuestIds(room).length > 0;
    const isSharedToken = (uses.get(cell.symbol) ?? 0) > 1;
    const isTaken = holdsQuest || isSharedToken;
    if (isTaken) continue;
    const questId = toPlace.shift() as string;
    rooms[cell.symbol] = { ...room, content: { ...room.content, questIds: [questId] } };
    placed.push({ questId, key: cell.key, symbol: cell.symbol });
    tookQuest.add(cell.key);
  }

  const seen = new Set<string>();
  for (const cell of cells) {
    const isTonightsRoom = tookQuest.has(cell.key);
    const holdsQuest = roomQuestIds(cell.room).length > 0;
    const isLeftAlone = isTonightsRoom || holdsQuest;
    if (isLeftAlone) continue;
    const template = cell.room.content?.quest as RoomQuestTemplate;
    const beastId = String(template.beastId);
    const isSeen = seen.has(beastId);
    if (isSeen) continue;
    seen.add(beastId);
    wake.templates.push(template);
  }

  const hasPlaced = placed.length > 0;
  return {
    layout: hasPlaced ? ({ ...layout, rooms } as L) : null,
    placed,
    unplaced: toPlace,
    wake,
  };
}

// ---------------------------------------------------------------------------------------------------------------------
// The writes
// ---------------------------------------------------------------------------------------------------------------------

export interface QuickStartTempleDeps extends FamilyWakeStores {
  /** The shipped temples are in the TempleDb (importAllTemples) */
  ensureTemples: () => Promise<void>;
  readRecord: (templeId: string) => Promise<TempleInterface | null>;
  /** The Temple Creator's save: TempleDb.setTemple */
  saveRecord: (record: TempleInterface) => Promise<unknown>;
}

export interface QuickStartTempleDone {
  placed: PlacedQuest[];
  woken: Achievement[];
  adopted: Beast[];
  /** The heroes the wake was remembered for */
  remembered: string[];
}

const quickStartTempleDeps = (): QuickStartTempleDeps => ({
  ...familyWakeStores(),
  ensureTemples: ensureBuiltInTemples,
  readRecord: async (templeId) => {
    // The storage has to be created before it is read
    await templeStorage.create();
    return templeDb.getTempleById(templeId);
  },
  saveRecord: (record) => templeDb.setTemple(record),
});

/**
 * Makes the Howling Spire live for the Quick Start heroes: tonight's quests into its record, the other monster rooms
 * woken for the heroes, the wake remembered on each hero. A temple with no record (the TempleDb could not take the
 * shipped temples) keeps its rooms as shipped, and its beasts still wake. A write that fails throws: what was written
 * stays, nothing is remembered, and the hero's first walk into the Spire wakes what is left (wakeOnEntry.ts).
 */
export async function runQuickStartTemple(
  heroIds: readonly string[],
  deps: QuickStartTempleDeps = quickStartTempleDeps(),
  now: Date = new Date()
): Promise<QuickStartTempleDone> {
  await deps.ensureTemples();
  const record = await deps.readRecord(QUICK_START_TEMPLE_ID);
  const stored = record?.dungeonLayout ?? null;
  const played = stored ?? shippedLayoutOf(QUICK_START_TEMPLE_ID);
  const plan = quickStartTemplePlan<PlayedLayout>(played, QUICK_START_QUEST_IDS, heroIds, now);

  const placedLayout = plan.layout;
  const canPlace = Boolean(record && stored && placedLayout);
  if (canPlace) {
    await deps.saveRecord({ ...(record as TempleInterface), dungeonLayout: placedLayout as TempleInterface["dungeonLayout"] });
  }

  const done: QuickStartTempleDone = { placed: canPlace ? plan.placed : [], woken: [], adopted: [], remembered: [] };
  const hasSomethingToWake = plan.wake.templates.length > 0 && heroIds.length > 0;
  if (hasSomethingToWake) {
    const [quests, beasts] = await Promise.all([deps.readQuests(), deps.readBeasts()]);
    const made = await commitWake(planWake({ ...plan.wake, quests, beasts }), deps.writers);
    done.woken = made.woken;
    done.adopted = made.adopted;
  }

  // The plan woke the monster rooms of every floor, so every floor is remembered as woken (walking in is then quiet)
  const drawnFloors = floorsOfLayout(played);
  const floors = drawnFloors.length > 0 ? drawnFloors : [entranceFloorOf(played)];
  for (const heroId of heroIds) {
    const hero = deps.hero(heroId);
    if (!hero) continue;
    const remembered = floors.reduce<HeroQuestEffects>((effects, floor) => rememberWake(effects, QUICK_START_TEMPLE_ID, floor, now), hero.questEffects ?? {});
    await deps.saveEffects(heroId, remembered);
    done.remembered.push(heroId);
  }
  return done;
}
