/**
 * The suggested chore list: a project type plus the house's rooms and the heroes become a list of chores, one per
 * suggestion per matching room, sized and assigned by age; and last run's list comes back as the next run's start.
 * Pure: no storage, no Vue.
 */
import { DEFAULT_MOVING_ROOMS } from "@/lib/services/core/packs/movingPack";
import { PROJECT_TYPES } from "@/lib/services/core/packs/projects";
import type { ProjectChoreSuggestion, ProjectType } from "@/lib/services/core/packs/projects";
import type { PackHero } from "@/lib/services/core/packs/packCommon";
import { choresFromLastRun, houseRoomsOf, suggestChores } from "@/lib/services/projects/projectChores";
import type { ProjectChore, ProjectHouse } from "@/lib/services/projects/projectChores";

const SLIDER = [1, 2, 3, 5, 8, 13];
const BAND_RANGE: Record<string, [number, number]> = { little: [1, 2], kid: [2, 5], grownup: [5, 13] };

const lia: PackHero = { id: "lia", name: "Lia", band: "little" };
const max: PackHero = { id: "max", name: "Max", band: "little" };
const kai: PackHero = { id: "kai", name: "Kai", band: "kid" };
const kit: PackHero = { id: "kit", name: "Kit", band: "kid" };
const mom: PackHero = { id: "mom", name: "Mom", band: "grownup" };
const dad: PackHero = { id: "dad", name: "Dad", band: "grownup" };
const sitter: PackHero = { id: "sit", name: "Sitter", band: "out" };

const suggestion = (over: Partial<ProjectChoreSuggestion> & { slug: string }): ProjectChoreSuggestion => ({
  name: `Chore ${over.slug}`, rooms: "house", difficulty: 3, who: "kid", ...over,
});

const FINALE = suggestion({ slug: "boss", name: "The Boss", who: "team", difficulty: 8 });

/** A two-floor project type around the given chores (all on floor one unless `second` is given) */
const typeOf = (chores: ProjectChoreSuggestion[], finale: ProjectChoreSuggestion = FINALE, second: ProjectChoreSuggestion[] = []): ProjectType => ({
  id: "spring-cleaning", name: "Test Tower", towerName: "The Test", element: "wind", defaultDays: 14,
  phases: [
    { id: "p1", name: "One", share: 0.5, chores },
    { id: "p2", name: "Two", share: 0.5, chores: second.length > 0 ? second : [suggestion({ slug: "filler", who: "kid" })] },
  ],
  finale,
});

const house = (rooms: ProjectHouse["rooms"]): ProjectHouse => ({ rooms });
const KITCHEN_ONLY = house({ kitchen: 1 });

/** The chores of floor one only, leaving the filler and the finale out */
const floorOne = (chores: ProjectChoreSuggestion[], h: ProjectHouse, heroes: PackHero[], finale?: ProjectChoreSuggestion): ProjectChore[] =>
  suggestChores(typeOf(chores, finale), h, heroes).filter((chore) => chore.phaseId === "p1");

const assigneesOf = (chores: ProjectChore[]): string[][] => chores.map((chore) => chore.assignee);

describe("houseRoomsOf", () => {
  it("numbers the counted rooms: Bedroom 1, Bedroom 2 and so on", () => {
    const rooms = houseRoomsOf(house({ bedroom: 3 })).filter((room) => room.kind === "bedroom");
    expect(rooms).toEqual([
      { id: "bedroom-1", kind: "bedroom", name: "Bedroom 1" },
      { id: "bedroom-2", kind: "bedroom", name: "Bedroom 2" },
      { id: "bedroom-3", kind: "bedroom", name: "Bedroom 3" },
    ]);
  });

  it("numbers a single counted room too, so its id holds when a second one is added", () => {
    const one = houseRoomsOf(house({ bathroom: 1 })).find((room) => room.kind === "bathroom");
    const two = houseRoomsOf(house({ bathroom: 2 })).find((room) => room.kind === "bathroom");
    expect(one).toEqual({ id: "bathroom-1", kind: "bathroom", name: "Bathroom 1" });
    expect(two?.id).toBe("bathroom-1");
  });

  it("names the guest rooms in the singular", () => {
    const rooms = houseRoomsOf(house({ guest: 2 })).filter((room) => room.kind === "guest");
    expect(rooms.map((room) => room.name)).toEqual(["Guest or spare room 1", "Guest or spare room 2"]);
  });

  it("gives a room that is not counted one room, whatever the number says", () => {
    const rooms = houseRoomsOf(house({ kitchen: 1, living: 4 }));
    expect(rooms.filter((room) => room.kind === "kitchen")).toEqual([{ id: "kitchen", kind: "kitchen", name: "Kitchen" }]);
    expect(rooms.filter((room) => room.kind === "living")).toEqual([{ id: "living", kind: "living", name: "Living room" }]);
  });

  it("leaves out rooms the house does not have", () => {
    const rooms = houseRoomsOf(house({ kitchen: 1, garage: 0, bedroom: -2, living: Number.NaN, yard: undefined }));
    expect(rooms.map((room) => room.id)).toEqual(["kitchen", "house"]);
  });

  it("caps a counted room at the most the setup allows", () => {
    const rooms = houseRoomsOf(house({ bedroom: 5000 })).filter((room) => room.kind === "bedroom");
    expect(rooms).toHaveLength(8);
  });

  it("lists the rooms in the setup's order, then the whole house", () => {
    const rooms = houseRoomsOf(house({ kitchen: 1, bedroom: 2, garage: 1, bathroom: 1 }));
    expect(rooms.map((room) => room.id)).toEqual(["bedroom-1", "bedroom-2", "bathroom-1", "kitchen", "garage", "house"]);
  });

  it("always ends with the whole house, even for an empty house", () => {
    expect(houseRoomsOf(house({}))).toEqual([{ id: "house", kind: "house", name: "The Whole House" }]);
  });

  it("does not touch the house it is given", () => {
    const given = house({ bedroom: 2, kitchen: 1 });
    const before = JSON.stringify(given);
    houseRoomsOf(given);
    expect(JSON.stringify(given)).toBe(before);
  });
});

describe("suggestChores: rooms", () => {
  it("makes one chore for a kitchen chore in a house with one kitchen", () => {
    const chores = floorOne([suggestion({ slug: "oven", rooms: ["kitchen"], who: "grownup", difficulty: 8 })], KITCHEN_ONLY, [mom]);
    expect(chores).toHaveLength(1);
    expect(chores[0]).toMatchObject({ id: "p1:oven:kitchen", phaseId: "p1", roomId: "kitchen", name: "Chore oven" });
  });

  it("makes one chore for each bedroom of a bedroom chore", () => {
    const chores = floorOne([suggestion({ slug: "bed", rooms: ["bedroom"] })], house({ bedroom: 3 }), [kai]);
    expect(chores.map((chore) => chore.roomId)).toEqual(["bedroom-1", "bedroom-2", "bedroom-3"]);
    expect(chores.map((chore) => chore.id)).toEqual(["p1:bed:bedroom-1", "p1:bed:bedroom-2", "p1:bed:bedroom-3"]);
  });

  it("gives a chore for a room the house lacks no chores at all", () => {
    const chores = floorOne([suggestion({ slug: "car", rooms: ["garage"] }), suggestion({ slug: "oven", rooms: ["kitchen"] })], KITCHEN_ONLY, [kai]);
    expect(chores.map((chore) => chore.id)).toEqual(["p1:oven:kitchen"]);
  });

  it("makes one chore for a whole-house chore, in the house room", () => {
    const chores = floorOne([suggestion({ slug: "air", rooms: "house" })], house({ bedroom: 3, kitchen: 1 }), [kai]);
    expect(chores).toHaveLength(1);
    expect(chores[0].roomId).toBe("house");
    expect(chores[0].id).toBe("p1:air:house");
  });

  it("makes one chore, in the first listed kind the house has, when a chore lists several kinds of room", () => {
    const bothRooms = house({ living: 1, dining: 1, kitchen: 1 });
    const livingFirst = floorOne([suggestion({ slug: "pack", rooms: ["living", "dining"] })], bothRooms, [kai, kit]);
    expect(livingFirst.map((chore) => chore.roomId)).toEqual(["living"]);
    const diningFirst = floorOne([suggestion({ slug: "pack", rooms: ["dining", "living"] })], bothRooms, [kai, kit]);
    expect(diningFirst.map((chore) => chore.roomId)).toEqual(["dining"]);
  });

  it("makes the one chore in the kind that is there when a chore lists two and the house has one", () => {
    const chores = floorOne([suggestion({ slug: "pack", rooms: ["living", "dining"] })], house({ dining: 1 }), [kai]);
    expect(chores.map((chore) => chore.roomId)).toEqual(["dining"]);
  });

  it("makes the one chore in the first room of a counted kind that comes first in the list", () => {
    const chores = floorOne([suggestion({ slug: "pack", rooms: ["bedroom", "office"] })], house({ bedroom: 2, office: 1 }), [kai]);
    expect(chores.map((chore) => chore.id)).toEqual(["p1:pack:bedroom-1"]);
    const later = floorOne([suggestion({ slug: "pack", rooms: ["office", "bedroom"] })], house({ bedroom: 2, office: 1 }), [kai]);
    expect(later.map((chore) => chore.id)).toEqual(["p1:pack:office"]);
  });

  it("makes no chore when a chore lists several kinds and the house has none of them", () => {
    const chores = floorOne([suggestion({ slug: "pack", rooms: ["living", "dining"] })], house({ kitchen: 1 }), [kai]);
    expect(chores).toEqual([]);
  });

  it("makes Moving Out's living and dining chore once on a house with both rooms", () => {
    const chores = suggestChores(PROJECT_TYPES["moving-out"], house({ living: 1, dining: 1 }), [kai, mom]);
    const livingDining = chores.filter((chore) => chore.id.startsWith("living:living-dining:"));
    expect(livingDining).toHaveLength(1);
    expect(livingDining[0]).toMatchObject({ id: "living:living-dining:living", roomId: "living", name: "Pack the Living and Dining Rooms" });
  });

  it("still makes one chore for each room of a single kind", () => {
    const chores = floorOne([suggestion({ slug: "bed", rooms: ["bedroom"] })], house({ bedroom: 3, office: 1 }), [kai]);
    expect(chores).toHaveLength(3);
  });

  it("lists the chores floor by floor in the type's order, the finale last", () => {
    const type = typeOf([suggestion({ slug: "a" }), suggestion({ slug: "b" })], FINALE, [suggestion({ slug: "c" })]);
    const chores = suggestChores(type, KITCHEN_ONLY, [kai]);
    expect(chores.map((chore) => chore.id)).toEqual(["p1:a:house", "p1:b:house", "p2:c:house", "roof:boss:roof"]);
  });

  it("carries the beast and the minutes when the suggestion has them, and no such keys when it has not", () => {
    const [full, bare] = floorOne(
      [suggestion({ slug: "full", beastId: "beast-x", minutes: 30 }), suggestion({ slug: "bare" })], KITCHEN_ONLY, [kai],
    );
    expect(full).toMatchObject({ beastId: "beast-x", minutes: 30 });
    expect(Object.keys(bare)).not.toContain("beastId");
    expect(Object.keys(bare)).not.toContain("minutes");
    expect(bare.custom).toBeUndefined();
  });
});

describe("suggestChores: names", () => {
  const namesOf = (chores: ProjectChore[]): string[] => chores.map((chore) => chore.name);

  it("adds the room to the name when a chore is split over several rooms", () => {
    const chores = floorOne([suggestion({ slug: "bed", name: "Clear Under the Bed", rooms: ["bedroom"] })], house({ bedroom: 3 }), [kai]);
    expect(namesOf(chores)).toEqual(["Clear Under the Bed (Bedroom 1)", "Clear Under the Bed (Bedroom 2)", "Clear Under the Bed (Bedroom 3)"]);
  });

  it("keeps the plain name when a chore has only one room", () => {
    const chores = floorOne([suggestion({ slug: "bed", name: "Clear Under the Bed", rooms: ["bedroom"] })], house({ bedroom: 1 }), [kai]);
    expect(namesOf(chores)).toEqual(["Clear Under the Bed"]);
  });

  it("keeps the plain name for a whole-house chore and for a chore that lists several kinds", () => {
    const chores = floorOne(
      [suggestion({ slug: "air", name: "Open the Windows", rooms: "house" }), suggestion({ slug: "pack", name: "Pack the Rooms", rooms: ["living", "dining"] })],
      house({ bedroom: 3, living: 1, dining: 1 }), [kai],
    );
    expect(namesOf(chores)).toEqual(["Open the Windows", "Pack the Rooms"]);
  });

  it("keeps the plain name of a chore for each hero when it has one room", () => {
    const chores = floorOne([suggestion({ slug: "own", name: "Your Stuff", who: "kid", perHero: true })], KITCHEN_ONLY, [kai, kit]);
    expect(namesOf(chores)).toEqual(["Your Stuff", "Your Stuff"]);
  });

  it("names the room on a chore for each hero too when it is also split by room", () => {
    const chores = floorOne([suggestion({ slug: "own", name: "Your Dresser", who: "kid", perHero: true, rooms: ["bedroom"] })], house({ bedroom: 2 }), [kai, kit]);
    expect(namesOf(chores)).toEqual([
      "Your Dresser (Bedroom 1)", "Your Dresser (Bedroom 1)", "Your Dresser (Bedroom 2)", "Your Dresser (Bedroom 2)",
    ]);
    expect(assigneesOf(chores)).toEqual([["kai"], ["kit"], ["kai"], ["kit"]]);
  });

  it("leaves the ids as they were, whatever the names say", () => {
    const chores = floorOne([suggestion({ slug: "bed", rooms: ["bedroom"] })], house({ bedroom: 2 }), [kai]);
    expect(chores.map((chore) => chore.id)).toEqual(["p1:bed:bedroom-1", "p1:bed:bedroom-2"]);
  });

  it("names the rooms of a real chore, and does not rename the type's suggestion", () => {
    const type = PROJECT_TYPES["spring-cleaning"];
    const before = JSON.stringify(type);
    const chores = suggestChores(type, house({ bedroom: 3, kitchen: 1 }), [lia, kai, mom]);
    const names = chores.map((chore) => chore.name);
    expect(names).toContain("Clear Under the Bed (Bedroom 2)");
    expect(names).toContain("Deep Clean the Oven");
    expect(JSON.stringify(type)).toBe(before);
  });
});

describe("suggestChores: who does it", () => {
  it("gives a little chore to a little hero", () => {
    const [chore] = floorOne([suggestion({ slug: "toys", who: "little", difficulty: 2 })], KITCHEN_ONLY, [mom, kai, lia]);
    expect(chore.assignee).toEqual(["lia"]);
  });

  it("rotates a band's chores round-robin across the heroes of that band", () => {
    const chores = floorOne(
      [suggestion({ slug: "a", who: "kid" }), suggestion({ slug: "b", who: "kid" }), suggestion({ slug: "c", who: "kid" })],
      KITCHEN_ONLY, [mom, kai, kit],
    );
    expect(assigneesOf(chores)).toEqual([["kai"], ["kit"], ["kai"]]);
  });

  it("rotates the bedrooms of one chore across the heroes too", () => {
    const chores = floorOne([suggestion({ slug: "bed", rooms: ["bedroom"], who: "little", difficulty: 2 })], house({ bedroom: 3 }), [lia, max]);
    expect(assigneesOf(chores)).toEqual([["lia"], ["max"], ["lia"]]);
  });

  it("keeps the rotation going from one floor to the next", () => {
    const type = typeOf([suggestion({ slug: "a", who: "kid" })], FINALE, [suggestion({ slug: "b", who: "kid" })]);
    const chores = suggestChores(type, KITCHEN_ONLY, [kai, kit]);
    expect(chores.filter((chore) => ["Chore a", "Chore b"].includes(chore.name)).map((chore) => chore.assignee)).toEqual([["kai"], ["kit"]]);
  });

  it("keeps a rotation for each band apart", () => {
    const chores = floorOne(
      [suggestion({ slug: "k1", who: "kid" }), suggestion({ slug: "g1", who: "grownup", difficulty: 5 }), suggestion({ slug: "k2", who: "kid" }), suggestion({ slug: "g2", who: "grownup", difficulty: 5 })],
      KITCHEN_ONLY, [kai, kit, mom, dad],
    );
    expect(assigneesOf(chores)).toEqual([["kai"], ["mom"], ["kit"], ["dad"]]);
  });

  it("falls back little, then kid, then grown-up when a little chore has no little hero", () => {
    const littleChore = [suggestion({ slug: "toys", who: "little" as const, difficulty: 2 })];
    expect(assigneesOf(floorOne(littleChore, KITCHEN_ONLY, [mom, kai]))).toEqual([["kai"]]);
    expect(assigneesOf(floorOne(littleChore, KITCHEN_ONLY, [mom]))).toEqual([["mom"]]);
  });

  it("falls back to a grown-up, then a little, when a kid chore has no kid hero", () => {
    const kidChore = [suggestion({ slug: "bed", who: "kid" as const })];
    expect(assigneesOf(floorOne(kidChore, KITCHEN_ONLY, [lia, mom]))).toEqual([["mom"]]);
    expect(assigneesOf(floorOne(kidChore, KITCHEN_ONLY, [lia]))).toEqual([["lia"]]);
  });

  it("falls back to a kid, then a little, when a grown-up chore has no grown-up hero", () => {
    const bigChore = [suggestion({ slug: "oven", who: "grownup", difficulty: 8 })];
    expect(assigneesOf(floorOne(bigChore, KITCHEN_ONLY, [lia, kai]))).toEqual([["kai"]]);
    expect(assigneesOf(floorOne(bigChore, KITCHEN_ONLY, [lia]))).toEqual([["lia"]]);
  });

  it("shares a fallback band's rotation with that band's own chores", () => {
    const chores = floorOne(
      [suggestion({ slug: "k1", who: "kid" }), suggestion({ slug: "l1", who: "little", difficulty: 2 }), suggestion({ slug: "k2", who: "kid" })],
      KITCHEN_ONLY, [kai, kit],
    );
    expect(assigneesOf(chores)).toEqual([["kai"], ["kit"], ["kai"]]);
  });

  it("hands the sitting-out heroes nothing", () => {
    const chores = floorOne([suggestion({ slug: "a", who: "any" }), suggestion({ slug: "b", who: "team" })], KITCHEN_ONLY, [sitter, kai]);
    expect(assigneesOf(chores)).toEqual([["kai"], ["kai"]]);
  });

  it("leaves a chore unassigned when nobody is playing", () => {
    const chores = suggestChores(typeOf([suggestion({ slug: "a", who: "kid" })]), KITCHEN_ONLY, []);
    expect(chores.every((chore) => chore.assignee.length === 0)).toBe(true);
    expect(chores).toHaveLength(3);
    expect(chores.every((chore) => SLIDER.includes(chore.difficulty))).toBe(true);
  });

  it("hands a team chore to every hero", () => {
    const [chore] = floorOne([suggestion({ slug: "windows", who: "team", difficulty: 8 })], KITCHEN_ONLY, [lia, kai, mom]);
    expect(chore.assignee).toEqual(["lia", "kai", "mom"]);
  });

  it("keeps a team chore's suggested size, whatever the heroes' bands", () => {
    const [chore] = floorOne([suggestion({ slug: "windows", who: "team", difficulty: 13 })], KITCHEN_ONLY, [lia, kai]);
    expect(chore.difficulty).toBe(13);
  });

  it("rotates an anyone chore across all the heroes in one shared rotation", () => {
    const chores = floorOne(
      [suggestion({ slug: "a", who: "any", difficulty: 2 }), suggestion({ slug: "b", who: "any", difficulty: 2 }), suggestion({ slug: "c", who: "any", difficulty: 2 }), suggestion({ slug: "d", who: "any", difficulty: 2 })],
      KITCHEN_ONLY, [lia, kai, mom],
    );
    expect(assigneesOf(chores)).toEqual([["lia"], ["kai"], ["mom"], ["lia"]]);
  });

  it("sizes an anyone chore to the band of the hero it lands on", () => {
    const chores = floorOne(
      [suggestion({ slug: "a", who: "any", difficulty: 3 }), suggestion({ slug: "b", who: "any", difficulty: 3 }), suggestion({ slug: "c", who: "any", difficulty: 3 })],
      KITCHEN_ONLY, [lia, kai, mom],
    );
    expect(chores.map((chore) => chore.difficulty)).toEqual([2, 3, 5]);
  });
});

describe("suggestChores: one for each hero", () => {
  const perKid = suggestion({ slug: "own-stuff", who: "kid", perHero: true, difficulty: 3 });

  it("makes one chore for each hero of the band, each assigned to that hero", () => {
    const chores = floorOne([perKid], KITCHEN_ONLY, [lia, kai, kit, mom]);
    expect(chores.map((chore) => chore.id)).toEqual(["p1:own-stuff:house:kai", "p1:own-stuff:house:kit"]);
    expect(assigneesOf(chores)).toEqual([["kai"], ["kit"]]);
  });

  it("makes them for each matching room, a room's heroes together", () => {
    const chores = floorOne([{ ...perKid, rooms: ["bedroom"] }], house({ bedroom: 2 }), [kai, kit]);
    expect(chores.map((chore) => chore.id)).toEqual([
      "p1:own-stuff:bedroom-1:kai", "p1:own-stuff:bedroom-1:kit", "p1:own-stuff:bedroom-2:kai", "p1:own-stuff:bedroom-2:kit",
    ]);
  });

  it("falls back like any band, and makes one for each hero of the band it falls back to", () => {
    const chores = floorOne([{ ...perKid, who: "little" as const, difficulty: 2 }], KITCHEN_ONLY, [mom, kai, kit]);
    expect(assigneesOf(chores)).toEqual([["kai"], ["kit"]]);
  });

  it("sizes each to its hero's band", () => {
    const chores = floorOne([{ ...perKid, who: "little" as const, difficulty: 2 }], KITCHEN_ONLY, [mom, dad]);
    expect(chores.map((chore) => chore.difficulty)).toEqual([5, 5]);
  });

  it("does not move the band's rotation", () => {
    const chores = floorOne([perKid, suggestion({ slug: "plain", who: "kid" })], KITCHEN_ONLY, [kai, kit]);
    expect(assigneesOf(chores)).toEqual([["kai"], ["kit"], ["kai"]]);
  });

  it("makes a single unassigned chore when nobody is playing", () => {
    const chores = floorOne([perKid], KITCHEN_ONLY, []);
    expect(chores).toHaveLength(1);
    expect(chores[0]).toMatchObject({ id: "p1:own-stuff:house", assignee: [] });
  });
});

describe("suggestChores: sizes", () => {
  const sizeOf = (who: "little" | "kid" | "grownup", difficulty: number, heroes: PackHero[]): number =>
    floorOne([suggestion({ slug: "x", who, difficulty })], KITCHEN_ONLY, heroes)[0].difficulty;

  it("keeps a size that is already in the assignee's range", () => {
    expect(sizeOf("little", 2, [lia])).toBe(2);
    expect(sizeOf("kid", 3, [kai])).toBe(3);
    expect(sizeOf("grownup", 8, [mom])).toBe(8);
  });

  it("pulls a size down into the range: little at most 2, kid at most 5, grown-up at most 13", () => {
    expect(sizeOf("little", 8, [lia])).toBe(2);
    expect(sizeOf("little", 3, [lia])).toBe(2);
    expect(sizeOf("kid", 13, [kai])).toBe(5);
    expect(sizeOf("kid", 8, [kai])).toBe(5);
  });

  it("pushes a size up into the range: kid at least 2, grown-up at least 5", () => {
    expect(sizeOf("kid", 1, [kai])).toBe(2);
    expect(sizeOf("grownup", 1, [mom])).toBe(5);
    expect(sizeOf("grownup", 3, [mom])).toBe(5);
  });

  it("sizes to the band of the hero it fell back to", () => {
    expect(sizeOf("little", 1, [mom])).toBe(5);
    expect(sizeOf("grownup", 13, [kai])).toBe(5);
  });

  it("lands on the slider even when the suggestion is off it", () => {
    expect(sizeOf("grownup", 6, [mom])).toBe(5);
    expect(sizeOf("grownup", 11, [mom])).toBe(13);
    expect(sizeOf("kid", 4, [kai])).toBe(5);
  });

  it("gives every chore of every real type a slider size inside its assignee's range", () => {
    for (const type of Object.values(PROJECT_TYPES)) {
      const heroes = [lia, kai, mom];
      const chores = suggestChores(type, house({ ...DEFAULT_MOVING_ROOMS }), heroes);
      for (const chore of chores) {
        expect(SLIDER).toContain(chore.difficulty);
        if (chore.assignee.length !== 1) continue;
        const band = heroes.find((hero) => hero.id === chore.assignee[0])?.band ?? "";
        const [low, high] = BAND_RANGE[band];
        expect(chore.difficulty).toBeGreaterThanOrEqual(low);
        expect(chore.difficulty).toBeLessThanOrEqual(high);
      }
    }
  });
});

describe("suggestChores: the finale on the roof", () => {
  it("puts the finale last, on the roof, in the roof room", () => {
    const chores = suggestChores(typeOf([suggestion({ slug: "a" })]), KITCHEN_ONLY, [kai]);
    const last = chores[chores.length - 1];
    expect(last).toMatchObject({ id: "roof:boss:roof", phaseId: "roof", roomId: "roof", name: "The Boss", difficulty: 8 });
  });

  it("hands the finale to every hero", () => {
    const chores = suggestChores(typeOf([]), KITCHEN_ONLY, [lia, kai, mom]);
    expect(chores[chores.length - 1].assignee).toEqual(["lia", "kai", "mom"]);
  });

  it("hands an anyone finale to every hero too", () => {
    const finale = suggestion({ slug: "boss", name: "The Boss", who: "any", difficulty: 8 });
    const chores = suggestChores(typeOf([], finale), KITCHEN_ONLY, [kai, mom]);
    expect(chores[chores.length - 1].assignee).toEqual(["kai", "mom"]);
    expect(chores[chores.length - 1].difficulty).toBe(8);
  });

  it("follows the band rules when the finale names a band", () => {
    const finale = suggestion({ slug: "boss", name: "The Boss", who: "grownup", difficulty: 13 });
    const chores = suggestChores(typeOf([], finale), KITCHEN_ONLY, [kai, mom, dad]);
    expect(chores[chores.length - 1]).toMatchObject({ assignee: ["mom"], difficulty: 13 });
  });

  it("makes one finale chore, whatever the finale's rooms say", () => {
    const finale = suggestion({ slug: "boss", name: "The Boss", who: "team", rooms: ["kitchen"] });
    const chores = suggestChores(typeOf([], finale), house({ kitchen: 1, bedroom: 3 }), [kai]);
    expect(chores.filter((chore) => chore.phaseId === "roof")).toHaveLength(1);
  });

  it("ends both real types on their finale", () => {
    for (const type of Object.values(PROJECT_TYPES)) {
      const chores = suggestChores(type, house({ ...DEFAULT_MOVING_ROOMS }), [lia, kai, mom]);
      const last = chores[chores.length - 1];
      expect(last).toMatchObject({ phaseId: "roof", roomId: "roof", name: type.finale.name, assignee: ["lia", "kai", "mom"] });
    }
  });
});

describe("suggestChores: stable ids, fresh objects", () => {
  const heroes = [lia, kai, kit, mom];
  const fullHouse = house({ ...DEFAULT_MOVING_ROOMS });

  it("gives the same ids and assignments for the same input", () => {
    for (const type of Object.values(PROJECT_TYPES)) {
      expect(suggestChores(type, fullHouse, heroes)).toEqual(suggestChores(type, fullHouse, heroes));
    }
  });

  it("keeps the ids of the chores already there when a room is added", () => {
    const type = PROJECT_TYPES["spring-cleaning"];
    const before = suggestChores(type, house({ kitchen: 1, bedroom: 1 }), heroes).map((chore) => chore.id);
    const after = suggestChores(type, house({ kitchen: 1, bedroom: 2 }), heroes).map((chore) => chore.id);
    for (const id of before) expect(after).toContain(id);
  });

  it("gives every chore of a list its own id", () => {
    for (const type of Object.values(PROJECT_TYPES)) {
      const ids = suggestChores(type, fullHouse, heroes).map((chore) => chore.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it("writes ids as phase, slug and room, with the hero after for a chore for each hero", () => {
    const chores = suggestChores(PROJECT_TYPES["moving-out"], fullHouse, heroes);
    expect(chores.map((chore) => chore.id)).toContain("declutter:keep-donate-trash:house:kai");
    expect(chores.map((chore) => chore.id)).toContain("quiet:garage:garage");
  });

  it("never changes the type it is given", () => {
    const before = JSON.stringify(PROJECT_TYPES);
    suggestChores(PROJECT_TYPES["spring-cleaning"], fullHouse, heroes);
    suggestChores(PROJECT_TYPES["moving-out"], fullHouse, heroes);
    expect(JSON.stringify(PROJECT_TYPES)).toBe(before);
  });

  it("returns fresh chores: editing one list does not touch another", () => {
    const type = PROJECT_TYPES["spring-cleaning"];
    const first = suggestChores(type, fullHouse, heroes);
    const snapshot = JSON.stringify(first);
    first[0].assignee.push("intruder");
    first[0].name = "Renamed";
    first[first.length - 1].assignee.length = 0;
    const second = suggestChores(type, fullHouse, heroes);
    expect(JSON.stringify(second)).toBe(snapshot);
  });

  it("gives the real types a chore in every phase of a full house, each with an assignee", () => {
    for (const type of Object.values(PROJECT_TYPES)) {
      const chores = suggestChores(type, fullHouse, heroes);
      for (const phase of type.phases) expect(chores.some((chore) => chore.phaseId === phase.id)).toBe(true);
      expect(chores.every((chore) => chore.assignee.length > 0)).toBe(true);
    }
  });

  it("leaves out the garage chores of a house with no garage", () => {
    const noGarage = house({ ...DEFAULT_MOVING_ROOMS, garage: 0 });
    const chores = suggestChores(PROJECT_TYPES["spring-cleaning"], noGarage, heroes);
    expect(chores.map((chore) => chore.id)).not.toContain("declutter:garage-sort:garage");
    expect(suggestChores(PROJECT_TYPES["spring-cleaning"], fullHouse, heroes).map((chore) => chore.id)).toContain("declutter:garage-sort:garage");
  });
});

describe("choresFromLastRun", () => {
  const chore = (over: Partial<ProjectChore> & { id: string }): ProjectChore => ({
    phaseId: "p1", roomId: "kitchen", name: `Name ${over.id}`, difficulty: 3, assignee: ["kai"], ...over,
  });
  const lastRun: ProjectChore[] = [
    chore({ id: "p1:a:kitchen", name: "Renamed Oven", difficulty: 8, assignee: ["mom"], beastId: "beast-1", minutes: 45 }),
    chore({ id: "custom-1", name: "Wash the Dog", difficulty: 3, assignee: ["kai"], roomId: "yard", custom: true }),
    chore({ id: "roof:boss:roof", phaseId: "roof", roomId: "roof", name: "The Boss", difficulty: 8, assignee: ["lia", "kai", "mom"] }),
  ];

  it("keeps names, sizes, places, beasts, minutes and the chores the Game Master added", () => {
    const next = choresFromLastRun(lastRun, [lia, kai, mom]);
    expect(next).toHaveLength(3);
    expect(next[0]).toMatchObject({ name: "Renamed Oven", difficulty: 8, phaseId: "p1", roomId: "kitchen", beastId: "beast-1", minutes: 45, assignee: ["mom"] });
    expect(next[1]).toMatchObject({ name: "Wash the Dog", custom: true, roomId: "yard", assignee: ["kai"] });
    expect(next[2]).toMatchObject({ phaseId: "roof", roomId: "roof", assignee: ["lia", "kai", "mom"] });
  });

  it("gives every chore a fresh id by adding a run suffix, ~r1 the first time", () => {
    const next = choresFromLastRun(lastRun, [lia, kai, mom]);
    expect(next.map((c) => c.id)).toEqual(["p1:a:kitchen~r1", "custom-1~r1", "roof:boss:roof~r1"]);
  });

  it("counts the run up each time it is rerun, never stacking suffixes", () => {
    const second = choresFromLastRun(choresFromLastRun(lastRun, [lia, kai, mom]), [lia, kai, mom]);
    expect(second.map((c) => c.id)).toEqual(["p1:a:kitchen~r2", "custom-1~r2", "roof:boss:roof~r2"]);
    const third = choresFromLastRun(second, [lia, kai, mom]);
    expect(third[0].id).toBe("p1:a:kitchen~r3");
  });

  it("keeps the ids of a list unique", () => {
    const messy = [chore({ id: "dup" }), chore({ id: "dup~r1" }), chore({ id: "other" })];
    const ids = choresFromLastRun(messy, [kai]).map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => !messy.some((m) => m.id === id))).toBe(true);
  });

  it("drops an assignee who is no longer a hero and keeps the ones who are", () => {
    const next = choresFromLastRun(lastRun, [kai, mom]);
    expect(next[2].assignee).toEqual(["kai", "mom"]);
  });

  it("drops a hero who is now sitting out", () => {
    const next = choresFromLastRun(lastRun, [{ ...mom, band: "out" }, kai]);
    expect(next[0].assignee).not.toContain("mom");
    expect(next[0].assignee).toEqual(["kai"]);
  });

  it("re-assigns a chore left with nobody by the band its size fits", () => {
    const orphans = [
      chore({ id: "s", difficulty: 1, assignee: ["gone"] }),
      chore({ id: "m", difficulty: 3, assignee: ["gone"] }),
      chore({ id: "l", difficulty: 8, assignee: ["gone"] }),
    ];
    const next = choresFromLastRun(orphans, [lia, kai, mom]);
    expect(assigneesOf(next)).toEqual([["lia"], ["kai"], ["mom"]]);
  });

  it("rotates the re-assigned chores round-robin through the band", () => {
    const orphans = ["a", "b", "c"].map((id) => chore({ id, difficulty: 3, assignee: ["gone"] }));
    const next = choresFromLastRun(orphans, [kai, kit]);
    expect(assigneesOf(next)).toEqual([["kai"], ["kit"], ["kai"]]);
  });

  it("falls back to another band when the band it fits has no hero", () => {
    const orphans = [chore({ id: "l", difficulty: 8, assignee: ["gone"] }), chore({ id: "s", difficulty: 1, assignee: ["gone"] })];
    const next = choresFromLastRun(orphans, [kai]);
    expect(assigneesOf(next)).toEqual([["kai"], ["kai"]]);
  });

  it("keeps the size of a re-assigned chore as the Game Master left it", () => {
    const next = choresFromLastRun([chore({ id: "l", difficulty: 13, assignee: ["gone"] })], [kai]);
    expect(next[0].difficulty).toBe(13);
  });

  it("gives a chore that was a team's to every hero now playing when the whole team is gone", () => {
    const team = chore({ id: "t", difficulty: 8, assignee: ["old1", "old2", "old3"] });
    const next = choresFromLastRun([team], [lia, kai, mom]);
    expect(next[0].assignee).toEqual(["lia", "kai", "mom"]);
  });

  it("gives an unassigned chore an assignee by its size", () => {
    const next = choresFromLastRun([chore({ id: "u", difficulty: 8, assignee: [] })], [kai, mom]);
    expect(next[0].assignee).toEqual(["mom"]);
  });

  it("leaves chores unassigned when nobody is playing", () => {
    const next = choresFromLastRun(lastRun, []);
    expect(next.every((c) => c.assignee.length === 0)).toBe(true);
    expect(next.map((c) => c.name)).toEqual(["Renamed Oven", "Wash the Dog", "The Boss"]);
  });

  it("answers an empty list for an empty list", () => {
    expect(choresFromLastRun([], [kai])).toEqual([]);
  });

  it("returns fresh chores and leaves the last list alone", () => {
    const before = JSON.stringify(lastRun);
    const next = choresFromLastRun(lastRun, [lia, kai, mom]);
    expect(JSON.stringify(lastRun)).toBe(before);
    next[0].assignee.push("intruder");
    next[0].name = "Changed";
    expect(JSON.stringify(lastRun)).toBe(before);
    next.forEach((c, index) => expect(c).not.toBe(lastRun[index]));
  });

  it("rebuilds a whole suggested list: same chores and sizes, new ids", () => {
    const heroes = [lia, kai, mom];
    const type = PROJECT_TYPES["spring-cleaning"];
    const first = suggestChores(type, house({ ...DEFAULT_MOVING_ROOMS }), heroes);
    const again = choresFromLastRun(first, heroes);
    expect(again.map((c) => [c.name, c.difficulty, c.assignee])).toEqual(first.map((c) => [c.name, c.difficulty, c.assignee]));
    expect(again.map((c) => c.id)).toEqual(first.map((c) => `${c.id}~r1`));
  });
});
