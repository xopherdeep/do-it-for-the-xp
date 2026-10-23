/**
 * Where Quick Start puts tonight's quests in the Wind Temple (owner 2026-10-18, "set world, wake on arrival"), and how
 * the seed sync tells those placements from a Game Master's edit. Pure: the writes are quickStartTemple.ts.
 * - Tonight's quests go into the monster rooms a hero walks into from the entrance with nothing to open or win first
 *   (no locked door, no cracked wall, no boss door, and no room a beast seals on entry passed through on the way),
 *   nearest first, one per room, the way a pack's quests sit in a room (`content.questIds`, as the Moving House temple
 *   holds them). A child's first fight of the night is a walk from the door; a quest no such room is left for is not
 *   placed. A room that already holds a quest is passed over, and so is one whose token other cells share (writing it
 *   would put the quest in every one of them).
 * - The other monster rooms wake their sleeping templates for every Quick Start hero, exactly as the Temple Quests tab
 *   would (planWake + commitWake: Solo Missions starting this Monday); the miniboss and boss rooms stay asleep for the
 *   Game Master.
 * - Quick Start's placements are known by tonight's quest ids (withoutQuickStartQuests): a room of the Wind Temple's copy
 *   whose quests are exactly one of them, each once, is a room Quick Start wrote. The ids are what every family's copy
 *   already holds (the copies written before this rule carry no other mark), so the seed sync can tell a copy whose only
 *   change is tonight's quests from one the Game Master edited (importAllTemples.planSeedSync). The one case read
 *   wrongly: a Game Master who put one of tonight's quests alone into a room of an otherwise untouched copy by hand has it
 *   read as Quick Start's, and on a refresh the quest is placed again by Quick Start's rule, so it is still in the temple.
 */
import type { Room, RoomQuestTemplate } from "@/lib/engine/core/dungeons/types";
import { buildTempleGraph, reachableFrom, type Door, type TempleGraph, type TempleLayout } from "@/lib/engine/dungeons/generator/templeGraph";
import { QUICK_START_PACK } from "@/lib/services/core/packs/catalog/quickStart";
import { lockedFromSides } from "@/lib/services/temples/authoredDoors";
import { roomQuestIds } from "@/lib/services/temples/questRooms";
import type { QuestRoomCell } from "@/lib/services/temples/templeQuestRows";
import type { PlayedLayout } from "@/lib/services/temples/wakeOnEntry";
import { monsterTemplateCells, type WakeInput } from "@/lib/services/temples/wakeTempleQuests";

/** The Wind Temple: the plains temple a new hero meets first. */
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

/** The cells in walking order, and the ones tonight's quests may go into */
interface WalkingOrder {
  /** Each cell's place: first the rooms near the door, then the rest with every door open, nearest first */
  rank: Map<string, number>;
  /** The rooms a hero walks into from the entrance with nothing to open or win first */
  nearTheDoor: Set<string>;
}

/** The layout as the solver walks it: the doors the editor drew as sides, played as locks and walls (registration's rule). */
const walkableLayout = (layout: PlayedLayout): TempleLayout => {
  const rooms: Record<string, Room> = {};
  for (const [symbol, room] of Object.entries(layout.rooms ?? {})) rooms[symbol] = lockedFromSides(room);
  return { entrance: layout.entrance, maze: layout.maze ?? [], rooms };
};

/** A door that has to be opened or won first: a lock (a small key, the Boss Key, a Bomb), or the way out of a room its beast seals */
const isShutDoor = (graph: TempleGraph, door: Door): boolean => {
  const isSealedRoom = graph.rooms.get(door.from)?.room.content?.lockOnEnter === true;
  return door.lock !== "none" || isSealedRoom;
};

/**
 * Each cell's place in walking order: first the rooms a hero walks to from the entrance with nothing to open or win
 * (a sealed room is one to walk into, not through), nearest first; then the rest, nearest first with every door open.
 * A room the walk never reaches comes after them all, in reading order. (The graph is the solver's, read from the
 * layout as stored, so no run is needed.)
 */
const walkingOrder = (layout: PlayedLayout): WalkingOrder => {
  const graph = buildTempleGraph(walkableLayout(layout));
  const entrance = graph.entrance;
  if (!entrance) return { rank: new Map(), nearTheDoor: new Set() };
  const shutDoors = new Set(graph.doors.filter((door) => isShutDoor(graph, door)).map((door) => door.id));
  const nearTheDoor = reachableFrom(graph, entrance, new Set(), shutDoors);
  const order = [...new Set([...nearTheDoor, ...reachableFrom(graph, entrance)])];
  return { rank: new Map(order.map((key, index) => [key, index])), nearTheDoor: new Set(nearTheDoor) };
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
 * Where tonight's quests go in the Wind Temple, and what wakes there for the Quick Start heroes (see the top of this
 * file). Pure: the layout handed in is never changed; the one returned is a copy with only the rooms that took a quest
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
  const { rank, nearTheDoor } = walkingOrder(layout);
  const cells = inWalkingOrder(monsterTemplateCells(layout), rank);

  const placed: PlacedQuest[] = [];
  const tookQuest = new Set<string>();
  for (const cell of cells) {
    const hasNothingLeft = toPlace.length === 0;
    if (hasNothingLeft) break;
    const room = rooms[cell.symbol];
    const holdsQuest = roomQuestIds(room).length > 0;
    const isSharedToken = (uses.get(cell.symbol) ?? 0) > 1;
    const isOutOfReach = !nearTheDoor.has(cell.key);
    const isPassedOver = holdsQuest || isSharedToken || isOutOfReach;
    if (isPassedOver) continue;
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

/** A stored copy with Quick Start's placements taken out, and the quests they held */
export interface QuickStartPlacements<L extends PlayedLayout> {
  /** The copy as it was before Quick Start wrote into it (the copy itself when it holds none of tonight's quests) */
  layout: L;
  /** Tonight's quests found in it, in the pack's order */
  questIds: string[];
}

/** Whether a room holds one of tonight's quests and nothing else, as Quick Start writes a room (`content.questIds`) */
const quickStartQuestIn = (room: Room, found: readonly string[]): string | undefined => {
  const ids = room.content?.questIds;
  const only = Array.isArray(ids) && ids.length === 1 ? String(ids[0]) : undefined;
  const isTonightsQuest = only !== undefined && QUICK_START_QUEST_IDS.includes(only) && !found.includes(only);
  return isTonightsQuest ? only : undefined;
};

/**
 * The Wind Temple's stored copy with tonight's quests taken out of the rooms Quick Start wrote (see the top of this
 * file): what the seed sync compares with the copy's seed. Another temple's copy is handed back as it is.
 */
export function withoutQuickStartQuests<L extends PlayedLayout>(templeId: string, layout: L): QuickStartPlacements<L> {
  const isQuickStartTemple = templeId === QUICK_START_TEMPLE_ID;
  if (!isQuickStartTemple) return { layout, questIds: [] };
  const rooms: Record<string, Room> = { ...(layout.rooms ?? {}) };
  const found: string[] = [];
  for (const [symbol, room] of Object.entries(rooms)) {
    const questId = quickStartQuestIn(room, found);
    if (!questId) continue;
    const { questIds: _tonights, ...content } = room.content ?? {};
    rooms[symbol] = { ...room, content };
    found.push(questId);
  }
  const questIds = QUICK_START_QUEST_IDS.filter((id) => found.includes(id));
  return { layout: questIds.length > 0 ? ({ ...layout, rooms } as L) : layout, questIds };
}

/**
 * A refreshed copy of the Wind Temple gets tonight's quests back (importAllTemples): the quests Quick Start had placed
 * in the old layout go into the new one by Quick Start's own rule. With none to place, or no room near the door for
 * any, the layout comes back as given.
 */
export function placeQuickStartQuests<L extends PlayedLayout>(layout: L, questIds: readonly string[]): L {
  const hasNothingToPlace = questIds.length === 0;
  if (hasNothingToPlace) return layout;
  return quickStartTemplePlan(layout, questIds, [], new Date()).layout ?? layout;
}
