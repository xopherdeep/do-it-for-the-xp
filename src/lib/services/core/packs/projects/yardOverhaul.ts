/**
 * Yard Overhaul: a two week earth tower of four floors, Debris Clear, Bed Prep, Planting and Craft and Garden Polish,
 * and a roof for Backyard Grand Campout.
 */
import type { MovingRoomId } from "../movingPack";
import type { ProjectChoreSuggestion, ProjectType } from "./projectTypes";

type YardRooms = readonly MovingRoomId[] | "house";
type YardWho = ProjectChoreSuggestion["who"];

const chore = (
  slug: string, name: string, rooms: YardRooms, who: YardWho, difficulty: number, minutes: number,
): ProjectChoreSuggestion => ({ slug, name, rooms, difficulty, who, minutes });

const DEBRIS_CLEAR: readonly ProjectChoreSuggestion[] = [
  chore("stick-pickup", "Gather Fallen Sticks", ["yard"], "little", 1, 15),
  chore("rake-leaves", "Rake Leaves and Pinecones", ["yard"], "kid", 3, 45),
  chore("weed-flowerbeds", "Pull Weeds from the Beds", ["yard"], "kid", 3, 45),
  chore("prune-branches", "Prune Dead Tree Branches", ["yard"], "grownup", 5, 60),
  chore("haul-yard-bags", "Haul Lawn Bags to the Curb", "house", "grownup", 5, 30),
];

const BED_PREP: readonly ProjectChoreSuggestion[] = [
  chore("wash-plant-pots", "Wash Old Planter Pots", "house", "little", 2, 20),
  chore("turn-the-soil", "Turn and Till Garden Soil", ["yard"], "grownup", 5, 60),
  chore("spread-compost", "Wheelbarrow and Spread Compost", ["yard"], "kid", 3, 45),
  chore("edge-garden-paths", "Edge the Garden Borders", ["yard"], "grownup", 5, 45),
];

const PLANTING_AND_CRAFT: readonly ProjectChoreSuggestion[] = [
  chore("plant-flower-seeds", "Sow Flower and Veggie Seeds", "house", "little", 2, 30),
  chore("spread-fresh-mulch", "Spread the Fresh Mulch", ["yard"], "kid", 3, 60),
  chore("scrub-patio-chairs", "Scrub the Patio Furniture", ["yard"], "kid", 2, 30),
  chore("hose-the-patio", "Power Wash the Pavers", ["yard"], "grownup", 5, 60),
];

const GARDEN_POLISH: readonly ProjectChoreSuggestion[] = [
  chore("water-new-sprouts", "Water the New Plantings", "house", "little", 1, 15),
  chore("hang-bird-feeders", "Fill and Hang Bird Feeders", ["yard"], "little", 1, 15),
  chore("mow-the-lawn", "Mow the Lawn to Perfection", ["yard"], "grownup", 5, 45),
  chore("patio-string-lights", "String Up the Patio Lights", ["yard"], "grownup", 5, 30),
];

export const YARD_OVERHAUL: ProjectType = {
  id: "yard-overhaul",
  name: "Yard Overhaul",
  towerName: "The Overgrown Bastion",
  element: "earth",
  defaultDays: 14,
  phases: [
    { id: "debris-clear", name: "Debris Clear", share: 0.3, chores: DEBRIS_CLEAR },
    { id: "bed-prep", name: "Bed Prep", share: 0.3, chores: BED_PREP },
    { id: "planting-and-craft", name: "Planting and Craft", share: 0.25, chores: PLANTING_AND_CRAFT },
    { id: "garden-polish", name: "Garden Polish", share: 0.15, chores: GARDEN_POLISH },
  ],
  finale: chore("backyard-grand-campout", "Backyard Grand Campout", "house", "team", 8, 120),
};
