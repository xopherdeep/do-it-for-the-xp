import {
  CLOCK_TICK_MS,
  STRIKE_DELAY_MS,
  clockDuration,
  clockEndsAt,
  clockReading,
  minutesPerChore,
} from "@/lib/services/battle/battleService/attackClock";
import { resolvePassive } from "@/lib/services/battle/battleService/strikeMath";
import type { Enemy } from "@/lib/services/battle/battleService/types";

const beast = (extra: Partial<Enemy> = {}): Enemy => ({
  id: "b1",
  name: "Dust Bunny",
  type: "monster",
  isBoss: false,
  health: 10,
  maxHealth: 10,
  attack: 10,
  defense: 1,
  speed: 1,
  ...extra,
});

describe("attackClock (characterization)", () => {
  it("ticks every 100 ms and waits a second before a strike", () => {
    expect(CLOCK_TICK_MS).toBe(100);
    expect(STRIKE_DELAY_MS).toBe(1000);
  });

  describe("minutesPerChore", () => {
    const passive = resolvePassive();

    it("is 3 unless the beast says otherwise", () => {
      expect(minutesPerChore(beast(), passive, 1)).toBe(3);
      expect(minutesPerChore(null, passive, 1)).toBe(3);
      expect(minutesPerChore(beast({ attackCooldown: 5 }), passive, 1)).toBe(5);
    });

    it("falls back to 3 for a cooldown that is zero, negative or not a number", () => {
      expect(minutesPerChore(beast({ attackCooldown: 0 }), passive, 1)).toBe(3);
      expect(minutesPerChore(beast({ attackCooldown: -2 }), passive, 1)).toBe(3);
      expect(minutesPerChore(beast({ attackCooldown: Number.NaN }), passive, 1)).toBe(3);
    });

    it("multiplies by the fight's scale, then adds the class's flat minutes", () => {
      expect(minutesPerChore(beast(), passive, 1.5)).toBe(4.5);
      expect(minutesPerChore(beast(), resolvePassive({ cooldownMinutesBonus: 1 }), 2)).toBe(7);
    });

    it("ignores a negative or non-finite class bonus", () => {
      expect(minutesPerChore(beast(), resolvePassive({ cooldownMinutesBonus: -1 }), 1)).toBe(3);
      expect(minutesPerChore(beast(), resolvePassive({ cooldownMinutesBonus: Number.NaN }), 1)).toBe(3);
    });
  });

  describe("clockDuration", () => {
    it("is the minutes per chore for every chore left, in ms", () => {
      expect(clockDuration(4, 3)).toBe(720_000);
    });

    it("counts at least one chore", () => {
      expect(clockDuration(0, 3)).toBe(180_000);
    });
  });

  describe("clockEndsAt", () => {
    it("counts from now when nothing is frozen", () => {
      expect(clockEndsAt(1_000, 0, 500)).toBe(1_500);
      expect(clockEndsAt(1_000, 900, 500)).toBe(1_500);
    });

    it("counts from the moment the ice melts when it is still frozen", () => {
      expect(clockEndsAt(1_000, 4_000, 500)).toBe(4_500);
    });
  });

  describe("clockReading", () => {
    it("reports the ms left and the bar's fill against the clock's length", () => {
      expect(clockReading(1_000, 0, 5_000, 8_000)).toEqual({ remaining: 4_000, percent: 50 });
    });

    it("stands still at the frozen moment while the ice holds", () => {
      expect(clockReading(1_000, 3_000, 5_000, 8_000)).toEqual({ remaining: 2_000, percent: 25 });
    });

    it("bottoms out at 0 once the deadline has passed", () => {
      expect(clockReading(9_000, 0, 5_000, 8_000)).toEqual({ remaining: 0, percent: 0 });
    });

    it("shows an empty bar when the clock has no length", () => {
      expect(clockReading(1_000, 0, 5_000, 0)).toEqual({ remaining: 4_000, percent: 0 });
    });
  });
});
