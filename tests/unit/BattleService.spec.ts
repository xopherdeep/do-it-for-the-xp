import { createPinia, setActivePinia } from "pinia";
import {
  BattleService,
  strikeDamage,
  type BattleCallbacks,
  type BattleServiceOptions,
  type Enemy,
} from "@/lib/services/battle/BattleService";
import { classPassive } from "@/lib/services/stats/ClassPassives";
import { createBattleService } from "@/lib/services/battle";
import { useUserStore } from "@/lib/store/stores/user";
import type { EngineMessage } from "@/app/Console/BattleField/battle/battleView";

// The user store persists HP changes through ProfileDb; the engine never needs the real thing.
jest.mock("@/lib/databases/ProfileDb", () => {
  const ProfileDb = jest.fn().mockImplementation(() => ({
    setProfile: jest.fn().mockResolvedValue(undefined),
    getAll: jest.fn().mockResolvedValue([]),
  }));
  return { __esModule: true, default: ProfileDb, ProfileDb };
});
jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

const HERO_ID = "hero-1";
const THREE_MINUTES = 3 * 60_000;

const makeEnemy = (overrides: Partial<Enemy> = {}): Enemy => ({
  id: "socktopus",
  name: "Socktopus",
  type: "monster",
  isBoss: false,
  health: 100,
  maxHealth: 100,
  attack: 10,
  defense: 5,
  speed: 5,
  tasks: [
    { id: "t1", name: "Pair the socks", isCompleted: false },
    { id: "t2", name: "Fold the socks", isCompleted: false },
  ],
  ...overrides,
});

const heroHp = () => (useUserStore().getUserById(HERO_ID) as any).stats.hp.now as number;

/** Every line the engine queued, flattened in order. */
const textOf = (lines: EngineMessage[]) => lines.map((line) => (typeof line === "string" ? line : line.text));

interface Rig {
  service: BattleService;
  lines: EngineMessage[];
  cb: { [K in keyof BattleCallbacks]-?: jest.Mock };
}

/** A started two-chore fight against `enemy` with the hero from the store and every callback spied on. */
const startFight = (enemy: Enemy = makeEnemy(), options?: BattleServiceOptions): Rig => {
  const service = createBattleService(options);
  const lines: EngineMessage[] = [];
  const cb = {
    onDialogMessage: jest.fn((messages: EngineMessage[]) => void lines.push(...messages)),
    onEnemyHealthChange: jest.fn(),
    onDefendStateChange: jest.fn(),
    onPlayerTurnChange: jest.fn(),
    onEnemyDefeated: jest.fn(),
    onEnemyChange: jest.fn(),
    onCombatTasksChange: jest.fn(),
    onPlayerDefeated: jest.fn(),
    onAttack: jest.fn(),
    onDamage: jest.fn(),
  };
  service.registerCallbacks(cb);
  service.initMultiBattle([enemy], [HERO_ID]);
  return { service, lines, cb };
};

describe("BattleService", () => {
  let service: BattleService | null = null;

  beforeEach(() => {
    jest.useFakeTimers();
    setActivePinia(createPinia());
    useUserStore().addUser({
      id: HERO_ID,
      name: { nick: "Max" },
      jobClass: "warrior",
      stats: {
        level: 1,
        xp: { now: 0, next_level: 283 },
        hp: { now: 30, max: 30 },
        mp: { now: 10, max: 10 },
        gp: { wallet: 0, savings: 0, debt: 0, limit: 1000 },
      },
    });
  });

  afterEach(() => {
    service?.dispose();
    service = null;
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const fight = (enemy?: Enemy, options?: BattleServiceOptions): Rig => {
    const rig = startFight(enemy, options);
    service = rig.service;
    return rig;
  };

  describe("strikeDamage", () => {
    it("costs about 12% of max HP, and half of that when braced", () => {
      expect(strikeDamage(30, 10, false, 0.5)).toBe(4);
      expect(strikeDamage(30, 10, true, 0.5)).toBe(2);
    });

    it("rolls +-10% around the middle", () => {
      expect(strikeDamage(150, 10, false, 0)).toBe(16);
      expect(strikeDamage(150, 10, false, 1)).toBe(20);
    });

    it("bites harder for a stronger beast and treats a missing attack as 10", () => {
      expect([5, 6]).toContain(strikeDamage(30, 15, false, 0.5));
      expect(strikeDamage(30, 0, false, 0.5)).toBe(strikeDamage(30, 10, false, 0.5));
    });

    it("never deals less than 1, braced or not", () => {
      expect(strikeDamage(1, 10, false, 0)).toBe(1);
      expect(strikeDamage(1, 10, true, 0)).toBe(1);
    });

    it("falls back to the default roll when none is given", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.5);
      expect(strikeDamage(30, 10, false)).toBe(4);
    });

    it("lets a class brace factor through instead of half, never below 1, and ignores a broken factor", () => {
      expect(strikeDamage(100, 10, true, 0.5, 0.25)).toBe(3);
      expect(strikeDamage(100, 10, true, 0.5, 0.5)).toBe(6);
      expect(strikeDamage(100, 10, false, 0.5, 0.25)).toBe(12);
      expect(strikeDamage(1, 10, true, 0, 0.25)).toBe(1);
      expect(strikeDamage(100, 10, true, 0.5, NaN)).toBe(6);
      expect(strikeDamage(100, 10, true, 0.5, 0)).toBe(6);
    });
  });

  describe("setting up", () => {
    it("starts with the hero on the move and the beast's chores armed as attacks", () => {
      const { service: s, cb } = fight();
      expect(s.isBattleStarted()).toBe(true);
      expect(s.isPlayerTurn()).toBe(true);
      expect(s.getTurnCounter()).toBe(1);
      expect(s.getCurrentEnemy()?.name).toBe("Socktopus");
      expect(s.getAllEnemies()).toHaveLength(1);
      expect(s.getCombatTasks().map((task) => task.id)).toEqual(["t1", "t2"]);
      expect(cb.onCombatTasksChange).toHaveBeenCalledTimes(1);
      expect(s.hasPendingDamage()).toBe(false);
    });

    it("makes the beast itself the chore when it has no checklist", () => {
      const { service: s } = fight(makeEnemy({ tasks: [] }));
      expect(s.getCombatTasks()).toEqual([{ id: "socktopus-task", name: "Defeat Socktopus", isCompleted: false }]);
    });

    it("refuses actions before the fight has started", () => {
      service = createBattleService();
      expect(service.handleBattleAction("defend")).toMatchObject({ success: false, message: "Battle not started" });
    });

    it("answers an unknown action (including the old 'attack') with Unhandled action", () => {
      const { service: s } = fight();
      expect(s.handleBattleAction("attack")).toEqual({ success: false, message: "Unhandled action" });
    });

    it("keeps nothing from the last fight and does not run the clock until asked", () => {
      const { service: s } = fight();
      s.startAttackTimer();
      s.initMultiBattle([makeEnemy()], [HERO_ID]);
      expect(s.getTimeRemaining()).toBe(0);
      jest.advanceTimersByTime(THREE_MINUTES * 3);
      expect(s.hasPendingDamage()).toBe(false);
    });

    it("lets the factory create a free-fight engine", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.99);
      const { service: s } = fight(makeEnemy({ isBoss: true }), { freeFight: true });
      expect(s.handleBattleAction("run").success).toBe(true);
    });
  });

  describe("the attack clock", () => {
    it("is one chore's worth per remaining chore, and its length is readable at once", () => {
      const { service: s } = fight();
      s.startAttackTimer();
      expect(s.getAttackDuration()).toBe(2 * THREE_MINUTES);
      expect(s.getTimeRemaining()).toBe(2 * THREE_MINUTES);
      expect(s.getEnemyAttackTimer()).toBe(100);
    });

    it("uses the beast's own attackCooldown and never less than one chore", () => {
      const { service: s } = fight(makeEnemy({ attackCooldown: 5 }));
      s.startAttackTimer();
      expect(s.getAttackDuration()).toBe(2 * 5 * 60_000);
    });

    it("drains with Date.now(): halfway through the clock the bar reads about 50", () => {
      const { service: s } = fight();
      s.finishCombatTask("t1"); // one chore left: a 3 minute clock
      jest.advanceTimersByTime(90_000);
      expect(s.getTimeRemaining()).toBe(90_000);
      expect(s.getEnemyAttackTimer()).toBeCloseTo(50, 0);
    });

    it("tick() re-reads the clock on demand and does nothing while the clock is stopped", () => {
      const { service: s } = fight();
      s.tick();
      expect(s.getTimeRemaining()).toBe(0);

      s.startAttackTimer();
      jest.setSystemTime(Date.now() + 60_000);
      s.tick();
      expect(s.getTimeRemaining()).toBe(2 * THREE_MINUTES - 60_000);
    });

    it("strikes exactly once when the clock runs dry", () => {
      const { service: s, lines, cb } = fight();
      s.startAttackTimer();
      jest.advanceTimersByTime(2 * THREE_MINUTES + 500);

      expect(textOf(lines).filter((text) => text === "Socktopus attacks!")).toHaveLength(1);
      expect(cb.onAttack).toHaveBeenCalledTimes(1);
      expect(cb.onAttack).toHaveBeenCalledWith("enemy");
      expect(s.hasPendingDamage()).toBe(true);
      expect(s.getPendingDamage()).toBeGreaterThan(0);
      expect(s.getTimeRemaining()).toBe(0);

      // The clock stays off until the hit lands
      jest.advanceTimersByTime(THREE_MINUTES * 4);
      expect(textOf(lines).filter((text) => text === "Socktopus attacks!")).toHaveLength(1);
    });

    it("still makes only one strike when endPlayerTurn's own timeout fires after the clock did", () => {
      const { service: s, lines, cb } = fight();
      s.startAttackTimer();
      jest.advanceTimersByTime(2 * THREE_MINUTES - 500);
      s.endPlayerTurn(); // the 1 s beat to a strike starts with the clock 0.5 s from empty...
      jest.advanceTimersByTime(1500); // ...so the clock strikes first and the beat lands on a waiting strike
      expect(textOf(lines).filter((text) => text === "Socktopus attacks!")).toHaveLength(1);
      expect(cb.onAttack).toHaveBeenCalledTimes(1);
      expect(s.hasPendingDamage()).toBe(true);
    });

    it("stopAttackTimer stops the countdown", () => {
      const { service: s } = fight();
      s.startAttackTimer();
      s.stopAttackTimer();
      jest.advanceTimersByTime(2 * THREE_MINUTES * 2);
      expect(s.hasPendingDamage()).toBe(false);
    });
  });

  describe("a chore", () => {
    it("deals an equal slice, tells the page, and refills the clock", () => {
      const { service: s, lines, cb } = fight();
      s.startAttackTimer();
      jest.advanceTimersByTime(60_000);

      s.finishCombatTask("t1");

      expect(s.getCurrentEnemy()?.health).toBe(50);
      expect(cb.onDamage).toHaveBeenCalledWith("enemy", 50, false);
      expect(cb.onEnemyHealthChange).toHaveBeenCalled();
      expect(s.getCombatTasks()[0].isCompleted).toBe(true);
      // One chore left: 1 * 3 min, with timeRemaining already there (no waiting for a tick)
      expect(s.getAttackDuration()).toBe(THREE_MINUTES);
      expect(s.getTimeRemaining()).toBe(THREE_MINUTES);
      expect(s.getEnemyAttackTimer()).toBe(100);
      expect(lines).toEqual([{ text: "Max used Pair the socks! Socktopus took 50 damage!", auto: true }]);
    });

    it("ignores a chore it does not know and a chore already done", () => {
      const { service: s, cb } = fight();
      s.finishCombatTask("nope");
      s.finishCombatTask("t1");
      s.finishCombatTask("t1");
      expect(s.getCurrentEnemy()?.health).toBe(50);
      expect(cb.onDamage).toHaveBeenCalledTimes(1);
    });

    it("does not restart the clock while a strike is waiting", () => {
      const { service: s } = fight();
      s.startAttackTimer();
      jest.advanceTimersByTime(2 * THREE_MINUTES); // strike is now pending, clock stopped
      expect(s.hasPendingDamage()).toBe(true);

      s.finishCombatTask("t1");

      expect(s.getTimeRemaining()).toBe(0);
      jest.advanceTimersByTime(THREE_MINUTES * 3);
      expect(s.getTimeRemaining()).toBe(0);
      expect(s.hasPendingDamage()).toBe(true);
    });

    it("the last chore is the final blow: the beast is defeated and nothing strikes afterwards", () => {
      const { service: s, cb } = fight();
      s.finishCombatTask("t1");
      s.finishCombatTask("t2");

      expect(cb.onDamage).toHaveBeenLastCalledWith("enemy", 50, true);
      expect(cb.onEnemyDefeated).toHaveBeenCalledTimes(1);
      expect(cb.onEnemyDefeated).toHaveBeenCalledWith(s.getCurrentEnemy());
      expect(s.getCurrentEnemy()?.health).toBe(0);

      jest.advanceTimersByTime(THREE_MINUTES * 5);
      expect(s.hasPendingDamage()).toBe(false);
    });

    it("never lets rounding finish the beast before its last chore", () => {
      const tasks = Array.from({ length: 7 }, (_, i) => ({ id: `c${i}`, name: `Chore ${i}`, isCompleted: false }));
      const { service: s, cb } = fight(makeEnemy({ maxHealth: 10, health: 10, tasks }));
      tasks.slice(0, 6).forEach((task) => s.finishCombatTask(task.id));
      expect(s.getCurrentEnemy()?.health).toBeGreaterThan(0);
      expect(cb.onEnemyDefeated).not.toHaveBeenCalled();
      s.finishCombatTask("c6");
      expect(s.getCurrentEnemy()?.health).toBe(0);
      expect(cb.onEnemyDefeated).toHaveBeenCalledTimes(1);
    });

    it("steps the next beast forward in a multi-beast fight", () => {
      const { service: s, lines, cb } = fight();
      const second = makeEnemy({
        id: "b2",
        name: "Dustbunny",
        tasks: [{ id: "d1", name: "Sweep", isCompleted: false }],
      });
      s.initMultiBattle([makeEnemy(), second], [HERO_ID]);
      lines.length = 0;
      s.finishCombatTask("t1");
      s.finishCombatTask("t2");

      expect(cb.onEnemyDefeated).not.toHaveBeenCalled();
      expect(cb.onEnemyChange).toHaveBeenCalledWith(second);
      expect(s.getCurrentEnemy()?.name).toBe("Dustbunny");
      expect(s.getCombatTasks().map((task) => task.id)).toEqual(["d1"]);
      expect(textOf(lines)).toContain("Dustbunny steps forward!");
      expect(s.getAttackDuration()).toBe(THREE_MINUTES);
    });
  });

  describe("restoreCompletedTasks", () => {
    it("marks the chore done, hurts the beast, tells the page and says nothing", () => {
      const { service: s, lines, cb } = fight();
      cb.onCombatTasksChange.mockClear();
      cb.onEnemyHealthChange.mockClear();

      expect(s.restoreCompletedTasks(["t1"])).toBe(1);

      expect(s.getCombatTasks()[0].isCompleted).toBe(true);
      expect(s.getCurrentEnemy()?.health).toBe(50);
      expect(cb.onCombatTasksChange).toHaveBeenCalledTimes(1);
      expect(cb.onEnemyHealthChange).toHaveBeenCalledTimes(1);
      expect(cb.onDamage).not.toHaveBeenCalled();
      expect(lines).toEqual([]);
    });

    it("returns 0 and stays quiet when nothing matches", () => {
      const { service: s, cb } = fight();
      cb.onCombatTasksChange.mockClear();
      expect(s.restoreCompletedTasks(["nope"])).toBe(0);
      expect(s.restoreCompletedTasks([])).toBe(0);
      expect(s.getCurrentEnemy()?.health).toBe(100);
      expect(cb.onCombatTasksChange).not.toHaveBeenCalled();
    });

    it("counts a chore once and never defeats the beast", () => {
      const { service: s, cb } = fight();
      expect(s.restoreCompletedTasks(["t1", "t1"])).toBe(1);
      expect(s.restoreCompletedTasks(["t1"])).toBe(0);
      expect(s.restoreCompletedTasks(["t2"])).toBe(0); // the last open chore stays open
      expect(s.getCurrentEnemy()?.health).toBe(50);
      expect(cb.onEnemyDefeated).not.toHaveBeenCalled();
    });
  });

  describe("Defend", () => {
    it("braces, then takes one half-strength strike after a second", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.5);
      const { service: s, lines, cb } = fight();
      s.startAttackTimer();

      expect(s.handleBattleAction("defend")).toEqual({ success: true, message: "Defense activated" });
      expect(textOf(lines)).toEqual(["Max braces!"]);
      expect(s.isDefending()).toBe(true);
      expect(s.isPlayerTurn()).toBe(false);
      expect(s.hasPendingDamage()).toBe(false);

      jest.advanceTimersByTime(999);
      expect(s.hasPendingDamage()).toBe(false);
      jest.advanceTimersByTime(1);

      expect(textOf(lines)).toEqual(["Max braces!", "Socktopus attacks!"]);
      expect(s.getPendingDamage()).toBe(2);
      expect(cb.onAttack).toHaveBeenCalledTimes(1);
      // The brace holds until the hit lands, and the old clock does not fire a second strike
      expect(s.isDefending()).toBe(true);
      jest.advanceTimersByTime(THREE_MINUTES * 4);
      expect(textOf(lines).filter((text) => text === "Socktopus attacks!")).toHaveLength(1);
    });

    it("drops the brace when the hit lands, with a full clock and the hero on the move", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.5);
      const { service: s, lines, cb } = fight();
      s.handleBattleAction("defend");
      jest.advanceTimersByTime(1000);

      s.applyPendingDamage();

      expect(heroHp()).toBe(28);
      expect(s.isDefending()).toBe(false);
      expect(cb.onDefendStateChange).toHaveBeenLastCalledWith(false);
      expect(s.isPlayerTurn()).toBe(true);
      expect(textOf(lines)).toContain("Max braced: only 2 damage!");
      expect(s.getTimeRemaining()).toBe(2 * THREE_MINUTES);
      expect(s.getEnemyAttackTimer()).toBe(100);
      expect(s.getTurnCounter()).toBe(2);
    });

    it("stays quiet when a strike is already waiting", () => {
      const { service: s, lines } = fight();
      s.startAttackTimer();
      jest.advanceTimersByTime(2 * THREE_MINUTES);
      lines.length = 0;

      expect(s.handleBattleAction("defend")).toMatchObject({ success: false });
      expect(lines).toEqual([]);
      expect(s.isDefending()).toBe(false);
    });

    it("does not answer while it is not the hero's move", () => {
      const { service: s } = fight();
      s.handleBattleAction("defend");
      expect(s.handleBattleAction("defend")).toMatchObject({ success: false, message: "Not player's turn" });
    });
  });

  describe("Run Away", () => {
    const setHeroHp = (hp: number) => {
      (useUserStore().getUserById(HERO_ID) as any).stats.hp.now = hp;
    };

    it.each([
      ["a monster", {}],
      ["a miniboss", { type: "miniboss" }],
      ["a boss", { isBoss: true }],
    ])("always works against %s, whatever the roll", (_label, overrides) => {
      for (const roll of [0, 0.25, 0.5, 0.75, 0.99]) {
        jest.spyOn(Math, "random").mockReturnValue(roll);
        const { service: s } = fight(makeEnemy(overrides as Partial<Enemy>));
        s.startAttackTimer();
        expect(s.handleBattleAction("run")).toMatchObject({ success: true, message: "Escaped successfully" });
        s.dispose();
        jest.restoreAllMocks();
      }
    });

    it("has no failed-run path: nothing says 'Couldn't escape' and the hero never loses the move", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.99);
      const { service: s, lines } = fight(makeEnemy({ isBoss: true }));
      s.startAttackTimer();
      expect(s.handleBattleAction("run").success).toBe(true);
      expect(textOf(lines).join(" ")).not.toMatch(/Couldn't escape|blocks your path/);
      expect(s.isPlayerTurn()).toBe(true);
    });

    it("costs one strike on the way out, then the getaway: no second strike ever follows", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.5);
      const { service: s, lines, cb } = fight();
      s.startAttackTimer();

      const result = s.handleBattleAction("run");

      expect(result).toMatchObject({ success: true, message: "Escaped successfully" });
      expect(lines).toEqual([
        { text: "Running away...", auto: true },
        "Socktopus strikes as Max flees! Max takes 4 damage!",
        "Got away safely!",
      ]);
      expect(heroHp()).toBe(26);
      expect(cb.onDamage).toHaveBeenCalledTimes(1);
      expect(cb.onDamage).toHaveBeenCalledWith("player", 4);
      expect(cb.onPlayerDefeated).not.toHaveBeenCalled();

      jest.advanceTimersByTime(THREE_MINUTES * 5);
      expect(s.hasPendingDamage()).toBe(false);
      expect(cb.onAttack).not.toHaveBeenCalled();
      expect(heroHp()).toBe(26);
    });

    it("reports the parting strike on the result, for the page", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.5);
      const { service: s } = fight();
      expect(s.handleBattleAction("run").escape).toEqual({
        free: false,
        damage: 4,
        dodgedBy: null,
        softener: null,
        emptied: false,
        carriesQuest: false,
      });
    });

    it("hits a boss as hard as a boss hits: the strike is the beast's own", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.5);
      const { service: s } = fight(makeEnemy({ isBoss: true, attack: 20 }));
      s.handleBattleAction("run");
      expect(heroHp()).toBe(30 - strikeDamage(30, 20, false, 0.5));
    });

    describe("a free fight", () => {
      it("takes nothing: no strike, no damage, no line about one", () => {
        jest.spyOn(Math, "random").mockReturnValue(0.99);
        const { service: s, lines, cb } = fight(makeEnemy({ isBoss: true }), { freeFight: true });
        s.startAttackTimer();

        const result = s.handleBattleAction("run");

        expect(result).toMatchObject({ success: true, message: "Escaped successfully" });
        expect(result.escape).toMatchObject({ free: true, damage: 0, dodgedBy: null, emptied: false });
        expect(lines).toEqual([{ text: "Running away...", auto: true }, "Got away safely!"]);
        expect(heroHp()).toBe(30);
        expect(cb.onDamage).not.toHaveBeenCalled();
      });

      it("takes nothing after setFreeFight(true) either", () => {
        const { service: s, lines } = fight();
        s.setFreeFight(true);
        expect(s.handleBattleAction("run").success).toBe(true);
        expect(textOf(lines)).toEqual(["Running away...", "Got away safely!"]);
        expect(heroHp()).toBe(30);
      });
    });

    describe("softened", () => {
      it("a Thief slips most of it: half the strike through the brace factor", () => {
        jest.spyOn(Math, "random").mockReturnValue(0.5);
        const { service: s, lines } = fight(makeEnemy(), { passive: classPassive("Thief") });
        const result = s.handleBattleAction("run");
        expect(heroHp()).toBe(28);
        expect(textOf(lines)).toContain("Socktopus strikes as Max flees! Max slips most of it: only 2 damage!");
        expect(result.escape).toMatchObject({ damage: 2, softener: "slip", dodgedBy: null });
      });

      it("a hero who was bracing gets the brace factor too, once even when the class slips away", () => {
        jest.spyOn(Math, "random").mockReturnValue(0.5);
        const { service: s, lines, cb } = fight(makeEnemy(), { passive: classPassive("Thief") });
        s["setDefendingState"](true);

        const result = s.handleBattleAction("run");

        expect(heroHp()).toBe(28);
        expect(textOf(lines)).toContain("Socktopus strikes as Max flees! Max braced: only 2 damage!");
        expect(result.escape).toMatchObject({ damage: 2, softener: "brace" });
        expect(s.isDefending()).toBe(false);
        expect(cb.onDefendStateChange).toHaveBeenLastCalledWith(false);
      });

      it("a Warrior's wall lets a quarter of the parting strike through", () => {
        jest.spyOn(Math, "random").mockReturnValue(0.5);
        (useUserStore().getUserById(HERO_ID) as any).stats.hp = { now: 100, max: 100 };
        const { service: s } = fight(makeEnemy(), { passive: classPassive("Warrior") });
        s["setDefendingState"](true);
        s.handleBattleAction("run");
        expect(heroHp()).toBe(97);
      });
    });

    describe("dodged", () => {
      it("a Ninja's owed first strike hits only shadow, and nothing lands", () => {
        jest.spyOn(Math, "random").mockReturnValue(0.5);
        const { service: s, lines, cb } = fight(makeEnemy(), { passive: classPassive("Ninja") });
        const result = s.handleBattleAction("run");
        expect(heroHp()).toBe(30);
        expect(textOf(lines)).toEqual([
          "Running away...",
          "Socktopus strikes at a shadow! Max is already elsewhere.",
          "Got away safely!",
        ]);
        expect(cb.onDamage).not.toHaveBeenCalled();
        expect(result.escape).toMatchObject({ damage: 0, dodgedBy: "shadow" });
      });

      it("a frozen clock (Chronos) keeps the beast from striking", () => {
        const { service: s, lines } = fight();
        s.startAttackTimer();
        s.freezeClock(60_000);
        const result = s.handleBattleAction("run");
        expect(heroHp()).toBe(30);
        expect(textOf(lines)).toContain("Socktopus is frozen solid and cannot strike!");
        expect(result.escape).toMatchObject({ damage: 0, dodgedBy: "frozen" });
      });

      it("a Thor's Hammer skip is owed and used up", () => {
        const { service: s, lines } = fight();
        s.skipNextStrike();
        const result = s.handleBattleAction("run");
        expect(heroHp()).toBe(30);
        expect(textOf(lines)).toContain("Socktopus is stunned and misses its strike!");
        expect(s.getStrikeSkips()).toBe(0);
        expect(result.escape).toMatchObject({ damage: 0, dodgedBy: "hammer" });
      });

      it("trained agility dodges when the roll falls under the bonus, and takes the hit when it does not", () => {
        const nimble = { passive: { runChanceBonus: 0.2 } };

        jest.spyOn(Math, "random").mockReturnValue(0.1);
        const caught = fight(makeEnemy(), nimble);
        const dodged = caught.service.handleBattleAction("run");
        expect(heroHp()).toBe(30);
        expect(textOf(caught.lines)).toContain("Socktopus lunges, but Max is too quick to catch!");
        expect(dodged.escape).toMatchObject({ damage: 0, dodgedBy: "agility" });
        caught.service.dispose();

        jest.spyOn(Math, "random").mockReturnValue(0.3);
        const missed = fight(makeEnemy(), nimble);
        const hit = missed.service.handleBattleAction("run");
        const expected = strikeDamage(30, 10, false, 0.3);
        expect(heroHp()).toBe(30 - expected);
        expect(hit.escape).toMatchObject({ damage: expected, dodgedBy: null });
      });

      it("agility never dodges more than half the time, however much is trained", () => {
        jest.spyOn(Math, "random").mockReturnValue(0.6);
        const { service: s } = fight(makeEnemy(), { passive: { runChanceBonus: 3 } });
        expect(s.handleBattleAction("run").escape).toMatchObject({ dodgedBy: null });
        expect(heroHp()).toBeLessThan(30);
      });
    });

    describe("HP", () => {
      it("takes the hero to 0 when the strike empties HP: the escape report sends them to the Hospital", () => {
        jest.spyOn(Math, "random").mockReturnValue(0.5);
        const { service: s, lines, cb } = fight();
        setHeroHp(3); // the strike is 4; the store, not the stale fight copy, says how much HP is left

        const result = s.handleBattleAction("run");

        expect(heroHp()).toBe(0);
        expect(cb.onDamage).toHaveBeenCalledWith("player", 3);
        expect(cb.onPlayerDefeated).not.toHaveBeenCalled(); // the page reads the report; it is not a lost fight
        expect(textOf(lines)).toContain("Socktopus strikes as Max flees! Max staggers away... and wakes up in the Hospital.");
        expect(textOf(lines)).not.toContain("Got away safely!"); // a hero who woke up in the Hospital did not get away safely
        expect(result).toMatchObject({ success: true });
        expect(result.escape).toMatchObject({ damage: 3, emptied: true });
      });

      it("empties a hero already at 1 HP: any strike that lands is enough", () => {
        jest.spyOn(Math, "random").mockReturnValue(0.5);
        const { service: s, cb } = fight();
        setHeroHp(1);
        const result = s.handleBattleAction("run");
        expect(heroHp()).toBe(0);
        expect(cb.onDamage).toHaveBeenCalledWith("player", 1);
        expect(result.escape).toMatchObject({ damage: 1, emptied: true });
      });

      it("says 'Got away safely!' when the strike left HP above 0", () => {
        jest.spyOn(Math, "random").mockReturnValue(0.5);
        const { service: s, lines } = fight();
        s.handleBattleAction("run");
        expect(textOf(lines)).toContain("Got away safely!");
        expect(heroHp()).toBeGreaterThan(0);
      });

      it("a dodge costs nothing even at 1 HP, and is not 'emptied'", () => {
        const { service: s } = fight();
        setHeroHp(1);
        s.skipNextStrike();
        expect(s.handleBattleAction("run").escape).toMatchObject({ damage: 0, dodgedBy: "hammer", emptied: false });
        expect(heroHp()).toBe(1);
      });
    });

    describe("a fight that carries a quest", () => {
      it("says so on the escape, for the grudge (a later slice), whether the strike landed or not", () => {
        jest.spyOn(Math, "random").mockReturnValue(0.5);
        const landed = fight(makeEnemy(), { carriesQuest: true });
        expect(landed.service.handleBattleAction("run").escape).toMatchObject({ carriesQuest: true, damage: 4 });
        landed.service.dispose();

        const dodged = fight(makeEnemy(), { carriesQuest: true, passive: classPassive("Ninja") });
        expect(dodged.service.handleBattleAction("run").escape).toMatchObject({ carriesQuest: true, damage: 0 });
      });

      it("a free fight never carries one", () => {
        const { service: s } = fight(makeEnemy(), { freeFight: true });
        expect(s.handleBattleAction("run").escape?.carriesQuest).toBe(false);
      });
    });

    it("refuses while a strike is already on its way, and costs nothing", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.5);
      const { service: s } = fight();
      s.startAttackTimer();
      jest.advanceTimersByTime(2 * THREE_MINUTES);
      expect(s.hasPendingDamage()).toBe(true);

      expect(s.handleBattleAction("run")).toEqual({ success: false, message: "A strike is already on its way" });
      expect(heroHp()).toBe(30);
    });
  });

  describe("applyPendingDamage", () => {
    const pendingStrike = (rig: Rig) => {
      rig.service.startAttackTimer();
      jest.advanceTimersByTime(2 * THREE_MINUTES);
      expect(rig.service.hasPendingDamage()).toBe(true);
    };

    it("lowers the store's HP, tells the page, queues the line and restarts the clock", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.5);
      const rig = fight();
      pendingStrike(rig);
      rig.lines.length = 0;
      const { service: s, cb } = rig;

      s.applyPendingDamage();

      expect(heroHp()).toBe(26);
      expect(cb.onDamage).toHaveBeenCalledWith("player", 4);
      expect(textOf(rig.lines)).toEqual(["Max takes 4 damage!"]);
      expect(s.hasPendingDamage()).toBe(false);
      expect(s.isPlayerTurn()).toBe(true);
      expect(s.getTurnCounter()).toBe(2);
      expect(s.getTimeRemaining()).toBe(2 * THREE_MINUTES);
      expect(cb.onPlayerDefeated).not.toHaveBeenCalled();
    });

    it("does not strike twice if called again", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.5);
      const rig = fight();
      pendingStrike(rig);
      rig.service.applyPendingDamage();
      rig.service.applyPendingDamage();
      expect(heroHp()).toBe(26);
    });

    it("with nothing waiting just hands the move back and starts the clock", () => {
      const { service: s, cb } = fight();
      s.applyPendingDamage();
      expect(heroHp()).toBe(30);
      expect(cb.onDamage).not.toHaveBeenCalled();
      expect(s.isPlayerTurn()).toBe(true);
      expect(s.getTimeRemaining()).toBe(2 * THREE_MINUTES);
    });

    it("a boss on 30 HP takes 5 or 6", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.5);
      const rig = fight(makeEnemy({ isBoss: true, attack: 15 }));
      pendingStrike(rig);
      expect([5, 6]).toContain(rig.service.getPendingDamage());
    });

    it("falls with the HP: two lines, onPlayerDefeated, and the clock stays off", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.5);
      const rig = fight();
      (useUserStore().getUserById(HERO_ID) as any).stats.hp.now = 3;
      pendingStrike(rig);
      rig.lines.length = 0;

      rig.service.applyPendingDamage();

      expect(heroHp()).toBe(0);
      expect(textOf(rig.lines)).toEqual(["Max takes 4 damage!", "Max has fallen!", "You blacked out..."]);
      expect(rig.cb.onPlayerDefeated).toHaveBeenCalledTimes(1);
      expect(rig.service.isPlayerTurn()).toBe(true); // unchanged: the page ends the fight
      jest.advanceTimersByTime(THREE_MINUTES * 5);
      expect(rig.service.hasPendingDamage()).toBe(false);
    });
  });

  /**
   * A grudge (docs/Quest-Rooms-Spec.md 5.7): the beast of a quest the hero ran from before hits 25% harder a mark, three
   * marks at the most. The page sets the factor for the fight (the option, or setGrudge); it multiplies every strike of it.
   */
  describe("a grudge", () => {
    const strikeOnClock = (rig: Rig) => {
      rig.service.startAttackTimer();
      jest.advanceTimersByTime(2 * THREE_MINUTES);
      expect(rig.service.hasPendingDamage()).toBe(true);
    };

    beforeEach(() => {
      jest.spyOn(Math, "random").mockReturnValue(0.5);
    });

    it("starts at 1: no grudge, no change", () => {
      const rig = fight();
      expect(rig.service.getGrudge()).toBe(1);
      strikeOnClock(rig);
      expect(rig.service.getPendingDamage()).toBe(4);
    });

    it.each([
      [1.25, 5],
      [1.5, 6],
      [1.75, 7],
    ])("a factor of %s makes the clock's strike cost %i, not 4", (factor, damage) => {
      const rig = fight(makeEnemy(), { grudge: factor });
      expect(rig.service.getGrudge()).toBe(factor);
      strikeOnClock(rig);
      expect(rig.service.getPendingDamage()).toBe(damage);
      rig.service.applyPendingDamage();
      expect(heroHp()).toBe(30 - damage);
    });

    it("setGrudge sets it for the fight, and a clamp keeps it between 1 and 1.75", () => {
      const rig = fight();
      rig.service.setGrudge(1.5);
      expect(rig.service.getGrudge()).toBe(1.5);
      rig.service.setGrudge(5);
      expect(rig.service.getGrudge()).toBe(1.75);
      rig.service.setGrudge(0.2);
      expect(rig.service.getGrudge()).toBe(1);
      rig.service.setGrudge(Number.NaN);
      expect(rig.service.getGrudge()).toBe(1);
      rig.service.setGrudge(undefined);
      expect(rig.service.getGrudge()).toBe(1);
    });

    it("hits every strike of the fight, not only the first", () => {
      const rig = fight(makeEnemy(), { grudge: 1.75 });
      strikeOnClock(rig);
      rig.service.applyPendingDamage();
      expect(heroHp()).toBe(23);
      strikeOnClock(rig);
      rig.service.applyPendingDamage();
      expect(heroHp()).toBe(16);
    });

    it("hits the strike a Defend provokes, through the brace", () => {
      const rig = fight(makeEnemy(), { grudge: 1.75 });
      rig.service.handleBattleAction("defend");
      jest.advanceTimersByTime(1000);
      // 4 x 1.75 = 7, and half of it gets through the brace
      expect(rig.service.getPendingDamage()).toBe(3);
    });

    it("hits the parting strike when the hero runs, and the report says what it cost", () => {
      const { service: s, lines, cb } = fight(makeEnemy(), { grudge: 1.75, carriesQuest: true });
      s.startAttackTimer();

      const result = s.handleBattleAction("run");

      expect(result.escape).toMatchObject({ damage: 7, dodgedBy: null, carriesQuest: true });
      expect(heroHp()).toBe(23);
      expect(cb.onDamage).toHaveBeenCalledWith("player", 7);
      expect(textOf(lines)).toContain("Socktopus strikes as Max flees! Max takes 7 damage!");
    });

    it("can empty a hero the plain strike would have spared: 6 HP survives 4, not 7", () => {
      (useUserStore().getUserById(HERO_ID) as any).stats.hp.now = 6;
      const plain = fight();
      expect(plain.service.handleBattleAction("run").escape).toMatchObject({ damage: 4, emptied: false });
      plain.service.dispose();

      (useUserStore().getUserById(HERO_ID) as any).stats.hp.now = 6;
      const grudged = fight(makeEnemy(), { grudge: 1.75 });
      expect(grudged.service.handleBattleAction("run").escape).toMatchObject({ damage: 6, emptied: true });
      expect(heroHp()).toBe(0);
    });

    it("a dodged parting strike stays dodged", () => {
      const { service: s } = fight(makeEnemy(), { grudge: 1.75, passive: classPassive("Ninja") });
      expect(s.handleBattleAction("run").escape).toMatchObject({ damage: 0, dodgedBy: "shadow" });
      expect(heroHp()).toBe(30);
    });

    it("a free fight carries no grudge into its escape: it has no strike to make harder", () => {
      const { service: s } = fight(makeEnemy(), { freeFight: true, grudge: 1.75 });
      expect(s.handleBattleAction("run").escape).toMatchObject({ free: true, damage: 0 });
      expect(heroHp()).toBe(30);
    });

    it("sits beside the hero's trained strength: both apply", () => {
      // raw 4 x 0.75 x 1.75 = 5.25 -> 5
      const rig = fight(makeEnemy(), { grudge: 1.75, passive: { strikeFactor: 0.75 } });
      strikeOnClock(rig);
      expect(rig.service.getPendingDamage()).toBe(5);
    });
  });

  describe("turns and names", () => {
    it("startPlayerTurn only hands the move back, with no lines", () => {
      const { service: s, lines } = fight();
      s.endPlayerTurn();
      expect(s.isPlayerTurn()).toBe(false);
      s.startPlayerTurn();
      expect(s.isPlayerTurn()).toBe(true);
      expect(lines).toEqual([]);
    });

    it("calls the hero You when no hero joined the fight", () => {
      service = createBattleService();
      const lines: EngineMessage[] = [];
      service.registerCallbacks({ onDialogMessage: (messages) => void lines.push(...messages) });
      service.initMultiBattle([makeEnemy()]);
      service.handleBattleAction("defend");
      expect(textOf(lines)).toEqual(["You braces!"]);
    });

    it("does not read the logged-in user to find the hero's name", () => {
      (useUserStore().currentUser as any).name = { nick: "Somebody Else" };
      const { service: s, lines } = fight();
      s.handleBattleAction("defend");
      expect(textOf(lines)).toEqual(["Max braces!"]);
    });

    it("uses the hero's max HP from stats.hp.max for the strike", () => {
      jest.spyOn(Math, "random").mockReturnValue(0);
      (useUserStore().getUserById(HERO_ID) as any).stats.hp = { now: 150, max: 150 };
      const { service: s } = fight();
      s.startAttackTimer();
      jest.advanceTimersByTime(2 * THREE_MINUTES);
      expect(s.getPendingDamage()).toBe(16);
    });
  });

  describe("dispose", () => {
    it("cancels the clock and a strike that is on its way", () => {
      const { service: s, lines } = fight();
      s.startAttackTimer();
      s.handleBattleAction("defend");
      s.dispose();
      jest.advanceTimersByTime(THREE_MINUTES * 5);
      expect(s.hasPendingDamage()).toBe(false);
      expect(textOf(lines)).toEqual(["Max braces!"]);
    });
  });

  describe("battle items (engine hooks)", () => {
    const TEN_MINUTES = 10 * 60_000;
    const FIFTEEN_MINUTES = 15 * 60_000;
    const strikes = (lines: EngineMessage[]) => textOf(lines).filter((text) => text === "Socktopus attacks!").length;

    describe("extendClock (Ice Wand)", () => {
      it("adds the minutes to the deadline and to the bar's full length, so the bar fills back up", () => {
        const { service: s } = fight();
        s.startAttackTimer();
        jest.advanceTimersByTime(60_000);

        expect(s.extendClock(TEN_MINUTES)).toBe(true);

        expect(s.getTimeRemaining()).toBe(2 * THREE_MINUTES - 60_000 + TEN_MINUTES);
        expect(s.getAttackDuration()).toBe(2 * THREE_MINUTES + TEN_MINUTES);
        expect(s.getEnemyAttackTimer()).toBeLessThanOrEqual(100);
        // The beast strikes when the longer clock runs dry, not before
        jest.advanceTimersByTime(2 * THREE_MINUTES - 60_000 + 500);
        expect(s.hasPendingDamage()).toBe(false);
        jest.advanceTimersByTime(TEN_MINUTES);
        expect(s.hasPendingDamage()).toBe(true);
      });

      it("refuses while no clock is running or for a non-positive amount", () => {
        const { service: s } = fight();
        expect(s.extendClock(TEN_MINUTES)).toBe(false);
        expect(s.getTimeRemaining()).toBe(0);
        s.startAttackTimer();
        expect(s.extendClock(0)).toBe(false);
        expect(s.getAttackDuration()).toBe(2 * THREE_MINUTES);
        jest.advanceTimersByTime(2 * THREE_MINUTES + 500); // a strike is waiting: the clock is off
        expect(s.extendClock(TEN_MINUTES)).toBe(false);
      });
    });

    describe("freezeClock (Chronos' Clock)", () => {
      it("holds the bar still for the whole freeze and only then lets it run down to one strike", () => {
        const { service: s, lines } = fight();
        s.startAttackTimer();
        jest.advanceTimersByTime(60_000);
        const before = s.getTimeRemaining();

        expect(s.freezeClock(FIFTEEN_MINUTES)).toBe(true);
        expect(s.isClockFrozen()).toBe(true);

        jest.advanceTimersByTime(FIFTEEN_MINUTES - 1000);
        expect(s.getTimeRemaining()).toBe(before);
        expect(s.hasPendingDamage()).toBe(false);

        // The ice melts: the clock picks up where it stood
        jest.advanceTimersByTime(1000 + 60_000);
        expect(s.isClockFrozen()).toBe(false);
        expect(s.getTimeRemaining()).toBe(before - 60_000);
        jest.advanceTimersByTime(before);
        expect(strikes(lines)).toBe(1);
        expect(s.hasPendingDamage()).toBe(true);
      });

      it("a Defend under the ice is answered with a frozen beast, no hit and a fresh clock", () => {
        const { service: s, lines, cb } = fight();
        s.startAttackTimer();
        s.freezeClock(FIFTEEN_MINUTES);
        s.handleBattleAction("defend");
        jest.advanceTimersByTime(1500);

        expect(textOf(lines)).toEqual(["Max braces!", "Socktopus is frozen solid and cannot strike!"]);
        expect(cb.onAttack).not.toHaveBeenCalled();
        expect(s.hasPendingDamage()).toBe(false);
        expect(s.isDefending()).toBe(false);
        expect(s.isPlayerTurn()).toBe(true);
        expect(s.getAttackDuration()).toBe(2 * THREE_MINUTES);
        expect(s.getTimeRemaining()).toBe(2 * THREE_MINUTES);
        expect(heroHp()).toBe(30);
      });

      it("a second freeze adds to the first, and nothing happens with the clock off", () => {
        const { service: s } = fight();
        expect(s.freezeClock(FIFTEEN_MINUTES)).toBe(false);
        s.startAttackTimer();
        s.freezeClock(FIFTEEN_MINUTES);
        s.freezeClock(FIFTEEN_MINUTES);
        jest.advanceTimersByTime(2 * FIFTEEN_MINUTES - 1000);
        expect(s.isClockFrozen()).toBe(true);
        expect(s.getTimeRemaining()).toBe(2 * THREE_MINUTES);
      });
    });

    describe("skipNextStrike (Thor's Hammer)", () => {
      it("the next strike misses: no damage waits, the hero keeps the move and the clock restarts full", () => {
        const { service: s, lines, cb } = fight();
        s.skipNextStrike();
        expect(s.getStrikeSkips()).toBe(1);
        s.startAttackTimer();
        jest.advanceTimersByTime(2 * THREE_MINUTES + 500);

        expect(strikes(lines)).toBe(0);
        expect(textOf(lines)).toContain("Socktopus is stunned and misses its strike!");
        expect(cb.onAttack).not.toHaveBeenCalled();
        expect(s.hasPendingDamage()).toBe(false);
        expect(s.isPlayerTurn()).toBe(true);
        expect(s.getStrikeSkips()).toBe(0);
        expect(s.getAttackDuration()).toBe(2 * THREE_MINUTES);
        expect(s.getTimeRemaining()).toBe(2 * THREE_MINUTES - 500);

        // The hammer is spent: the strike after that lands
        jest.advanceTimersByTime(2 * THREE_MINUTES);
        expect(strikes(lines)).toBe(1);
        expect(s.hasPendingDamage()).toBe(true);
      });

      it("also stops the strike a Defend provokes, and lowers the brace", () => {
        const { service: s, cb } = fight();
        s.skipNextStrike();
        s.handleBattleAction("defend");
        jest.advanceTimersByTime(1500);
        expect(cb.onAttack).not.toHaveBeenCalled();
        expect(s.isDefending()).toBe(false);
        expect(s.hasPendingDamage()).toBe(false);
        expect(heroHp()).toBe(30);
      });
    });

    describe("postponeTask (Silver Arrow)", () => {
      it("removes the chore from the queue, takes its slice off the beast, and hands the chore back unfinished", () => {
        const { service: s, lines, cb } = fight();
        cb.onCombatTasksChange.mockClear();
        cb.onEnemyHealthChange.mockClear();

        const flown = s.postponeTask("t1");

        expect(flown).toEqual({ id: "t1", name: "Pair the socks", isCompleted: false });
        expect(s.getCombatTasks().map((task) => task.id)).toEqual(["t2"]);
        expect(s.getCombatTasks().some((task) => task.isCompleted)).toBe(false);
        expect(s.getCurrentEnemy()?.health).toBe(50);
        expect(cb.onCombatTasksChange).toHaveBeenCalledTimes(1);
        expect(cb.onEnemyHealthChange).toHaveBeenCalledTimes(1);
        expect(cb.onDamage).not.toHaveBeenCalled();
        expect(cb.onEnemyDefeated).not.toHaveBeenCalled();
        expect(lines).toEqual([]);
      });

      it("the chores that remain still end the fight exactly on the last one", () => {
        const tasks = Array.from({ length: 4 }, (_, i) => ({ id: `c${i}`, name: `Chore ${i}`, isCompleted: false }));
        const { service: s, cb } = fight(makeEnemy({ tasks }));
        expect(s.postponeTask("c1")).not.toBeNull();
        expect(s.getCurrentEnemy()?.health).toBe(75);

        s.finishCombatTask("c0");
        s.finishCombatTask("c2");
        expect(s.getCurrentEnemy()?.health).toBeGreaterThan(0);
        expect(cb.onEnemyDefeated).not.toHaveBeenCalled();
        s.finishCombatTask("c3");
        expect(s.getCurrentEnemy()?.health).toBe(0);
        expect(cb.onEnemyDefeated).toHaveBeenCalledTimes(1);
      });

      it("refuses an unknown chore, a finished chore and the last open chore", () => {
        const { service: s, cb } = fight();
        s.finishCombatTask("t1");
        cb.onCombatTasksChange.mockClear();

        expect(s.postponeTask("nope")).toBeNull();
        expect(s.postponeTask("t1")).toBeNull();
        expect(s.postponeTask("t2")).toBeNull(); // the fight needs one chore
        expect(s.getCombatTasks()).toHaveLength(2);
        expect(s.getCurrentEnemy()?.health).toBe(50);
        expect(cb.onCombatTasksChange).not.toHaveBeenCalled();
      });

      it("leaves the running clock alone and the finished chore unaffected", () => {
        const tasks = Array.from({ length: 3 }, (_, i) => ({ id: `c${i}`, name: `Chore ${i}`, isCompleted: false }));
        const { service: s } = fight(makeEnemy({ tasks }));
        s.startAttackTimer();
        jest.advanceTimersByTime(30_000);
        const remaining = s.getTimeRemaining();
        s.postponeTask("c1");
        expect(s.getTimeRemaining()).toBe(remaining);
        expect(s.getAttackDuration()).toBe(3 * THREE_MINUTES);
      });
    });

    describe("weakenEnemy (Sol's Flare)", () => {
      it("halves the beast's attack, so the next strike bites half as hard", () => {
        const { service: s } = fight();
        jest.spyOn(Math, "random").mockReturnValue(0.5);
        expect(s.weakenEnemy(0.5)).toBe(5);
        expect(s.getCurrentEnemy()?.attack).toBe(5);
        s.startAttackTimer();
        jest.advanceTimersByTime(2 * THREE_MINUTES + 500);
        expect(s.getPendingDamage()).toBe(strikeDamage(30, 5, false, 0.5));
        expect(s.getPendingDamage()).toBeLessThan(strikeDamage(30, 10, false, 0.5));
      });

      it("treats a missing attack as 10, never drops below 1, and ignores a bad factor", () => {
        const { service: s } = fight(makeEnemy({ attack: 0 }));
        expect(s.weakenEnemy(0)).toBe(0);
        expect(s.weakenEnemy(0.5)).toBe(5);
        expect(s.weakenEnemy(0.01)).toBe(1);
      });
    });

    describe("scaleCooldown (Fire Wand)", () => {
      it("every clock from now on earns 1.5x the minutes a chore; the running one is left alone", () => {
        const { service: s } = fight();
        s.startAttackTimer();
        expect(s.scaleCooldown(1.5)).toBe(1.5);
        expect(s.getAttackDuration()).toBe(2 * THREE_MINUTES);

        s.finishCombatTask("t1"); // one chore left: 1 * 4.5 min
        expect(s.getAttackDuration()).toBe(1.5 * THREE_MINUTES);
        expect(s.getTimeRemaining()).toBe(1.5 * THREE_MINUTES);
      });

      it("stacks, honours the beast's own cooldown, and resets for the next fight", () => {
        const { service: s } = fight(makeEnemy({ attackCooldown: 2 }));
        s.scaleCooldown(1.5);
        expect(s.scaleCooldown(2)).toBe(3);
        s.startAttackTimer();
        expect(s.getAttackDuration()).toBe(2 * 2 * 3 * 60_000);

        s.initMultiBattle([makeEnemy()], [HERO_ID]);
        s.startAttackTimer();
        expect(s.getAttackDuration()).toBe(2 * THREE_MINUTES);
      });
    });
  });

  describe("class passives (docs/Items-And-Classes-Contract.md, C)", () => {
    const hero100 = () => {
      (useUserStore().getUserById(HERO_ID) as any).stats.hp = { now: 100, max: 100 };
    };

    it("runs with the default rules when no passive is given", () => {
      const { service: s } = fight();
      expect(s.getPassive()).toEqual({
        braceFactor: 0.5,
        strikeFactor: 1,
        runChance: null,
        runChanceBonus: 0,
        cooldownMinutesBonus: 0,
        skipFirstStrike: false,
      });
    });

    it("Warrior: a braced strike lands at a quarter instead of half", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.5);
      hero100();
      const plain = fight();
      plain.service.handleBattleAction("defend");
      jest.advanceTimersByTime(1000);
      expect(plain.service.getPendingDamage()).toBe(6);
      plain.service.dispose();

      const { service: s, lines } = fight(makeEnemy(), { passive: classPassive("Warrior") });
      s.handleBattleAction("defend");
      jest.advanceTimersByTime(1000);
      expect(s.getPendingDamage()).toBe(3);
      s.applyPendingDamage();
      expect(textOf(lines)).toContain("Max braced: only 3 damage!");
      // An unbraced strike is the full 12 either way
      jest.advanceTimersByTime(2 * THREE_MINUTES);
      expect(s.getPendingDamage()).toBe(12);
    });

    it("Monk: every chore earns one more minute, on top of the beast's cooldown and the Fire Wand", () => {
      const { service: s } = fight(makeEnemy(), { passive: classPassive("Monk") });
      s.startAttackTimer();
      expect(s.getAttackDuration()).toBe(2 * 4 * 60_000);

      s.scaleCooldown(1.5);
      s.finishCombatTask("t1"); // one chore left: 3 * 1.5 + 1 = 5.5 min
      expect(s.getAttackDuration()).toBe(5.5 * 60_000);

      s.initMultiBattle([makeEnemy({ attackCooldown: 2 })], [HERO_ID]);
      s.startAttackTimer();
      expect(s.getAttackDuration()).toBe(2 * 3 * 60_000);
    });

    it("Ninja: the beast's first strike of every fight hits only shadow, then it strikes as usual", () => {
      jest.spyOn(Math, "random").mockReturnValue(0.5);
      const { service: s, lines, cb } = fight(makeEnemy(), { passive: classPassive("Ninja") });
      s.startAttackTimer();
      jest.advanceTimersByTime(2 * THREE_MINUTES);

      expect(s.hasPendingDamage()).toBe(false);
      expect(textOf(lines)).toContain("Socktopus strikes at a shadow! Max is already elsewhere.");
      expect(cb.onAttack).not.toHaveBeenCalled();
      expect(s.isPlayerTurn()).toBe(true);
      expect(s.getTimeRemaining()).toBe(2 * THREE_MINUTES);

      jest.advanceTimersByTime(2 * THREE_MINUTES);
      expect(s.hasPendingDamage()).toBe(true);
      expect(cb.onAttack).toHaveBeenCalledTimes(1);

      // A new fight owes a new miss; a Defend walks straight into it
      s.applyPendingDamage();
      s.initMultiBattle([makeEnemy()], [HERO_ID]);
      lines.length = 0;
      s.handleBattleAction("defend");
      jest.advanceTimersByTime(1000);
      expect(s.hasPendingDamage()).toBe(false);
      expect(s.isDefending()).toBe(false);
      expect(textOf(lines)).toEqual(["Max braces!", "Socktopus strikes at a shadow! Max is already elsewhere."]);
    });

    it("Sage and Paladin inherit their parents' engine rules", () => {
      expect(fight(makeEnemy(), { passive: classPassive("Sage") }).service.getPassive()).toMatchObject({
        cooldownMinutesBonus: 1,
        braceFactor: 0.5,
        runChance: null,
      });
      service?.dispose();
      expect(fight(makeEnemy(), { passive: classPassive("Paladin") }).service.getPassive()).toMatchObject({
        braceFactor: 0.25,
        skipFirstStrike: false,
      });
    });
  });
});
