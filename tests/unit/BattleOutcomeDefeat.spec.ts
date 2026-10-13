import { createPinia, setActivePinia } from "pinia";
import { ref } from "vue";
import { useBattleOutcome, type BattleOutcomeDeps } from "@/app/Console/BattleField/composables/useBattleOutcome";
import type { Encounter } from "@/app/Console/BattleField/battle/encounterLoader";
import { takeAdmissionReceipt } from "@/lib/services/hometown/hospitalAdmission";
import { CARRIED_TO_HOSPITAL_LINE } from "@/lib/services/hometown/hospitalBill";
import { useChatStore } from "@/lib/store/stores/chat";
import { useNotificationsStore } from "@/lib/store/stores/notifications";
import { useUserStore } from "@/lib/store/stores/user";

/**
 * A lost fight (docs/Quest-Rooms-Spec.md 5.8 and 7.7): 0 HP admits the hero to the Hospital. They are treated to full
 * HP and MP and billed at once (a reload mid-dialog must not leave them at 0), the arena says "You were carried to the
 * Hospital.", and a tap walks them to the Hospital screen with `?admitted=1` so the nurse reads the bill. The game-over
 * splash and the 1 HP limp home are retired.
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
  completeQuest: jest.fn(),
  recordBattleCompletion: jest.fn(),
  isQuestStillOpen: jest.fn(),
}));
jest.mock("@/lib/engine/core/dungeons/TempleSystem", () => ({
  TempleSystem: { getInstance: () => ({ markRoomCleared: jest.fn(), refreshQuestRooms: jest.fn() }) },
}));
jest.mock("@/lib/store/stores/chat", () => {
  const chat = { postSystemLine: jest.fn(async () => ({})) };
  return { __esModule: true, FAMILY_CHAT_ROOM: "family-chat", useChatStore: () => chat };
});
jest.mock("@/lib/store/stores/notifications", () => {
  const notifications = { push: jest.fn() };
  return { __esModule: true, useNotificationsStore: () => notifications };
});
jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const HERO_ID = "hero-1";

const addHero = (gp: Record<string, number>, hp = 0) => {
  useUserStore().addUser({
    id: HERO_ID,
    name: { nick: "Max" },
    jobClass: "Warrior",
    stats: {
      level: 1,
      xp: { now: 0, next_level: 283 },
      hp: { now: hp, max: 100 },
      mp: { now: 10, max: 80 },
      gp: { wallet: 0, savings: 0, debt: 0, limit: 1000, ...gp },
      ap: { total: 0, history: [] },
    },
  });
};

const stats = () => (useUserStore().getUserById(HERO_ID) as any).stats;

const rig = (kind: "free" | "quest" | "temple" = "free") => {
  const ctx =
    kind === "temple"
      ? { kind, userId: HERO_ID, beastIds: [], templeId: "shadow-temple", level: "1F", x: 0, y: 1 }
      : { kind, userId: HERO_ID, questId: "q1", beastIds: [] };
  const deps = {
    ctx,
    encounter: ref(null as Encounter | null),
    dialog: { clear: jest.fn(), enqueue: jest.fn(), enableAppendMode: jest.fn(), disableAppendMode: jest.fn(), isVictoryMessage: ref(false) },
    audio: { playSound: jest.fn(), playVictory: jest.fn(), stopBgm: jest.fn() },
    background: { collapse: jest.fn().mockResolvedValue(undefined) },
    feedback: { victory: jest.fn() },
    enemyAnimationClass: ref(""),
    router: { replace: jest.fn() },
    presentVictory: jest.fn().mockResolvedValue(undefined),
  } as unknown as BattleOutcomeDeps;
  return { outcome: useBattleOutcome(deps), deps };
};

const queued = (deps: BattleOutcomeDeps) => (deps.dialog.enqueue as jest.Mock).mock.calls[0][0] as Array<string | (() => void)>;

beforeEach(() => {
  setActivePinia(createPinia());
  jest.clearAllMocks();
  takeAdmissionReceipt(HERO_ID);
});

describe("useBattleOutcome: a defeat admits the hero to the Hospital", () => {
  it("treats the hero to full HP and MP at once, before the dialog is tapped through", () => {
    addHero({ wallet: 300 });
    const { outcome } = rig();

    outcome.handlePlayerDefeated();

    expect(stats().hp.now).toBe(100);
    expect(stats().mp.now).toBe(80);
  });

  it("bills the flat 100 from the wallet when it covers it: not grounded", () => {
    addHero({ wallet: 300 });
    rig().outcome.handlePlayerDefeated();

    expect(stats().gp.wallet).toBe(200);
    expect(stats().gp.hospitalBill).toBe(0);
  });

  it("takes what the wallet holds and owes the rest: the hero is grounded (₲40 of ₲100)", () => {
    addHero({ wallet: 40 });
    rig().outcome.handlePlayerDefeated();

    expect(stats().gp.wallet).toBe(0);
    expect(stats().gp.hospitalBill).toBe(60);
    expect(takeAdmissionReceipt(HERO_ID)).toMatchObject({ cause: "battle", charge: { fromWallet: 40, owed: 60 } });
  });

  it("stops the music, sounds the fall and says the one line, then walks to the Hospital with the nurse's cue", () => {
    addHero({ wallet: 40 });
    const { outcome, deps } = rig();

    outcome.handlePlayerDefeated();

    expect((deps.audio.stopBgm as jest.Mock)).toHaveBeenCalled();
    expect((deps.audio.playSound as jest.Mock)).toHaveBeenCalledWith("die");
    const lines = queued(deps);
    expect(lines[0]).toBe("You were carried to the Hospital.");
    expect(lines[0]).toBe(CARRIED_TO_HOSPITAL_LINE);
    expect(deps.router.replace).not.toHaveBeenCalled(); // not until the line is tapped away
    (lines[1] as () => void)();
    expect(deps.router.replace).toHaveBeenCalledTimes(1);
    expect(deps.router.replace).toHaveBeenCalledWith({
      name: "hospital",
      params: { userId: HERO_ID },
      query: { admitted: "1" },
    });
  });

  it("never goes to the game-over splash", () => {
    addHero({ wallet: 0 });
    const { outcome, deps } = rig();
    outcome.handlePlayerDefeated();
    (queued(deps)[1] as () => void)();

    expect(deps.router.replace).not.toHaveBeenCalledWith({ name: "game-over" });
    expect(stats().hp.now).toBeGreaterThan(1);
  });

  it("is billed once however the dialog is tapped", () => {
    addHero({ wallet: 0 });
    const { outcome, deps } = rig();
    outcome.handlePlayerDefeated();
    (queued(deps)[1] as () => void)();
    (queued(deps)[1] as () => void)();

    expect(stats().gp.hospitalBill).toBe(100);
  });

  it("stacks the bill over an earlier one", () => {
    addHero({ wallet: 0, hospitalBill: 60 });
    rig().outcome.handlePlayerDefeated();
    expect(stats().gp.hospitalBill).toBe(160);
  });

  it("works the same after a temple fight and a quest fight", () => {
    for (const kind of ["temple", "quest"] as const) {
      setActivePinia(createPinia());
      addHero({ wallet: 0 });
      const { outcome, deps } = rig(kind);
      outcome.handlePlayerDefeated();
      (queued(deps)[1] as () => void)();

      expect(stats().hp.now).toBe(100);
      expect(stats().gp.hospitalBill).toBe(100);
      expect(deps.router.replace).toHaveBeenCalledWith(expect.objectContaining({ name: "hospital" }));
    }
  });

  it("tells the family once: the hero's notice, the Game Masters' and one chat line", async () => {
    addHero({ wallet: 40 });
    useUserStore().users.dad = { id: "dad", name: { nick: "Dad" }, isAdult: true, stats: {} } as never;
    rig().outcome.handlePlayerDefeated();
    await Promise.resolve();

    const pushes = (useNotificationsStore().push as unknown as jest.Mock).mock.calls.map(([note]) => note);
    expect(pushes.filter((note) => note.heroId === HERO_ID && note.kind === "hospital")).toHaveLength(1);
    expect(pushes.filter((note) => note.heroId === "dad" && note.kind === "hospital")).toHaveLength(1);
    expect((useChatStore().postSystemLine as unknown as jest.Mock)).toHaveBeenCalledWith(
      "family-chat",
      "Max was carried to the Hospital. Bill ₲100 (₲60 owed)."
    );
  });

  it("does not bill a hero who somehow still has HP", () => {
    addHero({ wallet: 300 }, 20);
    rig().outcome.handlePlayerDefeated();

    expect(stats().hp.now).toBe(20);
    expect(stats().gp.wallet).toBe(300);
    expect(stats().gp.hospitalBill ?? 0).toBe(0);
  });
});

describe("useBattleOutcome: a parting strike that empties HP (docs/Quest-Rooms-Spec.md 5.6)", () => {
  const emptied = { free: false, damage: 3, dodgedBy: null, softener: null, emptied: true, carriesQuest: false };

  it("admits the hero on the way out: full HP and MP, billed, then the Hospital instead of the beast's fade", () => {
    addHero({ wallet: 40 });
    const { outcome, deps } = rig();

    outcome.handleEscape(emptied);

    expect(stats().hp.now).toBe(100);
    expect(stats().mp.now).toBe(80);
    expect(stats().gp.wallet).toBe(0);
    expect(stats().gp.hospitalBill).toBe(60);
    expect(takeAdmissionReceipt(HERO_ID)).toMatchObject({ cause: "run", charge: { owed: 60 } });

    const lines = queued(deps);
    expect(lines).toHaveLength(1);
    expect(deps.router.replace).not.toHaveBeenCalled(); // not until the service's lines are tapped through
    (lines[0] as () => void)();
    expect(deps.router.replace).toHaveBeenCalledWith({ name: "hospital", params: { userId: HERO_ID }, query: { admitted: "1" } });
    expect(deps.enemyAnimationClass.value).toBe(""); // no fade-out of the beast: the hero was carried off
  });

  it("marks the quest's beast first: carried to the Hospital and holding a grudge, as spec 5.6 says", () => {
    addHero({ wallet: 40 });
    const { outcome, deps } = rig("quest");
    deps.encounter.value = { quest: { id: "q1", achievementName: "Dishes" }, enemies: [], rewards: null, label: "Dishes" } as unknown as Encounter;

    outcome.handleEscape({ ...emptied, carriesQuest: true });

    expect(stats().hp.now).toBe(100);
    expect((useUserStore().getUserById(HERO_ID) as any).questGrudges.q1.marks).toBe(1);
  });

  it("does not bill a hero who got away with HP left", () => {
    addHero({ wallet: 40 }, 20);
    const { outcome, deps } = rig();
    jest.useFakeTimers();

    outcome.handleEscape({ ...emptied, emptied: false, damage: 4 });
    (queued(deps)[0] as () => void)();
    jest.advanceTimersByTime(1000);

    expect(stats().gp.wallet).toBe(40);
    expect(stats().hp.now).toBe(20);
    expect(deps.router.replace).not.toHaveBeenCalledWith(expect.objectContaining({ name: "hospital" }));
    jest.useRealTimers();
  });

  it("still walks away as before when no report comes with the escape", () => {
    addHero({ wallet: 40 }, 20);
    jest.useFakeTimers();
    const { outcome, deps } = rig();

    outcome.handleEscape();
    (queued(deps)[0] as () => void)();
    jest.advanceTimersByTime(1000);

    expect(stats().gp.wallet).toBe(40);
    expect(deps.router.replace).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  it("leaves no grudge mark when escape is a full bribe", () => {
    addHero({ wallet: 100 }, 50);
    const { outcome, deps } = rig("quest");
    deps.encounter.value = { quest: { id: "q1", achievementName: "Dishes" }, enemies: [], rewards: null, label: "Dishes" } as unknown as Encounter;

    outcome.handleEscape({
      free: false,
      damage: 0,
      dodgedBy: null,
      softener: null,
      emptied: false,
      carriesQuest: true,
      bribed: true,
      bribeTier: "full",
      bribeCost: 25,
    });
    const grudges = (useUserStore().getUserById(HERO_ID) as any).questGrudges;
    expect(grudges?.q1?.marks || 0).toBe(0);
  });

  it("leaves a grudge mark when escape is a low bribe", () => {
    addHero({ wallet: 100 }, 50);
    const { outcome, deps } = rig("quest");
    deps.encounter.value = { quest: { id: "q1", achievementName: "Dishes" }, enemies: [], rewards: null, label: "Dishes" } as unknown as Encounter;

    outcome.handleEscape({
      free: false,
      damage: 0,
      dodgedBy: null,
      softener: null,
      emptied: false,
      carriesQuest: true,
      bribed: true,
      bribeTier: "low",
      bribeCost: 12,
    });
    const grudges = (useUserStore().getUserById(HERO_ID) as any).questGrudges;
    expect(grudges?.q1?.marks).toBe(1);
  });
});
