import {
  DAILY_STRIKE_CAP,
  RAID_BASE_REWARD,
  RAID_DAYS,
  addStrike,
  cappedDamage,
  raidMaxHp,
  raidState,
  rewardFor,
  rewardKey,
  strikeDamage,
  type Raid,
  type RaidWindow,
  type Strike,
} from "@/lib/services/party/raidRules";

const DAY_MS = 24 * 60 * 60 * 1000;
const START = new Date(2026, 9, 28, 8, 0, 0);
/** A local time `days` after the raid started, as the ISO string a strike carries */
const when = (days: number, hour = 9): string => new Date(2026, 9, 28 + days, hour, 0, 0).toISOString();

const makeRaid = (over: Partial<Raid> = {}): Raid => ({
  id: "raid-1",
  partyId: "home",
  beastId: "beast-1",
  window: "standard",
  startedAt: START.toISOString(),
  maxHp: 100,
  memberIds: ["ana", "ben"],
  strikes: [],
  ...over,
});

const hit = (key: string, heroId: string, damage: number, at: string): Strike => ({ key, heroId, damage, at });

describe("raidRules", () => {
  describe("strikeDamage & cappedDamage", () => {
    it("turns a Fibonacci difficulty into ten damage per step", () => {
      expect(strikeDamage(1)).toBe(10);
      expect(strikeDamage(5)).toBe(50);
      expect(strikeDamage(13)).toBe(130);
    });

    it("rounds an off-scale difficulty to the nearest step, a tie going up", () => {
      expect(strikeDamage(4)).toBe(50);
      expect(strikeDamage(6)).toBe(50);
      expect(strikeDamage(100)).toBe(130);
    });

    it("gives a chore with no usable difficulty no damage", () => {
      expect(strikeDamage(0)).toBe(0);
      expect(strikeDamage(-3)).toBe(0);
      expect(strikeDamage(Number.NaN)).toBe(0);
    });

    it("trims a blow to what is left of the hero's day", () => {
      expect(cappedDamage(55, 30)).toBe(5);
      expect(cappedDamage(0, 200)).toBe(DAILY_STRIKE_CAP);
      expect(cappedDamage(DAILY_STRIKE_CAP, 10)).toBe(0);
      expect(cappedDamage(0, -5)).toBe(0);
    });
  });

  describe("raidMaxHp", () => {
    it("grows with the party and with the window", () => {
      expect(raidMaxHp("standard", 4)).toBeGreaterThan(raidMaxHp("standard", 2));
      expect(raidMaxHp("epic", 3)).toBeGreaterThan(raidMaxHp("quick", 3));
    });

    it("runs 3, 7 and 14 days", () => {
      expect(RAID_DAYS).toEqual({ quick: 3, standard: 7, epic: 14 });
    });

    it("never asks for more than the daily cap lets the party deal", () => {
      for (const window of Object.keys(RAID_DAYS) as RaidWindow[]) {
        for (let members = 1; members <= 8; members++) {
          expect(raidMaxHp(window, members)).toBeLessThanOrEqual(DAILY_STRIKE_CAP * RAID_DAYS[window] * members);
        }
      }
    });

    it("sizes a party of nobody like a party of one", () => {
      expect(raidMaxHp("quick", 0)).toBe(raidMaxHp("quick", 1));
      expect(raidMaxHp("quick", Number.NaN)).toBe(raidMaxHp("quick", 1));
    });
  });

  describe("addStrike", () => {
    it("adds a member's strike without touching the original raid", () => {
      const raid = makeRaid();
      const next = addStrike(raid, hit("k1", "ana", 30, when(0)));
      expect(next.strikes).toHaveLength(1);
      expect(raid.strikes).toHaveLength(0);
    });

    it("counts a strike key once however often it arrives", () => {
      const first = addStrike(makeRaid(), hit("k1", "ana", 30, when(0)));
      const again = addStrike(first, hit("k1", "ana", 30, when(0)));
      expect(again).toBe(first);
      expect(again.strikes).toHaveLength(1);
    });

    it("ignores a hero who is not in the raid", () => {
      const raid = makeRaid();
      expect(addStrike(raid, hit("k1", "cam", 30, when(0)))).toBe(raid);
    });

    it("lets a hero deal only the daily cap per raid, then a new day starts fresh", () => {
      let raid = makeRaid({ maxHp: 1000 });
      raid = addStrike(raid, hit("k1", "ana", 40, when(0, 9)));
      raid = addStrike(raid, hit("k2", "ana", 40, when(0, 12)));
      expect(raid.strikes.map((s) => s.damage)).toEqual([40, DAILY_STRIKE_CAP - 40]);
      const capped = addStrike(raid, hit("k3", "ana", 40, when(0, 15)));
      expect(capped).toBe(raid);
      const nextDay = addStrike(raid, hit("k4", "ana", 40, when(1, 9)));
      expect(nextDay.strikes[nextDay.strikes.length - 1].damage).toBe(40);
    });

    it("keeps one hero's cap from touching another's", () => {
      let raid = makeRaid({ maxHp: 1000 });
      raid = addStrike(raid, hit("k1", "ana", 200, when(0)));
      raid = addStrike(raid, hit("k2", "ben", 30, when(0)));
      expect(raid.strikes.map((s) => [s.heroId, s.damage])).toEqual([
        ["ana", DAILY_STRIKE_CAP],
        ["ben", 30],
      ]);
    });

    it("trims the last blow to the beast's remaining health and closes the raid", () => {
      let raid = makeRaid({ maxHp: 100, memberIds: ["ana", "ben", "cam"] });
      raid = addStrike(raid, hit("k1", "ana", 50, when(0)));
      raid = addStrike(raid, hit("k2", "ben", 40, when(0)));
      raid = addStrike(raid, hit("k3", "cam", 30, when(0)));
      expect(raid.strikes[raid.strikes.length - 1].damage).toBe(10);
      const late = addStrike(raid, hit("k4", "ana", 10, when(1)));
      expect(late).toBe(raid);
    });

    it("ignores a strike from before the raid began and one at or after its end", () => {
      const raid = makeRaid();
      expect(addStrike(raid, hit("k1", "ana", 30, new Date(START.getTime() - 1).toISOString()))).toBe(raid);
      const end = new Date(START.getTime() + 7 * DAY_MS).toISOString();
      expect(addStrike(raid, hit("k2", "ana", 30, end))).toBe(raid);
      const justBefore = new Date(START.getTime() + 7 * DAY_MS - 1).toISOString();
      expect(addStrike(raid, hit("k3", "ana", 30, justBefore)).strikes).toHaveLength(1);
    });

    it("ignores a blow with no damage or no real time", () => {
      const raid = makeRaid();
      expect(addStrike(raid, hit("k1", "ana", 0, when(0)))).toBe(raid);
      expect(addStrike(raid, hit("k2", "ana", -5, when(0)))).toBe(raid);
      expect(addStrike(raid, hit("k3", "ana", 30, "not a date"))).toBe(raid);
    });
  });

  describe("raidState", () => {
    it("starts active at full health", () => {
      expect(raidState(makeRaid(), new Date(START.getTime() + DAY_MS))).toMatchObject({ hp: 100, status: "active" });
    });

    it("subtracts every strike and names the top striker so far", () => {
      let raid = makeRaid();
      raid = addStrike(raid, hit("k1", "ana", 30, when(0)));
      raid = addStrike(raid, hit("k2", "ben", 20, when(0)));
      const state = raidState(raid, new Date(START.getTime() + DAY_MS));
      expect(state).toMatchObject({ hp: 50, status: "active", topStriker: "ana" });
      expect(state.lastHit).toBeUndefined();
    });

    it("is defeated at zero health, with the last hit and the top striker named", () => {
      let raid = makeRaid({ maxHp: 100 });
      raid = addStrike(raid, hit("k1", "ana", 60, when(0)));
      raid = addStrike(raid, hit("k2", "ben", 30, when(0)));
      raid = addStrike(raid, hit("k3", "ben", 30, when(1)));
      expect(raid.strikes.reduce((sum, s) => sum + s.damage, 0)).toBe(100);
      const state = raidState(raid, new Date(START.getTime() + 2 * DAY_MS));
      expect(state).toMatchObject({ hp: 0, status: "defeated", topStriker: "ana", lastHit: "ben" });
    });

    it("breaks a tie for top striker toward the hero who struck first", () => {
      let raid = makeRaid();
      raid = addStrike(raid, hit("k1", "ben", 20, when(0, 9)));
      raid = addStrike(raid, hit("k2", "ana", 20, when(0, 10)));
      expect(raidState(raid, new Date(START.getTime() + DAY_MS)).topStriker).toBe("ben");
    });

    it("retreats exactly when the window closes with the beast still standing", () => {
      const raid = addStrike(makeRaid(), hit("k1", "ana", 30, when(0)));
      const end = START.getTime() + 7 * DAY_MS;
      expect(raidState(raid, new Date(end - 1)).status).toBe("active");
      expect(raidState(raid, new Date(end))).toMatchObject({ status: "retreated", hp: 70 });
    });

    it("stays defeated after the window when the beast fell inside it", () => {
      let raid = makeRaid({ maxHp: 50 });
      raid = addStrike(raid, hit("k1", "ana", 50, when(0)));
      expect(raidState(raid, new Date(START.getTime() + 30 * DAY_MS)).status).toBe("defeated");
    });
  });

  describe("rewardKey", () => {
    it("names one hero's reward from one raid", () => {
      expect(rewardKey("r1", "ana")).toBe("raid:r1:ana");
    });
  });

  describe("rewardFor", () => {
    const defeated = (): Raid => {
      let raid = makeRaid({ maxHp: 100, memberIds: ["ana", "ben", "cam"] });
      raid = addStrike(raid, hit("k1", "ana", 60, when(0)));
      raid = addStrike(raid, hit("k2", "ben", 10, when(0)));
      raid = addStrike(raid, hit("k3", "ana", 60, when(1)));
      return raid;
    };

    it("pays every striker the same base reward, one blow or many", () => {
      const raid = defeated();
      expect(rewardFor(raid, "ana")).toEqual(RAID_BASE_REWARD);
      expect(rewardFor(raid, "ben")).toEqual(RAID_BASE_REWARD);
    });

    it("pays nothing to a member who never struck", () => {
      expect(rewardFor(defeated(), "cam")).toBeNull();
    });

    it("keeps a departed hero's strikes on the beast but pays them no reward", () => {
      const raid = { ...defeated(), memberIds: ["ana", "cam"] };
      expect(raidState(raid, new Date(START.getTime() + DAY_MS)).hp).toBe(0);
      expect(rewardFor(raid, "ben")).toBeNull();
      expect(rewardFor(raid, "ana")).toEqual(RAID_BASE_REWARD);
    });

    it("pays nothing while the beast still stands", () => {
      const raid = addStrike(makeRaid(), hit("k1", "ana", 30, when(0)));
      expect(rewardFor(raid, "ana")).toBeNull();
    });

    it("hands back a copy so a caller cannot change the base reward", () => {
      const reward = rewardFor(defeated(), "ana");
      expect(reward).not.toBe(RAID_BASE_REWARD);
    });
  });
});
