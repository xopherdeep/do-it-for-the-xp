/**
 * The chores of a dressed dungeon (docs/Quest-Rooms-Spec.md sections 10 and 11, and the design's "Chores"): which
 * fights are the mini-bosses, which are the must-clear monsters, and the quest template each fight room holds.
 *
 * - The rooms the plan names as mini-bosses' (`minibossRooms`) are mini-bosses first: a dungeon whose Boss Key the
 *   rule below leaves in reach (the solver's R4) names the room that keeps it out of reach.
 * - A must-clear room whose door opens straight on the Big Key chest or the Big Chest guards it: a mini-boss. When
 *   the plan lists more mini-bosses than that finds, the must-clear rooms nearest the Big Key chest, then the Big
 *   Chest, are the extra ones; when it lists fewer, the rest stay must-clear monsters.
 * - The must-clear monster rooms take the plan's chores in path order from the entrance, easiest first (a stable
 *   sort keeps the plan's order among equals). A plan short of rooms repeats itself; the repeats are reported.
 * - A starter beast beyond the must-clear count (the plan lists starters first) gets a side room of its own, nearest
 *   the entrance, so the family's first chores still fill rooms (`overflow`); any other extra leaves (`left`).
 * - The other side rooms cycle through the beasts of their floor's must-clear rooms, a floor with none borrowing the
 *   nearest floor's, so a side room never adds a chore of its own.
 */
import type { RoomQuestTemplate } from "@/lib/engine/core/dungeons/types";
import { floorHeight } from "@/lib/engine/core/dungeons/floorOrder";
import type { TempleGraph } from "@/lib/engine/dungeons/generator/templeGraph";
import { STARTER_QUESTS } from "@/lib/services/core/StarterWorld";
import { templateFor, type PlanQuest } from "../questPlan";
import { DIRECTIONS, STEP, allSlots, sameCell, slotAt, type Board, type CellRef, type Slot } from "./dressBoard";
import { hopsFrom, sidesKey, type Sides } from "./dressDoors";
import type { ClassicPlan } from "./dressPlans";

export type FightType = "monster" | "miniboss" | "boss";

export interface FightRole {
  type: FightType;
  template: RoomQuestTemplate;
  /** The room shuts its doors until the fight is won (must-clear rooms, mini-bosses and the boss) */
  sealed: boolean;
}

export interface ChorePlan {
  /** By room key (floor:row,col) */
  roles: Map<string, FightRole>;
  /** Must-clear monster rooms (mini-bosses not counted) */
  mustClear: number;
  /** Beasts a must-clear room had to repeat */
  repeats: string[];
  /** Starter beasts given a side room because the must-clear rooms ran out */
  overflow: string[];
  /** Plan beasts that found no room */
  left: string[];
}

const starterBeasts = new Set(STARTER_QUESTS.map((quest) => quest.beastId).filter((beastId): beastId is string => Boolean(beastId)));

const isStarter = ([slug]: PlanQuest): boolean => starterBeasts.has(`beast-${slug}`);

/** Where the Boss Key and the relic wait: a chest, or the fight that drops the Boss Key or hands either out (dressPlace) */
const prizeSlots = (board: Board): { bigKey?: Slot; bigChest?: Slot } => ({
  bigKey: allSlots(board).find((slot) => slot.item?.kind === "bigKey" || slot.item?.keyDrop === "big" || Boolean(slot.item?.holds?.some((held) => held.kind === "bigKey"))),
  bigChest: allSlots(board).find((slot) => slot.item?.kind === "bigChest" || Boolean(slot.item?.holds?.some((held) => held.kind === "bigChest"))),
});

/** A fight room with a door straight into the cell that holds `prize` */
const opensOn = (board: Board, sides: Map<string, Sides>, slot: Slot, prize: Slot | undefined): boolean => {
  if (!prize) return false;
  return DIRECTIONS.some((direction) => {
    const beside = { floor: slot.at.floor, row: slot.at.row + STEP[direction][0], col: slot.at.col + STEP[direction][1] };
    const isDoor = sides.get(sidesKey(slot.at))?.[direction] !== "wall";
    return isDoor && Boolean(slotAt(board, beside)) && sameCell(beside, prize.at);
  });
};

/** Rooms in order of path distance (every door open), floors in the dungeon's order then reading order among equals */
const byDistance = (board: Board, hops: Map<string, number>) => (a: Slot, b: Slot): number => {
  const far = Number.MAX_SAFE_INTEGER;
  const byHops = (hops.get(sidesKey(a.at)) ?? far) - (hops.get(sidesKey(b.at)) ?? far);
  const floors = board.floors.map((floor) => floor.name);
  return byHops || floors.indexOf(a.at.floor) - floors.indexOf(b.at.floor) || a.at.row - b.at.row || a.at.col - b.at.col;
};

const difficultyWord = (difficulty: number): "easy" | "normal" => (difficulty <= 1 ? "easy" : "normal");

export const templateDifficulty = (template: RoomQuestTemplate): "easy" | "normal" => difficultyWord(template.difficulty);

/** The plan's chores for `count` rooms: the first `count`, cycling when the plan is short (the repeats are listed) */
const dealMustClear = (plan: ClassicPlan, count: number, repeats: string[]): PlanQuest[] => {
  const isEmptyPlan = plan.mustClear.length === 0 && count > 0;
  if (isEmptyPlan) throw new Error(`${plan.name}: the plan lists no must-clear chores for ${count} must-clear rooms`);
  const dealt = Array.from({ length: count }, (_, index) => plan.mustClear[index % plan.mustClear.length]);
  const seen = new Set<string>();
  for (const [slug] of dealt) {
    const isRepeat = seen.has(slug) && !repeats.includes(slug);
    if (isRepeat) repeats.push(slug);
    seen.add(slug);
  }
  return dealt;
};

/** The floor whose must-clear beasts a floor with none borrows: the nearest in height, the lower one first */
const nearestFloorWithBeasts = (board: Board, floor: string, lists: Map<string, RoomQuestTemplate[]>): string | undefined =>
  board.floors
    .map((level) => level.name)
    .filter((name) => (lists.get(name) ?? []).length > 0)
    .sort((a, b) => Math.abs(floorHeight(a) - floorHeight(floor)) - Math.abs(floorHeight(b) - floorHeight(floor)) || floorHeight(a) - floorHeight(b))[0];

/** The fights of the rooms the plan names as mini-bosses' (dressBoard made each one must-clear), in the plan's order */
const namedMinibosses = (plan: ClassicPlan, mustClearSlots: Slot[]): Slot[] => {
  const names = plan.minibossRooms ?? [];
  const isOverNamed = names.length > plan.minibosses.length;
  if (isOverNamed) throw new Error(`${plan.name}: ${names.length} mini-boss rooms named for ${plan.minibosses.length} mini-bosses in the plan`);
  return names.map((name) => {
    const fight = mustClearSlots.find((slot) => slot.item!.room === name);
    if (!fight) throw new Error(`${plan.name}: the mini-boss room ${name} has no fight on the board`);
    return fight;
  });
};

/** Deal the plan's chores out to the fights of the board. `graph` is the dungeon as built so far, every door open. */
export const planChores = (board: Board, plan: ClassicPlan, graph: TempleGraph, sides: Map<string, Sides>): ChorePlan => {
  if (!graph.entrance) throw new Error(`${plan.name}: the dungeon has no entrance to walk from`);
  const hops = hopsFrom(graph, graph.entrance);
  const nearestFirst = byDistance(board, hops);
  const roles = new Map<string, FightRole>();
  const report: ChorePlan = { roles, mustClear: 0, repeats: [], overflow: [], left: [] };
  const setRole = (slot: Slot, type: FightType, quest: PlanQuest, sealed: boolean): void => {
    roles.set(sidesKey(slot.at), { type, template: templateFor(quest), sealed });
  };

  // The boss
  const boss = allSlots(board).find((slot) => slot.item?.kind === "boss");
  if (boss) setRole(boss, "boss", plan.boss, true);

  // The mini-bosses: the rooms the plan names, then the must-clear rooms that open on the Boss Key chest or the Big
  // Chest, then the nearest to them
  const mustClearSlots = allSlots(board).filter((slot) => slot.item?.kind === "mustClearFight");
  const { bigKey, bigChest } = prizeSlots(board);
  const toBigKey = bigKey ? hopsFrom(graph, sidesKey(bigKey.at)) : new Map<string, number>();
  const toBigChest = bigChest ? hopsFrom(graph, sidesKey(bigChest.at)) : new Map<string, number>();
  const nearestThePrizes = (a: Slot, b: Slot): number => {
    const far = Number.MAX_SAFE_INTEGER;
    return (toBigKey.get(sidesKey(a.at)) ?? far) - (toBigKey.get(sidesKey(b.at)) ?? far) || (toBigChest.get(sidesKey(a.at)) ?? far) - (toBigChest.get(sidesKey(b.at)) ?? far) || nearestFirst(a, b);
  };
  const wanted = plan.minibosses.length;
  const named = namedMinibosses(plan, mustClearSlots);
  const guards = mustClearSlots.filter((slot) => !named.includes(slot) && (opensOn(board, sides, slot, bigKey) || opensOn(board, sides, slot, bigChest))).sort(nearestThePrizes);
  const minibosses = [...named, ...guards].slice(0, wanted);
  const isShortOfGuards = minibosses.length < wanted;
  if (isShortOfGuards) {
    const extras = mustClearSlots.filter((slot) => !minibosses.includes(slot)).sort(nearestThePrizes);
    minibosses.push(...extras.slice(0, wanted - minibosses.length));
  }
  minibosses.sort(nearestFirst).forEach((slot, index) => setRole(slot, "miniboss", plan.minibosses[index], true));

  // The must-clear monsters: easiest first in path order
  const monsters = mustClearSlots.filter((slot) => !minibosses.includes(slot)).sort(nearestFirst);
  report.mustClear = monsters.length;
  const dealt = dealMustClear(plan, monsters.length, report.repeats);
  const easiestFirst = [...dealt].sort((a, b) => a[1] - b[1]);
  monsters.forEach((slot, index) => setRole(slot, "monster", easiestFirst[index], true));

  // The side rooms: overflow starters nearest the entrance first, then each floor's must-clear beasts in turn
  const sideSlots = allSlots(board)
    .filter((slot) => slot.item?.kind === "sideFight")
    .sort(nearestFirst);
  const spare = plan.mustClear.slice(monsters.length);
  const overflowStarters = plan.mustClear.length > monsters.length ? spare.filter(isStarter) : [];
  const placedStarters = overflowStarters.slice(0, sideSlots.length);
  placedStarters.forEach((quest, index) => setRole(sideSlots[index], "monster", quest, false));
  report.overflow = placedStarters.map(([slug]) => slug);
  report.left = spare.filter((quest) => !placedStarters.includes(quest)).map(([slug]) => slug);

  const perFloor = new Map<string, RoomQuestTemplate[]>();
  for (const slot of monsters) {
    const list = perFloor.get(slot.at.floor) ?? [];
    list.push(roles.get(sidesKey(slot.at))!.template);
    perFloor.set(slot.at.floor, list);
  }
  const counters = new Map<string, number>();
  for (const slot of sideSlots.slice(placedStarters.length)) {
    const floor = slot.at.floor;
    const source = (perFloor.get(floor) ?? []).length > 0 ? floor : nearestFloorWithBeasts(board, floor, perFloor);
    const list = source ? perFloor.get(source)! : [templateFor(plan.mustClear[0])];
    const isBorrowingThePlan = !source;
    if (isBorrowingThePlan) {
      const isNewRepeat = !report.repeats.includes(plan.mustClear[0][0]);
      if (isNewRepeat) report.repeats.push(plan.mustClear[0][0]);
    }
    const turn = counters.get(floor) ?? 0;
    counters.set(floor, turn + 1);
    const template = JSON.parse(JSON.stringify(list[turn % list.length])) as RoomQuestTemplate;
    roles.set(sidesKey(slot.at), { type: "monster", template, sealed: false });
  }
  return report;
};

/** The room key of a cell, as the roles are filed */
export const roleKey = (at: CellRef): string => sidesKey(at);
