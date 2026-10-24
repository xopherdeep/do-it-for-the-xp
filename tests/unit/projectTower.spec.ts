/**
 * A project tower: a floor per phase, each the family's own rooms holding that phase's chores, climbed by floor-cleared
 * stairs, with the finale on the roof behind the Boss Key door. A matrix of both project types, the Moving House
 * fixtures' homes and families proves the solver and the audit accept every tower, the Old House's way.
 */
import { addDays } from "date-fns";
import { PROJECT_TYPES } from "@/lib/services/core/packs/projects";
import type { ProjectType } from "@/lib/services/core/packs/projects";
import { dateKey, parseLocalDate } from "@/lib/services/core/packs/packCommon";
import type { PackHero } from "@/lib/services/core/packs/packCommon";
import type { MovingRoomId } from "@/lib/services/core/packs/movingPack";
import * as planner from "@/lib/services/core/packs/movingTemple/housePlanner";
import { suggestChores, type ProjectChore, type ProjectHouse } from "@/lib/services/projects/projectChores";
import { ROOF_PHASE_ID, phaseWindows } from "@/lib/services/projects/projectSchedule";
import { projectQuestId } from "@/lib/services/projects/projectQuests";
import {
  buildProjectTower,
  roofFloorKey,
  towerFloorKeys,
  type ProjectTower,
  type ProjectTowerInput,
} from "@/lib/services/projects/projectTower";
import { solveTemple } from "@/lib/engine/dungeons/generator";
import { auditTemple } from "@/lib/services/temples/templeAudit";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { FAMILIES, PARENT, ROOM_SETS, SIX, TWELVE } from "./movingHouseFixtures";

const START = "2027-04-03";
const NOW = new Date(2027, 3, 3, 9, 0);
const SPRING = PROJECT_TYPES["spring-cleaning"];

type Rooms = Partial<Record<MovingRoomId, number>>;

const endOf = (type: ProjectType): string => dateKey(addDays(parseLocalDate(START), type.defaultDays - 1));

/** The input the wizard would hand over: the suggested chores, the windows from the start to the type's default end */
const inputFor = (type: ProjectType, rooms: Rooms, heroes: readonly PackHero[]): ProjectTowerInput => {
  const house: ProjectHouse = { rooms };
  const chores = suggestChores(type, house, heroes);
  return { projectId: `${type.id}-${START}`, type, house, chores, windows: phaseWindows(type.phases, START, endOf(type)), now: NOW, heroes };
};

/** One placed room of the tower: its floor, cell, token and room table entry */
interface Cell { floor: string; row: number; col: number; token: string; room: Room }

const cellsOf = (tower: ProjectTower): Cell[] => {
  const layout = tower.record.dungeonLayout!;
  const maze = layout.maze as Record<string, string[][]>;
  return Object.entries(maze).flatMap(([floor, grid]) =>
    grid.flatMap((line, row) =>
      line.flatMap((token, col) => {
        const room = layout.rooms[token];
        const isRoom = Boolean(room) && room.type !== "wall";
        return isRoom ? [{ floor, row, col, token, room }] : [];
      }),
    ),
  );
};

const holding = (cells: Cell[], questId: string): Cell[] => cells.filter((cell) => (cell.room.content?.questIds ?? []).includes(questId));

/** The phase's biggest chore, the first on a tie */
const biggestOf = (chores: ProjectChore[]): ProjectChore => chores.reduce((best, chore) => (chore.difficulty > best.difficulty ? chore : best));

const isBeside = (a: Cell, b: Cell): boolean => Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;

const choresOf = (input: ProjectTowerInput, phaseId: string): ProjectChore[] => input.chores.filter((chore) => chore.phaseId === phaseId);

/** The tower floor a phase's chores belong to */
const floorKeyOf = (type: ProjectType, phaseId: string): string =>
  phaseId === ROOF_PHASE_ID ? roofFloorKey(type.phases.length) : towerFloorKeys(type.phases.length)[type.phases.findIndex((phase) => phase.id === phaseId)];

// ---------------------------------------------------------------------------------------------------------------
// The matrix: both types x the fixtures' ticked rooms (some room ticked) x families

type Case = [string, ProjectType, Rooms, PackHero[]];

const MATRIX: Case[] = Object.values(PROJECT_TYPES).flatMap((type) =>
  ROOM_SETS.filter(([label]) => label !== "nothing ticked").flatMap(([roomsLabel, rooms]) =>
    FAMILIES.map(([familyLabel, heroes]): Case => [`${type.name}, ${roomsLabel}, ${familyLabel}`, type, rooms, heroes]),
  ),
);

describe("towerFloorKeys", () => {
  it("numbers a floor per phase and puts the roof on the next number up", () => {
    expect(towerFloorKeys(4)).toEqual(["1F", "2F", "3F", "4F", "5F"]);
    expect(towerFloorKeys(1)).toEqual(["1F", "2F"]);
    expect(roofFloorKey(4)).toBe("5F");
  });
});

describe("every tower the wizard can build", () => {
  const built = new Map<string, { input: ProjectTowerInput; tower: ProjectTower; cells: Cell[] }>();
  const towerOf = (label: string, type: ProjectType, rooms: Rooms, heroes: PackHero[]) => {
    if (!built.has(label)) {
      const input = inputFor(type, rooms, heroes);
      const tower = buildProjectTower(input);
      built.set(label, { input, tower, cells: cellsOf(tower) });
    }
    return built.get(label)!;
  };

  it.each(MATRIX)("%s: can be finished, and the audit passes", (label, type, rooms, heroes) => {
    const { tower } = towerOf(label, type, rooms, heroes);
    const solved = solveTemple(tower.record.dungeonLayout!);
    expect(solved.reasons).toEqual([]);
    expect(solved.solvable).toBe(true);
    expect(auditTemple(tower.record).passed).toBe(true);
  });

  it.each(MATRIX)("%s: is the type's generated tower, a floor per phase and the roof, entered on 1F", (label, type, rooms, heroes) => {
    const { input, tower, cells } = towerOf(label, type, rooms, heroes);
    const { record } = tower;
    expect(record).toMatchObject({
      id: `gen-project-${type.id}`,
      name: type.towerName,
      generated: true,
      element: type.element,
      themeId: "home",
      seed: `project:${input.projectId}`,
    });
    const layout = record.dungeonLayout!;
    const maze = layout.maze as Record<string, string[][]>;
    expect(Object.keys(maze)).toEqual(towerFloorKeys(type.phases.length));
    for (const grid of Object.values(maze)) expect(Math.max(grid.length, ...grid.map((line) => line.length))).toBeLessThanOrEqual(9);
    const [floorIndex, row, col] = layout.entrance;
    expect(Object.keys(maze)[floorIndex]).toBe("1F");
    expect(layout.rooms[maze["1F"][row][col]].type).toBe("entrance");
    expect(cells.filter((cell) => cell.room.type === "entrance")).toHaveLength(1);
  });

  it.each(MATRIX)("%s: holds every chore's quest in exactly one room, on its phase's floor", (label, type, rooms, heroes) => {
    const { input, tower, cells } = towerOf(label, type, rooms, heroes);
    for (const chore of input.chores) {
      const held = holding(cells, projectQuestId(input.projectId, chore.id));
      expect(held).toHaveLength(1);
      expect(held[0].floor).toBe(floorKeyOf(type, chore.phaseId));
    }
    const everyHeld = cells.flatMap((cell) => (cell.room.content?.questIds ?? []) as string[]);
    expect([...everyHeld].sort()).toEqual(tower.quests.map((quest) => String(quest.id)).sort());
    expect(tower.quests.map((quest) => quest.id)).toEqual(input.chores.map((chore) => projectQuestId(input.projectId, chore.id)));
  });

  it.each(MATRIX)("%s: lists its floors with their phases, windows and quests", (label, type, rooms, heroes) => {
    const { input, tower } = towerOf(label, type, rooms, heroes);
    const last = input.windows[input.windows.length - 1];
    expect(tower.floors.map((floor) => floor.floorKey)).toEqual(towerFloorKeys(type.phases.length));
    expect(tower.floors.map((floor) => floor.phaseId)).toEqual([...type.phases.map((phase) => phase.id), ROOF_PHASE_ID]);
    expect(tower.floors.map((floor) => floor.window)).toEqual([...input.windows, last]);
    for (const floor of tower.floors) {
      expect(floor.questIds).toEqual(choresOf(input, floor.phaseId).map((chore) => projectQuestId(input.projectId, chore.id)));
    }
  });

  it.each(MATRIX)("%s: gives each phase's biggest chore the floor's boss room, the last one the sealed mini-boss with the Boss Key", (label, type, rooms, heroes) => {
    const { input, cells } = towerOf(label, type, rooms, heroes);
    const bossTokens = new Set<string>();
    type.phases.forEach((phase, index) => {
      const chores = choresOf(input, phase.id);
      if (chores.length === 0) return;
      const bossId = projectQuestId(input.projectId, biggestOf(chores).id);
      const [boss] = holding(cells, bossId);
      bossTokens.add(boss.token);
      expect(boss.room.content).toMatchObject({ questIds: [bossId], difficulty: "boss" });
      expect(boss.room.locked).toBeUndefined();
      const isLast = index === type.phases.length - 1;
      const sealed = { type: "miniboss", content: expect.objectContaining({ lockOnEnter: true, drops: { chest: "dungeon", dungeon: "master-key" } }) };
      expect(boss.room).toMatchObject(isLast ? sealed : { type: "monster", content: expect.not.objectContaining({ lockOnEnter: true }) });
    });
    expect(cells.filter((cell) => cell.room.type === "miniboss")).toHaveLength(1);
    // Every other chore room of a phase floor is an open monster room
    const roof = roofFloorKey(type.phases.length);
    const others = cells.filter((cell) => {
      const isOtherChoreRoom = cell.floor !== roof && Boolean(cell.room.content?.questIds) && !bossTokens.has(cell.token);
      return isOtherChoreRoom;
    });
    for (const cell of others) {
      expect(cell.room.type).toBe("monster");
      expect(cell.room.content?.lockOnEnter).toBeUndefined();
      expect(cell.room.locked).toBeUndefined();
    }
  });

  it.each(MATRIX)("%s: climbs by floor-cleared stairs beside the floor boss to the same cell of the next floor", (label, type, rooms, heroes) => {
    const { input, cells } = towerOf(label, type, rooms, heroes);
    const keys = towerFloorKeys(type.phases.length);
    keys.slice(0, -1).forEach((floor, index) => {
      const next = keys[index + 1];
      const ups = cells.filter((cell) => cell.floor === floor && cell.room.type === "stairs-up");
      expect(ups).toHaveLength(1);
      const [up] = ups;
      expect(up.room.content).toMatchObject({ locked: "floorCleared", targetLevel: next, targetCoords: { x: up.col, y: up.row } });
      const downs = cells.filter((cell) => cell.floor === next && cell.room.type === "stairs-down");
      expect(downs).toHaveLength(1);
      expect([downs[0].row, downs[0].col]).toEqual([up.row, up.col]);
      expect(downs[0].room.content).toMatchObject({ targetLevel: floor, targetCoords: { x: up.col, y: up.row } });
      const chores = choresOf(input, type.phases[index].id);
      if (chores.length === 0) return;
      const [boss] = holding(cells, projectQuestId(input.projectId, biggestOf(chores).id));
      expect(isBeside(up, boss)).toBe(true);
    });
    expect(cells.filter((cell) => cell.floor === keys[keys.length - 1] && cell.room.type === "stairs-up")).toEqual([]);
  });

  it.each(MATRIX)("%s: roofs the tower with the arrival, the finale behind the Boss Key door, and The Trophy", (label, type, rooms, heroes) => {
    const { input, cells } = towerOf(label, type, rooms, heroes);
    const roof = cells.filter((cell) => cell.floor === roofFloorKey(type.phases.length));
    expect(roof.map((cell) => cell.room.type).sort()).toEqual(["boss", "master", "stairs-down"]);
    const finale = input.chores.find((chore) => chore.phaseId === ROOF_PHASE_ID)!;
    const boss = roof.find((cell) => cell.room.type === "boss")!;
    expect(boss.room.content).toMatchObject({ questIds: [projectQuestId(input.projectId, finale.id)], difficulty: "boss", lockOnEnter: true });
    const trophy = roof.find((cell) => cell.room.type === "master")!;
    expect(trophy.room.content).toMatchObject({ name: "The Trophy", pegasus: true });
    expect(isBeside(trophy, boss)).toBe(true);
    expect(cells.filter((cell) => cell.room.type === "boss")).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------
// The edges: odd chore lists, and a planner that runs out of room

describe("buildProjectTower", () => {
  const family = [PARENT, TWELVE, SIX];
  const base = (): ProjectTowerInput => inputFor(SPRING, { kitchen: 1, bedroom: 2, bathroom: 1 }, family);

  it("builds the same tower from the same input", () => {
    expect(buildProjectTower(base())).toEqual(buildProjectTower(base()));
  });

  it("puts a chore whose room the house lacks in The Whole House", () => {
    const input = base();
    const stray: ProjectChore = { id: "custom:attic", phaseId: SPRING.phases[0].id, roomId: "attic", name: "Sort the Attic", difficulty: 1, assignee: ["twelve"], custom: true };
    const tower = buildProjectTower({ ...input, chores: [...input.chores, stray] });
    const rooms = holding(cellsOf(tower), projectQuestId(input.projectId, stray.id));
    expect(rooms).toHaveLength(1);
    expect(rooms[0].room.content?.name).toBe("The Whole House");
  });

  it("climbs past a middle phase with no chores, from its arrival", () => {
    const input = base();
    const middle = SPRING.phases[1].id;
    const tower = buildProjectTower({ ...input, chores: input.chores.filter((chore) => chore.phaseId !== middle) });
    const floor = cellsOf(tower).filter((cell) => cell.floor === "2F");
    expect(floor.map((cell) => cell.room.type).sort()).toEqual(["stairs-down", "stairs-up"]);
    const solved = solveTemple(tower.record.dungeonLayout!);
    expect(solved.reasons).toEqual([]);
    expect(auditTemple(tower.record).passed).toBe(true);
  });

  it("refuses a chore of a floor the type does not have", () => {
    const input = base();
    const lost: ProjectChore = { id: "lost", phaseId: "p9", roomId: "kitchen", name: "Lost Chore", difficulty: 1, assignee: [] };
    expect(() => buildProjectTower({ ...input, chores: [...input.chores, lost] })).toThrow(/Lost Chore/);
  });

  it("refuses a tower whose last phase has no chore, since its boss keeps the Boss Key", () => {
    const input = base();
    const last = SPRING.phases[SPRING.phases.length - 1].id;
    expect(() => buildProjectTower({ ...input, chores: input.chores.filter((chore) => chore.phaseId !== last) })).toThrow(/last phase/i);
  });

  it("refuses a roof with no finale, or with more than one", () => {
    const input = base();
    const finale = input.chores.find((chore) => chore.phaseId === ROOF_PHASE_ID)!;
    const others = input.chores.filter((chore) => chore !== finale);
    expect(() => buildProjectTower({ ...input, chores: others })).toThrow(/finale/i);
    const second = { ...finale, id: "roof:extra:roof", name: "Extra Boss" };
    expect(() => buildProjectTower({ ...input, chores: [...input.chores, second] })).toThrow(/Extra Boss/);
  });

  it("names the floor when the planner has no room", () => {
    const real = planner.planHouse;
    const spy = jest.spyOn(planner, "planHouse").mockImplementation((cells, seed) => {
      const isSecondFloor = spy.mock.calls.length === 2;
      if (isSecondFloor) throw new Error("The house has no room for Kitchen");
      return real(cells, seed);
    });
    try {
      expect(() => buildProjectTower(base())).toThrow("2F: The house has no room for Kitchen");
    } finally {
      spy.mockRestore();
    }
  });
});
