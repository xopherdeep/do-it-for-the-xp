/**
 * Project Towers builder: a project type, the family's house, the edited chore list and the phases' windows become one
 * generated temple (`gen-project-<typeId>`) and the one-off quests for every chore.
 *
 * Pure: no storage, no Vue. Each phase is a floor of the family's own house: the Old House planner (housePlanner.ts)
 * lays out, floor by floor on its 9x9 frame, the rooms that have chores in that phase, each holding them all. The
 * phase's biggest chore (the first on a tie) is the floor's boss, in a room of its own (beside its house room when a
 * side is free), and the stairs up hang off it: they open when every chore of the floor is done ('floorCleared'). The
 * next floor's arrival is pinned to the stairs' cell. The last phase's boss guards the Boss Key: it is sealed, so it
 * stands in a wing of its own (as the Old House's junk drawer does) and goes in after every chore room, its stairs last,
 * so no chore room hangs off it and none waits behind the phase's biggest chore. The roof, the next floor up, holds the
 * arrival, the finale behind the Boss Key door and the Trophy. towerRecord.ts writes the cells as rooms;
 * projectQuests.ts makes the quests. The same input always gives the same tower.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { TempleInterface } from "@/lib/databases/TempleDb";
import { HOUSE_FRAME, planHouse, type HousePlan } from "@/lib/services/core/packs/movingTemple/housePlanner";
import type { HouseCell, HouseCellKind, HouseZone } from "@/lib/services/core/packs/movingTemple/houseRooms";
import { houseRoomsOf, rehomeChores, type ProjectChore, type ProjectRoom } from "./projectChores";
import { ROOF_PHASE_ID, type PhaseWindow } from "./projectSchedule";
import { projectQuestId, questsForProject, windowOfPhase, type ProjectTowerInput } from "./projectQuests";
import { roofFloorKey, towerFloorKeys, towerLayout, type PlacedTowerCell, type TowerCell, type TowerFloor, type TowerRole } from "./towerRecord";

export { PROJECT_DUE_TIME, projectQuestId, type ProjectTowerInput } from "./projectQuests";
export { roofFloorKey, towerFloorKeys } from "./towerRecord";

/** What makes the screens know a project tower among the generated temples */
export const PROJECT_TEMPLE_PREFIX = "gen-project-";

/** One temple per type: a re-run replaces it (the trophies live with the project records) */
export const projectTempleId = (typeId: string): string => `${PROJECT_TEMPLE_PREFIX}${typeId}`;

export interface ProjectTowerFloor {
  floorKey: string;
  /** A phase id, or "roof" */
  phaseId: string;
  /** The roof shares the last phase's */
  window: PhaseWindow;
  /** The quests of the floor's chores, in list order */
  questIds: string[];
}

export interface ProjectTower {
  record: TempleInterface;
  quests: Achievement[];
  /** Bottom to top, the roof last */
  floors: ProjectTowerFloor[];
}

/** The way in: the middle of the frame's bottom row, where the Old House has its porch */
const DOOR_AT: [number, number] = [HOUSE_FRAME - 1, Math.floor(HOUSE_FRAME / 2)];

/** What the planner is told each cell is; it only treats the Boss Key's drawer differently, and that is not used here */
const PLANNER_KINDS: Record<TowerRole, HouseCellKind> = {
  entrance: "entrance", arrival: "stairsDown", chores: "quest", floorBoss: "quest", keyGuard: "guard", stairsUp: "stairsUp", finale: "boss", trophy: "master",
};

/** A cell before it is placed: what it hangs off (first placed wins), or the frame cell it is pinned to */
interface Draft {
  cell: TowerCell;
  parents: string[];
  at?: [number, number];
  /** "house" unless it is the sealed key guard's wing, which only its own link touches */
  zone?: HouseZone;
}

/** A cell of the key guard's wing: the planner keeps every house room off it and never walks through it */
const inWing = (draft: Draft): Draft => ({ ...draft, zone: "wing" });

const way = (id: string, name: string, role: TowerRole, parents: string[] = [], at?: [number, number]): Draft => ({
  cell: { id, name, role, questIds: [], biggest: 0 },
  parents,
  ...(at ? { at } : {}),
});

/** The biggest chore, the first on a tie */
const biggestOf = (chores: readonly ProjectChore[]): ProjectChore | undefined =>
  chores.reduce<ProjectChore | undefined>((best, chore) => {
    const isBigger = best === undefined || chore.difficulty > best.difficulty;
    return isBigger ? chore : best;
  }, undefined);

const namesOf = (chores: readonly ProjectChore[]): string => chores.map((chore) => `"${chore.name}"`).join(", ");

/** The chores the tower can hold: each on a floor of the type, the roof's one finale, and a chore on the last phase */
const checkChores = (input: ProjectTowerInput): void => {
  const { type, chores } = input;
  const floorIds = new Set([...type.phases.map((phase) => phase.id), ROOF_PHASE_ID]);
  const stray = chores.filter((chore) => !floorIds.has(chore.phaseId));
  if (stray.length > 0) throw new Error(`${type.towerName} has no floor for ${namesOf(stray)}`);
  const roof = chores.filter((chore) => chore.phaseId === ROOF_PHASE_ID);
  if (roof.length === 0) throw new Error(`${type.towerName} has no finale for its roof`);
  if (roof.length > 1) throw new Error(`The roof of ${type.towerName} holds one finale, not ${namesOf(roof)}`);
  const last = type.phases[type.phases.length - 1];
  const hasLastChore = chores.some((chore) => chore.phaseId === last?.id);
  if (!hasLastChore) throw new Error(`The last phase of ${type.name} needs a chore: its boss keeps the Boss Key`);
};

/**
 * The cells of a phase's floor, in the order they are placed: the way in, the boss's house room, then an open boss and
 * its stairs up before every other room, or, on the last phase, every other room, then the key guard, then its stairs
 */
const phaseDrafts = (anchor: Draft, chores: readonly ProjectChore[], rooms: readonly ProjectRoom[], questId: (choreId: string) => string, isLast: boolean): Draft[] => {
  const boss = biggestOf(chores);
  const roomCells = rooms.flatMap((room): Draft[] => {
    const held = chores.filter((chore) => {
      const isHeldHere = chore.roomId === room.id && chore !== boss;
      return isHeldHere;
    });
    if (held.length === 0) return [];
    const cell: TowerCell = { id: `room:${room.id}`, name: room.name, role: "chores", questIds: held.map((chore) => questId(chore.id)), biggest: biggestOf(held)?.difficulty ?? 0 };
    return [{ cell, parents: [anchor.cell.id] }];
  });
  if (!boss) return [anchor, way("stairsUp", "Stairs up", "stairsUp", [anchor.cell.id]), ...roomCells];

  const bossRoom = roomCells.find((draft) => draft.cell.id === `room:${boss.roomId}`);
  const bossName = rooms.find((room) => room.id === boss.roomId)?.name ?? boss.name;
  const bossCell: TowerCell = { id: "boss", name: bossName, role: isLast ? "keyGuard" : "floorBoss", questIds: [questId(boss.id)], biggest: boss.difficulty };
  const bossDraft: Draft = { cell: bossCell, parents: [...(bossRoom ? [bossRoom.cell.id] : []), anchor.cell.id] };
  const stairs = way("stairsUp", "Stairs up", "stairsUp", ["boss"]);
  const ownRoom = bossRoom ? [bossRoom] : [];
  const otherRooms = roomCells.filter((draft) => draft !== bossRoom);
  // An open boss goes first, so it still has a free side for its stairs. The sealed key guard goes after every chore
  // room, in its wing, and its stairs last of all: nothing can hang off either, and the guard's free sides always leave
  // the stairs a spot (a wing of two would often have none). The stairs may touch house rooms: they open only once the
  // guard's chore is done anyway.
  if (!isLast) return [anchor, ...ownRoom, bossDraft, stairs, ...otherRooms];
  return [anchor, ...ownRoom, ...otherRooms, inWing(bossDraft), stairs];
};

/**
 * The roof: the arrival, the finale beside it and the Trophy behind the finale (never beside the arrival: a grid has no
 * triangles). The sealed finale needs no wing: the Trophy is the only room behind it, and it belongs there.
 */
const roofDrafts = (anchor: Draft, finale: ProjectChore, questId: (choreId: string) => string): Draft[] => [
  anchor,
  { cell: { id: "finale", name: "The Roof", role: "finale", questIds: [questId(finale.id)], biggest: finale.difficulty }, parents: [anchor.cell.id] },
  way("trophy", "The Trophy", "trophy", ["finale"]),
];

/** The planner's plan for one floor, or its throw with the floor named */
const planOrSay = (key: string, cells: readonly HouseCell[], seed: string): HousePlan => {
  try {
    return planHouse(cells, seed);
  } catch (error) {
    throw new Error(`${key}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

/**
 * One floor planned on the shared frame. The planner lays a floor at a time on "1F" and trims it to its own box, so
 * the floor is moved back onto the frame by its pinned cell (the way in, or the arrival), whose spot is known.
 */
const planFloor = (key: string, drafts: readonly Draft[], seed: string): PlacedTowerCell[] => {
  const cells: HouseCell[] = drafts.map((draft) => ({
    id: draft.cell.id, name: draft.cell.name, kind: PLANNER_KINDS[draft.cell.role], floor: "1F",
    parents: draft.parents, prefer: [], zone: draft.zone ?? "house", questIds: [], ...(draft.at ? { at: draft.at } : {}),
  }));
  const plan = planOrSay(key, cells, `${seed}:${key}`);
  const [pin] = drafts;
  const pinned = plan.cells.find((placed) => placed.cell.id === pin.cell.id);
  const isPinnedPlaced = Boolean(pinned && pin.at);
  if (!isPinnedPlaced) throw new Error(`${key}: the plan lost its way in`);
  const [row, col] = pin.at ?? [0, 0];
  const shift = { row: row - (pinned?.row ?? 0), col: col - (pinned?.col ?? 0) };
  const byId = new Map(drafts.map((draft) => [draft.cell.id, draft.cell]));
  return plan.cells.flatMap((placed): PlacedTowerCell[] => {
    const cell = byId.get(placed.cell.id);
    return cell ? [{ cell, row: placed.row + shift.row, col: placed.col + shift.col }] : [];
  });
};

/** Where the stairs up of a planned floor stand: the next floor's arrival is pinned there */
const stairsOf = (key: string, placed: readonly PlacedTowerCell[]): [number, number] => {
  const stairs = placed.find((each) => each.cell.role === "stairsUp");
  if (!stairs) throw new Error(`${key}: the plan has no stairs up`);
  return [stairs.row, stairs.col];
};

/** Every floor of the tower, planned bottom to top, each arrival on the cell of the stairs below */
const planTower = (input: ProjectTowerInput, chores: readonly ProjectChore[], seed: string): TowerFloor[] => {
  const { type } = input;
  const keys = towerFloorKeys(type.phases.length);
  const rooms = houseRoomsOf(input.house);
  const questId = (choreId: string): string => projectQuestId(input.projectId, choreId);
  const floors: TowerFloor[] = [];
  let arrivalAt: [number, number] = DOOR_AT;
  type.phases.forEach((phase, index) => {
    const anchor = index === 0 ? way("entrance", "Front door", "entrance", [], DOOR_AT) : way("arrival", "Stairs down", "arrival", [], arrivalAt);
    const isLast = index === type.phases.length - 1;
    const drafts = phaseDrafts(anchor, chores.filter((chore) => chore.phaseId === phase.id), rooms, questId, isLast);
    const placed = planFloor(keys[index], drafts, seed);
    floors.push({ key: keys[index], cells: placed });
    arrivalAt = stairsOf(keys[index], placed);
  });
  const roofKey = roofFloorKey(type.phases.length);
  const finale = chores.find((chore) => chore.phaseId === ROOF_PHASE_ID);
  if (!finale) throw new Error(`${type.towerName} has no finale for its roof`);
  floors.push({ key: roofKey, cells: planFloor(roofKey, roofDrafts(way("arrival", "Stairs down", "arrival", [], arrivalAt), finale, questId), seed) });
  return floors;
};

/** The chores as the tower places them: one whose room the house lacks goes to the Whole House (the roof's stay put) */
const rehomed = (input: ProjectTowerInput): ProjectChore[] => rehomeChores(input.chores, input.house);

/**
 * The tower for a project: its temple record, a quest for every chore and its floors with their windows. Throws for a
 * chore list the tower cannot hold (see checkChores), a phase with no window, or a floor the planner has no room for
 * (the planner's message, with the floor named).
 */
export function buildProjectTower(input: ProjectTowerInput): ProjectTower {
  checkChores(input);
  const { type } = input;
  const keys = towerFloorKeys(type.phases.length);
  const phaseIds = [...type.phases.map((phase) => phase.id), ROOF_PHASE_ID];
  const floorKeys = new Map(phaseIds.map((phaseId, index) => [phaseId, keys[index]]));
  // checkChores has made sure every chore's phase is a floor of the tower
  const floorOf = (phaseId: string): string => floorKeys.get(phaseId) ?? roofFloorKey(type.phases.length);

  const seed = `project:${input.projectId}`;
  const record: TempleInterface = {
    id: projectTempleId(type.id),
    name: type.towerName,
    customName: type.towerName,
    categoryIds: [],
    level: 1,
    seed,
    themeId: "home",
    element: type.element,
    generated: true,
    dungeonLayout: towerLayout(planTower(input, rehomed(input), seed)),
  };
  const floors = phaseIds.map((phaseId, index): ProjectTowerFloor => ({
    floorKey: keys[index],
    phaseId,
    window: windowOfPhase(input.windows, phaseId),
    questIds: input.chores.filter((chore) => chore.phaseId === phaseId).map((chore) => projectQuestId(input.projectId, chore.id)),
  }));
  return { record, quests: questsForProject(input, floorOf), floors };
}
