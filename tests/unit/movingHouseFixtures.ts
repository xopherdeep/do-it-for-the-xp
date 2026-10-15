/**
 * Shared by the specs of the Old House: the heroes, the answers a family gives, and the setups that shape the house
 * differently (floors, basement, ticked rooms, who plays). Pure data and builders; no mocks, so the spec that imports
 * this mocks the databases the pack reaches for.
 */
import { DEFAULT_MOVING_ROOMS, buildMovingPack } from "@/lib/services/core/packs/movingPack";
import type { MovingAnswers, MovingHero, MovingRoomId } from "@/lib/services/core/packs/movingPack";
import { houseCellsFor } from "@/lib/services/core/packs/movingTemple/houseRooms";

export const PARENT: MovingHero = { id: "dad", name: "Dad", band: "grownup" };
export const TWELVE: MovingHero = { id: "twelve", name: "Twelve", band: "kid" };
export const SIX: MovingHero = { id: "six", name: "Six", band: "little" };

export const answers = (extra: Partial<MovingAnswers> = {}): MovingAnswers => ({
  moveDate: "2026-11-20",
  today: "2026-10-01",
  rooms: { ...DEFAULT_MOVING_ROOMS },
  heroes: [PARENT, TWELVE, SIX],
  ...extra,
});

export const roomsWithout = (...gone: MovingRoomId[]): Partial<Record<MovingRoomId, number>> => {
  const rooms = { ...DEFAULT_MOVING_ROOMS };
  for (const room of gone) delete rooms[room];
  return rooms;
};

/** The pack and the house cells for a family, the way the setup builds them */
export const houseFor = (extra: Partial<MovingAnswers> = {}) => {
  const given = answers(extra);
  const pack = buildMovingPack(given);
  return { pack, cells: houseCellsFor(pack, given)! };
};

/** Setups that shape the house differently: floors, basement, ticked rooms, who plays */
const EVERYTHING: Partial<Record<MovingRoomId, number>> = {
  bedroom: 8, bathroom: 5, kitchen: 1, living: 1, dining: 1, laundry: 1, storage: 1, garage: 1, yard: 1, guest: 4, office: 1, pets: 1,
};
export const SETUPS: [string, Partial<MovingAnswers>][] = [
  ["the default home", {}],
  ["two floors", { floors: 2 }],
  ["two floors and a basement", { floors: 2, basement: true }],
  ["a basement under a one-floor house", { basement: true }],
  ["two floors and no bedrooms", { floors: 2, rooms: { ...DEFAULT_MOVING_ROOMS, bedroom: 0 } }],
  ["no kitchen", { rooms: roomsWithout("kitchen") }],
  ["no kitchen and no garage", { floors: 2, rooms: roomsWithout("kitchen", "garage") }],
  ["no kitchen, garage or yard, with a basement", { basement: true, rooms: roomsWithout("kitchen", "garage", "yard") }],
  ["nothing ticked", { rooms: {} }],
  ["only the little one", { heroes: [SIX] }],
  ["only grown-ups", { floors: 2, heroes: [PARENT, { id: "mom", name: "Mom", band: "grownup" }] }],
  ["a sitting-out hero", { heroes: [PARENT, { id: "baby", name: "Baby", band: "out" }, TWELVE] }],
  ["every room, two floors, a basement, six heroes", {
    floors: 2,
    basement: true,
    rooms: EVERYTHING,
    heroes: [PARENT, { id: "mom", name: "Mom", band: "grownup" }, TWELVE, SIX, { id: "teen", name: "Teen", band: "kid" }, { id: "tot", name: "Tot", band: "little" }],
  }],
];
