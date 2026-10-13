/**
 * The cells of the Old House: which rooms the home has, what each is called, which floor it is on, what it hangs off
 * and which of the pack's quests it holds, in the order they are placed.
 *
 * Pure: no storage, no Vue. `houseCellsFor(pack, answers)` reads the rooms the family ticked, who plays and how many
 * floors the home has. A cell says what it hangs off and which directions to try first, never where it ends up, so
 * the step that lays the cells on a grid decides that, and the same answers always give the same cells (the move
 * date never changes them). Every chore of the pack's old-house phases (not the unpack phase) sits in exactly one
 * cell, so no quest is lost to the temple and none is fought twice.
 */
import type { Direction } from "@/lib/engine/dungeons/generator";
import type { MovingAnswers, MovingHero, MovingPack, MovingRoomId } from "../movingPack";
import type { PackBand } from "../packCommon";

export type HouseFloor = "B1" | "1F" | "2F";

export type HouseCellKind =
  | "entrance" | "quest" | "guard" | "boss" | "master" | "masterKey" | "key" | "map" | "compass"
  | "camp" | "heal" | "save" | "stairsUp" | "stairsDown" | "loot";

/** Cells touch only cells of their own zone, except the one link to the cell they hang off */
export type HouseZone = "house" | "drawer" | "driveway" | "wing";

export interface HouseCell {
  id: string;
  name: string;
  kind: HouseCellKind;
  floor: HouseFloor;
  /** The cells it may hang off, first built one wins; empty for fixed cells and landings */
  parents: string[];
  /** Directions from the parent tried first, in order */
  prefer: Direction[];
  zone: HouseZone;
  /** A fixed cell of the 9x9 frame, [row, col] */
  at?: [number, number];
  /** A landing: the stairs cell on 1F it stands over or under */
  twinOf?: string;
  /** Pack quest ids, in list order; empty for cells that are not fights */
  questIds: string[];
  /** The small-key room: its parent's door into it is locked */
  lockedFromParent?: boolean;
}

const VAN_QUEST = "move-load-van";

/** A hero who plays, and the two bands that sleep in the kids' rooms */
type Player = MovingHero & { band: PackBand };
type Child = MovingHero & { band: "kid" | "little" };

/** The chores each band keeps in its own bedroom, in the order they are met there */
const BEDROOM_SLUGS: Record<Child["band"], string[]> = {
  kid: ["keep-donate-trash", "books-kid", "dresser-kid", "backpack-kid", "clear-old-room"],
  little: ["toy-triage", "books-little", "toys-little", "backpack-little", "dust-bunny-hunt"],
};

const COMPASS: Record<string, Direction> = { N: "north", E: "east", S: "south", W: "west" };

/** "WNE" as directions, so the cell table below reads at a glance */
const dirs = (letters: string): Direction[] => Array.from(letters, (letter) => COMPASS[letter]);

/** A cell as the table writes it: the plain ones fall back to a fight room on the ground floor of the house */
type Draft = Pick<HouseCell, "id" | "name"> & Partial<Omit<HouseCell, "parents" | "prefer">> & { parents?: string[]; prefer?: string };

interface Bedroom {
  id: string;
  name: string;
  questIds: string[];
}

const nameOf = (hero: MovingHero): string => hero.name || "Hero";

/** "Twelve's bedroom", "Twelve and Six's room", "Twelve, Six and Teen's room" */
const bedroomNameOf = (occupants: Child[]): string => {
  const names = occupants.map(nameOf);
  if (names.length === 1) return `${names[0]}'s bedroom`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}'s room`;
};

/**
 * The cells of the old house for a pack and the answers it was built from, or null when nobody plays or the pack has
 * no "Load the Van" quest. A cell is left out when it is given a list of quests and none of them exist, and a cell's
 * `parents` name only cells that were built.
 */
export function houseCellsFor(pack: MovingPack, answers: MovingAnswers): HouseCell[] | null {
  const known = new Set(pack.quests.map((quest) => String(quest.id)));
  const heroes = answers.heroes.filter((hero): hero is Player => hero.band !== "out");
  if (!heroes.length || !known.has(VAN_QUEST)) return null;

  const count = (room: MovingRoomId): number => Math.max(0, Math.floor(Number(answers.rooms[room]) || 0));
  const has = (room: MovingRoomId): boolean => count(room) > 0;
  const kept = (ids: string[]): string[] => ids.filter((id) => known.has(id));
  /** The pack's quests for these slugs, in the order given */
  const shared = (...slugs: string[]): string[] => kept(slugs.map((slug) => `move-${slug}`));
  const daily = (...slugs: string[]): string[] => kept(slugs.map((slug) => `move-daily-${slug}`));
  /** Hero by hero, each hero's own quests for these slugs */
  const own = (list: readonly MovingHero[], ...slugs: string[]): string[] =>
    kept(list.flatMap((hero) => slugs.map((slug) => `move-${slug}-${hero.id}`)));

  const grownups = heroes.filter((hero) => hero.band === "grownup");
  const kids = heroes.filter((hero) => hero.band === "kid");
  const littles = heroes.filter((hero) => hero.band === "little");
  const children = heroes.filter((hero): hero is Child => hero.band !== "grownup");
  const ownBedroomQuests = (list: readonly Child[]): string[] => list.flatMap((child) => own([child], ...BEDROOM_SLUGS[child.band]));

  // The bedrooms: the grown-ups share the main one; the children are dealt round robin into the rest
  const bedrooms: Bedroom[] = [];
  if (has("bedroom")) {
    if (grownups.length) {
      bedrooms.push({
        id: "bedroom-main",
        name: grownups.length === 1 ? `${nameOf(grownups[0])}'s bedroom` : "Main bedroom",
        questIds: [...own(grownups, "closet-grownup"), ...shared("beds-apart")],
      });
    }
    const roomsForChildren = grownups.length ? Math.max(1, count("bedroom") - 1) : count("bedroom");
    const shares: Child[][] = Array.from({ length: Math.min(roomsForChildren, children.length) }, () => []);
    children.forEach((child, index) => shares[index % shares.length].push(child));
    shares.forEach((occupants, index) => {
      bedrooms.push({ id: `bedroom-${index + 1}`, name: bedroomNameOf(occupants), questIds: ownBedroomQuests(occupants) });
    });
  }

  // What each room of the house holds
  const livingIds = has("living") ? [...shared("living-dining", "game-shelf"), ...daily("tidy")] : [];
  const diningIds = has("dining")
    ? [...shared("supplies", "box-labels", "frames"), ...(livingIds.length ? [] : shared("living-dining"))]
    : [];
  const kitchenIds = has("kitchen") ? [...shared("dishes", "pantry-fridge", "mugs"), ...daily("dishes")] : [];
  const garageIds = has("garage") ? shared("garage", "garage-gear") : [];
  const laundryIds = has("laundry") ? shared("laundry") : [];
  const yardIds = has("yard") ? shared("yard") : [];
  const petsIds = has("pets") ? [...shared("pets"), ...daily("feed-pets")] : [];
  const bathIds = has("bathroom") ? [...shared("bathrooms"), ...daily("teeth")] : [];
  const storageIds = has("storage") ? shared("storage") : [];
  const guestIds = has("guest") ? shared("guest-room") : [];
  const officeIds = has("office") ? shared("office", "paperwork") : [];

  // The key guard: the kitchen; else the garage (its first chore, the rest at the workbench); else a packing pile
  const guard = kitchenIds.length ? "kitchen" : garageIds.length ? "garage" : shared("open-first").length ? "packingPile" : undefined;

  // The small-key room: the first of the basement stairs, the garage (when it is not the guard) and the yard.
  // The basement is there for the storage chore, so with no chore to go down for there are no stairs either.
  const hasBasement = answers.basement === true && storageIds.length > 0;
  const wing = hasBasement ? "basementStairs" : garageIds.length && guard !== "garage" ? "garage" : yardIds.length ? "yard" : undefined;
  const wingOf = (id: string): Partial<Pick<HouseCell, "zone" | "lockedFromParent">> => (id === wing ? { zone: "wing", lockedFromParent: true } : {});

  // Whatever has no room of its own goes to the front hall
  const hallIds = [
    ...(guard === "packingPile" ? [] : shared("open-first")),
    ...shared("donation-run"),
    ...own(kids, "light-boxes"),
    ...own(littles, "pillow-parade"),
    ...(officeIds.length ? [] : shared("paperwork")),
    ...(diningIds.length ? [] : shared("supplies", "box-labels", "frames")),
    ...(livingIds.length ? [] : daily("tidy")),
    ...(bathIds.length ? [] : daily("teeth")),
    ...(kitchenIds.length ? [] : daily("dishes")),
    ...(has("bedroom") ? [] : ownBedroomQuests(children)),
  ];

  const twoFloors = answers.floors === 2 && (bedrooms.length > 0 || guestIds.length > 0 || officeIds.length > 0);

  const cells: HouseCell[] = [];
  const add = (draft: Draft): void => {
    if (draft.questIds && !draft.questIds.length) return;
    cells.push({
      kind: "quest", floor: "1F", zone: "house", questIds: [],
      ...draft, parents: draft.parents ?? [], prefer: dirs(draft.prefer ?? ""),
    });
  };
  /** The bedrooms, guest room and office: upstairs on a house of two floors, else off the hall */
  const addUpstairs = (): void => {
    const where = (parents: string[], prefer: string) =>
      twoFloors ? { floor: "2F" as const, parents, prefer } : { floor: "1F" as const, parents: ["hall"], prefer: "WEN" };
    for (const bedroom of bedrooms) add({ ...bedroom, ...where(["upHall", "landing"], "WENS") });
    add({ id: "guest", name: "Guest room", ...where(["upHall"], "WEN"), questIds: guestIds });
    add({ id: "office", name: "Home office", ...where(["upHall"], "EWN"), questIds: officeIds });
  };

  /** The junk drawer goes in right after its guard, while the guard still has free sides to hang it on */
  const addDrawerAfter = (room: string): void => {
    if (guard === room) add({ id: "drawer", name: "Junk drawer", kind: "masterKey", parents: [room], prefer: "NEWS", zone: "drawer" });
  };

  // The cells, in the order they are placed. The driveway is fixed: the porch, the van, the last look, the keys.
  add({ id: "porch", name: "Front porch", kind: "entrance", at: [8, 4] });
  add({ id: "van", name: "The moving van", kind: "boss", parents: ["porch"], zone: "driveway", at: [8, 3], questIds: [VAN_QUEST] });
  add({ id: "lastLook", name: "Last look", parents: ["van"], zone: "driveway", at: [8, 2], questIds: shared("walkthrough", "deep-clean") });
  add({ id: "master", name: "Keys to the New House", kind: "master", parents: ["lastLook"], zone: "driveway", at: [8, 1] });
  add({ id: "camp", name: "Sleeping bags", kind: "camp", parents: ["porch"], at: [8, 5] });
  add({ id: "hall", name: "Front hall", parents: ["porch"], at: [7, 4], questIds: hallIds });
  add({ id: "map", name: "Coat closet", kind: "map", parents: ["hall"], prefer: "EWN" });
  add({ id: "living", name: "Living room", parents: ["hall"], prefer: "WNE", questIds: livingIds });
  if (wing) add({ id: "couch", name: "Under the couch cushions", kind: "key", parents: ["living", "hall"], prefer: "WNES" });
  add({ id: "dining", name: "Dining room", parents: ["living", "hall"], prefer: "NWE", questIds: diningIds });
  add({ id: "compass", name: "China cabinet", kind: "compass", parents: ["dining", "living", "hall"], prefer: "WNE" });
  add({ id: "pantry", name: "Pantry", parents: ["dining", "hall"], prefer: "NEW", questIds: kitchenIds.slice(1) });
  add({ id: "kitchen", name: "Kitchen", kind: "guard", parents: ["pantry", "dining", "hall"], prefer: "NEW", questIds: kitchenIds.slice(0, 1) });
  addDrawerAfter("kitchen");
  add({
    id: "garage", name: "Garage", kind: guard === "garage" ? "guard" : "quest", parents: ["pantry", "hall"], prefer: "EWN",
    questIds: guard === "garage" ? garageIds.slice(0, 1) : garageIds, ...wingOf("garage"),
  });
  addDrawerAfter("garage");
  add({ id: "workbench", name: "Workbench", parents: ["garage"], prefer: "NEW", questIds: guard === "garage" ? garageIds.slice(1) : [] });
  add({
    id: "packingPile", name: "Packing pile", kind: "guard", parents: ["hall"], prefer: "NEW",
    questIds: guard === "packingPile" ? shared("open-first") : [],
  });
  addDrawerAfter("packingPile");
  add({ id: "laundry", name: "Laundry room", parents: ["pantry", "dining", "hall"], prefer: "WNE", questIds: laundryIds });
  add({ id: "yard", name: "Back yard", parents: ["pantry", "dining", "living", "hall"], prefer: "NEW", questIds: yardIds, ...wingOf("yard") });
  add({ id: "pets", name: "Pet corner", parents: ["living", "hall"], prefer: "SWN", questIds: petsIds });
  add({ id: "bath", name: "Bathroom", parents: ["hall"], prefer: "ENW", questIds: bathIds });
  // With the garage as the small-key room, storage stays out of the wing and hangs off the hall
  if (!hasBasement) {
    add({ id: "storage", name: "Storage room", parents: wing === "garage" ? ["hall"] : ["garage", "hall"], prefer: "NEW", questIds: storageIds });
  }
  if (!twoFloors) addUpstairs();
  if (twoFloors) add({ id: "stairsUp", name: "Stairs up", kind: "stairsUp", parents: ["hall"], prefer: "EWN" });
  if (hasBasement) {
    add({ id: "basementStairs", name: "Basement stairs", kind: "stairsDown", parents: ["hall"], prefer: "WEN", ...wingOf("basementStairs") });
  }
  if (twoFloors) {
    add({ id: "landing", name: "Landing", kind: "stairsDown", floor: "2F", twinOf: "stairsUp" });
    add({ id: "upHall", name: "Upstairs hall", kind: "save", floor: "2F", parents: ["landing"], prefer: "NEWS" });
    addUpstairs();
    const healName = count("bathroom") >= 2 ? "Medicine cabinet" : "Linen closet";
    add({ id: "heal", name: healName, kind: "heal", floor: "2F", parents: ["upHall"], prefer: "EWN" });
  }
  if (hasBasement) {
    add({ id: "b1Landing", name: "Basement", kind: "stairsUp", floor: "B1", twinOf: "basementStairs" });
    add({ id: "storage", name: "Storage", floor: "B1", parents: ["b1Landing"], prefer: "NEWS", questIds: storageIds });
    add({ id: "forgotten", name: "Forgotten box", kind: "loot", floor: "B1", parents: ["b1Landing", "storage"], prefer: "EWNS" });
  }

  const built = new Set(cells.map((cell) => cell.id));
  return cells.map((cell) => ({ ...cell, parents: cell.parents.filter((id) => built.has(id)) }));
}
