import { EMPTY_STREAK, type DailyStreak } from "@/lib/services/streaks/dailyStreak";
import { streakCardModel, tierOf } from "@/lib/services/streaks/streakCard";

const streak = (over: Partial<DailyStreak>): DailyStreak => ({ ...EMPTY_STREAK, ...over });

describe("streakCard", () => {
  it("heats up by days", () => {
    expect([0, 1, 3, 7, 14, 30, 99].map(tierOf)).toEqual(["ash", "spark", "flame", "blaze", "inferno", "legend", "legend"]);
  });

  it("reads kept, risk and unlit", () => {
    expect(streakCardModel(streak({ current: 2, doneToday: true })).status).toBe("kept");
    expect(streakCardModel(streak({ current: 2, atRisk: true })).status).toBe("risk");
    expect(streakCardModel(streak({})).status).toBe("unlit");
  });

  it("walks the road between chests", () => {
    const { chest } = streakCardModel(streak({ current: 5 }));
    expect(chest).toMatchObject({ day: 7, fromDay: 3, toGo: 2, percent: 50, xp: 40, gp: 50 });
    expect(streakCardModel(streak({ current: 0 })).chest).toMatchObject({ day: 3, fromDay: 0, percent: 0 });
  });

  it("counts shield slots and the wait for the next", () => {
    const m = streakCardModel(streak({ current: 10, shields: 1 }));
    expect(m.shields.map((s) => s.filled)).toEqual([true, false]);
    expect(m.shieldIn).toBe(4);
    expect(streakCardModel(streak({ current: 15, shields: 2 })).shieldIn).toBeNull();
  });

  it("flags a record run and a lost run", () => {
    expect(streakCardModel(streak({ current: 4, best: 4 })).isRecord).toBe(true);
    expect(streakCardModel(streak({ current: 4, best: 9 })).isRecord).toBe(false);
    expect(streakCardModel(streak({ lastLost: { days: 6, on: "2026-10-01" } })).lostNote).toContain("6-day");
  });
});
