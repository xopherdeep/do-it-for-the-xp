import { changeLabel, heroInsights, recapLines, recapShareText, timeOfDay } from "@/lib/services/insights/heroInsights";
import { shiftDayKey } from "@/lib/services/streaks/dailyStreak";

const HERO = "hero-1";
const NOW = new Date(2026, 9, 15, 19, 0); // Thursday 15 Oct 2026, 7pm
const TODAY = "2026-10-15";

/** An entry `offset` days from today at `hour` o'clock */
const done = (offset: number, questId: string, xp = 10, extra: Record<string, unknown> = {}) => {
  const dayKey = shiftDayKey(TODAY, offset);
  const [y, m, d] = dayKey.split("-").map(Number);
  return {
    userId: HERO,
    questId,
    questName: `Quest ${questId}`,
    status: "approved",
    source: "claim",
    dayKey,
    completedAt: new Date(y, m - 1, d, Number(extra.hour ?? 8), 0).toISOString(),
    rewards: { xp, gp: 5, ap: 0 },
    ...extra,
  };
};

describe("heroInsights", () => {
  const entries = [
    done(0, "dishes", 10),
    done(-1, "dishes", 10, { hour: 18 }),
    done(-2, "bed", 20, { source: "battle", huntBonusXp: 5 }),
    done(-3, "dishes", 10),
    done(-9, "bed", 20),
    done(-10, "trash", 30),
    done(-1, "dishes", 99, { status: "rejected" }),
    done(0, "trash", 99, { status: "pending" }),
    done(0, "dishes", 99, { userId: "sibling" }),
    null,
  ];
  const insights = heroInsights(
    entries,
    HERO,
    { questFlees: { bed: 2, trash: 4, dishes: "x" }, questGrudges: { bed: { marks: 2 } } },
    NOW,
    new Map([["trash", "Take Out Trash"]])
  );

  it("totals this week (the last 7 days) and last week from approved entries only", () => {
    expect(insights.thisWeek).toEqual({ quests: 4, xp: 55, gp: 20, activeDays: 4 });
    expect(insights.lastWeek).toEqual({ quests: 2, xp: 50, gp: 10, activeDays: 2 });
  });

  it("totals all time and counts the battles won", () => {
    expect(insights.allTime).toEqual({ quests: 6, xp: 105, gp: 30, beasts: 3, fights: 1 });
  });

  it("charts 8 weeks of XP, oldest first, ending on this week", () => {
    expect(insights.xpByWeek).toHaveLength(8);
    expect(insights.xpByWeek[7]).toEqual({ from: "2026-10-09", xp: 55, quests: 4 });
    expect(insights.xpByWeek[6]).toEqual({ from: "2026-10-02", xp: 50, quests: 2 });
    expect(insights.xpByWeek[0].from).toBe("2026-08-21");
  });

  it("ranks the beasts tamed most, with the board's names over the log's", () => {
    expect(insights.topBeasts).toEqual([
      { questId: "dishes", name: "Quest dishes", count: 3 },
      { questId: "bed", name: "Quest bed", count: 2 },
      { questId: "trash", name: "Take Out Trash", count: 1 },
    ]);
    expect(insights.weekTopBeasts[0]).toEqual({ questId: "dishes", name: "Quest dishes", count: 3 });
  });

  it("ranks the beasts the hero ran from, ignoring counts it cannot read", () => {
    expect(insights.dodged).toEqual([
      { questId: "trash", name: "Take Out Trash", count: 4 },
      { questId: "bed", name: "Quest bed", count: 2 },
    ]);
  });

  it("finds the busiest weekday and favorite time", () => {
    expect(insights.favoriteTime).toBe("morning");
    expect(insights.busiestWeekday).not.toBeNull();
  });

  it("reads the streak too", () => {
    expect(insights.streak).toMatchObject({ current: 4, doneToday: true });
  });

  it("is all zeros for a hero with no quests", () => {
    const empty = heroInsights([], HERO, null, NOW);
    expect(empty.allTime.quests).toBe(0);
    expect(empty.busiestWeekday).toBeNull();
    expect(empty.dodged).toEqual([]);
    expect(recapLines(empty)).toEqual(["No quests done this week yet. Today is a great day to start!"]);
  });
});

describe("recap", () => {
  const insights = heroInsights([done(0, "a"), done(-1, "a"), done(-2, "a"), done(-8, "b")], HERO, null, NOW);

  it("leads with the week's haul and brags only about what is true", () => {
    expect(recapLines(insights)).toEqual([
      "Tamed 3 beasts for 30 XP and 15 GP.",
      "Played 3 of the last 7 days.",
      "On a 3-day streak (best 3).",
      "Favorite foe: Quest a, beaten 3 times.",
      "2 more quests than last week!",
    ]);
  });

  it("shares as plain text with the hero's name", () => {
    expect(recapShareText("Sam", insights).split("\n")[0]).toBe("Sam's week in Do It For The XP");
  });

  it("labels the change against last week", () => {
    expect(changeLabel(5, 3)).toBe("+2 vs last week");
    expect(changeLabel(1, 3)).toBe("-2 vs last week");
    expect(changeLabel(2, 2)).toBe("same as last week");
  });

  it("buckets hours into parts of the day", () => {
    expect([4, 5, 12, 17, 21].map(timeOfDay)).toEqual(["night", "morning", "afternoon", "evening", "night"]);
  });
});
