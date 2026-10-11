/**
 * The Pegasus chest frees the Pegasus of the temple's world, marks the temple cleared, and hands out the
 * Wind Whistle item in the wind temple only.
 */
import { createPinia, setActivePinia } from "pinia";
import { TEMPLE_METADATA } from "@/lib/engine/temples/templeRegistry";
import {
  PEGASI,
  chestItemUnlocks,
  freeTemplePegasus,
  pegasusOfTemple,
  pegasusOfWorld,
} from "@/lib/services/temples/TemplePegasus";
import { HERO, addHero, enter, hero, makeTemple, temples } from "./templeFixtures";

jest.mock("@/lib/databases/ProfileDb", () => {
  class MockProfileDb {
    setProfile = jest.fn();
    getAll = jest.fn().mockResolvedValue([]);
  }
  return { __esModule: true, ProfileDb: MockProfileDb, default: MockProfileDb };
});
jest.mock("@/lib/services/core/StorageService", () => ({
  __esModule: true,
  default: { saveUsers: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock("@/lib/databases/TempleProgressDb", () => ({
  getTempleProgressDb: () => ({
    getProgress: () => Promise.resolve(null),
    saveProgress: (progress: unknown) => Promise.resolve(progress),
  }),
}));

beforeEach(() => {
  setActivePinia(createPinia());
  addHero();
});

describe("the nine Pegasi", () => {
  it("sit in the order of stats.pegasi, one per world", () => {
    expect(PEGASI.map((pegasus) => pegasus.index)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(PEGASI.map((pegasus) => pegasus.name)).toEqual(["Ventus", "Ignis", "Sol", "Aura", "Terra", "Glacie", "Aqua", "Venenum", "Umbra"]);
    expect(new Set(PEGASI.map((pegasus) => pegasus.world)).size).toBe(9);
  });

  it("every registered temple keeps one, and no two temples the same", () => {
    const found = Object.keys(TEMPLE_METADATA).map((id) => pegasusOfTemple(id)?.index);
    expect(found).not.toContain(undefined);
    expect(new Set(found).size).toBe(Object.keys(TEMPLE_METADATA).length);
  });

  it("answers to the screens' other names for a world", () => {
    expect(pegasusOfWorld("sands")?.name).toBe("Sol");
    expect(pegasusOfWorld("the-moon")?.name).toBe("Umbra");
    expect(pegasusOfWorld("tundra")?.name).toBe("Glacie");
    expect(pegasusOfWorld("atlantis")).toBeUndefined();
  });

  it("maps the authored temples to their worlds' Pegasi", () => {
    expect(pegasusOfTemple("wind-temple")?.name).toBe("Aura");
    expect(pegasusOfTemple("fire-temple")?.name).toBe("Ignis");
    expect(pegasusOfTemple("ice-temple")?.name).toBe("Glacie");
    expect(pegasusOfTemple("moon-temple")?.name).toBe("Umbra");
    expect(pegasusOfTemple("storm-temple")?.name).toBe("Ventus");
    expect(pegasusOfTemple("no-such-temple")).toBeUndefined();
  });
});

describe("chestItemUnlocks", () => {
  it("hands out the Wind Whistle in the wind temple only", () => {
    expect(chestItemUnlocks("wind-temple", "Pegasus Whistle")).toEqual(["Pegasus Whistle", "Wind Whistle"]);
    expect(chestItemUnlocks("ice-temple", "Pegasus Whistle")).toEqual([]);
  });

  it("leaves the other chest items as they were", () => {
    expect(chestItemUnlocks("ice-temple", "Frost Wand")).toEqual(["Frost Wand", "Ice Wand"]);
    expect(chestItemUnlocks("wind-temple", "golden key")).toEqual(["golden key"]);
  });
});

describe("freeTemplePegasus", () => {
  const pegasusChest = (id: string) => {
    // The temple engine outlives a test: a registered temple's progress (cleared or not) starts over for each
    delete (temples as unknown as { templeStates: Record<string, unknown> }).templeStates[id];
    makeTemple({ E: { type: "entrance" }, P: { type: "loot", content: { chest: "dungeon", dungeon: "Pegasus Whistle", pegasus: true } } }, [["E", "P"]], id);
    enter(id, [0, 1]);
  };

  it("frees the world's Pegasus on the hero, clears the temple and says so", () => {
    pegasusChest("fire-temple");

    const outcome = freeTemplePegasus("fire-temple", HERO);

    expect(outcome).toEqual({
      message: "The Ignis is free!",
      pegasus: { index: 1, name: "Ignis", world: "mountains" },
      // The first clear pays the temple's reward, and hands the temple screen the tally for its reveal
      cleared: { xp: 150, gp: 50, ap: 3, levelUp: false },
    });
    expect(hero().stats.pegasi).toEqual([false, true, false, false, false, false, false, false, false]);
    expect(temples.isTempleCleared("fire-temple")).toBe(true);
  });

  it("clears a temple the registry does not know, without a Pegasus to free", () => {
    pegasusChest("custom-temple");

    expect(freeTemplePegasus("custom-temple", HERO)).toEqual({
      message: "A Pegasus is free!",
      cleared: { xp: 150, gp: 50, ap: 3, levelUp: false },
    });
    expect(hero().stats.pegasi).toBeUndefined();
    expect(temples.isTempleCleared("custom-temple")).toBe(true);
  });

  it("clears the temple for a run without a hero, and frees nobody's Pegasus", () => {
    pegasusChest("ice-temple");

    const outcome = freeTemplePegasus("ice-temple");

    expect(outcome).toMatchObject({ message: "The Glacie is free!" });
    expect(outcome.cleared).toBeUndefined();
    expect(hero().stats.pegasi).toBeUndefined();
    expect(temples.isTempleCleared("ice-temple")).toBe(true);
  });

  it("frees the Pegasus the chest's prize names instead of the temple's own, and says so", () => {
    pegasusChest("fire-temple");

    const outcome = freeTemplePegasus("fire-temple", HERO, "Terra");

    expect(outcome).toMatchObject({ message: "The Terra is free!", pegasus: { index: 4, name: "Terra" } });
    expect(hero().stats.pegasi).toEqual([false, false, false, false, true, false, false, false, false]);
  });

  it("frees the temple's own Pegasus when the prize names none (the whistle)", () => {
    pegasusChest("fire-temple");

    expect(freeTemplePegasus("fire-temple", HERO, "Pegasus Whistle").pegasus?.name).toBe("Ignis");
  });

  it("pays the clear reward once: a second Pegasus chest in a cleared temple pays nothing", () => {
    pegasusChest("fire-temple");
    freeTemplePegasus("fire-temple", HERO);

    const again = freeTemplePegasus("fire-temple", HERO);

    expect(again.cleared).toBeUndefined();
    expect(again.pegasus?.name).toBe("Ignis");
    expect(hero().stats.gp.wallet).toBe(150);
  });
});
