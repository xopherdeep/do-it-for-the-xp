/**
 * The Temple Creator's Dragon Egg room and the picker's `master` room are the temple's Pegasus chamber: in play they
 * are the Pegasus chest the built-in temples and the generator keep behind the boss. Taking its prize frees the
 * Pegasus (the Game Master's pick, else the temple's own) and clears the temple, paying the clear reward once.
 */
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { useTemple } from "@/hooks/temples/useTemple";
import { registerTemple } from "@/lib/engine/core/dungeons/TempleAdapter";
import { generateTemple } from "@/lib/engine/dungeons/generator";
import { asPegasusChest, chestLoot, isPegasusRoom } from "@/lib/services/temples/ChestLoot";
import { isChestEmptyIn, resetVisitMemory, roomActions, roomKind } from "@/lib/services/temples/RoomInteractions";
import { freeTemplePegasus, pegasusEgg, pegasusOfKeyItem, pegasusView } from "@/lib/services/temples/TemplePegasus";
import { HERO, addHero, contextAt, dungeons, enter, hero, makeTemple, temples, wallet } from "./templeFixtures";

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
});

const EGG_TYPES = ["dragon-egg", "master"];

/** A temple that is only the entrance and the Pegasus chamber, named like a registered one so it has a Pegasus. */
const chamber = (room: Room, id = "fire-temple") => {
  forget(id);
  makeTemple({ E: { type: "entrance" }, P: room }, [["E", "P"]], id);
  enter(id, [0, 1]);
  return { id, room: dungeons.getRoom(id, [0, 1])!, ctx: contextAt(id, [0, 1]) };
};

/** The temple engine outlives a test: a registered temple's progress (cleared or not) starts over for each. */
const forget = (id: string) => {
  delete (temples as unknown as { templeStates: Record<string, unknown> }).templeStates[id];
};

const pegasi = () => hero().stats.pegasi as boolean[] | undefined;

describe("asPegasusChest", () => {
  it.each(EGG_TYPES)("makes a %s room the Pegasus chest, whatever else it held", (type) => {
    expect(asPegasusChest({ type })).toEqual({ type: "loot", content: { chest: "dungeon", dungeon: "Pegasus", pegasus: true } });
    expect(asPegasusChest({ type, content: { dungeon: "Terra", gold: 12 } })).toEqual({
      type: "loot",
      content: { chest: "dungeon", dungeon: "Terra", pegasus: true, gold: 12 },
    });
  });

  it("keeps the rest of the room: doors, whether it was opened", () => {
    const room = { type: "dragon-egg", isEmpty: true, locked: { north: true } };
    expect(asPegasusChest(room)).toMatchObject({ type: "loot", isEmpty: true, locked: { north: true } });
  });

  it("hands back any other room as it was, the same object", () => {
    const loot = { type: "loot", content: { chest: "dungeon", dungeon: "map" } };
    expect(asPegasusChest(loot)).toBe(loot);
    const boss = { type: "boss" };
    expect(asPegasusChest(boss)).toBe(boss);
  });

  it("changes nothing when run twice, and leaves the room it was given alone", () => {
    const egg = { type: "dragon-egg" };
    const once = asPegasusChest(egg);
    expect(asPegasusChest(once)).toBe(once);
    expect(egg).toEqual({ type: "dragon-egg" });
  });

  it("knows the layouts' other spellings", () => {
    expect(isPegasusRoom({ type: "Dragon_Egg" })).toBe(true);
    expect(isPegasusRoom({ type: "dragon egg" })).toBe(true);
    expect(isPegasusRoom({ type: "MASTER" })).toBe(true);
    expect(isPegasusRoom({ type: "loot" })).toBe(false);
    expect(isPegasusRoom(undefined)).toBe(false);
  });

  it("is not the master key: a master room holds a Pegasus, not a key", () => {
    const content = asPegasusChest<Room>({ type: "master" }).content!;
    expect(content.dungeon).not.toBe("master-key");
    expect(chestLoot(content).map((item) => item.value)).toEqual(["Pegasus"]);
  });
});

describe("the Pegasus chest as the chest reveal shows it", () => {
  it("is an egg, a relic, with a line about the Pegasus asleep inside", () => {
    const [prize] = chestLoot(asPegasusChest<Room>({ type: "dragon-egg" }).content);
    expect(prize).toMatchObject({ value: "Pegasus", name: "A Pegasus Egg", icon: "egg", tier: "relic" });
    expect(prize.blurb).toMatch(/Pegasus sleeps inside/);
  });

  it("is the temple's own Pegasus's egg, in its colours, when the temple screen names it", () => {
    const content = asPegasusChest<Room>({ type: "master" }).content;
    expect(chestLoot(content, pegasusEgg("fire-temple", content?.dungeon))[0]).toMatchObject({ name: "Ignis's Egg", color: "#ff4757", secondaryColor: "#f1c40f" });
  });

  it("is the egg of the Pegasus the Game Master picked in a Master room", () => {
    const content = asPegasusChest<Room>({ type: "master", content: { dungeon: "Terra" } }).content;
    expect(chestLoot(content, pegasusEgg("fire-temple", content?.dungeon))).toEqual([
      expect.objectContaining({ value: "Terra", name: "Terra's Egg", icon: "egg", color: "#2ed573", secondaryColor: "#2f3542", checked: true }),
    ]);
  });
});

describe("a Dragon Egg or master room in play", () => {
  it.each(EGG_TYPES)("opens as a chest: a %s room with no chest content reads \"A chest!\"", async (type) => {
    const { room, ctx } = chamber({ type });

    expect(roomKind(room)).toBe("loot");
    const sheet = roomActions(room, ctx);

    expect(sheet.header).toBe("A chest!");
    expect(sheet.actions.map((action) => action.label)).toEqual(["Open Chest"]);
    expect(await sheet.actions[0].run()).toEqual({ intent: "openChest" });
  });

  it.each(EGG_TYPES)("is registered as a loot room holding the Pegasus chest, with a real chest behind it (%s)", (type) => {
    const { room } = chamber({ type });

    expect(room).toMatchObject({ type: "loot", content: { chest: "dungeon", dungeon: "Pegasus", pegasus: true } });
    expect(room.content?.chestId).toBeTruthy();
    expect(dungeons.openChestInRoom("fire-temple", [0, 1])).toMatchObject({ dungeon: "Pegasus" });
  });

  it("names the Pegasus the Game Master picked in the chest", () => {
    const { room } = chamber({ type: "dragon-egg", content: { dungeon: "Terra" } });
    expect(chestLoot(room.content).map((item) => item.value)).toEqual(["Terra"]);
  });

  it.each(EGG_TYPES)("reads as empty once opened, like any chest (%s)", async (type) => {
    const { room, ctx } = chamber({ type, isEmpty: true });

    const sheet = roomActions(room, ctx);

    expect(sheet.header).toBe("An old chest, already opened.");
    expect(sheet.actions.map((action) => action.label)).toEqual(["Inspect Empty Chest"]);
    expect(isChestEmptyIn(room)).toBe(true);
  });

  it("answers the same for a room handed straight to the screen before the temple registered it", () => {
    const { ctx } = chamber({ type: "loot" });
    const raw: Room = { type: "dragon-egg" };

    expect(roomActions(raw, ctx).header).toBe("A chest!");
    expect(isChestEmptyIn(raw)).toBe(false);
  });

  it("leaves a loot room as it was", async () => {
    const { room, ctx } = chamber({ type: "loot", content: { chest: "dungeon", dungeon: "map" } });

    expect(room).toMatchObject({ type: "loot", content: { chest: "dungeon", dungeon: "map" } });
    expect(room.content?.pegasus).toBeUndefined();
    expect(roomActions(room, ctx).header).toBe("A chest!");
  });
});

describe("taking the Pegasus out of the chamber, the way the temple screen does", () => {
  /** The temple screen's take: the hook files the chest's loot, and frees the Pegasus for the Pegasus chest */
  const takePrize = (templeId: string, items: string[]) => {
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
    const loot = vm.chestContents.map((item: { value: string }) => item.value);
    vm.claimChestItems(items);
    wrapper.unmount();
    return { messages, loot };
  };

  it.each(EGG_TYPES)("frees the temple's Pegasus and clears the temple: a %s room with no pick", (type) => {
    chamber({ type });

    const { loot, messages } = takePrize("fire-temple", ["Pegasus"]);

    expect(loot).toEqual(["Pegasus"]);
    expect(pegasi()).toEqual([false, true, false, false, false, false, false, false, false]);
    expect(temples.isTempleCleared("fire-temple")).toBe(true);
    expect(messages).toContain("The Ignis is free!");
  });

  it("frees the Pegasus the Game Master picked instead of the temple's own", () => {
    chamber({ type: "dragon-egg", content: { dungeon: "Terra" } });

    const { messages } = takePrize("fire-temple", ["Terra"]);

    // Terra is index 4; Ignis (the temple's own, index 1) stays asleep
    expect(pegasi()).toEqual([false, false, false, false, true, false, false, false, false]);
    expect(messages).toContain("The Terra is free!");
    expect(temples.isTempleCleared("fire-temple")).toBe(true);
  });

  it("frees the temple's own Pegasus when the pick names none (the editor's own key items)", () => {
    chamber({ type: "dragon-egg", content: { dungeon: "wind-whistle" } });

    takePrize("fire-temple", ["wind-whistle"]);

    expect(pegasi()?.[1]).toBe(true);
    expect(pegasi()?.filter(Boolean)).toHaveLength(1);
  });

  it("empties the chest, so the room reads as opened afterwards", async () => {
    const { ctx } = chamber({ type: "dragon-egg" });

    takePrize("fire-temple", ["Pegasus"]);

    const room = dungeons.getRoom("fire-temple", [0, 1])!;
    expect(roomActions(room, ctx).header).toBe("An old chest, already opened.");
  });
});

describe("the clear reward is paid once, by the chest or the gate, whichever comes first", () => {
  /** Entrance, the Pegasus chamber, the gate. */
  const withGate = (egg: Room, id = "fire-temple") => {
    forget(id);
    makeTemple({ E: { type: "entrance" }, P: egg, G: { type: "gate" } }, [["E", "P", "G"]], id);
    enter(id, [0, 1]);
    return id;
  };

  it("pays through the Pegasus chest and shows the tally, then the gate pays nothing", async () => {
    const id = withGate({ type: "dragon-egg" });

    const freed = freeTemplePegasus(id, HERO, "Pegasus");

    expect(freed.cleared).toEqual({ xp: 150, gp: 50, ap: 3, levelUp: false });
    expect(freed.pegasus?.name).toBe("Ignis");
    expect(wallet()).toBe(150);
    expect(hero().stats.xp.now).toBe(150);

    enter(id, [0, 2]);
    const gate = dungeons.getRoom(id, [0, 2])!;
    const outcome = await roomActions(gate, contextAt(id, [0, 2])).actions[0].run();
    expect(outcome).toEqual({ intent: "leave", sound: "yes" });
    expect(wallet()).toBe(150);
    expect(hero().stats.xp.now).toBe(150);
    expect(hero().stats.ap.total).toBe(3);
  });

  it("pays through the gate first, then the Pegasus chest frees the Pegasus and pays nothing", async () => {
    const id = withGate({ type: "master" });
    temples.grantMasterKey(id);
    enter(id, [0, 2]);
    const gate = dungeons.getRoom(id, [0, 2])!;
    const opened = await roomActions(gate, contextAt(id, [0, 2])).actions[0].run();
    expect(opened.cleared).toEqual({ xp: 150, gp: 50, ap: 3, levelUp: false });

    const freed = freeTemplePegasus(id, HERO, "Pegasus");

    expect(freed.cleared).toBeUndefined();
    expect(freed.pegasus?.name).toBe("Ignis");
    expect(pegasi()?.[1]).toBe(true);
    expect(wallet()).toBe(150);
    expect(hero().stats.xp.now).toBe(150);
  });

  it("pays the reward the temple's gate names when the chest clears it first", () => {
    forget("ice-temple");
    makeTemple(
      { E: { type: "entrance" }, P: { type: "dragon-egg" }, G: { type: "gate", content: { reward: { xp: 30, gp: 10, ap: 1 } } } },
      [["E", "P", "G"]],
      "ice-temple"
    );
    enter("ice-temple", [0, 1]);

    expect(freeTemplePegasus("ice-temple", HERO, "Pegasus").cleared).toEqual({ xp: 30, gp: 10, ap: 1, levelUp: false });
    expect(wallet()).toBe(110);
  });

  it("frees a Pegasus and still pays nothing for a second clear of the same visit", () => {
    const id = withGate({ type: "dragon-egg" });
    freeTemplePegasus(id, HERO, "Pegasus");

    const again = freeTemplePegasus(id, HERO, "Pegasus");

    expect(again.cleared).toBeUndefined();
    expect(wallet()).toBe(150);
  });
});

describe("pegasusOfKeyItem", () => {
  it.each([
    ["Aura", "Aura"],
    ["aura", "Aura"],
    ["AURA", "Aura"],
    ["pegasus-aura", "Aura"],
    ["Aura's Egg", "Aura"],
    ["Aura’s Egg", "Aura"],
    ["terra", "Terra"],
    ["Ventus", "Ventus"],
    ["umbra-egg", "Umbra"],
  ])("reads %s as %s", (value, name) => {
    expect(pegasusOfKeyItem(value)?.name).toBe(name);
  });

  it.each(["Pegasus", "Pegasus Whistle", "wind-whistle", "pegasus-boots", "backpack", "Auras", "", undefined, null])(
    "reads %p as no Pegasus (the temple's own is meant)",
    (value) => {
      expect(pegasusOfKeyItem(value as string | undefined | null)).toBeUndefined();
    }
  );

  it("draws the picked Pegasus, else the temple's own", () => {
    expect(pegasusView("fire-temple")?.name).toBe("Ignis");
    expect(pegasusView("fire-temple", "Pegasus")?.name).toBe("Ignis");
    expect(pegasusView("fire-temple", "Terra")).toMatchObject({ name: "Terra", color: "#2ed573", world: "forest" });
    // A temple the registry does not know still draws the Pegasus a Game Master picked
    expect(pegasusView("gen-some-seed")).toBeNull();
    expect(pegasusView("gen-some-seed", "Terra")?.name).toBe("Terra");
  });
});

describe("what a generated temple emits for its Pegasus and its master key", () => {
  const temple = generateTemple(7, { theme: "Kitchen", size: "medium" });
  const older = generateTemple(7, { theme: "Kitchen", size: "medium", masterRoom: false });

  it("names the Pegasus chamber a Master Room and keeps the master key in a loot chest", () => {
    const rooms = Object.values(temple.rooms);
    const masters = rooms.filter((room) => isPegasusRoom(room));
    expect(masters).toHaveLength(1);
    expect(masters[0]).toMatchObject({ type: "master", content: { chest: "dungeon", pegasus: true } });
    const masterKey = rooms.filter((room) => room.content?.dungeon === "master-key");
    expect(masterKey.length).toBeGreaterThanOrEqual(1);
    for (const room of masterKey) expect(room.type).toBe("loot");
  });

  it("is the Pegasus loot chest once the engine registers it; every other room comes through untouched", () => {
    const id = "gen-dragon-egg-spec";
    registerTemple(id, { maze: temple.maze, rooms: temple.rooms, entrance: temple.entrance });
    const registered = dungeons.getDungeon(id)!.rooms;

    for (const [token, room] of Object.entries(temple.rooms)) {
      expect(registered[token].type).toBe(isPegasusRoom(room) ? "loot" : room.type);
      expect(registered[token].content?.dungeon).toBe(room.content?.dungeon);
      expect(registered[token].content?.pegasus).toBe(room.content?.pegasus);
    }
  });

  it("keeps the Pegasus chest as a loot room when the Master Room is turned off", () => {
    const rooms = Object.values(older.rooms);
    expect(rooms.some((room) => isPegasusRoom(room))).toBe(false);
    const pegasus = rooms.filter((room) => room.content?.pegasus === true);
    expect(pegasus).toHaveLength(1);
    expect(pegasus[0].type).toBe("loot");
  });
});
