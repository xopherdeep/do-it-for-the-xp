import { createPinia, setActivePinia } from "pinia";
import type { EquipmentItem } from "@/app/Console/MyPortal/UserHud/components/equipment/EquipmentItems";
import { readExits, resetVisitMemory } from "@/lib/services/temples/RoomInteractions";
import { handLabel, mpCostOf, shortItemName, useItem, type ItemUseContext } from "@/lib/services/temples/ItemUse";
import { useUserStore } from "@/lib/store/stores/user";
import { HERO, addHero, contextAt, dungeons, enter, hp, makeTemple, mp, temples } from "./templeFixtures";

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
jest.mock("@/lib/databases/TempleProgressDb", () => ({
  getTempleProgressDb: () => ({
    getProgress: () => Promise.resolve(null),
    saveProgress: (progress: unknown) => Promise.resolve(progress),
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

/** The live catalog: the same items, with a click on the navigation ones. */
const clicks: Record<string, jest.Mock> = {};
const catalog = (): EquipmentItem[] =>
  [QUESTS, SPELLS, GOODS, WALLET, PORTAL, LANTERN, BOMBS, HOOK, BOTTLES].map((item) => {
    const live: EquipmentItem = { ...item };
    if (["My Quests", "Book Of Spells", "Goods", "Wallet", "Portal Home"].includes(item.name)) {
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
  it("heal a quarter of the maximum HP, once per temple visit", () => {
    const id = hall();

    const first = useItem(BOTTLES, itemContext(id, [0, 0]));
    expect(first).toMatchObject({ message: "You drink from the bottles: +13 HP", sound: "restoreHP" });
    expect(hp()).toBe(43);

    const second = useItem(BOTTLES, itemContext(id, [0, 0]));
    expect(second).toEqual({ message: "Your bottles are empty." });
    expect(hp()).toBe(43);
  });

  it("are not wasted on a hero at full HP", () => {
    addHero({ hp: { now: 50, max: 50 } });
    const id = hall();

    expect(useItem(BOTTLES, itemContext(id, [0, 0])).message).toMatch(/HP is full/);
    addHero({ hp: { now: 10, max: 50 } });
    expect(useItem(BOTTLES, itemContext(id, [0, 0])).sound).toBe("restoreHP");
  });

  it("are a fresh set in another temple", () => {
    useItem(BOTTLES, itemContext(hall(), [0, 0]));
    addHero({ hp: { now: 10, max: 50 } });

    expect(useItem(BOTTLES, itemContext(hall(), [0, 0])).sound).toBe("restoreHP");
  });
});

describe("Bombs", () => {
  const lockedHall = () => hall({ H: { type: "empty", locked: { east: true } } }, [["E", "H"]]);

  it("blow open a locked side of the room the hero stands in", () => {
    const id = makeTemple({ E: { type: "entrance" }, H: { type: "empty", locked: { east: true } }, F: { type: "empty" } }, [["E", "H", "F"]]);
    enter(id, [0, 1]);

    const outcome = useItem(BOMBS, itemContext(id, [0, 1]));

    expect(outcome).toMatchObject({ message: "Boom! The east door blows open.", sound: "damage", shake: true });
    expect(dungeons.getRoom(id, [0, 1])!.locked!.east).toBe(false);
    expect(mp()).toBe(60); // a Bomb costs no MP
  });

  it("take the first locked side, going clockwise from north", () => {
    const id = makeTemple({ E: { type: "entrance" }, H: { type: "empty", locked: { west: true, south: true } } }, [["E", "H"]]);
    enter(id, [0, 1]);

    useItem(BOMBS, itemContext(id, [0, 1]));

    expect(dungeons.getRoom(id, [0, 1])!.locked).toMatchObject({ south: false, west: true });
  });

  it("find nothing to blow up in a room without a locked side, and cost nothing", () => {
    const id = hall();

    const outcome = useItem(BOMBS, itemContext(id, [0, 0]));

    expect(outcome).toEqual({ message: "Nothing to blow up here." });
    expect(mp()).toBe(60);
  });

  it("need no MP: a hero with none left can still blow a door", () => {
    addHero({ mp: { now: 0, max: 80 } });
    const id = lockedHall();
    enter(id, [0, 1]);

    const outcome = useItem(BOMBS, itemContext(id, [0, 1]));

    expect(outcome).toMatchObject({ message: "Boom! The east door blows open." });
    expect(dungeons.getRoom(id, [0, 1])!.locked!.east).toBe(false);
    expect(mp()).toBe(0);
  });

  it("cannot break the seal of a fight that is still on", () => {
    const id = makeTemple({ E: { type: "entrance" }, M: { type: "monster", content: { lockOnEnter: true } } }, [["E", "M"]]);
    enter(id, [0, 0]);
    temples.moveToPosition(id, [0, 1], "east"); // the doors seal behind the hero

    const outcome = useItem(BOMBS, itemContext(id, [0, 1]));

    expect(outcome.sound).toBe("error");
    expect(dungeons.getRoom(id, [0, 1])!.locked!.west).toBe(true);
    expect(mp()).toBe(60);
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

  it("will not swing through a locked door", () => {
    const id = makeTemple(
      { E: { type: "entrance", locked: { east: true } }, P: { type: "pit" }, G: { type: "empty" } },
      [["E", "P", "G"]]
    );
    enter(id, [0, 0]);

    expect(useItem(HOOK, itemContext(id, [0, 0])).message).toBe("Nothing to latch onto.");
  });

  it("is refused for lack of MP", () => {
    addHero({ mp: { now: 4, max: 80 } });
    const id = makeTemple({ E: { type: "entrance" }, P: { type: "pit" }, G: { type: "empty" } }, [["E", "P", "G"]]);
    enter(id, [0, 0]);

    expect(useItem(HOOK, itemContext(id, [0, 0]))).toEqual({ message: "Not enough MP", sound: "error" });
    expect(temples.getTempleState(id)!.currentPosition).toEqual([0, 0]);
  });
});

describe("items that belong elsewhere", () => {
  it.each(["Fire Wand", "Ice Wand", "Sol's Flare", "Tesla's Bolt", "Gaia's Quake", "Thor's Hammer", "Silver Arrow"])(
    "%s wants a fight",
    (name) => {
      const id = hall();

      const outcome = useItem(stored(name, "wand", "50MP | Does battle things."), itemContext(id, [0, 0]));

      expect(outcome).toEqual({ message: `${name} wants a fight: use it in battle.` });
      expect(mp()).toBe(60);
    }
  );

  it.each(["Pegasus Boots", "Wind Whistle", "Chronos' Clock", "Night's Light", "Gale's Wind", "X's Invisibility"])(
    "%s is coming soon, with its description",
    (name) => {
      const id = hall();

      const outcome = useItem(stored(name, "star", "100MP | A very long description."), itemContext(id, [0, 0]));

      expect(outcome.message).toBe("A very long description. (coming soon)");
      expect(mp()).toBe(60);
    }
  );

  it("shrugs at an item it has never heard of", () => {
    const id = hall();
    expect(useItem(stored("Rubber Duck", "duck"), itemContext(id, [0, 0])).message).toBe("Rubber Duck: nothing happens here.");
  });
});
