import { dailyStreak, keptDays, lostYesterday, shiftDayKey, MAX_SHIELDS } from "@/lib/services/streaks/dailyStreak";
import { chestDaysUpTo, chestOn, chestsOwed, chestTotal, ledgerOf, nextChest } from "@/lib/services/streaks/streakChests";
import { streakAriaLabel, streakHeader, streakLines } from "@/lib/services/streaks/streakCopy";

const HERO = "hero-1";
const TODAY = "2026-10-15";

/** One approved entry on each day `offset` days from TODAY (0 is today, -1 yesterday) */
const on = (offsets: number[], status = "approved", userId = HERO) =>
  offsets.map((offset) => ({ userId, status, dayKey: shiftDayKey(TODAY, offset) }));

/** Every day from `from` days ago up to `to` (inclusive) */
const range = (from: number, to: number): number[] => {
  const days: number[] = [];
  for (let offset = from; offset <= to; offset++) days.push(offset);
  return days;
};

describe("shiftDayKey", () => {
  it("steps across months, years and the DST change", () => {
    expect(shiftDayKey("2026-10-01", -1)).toBe("2026-09-30");
    expect(shiftDayKey("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftDayKey("2026-03-08", 1)).toBe("2026-03-09");
    expect(shiftDayKey("2026-11-01", -1)).toBe("2026-10-31");
  });
});

describe("keptDays", () => {
  it("counts approved and pending days of this hero only, never a rejected one", () => {
    const entries = [
      ...on([0]),
      ...on([-1], "pending"),
      ...on([-2], "rejected"),
      ...on([-3], "approved", "someone-else"),
      null,
      { userId: HERO, status: "approved", completedAt: new Date(2026, 9, 11, 21, 30).toISOString() },
    ];
    expect([...keptDays(entries, HERO)].sort()).toEqual(["2026-10-11", "2026-10-14", "2026-10-15"]);
    expect([...keptDays(entries, HERO, ["approved"])].sort()).toEqual(["2026-10-11", "2026-10-15"]);
  });
});

describe("dailyStreak", () => {
  it("is empty for a hero with no quests", () => {
    expect(dailyStreak([], HERO, TODAY)).toMatchObject({ current: 0, best: 0, doneToday: false, atRisk: false });
  });

  it("counts days in a row up to today", () => {
    const streak = dailyStreak(on([-2, -1, 0]), HERO, TODAY);
    expect(streak).toMatchObject({ current: 3, best: 3, doneToday: true, atRisk: false, runStart: "2026-10-13" });
  });

  it("keeps yesterday's streak at risk until today ends", () => {
    const streak = dailyStreak(on([-2, -1]), HERO, TODAY);
    expect(streak).toMatchObject({ current: 2, doneToday: false, atRisk: true });
  });

  it("several quests on one day count once", () => {
    expect(dailyStreak([...on([0]), ...on([0]), ...on([-1])], HERO, TODAY).current).toBe(2);
  });

  it("ends the run on a missed day with no shield and remembers it", () => {
    const streak = dailyStreak(on([-5, -4, -3, -1, 0]), HERO, TODAY);
    expect(streak).toMatchObject({ current: 2, best: 3, runStart: "2026-10-14" });
    expect(streak.lastLost).toEqual({ days: 3, on: "2026-10-13" });
  });

  it("is broken (0) once a whole day passed with nothing done", () => {
    const streak = dailyStreak(on([-4, -3, -2]), HERO, TODAY);
    expect(streak).toMatchObject({ current: 0, best: 3, atRisk: false });
    expect(lostYesterday(streak, TODAY)).toBe(true);
    expect(lostYesterday(dailyStreak(on([-5, -4, -3]), HERO, TODAY), TODAY)).toBe(false);
  });

  it("earns a shield on day 7 and spends it on a missed day, holding the count", () => {
    // Days -9..-3 kept (7 days, a shield), -2 missed (shield spent), -1 and 0 kept
    const streak = dailyStreak(on([...range(-9, -3), -1, 0]), HERO, TODAY);
    expect(streak).toMatchObject({ current: 9, shields: 0, shieldsUsed: 1, runStart: "2026-10-06", lastLost: null });
  });

  it("holds at most two shields", () => {
    const streak = dailyStreak(on(range(-29, 0)), HERO, TODAY);
    expect(streak.current).toBe(30);
    expect(streak.shields).toBe(MAX_SHIELDS);
  });

  it("loses the shields with the run", () => {
    // 7 kept (a shield), 2 missed: the first spends the shield, the second ends the run
    const streak = dailyStreak(on([...range(-10, -4), -1]), HERO, TODAY);
    expect(streak).toMatchObject({ current: 1, shields: 0, best: 7 });
    expect(streak.lastLost).toEqual({ days: 7, on: "2026-10-13" });
  });

  it("ignores entries after today", () => {
    expect(dailyStreak(on([1, 0]), HERO, TODAY).current).toBe(1);
  });
});

describe("streak chests", () => {
  it("opens on days 3, 7, 14, 30 and then every 30", () => {
    expect(chestOn(3)).toEqual({ day: 3, xp: 15, gp: 20 });
    expect(chestOn(4)).toBeNull();
    expect(chestOn(60)).toEqual({ day: 60, xp: 150, gp: 200 });
    expect(chestOn(75)).toBeNull();
    expect(chestDaysUpTo(65)).toEqual([3, 7, 14, 30, 60]);
  });

  it("names the next chest", () => {
    expect(nextChest(0).day).toBe(3);
    expect(nextChest(3).day).toBe(7);
    expect(nextChest(30).day).toBe(60);
    expect(nextChest(61).day).toBe(90);
  });

  it("owes every chest the run reached once, and nothing again", () => {
    const run = { current: 7, runStart: "2026-10-09" };
    const first = chestsOwed(run, null);
    expect(first.owed.map((chest) => chest.day)).toEqual([3, 7]);
    expect(first.ledger).toEqual({ runStart: "2026-10-09", paid: [3, 7] });
    expect(chestTotal(first.owed)).toEqual({ xp: 55, gp: 70 });
    expect(chestsOwed(run, first.ledger).owed).toEqual([]);
  });

  it("starts the ladder over for a new run", () => {
    const owed = chestsOwed({ current: 3, runStart: "2026-10-13" }, { runStart: "2026-09-01", paid: [3, 7, 14] });
    expect(owed.owed.map((chest) => chest.day)).toEqual([3]);
    expect(owed.ledger).toEqual({ runStart: "2026-10-13", paid: [3] });
  });

  it("owes nothing with no run", () => {
    expect(chestsOwed({ current: 0, runStart: null }, null)).toEqual({ owed: [], ledger: null });
  });

  it("reads only a usable ledger from the profile", () => {
    expect(ledgerOf(undefined)).toBeNull();
    expect(ledgerOf({ runStart: 5, paid: [] })).toBeNull();
    expect(ledgerOf({ runStart: "2026-10-01", paid: [3, "7", "x"] })).toEqual({ runStart: "2026-10-01", paid: [3, 7] });
  });
});

describe("streak copy", () => {
  it("tells a hero at risk what to do and what is next", () => {
    const streak = dailyStreak(on([-2, -1]), HERO, TODAY);
    expect(streakHeader(streak)).toBe("2-Day Streak");
    expect(streakAriaLabel(streak)).toContain("at risk");
    expect(streakLines(streak)).toEqual([
      "2 days in a row. Finish a quest before midnight to keep it.",
      "Next chest in 1 day (day 3): +15 XP, +20 GP.",
      "Every 7th day earns a Streak Shield that saves a missed day.",
      "Best streak: 2 days.",
    ]);
  });

  it("names the shields and the streak that ended", () => {
    const shielded = dailyStreak(on(range(-6, 0)), HERO, TODAY);
    expect(streakLines(shielded)).toContain("1 Streak Shield ready: a missed day spends one and your streak holds.");
    const lost = dailyStreak(on([-4, -3, -2]), HERO, TODAY);
    expect(streakHeader(lost)).toBe("Daily Streak");
    expect(streakLines(lost)).toContain("Your 3-day streak ended. Start a new one today!");
  });
});
