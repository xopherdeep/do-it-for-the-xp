import type { Ability } from "@/hooks/abilities/abilityConstants";
import { AbilityStatus, AbilityType, TimePeriod } from "@/hooks/abilities/abilityConstants";
import {
  classKey,
  computeHeroAbilityStatuses,
  heroAbilitySnapshot,
  heroApWindows,
  type HeroAbilityProfile,
} from "@/lib/services/abilities/heroAbilityStatus";

// Saturday 10 October 2026, noon, local time.
const NOW = new Date(2026, 9, 10, 12, 0, 0);
const at = (month: number, day: number, hour = 8): string => new Date(2026, month, day, hour, 0, 0).toISOString();

const power = (overrides: Partial<Ability> & { id: string }): Ability => ({
  name: overrides.id,
  description: "",
  type: AbilityType.InGame,
  frequency: TimePeriod.Daily,
  mpCost: 0,
  apRequirement: { amount: 0, period: TimePeriod.Flat },
  prerequisites: [],
  icon: "colorWandOutline",
  isPreset: false,
  position: { x: 0, y: 0 },
  ...overrides,
});

const hero = (overrides: Partial<NonNullable<HeroAbilityProfile["stats"]>> = {}, jobClass?: string): HeroAbilityProfile => ({
  jobClass,
  stats: { level: 1, ap: { total: 0, history: [] }, mp: { now: 0, max: 30 }, classes: {}, ...overrides },
});

const statusOf = (ability: Ability, profile: HeroAbilityProfile, unlockedIds: string[] = []) =>
  computeHeroAbilityStatuses([ability], profile, unlockedIds, NOW).statuses[ability.id];

describe("AP windows", () => {
  const history = [
    { amount: 40, timestamp: at(9, 10, 8), source: "quest" }, //  today
    { amount: 25, timestamp: at(9, 9, 23), source: "quest" }, //  last night, inside the last 7 days
    { amount: 60, timestamp: at(9, 2, 8), source: "quest" }, //   this month, not this week
    { amount: 100, timestamp: at(8, 20, 8), source: "quest" }, // last quarter, this year
    { amount: 5, timestamp: at(0, 5, 8), source: "quest" }, //    January
  ];

  it("splits the history into today, the last 7 days, this month, quarter and year", () => {
    expect(heroApWindows({ total: 230, history }, NOW)).toEqual({
      total: 230,
      daily: 40,
      weekly: 65,
      monthly: 125,
      quarterly: 125,
      yearly: 230,
    });
  });

  it("counts a record dated after now in the total only", () => {
    const future = [{ amount: 30, timestamp: at(9, 11, 8) }];
    expect(heroApWindows({ total: 30, history: future }, NOW)).toEqual({
      total: 30,
      daily: 0,
      weekly: 0,
      monthly: 0,
      quarterly: 0,
      yearly: 0,
    });
  });

  it("takes the total from the history when the profile has none, and ignores records that make no sense", () => {
    const messy = [{ amount: 10, timestamp: at(9, 10, 9) }, { amount: "x" }, { amount: 5, timestamp: "not a date" }, null];
    const windows = heroApWindows({ history: messy }, NOW);
    expect(windows.total).toBe(15);
    expect(windows.daily).toBe(10);
  });

  it("reads a bare number (very old profiles) as lifetime AP", () => {
    expect(heroApWindows(75, NOW)).toEqual({ total: 75, daily: 0, weekly: 0, monthly: 0, quarterly: 0, yearly: 0 });
  });

  it("is all zeroes for a profile with no AP at all", () => {
    expect(heroApWindows(undefined, NOW).total).toBe(0);
    expect(heroApWindows(null, NOW).daily).toBe(0);
  });
});

describe("heroAbilitySnapshot", () => {
  it("reads level, MP and class levels as the hero side does", () => {
    const snapshot = heroAbilitySnapshot(
      hero({ level: 4, mp: { now: 12 }, classes: { Warrior: { level: 3 }, warrior: { level: 5 }, Monk: { level: 2 } } }, "Mage"),
      NOW
    );
    expect(snapshot.level).toBe(4);
    expect(snapshot.mp).toBe(12);
    // "Warrior" and "warrior" are one class; the equipped Mage counts as level 1 at least.
    expect(snapshot.classes).toEqual({ warrior: 5, monk: 2, mage: 1 });
  });

  it("falls back to level 1 and 0 MP when the profile has neither", () => {
    const snapshot = heroAbilitySnapshot({ stats: {} }, NOW);
    expect(snapshot.level).toBe(1);
    expect(snapshot.mp).toBe(0);
  });

  it("reads MP kept as a bare number", () => {
    expect(heroAbilitySnapshot(hero({ mp: 9 }), NOW).mp).toBe(9);
  });

  it("spells class names one way", () => {
    expect(classKey("Time Mage")).toBe("timemage");
    expect(classKey("time-mage")).toBe("timemage");
  });
});

describe("computeHeroAbilityStatuses: AP", () => {
  const haste = power({ id: "haste", apRequirement: { amount: 100, period: TimePeriod.Daily } });

  it("locks a power the hero has no AP for", () => {
    const result = computeHeroAbilityStatuses([haste], hero(), [], NOW);
    expect(result.statuses.haste).toBe(AbilityStatus.Locked);
    expect(result.unlocks.haste).toBe(false);
  });

  it("makes a power available once enough AP came in today", () => {
    const earned = hero({ ap: { total: 100, history: [{ amount: 100, timestamp: at(9, 10, 9) }] } });
    const result = computeHeroAbilityStatuses([haste], earned, [], NOW);
    expect(result.statuses.haste).toBe(AbilityStatus.Available);
    expect(result.unlocks.haste).toBe(true);
  });

  it("does not count yesterday's AP toward a daily requirement", () => {
    const yesterday = hero({ ap: { total: 100, history: [{ amount: 100, timestamp: at(9, 9, 9) }] } });
    expect(statusOf(haste, yesterday)).toBe(AbilityStatus.Locked);
  });

  it("counts yesterday's AP toward a weekly requirement", () => {
    const weekly = power({ id: "week", apRequirement: { amount: 100, period: TimePeriod.Weekly } });
    const yesterday = hero({ ap: { total: 100, history: [{ amount: 100, timestamp: at(9, 9, 9) }] } });
    expect(statusOf(weekly, yesterday)).toBe(AbilityStatus.Available);
  });

  it("reads the lifetime total for a flat requirement, and for periods with no window of their own", () => {
    const stored = hero({ ap: { total: 500, history: [] } });
    for (const period of [TimePeriod.Flat, TimePeriod.Hourly, TimePeriod.BiAnnual]) {
      const ability = power({ id: period, apRequirement: { amount: 300, period } });
      expect(statusOf(ability, stored)).toBe(AbilityStatus.Available);
    }
    expect(statusOf(power({ id: "big", apRequirement: { amount: 501, period: TimePeriod.Flat } }), stored)).toBe(
      AbilityStatus.Locked
    );
  });

  it("has the monthly, quarterly and yearly windows", () => {
    const earned = hero({
      ap: {
        total: 165,
        history: [
          { amount: 60, timestamp: at(9, 2, 8) }, // October
          { amount: 100, timestamp: at(8, 20, 8) }, // September: last quarter
          { amount: 5, timestamp: at(0, 5, 8) }, // January
        ],
      },
    });
    const wants = (period: (typeof TimePeriod)[keyof typeof TimePeriod], amount: number) =>
      statusOf(power({ id: `${period}${amount}`, apRequirement: { amount, period } }), earned);

    expect(wants(TimePeriod.Monthly, 60)).toBe(AbilityStatus.Available);
    expect(wants(TimePeriod.Monthly, 61)).toBe(AbilityStatus.Locked);
    expect(wants(TimePeriod.Quarterly, 60)).toBe(AbilityStatus.Available);
    expect(wants(TimePeriod.Quarterly, 61)).toBe(AbilityStatus.Locked);
    expect(wants(TimePeriod.Yearly, 165)).toBe(AbilityStatus.Available);
    expect(wants(TimePeriod.Yearly, 166)).toBe(AbilityStatus.Locked);
  });

  it("needs no AP when the requirement is 0", () => {
    expect(statusOf(power({ id: "free" }), hero())).toBe(AbilityStatus.Available);
  });
});

describe("computeHeroAbilityStatuses: level and class", () => {
  it("locks a power until the hero reaches its level", () => {
    const needsLevel = power({ id: "lv3", characterRequirement: { level: 3 } });
    expect(statusOf(needsLevel, hero({ level: 2 }))).toBe(AbilityStatus.Locked);
    expect(statusOf(needsLevel, hero({ level: 3 }))).toBe(AbilityStatus.Available);
  });

  it("locks a power until the hero reaches the class level", () => {
    const stop = power({ id: "stop", characterRequirement: { class: { "time-mage": 3 } } });
    expect(statusOf(stop, hero())).toBe(AbilityStatus.Locked);
    expect(statusOf(stop, hero({ classes: { "Time Mage": { level: 2 } } }))).toBe(AbilityStatus.Locked);
    expect(statusOf(stop, hero({ classes: { "Time Mage": { level: 3 } } }))).toBe(AbilityStatus.Available);
  });

  it("needs every class in the requirement", () => {
    const hybrid = power({ id: "hybrid", characterRequirement: { class: { "time-mage": 1, technician: 1 } } });
    expect(statusOf(hybrid, hero({ classes: { "time-mage": { level: 4 } } }))).toBe(AbilityStatus.Locked);
    expect(statusOf(hybrid, hero({ classes: { "time-mage": { level: 4 }, Technician: { level: 1 } } }))).toBe(
      AbilityStatus.Available
    );
  });

  it("counts the equipped class as level 1 even before it has any class XP", () => {
    const warriorOne = power({ id: "slash", characterRequirement: { class: { warrior: 1 } } });
    expect(statusOf(warriorOne, hero({}, "Warrior"))).toBe(AbilityStatus.Available);
    expect(statusOf(warriorOne, hero({}, "Mage"))).toBe(AbilityStatus.Locked);
  });

  it("does not mistake a class the hero never had for a level 0 pass", () => {
    const stop = power({ id: "stop", characterRequirement: { class: { "black-mage": 1 } } });
    expect(statusOf(stop, hero({ classes: { Warrior: { level: 9 } } }))).toBe(AbilityStatus.Locked);
  });
});

describe("computeHeroAbilityStatuses: MP and cooldown", () => {
  const cast = power({ id: "cast", mpCost: 10 });

  it("is Unlocked, not Available, while the MP cannot pay for it", () => {
    expect(statusOf(cast, hero({ mp: { now: 9, max: 30 } }))).toBe(AbilityStatus.Unlocked);
  });

  it("is Available when the MP just covers it", () => {
    expect(statusOf(cast, hero({ mp: { now: 10, max: 30 } }))).toBe(AbilityStatus.Available);
  });

  it("stays Locked, not Unlocked, when the requirements fail whatever the MP", () => {
    const locked = power({ id: "locked", mpCost: 10, apRequirement: { amount: 5, period: TimePeriod.Daily } });
    expect(statusOf(locked, hero({ mp: { now: 30, max: 30 } }))).toBe(AbilityStatus.Locked);
  });

  it("cools a daily power cast earlier today and frees it the next day", () => {
    const charged = hero({ mp: { now: 30, max: 30 } });
    expect(statusOf(power({ id: "d", mpCost: 10, lastUsed: at(9, 10, 7) }), charged)).toBe(AbilityStatus.Cooling);
    expect(statusOf(power({ id: "d", mpCost: 10, lastUsed: at(9, 9, 23) }), charged)).toBe(AbilityStatus.Available);
  });

  describe("per-hero casts (lastCasts)", () => {
    const charged = hero({ mp: { now: 30, max: 30 } });
    const statusWith = (ability: Ability, lastCasts?: Record<string, string>) =>
      computeHeroAbilityStatuses([ability], charged, [], NOW, lastCasts).statuses[ability.id];

    it("cools a daily power the hero cast this morning, whatever the shared lastUsed says", () => {
      expect(statusWith(power({ id: "d", mpCost: 10 }), { d: at(9, 10, 7) })).toBe(AbilityStatus.Cooling);
    });

    it("ignores the shared lastUsed when lastCasts is given, even empty", () => {
      expect(statusWith(power({ id: "d", mpCost: 10, lastUsed: at(9, 10, 7) }), {})).toBe(AbilityStatus.Available);
    });

    it("still reads the shared lastUsed when no lastCasts is handed in", () => {
      expect(statusWith(power({ id: "d", mpCost: 10, lastUsed: at(9, 10, 7) }))).toBe(AbilityStatus.Cooling);
    });

    it("reads each power's own cast, so another hero's casts do not cool it", () => {
      const abilities = [power({ id: "a", mpCost: 10 }), power({ id: "b", mpCost: 10 })];
      const { statuses } = computeHeroAbilityStatuses(abilities, charged, [], NOW, { a: at(9, 10, 7) });
      expect(statuses).toEqual({ a: AbilityStatus.Cooling, b: AbilityStatus.Available });
    });

    it("frees a power whose last cast was yesterday", () => {
      expect(statusWith(power({ id: "d", mpCost: 10 }), { d: at(9, 9, 23) })).toBe(AbilityStatus.Available);
    });
  });

  it("cools an hourly power for an hour", () => {
    const hourly = (lastUsed: Date) => power({ id: "h", frequency: TimePeriod.Hourly, lastUsed: lastUsed.toISOString() });
    expect(statusOf(hourly(new Date(NOW.getTime() - 30 * 60 * 1000)), hero())).toBe(AbilityStatus.Cooling);
    expect(statusOf(hourly(new Date(NOW.getTime() - 2 * 60 * 60 * 1000)), hero())).toBe(AbilityStatus.Available);
  });

  it("cools a weekly power for 7 days, a monthly one for the calendar month", () => {
    const weekly = (day: number) => power({ id: "w", frequency: TimePeriod.Weekly, lastUsed: at(9, day, 12) });
    expect(statusOf(weekly(5), hero())).toBe(AbilityStatus.Cooling);
    expect(statusOf(weekly(2), hero())).toBe(AbilityStatus.Available);

    const monthly = (month: number) => power({ id: "m", frequency: TimePeriod.Monthly, lastUsed: at(month, 1) });
    expect(statusOf(monthly(9), hero())).toBe(AbilityStatus.Cooling);
    expect(statusOf(monthly(8), hero())).toBe(AbilityStatus.Available);
  });

  it("cools quarterly, bi-annual and yearly powers by their calendar window", () => {
    const every = (frequency: (typeof TimePeriod)[keyof typeof TimePeriod], lastUsed: string) =>
      statusOf(power({ id: frequency, frequency, lastUsed }), hero());

    expect(every(TimePeriod.Quarterly, at(9, 3))).toBe(AbilityStatus.Cooling); // same Oct-Dec quarter
    expect(every(TimePeriod.Quarterly, at(8, 30))).toBe(AbilityStatus.Available);
    expect(every(TimePeriod.BiAnnual, at(6, 1))).toBe(AbilityStatus.Cooling); // same Jul-Dec half
    expect(every(TimePeriod.BiAnnual, at(5, 30))).toBe(AbilityStatus.Available);
    expect(every(TimePeriod.Yearly, at(0, 2))).toBe(AbilityStatus.Cooling);
    expect(statusOf(power({ id: "y", frequency: TimePeriod.Yearly, lastUsed: new Date(2025, 11, 31).toISOString() }), hero())).toBe(
      AbilityStatus.Available
    );
  });

  it("treats a one-time (flat) frequency or an unreadable lastUsed as never cooling", () => {
    expect(statusOf(power({ id: "once", frequency: TimePeriod.Flat, lastUsed: at(9, 10, 7) }), hero())).toBe(
      AbilityStatus.Available
    );
    expect(statusOf(power({ id: "junk", lastUsed: "yesterday-ish" }), hero())).toBe(AbilityStatus.Available);
  });
});

describe("computeHeroAbilityStatuses: prerequisites", () => {
  const slow = power({ id: "slow" });
  const stop = power({ id: "stop", prerequisites: ["slow"] });
  const rewind = power({ id: "rewind", prerequisites: ["stop"] });

  it("unlocks a chain whatever order the list is in", () => {
    const result = computeHeroAbilityStatuses([rewind, stop, slow], hero(), [], NOW);
    expect(result.unlocks).toEqual({ rewind: true, stop: true, slow: true });
  });

  it("keeps everything downstream locked when the root fails its own requirements", () => {
    const hardSlow = power({ id: "slow", apRequirement: { amount: 50, period: TimePeriod.Daily } });
    const result = computeHeroAbilityStatuses([hardSlow, stop, rewind], hero(), [], NOW);
    expect(result.unlocks).toEqual({ slow: false, stop: false, rewind: false });
    expect(result.statuses).toEqual({ slow: AbilityStatus.Locked, stop: AbilityStatus.Locked, rewind: AbilityStatus.Locked });
  });

  it("locks a power whose prerequisite was never added to the Compendium", () => {
    const result = computeHeroAbilityStatuses([stop], hero(), [], NOW);
    expect(result.unlocks.stop).toBe(false);
  });

  it("counts ids the caller already knows are unlocked as met prerequisites", () => {
    const result = computeHeroAbilityStatuses([stop], hero(), ["slow"], NOW);
    expect(result.unlocks.stop).toBe(true);
  });

  it("works out an ability's own unlock from the rules even when its id is in the known list", () => {
    const hard = power({ id: "hard", apRequirement: { amount: 50, period: TimePeriod.Daily } });
    expect(computeHeroAbilityStatuses([hard], hero(), ["hard"], NOW).unlocks.hard).toBe(false);
  });

  it("leaves a prerequisite cycle locked instead of looping", () => {
    const a = power({ id: "a", prerequisites: ["b"] });
    const b = power({ id: "b", prerequisites: ["a"] });
    expect(computeHeroAbilityStatuses([a, b], hero(), [], NOW).unlocks).toEqual({ a: false, b: false });
  });
});

describe("computeHeroAbilityStatuses: shape", () => {
  it("gives empty maps for no abilities", () => {
    expect(computeHeroAbilityStatuses([], hero(), [], NOW)).toEqual({ statuses: {}, unlocks: {} });
  });

  it("has an entry for every ability, each one judged for the hero given", () => {
    const abilities = [
      power({ id: "free" }),
      power({ id: "dear", apRequirement: { amount: 999, period: TimePeriod.Flat } }),
      power({ id: "thirsty", mpCost: 50 }),
    ];
    const { statuses } = computeHeroAbilityStatuses(abilities, hero({ mp: { now: 5, max: 30 } }), [], NOW);
    expect(statuses).toEqual({
      free: AbilityStatus.Available,
      dear: AbilityStatus.Locked,
      thirsty: AbilityStatus.Unlocked,
    });
  });
});
