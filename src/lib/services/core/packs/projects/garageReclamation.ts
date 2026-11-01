/**
 * Garage Reclamation: a two week fire tower of four floors, Triage and Purge, Rafters and Walls, Bin and Label and
 * Floor Sweep, and a roof for The Two-Car Park-In.
 */
import type { MovingRoomId } from "../movingPack";
import type { ProjectChoreSuggestion, ProjectType } from "./projectTypes";

type GarageRooms = readonly MovingRoomId[] | "house";
type GarageWho = ProjectChoreSuggestion["who"];

const chore = (
  slug: string, name: string, rooms: GarageRooms, who: GarageWho, difficulty: number, minutes: number,
): ProjectChoreSuggestion => ({ slug, name, rooms, difficulty, who, minutes });

const TRIAGE_AND_PURGE: readonly ProjectChoreSuggestion[] = [
  chore("trash-bag-hunt", "Toss Loose Trash and Wrappers", ["garage"], "little", 1, 15),
  chore("sports-gear-corral", "Gather Balls and Sports Gear", ["garage"], "kid", 2, 25),
  chore("sort-keep-donate", "Separate Keep from Donate", "house", "kid", 3, 60),
  chore("haul-broken-junk", "Load Junk for the Dump", ["garage"], "grownup", 5, 60),
  chore("clear-hazard-bottles", "Safely Box Paint and Chemicals", ["garage"], "grownup", 5, 45),
];

const RAFTERS_AND_WALLS: readonly ProjectChoreSuggestion[] = [
  chore("sweep-cobwebs", "Brush Down High Cobwebs", "house", "little", 1, 15),
  chore("wipe-tool-benches", "Scrub the Workbench Surface", ["garage"], "kid", 2, 30),
  chore("pegboard-hangers", "Hang Hand Tools on Pegboards", ["garage"], "kid", 3, 45),
  chore("install-shelf-racks", "Assemble Sturdy Metal Shelving", ["garage"], "grownup", 8, 90),
];

const BIN_AND_LABEL: readonly ProjectChoreSuggestion[] = [
  chore("match-loose-hardware", "Sort Loose Screws and Nails", ["garage"], "little", 2, 30),
  chore("fill-plastic-totes", "Pack Gear into Clear Totes", ["garage"], "kid", 3, 45),
  chore("label-maker-fun", "Label Each Storage Tote", "house", "kid", 2, 25),
  chore("stack-heavy-totes", "Stack Heavy Totes on Shelves", ["garage"], "grownup", 5, 45),
];

const FLOOR_SWEEP: readonly ProjectChoreSuggestion[] = [
  chore("dustpan-assist", "Hold the Dustpan for Sweeping", ["garage"], "little", 1, 15),
  chore("push-broom-blitz", "Push-Broom the Entire Floor", "house", "kid", 3, 30),
  chore("degrease-oil-spots", "Scrub Oil Spots with Degreaser", ["garage"], "grownup", 5, 45),
];

export const GARAGE_RECLAMATION: ProjectType = {
  id: "garage-reclamation",
  name: "Garage Reclamation",
  towerName: "The Forgotten Foundry",
  element: "fire",
  defaultDays: 14,
  phases: [
    { id: "triage-and-purge", name: "Triage and Purge", share: 0.35, chores: TRIAGE_AND_PURGE },
    { id: "rafters-and-walls", name: "Rafters and Walls", share: 0.25, chores: RAFTERS_AND_WALLS },
    { id: "bin-and-label", name: "Bin and Label", share: 0.25, chores: BIN_AND_LABEL },
    { id: "floor-sweep", name: "Floor Sweep", share: 0.15, chores: FLOOR_SWEEP },
  ],
  finale: chore("two-car-park-in", "The Two-Car Park-In", "house", "team", 8, 45),
};
