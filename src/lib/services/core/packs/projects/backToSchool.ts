/**
 * Back to School: a two week storm tower of four floors, Supply Expedition, Wardrobe Triage, Study Sanctum and
 * Routine Reset, and a roof for First Day Morning Launch.
 */
import type { MovingRoomId } from "../movingPack";
import type { ProjectChoreSuggestion, ProjectType } from "./projectTypes";

type SchoolRooms = readonly MovingRoomId[] | "house";
type SchoolWho = ProjectChoreSuggestion["who"];

const chore = (
  slug: string, name: string, rooms: SchoolRooms, who: SchoolWho, difficulty: number, minutes: number,
): ProjectChoreSuggestion => ({ slug, name, rooms, difficulty, who, minutes });

const SUPPLY_EXPEDITION: readonly ProjectChoreSuggestion[] = [
  chore("backpack-inventory", "Empty and Clean Old Backpacks", ["bedroom"], "little", 2, 15),
  chore("test-markers", "Test Markers and Pens", ["bedroom"], "little", 1, 15),
  chore("label-supplies", "Label School Supplies", ["bedroom"], "kid", 2, 30),
  chore("pack-pencil-box", "Pack the Pencil Box", ["bedroom"], "kid", 2, 15),
  chore("school-shopping", "Check Off the School List", "house", "grownup", 5, 90),
];

const WARDROBE_TRIAGE: readonly ProjectChoreSuggestion[] = [
  chore("shoe-fitting", "Try On School Shoes", ["bedroom"], "little", 1, 10),
  chore("closet-purge", "Donate What Does Not Fit", ["bedroom"], "kid", 3, 45),
  chore("hang-outfits", "Hang the First Week Outfits", "house", "kid", 2, 20),
  chore("school-laundry", "Wash and Fold School Clothes", ["laundry"], "grownup", 5, 60),
];

const STUDY_SANCTUM: readonly ProjectChoreSuggestion[] = [
  chore("sharpen-pencils", "Sharpen All Pencils", ["office"], "little", 1, 10),
  chore("desk-declutter", "Clear and Wipe Your Desk", ["bedroom"], "kid", 3, 30),
  chore("tech-charging", "Set Up the Charging Station", "house", "kid", 3, 20),
  chore("bookshelf-order", "Organize Reference Books", ["office"], "grownup", 5, 45),
];

const ROUTINE_RESET: readonly ProjectChoreSuggestion[] = [
  chore("water-bottles", "Wash and Prep Water Bottles", ["kitchen"], "little", 1, 10),
  chore("lunchbox-pack", "Pack First Day Lunchboxes", ["kitchen"], "kid", 2, 20),
  chore("bedtime-alarm", "Set Bedtime and Morning Alarms", ["bedroom"], "kid", 2, 10),
  chore("calendar-sync", "Sync the School Year Calendar", "house", "grownup", 5, 30),
];

export const BACK_TO_SCHOOL: ProjectType = {
  id: "back-to-school",
  name: "Back to School",
  towerName: "The Scholar's Spire",
  element: "storm",
  defaultDays: 14,
  phases: [
    { id: "supply-expedition", name: "Supply Expedition", share: 0.3, chores: SUPPLY_EXPEDITION },
    { id: "wardrobe-triage", name: "Wardrobe Triage", share: 0.3, chores: WARDROBE_TRIAGE },
    { id: "study-sanctum", name: "Study Sanctum", share: 0.25, chores: STUDY_SANCTUM },
    { id: "routine-reset", name: "Routine Reset", share: 0.15, chores: ROUTINE_RESET },
  ],
  finale: chore("first-day-morning-launch", "First Day Morning Launch", "house", "team", 8, 60),
};
