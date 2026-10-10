import {
  abilityFigures,
  apHistoryTotals,
  averageQuestReward,
  beastFigures,
  compact,
  compendiumStats,
  countDistinctIds,
  experienceFigures,
  goldFigures,
  heroesOf,
  layoutOf,
  periodStarts,
  questLogTotals,
  templeFigures,
  totalsByPeriod,
  uniqueTemples,
  vitalsFigures,
  type BeastLike,
  type HeroLike,
  type QuestLike,
  type QuestLogLike,
  type TempleLike,
} from "@/lib/services/stats/CompendiumStats";

// Saturday 10 October 2026, noon, local time (the figures count local calendar days)
const NOW = new Date(2026, 9, 10, 12, 0, 0);
const at = (month: number, day: number, hour = 10): string => new Date(2026, month - 1, day, hour).toISOString();

const ada: HeroLike = {
  id: "ada",
  stats: {
    level: 3,
    hp: { now: 20, max: 40 },
    mp: { now: 10, max: 10 },
    gp: { wallet: 100, savings: 50 },
    xp: { now: 300 },
    ap: {
      total: 20,
      history: [
        { amount: 5, timestamp: at(10, 10, 9) },
        { amount: 10, timestamp: at(10, 7) },
        { amount: 5, timestamp: at(9, 20) },
      ],
    },
  },
};
const ben: HeroLike = {
  id: "ben",
  stats: {
    level: 1,
    hp: { now: 40, max: 40 },
    mp: { now: 0, max: 20 },
    gp: { wallet: 40, savings: 10 },
    xp: { now: 100 },
    ap: { total: 0 },
  },
};
// A Game Master: never counted
const mom: HeroLike = {
  id: "mom",
  isAdult: true,
  stats: { level: 40, hp: { now: 999, max: 999 }, gp: { wallet: 99999, savings: 99999 }, xp: { now: 99999 }, ap: { total: 9999 } },
};

const quests: QuestLike[] = [
  { id: "q1", xp: 10, gp: 5, ap: 1 },
  { id: "q2", xp: 20, gp: 10, ap: 2, beastId: "2" },
  { id: "q3", xp: 1000, gp: 1000, ap: 1000, draft: true, beastId: "b1" },
  { id: 4, xp: 0, gp: 0, ap: 0, beastId: "gone" },
];

const entry = (questId: string, userId: string, completedAt: string, status = "approved"): QuestLogLike => {
  const rewards = { q1: { xp: 10, gp: 5, ap: 1 }, q2: { xp: 20, gp: 10, ap: 2 } }[questId];
  return { questId, userId, completedAt, status, rewards };
};
const questLog: QuestLogLike[] = [
  entry("q1", "ada", at(10, 10, 8)), // today
  entry("q2", "ada", at(10, 7)), // three days ago
  entry("q2", "ben", at(10, 3)), // seven days ago: this month, not the last seven days
  entry("q1", "ben", at(9, 30)), // last month
  entry("q1", "ben", at(10, 10, 7), "pending"),
  entry("q1", "ben", at(10, 10, 6), "rejected"),
  entry("q1", "mom", at(10, 10, 8)), // an adult
  entry("q1", "ghost", at(10, 10, 8)), // a profile that is gone
  entry("q1", "ada", at(10, 11)), // tomorrow: a clock that ran ahead
];

const beasts: BeastLike[] = [
  { id: "b1", checklist: ["a", "b", "c"], achievementIds: ["q1"] },
  { id: 2, checklist: ["a"] },
  { id: "b3", checklist: [] },
];

const templeFlat: TempleLike = {
  id: "t1",
  dungeonLayout: {
    maze: [
      ["a", "b"],
      ["c", "w"],
    ],
    rooms: { a: { type: "monster" }, b: { type: "boss" }, c: { type: "loot" }, w: { type: "wall" } },
  },
};
const templeFloors: TempleLike = {
  id: "t2",
  dungeonLayout: {
    maze: { "1F": [["m", "x"]], "2F": [["s", "m"]] },
    rooms: { m: { type: "miniboss" }, s: { type: "secret" } },
  },
};
const templeTopLevel: TempleLike = {
  id: "t3",
  maze: [["k", "constructor", "toString"]],
  rooms: { k: { type: "loot" } },
};
const templeBare: TempleLike = { id: "t4" };

/** Every number anywhere in a figure object. */
const numbersIn = (value: unknown): number[] => {
  if (typeof value === "number") return [value];
  if (value && typeof value === "object") return Object.values(value).flatMap(numbersIn);
  return [];
};
const expectCleanNumbers = (value: unknown) => {
  const numbers = numbersIn(value);
  expect(numbers.length).toBeGreaterThan(0);
  for (const number of numbers) {
    expect(Number.isFinite(number)).toBe(true);
    expect(number).toBeGreaterThanOrEqual(0);
  }
};

describe("heroesOf", () => {
  it("keeps every profile that is not an adult and skips empty slots", () => {
    const kid = { id: "kid", isAdult: false };
    expect(heroesOf([ada, mom, null, undefined, ben, kid])).toEqual([ada, ben, kid]);
    expect(heroesOf([])).toEqual([]);
  });
});

describe("periods", () => {
  it("starts today, the last seven days and the month at local midnight", () => {
    const starts = periodStarts(NOW);
    expect(new Date(starts.today)).toEqual(new Date(2026, 9, 10));
    expect(new Date(starts.week)).toEqual(new Date(2026, 9, 4));
    expect(new Date(starts.month)).toEqual(new Date(2026, 9, 1));
  });

  it("sorts amounts into today, the week and the month", () => {
    const totals = totalsByPeriod(
      [
        { at: at(10, 10, 9), amount: 1 },
        { at: at(10, 5), amount: 10 },
        { at: at(10, 4, 0), amount: 100 }, // the first moment of the week still counts
        { at: at(10, 3), amount: 1000 },
        { at: at(9, 30), amount: 10000 },
      ],
      NOW
    );
    expect(totals).toEqual({ today: 1, week: 111, month: 1111 });
  });

  it("leaves out the future, unparseable dates and missing dates", () => {
    const totals = totalsByPeriod(
      [
        { at: at(10, 11), amount: 5 },
        { at: "not a date", amount: 5 },
        { at: undefined, amount: 5 },
        { at: null, amount: 5 },
      ],
      NOW
    );
    expect(totals).toEqual({ today: 0, week: 0, month: 0 });
  });

  it("stays at zero for a clock that is not a date", () => {
    expect(totalsByPeriod([{ at: at(10, 10, 9), amount: 5 }], new Date(NaN))).toEqual({ today: 0, week: 0, month: 0 });
  });
});

describe("questLogTotals", () => {
  const heroes = heroesOf([ada, ben, mom]);

  it("adds up approved completions by the heroes in each period", () => {
    expect(questLogTotals(questLog, heroes, "gp", NOW)).toEqual({ today: 5, week: 15, month: 25 });
    expect(questLogTotals(questLog, heroes, "xp", NOW)).toEqual({ today: 10, week: 30, month: 50 });
    expect(questLogTotals(questLog, heroes, "ap", NOW)).toEqual({ today: 1, week: 3, month: 5 });
  });

  it("counts nothing for held, voided, adult, unknown-hero or malformed entries", () => {
    const odd: QuestLogLike[] = [
      { questId: "q1", userId: "ada", completedAt: at(10, 10, 8), status: "approved" }, // no rewards
      { questId: "q1", userId: "ada", completedAt: at(10, 10, 8), status: "approved", rewards: { gp: -50, xp: NaN } },
    ];
    expect(questLogTotals(odd, heroes, "gp", NOW)).toEqual({ today: 0, week: 0, month: 0 });
    expect(questLogTotals([null, undefined], heroes, "gp", NOW)).toEqual({ today: 0, week: 0, month: 0 });
  });

  it("counts nothing when there are no heroes", () => {
    expect(questLogTotals(questLog, [], "xp", NOW).month).toBe(0);
  });
});

describe("apHistoryTotals", () => {
  it("adds up the AP gains the heroes' profiles recorded", () => {
    expect(apHistoryTotals(heroesOf([ada, ben, mom]), NOW)).toEqual({ today: 5, week: 15, month: 15 });
  });

  it("is zero for heroes without a history", () => {
    expect(apHistoryTotals([ben, { id: "x" }, { id: "y", stats: null }], NOW)).toEqual({ today: 0, week: 0, month: 0 });
  });
});

describe("averageQuestReward", () => {
  it("averages the posted rate over the quests a hero can see", () => {
    // q1, q2 and the free quest; the draft is not on the board
    expect(averageQuestReward(quests, "xp")).toBe(10);
    expect(averageQuestReward(quests, "gp")).toBe(5);
    expect(averageQuestReward(quests, "ap")).toBe(1);
  });

  it("rounds to a whole number", () => {
    expect(averageQuestReward([{ xp: 1 }, { xp: 2 }], "xp")).toBe(2);
    expect(averageQuestReward([{ xp: 1 }, { xp: 1 }, { xp: 2 }], "xp")).toBe(1);
  });

  it("treats a missing or broken rate as zero and an empty board as zero", () => {
    expect(averageQuestReward([{ id: "a" }, { xp: "abc" as unknown as number }, { xp: 9 }], "xp")).toBe(3);
    expect(averageQuestReward([], "gp")).toBe(0);
    expect(averageQuestReward([{ draft: true, gp: 50 }], "gp")).toBe(0);
  });
});

describe("vitalsFigures", () => {
  it("averages HP, MP and level across the heroes", () => {
    const vitals = vitalsFigures(heroesOf([ada, ben, mom]));
    expect(vitals).toMatchObject({
      heroes: 2,
      avgHp: 30,
      avgMaxHp: 40,
      avgMp: 5,
      avgMaxMp: 15,
      avgLevel: 2,
      wounded: 1,
    });
    expect(vitals.hpFill).toBeCloseTo(0.75);
    expect(vitals.mpFill).toBeCloseTo(1 / 3);
  });

  it("is all zeros for an empty family", () => {
    expect(vitalsFigures([])).toEqual({
      heroes: 0,
      avgHp: 0,
      avgMaxHp: 0,
      hpFill: 0,
      avgMp: 0,
      avgMaxMp: 0,
      mpFill: 0,
      avgLevel: 0,
      wounded: 0,
    });
  });

  it("does not divide by a hero's empty max HP", () => {
    const vitals = vitalsFigures([{ id: "x", stats: { hp: { now: 0, max: 0 }, mp: { now: 5 } } }]);
    expect([vitals.hpFill, vitals.mpFill, vitals.wounded]).toEqual([0, 0, 0]);
    expectCleanNumbers(vitals);
  });

  it("leaves a hero without stats out of the vitals but counts the hero", () => {
    const vitals = vitalsFigures([ada, { id: "new", stats: null }]);
    expect(vitals.heroes).toBe(2);
    expect(vitals.avgHp).toBe(20);
    expect(vitals.avgLevel).toBe(3);
  });

  it("keeps HP above max inside the bar and counts a missing level as level 1", () => {
    const vitals = vitalsFigures([{ id: "x", stats: { hp: { now: 80, max: 40 } } }]);
    expect(vitals.hpFill).toBe(1);
    expect(vitals.avgLevel).toBe(1);
    expect(vitals.wounded).toBe(0);
  });
});

describe("goldFigures", () => {
  it("adds up wallets and savings and averages them", () => {
    expect(goldFigures(heroesOf([ada, ben, mom]), quests, questLog, NOW)).toEqual({
      heroes: 2,
      wallets: 140,
      savings: 60,
      treasury: 200,
      avgPerHero: 100,
      avgPerQuest: 5,
      earned: { today: 5, week: 15, month: 25 },
    });
  });

  it("counts a wallet in debt as nothing", () => {
    const gold = goldFigures([{ id: "x", stats: { gp: { wallet: -30, savings: 10 } } }], [], [], NOW);
    expect(gold.wallets).toBe(0);
    expect(gold.treasury).toBe(10);
  });

  it("is all zeros for an empty family", () => {
    const gold = goldFigures([], [], [], NOW);
    expect(gold).toEqual({
      heroes: 0,
      wallets: 0,
      savings: 0,
      treasury: 0,
      avgPerHero: 0,
      avgPerQuest: 0,
      earned: { today: 0, week: 0, month: 0 },
    });
  });
});

describe("experienceFigures", () => {
  it("totals the heroes' XP and what the quest log paid", () => {
    expect(experienceFigures(heroesOf([ada, ben, mom]), quests, questLog, NOW)).toEqual({
      heroes: 2,
      totalXp: 400,
      avgPerHero: 200,
      avgPerQuest: 10,
      earned: { today: 10, week: 30, month: 50 },
    });
  });
});

describe("abilityFigures", () => {
  it("totals the heroes' AP and what their history recorded", () => {
    expect(abilityFigures(heroesOf([ada, ben, mom]), quests, NOW)).toEqual({
      heroes: 2,
      totalAp: 20,
      avgPerHero: 10,
      avgPerQuest: 1,
      earned: { today: 5, week: 15, month: 15 },
    });
  });
});

describe("beastFigures", () => {
  const heroes = heroesOf([ada, ben, mom]);

  it("links quests from either side and counts beasts beaten per period", () => {
    // q1 is on b1's list; q2 names beast 2; the draft and the quest of a missing beast are not linked
    expect(beastFigures(beasts, quests, questLog, heroes, NOW)).toEqual({
      beasts: 3,
      avgChecklist: 1,
      linkedQuests: 2,
      questsPerBeast: 0.7,
      tamed: { today: 1, week: 2, month: 3 },
    });
  });

  it("does not count a quest done for a beast that is gone", () => {
    const log = [{ questId: "4", userId: "ada", completedAt: at(10, 10, 8), status: "approved" }];
    expect(beastFigures(beasts, quests, log, heroes, NOW).tamed).toEqual({ today: 0, week: 0, month: 0 });
  });

  it("counts nothing for an empty bestiary", () => {
    expect(beastFigures([], quests, questLog, heroes, NOW)).toEqual({
      beasts: 0,
      avgChecklist: 0,
      linkedQuests: 0,
      questsPerBeast: 0,
      tamed: { today: 0, week: 0, month: 0 },
    });
  });

  it("copes with beasts that have no checklist and no id", () => {
    const figures = beastFigures([{}, null, { id: "b" }], [{ id: "q", beastId: "" }], [], [], NOW);
    expect(figures.beasts).toBe(2);
    expect(figures.avgChecklist).toBe(0);
    expect(figures.linkedQuests).toBe(0);
    expectCleanNumbers(figures);
  });
});

describe("temples", () => {
  it("reads the layout from the record or from the older top-level fields", () => {
    expect(layoutOf(templeFlat)).toEqual({ maze: templeFlat.dungeonLayout!.maze, rooms: templeFlat.dungeonLayout!.rooms });
    expect(layoutOf(templeTopLevel)).toEqual({ maze: templeTopLevel.maze, rooms: templeTopLevel.rooms });
    expect(layoutOf({ id: "x", dungeonLayout: { maze: [["a"]] }, maze: [["b"]], rooms: { b: {} } })).toEqual({
      maze: [["b"]],
      rooms: { b: {} },
    });
    expect(layoutOf(templeBare)).toBeNull();
    expect(layoutOf({ id: "x", dungeonLayout: null, maze: [["a"]] })).toBeNull();
  });

  it("keeps the first temple of each id and drops records without one", () => {
    const dupe: TempleLike = { id: "t1", maze: [["z"]], rooms: { z: { type: "boss" } } };
    expect(uniqueTemples([templeFlat, dupe, null, undefined, { id: "" }, templeBare])).toEqual([templeFlat, templeBare]);
  });

  it("counts foe and treasure rooms by cell, across floors, once per id", () => {
    const dupe: TempleLike = { id: "t1", maze: [["z", "z", "z"]], rooms: { z: { type: "boss" } } };
    const figures = templeFigures([templeFlat, templeFloors, templeTopLevel, templeBare, dupe]);
    // t1: 2 foes, 1 chest. t2: miniboss twice, a secret chest. t3: 1 chest (tokens with no room are skipped).
    // t4 has no layout: it is a temple, but there is nothing in it to average.
    expect(figures).toEqual({
      total: 4,
      laidOut: 3,
      foeRooms: 4,
      treasureRooms: 3,
      avgFoes: 1,
      avgTreasure: 1,
    });
  });

  it("rounds the averages to whole numbers", () => {
    const figures = templeFigures([
      { id: "a", maze: [["m", "m", "m"]], rooms: { m: { type: "monster" } } },
      { id: "b", maze: [["x"]], rooms: { m: { type: "monster" } } },
    ]);
    expect(figures.foeRooms).toBe(3);
    expect(figures.avgFoes).toBe(2);
  });

  it("is all zeros without temples", () => {
    expect(templeFigures([])).toEqual({ total: 0, laidOut: 0, foeRooms: 0, treasureRooms: 0, avgFoes: 0, avgTreasure: 0 });
    expect(templeFigures([templeBare]).avgFoes).toBe(0);
  });

  it("counts different ids across lists once", () => {
    expect(countDistinctIds(["a", "b", ""], ["b", "c", null, undefined, 3, "3"])).toBe(4);
    expect(countDistinctIds()).toBe(0);
  });
});

describe("compact", () => {
  it("shortens big figures for a ribbon and never prints NaN", () => {
    expect([compact(0), compact(950), compact(1200), compact(3400000)]).toEqual(["0", "950", "1.2K", "3.4M"]);
    expect([compact(NaN), compact(Infinity)]).toEqual(["0", "0"]);
  });
});

describe("compendiumStats", () => {
  it("works every slide's figures out of the same data", () => {
    const stats = compendiumStats(
      {
        profiles: [ada, ben, mom, null],
        quests,
        beasts,
        questLog,
        temples: [templeFlat, templeFloors, templeTopLevel, templeBare],
      },
      NOW
    );
    expect(stats.vitals.heroes).toBe(2);
    expect(stats.gold.treasury).toBe(200);
    expect(stats.experience.totalXp).toBe(400);
    expect(stats.abilities.totalAp).toBe(20);
    expect(stats.beasts.linkedQuests).toBe(2);
    expect(stats.temples.total).toBe(4);
    expectCleanNumbers(stats);
  });

  it("is zeros, never NaN or Infinity, for an empty family", () => {
    const stats = compendiumStats({ profiles: [], quests: [], beasts: [], questLog: [], temples: [] }, NOW);
    expect(numbersIn(stats).every((number) => number === 0)).toBe(true);
    expectCleanNumbers(stats);
  });

  it("stays finite when a profile or quest holds garbage", () => {
    const stats = compendiumStats(
      {
        profiles: [
          { id: "a", stats: null },
          { id: "b", stats: { level: NaN, hp: { now: Infinity, max: NaN }, gp: { wallet: "12" as unknown as number }, xp: {} } },
          {},
        ],
        quests: [{ xp: Infinity, gp: NaN, ap: -5 }, {}],
        beasts: [{ checklist: "nope" as unknown as string[] }],
        questLog: [{ questId: "x", userId: "a", completedAt: "", status: "approved" }],
        temples: [{ id: "t", maze: "nope", rooms: { a: {} } }],
      },
      NOW
    );
    for (const number of numbersIn(stats)) {
      expect(Number.isFinite(number)).toBe(true);
    }
    expect(stats.gold.wallets).toBe(12);
  });
});
