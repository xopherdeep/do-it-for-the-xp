/**
 * A Game Master's Chest room with Dungeon Item -> Master Key (the editor writes the id `master-key`) holds the Boss
 * Key: the chest reveal shows a key, and taking it grants the key that opens the boss door and unlocks no item. The
 * Wind Whistle only comes from a chest whose dungeon item really is the whistle (the Wind Temple's Pegasus chest).
 * Taking goes through the same hook the temple screen uses (useTemple.processChestItems).
 */
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { useTemple } from "@/hooks/temples/useTemple";
import { resetVisitMemory, roomActions } from "@/lib/services/temples/RoomInteractions";
import { HERO, addHero, contextAt, dungeons, enter, hero, makeTemple, temples } from "./templeFixtures";

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
  resetVisitMemory();
  addHero();
  // A hero who has earned no items yet: what a chest unlocks lands in this list
  hero().unlockedItems = [];
});

/** The temple engine outlives a test: a registered temple's progress starts over for each. */
const forget = (id: string) => {
  delete (temples as unknown as { templeStates: Record<string, unknown> }).templeStates[id];
};

const chestTemple = (id: string, content: Room["content"], extra: Partial<Room> = {}) => {
  forget(id);
  makeTemple({ E: { type: "entrance" }, C: { type: "loot", ...extra, content } as Room }, [["E", "C"]], id);
  enter(id, [0, 1]);
  return id;
};

/** The temple screen's take: the hook files what the chest held, and the reveal's rows are what it showed. */
const take = (templeId: string, items: string[]) => {
  const messages: string[] = [];
  const wrapper = mount(
    defineComponent({
      setup() {
        const temple = useTemple(templeId, [0, 1], undefined, HERO);
        temple.registerMessageDisplay((message) => messages.push(message));
        return temple;
      },
      render: () => null,
    })
  );
  const vm = wrapper.vm as any;
  const rows = vm.chestContents.map((item: { value: string; name: string; icon: string; tier: string }) => ({ ...item }));
  vm.processChestItems(items);
  const keys = vm.playerKeys.valueOf();
  wrapper.unmount();
  return { messages, rows, keys };
};

const pegasi = () => hero().stats.pegasi as boolean[] | undefined;

describe("a chest the Game Master filled with the Boss Key", () => {
  const authored = { chest: "dungeon", dungeon: "master-key" };

  it.each(["wind-temple", "ice-temple", "gen-some-seed"])("shows a key in the chest reveal, named the Boss Key (%s)", (id) => {
    chestTemple(id, authored);

    const { rows } = take(id, []);

    expect(rows).toEqual([expect.objectContaining({ value: "master-key", name: "Boss Key", icon: "key-skeleton", tier: "key" })]);
  });

  it.each(["wind-temple", "ice-temple", "gen-some-seed"])("grants the master key and unlocks no item (%s)", (id) => {
    chestTemple(id, authored);
    expect(temples.hasMasterKey(id)).toBe(false);

    take(id, ["master-key"]);

    expect(temples.hasMasterKey(id)).toBe(true);
    expect(hero().unlockedItems).toEqual([]);
    expect(pegasi()).toBeUndefined();
    expect(temples.isTempleCleared(id)).toBe(false);
  });

  it("opens the boss door's lock for the hero who took it", () => {
    chestTemple("wind-temple", authored);
    take("wind-temple", ["master-key"]);

    expect(temples.hasMasterKey("wind-temple")).toBe(true);
  });

  it("still grants the key from a room that was a Pegasus chest before it was edited (a stale pegasus flag)", () => {
    chestTemple("wind-temple", { chest: "dungeon", dungeon: "master-key", pegasus: true });

    const { rows } = take("wind-temple", ["master-key"]);

    expect(rows.map((row: { name: string }) => row.name)).toEqual(["Boss Key"]);
    expect(temples.hasMasterKey("wind-temple")).toBe(true);
    // It is not the Pegasus chest: nothing is freed, no whistle, the temple is not cleared
    expect(dungeons.getRoom("wind-temple", [0, 1])?.content?.pegasus).toBeUndefined();
    expect(hero().unlockedItems).toEqual([]);
    expect(pegasi()).toBeUndefined();
    expect(temples.isTempleCleared("wind-temple")).toBe(false);
  });

  it("is the same Boss Key chest the built-in temples keep", () => {
    chestTemple("wind-temple", authored);
    const room = dungeons.getRoom("wind-temple", [0, 1])!;

    expect(room.content).toMatchObject({ chest: "dungeon", dungeon: "master-key" });
    expect(roomActions(room, contextAt("wind-temple", [0, 1])).chest).toBe("closed");
  });
});

describe("the Temple Creator's other dungeon items", () => {
  it("takes the editor's small key as a small key", () => {
    chestTemple("wind-temple", { chest: "dungeon", dungeon: "small-key" });

    const { rows, keys } = take("wind-temple", ["key"]);

    expect(rows).toEqual([expect.objectContaining({ value: "key", name: "Small Key", tier: "key" })]);
    expect(keys).toBe(1);
    expect(hero().unlockedItems).toEqual([]);
  });

  it("takes the editor's map as the map", () => {
    chestTemple("wind-temple", { chest: "dungeon", dungeon: "dungeon-map" });

    const { rows } = take("wind-temple", ["map"]);

    expect(rows).toEqual([expect.objectContaining({ value: "map", name: "Dungeon Map" })]);
    expect(temples.getTempleState("wind-temple")?.hasMap).toBe(true);
    expect(hero().unlockedItems).toEqual([]);
  });

  it("takes the compass as the compass", () => {
    chestTemple("wind-temple", { chest: "dungeon", dungeon: "compass" });

    take("wind-temple", ["compass"]);

    expect(temples.getTempleState("wind-temple")?.hasCompass).toBe(true);
  });
});

describe("the Pegasus chest and the Wind Whistle", () => {
  const pegasusChest = { chest: "dungeon", dungeon: "Pegasus Whistle", pegasus: true };

  it("lists Aura's Egg (in Aura's colours) and the Wind Whistle in the Wind Temple's chest, both ticked", () => {
    chestTemple("wind-temple", pegasusChest);

    const { rows } = take("wind-temple", []);

    expect(rows).toEqual([
      expect.objectContaining({ value: "Pegasus Whistle", name: "Aura's Egg", icon: "egg", tier: "relic", color: "#badc58", secondaryColor: "#ffffff", checked: true }),
      expect.objectContaining({ value: "Wind Whistle", name: "Wind Whistle", icon: "whistle", checked: true }),
    ]);
  });

  it("hands out the Wind Whistle and frees Aura when both rows are taken", () => {
    chestTemple("wind-temple", pegasusChest);

    const { messages } = take("wind-temple", ["Pegasus Whistle", "Wind Whistle"]);

    expect(hero().unlockedItems).toEqual(["Wind Whistle"]);
    expect(pegasi()?.[3]).toBe(true);
    expect(temples.isTempleCleared("wind-temple")).toBe(true);
    expect(messages).toContain("The Aura is free!");
    expect(temples.hasMasterKey("wind-temple")).toBe(false);
  });

  it("frees Aura and no whistle when only the egg is taken; the whistle stays in the chest", () => {
    chestTemple("wind-temple", pegasusChest);

    take("wind-temple", ["Pegasus Whistle"]);

    expect(hero().unlockedItems).toEqual([]);
    expect(pegasi()?.[3]).toBe(true);
    expect(take("wind-temple", []).rows.map((row: { name: string }) => row.name)).toEqual(["Wind Whistle"]);
  });

  it("hands out the whistle and frees nobody when only the whistle is taken; the egg stays in the chest", () => {
    chestTemple("wind-temple", pegasusChest);

    take("wind-temple", ["Wind Whistle"]);

    expect(hero().unlockedItems).toEqual(["Wind Whistle"]);
    expect(pegasi()).toBeUndefined();
    expect(temples.isTempleCleared("wind-temple")).toBe(false);
    expect(take("wind-temple", []).rows.map((row: { name: string }) => row.name)).toEqual(["Aura's Egg"]);
  });

  it("lists the Earth Temple's Terra's Egg alone, and hands out no whistle", () => {
    chestTemple("earth-temple", pegasusChest);

    const { rows, messages } = take("earth-temple", ["Pegasus Whistle"]);

    expect(rows).toEqual([expect.objectContaining({ name: "Terra's Egg", color: "#2ed573", checked: true })]);
    expect(hero().unlockedItems).toEqual([]);
    expect(pegasi()?.[4]).toBe(true);
    expect(messages).toContain("The Terra is free!");
  });

  it("hands out no Wind Whistle from any other temple's Pegasus chest", () => {
    chestTemple("fire-temple", pegasusChest);

    const { rows } = take("fire-temple", ["Pegasus Whistle"]);

    expect(rows.map((row: { name: string }) => row.name)).toEqual(["Ignis's Egg"]);
    expect(hero().unlockedItems).toEqual([]);
    expect(pegasi()?.[1]).toBe(true);
  });

  it("lists an egg of an unnamed Pegasus, in the default colour, for a temple the registry has no world for", () => {
    chestTemple("gen-some-seed", pegasusChest);

    const { rows, messages } = take("gen-some-seed", ["Pegasus Whistle"]);

    expect(rows).toEqual([expect.objectContaining({ name: "A Pegasus Egg", color: "#ffd740", checked: true })]);
    expect(pegasi()).toBeUndefined();
    expect(temples.isTempleCleared("gen-some-seed")).toBe(true);
    expect(messages).toContain("A Pegasus is free!");
  });
});
