/**
 * Spring Cleaning: a two week wind tower of four floors, Declutter, Deep Clean, Organize and Final Inspection, and a
 * roof for The Final Inspection. New content: each chore is sized for the band that does it (little 1-2, kid 2-5,
 * grown-up 5-13) and leaves the beast to the chore library.
 */
import type { MovingRoomId } from "../movingPack";
import type { ProjectChoreSuggestion, ProjectType } from "./projectTypes";

type SpringRooms = readonly MovingRoomId[] | "house";
type SpringWho = ProjectChoreSuggestion["who"];

const chore = (
  slug: string, name: string, rooms: SpringRooms, who: SpringWho, difficulty: number, minutes: number,
): ProjectChoreSuggestion => ({ slug, name, rooms, difficulty, who, minutes });

const DECLUTTER: readonly ProjectChoreSuggestion[] = [
  chore("toy-sort", "Sort Your Toys", ["bedroom"], "little", 2, 15),
  chore("under-the-bed", "Clear Under the Bed", ["bedroom"], "kid", 3, 20),
  chore("outgrown-clothes", "Bag the Outgrown Clothes", ["bedroom"], "kid", 3, 30),
  chore("old-books", "Give Away Old Books", ["living"], "kid", 3, 30),
  chore("expired-food", "Toss the Expired Food", ["kitchen"], "grownup", 5, 45),
  chore("storage-sort", "Sort the Storage Boxes", ["storage"], "grownup", 8, 90),
  chore("garage-sort", "Sort the Garage Pile", ["garage"], "grownup", 8, 120),
  chore("donation-run", "Make the Donation Run", "house", "grownup", 5, 60),
];

const DEEP_CLEAN: readonly ProjectChoreSuggestion[] = [
  chore("doorknobs", "Wipe the Doorknobs and Switches", "house", "any", 2, 15),
  chore("sink-and-mirror", "Shine the Sink and Mirror", ["bathroom"], "kid", 3, 25),
  chore("vacuum-floors", "Vacuum the Floors", "house", "kid", 5, 45),
  chore("oven", "Deep Clean the Oven", ["kitchen"], "grownup", 8, 90),
  chore("tub-and-tiles", "Scrub the Tub and Tiles", ["bathroom"], "grownup", 8, 75),
  chore("bedding", "Wash All the Bedding", ["bedroom"], "grownup", 5, 90),
  chore("windows", "Wash the Windows", "house", "team", 8, 120),
  chore("carpet-and-couch", "Shampoo the Carpet and Couch", ["living"], "grownup", 13, 180),
];

const ORGANIZE: readonly ProjectChoreSuggestion[] = [
  chore("match-socks", "Match the Socks", ["bedroom"], "little", 1, 10),
  chore("toy-bins", "Fill the Toy Bins", ["bedroom"], "little", 2, 15),
  chore("closet-fix", "Straighten Your Closet", ["bedroom"], "kid", 3, 30),
  chore("books-in-order", "Put the Books in Order", ["living"], "kid", 3, 30),
  chore("label-boxes", "Label the Storage Boxes", ["storage"], "kid", 3, 30),
  chore("pantry-shelves", "Organize the Pantry", ["kitchen"], "grownup", 5, 60),
  chore("bathroom-cabinet", "Organize the Bathroom Cabinet", ["bathroom"], "grownup", 5, 30),
  chore("garage-shelves", "Set Up the Garage Shelves", ["garage"], "grownup", 8, 120),
];

const FINAL_INSPECTION: readonly ProjectChoreSuggestion[] = [
  chore("fresh-air", "Open the Windows for Fresh Air", "house", "little", 1, 5),
  chore("make-beds", "Make the Beds Tight", ["bedroom"], "kid", 2, 15),
  chore("last-trash", "Take Out the Last Trash", "house", "kid", 3, 20),
  chore("kitchen-wipe", "Give the Kitchen a Last Wipe", ["kitchen"], "grownup", 5, 30),
  chore("spot-check", "Spot Check Every Room", "house", "grownup", 5, 45),
];

export const SPRING_CLEANING: ProjectType = {
  id: "spring-cleaning",
  name: "Spring Cleaning",
  towerName: "The Spring Spire",
  element: "wind",
  defaultDays: 14,
  phases: [
    { id: "declutter", name: "Declutter", share: 0.3, chores: DECLUTTER },
    { id: "deep-clean", name: "Deep Clean", share: 0.4, chores: DEEP_CLEAN },
    { id: "organize", name: "Organize", share: 0.2, chores: ORGANIZE },
    { id: "final-inspection", name: "Final Inspection", share: 0.1, chores: FINAL_INSPECTION },
  ],
  finale: chore("the-final-inspection", "The Final Inspection", "house", "team", 8, 60),
};
