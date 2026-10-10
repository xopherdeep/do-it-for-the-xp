import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";
import { useBattleOutcome, type BattleOutcomeDeps } from "@/app/Console/BattleField/composables/useBattleOutcome";
import type { Encounter } from "@/app/Console/BattleField/battle/encounterLoader";
import type { Enemy } from "@/lib/services/battle/BattleService";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The class's say on a win's pay (docs/Items-And-Classes-Contract.md, C), through useBattleOutcome's
 * celebrateVictory: the Thief's GP, the Monk's AP, the Mage's MP and the Paladin's HP. Rewards are paid the
 * moment the beast falls, so the store is checked right after the call; the celebration that follows runs on
 * timers the test never advances.
 */

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
jest.mock("@/lib/services/quests/QuestCompletionService", () => ({
  completeQuest: jest.fn().mockResolvedValue(undefined),
  recordBattleCompletion: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("@/lib/engine/core/dungeons/TempleSystem", () => ({
  TempleSystem: { getInstance: () => ({ markRoomCleared: jest.fn() }) },
}));
jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const HERO_ID = "hero-1";

const beast = (): Enemy => ({
  id: "b1",
  name: "Socktopus",
  type: "monster",
  isBoss: false,
  health: 0,
  maxHealth: 100,
  attack: 10,
  defense: 5,
  speed: 5,
});

const addHero = (jobClass: string) => {
  useUserStore().addUser({
    id: HERO_ID,
    name: { nick: "Max" },
    jobClass,
    stats: {
      level: 1,
      xp: { now: 0, next_level: 283 },
      hp: { now: 20, max: 100 },
      mp: { now: 10, max: 80 },
      gp: { wallet: 0, savings: 0, debt: 0, limit: 1000 },
      ap: { total: 0, history: [] },
    },
  });
};

const stats = () => (useUserStore().getUserById(HERO_ID) as any).stats;

/** celebrateVictory with every stage prop faked; `encounter` carries the quest (if any) and its rewards. */
const rig = (kind: "free" | "quest", encounter: Partial<Encounter> | null) => {
  const presentVictory = jest.fn().mockResolvedValue(undefined);
  const deps = {
    ctx: { kind, userId: HERO_ID, questId: "q1" },
    encounter: ref(encounter as Encounter | null),
    dialog: { clear: jest.fn(), enqueue: jest.fn(), enableAppendMode: jest.fn(), disableAppendMode: jest.fn(), isVictoryMessage: ref(false) },
    audio: { playSound: jest.fn(), playFanfare: jest.fn(), stopBgm: jest.fn() },
    background: { collapse: jest.fn().mockResolvedValue(undefined) },
    feedback: { victory: jest.fn() },
    enemyAnimationClass: ref(""),
    router: { replace: jest.fn() },
    presentVictory,
  } as unknown as BattleOutcomeDeps;
  return { outcome: useBattleOutcome(deps), presentVictory };
};

/** Rewards are paid before celebrateVictory's first await; a few microtasks are all the store needs. */
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

const questEncounter = (requiresApproval = false): Partial<Encounter> =>
  ({
    label: "Dishes",
    enemies: [beast()],
    rewards: { xp: 0, gp: 40, ap: 2 },
    quest: { id: "q1", achievementName: "Dishes", requiresApproval },
  } as unknown as Partial<Encounter>);

describe("useBattleOutcome: class passives on a win", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setActivePinia(createPinia());
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("a Warrior is paid the fight's plain rewards: AP only for a free fight", async () => {
    addHero("Warrior");
    const { outcome, presentVictory } = rig("free", { label: "Socktopus", enemies: [beast()] });
    void outcome.celebrateVictory([beast()], { choresDone: 2, elapsedMs: 1000 });
    await flush();

    expect(stats().ap.total).toBe(1);
    expect(stats().gp.wallet).toBe(0);
    expect(stats().mp.now).toBe(10);
    expect(presentVictory).not.toHaveBeenCalled(); // the celebration is still on its timers
  });

  it("a Monk gets +1 AP on every win, even a free fight's single point", async () => {
    addHero("Monk");
    const { outcome } = rig("free", { label: "Socktopus", enemies: [beast()] });
    void outcome.celebrateVictory([beast()], { choresDone: 2, elapsedMs: 1000 });
    await flush();

    expect(stats().ap.total).toBe(2);
    expect(stats().ap.history[0]).toMatchObject({ amount: 2, source: "battle:free" });
  });

  it("a Thief takes +25% GP from a quest tamed in battle", async () => {
    addHero("Thief");
    const { outcome } = rig("quest", questEncounter());
    void outcome.celebrateVictory([beast()], { choresDone: 2, elapsedMs: 1000 });
    await flush();

    expect(stats().gp.wallet).toBe(50);
    expect(stats().ap.total).toBe(2);
  });

  it("a Mage gets 10% of max MP back on a win; a Paladin 10% HP (before the full heal every fight ends with)", async () => {
    addHero("Mage");
    let { outcome } = rig("free", { label: "Socktopus", enemies: [beast()] });
    void outcome.celebrateVictory([beast()], { choresDone: 2, elapsedMs: 1000 });
    await flush();
    expect(stats().mp.now).toBe(18);
    expect(stats().hp.now).toBe(100); // the hero always walks out at full HP

    setActivePinia(createPinia());
    addHero("Paladin");
    const spy = jest.spyOn(useUserStore(), "updateUserHP");
    ({ outcome } = rig("free", { label: "Socktopus", enemies: [beast()] }));
    void outcome.celebrateVictory([beast()], { choresDone: 2, elapsedMs: 1000 });
    await flush();
    expect(spy).toHaveBeenCalledWith({ userId: HERO_ID, amount: 10 });
    expect(stats().mp.now).toBe(10);
  });

  it("a held quest (approval needed) pays nothing now, so the class bonus waits with it", async () => {
    addHero("Thief");
    const { outcome } = rig("quest", questEncounter(true));
    void outcome.celebrateVictory([beast()], { choresDone: 2, elapsedMs: 1000 });
    await flush();

    expect(stats().gp.wallet).toBe(0);
    expect(stats().ap.total).toBe(0);
  });
});
