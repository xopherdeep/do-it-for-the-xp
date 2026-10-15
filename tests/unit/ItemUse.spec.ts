import { createPinia, setActivePinia } from "pinia";
import type { EquipmentItem } from "@/app/Console/MyPortal/UserHud/components/equipment/EquipmentItems";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { answerRiddle, onEnterRoom, readExits, resetVisitMemory, roomActions } from "@/lib/services/temples/RoomInteractions";
import { bombInPack, handLabel, isBombsItem, mpCostOf, shortItemName, useItem, type ItemUseContext } from "@/lib/services/temples/ItemUse";
import { inventoryOf } from "@/lib/services/inventory/Inventory";
import { useUserStore } from "@/lib/store/stores/user";
import { HERO, addHero, contextAt, dungeons, enter, hero, hp, makeTemple, mp, temples } from "./templeFixtures";

// The user store is real; only what it writes to disk is faked.
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
// A hero's saved temple progress, by `${userId}|${templeId}`: what is saved is what the next read finds
const mockSavedProgress = new Map<string, any>();
jest.mock("@/lib/databases/TempleProgressDb", () => ({
  getTempleProgressDb: () => ({
    getProgress: (userId: string, templeId: string) => Promise.resolve(mockSavedProgress.get(`${userId}|${templeId}`) ?? null),
    saveProgress: (progress: any) => {
      mockSavedProgress.set(`${progress.userId}|${progress.templeId}`, progress);
      return Promise.resolve(progress);
    },
  }),
}));

// What a profile stores: plain copies, no functions
const stored = (name: string, faIcon: string, desc = ""): EquipmentItem => ({ name, faIcon, desc });

const QUESTS = stored("My Quests", "staff quest", "5HP | View and manage all your active quests.");
const SPELLS = stored("Book Of Spells", "book-spells", "Access your magical abilities.");
const GOODS = stored("Goods", "backpack", "View all items you've collected.");
const WALLET = stored("Wallet", "wallet", "Check your Gold Points balance.");
const PORTAL = stored("Portal Home", "portal-enter", "10MP | Open a magical portal home.");
const LANTERN = stored("Lantern", "flashlight", "5MP | Illuminate dark areas.");
const BOMBS = stored("Bombs", "bomb", "40MP | Blast through tough obstacles!");
const HOOK = stored("Hook Shot", "expand-alt", "15MP | Quickly grab distant objectives.");
const BOTTLES = stored("Bottles", "flask-potion", "Store and access your potions and ethers.");
const ICE_WAND = stored("Ice Wand", "wand-magic ice", "50MP | Freeze distractions in their tracks.");
const QUAKE = stored("Gaia's Quake", "wave-sine");
const NIGHTS_LIGHT = stored("Night's Light", "moon-stars");
const INVISIBILITY = stored("X's Invisibility", "hat-wizard");
const BOOTS = stored("Pegasus Boots", "boot", "Magical boots gifted by Aura.");
const WHISTLE = stored("Wind Whistle", "whistle", "A mystical whistle gifted by Ventus.");

/** The live catalog: the same items, with a click on the navigation and Pegasus ones. */
const clicks: Record<string, jest.Mock> = {};
const CLICKED = ["My Quests", "Book Of Spells", "Goods", "Wallet", "Portal Home", "Pegasus Boots", "Wind Whistle"];
const catalog = (): EquipmentItem[] =>
  [QUESTS, SPELLS, GOODS, WALLET, PORTAL, BOOTS, WHISTLE, LANTERN, BOMBS, HOOK, BOTTLES].map((item) => {
    const live: EquipmentItem = { ...item };
    if (CLICKED.includes(item.name)) {
      clicks[item.name] = jest.fn();
      live.click = clicks[item.name];
    }
    return live;
  });

beforeEach(() => {
  setActivePinia(createPinia());
  resetVisitMemory();
  addHero({ mp: { now: 60, max: 80 } });
});

/** The hero's context in a temple, standing at `position`. */
const itemContext = (id: string, position: [number, number], extra: Partial<ItemUseContext> = {}): ItemUseContext => {
  const base = contextAt(id, position);
  return {
    ...base,
    room: dungeons.getRoom(id, position, base.level)!,
    exits: readExits(id, base.level, position),
    catalog: catalog(),
    ...extra,
  };
};

const hall = (rooms = {}, grid: string[][] = [["E", "H"]]) => {
  const id = makeTemple({ E: { type: "entrance" }, H: { type: "empty" }, ...rooms }, grid);
  enter(id, [0, 0]);
  return id;
};

/** The temple's map is found, the way a chest gives it (no compass). */
const mapped = (id: string): string => {
  temples.getTempleState(id)!.hasMap = true;
  return id;
};

/** Put Bombs in the hero's pack, the way a temple shop or a chest does. */
const packBombs = (qty: number) => useUserStore().addInventoryItem(HERO, { name: "Bomb", kind: "consumable", qty });

/** The hero's bag with every one of its 20 stacks taken (and whatever else the profile should hold). */
const fillBag = (extra: object = {}) =>
  Object.assign(hero(), { inventory: Array.from({ length: 20 }, (_, i) => ({ id: `thing-${i}`, name: `Thing ${i}`, qty: 1 })), ...extra });

describe("hand slots", () => {
  it("shows the item's name, or Left / Right for an empty hand", () => {
    expect(handLabel(LANTERN, "Left")).toBe("Lantern");
    expect(handLabel(null, "Left")).toBe("Left");
    expect(handLabel(undefined, "Right")).toBe("Right");
    expect(handLabel({ name: "" }, "Right")).toBe("Right");
  });

  it("keeps long names to 12 characters with an ellipsis", () => {
    expect(shortItemName("Book Of Spells")).toBe("Book Of Spe…");
    expect(shortItemName("Book Of Spells")).toHaveLength(12);
    expect(shortItemName("Thor's Hammer")).toBe("Thor's Hamm…");
    expect(shortItemName("Tesla's Bolt")).toBe("Tesla's Bolt"); // exactly 12 stays whole
    expect(shortItemName("Bombs")).toBe("Bombs");
  });
});

describe("what an item costs", () => {
  it("reads the rules table by name, whatever the description says", () => {
    expect(mpCostOf(BOMBS)).toBe(0);
    expect(mpCostOf(stored("Silver Arrow", "bow-arrow", "10MP | A precise magical arrow."))).toBe(25);
    expect(mpCostOf(stored("Lantern", "flashlight"))).toBe(5);
    expect(mpCostOf(BOTTLES)).toBe(0);
  });

  it("prices a stored old copy by the table, not its description", () => {
    expect(mpCostOf({ name: "Ice Wand", desc: "50MP | Freeze distractions in their tracks." })).toBe(10);
    expect(mpCostOf({ name: "Bombs", desc: "40MP | Blast through tough obstacles!" })).toBe(0);
  });

  it("reads the number the description starts with for an item the table does not know", () => {
    expect(mpCostOf(stored("Rubber Duck", "duck", "7MP | Quacks."))).toBe(7);
    expect(mpCostOf(stored("Pegasus Boots", "boot"))).toBe(0);
  });

  it("asks the live definition for the name when the stored copy lost it", () => {
    expect(mpCostOf({ faIcon: "flashlight", desc: "" }, LANTERN)).toBe(5);
    expect(mpCostOf(stored("Lantern", "flashlight"), LANTERN)).toBe(5);
  });
});

describe("navigation items", () => {
  it.each([QUESTS, SPELLS, GOODS, WALLET, PORTAL])("$name runs its click from the live catalog", (item) => {
    const id = hall();
    const ctx = itemContext(id, [0, 0]);

    const outcome = useItem(item, ctx);

    expect(outcome).toEqual({ navigated: true });
    expect(clicks[item.name]).toHaveBeenCalledTimes(1);
    expect(mp()).toBe(60); // walking to a screen costs nothing
  });

  it("finds the definition by name when the icon is not enough", () => {
    const id = hall();

    const outcome = useItem(stored("Goods", "something-old"), itemContext(id, [0, 0]));

    expect(outcome.navigated).toBe(true);
  });

  it("says so when there is no click to run", () => {
    const id = hall();

    const outcome = useItem(QUESTS, itemContext(id, [0, 0], { catalog: [] }));

    expect(outcome.sound).toBe("error");
    expect(outcome.navigated).toBeUndefined();
  });

  it.each([BOOTS, WHISTLE])("$name runs its click and stays on the temple screen", (item) => {
    const id = hall();

    const outcome = useItem(item, itemContext(id, [0, 0]));

    expect(outcome).toEqual({});
    expect(clicks[item.name]).toHaveBeenCalledTimes(1);
    expect(mp()).toBe(60);
  });
});

describe("Portal Home in a temple", () => {
  const savedRun = (id: string) => mockSavedProgress.get(`${HERO}|${id}`);

  /**
   * A tower the hero has worked in: past a locked door (opened with a key, two keys and the master key left), the
   * map found, a room won and a chest emptied on the first floor, then up the stairs to the second.
   */
  const workedTower = async () => {
    const id = makeTemple(
      { E: { type: "entrance" }, H: { type: "empty", locked: { east: true } }, G: { type: "empty" }, C: { type: "loot" } },
      { "1F": [["E", "H", "G", "C"]], "2F": [["G", "G", "G", "G"]] }
    );
    temples.initTemple(id, undefined, undefined, HERO);
    await temples.whenProgressReady(id);
    for (let key = 0; key < 3; key++) temples.addKey(id);
    temples.grantMasterKey(id);
    temples.grantMapAndCompass(id);
    temples.moveToPosition(id, [0, 1], "east");
    temples.unlockDoor(id, [0, 1], "east");
    temples.moveToPosition(id, [0, 2], "east");
    temples.markRoomCleared(id, "1F", [0, 2]);
    temples.moveToPosition(id, [0, 3], "east");
    temples.markChestOpened(id, "1F", [0, 3]);
    temples.changeLevel(id, "2F", [0, 2]);
    return id;
  };

  it("saves the run with the hero back at the entrance and everything else kept, and ends the run in memory", async () => {
    const id = await workedTower();
    await temples.flushProgress();
    expect(savedRun(id)).toMatchObject({ currentLevel: "2F", currentPosition: [0, 2] }); // saved where the hero stands

    const outcome = useItem(PORTAL, itemContext(id, [0, 2]));
    await temples.flushProgress();

    expect(outcome).toEqual({ navigated: true });
    expect(clicks["Portal Home"]).toHaveBeenCalledTimes(1);
    expect(savedRun(id)).toMatchObject({
      currentLevel: "1F",
      currentPosition: [0, 0],
      playerKeys: 2,
      hasMasterKey: true,
      hasMap: true,
      hasCompass: true,
      openedDoors: ["1F:0,1>east"],
      openedChests: ["1F:0,3"],
      clearedRooms: ["1F:0,2"],
    });
    expect(savedRun(id).visitedRooms).toEqual(expect.arrayContaining(["1F:0,0", "1F:0,1", "1F:0,2", "1F:0,3", "2F:0,2"]));
    expect(temples.getTempleState(id)).toBeUndefined();
    expect(temples.getHeroId(id)).toBeUndefined();
    expect(mp()).toBe(60);
  });

  it("opens the next visit at the entrance, with the keys, the door, the chest and the won room as they were", async () => {
    const id = await workedTower();
    useItem(PORTAL, itemContext(id, [0, 2]));
    await temples.flushProgress();

    temples.initTemple(id, undefined, undefined, HERO); // the temple screen opens the temple again
    await temples.whenProgressReady(id);

    expect(temples.getTempleState(id)).toMatchObject({
      currentLevel: "1F",
      currentPosition: [0, 0],
      playerKeys: 2,
      hasMasterKey: true,
      hasMap: true,
      hasCompass: true,
    });
    expect(temples.isRoomCleared(id, "1F", [0, 2])).toBe(true);
    expect(temples.getTempleState(id)!.openedChests).toEqual(new Set(["1F:0,3"]));
    expect(temples.moveToPosition(id, [0, 1], "east")).toBe(true);
    expect(temples.moveToPosition(id, [0, 2], "east")).toBe(true); // the door stays open
  });

  it("leaves a run in place when the portal is out of reach, and for every other way out of the screen", async () => {
    const id = await workedTower();

    const closed = useItem(PORTAL, itemContext(id, [0, 2], { catalog: [] }));
    const goods = useItem(GOODS, itemContext(id, [0, 2]));
    await temples.flushProgress();

    expect(closed.sound).toBe("error");
    expect(goods).toEqual({ navigated: true });
    expect(temples.getTempleState(id)).toMatchObject({ currentLevel: "2F", currentPosition: [0, 2] });
    expect(savedRun(id)).toMatchObject({ currentLevel: "2F", currentPosition: [0, 2] });
  });
});

describe("Lantern", () => {
  it("shows the temple: map and compass for this hero, for the MP the table names", () => {
    const id = hall();

    const outcome = useItem(LANTERN, itemContext(id, [0, 0]));

    expect(outcome).toEqual({ message: "The lantern shows the way: map and compass revealed.", sound: "shhh" });
    expect(temples.getTempleState(id)).toMatchObject({ hasMap: true, hasCompass: true });
    expect(mp()).toBe(55);
  });

  it("bills a Mage 25% less and a Sage half (the class passive), rounded down", () => {
    useUserStore().users[HERO].jobClass = "Mage";
    useItem(LANTERN, itemContext(hall(), [0, 0])); // 5 MP list price -> 3
    expect(mp()).toBe(57);

    useUserStore().users[HERO].jobClass = "Sage";
    useItem(stored("Lantern", "flashlight"), itemContext(hall(), [0, 0], { catalog: [] })); // 5 MP -> 2
    expect(mp()).toBe(55);
  });

  it("a Mage with 3 MP can still light a 5 MP lantern: the discount applies before the refusal", () => {
    addHero({ mp: { now: 3, max: 80 } });
    useUserStore().users[HERO].jobClass = "Mage";
    const id = hall();

    expect(useItem(LANTERN, itemContext(id, [0, 0])).message).not.toBe("Not enough MP");
    expect(temples.getTempleState(id)).toMatchObject({ hasMap: true, hasCompass: true });
    expect(mp()).toBe(0);
  });

  it("costs 5 MP from the table even when the stored copy says nothing, or something old", () => {
    const id = hall();

    useItem(stored("Lantern", "flashlight", "50MP | Illuminate dark areas."), itemContext(id, [0, 0], { catalog: [] }));

    expect(mp()).toBe(55);
  });

  it("refuses a hero short on MP and shows nothing", () => {
    addHero({ mp: { now: 4, max: 80 } });
    const id = hall();

    const outcome = useItem(LANTERN, itemContext(id, [0, 0]));

    expect(outcome).toEqual({ message: "Not enough MP", sound: "error" });
    expect(temples.getTempleState(id)).toMatchObject({ hasMap: false, hasCompass: false });
    expect(mp()).toBe(4);
  });

  it("does not charge twice for a temple that is already shown", () => {
    const id = hall();
    useItem(LANTERN, itemContext(id, [0, 0]));

    const outcome = useItem(LANTERN, itemContext(id, [0, 0]));

    expect(outcome.message).toMatch(/already know the way/);
    expect(mp()).toBe(55);
  });
});

describe("Bottles", () => {
  it("bottle a spring as Spring Water, once", () => {
    const id = hall({ S: { type: "health", content: { healthPoints: 10 } } }, [["E", "S"]]);
    enter(id, [0, 1]);

    const outcome = useItem(BOTTLES, itemContext(id, [0, 1]));

    expect(outcome).toEqual({ message: "You bottle the spring: Spring Water is in your bag.", sound: "takeItem" });
    expect(inventoryOf(useUserStore().getUserById(HERO)).find((e) => e.name === "Spring Water")?.qty).toBe(1);
    expect(hero().inventory).toEqual([expect.objectContaining({ name: "Spring Water", kind: "consumable", qty: 1, source: id })]);
    expect(hp()).toBe(30); // nothing is drunk here
    expect(useItem(BOTTLES, itemContext(id, [0, 1])).message).toBe("No spring here to bottle.");
    expect(roomActions(dungeons.getRoom(id, [0, 1])!, contextAt(id, [0, 1])).header).toBe("The spring is still.");
  });

  it("bottle a mana spring as Silver Water, for no MP", () => {
    const id = hall({ S: { type: "mana", content: { magicPoints: 25 } } }, [["E", "S"]]);
    enter(id, [0, 1]);

    expect(useItem(BOTTLES, itemContext(id, [0, 1])).message).toBe("You bottle the spring: Silver Water is in your bag.");
    expect(inventoryOf(hero()).map((e) => [e.name, e.qty])).toEqual([["Silver Water", 1]]);
    expect(mp()).toBe(60);
  });

  it("find no spring in a room without one, or in a spring already drunk", async () => {
    expect(useItem(BOTTLES, itemContext(hall(), [0, 0]))).toEqual({ message: "No spring here to bottle." });

    const id = hall({ S: { type: "health" } }, [["E", "S"]]);
    enter(id, [0, 1]);
    await roomActions(dungeons.getRoom(id, [0, 1])!, contextAt(id, [0, 1])).actions[0].run(); // drink it

    expect(useItem(BOTTLES, itemContext(id, [0, 1])).message).toBe("No spring here to bottle.");
    expect(hero().inventory).toBeUndefined();
  });

  it("leave the spring alone when the bag is full", () => {
    const id = hall({ S: { type: "health" } }, [["E", "S"]]);
    enter(id, [0, 1]);
    fillBag();

    expect(useItem(BOTTLES, itemContext(id, [0, 1]))).toEqual({ message: "Your bag is full.", sound: "error" });
    expect(hero().inventory).toHaveLength(20);

    // the spring is still there: a free slot and it bottles
    hero().inventory.pop();
    expect(useItem(BOTTLES, itemContext(id, [0, 1])).sound).toBe("takeItem");
  });

  it("never bottle into home storage: the water must be in the bag", () => {
    const id = hall({ S: { type: "health" } }, [["E", "S"]]);
    enter(id, [0, 1]);
    fillBag({ storageTier: 1, storage: [] });

    expect(useItem(BOTTLES, itemContext(id, [0, 1]))).toEqual({ message: "Your bag is full.", sound: "error" });
    expect(hero().storage).toEqual([]);
    expect(hero().inventory).toHaveLength(20);
    expect(roomActions(dungeons.getRoom(id, [0, 1])!, contextAt(id, [0, 1])).header).toBe("A spring of clear water.");
  });
});

describe("Bombs", () => {
  const lockedHall = () => hall({ E: { type: "entrance", locked: { east: true } } });

  /** The hero in H with a room on every side: a row of three, a room above and a room below. A cracked wall is drawn where `barriers` say. */
  const crackedHall = (barriers: object, extra: object = {}, at: [number, number] = [1, 1]) => {
    const id = makeTemple(
      {
        E: { type: "entrance" },
        H: { type: "empty", barriers, ...extra } as Room,
        F: { type: "empty" },
        U: { type: "empty" },
        D: { type: "empty" },
        W: { type: "wall" },
      },
      [
        ["W", "U", "W"],
        ["E", "H", "F"],
        ["W", "D", "W"],
      ]
    );
    enter(id, at);
    return id;
  };

  describe("isBombsItem: the item the cracked wall's sheet looks for in a hand", () => {
    it("knows the Bombs by name, by icon, and from a stored copy with an old description", () => {
      expect(isBombsItem(BOMBS, catalog())).toBe(true);
      expect(isBombsItem({ name: "Old Name", faIcon: "bomb" }, catalog())).toBe(true);
      expect(isBombsItem({ name: "Bombs", desc: "40MP | old" }, [])).toBe(true);
    });

    it("says no to every other tool, to a Bomb in the pack's name only, and to an empty hand", () => {
      expect(isBombsItem(LANTERN, catalog())).toBe(false);
      expect(isBombsItem(HOOK, catalog())).toBe(false);
      expect(isBombsItem({ name: "Bomb" }, catalog())).toBe(false);
      expect(isBombsItem(null, catalog())).toBe(false);
      expect(isBombsItem(undefined, catalog())).toBe(false);
    });
  });

  describe("never open a locked door (a cracked wall is what a Bomb is for)", () => {
    it("answer 'Nothing to blow up here.' beside a small lock with a room beyond it, and keep the Bomb and the lock", () => {
      packBombs(2);
      const before = mp();

      expect(useItem(BOMBS, itemContext(lockedHall(), [0, 0]))).toEqual({ message: "Nothing to blow up here." });

      expect(mp()).toBe(before);
      expect(bombInPack(HERO)?.qty).toBe(2);
    });

    it("leave the lock shut even when the tap names that side", () => {
      packBombs(1);
      const id = makeTemple({ E: { type: "entrance" }, H: { type: "empty", locked: { east: true } }, F: { type: "empty" } }, [["E", "H", "F"]]);
      enter(id, [0, 1]);

      expect(useItem(BOMBS, itemContext(id, [0, 1], { side: "east" }))).toEqual({ message: "Nothing to blow up here." });

      expect(dungeons.getRoom(id, [0, 1])!.locked!.east).toBe(true);
      expect(temples.doorKind(id, [0, 1], "east")).toBe("locked");
      expect(bombInPack(HERO)?.qty).toBe(1);
    });

    it("leave every lock shut when they lead nowhere either", () => {
      packBombs(1);
      const id = makeTemple({ V: { type: "void" }, H: { type: "empty", locked: { west: true, north: true } } }, [["V", "H"]]);
      enter(id, [0, 1]);

      expect(useItem(BOMBS, itemContext(id, [0, 1]))).toEqual({ message: "Nothing to blow up here." });

      expect(dungeons.getRoom(id, [0, 1])!.locked).toMatchObject({ west: true, north: true });
      expect(bombInPack(HERO)?.qty).toBe(1);
    });
  });

  describe("on a cracked wall (a bombable side)", () => {
    it("blows it open from both rooms for one Bomb and no MP, and lets the hero walk through", () => {
      packBombs(2);
      const id = crackedHall({ east: "bombable" });

      const outcome = useItem(BOMBS, itemContext(id, [1, 1]));

      expect(outcome).toMatchObject({ message: "Boom! The east wall blows open.", sound: "damage", shake: true, blownSide: "east" });
      expect(temples.doorKind(id, [1, 1], "east")).toBe("open");
      expect(temples.doorKind(id, [1, 2], "west")).toBe("open");
      expect([...(temples.getTempleState(id)?.openedDoors ?? [])].sort()).toEqual(["1F:1,1>east", "1F:1,2>west"]);
      expect(bombInPack(HERO)?.qty).toBe(1);
      expect(mp()).toBe(60);
      expect(temples.moveToPosition(id, [1, 2], "east")).toBe(true);
    });

    it("opens exactly one: the first clockwise from north, and the others stay cracked", () => {
      packBombs(3);
      const id = crackedHall({ west: "bombable", south: "bombable", east: "bombable" });

      expect(useItem(BOMBS, itemContext(id, [1, 1])).message).toBe("Boom! The east wall blows open.");
      expect(temples.doorKind(id, [1, 1], "south")).toBe("bombable");
      expect(temples.doorKind(id, [1, 1], "west")).toBe("bombable");

      expect(useItem(BOMBS, itemContext(id, [1, 1])).message).toBe("Boom! The south wall blows open.");
      expect(temples.doorKind(id, [1, 1], "west")).toBe("bombable");
      expect(bombInPack(HERO)?.qty).toBe(1);
    });

    it("blows the side the hero tapped when the tap names one", () => {
      packBombs(1);
      const id = crackedHall({ east: "bombable", west: "bombable" });

      const outcome = useItem(BOMBS, itemContext(id, [1, 1], { side: "west" }));

      expect(outcome.message).toBe("Boom! The west wall blows open.");
      expect(temples.doorKind(id, [1, 1], "west")).toBe("open");
      expect(temples.doorKind(id, [1, 1], "east")).toBe("bombable");
    });

    it("goes to the next cracked wall when the tapped side is not one, and never to a small lock", () => {
      packBombs(2);
      const id = crackedHall({ south: "bombable" }, { locked: { east: true } });

      expect(useItem(BOMBS, itemContext(id, [1, 1], { side: "north" })).message).toBe("Boom! The south wall blows open.");
      expect(temples.doorKind(id, [1, 1], "east")).toBe("locked");

      // Nothing cracked is left: the small lock stays shut and the second Bomb is kept
      expect(useItem(BOMBS, itemContext(id, [1, 1]))).toEqual({ message: "Nothing to blow up here." });
      expect(temples.doorKind(id, [1, 1], "east")).toBe("locked");
      expect(bombInPack(HERO)?.qty).toBe(1);
    });

    it("finds nothing to blow up in a plain wall, and keeps the Bomb", () => {
      packBombs(1);
      const id = crackedHall({ east: "wall", north: "wall" });

      expect(useItem(BOMBS, itemContext(id, [1, 1]))).toEqual({ message: "Nothing to blow up here." });

      expect(temples.doorKind(id, [1, 1], "east")).toBe("wall");
      expect(temples.getTempleState(id)?.openedDoors?.size).toBe(0);
      expect(bombInPack(HERO)?.qty).toBe(1);
    });

    it("finds nothing to blow up in a cracked wall with no room beyond, and keeps the Bomb", () => {
      packBombs(1);
      const id = makeTemple({ V: { type: "void" }, H: { type: "empty", barriers: { west: "bombable", north: "bombable" } } as Room }, [["V", "H"]]);
      enter(id, [0, 1]);

      expect(useItem(BOMBS, itemContext(id, [0, 1]))).toEqual({ message: "Nothing to blow up here." });

      expect(temples.doorKind(id, [0, 1], "west")).toBe("bombable");
      expect(bombInPack(HERO)?.qty).toBe(1);
    });

    it("cannot blow a cracked wall out of a fight that is still on, and keeps the Bomb", () => {
      packBombs(1);
      const id = makeTemple(
        { E: { type: "entrance" }, M: { type: "monster", content: { lockOnEnter: true }, barriers: { east: "bombable" } } as Room, F: { type: "empty" } },
        [["E", "M", "F"]]
      );
      enter(id, [0, 0]);
      temples.moveToPosition(id, [0, 1], "east"); // the doors seal behind the hero

      const outcome = useItem(BOMBS, itemContext(id, [0, 1]));

      expect(outcome.sound).toBe("error");
      expect(temples.doorKind(id, [0, 1], "east")).toBe("bombable");
      expect(bombInPack(HERO)?.qty).toBe(1);
    });

    it("is blown open the same from the room beyond", () => {
      packBombs(1);
      const id = crackedHall({ east: "bombable" }, {}, [1, 2]);

      expect(useItem(BOMBS, itemContext(id, [1, 2])).message).toBe("Boom! The west wall blows open.");
      expect(temples.doorKind(id, [1, 1], "east")).toBe("open");
    });
  });

  describe("beside the boss door, which only the Boss Key opens", () => {
    /** The hero in H: the boss door east, a cracked wall south. */
    const bossHall = () => {
      const id = makeTemple(
        {
          E: { type: "entrance" },
          H: { type: "empty", locked: { east: true }, barriers: { south: "bombable" } } as Room,
          B: { type: "boss" },
          F: { type: "empty" },
          W: { type: "wall" },
        },
        [
          ["E", "H", "B"],
          ["W", "F", "W"],
        ]
      );
      enter(id, [0, 1]);
      return id;
    };

    it("blow the cracked wall and leave the boss door shut", () => {
      packBombs(1);
      const id = bossHall();

      expect(useItem(BOMBS, itemContext(id, [0, 1])).message).toBe("Boom! The south wall blows open.");
      expect(dungeons.getRoom(id, [0, 1])!.locked).toMatchObject({ east: true });
      expect(bombInPack(HERO)).toBeNull();
    });

    it("go by the temple's own doors, even when the exits handed in mark the boss door as locked", () => {
      packBombs(1);
      const id = bossHall();
      const base = itemContext(id, [0, 1]);
      const exits = { ...base.exits, east: { ...base.exits.east, locked: true } };

      expect(useItem(BOMBS, { ...base, exits, side: "east" }).message).toBe("Boom! The south wall blows open.");
      expect(dungeons.getRoom(id, [0, 1])!.locked).toMatchObject({ east: true });
    });

    it("find nothing to blow up when the boss door is the only way on", () => {
      packBombs(1);
      const id = makeTemple({ E: { type: "entrance" }, H: { type: "empty", locked: { east: true } }, B: { type: "boss" } }, [["E", "H", "B"]]);
      enter(id, [0, 1]);

      expect(useItem(BOMBS, itemContext(id, [0, 1], { side: "east" }))).toEqual({ message: "Nothing to blow up here." });
      expect(dungeons.getRoom(id, [0, 1])!.locked).toMatchObject({ east: true });
      expect(bombInPack(HERO)?.qty).toBe(1);
    });
  });

  it("refuse with an empty pack and spend nothing", () => {
    const id = lockedHall();
    const before = mp();

    expect(useItem(BOMBS, itemContext(id, [0, 0]))).toEqual({ message: "Out of bombs.", sound: "error" });
    expect(mp()).toBe(before);
    expect(dungeons.getRoom(id, [0, 0])!.locked!.east).toBe(true);
  });

  it("say they are out before anything else", () => {
    expect(useItem(BOMBS, itemContext(hall(), [0, 0])).message).toBe("Out of bombs.");
  });

  it("find nothing to blow up in a room without a cracked side, and keep the Bomb", () => {
    packBombs(1);
    const id = hall();

    const outcome = useItem(BOMBS, itemContext(id, [0, 0]));

    expect(outcome).toEqual({ message: "Nothing to blow up here." });
    expect(mp()).toBe(60);
    expect(bombInPack(HERO)?.qty).toBe(1);
  });

  it("need no MP: a hero with none left can still blow a cracked wall", () => {
    addHero({ mp: { now: 0, max: 80 } });
    packBombs(1);
    const id = crackedHall({ east: "bombable" });

    const outcome = useItem(BOMBS, itemContext(id, [1, 1]));

    expect(outcome).toMatchObject({ message: "Boom! The east wall blows open." });
    expect(temples.doorKind(id, [1, 1], "east")).toBe("open");
    expect(mp()).toBe(0);
  });

  it("do not break the seal of a fight that is still on: it is a lock, and a lock is not for a Bomb", () => {
    packBombs(1);
    const id = makeTemple({ E: { type: "entrance" }, M: { type: "monster", content: { lockOnEnter: true } } }, [["E", "M"]]);
    enter(id, [0, 0]);
    temples.moveToPosition(id, [0, 1], "east"); // the doors seal behind the hero

    const outcome = useItem(BOMBS, itemContext(id, [0, 1]));

    expect(outcome).toEqual({ message: "Nothing to blow up here." });
    expect(dungeons.getRoom(id, [0, 1])!.locked!.west).toBe(true);
    expect(mp()).toBe(60);
    expect(bombInPack(HERO)?.qty).toBe(1);
  });
});

describe("Hook Shot", () => {
  it("swings the hero across a pit to the room beyond", () => {
    const id = makeTemple({ E: { type: "entrance" }, P: { type: "pit" }, G: { type: "empty" } }, [["E", "P", "G"]]);
    enter(id, [0, 0]);

    const outcome = useItem(HOOK, itemContext(id, [0, 0]));

    expect(outcome).toMatchObject({ moved: true });
    expect(temples.getTempleState(id)!.currentPosition).toEqual([0, 2]);
    expect(mp()).toBe(55);
  });

  it("crosses a void as well", () => {
    const id = makeTemple({ E: { type: "entrance" }, V: { type: "void" }, G: { type: "empty" } }, [["G", "V", "E"]]);
    enter(id, [0, 2]);

    useItem(HOOK, itemContext(id, [0, 2]));

    expect(temples.getTempleState(id)!.currentPosition).toEqual([0, 0]);
  });

  it("has nothing to latch onto without a hazard, or when a wall is all that lies beyond", () => {
    const plain = hall();
    expect(useItem(HOOK, itemContext(plain, [0, 0]))).toEqual({ message: "Nothing to latch onto." });

    const blocked = makeTemple({ E: { type: "entrance" }, P: { type: "pit" }, W: { type: "wall" } }, [["E", "P", "W"]]);
    enter(blocked, [0, 0]);
    expect(useItem(HOOK, itemContext(blocked, [0, 0]))).toEqual({ message: "Nothing to latch onto." });
    expect(temples.getTempleState(blocked)!.currentPosition).toEqual([0, 0]);
    expect(mp()).toBe(60);
  });

  it("will not swing through a wall or a cracked wall", () => {
    for (const barrier of ["wall", "bombable"] as const) {
      const id = makeTemple(
        { E: { type: "entrance", barriers: { east: barrier } } as Room, P: { type: "pit" }, G: { type: "empty" } },
        [["E", "P", "G"]]
      );
      enter(id, [0, 0]);

      expect(useItem(HOOK, itemContext(id, [0, 0])).message).toBe("Nothing to latch onto.");
      expect(temples.getTempleState(id)!.currentPosition).toEqual([0, 0]);
    }
  });

  it("will not swing through a locked door", () => {
    const id = makeTemple(
      { E: { type: "entrance", locked: { east: true } }, P: { type: "pit" }, G: { type: "empty" } },
      [["E", "P", "G"]]
    );
    enter(id, [0, 0]);

    expect(useItem(HOOK, itemContext(id, [0, 0])).message).toBe("Nothing to latch onto.");
  });

  it("crosses a void the hero cannot walk onto", () => {
    const id = makeTemple({ E: { type: "entrance" }, V: { type: "void" }, G: { type: "empty" } }, [["E", "V", "G"]]);
    enter(id, [0, 0]);
    expect(temples.moveToPosition(id, [0, 1], "east")).toBe(false); // on foot the void is a gap, not a floor

    expect(useItem(HOOK, itemContext(id, [0, 0]))).toMatchObject({ moved: true });

    expect(temples.getTempleState(id)!.currentPosition).toEqual([0, 2]);
  });

  it("will not swing through a lock on the far side of the hazard", () => {
    const id = makeTemple(
      { E: { type: "entrance" }, P: { type: "pit", locked: { east: true } }, G: { type: "empty" } },
      [["E", "P", "G"]]
    );
    enter(id, [0, 0]);

    expect(useItem(HOOK, itemContext(id, [0, 0])).message).toBe("Nothing to latch onto.");
    expect(temples.getTempleState(id)!.currentPosition).toEqual([0, 0]);
    expect(mp()).toBe(60);
  });

  it("will not swing over a pit into the boss room: the boss door stays shut", () => {
    const id = makeTemple(
      { E: { type: "entrance" }, P: { type: "pit" }, B: { type: "boss", content: { lockOnEnter: true } } },
      [["E", "P", "B"]]
    );
    enter(id, [0, 0]);
    temples.grantMasterKey(id); // the Boss Key opens that door by hand, never by a hook

    expect(temples.doorKind(id, [0, 1], "east")).toBe("master");
    expect(useItem(HOOK, itemContext(id, [0, 0])).message).toBe("Nothing to latch onto.");
    expect(temples.getTempleState(id)!.currentPosition).toEqual([0, 0]);
    expect(mp()).toBe(60);
  });

  it("seals a guard room the hero lands in, as a step into it would", () => {
    const id = makeTemple(
      { E: { type: "entrance" }, P: { type: "pit" }, M: { type: "monster", content: { lockOnEnter: true } } },
      [["E", "P", "M"]]
    );
    enter(id, [0, 0]);

    expect(useItem(HOOK, itemContext(id, [0, 0]))).toMatchObject({ moved: true });

    expect(dungeons.getRoom(id, [0, 2])!.locked).toEqual({ north: true, south: true, east: true, west: true });
    expect(temples.isRoomCleared(id, "1F", [0, 2])).toBe(false);
  });

  it("is refused for lack of MP", () => {
    addHero({ mp: { now: 4, max: 80 } });
    const id = makeTemple({ E: { type: "entrance" }, P: { type: "pit" }, G: { type: "empty" } }, [["E", "P", "G"]]);
    enter(id, [0, 0]);

    expect(useItem(HOOK, itemContext(id, [0, 0]))).toEqual({ message: "Not enough MP", sound: "error" });
    expect(temples.getTempleState(id)!.currentPosition).toEqual([0, 0]);
  });
});

describe("Ice Wand", () => {
  it("freezes the trap next door so it never bites", () => {
    const id = hall({ T: { type: "trap", content: { damage: 5 } } }, [["E", "T"]]);
    const before = mp();

    expect(useItem(ICE_WAND, itemContext(id, [0, 0]))).toEqual({
      message: "Frost spreads into the next room: the trap is frozen.",
      sound: "shhh",
    });
    expect(mp()).toBe(before - 10); // the table's 10 MP, not the 50 an old copy says
    expect(onEnterRoom(dungeons.getRoom(id, [0, 1])!, contextAt(id, [0, 1]))).toBeNull();
    expect(hp()).toBe(30);
  });

  it("freezes every trap on an open side at once, for one charge", () => {
    const id = makeTemple(
      { E: { type: "entrance" }, T: { type: "trap" }, A: { type: "trap", content: { avoidable: true } } },
      [["T", "E", "A"]]
    );
    enter(id, [0, 1]);

    useItem(ICE_WAND, itemContext(id, [0, 1]));

    expect(mp()).toBe(50);
    expect(onEnterRoom(dungeons.getRoom(id, [0, 0])!, contextAt(id, [0, 0]))).toBeNull();
    expect(onEnterRoom(dungeons.getRoom(id, [0, 2])!, contextAt(id, [0, 2]))).toBeNull(); // no dodge sheet either
  });

  it("finds no trap to freeze behind a locked door, in a sprung trap or with none about, and charges nothing", () => {
    expect(useItem(ICE_WAND, itemContext(hall(), [0, 0]))).toEqual({ message: "No trap nearby to freeze." });

    const locked = hall({ E: { type: "entrance", locked: { east: true } }, T: { type: "trap" } }, [["E", "T"]]);
    expect(useItem(ICE_WAND, itemContext(locked, [0, 0])).message).toBe("No trap nearby to freeze.");

    const sprung = hall({ T: { type: "trap" } }, [["E", "T"]]);
    onEnterRoom(dungeons.getRoom(sprung, [0, 1])!, contextAt(sprung, [0, 1])); // it bites once
    expect(useItem(ICE_WAND, itemContext(sprung, [0, 0])).message).toBe("No trap nearby to freeze.");
    expect(mp()).toBe(60);
  });

  it("finds no trap to freeze behind a wall or a cracked wall", () => {
    for (const barrier of ["wall", "bombable"] as const) {
      const id = hall({ E: { type: "entrance", barriers: { east: barrier } } as Room, T: { type: "trap" } }, [["E", "T"]]);

      expect(useItem(ICE_WAND, itemContext(id, [0, 0])).message).toBe("No trap nearby to freeze.");
    }
    expect(mp()).toBe(60);
  });

  it("is refused for lack of MP, and the trap stays live", () => {
    addHero({ mp: { now: 9, max: 80 } });
    const id = hall({ T: { type: "trap" } }, [["E", "T"]]);

    expect(useItem(ICE_WAND, itemContext(id, [0, 0]))).toEqual({ message: "Not enough MP", sound: "error" });
    expect(onEnterRoom(dungeons.getRoom(id, [0, 1])!, contextAt(id, [0, 1]))).toMatchObject({ sound: "damage" });
  });
});

describe("Gaia's Quake", () => {
  /** A hall with a secret room at its end, whose map the hero has found (a chest's map: no compass). */
  const secretHall = () => mapped(hall({ S: { type: "secret" } }, [["E", "H", "S"]]));

  it("asks for the temple's map first, charging nothing and shaking no floor", () => {
    const id = hall({ S: { type: "secret" } }, [["E", "H", "S"]]);

    expect(useItem(QUAKE, itemContext(id, [0, 0]))).toEqual({ message: "Find this temple's map first.", sound: "error" });
    expect(mp()).toBe(60);
    expect(temples.getTempleState(id)!.revealedSecretFloors).toBeUndefined();
  });

  it("shows the floor's hidden rooms, for 10 MP", () => {
    const id = secretHall();

    const outcome = useItem(QUAKE, itemContext(id, [0, 0]));

    expect(outcome).toEqual({ message: "The ground shakes. Hidden rooms appear on your map.", sound: "shhh", shake: true });
    expect(mp()).toBe(50);
    expect(temples.getTempleState(id)!.revealedSecretFloors?.has("1F")).toBe(true);
  });

  it("says when the floor is already shown, and charges once", () => {
    const id = secretHall();
    useItem(QUAKE, itemContext(id, [0, 0]));

    expect(useItem(QUAKE, itemContext(id, [0, 0]))).toEqual({ message: "Hidden rooms on this floor are already on your map." });
    expect(mp()).toBe(50);
  });

  it("finds nothing on a floor with no secret room, or only ones the hero has stood in, and charges nothing", () => {
    expect(useItem(QUAKE, itemContext(mapped(hall()), [0, 0]))).toEqual({ message: "The ground shakes, but nothing is hidden on this floor." });

    const id = mapped(hall({ S: { type: "secret" } }, [["E", "S"]]));
    temples.moveToPosition(id, [0, 1], "east");
    expect(useItem(QUAKE, itemContext(id, [0, 1])).message).toBe("The ground shakes, but nothing is hidden on this floor.");
    expect(temples.getTempleState(id)!.revealedSecretFloors).toBeUndefined();
    expect(mp()).toBe(60);
  });

  it("is refused for lack of MP and shows nothing", () => {
    addHero({ mp: { now: 9, max: 80 } });
    const id = secretHall();

    expect(useItem(QUAKE, itemContext(id, [0, 0]))).toEqual({ message: "Not enough MP", sound: "error" });
    expect(temples.getTempleState(id)!.revealedSecretFloors).toBeUndefined();
  });
});

describe("Night's Light", () => {
  const puzzleHall = () => {
    const id = hall({ P: { type: "puzzle", content: { puzzleType: "stonePillars" } } }, [["E", "P"]]);
    enter(id, [0, 1]);
    return id;
  };

  it("lets moonlight settle on an unsolved riddle, for 10 MP, once", () => {
    const id = puzzleHall();

    expect(useItem(NIGHTS_LIGHT, itemContext(id, [0, 1]))).toEqual({ message: "Moonlight settles on the glyphs: one answer fades." });
    expect(mp()).toBe(50);
    expect(useItem(NIGHTS_LIGHT, itemContext(id, [0, 1]))).toEqual({ message: "The moonlight already rests here." });
    expect(mp()).toBe(50);
  });

  it("has no glyphs to read outside a puzzle room, or once the riddle is solved", () => {
    expect(useItem(NIGHTS_LIGHT, itemContext(hall(), [0, 0]))).toEqual({ message: "No glyphs here to read." });

    const id = puzzleHall();
    answerRiddle(dungeons.getRoom(id, [0, 1])!, contextAt(id, [0, 1]), 2); // a pillar
    expect(useItem(NIGHTS_LIGHT, itemContext(id, [0, 1])).message).toBe("No glyphs here to read.");
    expect(mp()).toBe(60);
  });
});

describe("X's Invisibility", () => {
  /** A free fight at [0,1] the hero has walked into: its doors are sealed. */
  const sealedFight = (content: Record<string, unknown> = {}) => {
    const id = makeTemple(
      { E: { type: "entrance" }, M: { type: "monster", content: { lockOnEnter: true, ...content } }, F: { type: "empty" } },
      [["E", "M", "F"]]
    );
    enter(id, [0, 0]);
    temples.moveToPosition(id, [0, 1], "east");
    return id;
  };

  it("slips out of a free fight: the doors open, the beast stays unbeaten", () => {
    const id = sealedFight();

    expect(useItem(INVISIBILITY, itemContext(id, [0, 1]))).toEqual({ message: "You slip away unseen. The doors open." });
    expect(mp()).toBe(45);
    expect(dungeons.getRoom(id, [0, 1])!.locked).toMatchObject({ east: false, west: false });
    expect(temples.isRoomCleared(id, "1F", [0, 1])).toBe(false);
    expect(temples.moveToPosition(id, [0, 2], "east")).toBe(true);
  });

  it("seals the room again when the hero walks back in", () => {
    const id = sealedFight();
    useItem(INVISIBILITY, itemContext(id, [0, 1]));
    temples.moveToPosition(id, [0, 2], "east");

    temples.moveToPosition(id, [0, 1], "west");

    expect(dungeons.getRoom(id, [0, 1])!.locked).toMatchObject({ east: true, west: true });
  });

  it("will not slip past a quest beast", () => {
    const id = hall({ M: { type: "monster", content: { lockOnEnter: true, questId: "q1" } } }, [["E", "M"]]);
    enter(id, [0, 1]);

    expect(useItem(INVISIBILITY, itemContext(id, [0, 1]))).toEqual({ message: "This beast holds a quest. It sees you.", sound: "error" });
    expect(mp()).toBe(60);
  });

  it("finds nothing to slip past in a plain room, a won fight or a seal already open", () => {
    expect(useItem(INVISIBILITY, itemContext(hall(), [0, 0]))).toEqual({ message: "Nothing here to slip past." });

    const won = sealedFight();
    temples.markRoomCleared(won, "1F", [0, 1]);
    expect(useItem(INVISIBILITY, itemContext(won, [0, 1])).message).toBe("Nothing here to slip past.");

    const slipped = sealedFight();
    useItem(INVISIBILITY, itemContext(slipped, [0, 1]));
    expect(useItem(INVISIBILITY, itemContext(slipped, [0, 1])).message).toBe("Nothing here to slip past.");
    expect(mp()).toBe(45); // the one slip only
  });

  it("is refused for lack of MP, and the seal holds", () => {
    addHero({ mp: { now: 14, max: 80 } });
    const id = sealedFight();

    expect(useItem(INVISIBILITY, itemContext(id, [0, 1]))).toEqual({ message: "Not enough MP", sound: "error" });
    expect(dungeons.getRoom(id, [0, 1])!.locked!.west).toBe(true);
  });
});

describe("items that belong elsewhere", () => {
  it.each(["Fire Wand", "Sol's Flare", "Tesla's Bolt", "Thor's Hammer", "Silver Arrow", "Chronos' Clock", "Gale's Wind"])(
    "%s is for fights",
    (name) => {
      const id = hall();

      const outcome = useItem(stored(name, "wand", "50MP | Does battle things."), itemContext(id, [0, 0]));

      expect(outcome).toEqual({ message: `${name} is for fights.` });
      expect(mp()).toBe(60);
    }
  );

  it("shrugs at an item it has never heard of", () => {
    const id = hall();
    expect(useItem(stored("Rubber Duck", "duck"), itemContext(id, [0, 0])).message).toBe("Rubber Duck: nothing happens here.");
  });
});
