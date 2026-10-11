/**
 * A temple chest is empty only when every item in it has been taken. Items left behind stay in the chest,
 * the chest still opens and shows just those, and a reload does not refill what was taken.
 */
import { createPinia, setActivePinia } from "pinia";
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
