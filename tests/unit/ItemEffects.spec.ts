import { createPinia, setActivePinia } from "pinia";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import {
  ALWAYS_UNLOCKED,
  hasNoEncounters,
  isItemUnlocked,
  lanternOverdue,
  unlockHintOf,
  unlockableItemNames,
  unlocksFromChest,
} from "@/lib/services/quests/ItemEffects";
import { ITEM_RULES } from "@/lib/services/items/ItemRules";
import { freeTemplePegasus } from "@/lib/services/temples/TemplePegasus";
import { useUserStore } from "@/lib/store/stores/user";

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

// The quest engine reads IndexedDB; here the board is whatever the spec says it is.
const mockBoard = jest.fn();
jest.mock("@/lib/engine/quests/QuestEngine", () => ({
  getQuestEngine: () => ({ getQuestBoardForUser: (...args: unknown[]) => mockBoard(...args) }),
}));

const HERO = "hero-1";
// Calendar facts: 2026-10-08 is a Thursday.
const NOW = new Date("2026-10-08T12:00:00");
const at = (iso: string) => new Date(iso);

const quest = (id: string, overrides: Partial<Achievement> = {}): Achievement =>
  ({
    id,
    achievementName: `Quest ${id}`,
    type: "assigned",
    assignee: [HERO],
    basicSchedule: "daily",
    customFrequency: 1,
    customPeriodType: "day",
    customPeriodNumber: 1,
    repeatOnDays: [],
    showDailyUntilComplete: false,
    startsOn: "2026-10-01T09:00:00",
    endsOn: "",
    dueByTime: "17:00",
    ...overrides,
  }) as unknown as Achievement;

const boardItem = (q: Achievement, status: QuestBoardItem["status"] = "open", overdue = false): QuestBoardItem => ({
  quest: q,
  status,
  progress: status === "notDue" ? null : { done: status === "done" ? 1 : 0, allowance: 1, isOpen: status === "open" },
  pending: false,
  overdue,
});

const addHero = (extra: Record<string, unknown> = {}, mp = 400) => {
  useUserStore().users[HERO] = {
    id: HERO,
    name: { nick: "Hero" },
    stats: { level: 1, hp: { now: 50, max: 50 }, mp: { now: mp, max: 500 }, gp: { wallet: 0 } },
    ...extra,
  };
};
const hero = () => useUserStore().users[HERO];
const mp = (): number => hero().stats.mp.now;

beforeEach(() => {
  setActivePinia(createPinia());
  mockBoard.mockReset();
  mockBoard.mockResolvedValue([]);
});

describe("lanternOverdue", () => {
  it("lists the overdue quest titles for free and writes nothing", async () => {
    addHero();
    mockBoard.mockResolvedValue([
      boardItem(quest("q1", { achievementName: "Dishes" }), "open", true),
      boardItem(quest("q2", { achievementName: "Homework" }), "open", false),
    ]);
    const lit = await lanternOverdue(HERO, NOW);
    expect(lit).toMatchObject({ ok: true, line: "1 overdue: Dishes", sound: "useItem" });
    expect(lit.quests.map((item) => item.quest.id)).toEqual(["q1"]);
    expect(mp()).toBe(400);
    expect(hero().questEffects).toBeUndefined();
    // The board is asked with the hero's own effects (none yet), so a quest given extra time is not lit
    expect(mockBoard).toHaveBeenCalledWith(HERO, NOW, undefined, {});
  });

  it("names every overdue quest, in board order", async () => {
    addHero({ questEffects: { snoozedOn: { q9: "2026-10-08" } } });
    mockBoard.mockResolvedValue([
      boardItem(quest("q1", { achievementName: "Dishes" }), "open", true),
      boardItem(quest("q3", { achievementName: "Trash" }), "open", true),
    ]);
    expect((await lanternOverdue(HERO, NOW)).line).toBe("2 overdue: Dishes, Trash");
    expect(mockBoard).toHaveBeenCalledWith(HERO, NOW, undefined, { snoozedOn: { q9: "2026-10-08" } });
  });

  it("says so when nothing is overdue", async () => {
    addHero();
    mockBoard.mockResolvedValue([]);
    expect(await lanternOverdue(HERO, NOW)).toEqual({
      ok: true,
      line: "The lantern finds nothing overdue. Well done.",
      sound: "useItem",
      quests: [],
    });
    mockBoard.mockResolvedValue([boardItem(quest("q2"))]);
    expect((await lanternOverdue(HERO, NOW)).line).toBe("The lantern finds nothing overdue. Well done.");
  });
});

describe("hasNoEncounters", () => {
  it("reads a saved no-encounters stamp, and nothing else", () => {
    const effects = { questEffects: { noEncountersUntil: at("2026-10-09T12:00:00").toISOString() } };
    expect(hasNoEncounters(effects, at("2026-10-09T11:59:00"))).toBe(true);
    expect(hasNoEncounters(effects, at("2026-10-09T12:01:00"))).toBe(false);
    expect(hasNoEncounters(undefined, NOW)).toBe(false);
    expect(hasNoEncounters({ questEffects: { noEncountersUntil: "garbage" } }, NOW)).toBe(false);
  });
});

describe("locks", () => {
  it("treats a profile without an unlockedItems list as holding everything", () => {
    expect(isItemUnlocked({}, "Ice Wand")).toBe(true);
    expect(isItemUnlocked(undefined, "Ice Wand")).toBe(true);
  });

  it("locks everything but the pages, Bottles, the Lantern and the Bombs on a new profile", () => {
    const fresh = { unlockedItems: [] as string[] };
    for (const name of ALWAYS_UNLOCKED) expect(isItemUnlocked(fresh, name)).toBe(true);
    expect(isItemUnlocked({ unlockedItems: [] }, "Bombs")).toBe(true);
    expect(isItemUnlocked(fresh, "Ice Wand")).toBe(false);
    expect(isItemUnlocked(fresh, "Wind Whistle")).toBe(false);
    expect(isItemUnlocked({ unlockedItems: ["Ice Wand"] }, "Ice Wand")).toBe(true);
  });

  it("counts a freed Pegasus as the unlock of its item: Aura gifts the Pegasus Boots", () => {
    const aura = Array(9).fill(false);
    aura[3] = true;
    expect(isItemUnlocked({ unlockedItems: [], stats: { pegasi: aura } }, "Pegasus Boots")).toBe(true);
    const ventus = Array(9).fill(false);
    ventus[0] = true;
    expect(isItemUnlocked({ unlockedItems: [], stats: { pegasi: ventus } }, "Pegasus Boots")).toBe(false);
  });

  it("counts each freed Pegasus as the unlock of the item it gifts", () => {
    const freed = (index: number) => ({
      unlockedItems: [] as string[],
      stats: { pegasi: Array.from({ length: 9 }, (_, slot) => slot === index) },
    });
    expect(isItemUnlocked(freed(0), "Gale's Wind")).toBe(true); // Ventus
    expect(isItemUnlocked(freed(1), "Thor's Hammer")).toBe(true); // Ignis
    expect(isItemUnlocked(freed(2), "Sol's Flare")).toBe(true); // Sol
    expect(isItemUnlocked(freed(3), "Pegasus Boots")).toBe(true); // Aura
    expect(isItemUnlocked(freed(8), "Chronos' Clock")).toBe(true); // Umbra
    expect(isItemUnlocked(freed(1), "Sol's Flare")).toBe(false);
    expect(isItemUnlocked(freed(8), "Thor's Hammer")).toBe(false);
  });

  it("the Wind Whistle is locked until the Wind Temple's chest unlocks it: no freed Pegasus does", () => {
    const user = (pegasus: number[], unlockedItems: string[] = []) => ({
      unlockedItems,
      stats: { pegasi: Array.from({ length: 9 }, (_, index) => pegasus.includes(index)) },
    });
    expect(isItemUnlocked(user([]), "Wind Whistle")).toBe(false);
    expect(isItemUnlocked(user([0]), "Wind Whistle")).toBe(false); // Ventus alone
    expect(isItemUnlocked(user([3]), "Wind Whistle")).toBe(false); // Aura alone
    expect(isItemUnlocked(user([0, 1, 2, 3, 4, 5, 6, 7, 8]), "Wind Whistle")).toBe(false); // all nine
    expect(isItemUnlocked(user([], unlocksFromChest("Pegasus Whistle")), "Wind Whistle")).toBe(true);
  });

  it("maps a temple chest item to the board item it stands for", () => {
    expect(unlocksFromChest("Pegasus Whistle")).toEqual(["Pegasus Whistle", "Wind Whistle"]);
    expect(unlocksFromChest("Frost Wand")).toEqual(["Frost Wand", "Ice Wand"]);
    expect(unlocksFromChest("Void Dagger")).toEqual(["Void Dagger", "X's Invisibility"]);
    expect(unlocksFromChest("Trident of Tides")).toEqual(["Trident of Tides", "Hook Shot"]);
    expect(unlocksFromChest("Flame Shield")).toEqual(["Flame Shield", "Fire Wand"]);
    expect(unlocksFromChest("Dawnbreaker Bow")).toEqual(["Dawnbreaker Bow", "Silver Arrow"]);
    expect(unlocksFromChest("Moon Shard")).toEqual(["Moon Shard"]);
  });

  it("hints how an item is earned", () => {
    expect(unlockHintOf("Wind Whistle")).toBe("Locked: Wind Whistle waits in a chest in the Wind Temple.");
    expect(unlockHintOf("Pegasus Boots")).toMatch(/free Aura/);
    expect(unlockHintOf("Ice Wand")).toBe("Locked: Ice Wand waits in a chest in the Ice Temple.");
    expect(unlockHintOf("Bombs")).toMatch(/temple chest or a shop/);
  });

  it("hints each relic's temple and each Pegasus gift", () => {
    expect(unlockHintOf("Silver Arrow")).toBe("Locked: Silver Arrow waits in a chest in the Light Temple.");
    expect(unlockHintOf("Hook Shot")).toBe("Locked: Hook Shot waits in a chest in the Water Temple.");
    expect(unlockHintOf("Fire Wand")).toBe("Locked: Fire Wand waits in a chest in the Fire Temple.");
    expect(unlockHintOf("X's Invisibility")).toBe("Locked: X's Invisibility waits in a chest in the Shadow Temple.");
    expect(unlockHintOf("Chronos' Clock")).toBe("Locked: free Umbra the Pegasus to earn Chronos' Clock.");
    expect(unlockHintOf("Gale's Wind")).toBe("Locked: free Ventus the Pegasus to earn Gale's Wind.");
    expect(unlockHintOf("Thor's Hammer")).toBe("Locked: free Ignis the Pegasus to earn Thor's Hammer.");
    expect(unlockHintOf("Sol's Flare")).toBe("Locked: free Sol the Pegasus to earn Sol's Flare.");
  });

  it("lists the tools the Game Master can unlock: every rule but the ones a hero always has", () => {
    const names = unlockableItemNames();
    expect(names).toEqual(Object.keys(ITEM_RULES).filter((name) => !ALWAYS_UNLOCKED.includes(name)));
    expect(names).toContain("Ice Wand");
    expect(names).toContain("Chronos' Clock");
    for (const name of ["Lantern", "Bottles", "Bombs"]) expect(names).not.toContain(name);
  });

  it("the store unlocks on a new profile and leaves a legacy profile whole", () => {
    const store = useUserStore();
    addHero({ unlockedItems: [] });
    expect(store.unlockItem(HERO, "Ice Wand")).toBe(true);
    expect(store.unlockItem(HERO, "Ice Wand")).toBe(false);
    expect(hero().unlockedItems).toEqual(["Ice Wand"]);

    addHero(); // no list: everything unlocked already
    expect(store.unlockItem(HERO, "Ice Wand")).toBe(false);
    expect(hero().unlockedItems).toBeUndefined();
    expect(isItemUnlocked(hero(), "Gale's Wind")).toBe(true);

    expect(store.unlockItem("ghost", "Ice Wand")).toBe(false);
  });

  it("an item never frees a Pegasus: the Wind Whistle and Pegasus Boots unlock as items and stats.pegasi stays put", () => {
    const store = useUserStore();
    addHero({ unlockedItems: [] });
    for (const chestItem of ["Pegasus Whistle", "Pegasus Boots"]) {
      for (const name of unlocksFromChest(chestItem)) store.unlockItem(HERO, name);
    }
    expect(hero().unlockedItems).toEqual(["Pegasus Whistle", "Wind Whistle", "Pegasus Boots"]);
    expect(isItemUnlocked(hero(), "Wind Whistle")).toBe(true);
    expect(isItemUnlocked(hero(), "Pegasus Boots")).toBe(true);
    expect(hero().stats.pegasi).toBeUndefined();
  });

  it("freeing a Pegasus is the Pegasus chest's job: the Wind Temple's chest frees Aura, not Ventus", () => {
    addHero({ unlockedItems: [] });
    const { pegasus } = freeTemplePegasus("wind-temple", HERO);
    expect(pegasus?.name).toBe("Aura");
    expect(hero().stats.pegasi).toEqual([false, false, false, true, false, false, false, false, false]);
  });

  it("unlockPegasus frees one Pegasus in a list of nine flags", () => {
    const store = useUserStore();
    addHero();
    store.unlockPegasus(HERO, 3);
    expect(hero().stats.pegasi).toEqual([false, false, false, true, false, false, false, false, false]);
    store.unlockPegasus(HERO, 8);
    expect(hero().stats.pegasi.filter(Boolean)).toHaveLength(2);
    expect(hero().stats.pegasi[8]).toBe(true);
  });

  it("unlockPegasus turns the index-keyed object that storage hands back into an array", () => {
    const store = useUserStore();
    addHero({ stats: { level: 1, pegasi: { 0: false, 3: true, 4: false } } });
    store.unlockPegasus(HERO, 4);
    const pegasi = hero().stats.pegasi;
    expect(Array.isArray(pegasi)).toBe(true);
    expect(pegasi).toEqual([false, false, false, true, true, false, false, false, false]);
    expect(pegasi.some(Boolean)).toBe(true);
  });

  it("unlockPegasus rebuilds a list that is short, missing or not a list, and ignores a slot that is not one of the nine", () => {
    const store = useUserStore();
    for (const bad of [undefined, null, "yes", [], [true]]) {
      addHero({ stats: { level: 1, pegasi: bad } });
      store.unlockPegasus(HERO, 1);
      expect(hero().stats.pegasi).toHaveLength(9);
      expect(hero().stats.pegasi[1]).toBe(true);
    }
    addHero({ stats: { level: 1, pegasi: [true] } });
    store.unlockPegasus(HERO, 9);
    store.unlockPegasus(HERO, -1);
    store.unlockPegasus(HERO, 1.5);
    expect(hero().stats.pegasi).toEqual([true, false, false, false, false, false, false, false, false]);
    store.unlockPegasus("ghost", 2); // nobody there: nothing happens
    expect(useUserStore().users.ghost).toBeUndefined();
  });

  it("unlockPegasus keeps the signed-in copy in step", () => {
    const store = useUserStore();
    addHero();
    store.currentUser.id = HERO;
    store.unlockPegasus(HERO, 5);
    expect(store.currentUser.stats.pegasi[5]).toBe(true);
    expect(Array.isArray(store.currentUser.stats.pegasi)).toBe(true);
  });

  it("the store keeps and clears recharges", () => {
    const store = useUserStore();
    addHero();
    store.setItemCooldown(HERO, "Ice Wand", "2026-10-09T00:00:00.000Z");
    expect(hero().itemCooldowns).toEqual({ "Ice Wand": "2026-10-09T00:00:00.000Z" });
    store.setItemCooldown(HERO, "Ice Wand", null);
    expect(hero().itemCooldowns).toEqual({});
  });
});
