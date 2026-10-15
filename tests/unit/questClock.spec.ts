import {
  DEFAULT_MINUTES,
  attackCooldownFor,
  defaultMinutes,
  questAttackCooldown,
  questMinutes,
  remainingClockMinutes,
} from "@/lib/services/quests/questClock";
import { clockDuration, minutesPerChore } from "@/lib/services/battle/battleService/attackClock";
import { resolvePassive } from "@/lib/services/battle/battleService/strikeMath";
import type { Enemy } from "@/lib/services/battle/battleService/types";

describe("defaultMinutes", () => {
  it("follows the spec's table on every slider step", () => {
    const steps: Array<[number, number]> = [
      [1, 3],
      [2, 5],
      [3, 8],
      [5, 12],
      [8, 20],
      [13, 30],
      [21, 45],
      [34, 60],
      [55, 90],
    ];
    for (const [difficulty, minutes] of steps) expect(defaultMinutes(difficulty)).toBe(minutes);
  });

  it("gives 90 minutes to 55 and everything above it", () => {
    expect(defaultMinutes(89)).toBe(90);
    expect(defaultMinutes(144)).toBe(90);
    expect(defaultMinutes(1000)).toBe(90);
  });

  it("picks the nearest lower step for an in-between value", () => {
    expect(defaultMinutes(4)).toBe(8);
    expect(defaultMinutes(6)).toBe(12);
    expect(defaultMinutes(7)).toBe(12);
    expect(defaultMinutes(9)).toBe(20);
    expect(defaultMinutes(12)).toBe(20);
    expect(defaultMinutes(20)).toBe(30);
    expect(defaultMinutes(33)).toBe(45);
    expect(defaultMinutes(54)).toBe(60);
    expect(defaultMinutes(2.9)).toBe(5);
  });

  it("falls back to the smallest step when the difficulty is unset, zero or broken", () => {
    expect(defaultMinutes(0)).toBe(3);
    expect(defaultMinutes(0.5)).toBe(3);
    expect(defaultMinutes(-2)).toBe(3);
    expect(defaultMinutes(undefined)).toBe(3);
    expect(defaultMinutes(NaN)).toBe(3);
  });

  it("only ever lengthens the clock as the difficulty climbs", () => {
    const values = DEFAULT_MINUTES.map(([, minutes]) => minutes);
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });
});

describe("questMinutes", () => {
  it("uses the parent's estimate when there is one", () => {
    expect(questMinutes({ difficulty: 5, estimatedMinutes: 25 })).toBe(25);
    expect(questMinutes({ difficulty: 1, estimatedMinutes: 0.5 })).toBe(0.5);
  });

  it("uses the difficulty's default when the estimate is absent, zero, negative or broken", () => {
    expect(questMinutes({ difficulty: 5 })).toBe(12);
    expect(questMinutes({ difficulty: 5, estimatedMinutes: undefined })).toBe(12);
    expect(questMinutes({ difficulty: 5, estimatedMinutes: 0 })).toBe(12);
    expect(questMinutes({ difficulty: 5, estimatedMinutes: -4 })).toBe(12);
    expect(questMinutes({ difficulty: 5, estimatedMinutes: NaN })).toBe(12);
    expect(questMinutes({ difficulty: 5, estimatedMinutes: Infinity })).toBe(12);
  });
});

describe("attackCooldownFor", () => {
  it("spreads the estimate over the checklist", () => {
    expect(attackCooldownFor(12, 4)).toBe(3);
    expect(attackCooldownFor(30, 3)).toBe(10);
    expect(attackCooldownFor(5, 1)).toBe(5);
  });

  it("treats an empty or broken checklist as one chore", () => {
    expect(attackCooldownFor(8, 0)).toBe(8);
    expect(attackCooldownFor(8, -2)).toBe(8);
    expect(attackCooldownFor(8, NaN)).toBe(8);
    expect(attackCooldownFor(8, undefined)).toBe(8);
  });

  it("makes the first clock the whole estimate", () => {
    for (const [minutes, chores] of [[12, 4], [20, 3], [45, 7], [5, 2]]) {
      expect(attackCooldownFor(minutes, chores) * chores).toBeCloseTo(minutes, 9);
    }
  });
});

describe("questAttackCooldown", () => {
  it("reads the quest's estimate, or its difficulty's default, over the checklist", () => {
    expect(questAttackCooldown({ difficulty: 5 }, 4)).toBe(3);
    expect(questAttackCooldown({ difficulty: 5, estimatedMinutes: 40 }, 4)).toBe(10);
    expect(questAttackCooldown({ difficulty: 1 }, 1)).toBe(3);
  });
});

describe("remainingClockMinutes", () => {
  it("is the whole estimate when nothing is done yet", () => {
    expect(remainingClockMinutes(12, 4, 0)).toBe(12);
    expect(remainingClockMinutes(12, 4)).toBe(12);
  });

  it("shortens pro rata for chores already done", () => {
    expect(remainingClockMinutes(12, 4, 1)).toBe(9);
    expect(remainingClockMinutes(12, 4, 2)).toBe(6);
    expect(remainingClockMinutes(12, 4, 3)).toBe(3);
  });

  it("always leaves one chore's share, like restoreCompletedTasks leaves one chore open", () => {
    expect(remainingClockMinutes(12, 4, 4)).toBe(3);
    expect(remainingClockMinutes(12, 4, 9)).toBe(3);
    expect(remainingClockMinutes(8, 1, 1)).toBe(8);
  });

  it("ignores a negative or broken done count", () => {
    expect(remainingClockMinutes(12, 4, -1)).toBe(12);
    expect(remainingClockMinutes(12, 4, NaN)).toBe(12);
  });
});

describe("the strike clock on the battle engine", () => {
  const passive = resolvePassive();

  const clockFor = (cooldown: number, openChores: number) =>
    clockDuration(openChores, minutesPerChore({ attackCooldown: cooldown } as Enemy, passive, 1));

  it("runs the whole estimate for a hero with every chore open", () => {
    const cooldown = questAttackCooldown({ difficulty: 5 }, 4);
    expect(clockFor(cooldown, 4)).toBeCloseTo(12 * 60_000, 3);
  });

  it("matches remainingClockMinutes as chores come off the checklist", () => {
    const cooldown = questAttackCooldown({ difficulty: 5 }, 4);
    for (const done of [0, 1, 2, 3]) {
      expect(clockFor(cooldown, 4 - done)).toBeCloseTo(remainingClockMinutes(12, 4, done) * 60_000, 3);
    }
  });

  it("gives a one-dish goblin a short clock and a whole-sink boss a long one", () => {
    const dish = clockFor(questAttackCooldown({ difficulty: 1 }, 1), 1);
    const sink = clockFor(questAttackCooldown({ difficulty: 13 }, 5), 5);
    expect(dish).toBe(3 * 60_000);
    expect(sink).toBeCloseTo(30 * 60_000, 3);
  });
});
