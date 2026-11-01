/**
 * Moving In: a four week light tower of four floors, First Night Essentials, Hearth and Pantry, Room by Room and
 * Box Breakdown, and a roof for Housewarming Celebration.
 */
import type { MovingRoomId } from "../movingPack";
import type { ProjectChoreSuggestion, ProjectType } from "./projectTypes";

type MovingRooms = readonly MovingRoomId[] | "house";
type MovingWho = ProjectChoreSuggestion["who"];

const chore = (
  slug: string, name: string, rooms: MovingRooms, who: MovingWho, difficulty: number, minutes: number,
): ProjectChoreSuggestion => ({ slug, name, rooms, difficulty, who, minutes });

const FIRST_NIGHT_ESSENTIALS: readonly ProjectChoreSuggestion[] = [
  chore("make-first-beds", "Put Sheets on the Mattresses", ["bedroom"], "kid", 2, 25),
  chore("unpack-toiletries", "Unpack Toothbrushes and Soap", ["bathroom"], "little", 1, 15),
  chore("hang-shower-curtain", "Hang the Shower Curtain", ["bathroom"], "kid", 2, 15),
  chore("unpack-kettle", "Set Up the Coffee and Kettle", ["kitchen"], "grownup", 5, 15),
  chore("first-grocery-trip", "First Grocery Fridge Stock", "house", "grownup", 5, 60),
];

const HEARTH_AND_PANTRY: readonly ProjectChoreSuggestion[] = [
  chore("wipe-shelf-linens", "Wipe Cupboards and Shelves", "house", "little", 2, 25),
  chore("unpack-everyday-plates", "Unpack Plates and Cups", ["kitchen"], "kid", 3, 45),
  chore("pots-and-pans", "Stow Pots, Pans and Utensils", ["kitchen"], "kid", 3, 40),
  chore("pantry-organization", "Sort Canned Goods and Snacks", ["kitchen"], "grownup", 5, 45),
  chore("hook-up-appliances", "Hook Up Kitchen Appliances", ["kitchen"], "grownup", 5, 45),
];

const ROOM_BY_ROOM: readonly ProjectChoreSuggestion[] = [
  chore("unpack-toy-boxes", "Unpack Your Favorite Toys", ["bedroom"], "little", 2, 30),
  chore("fill-wardrobes", "Hang Clothes in the Closet", ["bedroom"], "kid", 3, 45),
  chore("set-up-living-room", "Arrange the Couch and Rug", ["living"], "grownup", 5, 60),
  chore("connect-media-center", "Plug In the TV and Wi-Fi", "house", "grownup", 5, 45),
  chore("office-desk-setup", "Assemble the Office Workstation", ["office"], "grownup", 5, 60),
];

const BOX_BREAKDOWN: readonly ProjectChoreSuggestion[] = [
  chore("remove-tape-scraps", "Peel Tape Scraps Off Boxes", "house", "little", 1, 15),
  chore("flatten-boxes", "Flatten All Cardboard Boxes", "house", "kid", 3, 45),
  chore("hang-family-pictures", "Hang the Wall Pictures", "house", "grownup", 5, 60),
  chore("recycle-bin-run", "Stack Boxes for Recycling", ["garage"], "grownup", 5, 30),
];

export const MOVING_IN: ProjectType = {
  id: "moving-in",
  name: "Moving In",
  towerName: "The New Stronghold",
  element: "light",
  defaultDays: 28,
  phases: [
    { id: "first-night-essentials", name: "First Night Essentials", share: 0.25, chores: FIRST_NIGHT_ESSENTIALS },
    { id: "hearth-and-pantry", name: "Hearth and Pantry", share: 0.3, chores: HEARTH_AND_PANTRY },
    { id: "room-by-room", name: "Room by Room", share: 0.3, chores: ROOM_BY_ROOM },
    { id: "box-breakdown", name: "Box Breakdown", share: 0.15, chores: BOX_BREAKDOWN },
  ],
  finale: chore("housewarming-celebration", "Housewarming Celebration", "house", "team", 8, 120),
};
