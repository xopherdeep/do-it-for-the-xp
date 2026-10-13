import type { Beast } from "@/lib/databases/BestiaryDb";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { pickRoomBeast, standInMonster, templeElementFor } from "@/lib/services/temples/RoomBeast";

/**
 * The one rule behind "which beast lives in this combat room": the room screen (voxel monster, reveal) and the
 * battle both ask pickRoomBeast, so what the hero sees is what the hero fights.
 */

const beast = (id: string, name: string, element?: string): Beast => ({ id, name, checklist: [], element });

const room = (content: Room["content"] = {}, type = "monster"): Room => ({ type, content });

describe("pickRoomBeast", () => {
  const dustBunnyKing = beast("b-dust", "Dust Bunny King", "earth");
  const weedWyrm = beast("b-weed", "Weed Wyrm", "earth");
  const hydra = beast("b-hydra", "Homework Hydra", "light");
  const sentinel = beast("b-sentinel", "Light Sentinel", "wind");
  const all = [dustBunnyKing, weedWyrm, hydra, sentinel];

  it("gives an authored beast that beast", () => {
    expect(pickRoomBeast(room({ beasts: ["b-hydra"] }), "earth", 0, 0, all)).toBe(hydra);
  });

  it("matches an authored id whatever its type", () => {
    const numeric = beast(7 as unknown as string, "Numbered Newt", "earth");
    expect(pickRoomBeast(room({ beasts: ["7"] }), "earth", 0, 0, [numeric])).toBe(numeric);
  });

  it("gives an authored beast the bestiary no longer has nothing, even when the element has beasts", () => {
    expect(pickRoomBeast(room({ beasts: ["b-gone"] }), "earth", 0, 0, all)).toBeNull();
  });

  it("matches a monsterType to a beast's name", () => {
    const picked = pickRoomBeast(room({ monsterType: "LightSentinel", beasts: [] }), "earth", 0, 0, all);
    expect(picked).toBe(sentinel);
  });

  it("matches a monsterType with dashes, underscores and case stripped", () => {
    const picked = pickRoomBeast(room({ monsterType: "weed_WYRM" }), "light", 0, 0, all);
    expect(picked).toBe(weedWyrm);
  });

  it('ignores the monsterType "small"', () => {
    const picked = pickRoomBeast(room({ monsterType: "small", beasts: [] }), "earth", 0, 0, all);
    expect(picked).toBe(dustBunnyKing);
  });

  it("indexes the element's beasts by row plus column", () => {
    const small = room({ monsterType: "small", beasts: [] });
    expect(pickRoomBeast(small, "earth", 0, 0, all)).toBe(dustBunnyKing);
    expect(pickRoomBeast(small, "earth", 0, 1, all)).toBe(weedWyrm);
    expect(pickRoomBeast(small, "earth", 1, 0, all)).toBe(weedWyrm);
    expect(pickRoomBeast(small, "earth", 1, 1, all)).toBe(dustBunnyKing);
  });

  it("answers the same for (row 2, col 1) as for (row 1, col 2)", () => {
    const three = [dustBunnyKing, weedWyrm, beast("b-rock", "Rock Roach", "earth")];
    const bare = room({ beasts: [] });
    expect(pickRoomBeast(bare, "earth", 2, 1, three)).toBe(pickRoomBeast(bare, "earth", 1, 2, three));
  });

  it("never gives a beast of another element when nothing else matches", () => {
    expect(pickRoomBeast(room({ beasts: [] }), "fire", 0, 0, all)).toBeNull();
  });

  it("gives nothing when the bestiary is empty", () => {
    expect(pickRoomBeast(room({ beasts: [] }), "earth", 0, 0, [])).toBeNull();
  });

  it("copes with a room that has no content", () => {
    expect(pickRoomBeast({ type: "monster" }, "earth", 0, 0, all)).toBe(dustBunnyKing);
  });
});

describe("pickRoomBeast: a dormant quest room", () => {
  const dishGoblin = beast("beast-dish-goblin", "Dish Goblin (the family's)", "water");
  const hydra = beast("b-hydra", "Homework Hydra", "light");
  const weedWyrm = beast("b-weed", "Weed Wyrm", "earth");
  const quest = (beastId: string) => ({ beastId, difficulty: 2, basicSchedule: "daily" });

  it("gives the template's beast from the family's bestiary", () => {
    expect(pickRoomBeast(room({ quest: quest("b-hydra") }), "earth", 0, 0, [weedWyrm, hydra])).toBe(hydra);
  });

  it("beats a monsterType and the element's beasts", () => {
    const picked = pickRoomBeast(room({ quest: quest("b-hydra"), monsterType: "weedwyrm" }), "earth", 0, 0, [weedWyrm, hydra]);
    expect(picked).toBe(hydra);
  });

  it("prefers the family's copy of a library beast to the library's", () => {
    expect(pickRoomBeast(room({ quest: quest("beast-dish-goblin") }), "shadow", 0, 0, [dishGoblin])).toBe(dishGoblin);
  });

  it("gives the library's beast, ready to be adopted under the same id, when the bestiary does not have it yet", () => {
    const picked = pickRoomBeast(room({ quest: quest("beast-dish-goblin") }), "shadow", 0, 0, []);
    expect(picked).toMatchObject({ id: "beast-dish-goblin", name: "Dish Goblin", theme: "shadow" });
    expect(picked?.checklist.length).toBeGreaterThan(0);
  });

  it("falls back to the usual rules when the template's beast is nowhere", () => {
    const picked = pickRoomBeast(room({ quest: quest("beast-nobody"), monsterType: "weedwyrm" }), "light", 0, 0, [weedWyrm]);
    expect(picked).toBe(weedWyrm);
    expect(pickRoomBeast(room({ quest: quest("beast-nobody") }), "fire", 0, 0, [weedWyrm])).toBeNull();
  });

  it("leaves an authored beast first: a classic room is never read as a quest room", () => {
    expect(pickRoomBeast(room({ beasts: ["b-weed"], quest: quest("b-hydra") }), "earth", 0, 0, [weedWyrm, hydra])).toBe(weedWyrm);
    expect(pickRoomBeast(room({ beasts: ["b-gone"], quest: quest("b-hydra") }), "earth", 0, 0, [weedWyrm, hydra])).toBeNull();
  });
});

describe("templeElementFor", () => {
  it("takes the element of a shipped temple from its id", () => {
    expect(templeElementFor("wind-temple")).toBe("wind");
    expect(templeElementFor("earth-temple", "fire")).toBe("earth");
  });

  it("takes a generated temple's own element", () => {
    expect(templeElementFor("gen-x", "fire")).toBe("fire");
  });

  it('falls back to the id when a generated temple has no element or "none"', () => {
    expect(templeElementFor("gen-x")).toBe("gen-x");
    expect(templeElementFor("gen-x", "none")).toBe("gen-x");
  });

  it("falls back to wind when there is no id", () => {
    expect(templeElementFor("")).toBe("wind");
  });
});

describe("standInMonster", () => {
  it("names a mob after the temple's element", () => {
    expect(standInMonster({ type: "monster" } as Room, "storm").name).toBe("Spark Wisp");
    expect(standInMonster({ type: "monster" } as Room, "earth")).toEqual({ name: "Rock Golem", avatarId: 27 });
  });

  it("names a boss after the temple's element", () => {
    expect(standInMonster({ type: "boss" } as Room, "earth")).toEqual({ name: "Titan", avatarId: 14 });
  });

  it("names a miniboss after the temple's element", () => {
    expect(standInMonster({ type: "miniboss" } as Room, "fire")).toEqual({ name: "Fire Elemental", avatarId: 22 });
  });

  it("names a room after its monsterType, spaced and capitalised", () => {
    const named = room({ monsterType: "LightSentinel" });
    expect(standInMonster(named, "earth").name).toBe("Light Sentinel");
  });

  it("prefers a name the Game Master wrote for the beast", () => {
    expect(standInMonster(room({ monsterName: "Big Steve", monsterType: "LightSentinel" }), "earth").name).toBe("Big Steve");
    expect(standInMonster(room({ beastName: "Little Steve" }), "earth").name).toBe("Little Steve");
  });

  it("never names the beast after the room: the Old House kitchen's stand-in is the element's beast", () => {
    expect(standInMonster(room({ name: "Kitchen" }), "earth")).toEqual({ name: "Rock Golem", avatarId: 27 });
    expect(standInMonster(room({ name: "Kitchen", monsterName: "Big Steve" }), "earth").name).toBe("Big Steve");
    expect(standInMonster(room({ name: "Garage" }, "miniboss"), "fire").name).toBe("Fire Elemental");
  });

  it("falls back to a Dust Bunny in an element it has no table for", () => {
    expect(standInMonster({ type: "monster" } as Room, "mystery")).toEqual({ name: "Dust Bunny", avatarId: 74 });
  });
});
