import { addStrike, rewardKey, type Raid } from "@/lib/services/party/raidRules";
import { claimRows, isLootPaid, raidSummary, timeLeftLabel } from "@/lib/services/party/raidView";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const START = new Date(2026, 9, 28, 8, 0, 0);
const at = (days: number, hour = 9): string => new Date(2026, 9, 28 + days, hour, 0, 0).toISOString();

const raidWith = (strikes: [string, string, number, string][], over: Partial<Raid> = {}): Raid => {
  let raid: Raid = {
    id: "r1",
    partyId: "home",
    beastId: "b1",
    window: "standard",
    startedAt: START.toISOString(),
    maxHp: 300,
    memberIds: ["ana", "ben", "cam"],
    strikes: [],
    ...over,
  };
  for (const [key, heroId, damage, when] of strikes) raid = addStrike(raid, { key, heroId, damage, at: when });
  return raid;
};

const NAMES = { ana: "Ana", ben: "Ben", cam: "Cam" };

describe("timeLeftLabel", () => {
  const now = new Date(2026, 9, 28, 12, 0, 0);
  const left = (ms: number): string => timeLeftLabel(new Date(now.getTime() + ms), now);

  it("counts whole days from two days up", () => {
    expect(left(5 * DAY + 3 * HOUR)).toBe("5 days left");
    expect(left(2 * DAY)).toBe("2 days left");
  });

  it("counts hours under two days, rounding up", () => {
    expect(left(30 * HOUR)).toBe("30 hours left");
    expect(left(HOUR)).toBe("1 hour left");
    expect(left(90 * MINUTE)).toBe("2 hours left");
  });

  it("counts minutes under an hour, never saying 0", () => {
    expect(left(20 * MINUTE)).toBe("20 min left");
    expect(left(10 * 1000)).toBe("1 min left");
  });

  it("says time is up at the moment the window closes and after", () => {
    expect(left(0)).toBe("Time's up");
    expect(left(-HOUR)).toBe("Time's up");
  });
});

describe("raidSummary", () => {
  const during = new Date(START.getTime() + DAY);

  it("shows health as numbers and a percent", () => {
    const raid = raidWith([["k1", "ana", 60, at(0)]]);
    expect(raidSummary(raid, NAMES, during)).toMatchObject({ hp: 240, maxHp: 300, hpPercent: 80, status: "active" });
  });

  it("lists every member by damage dealt, those who have not struck included at zero", () => {
    const raid = raidWith([
      ["k1", "ben", 40, at(0)],
      ["k2", "ana", 60, at(0)],
    ]);
    const { ledger } = raidSummary(raid, NAMES, during);
    expect(ledger.map((row) => [row.name, row.damage])).toEqual([
      ["Ana", 60],
      ["Ben", 40],
      ["Cam", 0],
    ]);
  });

  it("sizes each bar against the top striker and marks the top striker", () => {
    const raid = raidWith([
      ["k1", "ana", 60, at(0)],
      ["k2", "ben", 30, at(0)],
    ]);
    const { ledger } = raidSummary(raid, NAMES, during);
    expect(ledger.map((row) => row.barPercent)).toEqual([100, 50, 0]);
    expect(ledger.map((row) => row.isTop)).toEqual([true, false, false]);
  });

  it("keeps a hero who left the party on the ledger, and calls an unknown hero Hero", () => {
    const raid = raidWith([["k1", "ana", 60, at(0)]], { memberIds: ["ana", "ben", "cam"] });
    const left = { ...raid, memberIds: ["ben", "cam"] };
    const { ledger } = raidSummary(left, { ben: "Ben" }, during);
    expect(ledger.map((row) => row.name)).toEqual(["Hero", "Ben", "Hero"]);
    expect(ledger[0].damage).toBe(60);
  });

  it("counts down only while the beast stands", () => {
    const raid = raidWith([["k1", "ana", 60, at(0)]]);
    expect(raidSummary(raid, NAMES, during).timeLeft).toBe("6 days left");
    const fled = raidSummary(raid, NAMES, new Date(START.getTime() + 8 * DAY));
    expect(fled).toMatchObject({ status: "retreated", timeLeft: "" });
  });

  it("names the top striker and the last hit once the beast is down", () => {
    const raid = raidWith(
      [
        ["k1", "ana", 60, at(0)],
        ["k2", "ben", 60, at(0)],
        ["k3", "ana", 60, at(1)],
        ["k4", "ben", 60, at(1)],
        ["k5", "cam", 60, at(1)],
      ],
      { maxHp: 290 }
    );
    expect(raidSummary(raid, NAMES, during)).toMatchObject({ status: "defeated", hp: 0, hpPercent: 0, lastHit: "Cam" });
    expect(raidSummary(raid, NAMES, during).topStriker).toBe("Ana");
  });

  it("shows no names while nobody has struck", () => {
    expect(raidSummary(raidWith([]), NAMES, during)).toMatchObject({ topStriker: "", lastHit: "" });
  });

  it("does not divide by a beast with no health", () => {
    expect(raidSummary(raidWith([], { maxHp: 0 }), NAMES, during).hpPercent).toBe(0);
  });
});

describe("claimRows", () => {
  const felled = (): Raid =>
    raidWith([
      ["k1", "ana", 60, at(0)],
      ["k2", "ben", 60, at(0)],
      ["k3", "ana", 60, at(1)],
      ["k4", "ben", 60, at(1)],
      ["k5", "ana", 60, at(2)],
    ]);

  it("lists each member who struck the fallen beast, and nobody who did not", () => {
    expect(claimRows(felled(), NAMES, []).map((row) => [row.heroId, row.name, row.isClaimed])).toEqual([
      ["ana", "Ana", false],
      ["ben", "Ben", false],
    ]);
  });

  it("marks the rewards already paid", () => {
    const rows = claimRows(felled(), NAMES, [rewardKey("r1", "ana")]);
    expect(rows.map((row) => row.isClaimed)).toEqual([true, false]);
  });

  it("lists nothing while the beast stands", () => {
    const standing = raidWith([["k1", "ana", 60, at(0)]]);
    expect(claimRows(standing, NAMES, [])).toEqual([]);
  });

  it("leaves out a hero who left the party before the beast fell", () => {
    const left = { ...felled(), memberIds: ["ana", "cam"] };
    expect(claimRows(left, NAMES, []).map((row) => row.heroId)).toEqual(["ana"]);
  });
});

describe("isLootPaid", () => {
  it("knows a raid's loot was paid when the hero's AP history names the raid", () => {
    const history = [
      { amount: 3, timestamp: "2026-10-27T09:00:00.000Z", source: "quest-1" },
      { amount: 5, timestamp: "2026-10-28T09:00:00.000Z", source: "raid:r1" },
    ];
    expect(isLootPaid({ stats: { ap: { history } } }, "r1")).toBe(true);
    expect(isLootPaid({ stats: { ap: { history } } }, "r2")).toBe(false);
  });

  it("says no for a hero with no AP history, or no record", () => {
    expect(isLootPaid(undefined, "r1")).toBe(false);
    expect(isLootPaid({}, "r1")).toBe(false);
    expect(isLootPaid({ stats: { ap: { history: [] } } }, "r1")).toBe(false);
  });
});
