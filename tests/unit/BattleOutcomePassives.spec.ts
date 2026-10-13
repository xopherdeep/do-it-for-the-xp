import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";
import { useBattleOutcome, type BattleOutcomeDeps } from "@/app/Console/BattleField/composables/useBattleOutcome";
import type { Encounter } from "@/app/Console/BattleField/battle/encounterLoader";
import type { Enemy, EscapeReport } from "@/lib/services/battle/BattleService";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * The class's say on a win's pay (docs/Items-And-Classes-Contract.md, C), through useBattleOutcome's
 * celebrateVictory: the Thief's GP, the Monk's AP, the Mage's MP and the Paladin's HP. Rewards are paid the
 * moment the beast falls, so the store is checked right after the call; the celebration that follows runs on
 * timers the test never advances. Fights leave damage behind: a win does not fill HP. A defeat admits the hero to
 * the Hospital (BattleOutcomeDefeat.spec.ts).
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
/** What the win wrote, in order: the quest log, the room and the board re-read */
const mockSteps: string[] = [];
const mockCompleteQuest = jest.fn();
const mockRecordBattleCompletion = jest.fn();
const mockIsQuestStillOpen = jest.fn();
jest.mock("@/lib/services/quests/QuestCompletionService", () => ({
  completeQuest: (...args: unknown[]) => mockCompleteQuest(...args),
  recordBattleCompletion: (...args: unknown[]) => mockRecordBattleCompletion(...args),
  isQuestStillOpen: (...args: unknown[]) => mockIsQuestStillOpen(...args),
}));
const mockTemples = { markRoomCleared: jest.fn(), refreshQuestRooms: jest.fn() };
jest.mock("@/lib/engine/core/dungeons/TempleSystem", () => ({
  TempleSystem: { getInstance: () => mockTemples },
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

/** The room a temple fight is fought in: column 0, row 1 of the shadow temple's first floor */
const ROOM = { templeId: "shadow-temple", level: "1F", x: 0, y: 1 };

/** celebrateVictory with every stage prop faked; `encounter` carries the quest (if any) and its rewards. */
const rig = (kind: "free" | "quest" | "temple", encounter: Partial<Encounter> | null) => {
  const presentVictory = jest.fn().mockResolvedValue(undefined);
  const deps = {
    ctx: kind === "temple" ? { kind, userId: HERO_ID, beastIds: [], ...ROOM } : { kind, userId: HERO_ID, questId: "q1", beastIds: [] },
    encounter: ref(encounter as Encounter | null),
    dialog: { clear: jest.fn(), enqueue: jest.fn(), enableAppendMode: jest.fn(), disableAppendMode: jest.fn(), isVictoryMessage: ref(false) },
    audio: { playSound: jest.fn(), playVictory: jest.fn(), stopBgm: jest.fn() },
    background: { collapse: jest.fn().mockResolvedValue(undefined) },
    feedback: { victory: jest.fn() },
    enemyAnimationClass: ref(""),
    router: { replace: jest.fn() },
    presentVictory,
  } as unknown as BattleOutcomeDeps;
  return { outcome: useBattleOutcome(deps), presentVictory, deps };
};

/** Rewards are paid before celebrateVictory's first await; a few microtasks are all the store needs. */
const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

const questEncounter = (requiresApproval = false): Partial<Encounter> =>
  ({
    label: "Dishes",
    enemies: [beast()],
    rewards: { xp: 0, gp: 40, ap: 2 },
    quest: { id: "q1", achievementName: "Dishes", requiresApproval },
  } as unknown as Partial<Encounter>);

/** Resets the quest log and temple fakes: an open window, a completion that logs, a claim that is held */
const resetQuestFakes = () => {
  mockSteps.length = 0;
  mockIsQuestStillOpen.mockReset().mockResolvedValue(true);
  mockRecordBattleCompletion.mockReset().mockImplementation(async () => {
    mockSteps.push("log");
  });
  mockCompleteQuest.mockReset().mockImplementation(async () => {
    mockSteps.push("log");
    return { awaitingApproval: true, levelUp: null, paid: { xp: 0, gp: 40, ap: 2 } };
  });
  mockTemples.markRoomCleared.mockReset().mockImplementation(() => mockSteps.push("room"));
  mockTemples.refreshQuestRooms.mockReset().mockImplementation(async () => {
    mockSteps.push("board");
    return null;
  });
};

describe("useBattleOutcome: class passives on a win", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setActivePinia(createPinia());
    resetQuestFakes();
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

  it("a Mage gets 10% of max MP back on a win and keeps the damage taken; a Paladin heals 10% HP", async () => {
    addHero("Mage");
    let { outcome } = rig("free", { label: "Socktopus", enemies: [beast()] });
    void outcome.celebrateVictory([beast()], { choresDone: 2, elapsedMs: 1000 });
    await flush();
    expect(stats().mp.now).toBe(18);
    expect(stats().hp.now).toBe(20); // the fight's damage stays: the Hospital and the Hotel matter

    setActivePinia(createPinia());
    addHero("Paladin");
    const spy = jest.spyOn(useUserStore(), "updateUserHP");
    ({ outcome } = rig("free", { label: "Socktopus", enemies: [beast()] }));
    void outcome.celebrateVictory([beast()], { choresDone: 2, elapsedMs: 1000 });
    await flush();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ userId: HERO_ID, amount: 10 });
    expect(stats().hp.now).toBe(30); // 20 + 10% of 100, and nothing else touched HP
    expect(stats().mp.now).toBe(10);
  });

  it("a Warrior's win leaves HP exactly where the beast left it", async () => {
    addHero("Warrior");
    const spy = jest.spyOn(useUserStore(), "updateUserHP");
    const { outcome } = rig("free", { label: "Socktopus", enemies: [beast()] });
    void outcome.celebrateVictory([beast()], { choresDone: 2, elapsedMs: 1000 });
    await flush();
    expect(spy).not.toHaveBeenCalled();
    expect(stats().hp.now).toBe(20);
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

/** The celebration after the pay: the strobe, the fold and the fade, up to the victory card. */
const playCelebration = async () => {
  for (let i = 0; i < 6; i++) {
    await flush();
    jest.advanceTimersByTime(1000);
  }
  await flush();
};

const roomQuestEncounter = (requiresApproval = false): Partial<Encounter> => ({
  ...questEncounter(requiresApproval),
  roomKey: "Q0001",
});

/**
 * Win = complete (docs/Quest-Rooms-Spec.md 7.5): a quest room's win completes its quest. Paid now (or held for the
 * Game Master) and logged, the room opens, and the run re-reads the board once the log has the win, so the room and
 * the board agree. The log is read first: a window already used (a shared quest a sibling cleared) pays nothing twice.
 */
describe("useBattleOutcome: a quest room's win completes its quest", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setActivePinia(createPinia());
    resetQuestFakes();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("pays the quest's rewards with the class bonus, logs the battle, opens the room, then re-reads the board", async () => {
    addHero("Thief");
    const encounter = roomQuestEncounter();
    const { outcome } = rig("temple", encounter);
    void outcome.celebrateVictory([beast()], { choresDone: 4, elapsedMs: 1000 });
    await flush();

    expect(stats().gp.wallet).toBe(50);
    expect(stats().ap.total).toBe(2);
    expect(mockIsQuestStillOpen).toHaveBeenCalledWith(encounter.quest, HERO_ID, expect.any(Date), undefined);
    expect(mockRecordBattleCompletion).toHaveBeenCalledWith(encounter.quest, HERO_ID, { xp: 0, gp: 50, ap: 2 });
    expect(mockCompleteQuest).not.toHaveBeenCalled();
    expect(mockTemples.markRoomCleared).toHaveBeenCalledWith("shadow-temple", "1F", [1, 0], HERO_ID);
    expect(mockTemples.refreshQuestRooms).toHaveBeenCalledWith("shadow-temple");
    expect(mockSteps).toEqual(["log", "room", "board"]);
  });

  it("a quest that needs approval logs a pending claim, pays nothing, and still lets the hero through", async () => {
    addHero("Thief");
    const encounter = roomQuestEncounter(true);
    const { outcome, presentVictory } = rig("temple", encounter);
    void outcome.celebrateVictory([beast()], { choresDone: 4, elapsedMs: 1000 });
    await flush();

    expect(mockCompleteQuest).toHaveBeenCalledWith(encounter.quest, HERO_ID, "battle");
    expect(mockRecordBattleCompletion).not.toHaveBeenCalled();
    expect(stats().gp.wallet).toBe(0);
    expect(stats().ap.total).toBe(0);
    expect(mockSteps).toEqual(["log", "room", "board"]);

    await playCelebration();
    expect(presentVictory).toHaveBeenCalledWith(expect.objectContaining({ held: true, rewards: { xp: 0, gp: 40, ap: 2 } }));
  });

  it("an approval quest during Tesla's trusted hour is paid now, as a claim would be", async () => {
    addHero("Warrior");
    const hero = useUserStore().users[HERO_ID] as { questEffects?: { trustedUntil?: string } };
    hero.questEffects = { trustedUntil: new Date(Date.now() + 60 * 60 * 1000).toISOString() };
    const { outcome } = rig("temple", roomQuestEncounter(true));
    void outcome.celebrateVictory([beast()], { choresDone: 4, elapsedMs: 1000 });
    await flush();

    expect(mockCompleteQuest).not.toHaveBeenCalled();
    expect(mockRecordBattleCompletion).toHaveBeenCalled();
    expect(stats().gp.wallet).toBe(40);
  });

  it("a window already used (a shared quest a sibling cleared) pays and logs nothing, and the room still opens", async () => {
    addHero("Thief");
    mockIsQuestStillOpen.mockResolvedValue(false);
    const { outcome, presentVictory } = rig("temple", roomQuestEncounter());
    void outcome.celebrateVictory([beast()], { choresDone: 4, elapsedMs: 1000 });
    await flush();

    expect(stats().gp.wallet).toBe(0);
    expect(stats().ap.total).toBe(0);
    expect(mockRecordBattleCompletion).not.toHaveBeenCalled();
    expect(mockCompleteQuest).not.toHaveBeenCalled();
    expect(mockSteps).toEqual(["room", "board"]);

    await playCelebration();
    expect(presentVictory).toHaveBeenCalledWith(expect.objectContaining({ held: false, rewards: { xp: 0, gp: 0, ap: 0 } }));
  });

  it("a board fight reads the whole log too, and touches no temple", async () => {
    addHero("Warrior");
    mockIsQuestStillOpen.mockResolvedValue(false);
    const { outcome } = rig("quest", questEncounter());
    void outcome.celebrateVictory([beast()], { choresDone: 2, elapsedMs: 1000 });
    await flush();

    expect(stats().gp.wallet).toBe(0);
    expect(mockRecordBattleCompletion).not.toHaveBeenCalled();
    expect(mockTemples.markRoomCleared).not.toHaveBeenCalled();
    expect(mockTemples.refreshQuestRooms).not.toHaveBeenCalled();
  });

  it("a log that cannot be read does not cost the hero the win: it pays as before", async () => {
    addHero("Warrior");
    mockIsQuestStillOpen.mockRejectedValue(new Error("storage is gone"));
    const { outcome } = rig("temple", roomQuestEncounter());
    void outcome.celebrateVictory([beast()], { choresDone: 4, elapsedMs: 1000 });
    await flush();

    expect(stats().gp.wallet).toBe(40);
    expect(mockRecordBattleCompletion).toHaveBeenCalled();
  });

  it("a dormant or classic room pays the room and opens it, with no quest to log or board to re-read", async () => {
    addHero("Warrior");
    const { outcome } = rig("temple", { label: "Dish Goblin", enemies: [beast()], rewards: { xp: 5, gp: 6, ap: 1 }, roomKey: "Q0001" });
    void outcome.celebrateVictory([beast()], { choresDone: 4, elapsedMs: 1000 });
    await flush();

    expect(stats().gp.wallet).toBe(6);
    expect(mockIsQuestStillOpen).not.toHaveBeenCalled();
    expect(mockRecordBattleCompletion).not.toHaveBeenCalled();
    expect(mockTemples.markRoomCleared).toHaveBeenCalledWith("shadow-temple", "1F", [1, 0], HERO_ID);
    expect(mockTemples.refreshQuestRooms).not.toHaveBeenCalled();
  });

  it("running from a quest room leaves the room sealed: the way on is still through the chore", () => {
    addHero("Warrior");
    const { outcome, deps } = rig("temple", roomQuestEncounter());
    outcome.handleEscape();
    const queued = (deps.dialog.enqueue as jest.Mock).mock.calls[0][0] as Array<() => void>;
    queued[0]();
    jest.advanceTimersByTime(1000);

    expect(mockTemples.markRoomCleared).not.toHaveBeenCalled();
    expect(mockRecordBattleCompletion).not.toHaveBeenCalled();
    expect(deps.router.replace).toHaveBeenCalledWith(expect.objectContaining({ name: "temple" }));
  });
});

/**
 * The grudge (docs/Quest-Rooms-Spec.md 5.6, 5.7). Leaving a fight that carries a quest puts one mark on its beast for this
 * hero (three at the most), even when the parting strike was dodged. Beating the beast clears the hero's marks, whether the
 * win is paid, held for the Game Master or finds the window already used. A fight with no quest touches no marks.
 */
describe("useBattleOutcome: grudge marks", () => {
  const OTHER_HERO = "hero-2";
  const escape = (extra: Partial<EscapeReport> = {}): EscapeReport => ({
    free: false,
    damage: 4,
    dodgedBy: null,
    softener: null,
    emptied: false,
    carriesQuest: true,
    ...extra,
  });
  const marks = (heroId = HERO_ID, questId = "q1") =>
    (useUserStore().getUserById(heroId) as any)?.questGrudges?.[questId]?.marks ?? 0;
  const markedHero = (count: number) => {
    for (let flight = 0; flight < count; flight++) useUserStore().addQuestGrudge(HERO_ID, "q1", 1000 + flight);
  };

  beforeEach(() => {
    jest.useFakeTimers();
    setActivePinia(createPinia());
    resetQuestFakes();
    addHero("Warrior");
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("running from a quest fight", () => {
    it("leaves one mark on the quest's beast for this hero, and stamps when they fled", () => {
      jest.setSystemTime(new Date(2026, 9, 12, 20, 0, 0));
      const { outcome } = rig("quest", questEncounter());

      outcome.handleEscape(escape());

      const entry = (useUserStore().getUserById(HERO_ID) as any).questGrudges.q1;
      expect(entry).toEqual({ marks: 1, lastFledAt: new Date(2026, 9, 12, 20, 0, 0).getTime() });
    });

    it("adds another mark each time, three at the most", () => {
      const seen: number[] = [];
      for (let flight = 0; flight < 5; flight++) {
        rig("quest", questEncounter()).outcome.handleEscape(escape());
        seen.push(marks());
      }
      expect(seen).toEqual([1, 2, 3, 3, 3]);
    });

    it("marks a quest room's beast too, the temple's fight carries its quest", () => {
      rig("temple", roomQuestEncounter()).outcome.handleEscape(escape());
      expect(marks()).toBe(1);
    });

    it("marks it even when the parting strike was dodged", () => {
      rig("quest", questEncounter()).outcome.handleEscape(escape({ damage: 0, dodgedBy: "shadow" }));
      expect(marks()).toBe(1);
    });

    it("marks only this hero's record", () => {
      useUserStore().addUser({ id: OTHER_HERO, name: { nick: "Mia" }, stats: { hp: { now: 10, max: 10 } } });
      rig("quest", questEncounter()).outcome.handleEscape(escape());
      expect(marks(HERO_ID)).toBe(1);
      expect(marks(OTHER_HERO)).toBe(0);
    });

    it("marks the quest the fight carries and no other", () => {
      useUserStore().addQuestGrudge(HERO_ID, "q-other", 5);
      rig("quest", questEncounter()).outcome.handleEscape(escape());
      expect(marks(HERO_ID, "q1")).toBe(1);
      expect(marks(HERO_ID, "q-other")).toBe(1);
    });

    it("marks nothing when the fight carries no quest: a free fight, a classic room, a report that says so", () => {
      rig("free", { label: "Socktopus", enemies: [beast()] }).outcome.handleEscape(escape({ free: true, carriesQuest: false }));
      rig("temple", { label: "Dish Goblin", enemies: [beast()], roomKey: "Q0001" }).outcome.handleEscape(
        escape({ carriesQuest: false })
      );
      rig("quest", questEncounter()).outcome.handleEscape(escape({ carriesQuest: false }));
      // a report that says there is a quest, with no quest on the page, has nothing to mark
      rig("quest", { label: "Socktopus", enemies: [beast()] }).outcome.handleEscape(escape());

      expect((useUserStore().getUserById(HERO_ID) as any).questGrudges).toBeUndefined();
    });

    it("marks nothing when no report comes with the escape", () => {
      rig("quest", questEncounter()).outcome.handleEscape();
      expect((useUserStore().getUserById(HERO_ID) as any).questGrudges).toBeUndefined();
    });

    it("still fades the beast and leaves, as before", () => {
      const { outcome, deps } = rig("quest", questEncounter());
      outcome.handleEscape(escape());
      const queued = (deps.dialog.enqueue as jest.Mock).mock.calls[0][0] as Array<() => void>;
      queued[0]();
      jest.advanceTimersByTime(1000);
      expect(deps.enemyAnimationClass.value).toBe("fadeout");
      expect(deps.router.replace).toHaveBeenCalledTimes(1);
    });
  });

  describe("beating the beast", () => {
    it("a paid win clears the hero's marks on the quest", async () => {
      markedHero(3);
      const { outcome } = rig("quest", questEncounter());
      void outcome.celebrateVictory([beast()], { choresDone: 2, elapsedMs: 1000 });
      await flush();

      expect(marks()).toBe(0);
      expect(mockRecordBattleCompletion).toHaveBeenCalled();
    });

    it("a win held for the Game Master clears them too", async () => {
      markedHero(2);
      const { outcome } = rig("quest", questEncounter(true));
      void outcome.celebrateVictory([beast()], { choresDone: 2, elapsedMs: 1000 });
      await flush();

      expect(mockCompleteQuest).toHaveBeenCalled();
      expect(marks()).toBe(0);
    });

    it("a quest room's win clears them, and the room still opens", async () => {
      markedHero(1);
      const { outcome } = rig("temple", roomQuestEncounter());
      void outcome.celebrateVictory([beast()], { choresDone: 4, elapsedMs: 1000 });
      await flush();

      expect(marks()).toBe(0);
      expect(mockTemples.markRoomCleared).toHaveBeenCalled();
    });

    it("a win on a window already used (nothing is logged) still ends the grudge", async () => {
      markedHero(2);
      mockIsQuestStillOpen.mockResolvedValue(false);
      const { outcome } = rig("quest", questEncounter());
      void outcome.celebrateVictory([beast()], { choresDone: 2, elapsedMs: 1000 });
      await flush();

      expect(mockRecordBattleCompletion).not.toHaveBeenCalled();
      expect(marks()).toBe(0);
    });

    it("leaves other quests' marks and other heroes' marks alone", async () => {
      useUserStore().addUser({ id: OTHER_HERO, name: { nick: "Mia" }, stats: { hp: { now: 10, max: 10 } } });
      markedHero(2);
      useUserStore().addQuestGrudge(HERO_ID, "q-other", 5);
      useUserStore().addQuestGrudge(OTHER_HERO, "q1", 5);
      const { outcome } = rig("quest", questEncounter());
      void outcome.celebrateVictory([beast()], { choresDone: 2, elapsedMs: 1000 });
      await flush();

      expect(marks(HERO_ID, "q1")).toBe(0);
      expect(marks(HERO_ID, "q-other")).toBe(1);
      expect(marks(OTHER_HERO, "q1")).toBe(1);
    });

    it("a free fight's win touches no marks", async () => {
      markedHero(2);
      const { outcome } = rig("free", { label: "Socktopus", enemies: [beast()] });
      void outcome.celebrateVictory([beast()], { choresDone: 2, elapsedMs: 1000 });
      await flush();
      expect(marks()).toBe(2);
    });

    it("running again after a clear starts over at one mark", async () => {
      markedHero(3);
      const { outcome } = rig("quest", questEncounter());
      void outcome.celebrateVictory([beast()], { choresDone: 2, elapsedMs: 1000 });
      await flush();
      rig("quest", questEncounter()).outcome.handleEscape(escape());
      expect(marks()).toBe(1);
    });
  });
});
