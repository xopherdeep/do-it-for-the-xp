/**
 * Holiday Prep: a three week ice tower of four floors, Deck the Halls, Gift Guild, The Feast Prep and Final Polish,
 * and a roof for Host the Grand Feast.
 */
import type { MovingRoomId } from "../movingPack";
import type { ProjectChoreSuggestion, ProjectType } from "./projectTypes";

type HolidayRooms = readonly MovingRoomId[] | "house";
type HolidayWho = ProjectChoreSuggestion["who"];

const chore = (
  slug: string, name: string, rooms: HolidayRooms, who: HolidayWho, difficulty: number, minutes: number,
): ProjectChoreSuggestion => ({ slug, name, rooms, difficulty, who, minutes });

const DECK_THE_HALLS: readonly ProjectChoreSuggestion[] = [
  chore("untangle-lights", "Untangle the Holiday Lights", "house", "kid", 3, 30),
  chore("hang-garland", "Hang the Garland", ["living"], "kid", 2, 20),
  chore("set-up-tree", "Set Up the Tree", ["living"], "grownup", 5, 60),
  chore("hang-ornaments", "Hang the Tree Ornaments", ["living"], "little", 2, 30),
  chore("holiday-wreath", "Hang the Front Door Wreath", "house", "little", 1, 10),
  chore("outdoor-displays", "Set Up Outdoor Displays", ["yard"], "grownup", 5, 60),
];

const GIFT_GUILD: readonly ProjectChoreSuggestion[] = [
  chore("wishlist-draw", "Draw Your Holiday Wishlist", ["bedroom"], "little", 1, 15),
  chore("handmade-cards", "Craft Family Holiday Cards", ["living"], "kid", 3, 45),
  chore("wrap-gifts", "Wrap and Tag the Gifts", ["bedroom"], "kid", 3, 60),
  chore("secret-stash", "Hide the Secret Stash", ["storage"], "grownup", 5, 30),
  chore("gift-shipping", "Box and Ship Holiday Packages", "house", "grownup", 5, 60),
];

const THE_FEAST_PREP: readonly ProjectChoreSuggestion[] = [
  chore("cookie-cutters", "Cut Out Holiday Cookies", ["kitchen"], "little", 2, 30),
  chore("pantry-restock", "Restock the Holiday Pantry", "house", "kid", 3, 45),
  chore("bake-treats", "Bake the Holiday Treats", ["kitchen"], "grownup", 5, 90),
  chore("polish-silver", "Polish the Serving Platters", ["dining"], "kid", 2, 25),
  chore("deep-clean-fridge", "Clear Space in the Fridge", ["kitchen"], "grownup", 5, 45),
];

const FINAL_POLISH: readonly ProjectChoreSuggestion[] = [
  chore("guest-bedding", "Freshen Up the Guest Bedding", ["guest"], "kid", 3, 30),
  chore("table-setting", "Set the Grand Table", ["dining"], "little", 2, 20),
  chore("entryway-sweep", "Sweep the Welcome Entryway", "house", "little", 1, 10),
  chore("coat-rack", "Clear the Coat Rack and Shoes", "house", "kid", 2, 15),
  chore("final-sparkle", "Light the Scented Candles", "house", "grownup", 5, 10),
];

export const HOLIDAY_PREP: ProjectType = {
  id: "holiday-prep",
  name: "Holiday Prep",
  towerName: "The Solstice Citadel",
  element: "ice",
  defaultDays: 21,
  phases: [
    { id: "deck-the-halls", name: "Deck the Halls", share: 0.25, chores: DECK_THE_HALLS },
    { id: "gift-guild", name: "Gift Guild", share: 0.3, chores: GIFT_GUILD },
    { id: "the-feast-prep", name: "The Feast Prep", share: 0.3, chores: THE_FEAST_PREP },
    { id: "final-polish", name: "Final Polish", share: 0.15, chores: FINAL_POLISH },
  ],
  finale: chore("host-the-grand-feast", "Host the Grand Feast", "house", "team", 8, 120),
};
