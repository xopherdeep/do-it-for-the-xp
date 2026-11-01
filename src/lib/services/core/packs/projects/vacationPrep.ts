/**
 * Vacation Prep: a one week wind tower of four floors, Route and Gear, Laundry and Packing, Vehicle and Provisions and
 * Home Lockdown, and a roof for Hit the Open Road.
 */
import type { MovingRoomId } from "../movingPack";
import type { ProjectChoreSuggestion, ProjectType } from "./projectTypes";

type VacationRooms = readonly MovingRoomId[] | "house";
type VacationWho = ProjectChoreSuggestion["who"];

const chore = (
  slug: string, name: string, rooms: VacationRooms, who: VacationWho, difficulty: number, minutes: number,
): ProjectChoreSuggestion => ({ slug, name, rooms, difficulty, who, minutes });

const ROUTE_AND_GEAR: readonly ProjectChoreSuggestion[] = [
  chore("select-road-toys", "Pick 3 Books or Toys for Travel", ["bedroom"], "little", 1, 15),
  chore("charge-handhelds", "Charge Tablets and Headphones", ["living"], "little", 1, 15),
  chore("pack-first-aid-kit", "Check Bandages and Travel Meds", ["bathroom"], "kid", 2, 20),
  chore("pet-sitter-briefing", "Write Pet Care Instructions", ["pets"], "grownup", 5, 30),
  chore("itinerary-confirm", "Verify Bookings and Tickets", "house", "grownup", 5, 45),
];

const LAUNDRY_AND_PACKING: readonly ProjectChoreSuggestion[] = [
  chore("roll-socks-and-undies", "Roll Socks and Underwear", ["bedroom"], "little", 1, 15),
  chore("pack-swimsuits", "Pack Swimsuits and Beach Towels", ["bedroom"], "kid", 2, 20),
  chore("suitcase-folding", "Pack Outfits into Suitcases", "house", "kid", 3, 45),
  chore("toiletry-bag-fill", "Pack Travel Bottles and Pastes", ["bathroom"], "kid", 2, 25),
  chore("all-travel-laundry", "Wash and Dry Every Bag of Clothes", ["laundry"], "grownup", 5, 75),
];

const VEHICLE_AND_PROVISIONS: readonly ProjectChoreSuggestion[] = [
  chore("fill-snack-bags", "Portion Out Road Trip Snacks", "house", "little", 1, 20),
  chore("empty-car-trash", "Clean Trash Out of the Car", ["garage"], "kid", 2, 20),
  chore("wash-car-windows", "Wipe Windshield and Car Mirrors", ["garage"], "kid", 2, 20),
  chore("check-tire-pressure", "Check Tire Pressure and Fluids", ["garage"], "grownup", 5, 30),
  chore("pack-car-trunk", "Pack Luggage into the Trunk", ["garage"], "grownup", 5, 45),
];

const HOME_LOCKDOWN: readonly ProjectChoreSuggestion[] = [
  chore("water-houseplants", "Give Houseplants a Big Drink", "house", "little", 1, 15),
  chore("empty-kitchen-fridge", "Toss Perishables from the Fridge", ["kitchen"], "kid", 2, 20),
  chore("take-out-all-trash", "Empty Every Trash Can in House", "house", "kid", 3, 20),
  chore("adjust-thermostat", "Set Vacation Mode on Thermostat", "house", "grownup", 5, 10),
  chore("lock-windows-doors", "Check All Window and Door Locks", "house", "grownup", 5, 20),
];

export const VACATION_PREP: ProjectType = {
  id: "vacation-prep",
  name: "Vacation Prep",
  towerName: "The Caravan Citadel",
  element: "wind",
  defaultDays: 7,
  phases: [
    { id: "route-and-gear", name: "Route and Gear", share: 0.25, chores: ROUTE_AND_GEAR },
    { id: "laundry-and-packing", name: "Laundry and Packing", share: 0.35, chores: LAUNDRY_AND_PACKING },
    { id: "vehicle-and-provisions", name: "Vehicle and Provisions", share: 0.25, chores: VEHICLE_AND_PROVISIONS },
    { id: "home-lockdown", name: "Home Lockdown", share: 0.15, chores: HOME_LOCKDOWN },
  ],
  finale: chore("hit-the-open-road", "Hit the Open Road", "house", "team", 8, 30),
};
