import { createPinia, setActivePinia } from "pinia";
import {
  bribeBaseCost,
  bribeWealthSurcharge,
  calculateBribeQuotes,
} from "@/lib/services/battle/battleService/bribeMath";
import { createBattleService } from "@/lib/services/battle";
import type { Enemy, BattleServiceOptions } from "@/lib/services/battle/battleService/types";
import { useUserStore } from "@/lib/store/stores/user";
import type { EngineMessage } from "@/app/Console/BattleField/battle/battleView";

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

const HERO_ID = "hero-bribe";

const makeEnemy = (overrides: Partial<Enemy> = {}): Enemy => ({
  id: "test-goblin",
  name: "Greedy Goblin",
  type: "beast",
  isBoss: false,
  health: 50,
  maxHealth: 50,
  attack: 10,
  defense: 5,
  speed: 5,
  attackCooldown: 3,
  tasks: [{ id: "task-1", name: "Wash dishes", isCompleted: false }],
  ...overrides,
});

describe("Battle Escape Bribe Mechanics", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("bribeMath pure calculations", () => {
    it("bribeBaseCost scales with enemy attack with minimum of 5", () => {
      expect(bribeBaseCost(0)).toBe(5);
      expect(bribeBaseCost(2)).toBe(5);
      expect(bribeBaseCost(10)).toBe(15);
      expect(bribeBaseCost(20)).toBe(30);
    });

    it("bribeWealthSurcharge takes 5% of combined wallet and savings", () => {
      expect(bribeWealthSurcharge(0, 0)).toBe(0);
      expect(bribeWealthSurcharge(100, 100)).toBe(10); // 200 * 0.05
      expect(bribeWealthSurcharge(500, 1500)).toBe(100); // 2000 * 0.05
    });

    it("scales higher the richer the user becomes", () => {
      const enemy = makeEnemy({ attack: 10 }); // base 15
      const poorHero = { wallet: 50, savings: 0 }; // surcharge 2 -> base 17
      const richHero = { wallet: 500, savings: 500 }; // surcharge 50 -> base 65

      const poorQuotes = calculateBribeQuotes(enemy, poorHero, 0);
      const richQuotes = calculateBribeQuotes(enemy, richHero, 0);

      expect(poorQuotes.fullCost).toBe(17);
      expect(richQuotes.fullCost).toBe(65);
      expect(richQuotes.fullCost).toBeGreaterThan(poorQuotes.fullCost);
    });

    it("scales higher for enemies that hold grudge marks", () => {
      const enemy = makeEnemy({ attack: 10 });
      const hero = { wallet: 100, savings: 0 }; // base 15 + surcharge 5 = 20

      const quotes0 = calculateBribeQuotes(enemy, hero, 0);
      const quotes1 = calculateBribeQuotes(enemy, hero, 1);
      const quotes2 = calculateBribeQuotes(enemy, hero, 2);
      const quotes3 = calculateBribeQuotes(enemy, hero, 3);

      expect(quotes0.fullCost).toBe(20);
      expect(quotes1.fullCost).toBe(30); // 20 * 1.5
      expect(quotes2.fullCost).toBe(40); // 20 * 2.0
      expect(quotes3.fullCost).toBe(50); // 20 * 2.5
    });

    it("lowCost provides a 50% discount below the formula", () => {
      const enemy = makeEnemy({ attack: 10 });
      const hero = { wallet: 100, savings: 0 };
      const quotes = calculateBribeQuotes(enemy, hero, 0);

      expect(quotes.fullCost).toBe(20);
      expect(quotes.lowCost).toBe(10);
    });

    it("correctly identifies when hero can or cannot afford tiers", () => {
      const enemy = makeEnemy({ attack: 10 }); // base 15
      const heroBroke = { wallet: 5, savings: 0 }; // low 8, full 15
      const heroMid = { wallet: 10, savings: 0 };
      const heroLoaded = { wallet: 100, savings: 0 }; // low 10, full 20

      expect(calculateBribeQuotes(enemy, heroBroke, 0).canAffordLow).toBe(false);
      expect(calculateBribeQuotes(enemy, heroBroke, 0).canAffordFull).toBe(false);

      expect(calculateBribeQuotes(enemy, heroMid, 0).canAffordLow).toBe(true);
      expect(calculateBribeQuotes(enemy, heroMid, 0).canAffordFull).toBe(false);

      expect(calculateBribeQuotes(enemy, heroLoaded, 0).canAffordLow).toBe(true);
      expect(calculateBribeQuotes(enemy, heroLoaded, 0).canAffordFull).toBe(true);
    });
  });

  describe("BattleService bribe execution", () => {
    let userStore: ReturnType<typeof useUserStore>;

    const startFight = (enemy: Enemy = makeEnemy(), options?: BattleServiceOptions) => {
      const service = createBattleService(options);
      const lines: EngineMessage[] = [];
      service.registerCallbacks({
        onDialogMessage: (messages) => void lines.push(...messages),
      });
      service.initMultiBattle([enemy], [HERO_ID]);
      return { service, lines };
    };

    beforeEach(() => {
      userStore = useUserStore();
      userStore.addUser({
        id: HERO_ID,
        name: { nick: "Robin" },
        jobClass: "thief",
        stats: {
          level: 5,
          hp: { now: 50, max: 50 },
          mp: { now: 30, max: 30 },
          gp: { wallet: 200, savings: 100, debt: 0, hospitalBill: 0, limit: 1000 },
        },
      });
      userStore.currentUser = userStore.users[HERO_ID];
    });

    it("getBribeQuotes returns live quotes for active enemy and hero", () => {
      const enemy = makeEnemy({ attack: 10 });
      const { service } = startFight(enemy);

      const quotes = service.getBribeQuotes();
      expect(quotes).not.toBeNull();
      expect(quotes?.fullCost).toBeGreaterThan(0);
      expect(quotes?.canAffordFull).toBe(true);
    });

    it("handleBattleAction('bribe-full') charges full cost and escapes without damage", () => {
      const enemy = makeEnemy({ attack: 10 });
      const { service, lines } = startFight(enemy, { carriesQuest: true });

      const quotes = service.getBribeQuotes()!;
      const startWallet = userStore.users[HERO_ID].stats.gp.wallet;

      const result = service.handleBattleAction("bribe-full");
      expect(result.success).toBe(true);
      expect(result.escape).toMatchObject({
        bribed: true,
        bribeTier: "full",
        bribeCost: quotes.fullCost,
        damage: 0,
        emptied: false,
        carriesQuest: true,
      });

      // Wallet updated
      expect(userStore.users[HERO_ID].stats.gp.wallet).toBe(startWallet - quotes.fullCost);
      // Hero took no damage
      expect(userStore.users[HERO_ID].stats.hp.now).toBe(50);
      // Dialog queued
      expect(lines.map((l) => (typeof l === "string" ? l : l.text))).toEqual([
        `Robin bribed Greedy Goblin with ${quotes.fullCost} GP!`,
        "Greedy Goblin happily took the gold and let them pass!",
        "Got away safely!",
      ]);
    });

    it("handleBattleAction('bribe-low') charges low cost and escapes with low tier report", () => {
      const enemy = makeEnemy({ attack: 10 });
      const { service, lines } = startFight(enemy, { carriesQuest: true });

      const quotes = service.getBribeQuotes()!;
      const startWallet = userStore.users[HERO_ID].stats.gp.wallet;

      const result = service.handleBattleAction("bribe-low");
      expect(result.success).toBe(true);
      expect(result.escape).toMatchObject({
        bribed: true,
        bribeTier: "low",
        bribeCost: quotes.lowCost,
        damage: 0,
        emptied: false,
        carriesQuest: true,
      });

      expect(userStore.users[HERO_ID].stats.gp.wallet).toBe(startWallet - quotes.lowCost);
      expect(userStore.users[HERO_ID].stats.hp.now).toBe(50);
      expect(lines.map((l) => (typeof l === "string" ? l : l.text))).toEqual([
        `Robin tossed only ${quotes.lowCost} GP to Greedy Goblin!`,
        "Greedy Goblin snatched the coins with a glare and holds a grudge!",
        "Got away safely!",
      ]);
    });

    it("refuses bribe when player cannot afford the cost", () => {
      userStore.users[HERO_ID].stats.gp.wallet = 2; // too poor
      userStore.users[HERO_ID].stats.gp.savings = 0;

      const enemy = makeEnemy({ attack: 10 });
      const { service } = startFight(enemy);

      const result = service.handleBattleAction("bribe-full");
      expect(result.success).toBe(false);
      expect(result.message).toBe("Not enough GP for bribe");
    });
  });
});
