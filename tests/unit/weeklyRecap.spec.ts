import { recapShareText, weekRangeOf, weeklyRecap } from "@/lib/services/insights/weeklyRecap";
import type { RecapEntry } from "@/lib/services/insights/weeklyRecap";
import { levelUpsOf, recapHeroesOf } from "@/lib/services/insights/recapRoster";

// 2026-10-17 is a Saturday
const NOW = new Date(2026, 9, 17, 18, 0, 0);
const MIA = { id: "mia", name: "Mia" };
const OTTO = { id: "otto", name: "Otto" };

let counter = 0;
const done = (userId: string, dayKey: string, extra: Partial<RecapEntry> = {}): RecapEntry => ({
  userId,
  dayKey,
  completedAt: `${dayKey}T12:00:00`,
  status: "approved",
  questId: "q-sock",
  questName: "Socktopus",
  rewards: { xp: 10, gp: 2, ap: 1 },
  ...{ id: `e${counter++}` },
  ...extra,
});

describe("weekRangeOf", () => {
  it("rolling is the last seven days with today", () => {
    expect(weekRangeOf(NOW, "rolling")).toEqual({ from: "2026-10-11", to: "2026-10-17" });
  });

  it("calendar starts on Monday by default and on the chosen weekday otherwise", () => {
    expect(weekRangeOf(NOW, "calendar")).toEqual({ from: "2026-10-12", to: "2026-10-17" });
    expect(weekRangeOf(NOW, "calendar", 0)).toEqual({ from: "2026-10-11", to: "2026-10-17" });
    expect(weekRangeOf(NOW, "calendar", 6)).toEqual({ from: "2026-10-17", to: "2026-10-17" });
  });

  it("previous is the whole calendar week before this one, seven days long", () => {
    expect(weekRangeOf(NOW, "previous")).toEqual({ from: "2026-10-05", to: "2026-10-11" });
    expect(weekRangeOf(new Date(2026, 9, 19, 8), "previous")).toEqual({ from: "2026-10-12", to: "2026-10-18" });
  });

  it("falls back to Monday for a nonsense week start", () => {
    expect(weekRangeOf(NOW, "calendar", 9)).toEqual({ from: "2026-10-12", to: "2026-10-17" });
  });

  it("still has seven days across the autumn and spring clock changes", () => {
    const fall = weekRangeOf(new Date(2026, 10, 3, 9), "previous");
    expect(fall).toEqual({ from: "2026-10-26", to: "2026-11-01" });
    const spring = weekRangeOf(new Date(2026, 2, 17, 9), "previous");
    expect(spring).toEqual({ from: "2026-03-09", to: "2026-03-15" });
  });
});

describe("weeklyRecap", () => {
  it("is a friendly empty recap for an empty week", () => {
    const recap = weeklyRecap([], [MIA, OTTO], NOW);
    expect(recap.isEmpty).toBe(true);
    expect(recap.heroOfTheWeek).toBeNull();
    expect(recap.teamWin).toBe(false);
    expect(recap.family.chores).toBe(0);
    expect(recap.lines).toHaveLength(1);
    expect(recapShareText(recap)).toContain("This week in the village");
  });

  it("copes with no heroes at all and with null entries", () => {
    const recap = weeklyRecap([null, undefined, done("ghost", "2026-10-15")], [], NOW);
    expect(recap.heroes).toEqual([]);
    expect(recap.isEmpty).toBe(true);
  });

  it("counts approved chores and pays only what was approved", () => {
    const recap = weeklyRecap(
      [
        done("mia", "2026-10-15", { huntBonusXp: 5 }),
        done("mia", "2026-10-16"),
        done("mia", "2026-10-16", { status: "pending", rewards: { xp: 99, gp: 99, ap: 99 } }),
        done("mia", "2026-10-16", { status: "rejected" }),
      ],
      [MIA],
      NOW
    );
    const mia = recap.heroes[0];
    expect(mia).toMatchObject({ chores: 2, pending: 1, sentBack: 1, xp: 25, gp: 4, ap: 2, activeDays: 2 });
    expect(recap.family).toMatchObject({ chores: 2, pending: 1, xp: 25 });
  });

  it("shows a week of only pending claims as waiting, not as an empty village", () => {
    const recap = weeklyRecap([done("mia", "2026-10-16", { status: "pending" })], [MIA], NOW);
    expect(recap.isEmpty).toBe(true);
    expect(recap.family.pending).toBe(1);
    expect(recap.lines[0]).toContain("waiting for the Game Master");
  });

  it("leaves out days before the week and days after today", () => {
    const recap = weeklyRecap(
      [done("mia", "2026-10-10"), done("mia", "2026-10-11"), done("mia", "2026-10-17"), done("mia", "2026-10-18")],
      [MIA],
      NOW
    );
    expect(recap.heroes[0].chores).toBe(2);
  });

  it("reads the local day of completedAt when the entry has no dayKey", () => {
    const late = new Date(2026, 9, 16, 23, 30).toISOString();
    const recap = weeklyRecap([{ userId: "mia", status: "approved", completedAt: late, questName: "Dust" }], [MIA], NOW);
    expect(recap.heroes[0].chores).toBe(1);
    expect(recap.family.busiestDay?.dayKey).toBe("2026-10-16");
  });

  it("finds the busiest day (the earlier one on a tie) and its weekday", () => {
    const recap = weeklyRecap(
      [done("mia", "2026-10-14"), done("mia", "2026-10-15"), done("otto", "2026-10-15"), done("otto", "2026-10-14")],
      [MIA, OTTO],
      NOW
    );
    expect(recap.family.busiestDay).toEqual({ dayKey: "2026-10-14", weekday: 3, chores: 2 });
    expect(recap.heroes[0].busiestDay?.dayKey).toBe("2026-10-14");
  });

  it("names the beasts a hero tamed, most first", () => {
    const recap = weeklyRecap(
      [
        done("mia", "2026-10-13"),
        done("mia", "2026-10-14"),
        done("mia", "2026-10-15", { questName: "Dust Bunny" }),
        done("mia", "2026-10-15", { questName: "  " }),
      ],
      [MIA],
      NOW
    );
    expect(recap.heroes[0].beasts).toEqual([
      { name: "Socktopus", count: 2 },
      { name: "Dust Bunny", count: 1 },
    ]);
    expect(recap.lines.join(" ")).toMatch(/Mia finished "Socktopus" 2 times!|"Socktopus" met Mia 2 times/);
  });

  it("reads the streak on the last day and the best run inside the week", () => {
    const recap = weeklyRecap(
      [
        done("mia", "2026-10-12"),
        done("mia", "2026-10-13"),
        done("mia", "2026-10-14"),
        done("mia", "2026-10-16", { status: "pending" }),
        done("mia", "2026-10-17"),
      ],
      [MIA],
      NOW
    );
    expect(recap.heroes[0].bestStreak).toBe(3);
    expect(recap.heroes[0].streak).toBe(2);
  });

  it("lists the level-ups that happened inside the week", () => {
    const recap = weeklyRecap([done("mia", "2026-10-15")], [MIA], NOW, {
      levelUps: [
        { heroId: "mia", level: 4, at: new Date(2026, 9, 14, 9).toISOString() },
        { heroId: "mia", level: 3, at: new Date(2026, 9, 1, 9).toISOString() },
        { heroId: "otto", level: 9, at: new Date(2026, 9, 14, 9).toISOString() },
        { heroId: "mia", level: 5, at: "garbage" },
      ],
    });
    expect(recap.heroes[0].levelUps).toEqual([4]);
    expect(recap.family.levelUps).toBe(1);
    expect(recap.lines.join(" ")).toContain("Mia reached level 4!");
  });

  describe("hero of the week", () => {
    it("is whoever did the most chores", () => {
      const recap = weeklyRecap(
        [done("mia", "2026-10-15"), done("mia", "2026-10-16"), done("otto", "2026-10-16")],
        [MIA, OTTO],
        NOW
      );
      expect(recap.heroOfTheWeek?.name).toBe("Mia");
      expect(recap.teamWin).toBe(false);
    });

    it("breaks a tie on chores by XP", () => {
      const recap = weeklyRecap(
        [done("mia", "2026-10-15"), done("otto", "2026-10-16", { rewards: { xp: 50, gp: 0, ap: 0 } })],
        [MIA, OTTO],
        NOW
      );
      expect(recap.heroOfTheWeek?.name).toBe("Otto");
    });

    it("is a team win when heroes are level on chores and XP, with no one named", () => {
      const recap = weeklyRecap([done("mia", "2026-10-15"), done("otto", "2026-10-16")], [MIA, OTTO], NOW);
      expect(recap.heroOfTheWeek).toBeNull();
      expect(recap.teamWin).toBe(true);
      expect(recap.lines[0]).toMatch(/team/i);
    });

    it("does not crown a hero who did nothing", () => {
      const recap = weeklyRecap([done("mia", "2026-10-15")], [MIA, OTTO], NOW);
      expect(recap.heroOfTheWeek?.name).toBe("Mia");
      expect(recap.lines.join(" ")).not.toContain("Otto");
    });

    it("is not announced for a family of one, who just gets their numbers", () => {
      const recap = weeklyRecap([done("mia", "2026-10-15")], [MIA], NOW);
      expect(recap.heroOfTheWeek?.name).toBe("Mia");
      expect(recap.lines.join(" ")).not.toContain("hero of the week");
    });
  });

  it("never shames: no copy mentions missed, overdue or sent-back chores", () => {
    const recap = weeklyRecap(
      [done("mia", "2026-10-15"), done("otto", "2026-10-16", { status: "rejected" })],
      [MIA, OTTO],
      NOW
    );
    expect(recapShareText(recap)).not.toMatch(/miss|overdue|late|sent back|lazy|behind/i);
  });

  it("is stable: the same week reads the same on every call", () => {
    const entries = [done("mia", "2026-10-15"), done("mia", "2026-10-16")];
    expect(weeklyRecap(entries, [MIA], NOW).lines).toEqual(weeklyRecap(entries, [MIA], NOW).lines);
  });

  it("shares plain text with each active hero", () => {
    const recap = weeklyRecap([done("mia", "2026-10-15"), done("mia", "2026-10-16")], [MIA, OTTO], NOW);
    const text = recapShareText(recap);
    expect(text.startsWith("This week in the village (Oct 11 to Oct 17)")).toBe(true);
    expect(text).toContain("Mia: 2 chores, 20 XP, 4 GP");
    expect(text).not.toContain("Otto:");
    expect(text.endsWith("Do It For The XP")).toBe(true);
  });

  it("ignores duplicate hero refs", () => {
    const recap = weeklyRecap([done("mia", "2026-10-15")], [MIA, MIA], NOW);
    expect(recap.heroes).toHaveLength(1);
    expect(recap.family.chores).toBe(1);
  });
});

describe("recapRoster", () => {
  it("takes the profiles that are not Game Masters, by name", () => {
    expect(
      recapHeroesOf({
        a: { id: "a", name: { nick: "Zed" } },
        b: { id: "b", isAdult: true, name: { nick: "Mom" } },
        c: { id: "c", name: { first: "Amy" } },
        d: undefined,
      })
    ).toEqual([
      { id: "c", name: "Amy" },
      { id: "a", name: "Zed" },
    ]);
  });

  it("reads level-ups from the feed", () => {
    const base = { title: "", body: "", createdAt: "2026-10-14T10:00:00.000Z" };
    const feed = [
      { ...base, id: "1", heroId: "mia", kind: "level-up" as const, refId: "level-7" },
      { ...base, id: "2", heroId: "mia", kind: "level-up" as const, refId: "oops" },
      { ...base, id: "3", heroId: "otto", kind: "level-up" as const, refId: "level-2" },
      { ...base, id: "4", heroId: "mia", kind: "gold" as const, refId: "level-3" },
    ];
    expect(levelUpsOf(feed, "mia")).toEqual([{ heroId: "mia", level: 7, at: base.createdAt }]);
  });
});
