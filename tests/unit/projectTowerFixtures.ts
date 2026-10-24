/**
 * Shared by the project tower specs: the input the wizard hands over, the tower read back as placed rooms, and the
 * questions the specs ask of it (which rooms hold a quest, which chore rooms a hero cannot reach without walking through
 * a sealed room). Pure data and builders; no mocks.
 */
import { addDays } from "date-fns";
import { PROJECT_TYPES } from "@/lib/services/core/packs/projects";
import type { ProjectType } from "@/lib/services/core/packs/projects";
import { dateKey, parseLocalDate } from "@/lib/services/core/packs/packCommon";
import type { PackHero } from "@/lib/services/core/packs/packCommon";
import type { MovingRoomId } from "@/lib/services/core/packs/movingPack";
import { suggestChores, type ProjectChore, type ProjectHouse } from "@/lib/services/projects/projectChores";
import { ROOF_PHASE_ID, phaseWindows } from "@/lib/services/projects/projectSchedule";
import { roofFloorKey, towerFloorKeys, type ProjectTower, type ProjectTowerInput } from "@/lib/services/projects/projectTower";
import type { Room } from "@/lib/engine/core/dungeons/types";

export const START = "2027-04-03";
export const NOW = new Date(2027, 3, 3, 9, 0);
export const SPRING = PROJECT_TYPES["spring-cleaning"];

export type Rooms = Partial<Record<MovingRoomId, number>>;

/** Start days for the seed sweep: the start date is in the project id, so each one plans different floors */
export const SWEEP_STARTS = Array.from({ length: 12 }, (_, month) => `2027-${String(month + 1).padStart(2, "0")}-07`);

export const endOf = (type: ProjectType, start: string): string => dateKey(addDays(parseLocalDate(start), type.defaultDays - 1));

/** The input the wizard would hand over: the suggested chores, the windows from the start to the type's default end */
export const inputFor = (type: ProjectType, rooms: Rooms, heroes: readonly PackHero[], start = START): ProjectTowerInput => {
  const house: ProjectHouse = { rooms };
  const chores = suggestChores(type, house, heroes);
  return { projectId: `${type.id}-${start}`, type, house, chores, windows: phaseWindows(type.phases, start, endOf(type, start)), now: NOW, heroes };
};

/** One placed room of the tower: its floor, cell, token and room table entry */
export interface Cell { floor: string; row: number; col: number; token: string; room: Room }

export const cellsOf = (tower: ProjectTower): Cell[] => {
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

export const holding = (cells: Cell[], questId: string): Cell[] => cells.filter((cell) => (cell.room.content?.questIds ?? []).includes(questId));

/** The phase's biggest chore, the first on a tie */
export const biggestOf = (chores: ProjectChore[]): ProjectChore => chores.reduce((best, chore) => (chore.difficulty > best.difficulty ? chore : best));

export const isBeside = (a: Cell, b: Cell): boolean => Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;

export const isSealed = (cell: Cell): boolean => cell.room.content?.lockOnEnter === true;

/**
 * The chore rooms a hero cannot reach from where they come in on a floor (the entrance or the arrival) without walking
 * through a sealed room: a sealed room may be entered, never walked through. "4F (1,1) Bedroom 3" style.
 */
export const strandedChoreRooms = (cells: Cell[]): string[] =>
  [...new Set(cells.map((cell) => cell.floor))].flatMap((floor) => {
    const onFloor = cells.filter((cell) => cell.floor === floor);
    const at = new Map(onFloor.map((cell) => [`${cell.row},${cell.col}`, cell]));
    const start = onFloor.find((cell) => ["entrance", "stairs-down"].includes(cell.room.type));
    const reached = new Set<Cell>(start ? [start] : []);
    const queue = [...reached];
    for (let i = 0; i < queue.length; i++) {
      if (isSealed(queue[i])) continue;
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const next = at.get(`${queue[i].row + dr},${queue[i].col + dc}`);
        const isNew = next !== undefined && !reached.has(next);
        if (isNew) {
          reached.add(next);
          queue.push(next);
        }
      }
    }
    const isStranded = (cell: Cell): boolean => Boolean(cell.room.content?.questIds) && !reached.has(cell);
    return onFloor.filter(isStranded).map((cell) => `${floor} (${cell.row},${cell.col}) ${cell.room.content?.name}`);
  });

export const choresOf = (input: ProjectTowerInput, phaseId: string): ProjectChore[] => input.chores.filter((chore) => chore.phaseId === phaseId);

/** The tower floor a phase's chores belong to */
export const floorKeyOf = (type: ProjectType, phaseId: string): string =>
  phaseId === ROOF_PHASE_ID ? roofFloorKey(type.phases.length) : towerFloorKeys(type.phases.length)[type.phases.findIndex((phase) => phase.id === phaseId)];
