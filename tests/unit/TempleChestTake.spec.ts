/**
 * A temple chest is empty only when every item in it has been taken. Items left behind stay in the chest,
 * the chest still opens and shows just those, and a reload does not refill what was taken.
 */
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useTemple } from "@/hooks/temples/useTemple";
import { useUserStore } from "@/lib/store/stores/user";
import { ChestSystem } from "@/lib/engine/core/dungeons/ChestSystem";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { isChestEmptyIn, roomActions } from "@/lib/services/temples/RoomInteractions";
import { HERO, addHero, contextAt, dungeons, makeTemple, temples } from "./templeFixtures";

// The hero's saves, in memory: what one visit writes, the next one reads back
const mockSaves = new Map<string, unknown>();
jest.mock("@/lib/databases/TempleProgressDb", () => ({
  getTempleProgressDb: () => ({
    getProgress: (userId: string, templeId: string) =>
      Promise.resolve(mockSaves.has(`${userId}:${templeId}`) ? JSON.parse(JSON.stringify(mockSaves.get(`${userId}:${templeId}`))) : null),
    saveProgress: (progress: { userId: string; templeId: string }) => {
      mockSaves.set(`${progress.userId}:${progress.templeId}`, JSON.parse(JSON.stringify(progress)));
      return Promise.resolve(progress);
    },
  }),
}));
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

const CHEST: [number, number] = [0, 1];

/** The wind temple's 1F chest, as it is authored */
const supplies: Room = { type: "loot", content: { chest: "random", quantity: 1, items: ["potion", "ether"] } } as Room;
const lootChest: Room = { type: "loot", content: { chest: "loot", items: ["potion", "ether"], gold: 20 } } as Room;
const mapChest: Room = { type: "loot", content: { chest: "dungeon", dungeon: "map" } } as Room;

const temple = (chest: Room): string => makeTemple({ E: { type: "empty" } as Room, C: chest }, [["E", "C"]]);
const roomAt = (id: string, position: [number, number] = CHEST) => dungeons.getRoom(id, position) as Room;
const sheetHeader = (id: string) => roomActions(roomAt(id), contextAt(id, CHEST)).header;

/** Open the temple for the hero and wait for their save to be read */
const openFor = async (id: string, userId: string = HERO) => {
  temples.initTemple(id, CHEST, undefined, userId);
  await temples.whenProgressReady(id);
};

beforeEach(() => {
  setActivePinia(createPinia());
  addHero();
});

describe("taking part of a chest", () => {
  it("leaves the wind temple's random chest openable with only the Ether in it", async () => {
    const id = temple(supplies);
    await openFor(id);

    expect(temples.takeFromChest(id, "1F", CHEST, ["potion"])).toBe(false);

    const room = roomAt(id);
    expect(isChestEmptyIn(room)).toBe(false);
    expect(room.isEmpty).toBeFalsy();
    expect(room.content?.items).toEqual(["ether"]);
    expect(sheetHeader(id)).toBe("A chest!");
  });

  it("empties the chest once the last item is taken", async () => {
    const id = temple(supplies);
    await openFor(id);

    temples.takeFromChest(id, "1F", CHEST, ["potion"]);
    expect(temples.takeFromChest(id, "1F", CHEST, ["ether"])).toBe(true);

    expect(isChestEmptyIn(roomAt(id))).toBe(true);
    expect(sheetHeader(id)).toBe("An old chest, already opened.");
  });

  it("taking everything at once empties it", async () => {
    const id = temple(supplies);
    await openFor(id);

    expect(temples.takeFromChest(id, "1F", CHEST, ["potion", "ether"])).toBe(true);
    expect(isChestEmptyIn(roomAt(id))).toBe(true);
  });

  it("keeps the chest open while its gold is still in it", async () => {
    const id = temple(lootChest);
    await openFor(id);

    expect(temples.takeFromChest(id, "1F", CHEST, ["potion", "ether"])).toBe(false);
    expect(isChestEmptyIn(roomAt(id))).toBe(false);
    expect(roomAt(id).content?.items).toEqual([]);
    expect(roomAt(id).content?.gold).toBe(20);

    expect(temples.takeFromChest(id, "1F", CHEST, ["gold:20"])).toBe(true);
    expect(isChestEmptyIn(roomAt(id))).toBe(true);
  });

  it("still empties a chest of one dungeon item", async () => {
    const id = temple(mapChest);
    await openFor(id);

    expect(temples.takeFromChest(id, "1F", CHEST, ["map"])).toBe(true);
    expect(isChestEmptyIn(roomAt(id))).toBe(true);
  });

  it("registers what the chest holds in the ChestSystem, whatever kind of chest it is", () => {
    const id = temple(supplies);
    const chest = ChestSystem.getInstance().getChest(roomAt(id).content?.chestId as string);
    expect(chest?.content.items).toEqual(["potion", "ether"]);
    expect(chest?.isEmpty).toBe(false);
  });
});

describe("a chest after a reload", () => {
  /** Another hero takes the temple (it goes back to its layout), then the hero comes back to it */
  const reload = async (id: string) => {
    await temples.flushProgress();
    await openFor(id, "someone-else");
    await openFor(id, HERO);
  };

  it("does not give back the items already taken", async () => {
    const id = temple(supplies);
    await openFor(id);
    temples.takeFromChest(id, "1F", CHEST, ["potion"]);

    await reload(id);

    expect(roomAt(id).content?.items).toEqual(["ether"]);
    expect(isChestEmptyIn(roomAt(id))).toBe(false);
  });

  it("stays empty once everything was taken", async () => {
    const id = temple(supplies);
    await openFor(id);
    temples.takeFromChest(id, "1F", CHEST, ["potion"]);
    temples.takeFromChest(id, "1F", CHEST, ["ether"]);

    await reload(id);

    expect(isChestEmptyIn(roomAt(id))).toBe(true);
  });
});

describe("taking from a chest through the temple screen's hook: only what was ticked", () => {
  /** The screen's take: the hook files the ticked rows, the reveal's rows are what it showed */
  const play = async (chest: Room) => {
    const id = temple(chest);
    await openFor(id);
    const messages: string[] = [];
    const wrapper = mount(
      defineComponent({
        setup() {
          const hook = useTemple(id, CHEST, undefined, HERO);
          hook.registerMessageDisplay((message) => messages.push(message));
          return hook;
        },
        render: () => null,
      })
    );
    const vm = wrapper.vm as any;
    const rows = () => vm.chestContents.map((item: { value: string }) => item.value);
    return { id, messages, rows, take: (items: string[]) => vm.processChestItems(items), done: () => wrapper.unmount() };
  };

  it("takes the one ticked row of two and leaves the other in the chest, to be shown again", async () => {
    const bag = jest.spyOn(useUserStore(), "addInventoryItem");
    const chest = await play(supplies);
    expect(chest.rows()).toEqual(["potion", "ether"]);

    chest.take(["ether"]);

    // Only the Ether came out; the Potion is still in the chest, which is not empty and shows just it
    expect(bag.mock.calls.map((call) => call[1].name)).toEqual(["ether"]);
    expect(chest.rows()).toEqual(["potion"]);
    expect(roomAt(chest.id).content?.items).toEqual(["potion"]);
    expect(isChestEmptyIn(roomAt(chest.id))).toBe(false);
    expect(roomAt(chest.id).isEmpty).toBeFalsy();
    expect(sheetHeader(chest.id)).toBe("A chest!");
    expect(chest.messages).toEqual(["Collected: Ether"]);

    // ... and what is left can be taken on a later visit to it
    chest.take(["potion"]);
    expect(bag.mock.calls.map((call) => call[1].name)).toEqual(["ether", "potion"]);
    expect(isChestEmptyIn(roomAt(chest.id))).toBe(true);
    chest.done();
    bag.mockRestore();
  });

  it("takes nothing for a take that names nothing, and says so", async () => {
    const bag = jest.spyOn(useUserStore(), "addInventoryItem");
    const chest = await play(supplies);

    chest.take([]);

    expect(bag).not.toHaveBeenCalled();
    expect(chest.messages).toEqual(["You took nothing."]);
    expect(chest.rows()).toEqual(["potion", "ether"]);
    expect(roomAt(chest.id).content?.items).toEqual(["potion", "ether"]);
    expect(isChestEmptyIn(roomAt(chest.id))).toBe(false);
    chest.done();
    bag.mockRestore();
  });

  it("takes only the ticked gold of a chest that holds gold and supplies, and leaves the supplies", async () => {
    const chest = await play(lootChest);
    const before = (useUserStore().users[HERO].stats.gp as { wallet: number }).wallet;

    chest.take(["gold:20"]);

    expect((useUserStore().users[HERO].stats.gp as { wallet: number }).wallet).toBeGreaterThan(before);
    expect(chest.rows()).toEqual(["potion", "ether"]);
    expect(isChestEmptyIn(roomAt(chest.id))).toBe(false);
    chest.done();
  });

  it("takes only the Boss Key's chest's ticked row: ticking the gold leaves the key", async () => {
    const chest = await play({ type: "loot", content: { chest: "dungeon", dungeon: "master-key", gold: 15 } } as Room);

    chest.take(["gold:15"]);

    expect(temples.hasMasterKey(chest.id)).toBe(false);
    expect(chest.rows()).toEqual(["master-key"]);

    chest.take(["master-key"]);
    expect(temples.hasMasterKey(chest.id)).toBe(true);
    chest.done();
  });

  it("leaves the Pegasus chest's prize in it when only its gold was ticked: nobody is freed, the temple is not cleared", async () => {
    const chest = await play({ type: "loot", content: { chest: "dungeon", dungeon: "Pegasus Whistle", pegasus: true, gold: 10 } } as Room);

    chest.take(["gold:10"]);

    expect(temples.isTempleCleared(chest.id)).toBe(false);
    expect(chest.rows()).toEqual(["Pegasus Whistle"]);
    chest.done();
  });
});
