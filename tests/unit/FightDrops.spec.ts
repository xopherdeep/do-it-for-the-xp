/**
 * Fight rooms can carry `content.drops`: what a beaten monster, mini-boss or boss leaves behind (a key, the map, a Bomb).
 * The grants the audit, the solver and the engine read count a drop the way they count a chest, and a Bomb found inside
 * a temple (a shop, a Bomb chest or a Bomb drop) is what the solver needs to pass a cracked wall. In play, a drop a hero
 * took is part of their saved run (TempleSystem.markDropTaken / isDropTaken), given back by a blood moon and not by a quest.
 */
import { defineComponent } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { useTemple } from "@/hooks/temples/useTemple";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Room } from "@/lib/engine/core/dungeons/types";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import { BOMB_ITEM, FIGHT_ROOM_TYPES, dropKey, roomDrops } from "@/lib/services/temples/fightDrops";
import { grantedDungeonItems, grantsBossKey, isBombSource, smallKeysGranted } from "@/lib/services/temples/roomGrants";
import { bombInPack } from "@/lib/services/temples/ItemUse";
import { useUserStore } from "@/lib/store/stores/user";
import { roomPositionKey } from "@/lib/engine/core/dungeons/DungeonManager";
import { addHero, hero, HERO, makeTemple, temples, wallet } from "./templeFixtures";

// The browser's storage is faked in memory; the temple system, its progress and the quest engine are the real ones
jest.mock("@ionic/storage", () => {
  class Storage {
    private rows = new Map<string, unknown>();
    constructor(public readonly config: unknown) {}
    async create() {
      return this;
    }
    async get(key: string) {
      return this.rows.has(key) ? JSON.parse(JSON.stringify(this.rows.get(key))) : null;
    }
    async set(key: string, value: unknown) {
      this.rows.set(key, JSON.parse(JSON.stringify(value)));
    }
    async remove(key: string) {
      this.rows.delete(key);
    }
    async clear() {
      this.rows.clear();
    }
    async keys() {
      return [...this.rows.keys()];
    }
  }
  return { Storage, Drivers: { IndexedDB: "indexeddb", LocalStorage: "localstorage" } };
});
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
jest.mock("@/lib/store/stores/chat", () => ({
  __esModule: true,
  FAMILY_CHAT_ROOM: "family-chat",
  useChatStore: () => ({ postSystemLine: jest.fn(async () => ({})) }),
}));
jest.mock("@/lib/store/stores/notifications", () => ({
  __esModule: true,
  useNotificationsStore: () => ({ push: jest.fn() }),
}));

const SMALL_KEY_DROP = { chest: "dungeon", dungeon: "small-key" };

describe("fightDrops: what a fight room leaves behind", () => {
  it("names the three fight rooms", () => {
    expect([...FIGHT_ROOM_TYPES]).toEqual(["monster", "miniboss", "boss"]);
  });

  it("only a fight room has drops: the same drops on a loot room are nothing", () => {
    expect(roomDrops({ type: "loot", content: { drops: SMALL_KEY_DROP } })).toBeNull();
    expect(roomDrops({ type: "monster", content: { drops: SMALL_KEY_DROP } })).toEqual(SMALL_KEY_DROP);
    expect(roomDrops({ type: "miniboss", content: { drops: SMALL_KEY_DROP } })).toEqual(SMALL_KEY_DROP);
    expect(roomDrops({ type: "boss", content: { drops: SMALL_KEY_DROP } })).toEqual(SMALL_KEY_DROP);
  });

  it("an empty or missing drop is no drop", () => {
    expect(roomDrops({ type: "monster" })).toBeNull();
    expect(roomDrops({ type: "monster", content: null })).toBeNull();
    expect(roomDrops({ type: "monster", content: {} })).toBeNull();
    expect(roomDrops({ type: "monster", content: { drops: {} } })).toBeNull();
    expect(roomDrops({ type: "monster", content: { drops: { items: [], gold: 0 } } })).toBeNull();
    expect(roomDrops({ type: "monster", content: { drops: "small-key" } })).toBeNull();
    expect(roomDrops(null)).toBeNull();
    expect(roomDrops(undefined)).toBeNull();
  });

  it("keeps the drop whole: items and gold come through as written", () => {
    const drops = { chest: "consumable", items: ["Bomb", "Potion"], gold: 12 };
    expect(roomDrops({ type: "monster", content: { drops } })).toEqual(drops);
  });

  it("a drop is remembered under its room's key with ':drop' on the end", () => {
    expect(dropKey("1F", [2, 3])).toBe("1F:2,3:drop");
    expect(dropKey("B1", [0, 0])).toBe(`${roomPositionKey("B1", [0, 0])}:drop`);
  });

  it("the Bomb is the item called Bomb", () => {
    expect(BOMB_ITEM).toBe("Bomb");
  });
});

describe("roomGrants: a drop is granted like a chest", () => {
  it("a monster dropping a small key hands out one", () => {
    expect(smallKeysGranted({ type: "monster", content: { drops: SMALL_KEY_DROP } })).toBe(1);
  });

  it("a drop of 'key' rows counts as small keys, whatever the drop's chest is called", () => {
    expect(smallKeysGranted({ type: "monster", content: { drops: { chest: "consumable", items: ["key", "Potion", "key"] } } })).toBe(2);
  });

  it("a drop that holds another item hands out no small key", () => {
    expect(smallKeysGranted({ type: "monster", content: { drops: { chest: "dungeon", dungeon: "map" } } })).toBe(0);
  });

  it("a drop under a loot room is not played: it hands out nothing", () => {
    expect(smallKeysGranted({ type: "loot", content: { drops: SMALL_KEY_DROP } })).toBe(0);
  });

  it("a miniboss dropping the master key grants the Boss Key", () => {
    expect(grantsBossKey({ type: "miniboss", content: { drops: { chest: "dungeon", dungeon: "master-key" } } })).toBe(true);
    expect(grantsBossKey({ type: "miniboss", content: { drops: { chest: "dungeon", dungeon: "key" } } })).toBe(false);
  });

  it("a miniboss with `content.dungeon: 'master-key'` and no drops still grants nothing (a fight pays through its quest)", () => {
    expect(grantsBossKey({ type: "miniboss", content: { chest: "dungeon", dungeon: "master-key" } })).toBe(false);
    expect(smallKeysGranted({ type: "miniboss", content: { chest: "dungeon", dungeon: "key" } })).toBe(0);
  });

  it("the dungeon items a room grants are the chest's plus the drop's, by the id the take path knows", () => {
    expect(grantedDungeonItems({ type: "boss", content: { drops: { chest: "dungeon", dungeon: "map" } } })).toEqual(["map"]);
    expect(grantedDungeonItems({ type: "monster", content: { drops: SMALL_KEY_DROP } })).toEqual(["key"]);
    expect(grantedDungeonItems({ type: "loot", content: { chest: "dungeon", dungeon: "compass" } })).toEqual(["compass"]);
    expect(grantedDungeonItems({ type: "loot", content: { chest: "dungeon", dungeon: "compass", drops: { chest: "dungeon", dungeon: "map" } } })).toEqual(["compass"]);
    expect(grantedDungeonItems({ type: "empty" })).toEqual([]);
    expect(grantedDungeonItems(undefined)).toEqual([]);
  });

  it("a fight room that drops one item and carries a chest of its own grants only the drop", () => {
    const room = { type: "miniboss", content: { chest: "dungeon", dungeon: "compass", drops: { chest: "dungeon", dungeon: "map" } } };
    expect(grantedDungeonItems(room)).toEqual(["map"]);
  });
});

describe("roomGrants: where a Bomb can be found", () => {
  it("a shop sells one", () => {
    expect(isBombSource({ type: "shop" })).toBe(true);
  });

  it("a loot chest holding a Bomb gives one", () => {
    expect(isBombSource({ type: "loot", content: { chest: "consumable", items: [BOMB_ITEM] } })).toBe(true);
    expect(isBombSource({ type: "loot", content: { chest: "consumable", items: ["Potion"] } })).toBe(false);
  });

  it("a fight room dropping a Bomb gives one", () => {
    expect(isBombSource({ type: "monster", content: { drops: { chest: "consumable", items: [BOMB_ITEM] } } })).toBe(true);
    expect(isBombSource({ type: "boss", content: { drops: { chest: "consumable", items: ["Potion"] } } })).toBe(false);
  });

  it("a Bomb written into a room that never hands it out is nothing", () => {
    expect(isBombSource({ type: "monster", content: { items: [BOMB_ITEM] } })).toBe(false);
    expect(isBombSource({ type: "empty", content: { items: [BOMB_ITEM] } })).toBe(false);
    expect(isBombSource({ type: "loot", content: { drops: { items: [BOMB_ITEM] } } })).toBe(false);
  });

  it("an empty room, no room and no content are no source", () => {
    expect(isBombSource({ type: "empty" })).toBe(false);
    expect(isBombSource({ type: "loot", content: null })).toBe(false);
    expect(isBombSource(null)).toBe(false);
    expect(isBombSource(undefined)).toBe(false);
  });
});

/** The fight room of the temples below: the entrance, then the room at column 1 */
const AT: [number, number] = [0, 1];

/** Open the temple for a hero standing in the fight room, and wait until their save and their board are in. */
const openFor = async (id: string, userId = HERO) => {
  await temples.flushProgress(); // the hero who leaves has their run saved before the next one is read
  temples.initTemple(id, AT, undefined, userId);
  await temples.whenProgressReady(id);
  await temples.whenQuestRoomsReady(id);
};

describe("TempleSystem: a drop the hero took is part of their run", () => {
  const MIA = "hero-2";
  // Monday 12 October 2026, ten in the morning
  const NOW = new Date(2026, 9, 12, 10, 0, 0);
  const TOMORROW = new Date(2026, 9, 13, 10, 0, 0);

  beforeEach(() => {
    setActivePinia(createPinia());
    addHero();
  });

  /** The entrance and a fight room that drops a small key, opened for the hero and their save read */
  const droppingTemple = async (room: Room = { type: "monster", content: { lockOnEnter: true, drops: SMALL_KEY_DROP } }) => {
    const id = makeTemple({ E: { type: "entrance" }, M: room }, [["E", "M"]]);
    await openFor(id);
    return id;
  };

  it("files a taken drop under the room's drop key, apart from the room's own key", async () => {
    const id = await droppingTemple();
    expect(temples.isDropTaken(id, "1F", AT)).toBe(false);

    temples.markDropTaken(id, "1F", AT);

    expect(temples.isDropTaken(id, "1F", AT)).toBe(true);
    expect([...(temples.getTempleState(id)?.openedChests ?? [])]).toEqual([dropKey("1F", AT)]);
    expect(temples.isDropTaken(id, "1F", [0, 0])).toBe(false);
    expect(temples.isDropTaken(id, "2F", AT)).toBe(false);
  });

  it("has taken nothing in a temple that is not open, and marks nothing", () => {
    expect(temples.isDropTaken("no-such-temple", "1F", AT)).toBe(false);
    expect(() => temples.markDropTaken("no-such-temple", "1F", AT)).not.toThrow();
    expect(temples.isDropTaken("no-such-temple", "1F", AT)).toBe(false);
  });

  it("stays taken after the app is closed and opened again", async () => {
    const id = await droppingTemple();
    temples.markDropTaken(id, "1F", AT);
    await temples.flushProgress();
    temples.forgetTempleRun(id);

    await openFor(id);

    expect(temples.isDropTaken(id, "1F", AT)).toBe(true);
  });

  it("is a hero's own: another hero's run in the same temple has not taken it", async () => {
    const id = await droppingTemple();
    temples.markDropTaken(id, "1F", AT);

    await openFor(id, MIA);

    expect(temples.isDropTaken(id, "1F", AT)).toBe(false);
  });

  it("comes back with a blood moon, which clears what the hero opened and took", async () => {
    const id = await droppingTemple();
    temples.markDropTaken(id, "1F", AT);
    await temples.flushProgress();

    await temples.bloodMoon(id, HERO);

    expect(temples.getTempleState(id)?.openedChests?.size ?? 0).toBe(0);
    expect(temples.isDropTaken(id, "1F", AT)).toBe(false);
  });

  it("does not come back when a daily quest restores the room: the beast returns, its drop was taken", async () => {
    const dishes = {
      id: "q1",
      achievementName: "Wash the dishes",
      type: "individual",
      assignee: [HERO],
      basicSchedule: "daily",
      customFrequency: 1,
      customPeriodType: "day",
      customPeriodNumber: 1,
      repeatOnDays: [],
      startsOn: "2026-01-01T00:00:00",
      endsOn: "",
      dueByTime: "18:00",
      difficulty: 2,
      beastId: "beast-dish-goblin",
    } as unknown as Achievement;
    const board = (status: QuestBoardItem["status"]) => ({
      heroId: HERO,
      board: [{ quest: dishes, status, progress: null, pending: false, overdue: false }] as QuestBoardItem[],
      liveQuests: [dishes],
    });
    const id = await droppingTemple({ type: "monster", content: { lockOnEnter: true, questId: "q1", drops: SMALL_KEY_DROP } });

    // The chore is done: the beast is down, the hero takes what it dropped
    temples.syncQuestRooms(id, board("done"), NOW);
    expect(temples.isRoomCleared(id, "1F", AT)).toBe(true);
    temples.markDropTaken(id, "1F", AT);

    // The next day the chore is due again: the beast is back, and the drop stays taken
    temples.syncQuestRooms(id, board("open"), TOMORROW);
    expect(temples.isRoomCleared(id, "1F", AT)).toBe(false);
    expect(temples.isDropTaken(id, "1F", AT)).toBe(true);
  });
});

describe("taking a beast's drop through the temple screen's hook", () => {
  const BOMB_DROP = { chest: "consumable", items: [BOMB_ITEM] };
  const things = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `thing-${i}`, name: `thing ${i}`, qty: 1 }));
  const fillBag = (stacks = 20, extra: object = {}) => Object.assign(hero(), { inventory: things(stacks), ...extra });
  const bombsInBag = (): number => hero().inventory?.filter((row: { name: string }) => row.name === BOMB_ITEM).length ?? 0;

  beforeEach(() => {
    setActivePinia(createPinia());
    addHero();
  });

  /** A temple whose fight room dropped `drops` and is beaten, the hook mounted on it for the hero */
  const play = async (drops: object, extraRoom: object = {}) => {
    const room = { type: "monster", content: { beasts: ["beast-socktopus"], drops }, ...extraRoom } as Room;
    const id = makeTemple({ E: { type: "entrance" }, M: room }, [["E", "M"]]);
    await openFor(id);
    temples.markRoomCleared(id, "1F", AT);
    const messages: string[] = [];
    const wrapper = mount(
      defineComponent({
        setup() {
          const hook = useTemple(id, AT, undefined, HERO);
          hook.registerMessageDisplay((message) => messages.push(message));
          return hook;
        },
        render: () => null,
      })
    );
    const vm = wrapper.vm as any;
    return {
      id,
      messages,
      rows: (): string[] => vm.dropContents.map((row: { value: string }) => row.value),
      ticked: (): boolean[] => vm.dropContents.map((row: { checked?: boolean }) => Boolean(row.checked)),
      take: (items: string[]) => vm.claimDropItems(items),
      done: () => wrapper.unmount(),
    };
  };

  it("shows what the beast dropped, as the chest reveal shows a chest, every row ticked: the drop is taken whole", async () => {
    const drop = await play({ chest: "dungeon", dungeon: "small-key", items: ["Potion"], gold: 12 });

    expect(drop.rows()).toEqual(["Potion", "key", "gold:12"]);
    expect(drop.ticked()).toEqual([true, true, true]);
    drop.done();
  });

  it("shows nothing for a room that drops nothing, nor once the drop is taken", async () => {
    const none = await play({});
    expect(none.rows()).toEqual([]);
    none.done();

    const drop = await play({ chest: "dungeon", dungeon: "small-key" });
    drop.take(["key"]);
    expect(drop.rows()).toEqual([]);
    drop.done();
  });

  it("hands out a small key: the temple counts it, the drop is taken, and a second take gives nothing", async () => {
    const drop = await play({ chest: "dungeon", dungeon: "small-key" });

    drop.take(["key"]);

    expect(temples.getTempleState(drop.id)?.playerKeys).toBe(1);
    expect(temples.isDropTaken(drop.id, "1F", AT)).toBe(true);
    expect(drop.messages).toEqual(["Collected: Small Key"]);

    drop.take(["key"]);
    expect(temples.getTempleState(drop.id)?.playerKeys).toBe(1);
    expect(drop.messages[1]).toBe("Nothing left here.");
    drop.done();
  });

  it("hands out the Boss Key, the map and the compass the way a chest does", async () => {
    const boss = await play({ chest: "dungeon", dungeon: "master-key" });
    boss.take(["master-key"]);
    expect(temples.hasMasterKey(boss.id)).toBe(true);
    boss.done();

    const map = await play({ chest: "dungeon", dungeon: "map" });
    map.take(["map"]);
    expect(temples.getTempleState(map.id)?.hasMap).toBe(true);
    map.done();

    const compass = await play({ chest: "dungeon", dungeon: "compass" });
    compass.take(["compass"]);
    expect(temples.getTempleState(compass.id)?.hasCompass).toBe(true);
    compass.done();
  });

  it("pays the gold of a drop", async () => {
    const drop = await play({ gold: 20 });
    const before = wallet();

    drop.take(["gold:20"]);

    expect(wallet()).toBeGreaterThan(before);
    expect(temples.isDropTaken(drop.id, "1F", AT)).toBe(true);
    drop.done();
  });

  it("takes nothing for a take that names nothing, and leaves the drop where it is", async () => {
    const drop = await play({ chest: "dungeon", dungeon: "small-key" });

    drop.take([]);

    expect(drop.messages).toEqual(["You took nothing."]);
    expect(temples.isDropTaken(drop.id, "1F", AT)).toBe(false);
    expect(drop.rows()).toEqual(["key"]);
    drop.done();
  });

  it("hands out only what the drop holds: a row it does not hold is never handed out, whatever was ticked", async () => {
    const stray = await play({ chest: "dungeon", dungeon: "small-key" });
    stray.take(["master-key"]);
    expect(temples.hasMasterKey(stray.id)).toBe(false);
    expect(stray.messages).toEqual(["You took nothing."]);
    expect(temples.isDropTaken(stray.id, "1F", AT)).toBe(false);
    stray.done();

    // Ticked beside a row the drop does hold, it is still no part of the take
    const mixed = await play({ chest: "dungeon", dungeon: "small-key" });
    mixed.take(["master-key", "key"]);
    expect(temples.hasMasterKey(mixed.id)).toBe(false);
    expect(temples.getTempleState(mixed.id)?.playerKeys).toBe(1);
    expect(mixed.messages).toEqual(["Collected: Small Key"]);
    mixed.done();
  });

  it("is all-or-nothing: ticking only the gold of a drop that holds a small key still hands out the key", async () => {
    const drop = await play({ chest: "dungeon", dungeon: "small-key", gold: 15 });
    const before = wallet();

    drop.take(["gold:15"]);

    // The drop is one flag: what was not ticked is not left in the room, so it is handed out with the rest
    expect(temples.getTempleState(drop.id)?.playerKeys).toBe(1);
    expect(wallet()).toBeGreaterThan(before);
    expect(temples.isDropTaken(drop.id, "1F", AT)).toBe(true);
    expect(drop.messages).toEqual([expect.stringMatching(/^Collected: Small Key, \d+ GP$/)]);
    expect(drop.rows()).toEqual([]);
    drop.done();
  });

  it("hands out the Boss Key and a Bomb of a drop whose gold alone was ticked", async () => {
    const drop = await play({ chest: "dungeon", dungeon: "master-key", items: [BOMB_ITEM], gold: 10 });

    drop.take(["gold:10"]);

    expect(temples.hasMasterKey(drop.id)).toBe(true);
    expect(bombInPack(HERO)?.qty).toBe(1);
    expect(temples.isDropTaken(drop.id, "1F", AT)).toBe(true);
    drop.done();
  });

  it("does not mark the drop taken when handing it out left something behind, and says the bag is full", async () => {
    // The bag looks free, but the hero's bag refuses the Bomb (a profile that cannot be written to): nothing may be marked
    const bag = jest.spyOn(useUserStore(), "addInventoryItem").mockReturnValue(false);
    const drop = await play({ chest: "dungeon", dungeon: "small-key", items: [BOMB_ITEM] });

    drop.take([BOMB_ITEM, "key"]);

    expect(temples.isDropTaken(drop.id, "1F", AT)).toBe(false);
    expect(drop.messages).toEqual(["Your bag is full. Store something at home first."]);
    expect(drop.rows()).toEqual([BOMB_ITEM, "key"]);
    drop.done();
    bag.mockRestore();
  });

  describe("a Bomb", () => {
    it("goes into the bag as a Bomb the hands can use, as the temple shop sells it", async () => {
      const drop = await play(BOMB_DROP);

      drop.take([BOMB_ITEM]);

      expect(hero().inventory).toEqual([{ name: "Bomb", kind: "consumable", faIcon: "bomb", qty: 1 }]);
      expect(bombInPack(HERO)?.qty).toBe(1);
      expect(drop.messages).toEqual(["Collected: Bomb"]);
      expect(temples.isDropTaken(drop.id, "1F", AT)).toBe(true);
      drop.done();
    });

    it("joins the Bombs the bag already holds, which needs no slot", async () => {
      fillBag(19, { inventory: [...things(19), { name: "Bomb", kind: "consumable", faIcon: "bomb", qty: 2 }] });
      const drop = await play(BOMB_DROP);

      drop.take([BOMB_ITEM]);

      expect(bombInPack(HERO)?.qty).toBe(3);
      expect(temples.isDropTaken(drop.id, "1F", AT)).toBe(true);
      drop.done();
    });

    it("comes out of a chest into the bag too, and stays in the chest when the bag is full", async () => {
      const chest = { type: "loot", content: { chest: "loot", items: [BOMB_ITEM] } } as Room;
      const id = makeTemple({ E: { type: "entrance" }, C: chest }, [["E", "C"]]);
      await openFor(id);
      const messages: string[] = [];
      const wrapper = mount(
        defineComponent({
          setup() {
            const hook = useTemple(id, AT, undefined, HERO);
            hook.registerMessageDisplay((message) => messages.push(message));
            return hook;
          },
          render: () => null,
        })
      );
      const vm = wrapper.vm as any;

      fillBag();
      vm.claimChestItems([BOMB_ITEM]);
      expect(bombsInBag()).toBe(0);
      expect(vm.chestContents.map((row: { value: string }) => row.value)).toEqual([BOMB_ITEM]);
      expect(messages).toEqual(["Your bag is full. Bomb stays in the chest. Store something at home first."]);

      hero().inventory.pop();
      vm.claimChestItems([BOMB_ITEM]);
      expect(hero().inventory[hero().inventory.length - 1]).toEqual({ name: "Bomb", kind: "consumable", faIcon: "bomb", qty: 1 });
      expect(vm.chestContents).toEqual([]);
      wrapper.unmount();
    });
  });

  describe("when the hero has no room: the drop is taken whole, or not at all", () => {
    it("takes nothing of a Bomb drop when the bag is full, and says so", async () => {
      fillBag();
      const drop = await play({ chest: "dungeon", dungeon: "small-key", items: [BOMB_ITEM] });

      drop.take([BOMB_ITEM, "key"]);

      expect(bombsInBag()).toBe(0);
      expect(hero().inventory).toHaveLength(20);
      expect(temples.getTempleState(drop.id)?.playerKeys).toBe(0);
      expect(temples.isDropTaken(drop.id, "1F", AT)).toBe(false);
      expect(drop.rows()).toEqual([BOMB_ITEM, "key"]);
      expect(drop.messages).toEqual(["Your bag is full. Store something at home first."]);

      // ... and a free slot later lets the hero come back for all of it
      hero().inventory.pop();
      drop.take([BOMB_ITEM, "key"]);
      expect(bombsInBag()).toBe(1);
      expect(temples.getTempleState(drop.id)?.playerKeys).toBe(1);
      expect(temples.isDropTaken(drop.id, "1F", AT)).toBe(true);
      drop.done();
    });

    it("takes nothing of a Potion and a Bomb that need the bag's last two slots when only one is free", async () => {
      fillBag(19);
      const drop = await play({ items: ["Potion", BOMB_ITEM] });

      drop.take(["Potion", BOMB_ITEM]);

      expect(hero().inventory).toHaveLength(19);
      expect(temples.isDropTaken(drop.id, "1F", AT)).toBe(false);
      expect(drop.messages).toEqual(["Your bag is full. Store something at home first."]);
      drop.done();
    });

    it("takes a Potion into storage when the hero has bought it, but a Bomb only into the bag (it is out of reach at home)", async () => {
      fillBag(20, { storageTier: 1, storage: [] });
      const potion = await play({ items: ["Potion"] });
      potion.take(["Potion"]);
      expect(hero().storage.map((row: { name: string }) => row.name)).toEqual(["Potion"]);
      expect(temples.isDropTaken(potion.id, "1F", AT)).toBe(true);
      potion.done();

      const bomb = await play(BOMB_DROP);
      bomb.take([BOMB_ITEM]);
      expect(hero().storage).toHaveLength(1);
      expect(bombsInBag()).toBe(0);
      expect(temples.isDropTaken(bomb.id, "1F", AT)).toBe(false);
      expect(bomb.messages).toEqual(["Your bag is full. Store something at home first."]);
      bomb.done();
    });

    it("still hands out a key, the map and gold when the bag is full: they need no slot", async () => {
      fillBag();
      const drop = await play({ chest: "dungeon", dungeon: "small-key", gold: 15 });

      drop.take(["key", "gold:15"]);

      expect(temples.getTempleState(drop.id)?.playerKeys).toBe(1);
      expect(temples.isDropTaken(drop.id, "1F", AT)).toBe(true);
      drop.done();
    });
  });
});
