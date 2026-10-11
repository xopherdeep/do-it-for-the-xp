import { createPinia, setActivePinia } from "pinia";
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import {
  effectiveDeadline,
  getEffectiveWindow,
  getQuestProgressFor,
  isQuestOverdue,
  isSchedulePaused,
  type HeroQuestEffects,
} from "@/lib/engine/quests/QuestSchedule";
import {
  ALWAYS_UNLOCKED,
  applyBoardEffect,
  boardEffectOf,
  cooldownLabel,
  hasNoEncounters,
  isItemUnlocked,
  unlockHintOf,
  unlocksFromChest,
} from "@/lib/services/quests/ItemEffects";
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

const entry = (completedAt: string, questId = "q1", status: QuestLogEntry["status"] = "approved"): QuestLogEntry => ({
  id: `entry-${completedAt}`,
  questId,
  questName: "Quest",
  userId: HERO,
  completedAt,
  dayKey: completedAt.slice(0, 10),
  status,
  source: "claim",
  rewards: { xp: 1, gp: 1, ap: 1 },
  rewardsApplied: true,
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

describe("boardEffectOf", () => {
  it("knows the board items, their MP and their recharge", () => {
    expect(boardEffectOf("Ice Wand")).toMatchObject({ kind: "pick-quest", picks: "open", cost: 50, cooldownMs: 0 });
    expect(boardEffectOf("Silver Arrow")).toMatchObject({ kind: "pick-quest", picks: "open", cost: 25 });
    expect(boardEffectOf("Hook Shot")).toMatchObject({ kind: "pick-quest", picks: "future", cost: 15 });
    expect(boardEffectOf("Chronos' Clock")).toMatchObject({ kind: "instant", cost: 100, cooldownMs: 3_600_000 });
    expect(boardEffectOf("Lantern")).toMatchObject({ kind: "instant", cost: 5 });
    expect(boardEffectOf("X's Invisibility")).toMatchObject({ kind: "instant", cost: 300, cooldownMs: 2 * 86_400_000 });
  });

  it("provides board effects for all equipment items without temple restriction", () => {
    for (const name of ["Bombs", "Thor's Hammer", "Fire Wand"]) {
      expect(boardEffectOf(name).kind).toBe("pick-quest");
    }
    for (const name of ["Tesla's Bolt", "Gaia's Quake", "Night's Light", "Gale's Wind", "Sol's Flare", "Bottles"]) {
      expect(boardEffectOf(name).kind).toBe("instant");
    }
    for (const name of ["Wallet", "Pegasus Boots", undefined, "Nonsense"]) {
      expect(boardEffectOf(name).kind).toBe("none");
    }
    expect(boardEffectOf("Ice Wand").describe).toMatch(/24 hours/);
  });

  it("labels a recharge in minutes, hours or days", () => {
    expect(cooldownLabel(42 * 60_000)).toBe("42 min left");
    expect(cooldownLabel(10)).toBe("1 min left");
    expect(cooldownLabel(2.5 * 3_600_000)).toBe("3 h left");
    expect(cooldownLabel(1.2 * 86_400_000)).toBe("2 d left");
  });
});

describe("applyBoardEffect refusals", () => {
  it("activates generic items and charges MP properly", async () => {
    addHero();
    expect(await applyBoardEffect({ name: "Wallet" }, { userId: HERO, now: NOW })).toMatchObject({ ok: true, sound: "useItem" });
    const bombPick = await applyBoardEffect({ name: "Bombs" }, { userId: HERO, now: NOW });
    expect(bombPick.ok).toBe(false);
    expect(bombPick.line).toMatch(/Pick a quest first/);
    expect(mp()).toBe(400);
  });

  it("refuses when the hero is short on MP", async () => {
    addHero({}, 40);
    const result = await applyBoardEffect({ name: "Ice Wand" }, { userId: HERO, questId: "q1", now: NOW });
    expect(result).toMatchObject({ ok: false, line: "Not enough MP (50 needed)" });
    expect(mp()).toBe(40);
    expect(hero().questEffects).toBeUndefined();
  });

  it("refuses while the item recharges, saying how long is left", async () => {
    const readyAt = new Date(NOW.getTime() + 42 * 60_000).toISOString();
    addHero({ itemCooldowns: { "X's Invisibility": readyAt } });
    const result = await applyBoardEffect({ name: "X's Invisibility" }, { userId: HERO, now: NOW });
    expect(result).toMatchObject({ ok: false, line: "Recharging: 42 min left" });
    expect(mp()).toBe(400);
  });

  it("needs a quest for a pick-quest item, and one that is on the board", async () => {
    addHero();
    expect((await applyBoardEffect({ name: "Silver Arrow" }, { userId: HERO, now: NOW })).line).toBe("Pick a quest first.");
    mockBoard.mockResolvedValue([boardItem(quest("q1"))]);
    expect((await applyBoardEffect({ name: "Silver Arrow" }, { userId: HERO, questId: "zzz", now: NOW })).ok).toBe(false);
    expect(mp()).toBe(400);
  });

  it("refuses for a hero that does not exist", async () => {
    expect((await applyBoardEffect({ name: "Lantern" }, { userId: "ghost", now: NOW })).ok).toBe(false);
  });
});

describe("Ice Wand", () => {
  it("pushes one open quest's deadline back 24 hours and charges 50 MP", async () => {
    addHero();
    const q = quest("q1", { dueByTime: "17:00" });
    mockBoard.mockResolvedValue([boardItem(q)]);
    const result = await applyBoardEffect({ name: "Ice Wand" }, { userId: HERO, questId: "q1", now: NOW });
    expect(result.ok).toBe(true);
    expect(result.line).toMatch(/Quest q1: now due Fri 5:00PM/);
    expect(mp()).toBe(350);
    const effects: HeroQuestEffects = hero().questEffects;
    expect(new Date(effects.extendedUntil!.q1)).toEqual(at("2026-10-09T17:00:00"));

    // The board reads it back: not late this evening, late tomorrow evening
    expect(effectiveDeadline(q, effects, at("2026-10-08T18:00:00"))).toEqual(at("2026-10-09T17:00:00"));
    expect(isQuestOverdue(q, undefined, at("2026-10-08T18:00:00"))).toBe(true);
    expect(isQuestOverdue(q, effects, at("2026-10-08T18:00:00"))).toBe(false);
    expect(isQuestOverdue(q, effects, at("2026-10-09T18:00:00"))).toBe(true);
  });

  it("gives a quest with no due time until the end of tomorrow, and will not touch a quest that is not open", async () => {
    addHero();
    mockBoard.mockResolvedValue([boardItem(quest("q1", { dueByTime: "" })), boardItem(quest("q2"), "done")]);
    const result = await applyBoardEffect({ name: "Ice Wand" }, { userId: HERO, questId: "q1", now: NOW });
    expect(result.ok).toBe(true);
    expect(new Date(hero().questEffects.extendedUntil.q1).getTime()).toBe(at("2026-10-09T23:59:59.999").getTime());

    const done = await applyBoardEffect({ name: "Ice Wand" }, { userId: HERO, questId: "q2", now: NOW });
    expect(done).toMatchObject({ ok: false, line: "Quest q2 is not open today." });
    expect(mp()).toBe(350);
  });
});

describe("Silver Arrow", () => {
  it("snoozes one open quest to tomorrow: gone from today's board, back tomorrow", async () => {
    addHero();
    const q = quest("q1");
    mockBoard.mockResolvedValue([boardItem(q)]);
    const result = await applyBoardEffect({ name: "Silver Arrow" }, { userId: HERO, questId: "q1", now: NOW });
    expect(result).toMatchObject({ ok: true, line: "Quest q1: snoozed to tomorrow." });
    expect(mp()).toBe(375);
    const effects: HeroQuestEffects = hero().questEffects;
    expect(effects.snoozedOn).toEqual({ q1: "2026-10-08" });
    expect(getEffectiveWindow(q, effects, NOW)).toBeNull();
    expect(getQuestProgressFor(q, [], HERO, NOW, effects)).toBeNull();
    expect(getQuestProgressFor(q, [], HERO, at("2026-10-09T09:00:00"), effects)).toEqual({ done: 0, allowance: 1, isOpen: true });
  });
});

describe("Hook Shot", () => {
  it("pulls a quest that is not due today onto today's board for one completion", async () => {
    addHero();
    const monday = quest("q1", { basicSchedule: "weekly", repeatOnDays: ["mon"] });
    expect(getQuestProgressFor(monday, [], HERO, NOW)).toBeNull(); // Thursday
    mockBoard.mockResolvedValue([boardItem(monday, "notDue")]);
    const result = await applyBoardEffect({ name: "Hook Shot" }, { userId: HERO, questId: "q1", now: NOW });
    expect(result).toMatchObject({ ok: true, line: "Quest q1: pulled into today." });
    expect(mp()).toBe(385);
    const effects: HeroQuestEffects = hero().questEffects;
    expect(effects.pulledInOn).toEqual({ q1: "2026-10-08" });
    expect(getQuestProgressFor(monday, [], HERO, NOW, effects)).toEqual({ done: 0, allowance: 1, isOpen: true });
    // Done today: used up today, and tomorrow it is back to its own schedule
    expect(getQuestProgressFor(monday, [entry("2026-10-08T14:00:00")], HERO, NOW, effects)?.isOpen).toBe(false);
    expect(getQuestProgressFor(monday, [], HERO, at("2026-10-09T12:00:00"), effects)).toBeNull();
  });

  it("will not pull a quest that is already on today's board", async () => {
    addHero();
    mockBoard.mockResolvedValue([boardItem(quest("q1"))]);
    const result = await applyBoardEffect({ name: "Hook Shot" }, { userId: HERO, questId: "q1", now: NOW });
    expect(result).toMatchObject({ ok: false, line: "Quest q1 is already on today's board." });
    expect(mp()).toBe(400);
  });
});

describe("Chronos' Clock", () => {
  it("pauses every deadline for an hour, the paused time is added to the deadlines, and it recharges for that hour", async () => {
    addHero();
    const result = await applyBoardEffect({ name: "Chronos' Clock" }, { userId: HERO, now: NOW });
    expect(result).toMatchObject({ ok: true, line: "Time stands still until 1:00PM." });
    expect(mp()).toBe(300);
    const effects: HeroQuestEffects = hero().questEffects;
    expect(effects.pause).toEqual({ from: NOW.toISOString(), until: at("2026-10-08T13:00:00").toISOString() });
    expect(hero().itemCooldowns["Chronos' Clock"]).toBe(at("2026-10-08T13:00:00").toISOString());

    const q = quest("q1", { dueByTime: "12:30" });
    expect(isSchedulePaused(effects, at("2026-10-08T12:45:00"))).toBe(true);
    expect(isQuestOverdue(q, effects, at("2026-10-08T12:45:00"))).toBe(false); // paused
    expect(effectiveDeadline(q, effects, NOW)).toEqual(at("2026-10-08T13:30:00")); // 12:30 + the hour paused
    expect(isQuestOverdue(q, effects, at("2026-10-08T13:15:00"))).toBe(false);
    expect(isQuestOverdue(q, effects, at("2026-10-08T13:45:00"))).toBe(true);
    // A quest due before the pause began was late already; the pause only hides it while it runs
    const early = quest("q2", { dueByTime: "11:00" });
    expect(effectiveDeadline(early, effects, NOW)).toEqual(at("2026-10-08T11:00:00"));
    expect(isQuestOverdue(early, effects, at("2026-10-08T12:30:00"))).toBe(false);
    expect(isQuestOverdue(early, effects, at("2026-10-08T13:30:00"))).toBe(true);

    const again = await applyBoardEffect({ name: "Chronos' Clock" }, { userId: HERO, now: at("2026-10-08T12:18:00") });
    expect(again).toMatchObject({ ok: false, line: "Recharging: 42 min left" });
  });
});

describe("Lantern", () => {
  it("lists the overdue quests for 5 MP, and says so when there are none", async () => {
    addHero();
    mockBoard.mockResolvedValue([
      boardItem(quest("q1", { achievementName: "Dishes" }), "open", true),
      boardItem(quest("q2", { achievementName: "Homework" }), "open", false),
      boardItem(quest("q3", { achievementName: "Trash" }), "open", true),
    ]);
    const lit = await applyBoardEffect({ name: "Lantern" }, { userId: HERO, now: NOW });
    expect(lit).toMatchObject({ ok: true, line: "2 overdue: Dishes, Trash", sound: "useItem" });
    expect(lit.quests?.map((item) => item.quest.id)).toEqual(["q1", "q3"]);
    expect(mp()).toBe(395);
    // The board is asked with the hero's own effects, so a paused clock lights nothing up
    expect(mockBoard).toHaveBeenCalledWith(HERO, NOW, undefined, {});

    mockBoard.mockResolvedValue([boardItem(quest("q2"))]);
    expect((await applyBoardEffect({ name: "Lantern" }, { userId: HERO, now: NOW })).line).toMatch(/nothing overdue/);
  });
});

describe("X's Invisibility", () => {
  it("keeps the beasts away for 24 hours and recharges for two days", async () => {
    addHero();
    const result = await applyBoardEffect({ name: "X's Invisibility" }, { userId: HERO, now: NOW });
    expect(result).toMatchObject({ ok: true, line: "Unseen by beasts until Fri 12:00PM." });
    expect(mp()).toBe(100);
    expect(hasNoEncounters(hero(), at("2026-10-08T13:00:00"))).toBe(true);
    expect(hasNoEncounters(hero(), at("2026-10-09T11:59:00"))).toBe(true);
    expect(hasNoEncounters(hero(), at("2026-10-09T12:01:00"))).toBe(false);
    expect(hasNoEncounters(undefined, NOW)).toBe(false);
    expect(hasNoEncounters({ questEffects: { noEncountersUntil: "garbage" } }, NOW)).toBe(false);
    expect(hero().itemCooldowns["X's Invisibility"]).toBe(at("2026-10-10T12:00:00").toISOString());
  });
});

describe("locks", () => {
  it("treats a profile without an unlockedItems list as holding everything", () => {
    expect(isItemUnlocked({}, "Ice Wand")).toBe(true);
    expect(isItemUnlocked(undefined, "Ice Wand")).toBe(true);
  });

  it("locks everything but the pages, Bottles and the Lantern on a new profile", () => {
    const fresh = { unlockedItems: [] as string[] };
    for (const name of ALWAYS_UNLOCKED) expect(isItemUnlocked(fresh, name)).toBe(true);
    expect(isItemUnlocked(fresh, "Ice Wand")).toBe(false);
    expect(isItemUnlocked(fresh, "Wind Whistle")).toBe(false);
    expect(isItemUnlocked({ unlockedItems: ["Ice Wand"] }, "Ice Wand")).toBe(true);
  });

  it("counts a freed Pegasus as the unlock of its item", () => {
    const pegasi = Array(9).fill(false);
    pegasi[0] = true; // Ventus
    expect(isItemUnlocked({ unlockedItems: [], stats: { pegasi } }, "Wind Whistle")).toBe(true);
    expect(isItemUnlocked({ unlockedItems: [], stats: { pegasi } }, "Pegasus Boots")).toBe(false);
  });

  it("maps a temple chest item to the board item it stands for", () => {
    expect(unlocksFromChest("Pegasus Whistle")).toEqual(["Pegasus Whistle", "Wind Whistle"]);
    expect(unlocksFromChest("Frost Wand")).toEqual(["Frost Wand", "Ice Wand"]);
    expect(unlocksFromChest("Void Dagger")).toEqual(["Void Dagger"]);
  });

  it("hints how an item is earned", () => {
    expect(unlockHintOf("Wind Whistle")).toBe("Locked: free Ventus the Pegasus to earn Wind Whistle.");
    expect(unlockHintOf("Pegasus Boots")).toMatch(/free Aura/);
    expect(unlockHintOf("Ice Wand")).toBe("Locked: Ice Wand waits in a chest in the Ice Temple.");
    expect(unlockHintOf("Bombs")).toMatch(/temple chest or a shop/);
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
