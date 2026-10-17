import type { Achievement } from "@/lib/databases/AchievementDb";
import type { Beast } from "@/lib/databases/BestiaryDb";
import type { QuestLogEntry } from "@/lib/databases/QuestLogDb";
import {
  battleProgressKey,
  loadBattleProgress,
  saveBattleProgress,
} from "@/app/Console/BattleField/battle/battleProgress";
import {
  beastOf,
  calendarCardStatus,
  cardFace,
  cardActions,
  checkedIds,
  dueClock,
  grudgeSlots,
  HUNT_BONUS_XP,
  huntBonusLabel,
  huntBonusXpOn,
  huntSteps,
  isClaimable,
  mergeProgress,
  progressContext,
  progressLine,
  spanText,
  stepsForState,
  tapStep,
  tamedCount,
  tamedLine,
  themeLine,
  tierBadge,
  toggleStep,
} from "../beastCard";

const quest = (overrides: Partial<Achievement> = {}): Achievement =>
  ({
    id: "q-socks",
    achievementName: "Put the socks away",
    noBeast: true,
    difficulty: 1,
    ...overrides,
  }) as Achievement;

const sockBeast: Beast = {
  id: "beast-sock",
  name: "Socktopus",
  checklist: ["Gather the socks", "Pair them up", "Put them in the drawer"],
};

const entry = (overrides: Partial<QuestLogEntry>): QuestLogEntry => ({
  id: "e1",
  questId: "q-socks",
  questName: "Put the socks away",
  userId: "hero-1",
  completedAt: "2026-10-12T18:00:00.000Z",
  dayKey: "2026-10-12",
  status: "approved",
  source: "claim",
  rewards: { xp: 100, gp: 10, ap: 1 },
  rewardsApplied: true,
  ...overrides,
});

describe("tierBadge", () => {
  it("reads the tier from the Fibonacci difficulty", () => {
    expect(tierBadge(1).tier).toBe("monster");
    expect(tierBadge(2).label).toBe("Monster");
    expect(tierBadge(3).tier).toBe("miniboss");
    expect(tierBadge(5).label).toBe("Miniboss");
    expect(tierBadge(8).tier).toBe("boss");
    expect(tierBadge(13).label).toBe("Boss");
  });

  it("rounds a legacy value down and treats a missing one as a monster", () => {
    expect(tierBadge(6).tier).toBe("miniboss");
    expect(tierBadge(undefined).tier).toBe("monster");
    expect(tierBadge(0).tier).toBe("monster");
  });
});

describe("beastOf", () => {
  it("prefers the family's own beast, then the library's entry", () => {
    const own = quest({ beastId: "beast-sock", noBeast: false });
    expect(beastOf(own, [sockBeast])).toBe(sockBeast);
    const library = beastOf(quest({ beastId: "beast-fluffalo", noBeast: false }), []);
    expect(library?.name).toBe("Fluffalo");
  });

  it("is undefined for a quest that chose no beast", () => {
    expect(beastOf(quest({ noBeast: true }), [sockBeast])).toBeUndefined();
  });
});

describe("themeLine", () => {
  it("joins the category and the beast's temple", () => {
    expect(themeLine({ theme: "shadow" }, "Kitchen chores")).toBe("Kitchen chores · Kitchen · Shadow");
    expect(themeLine({ theme: "shadow" })).toBe("Kitchen · Shadow");
    expect(themeLine(undefined, " Laundry ")).toBe("Laundry");
    expect(themeLine(undefined)).toBe("");
  });
});

describe("huntSteps", () => {
  it("makes the battle's task ids from the beast's checklist", () => {
    const steps = huntSteps(quest(), sockBeast);
    expect(steps.map((step) => step.id)).toEqual(["task-0", "task-1", "task-2"]);
    expect(steps.map((step) => step.name)).toEqual(sockBeast.checklist);
    expect(steps.every((step) => !step.checked)).toBe(true);
  });

  it("falls back to the chore itself as the one move, like the fight", () => {
    expect(huntSteps(quest())).toEqual([{ id: "q-socks-task", name: "Put the socks away", checked: false }]);
    expect(huntSteps(quest(), { checklist: [] })[0].id).toBe("q-socks-task");
  });

  it("reads a checklist entry saved as an object", () => {
    const beast = { checklist: [{ id: "a", label: "First" }, { name: "Second" }] } as unknown as Beast;
    const steps = huntSteps(quest(), beast);
    expect(steps.map((step) => step.id)).toEqual(["a", "task-1"]);
    expect(steps.map((step) => step.name)).toEqual(["First", "Second"]);
  });
});

describe("mergeProgress / toggleStep / checkedIds", () => {
  const steps = huntSteps(quest(), sockBeast);

  it("checks the remembered steps and ignores ids the checklist does not hold", () => {
    const merged = mergeProgress(steps, ["task-1", "task-9"]);
    expect(merged.map((step) => step.checked)).toEqual([false, true, false]);
    expect(checkedIds(merged)).toEqual(["task-1"]);
  });

  it("flips one step and leaves the rest", () => {
    const once = toggleStep(steps, "task-0");
    expect(checkedIds(once)).toEqual(["task-0"]);
    expect(checkedIds(toggleStep(once, "task-0"))).toEqual([]);
    expect(checkedIds(toggleStep(steps, "nope"))).toEqual([]);
  });

  it("describes the progress", () => {
    expect(progressLine(steps)).toBe("0 of 3 steps");
    expect(progressLine(mergeProgress(steps, ["task-0"]))).toBe("1 of 3 steps");
    expect(progressLine(mergeProgress(steps, ["task-0", "task-1", "task-2"]))).toBe("All 3 steps");
    expect(progressLine(huntSteps(quest()))).toBe("1 step");
  });
});

describe("tapStep", () => {
  const steps = huntSteps(quest(), sockBeast);

  it("reports a check that leaves steps open as a plain check", () => {
    const tap = tapStep(steps, "task-0");
    expect(tap.checked).toBe(true);
    expect(tap.completesList).toBe(false);
    expect(checkedIds(tap.steps)).toEqual(["task-0"]);
  });

  it("reports the last check as completing the list", () => {
    const tap = tapStep(mergeProgress(steps, ["task-0", "task-1"]), "task-2");
    expect(tap.checked).toBe(true);
    expect(tap.completesList).toBe(true);
  });

  it("reports an uncheck, even from a finished list, as not completing", () => {
    const tap = tapStep(mergeProgress(steps, ["task-0", "task-1", "task-2"]), "task-1");
    expect(tap.checked).toBe(false);
    expect(tap.completesList).toBe(false);
  });

  it("changes nothing for an unknown id", () => {
    const tap = tapStep(steps, "nope");
    expect(tap.known).toBe(false);
    expect(checkedIds(tap.steps)).toEqual([]);
  });
});

describe("shared progress with the battle", () => {
  beforeEach(() => localStorage.clear());

  it("uses the key the fight uses for this hero and quest", () => {
    const ctx = progressContext("hero-1", "q-socks");
    expect(battleProgressKey(ctx)).toBe(
      battleProgressKey({ kind: "quest", userId: "hero-1", questId: "q-socks", beastIds: [] })
    );
    expect(battleProgressKey(ctx)).toContain("hero-1:quest:q-socks:");
  });

  it("round-trips what the card saves into what the fight loads", () => {
    const ctx = progressContext("hero-1", "q-socks");
    const steps = toggleStep(toggleStep(huntSteps(quest(), sockBeast), "task-0"), "task-2");
    saveBattleProgress(ctx, checkedIds(steps));

    // The fight reads the same record and restores those attacks...
    expect(loadBattleProgress(ctx)).toEqual(["task-0", "task-2"]);
    // ...and a step it finishes later reads checked on the card
    saveBattleProgress(ctx, [...loadBattleProgress(ctx), "task-1"]);
    const reopened = mergeProgress(huntSteps(quest(), sockBeast), loadBattleProgress(ctx));
    expect(reopened.every((step) => step.checked)).toBe(true);
  });

  it("keeps heroes and quests apart", () => {
    saveBattleProgress(progressContext("hero-1", "q-socks"), ["task-0"]);
    expect(loadBattleProgress(progressContext("hero-2", "q-socks"))).toEqual([]);
    expect(loadBattleProgress(progressContext("hero-1", "q-dishes"))).toEqual([]);
  });
});

describe("cardActions / isClaimable", () => {
  const steps = huntSteps(quest(), sockBeast);
  const allDone = mergeProgress(steps, ["task-0", "task-1", "task-2"]);

  it("lets an open or overdue quest be checked and hunted, and claimed once every step is done", () => {
    for (const status of ["open", "overdue"] as const) {
      expect(cardActions(status, steps)).toMatchObject({ canCheck: true, canHunt: true, canClaim: false, showButtons: true });
      expect(cardActions(status, allDone).canClaim).toBe(true);
    }
  });

  it("hands over from Hunt to Claim when every step is checked", () => {
    expect(cardActions("open", mergeProgress(steps, ["task-0"])).canHunt).toBe(true);
    expect(cardActions("open", allDone)).toMatchObject({ canHunt: false, canClaim: true });
  });

  it("does not claim a half-done checklist or an empty one", () => {
    expect(isClaimable("open", mergeProgress(steps, ["task-0"]))).toBe(false);
    expect(isClaimable("open", [])).toBe(false);
  });

  it("only shows a tamed, pending or not-yet-due quest", () => {
    for (const status of ["done", "pending", "later"] as const) {
      const actions = cardActions(status, allDone);
      expect(actions).toMatchObject({ canCheck: false, canHunt: false, canClaim: false, showButtons: false });
      expect(actions.note).not.toBe("");
    }
    expect(cardActions("open", steps).note).toBe("");
  });

  it("only shows why a chore the family locked for being late cannot be worked", () => {
    const note = "Too late: this one closed at 6:00pm";
    expect(cardActions("overdue", allDone, "adventure", note)).toEqual({
      canCheck: false,
      canHunt: false,
      canClaim: false,
      showButtons: false,
      note,
    });
  });

  it("shows a tamed or pending quest with every step done", () => {
    expect(stepsForState("done", steps).every((step) => step.checked)).toBe(true);
    expect(stepsForState("pending", steps).every((step) => step.checked)).toBe(true);
    expect(stepsForState("open", steps).some((step) => step.checked)).toBe(false);
  });
});

describe("calendarCardStatus", () => {
  it("maps the Calendar's board item", () => {
    expect(calendarCardStatus("open", false, true)).toBe("open");
    expect(calendarCardStatus("done", false, true)).toBe("done");
    expect(calendarCardStatus("done", true, true)).toBe("pending");
  });

  it("only views a quest on another day", () => {
    expect(calendarCardStatus("open", false, false)).toBe("later");
    expect(calendarCardStatus("notDue", false, true)).toBe("later");
    expect(calendarCardStatus("done", false, false)).toBe("done");
  });
});

describe("tamedCount / tamedLine", () => {
  it("counts the hero's approved entries for the quest", () => {
    const entries = [
      entry({ id: "1" }),
      entry({ id: "2" }),
      entry({ id: "3", status: "pending" }),
      entry({ id: "4", status: "rejected" }),
      entry({ id: "5", userId: "hero-2" }),
      entry({ id: "6", questId: "q-dishes" }),
    ];
    expect(tamedCount(entries, "q-socks", "hero-1")).toBe(2);
    expect(tamedCount([], "q-socks", "hero-1")).toBe(0);
  });

  it("reads like a bestiary", () => {
    expect(tamedLine(0)).toBe("Never tamed");
    expect(tamedLine(1)).toBe("Tamed 1 time");
    expect(tamedLine(7)).toBe("Tamed 7 times");
  });
});

describe("grudgeSlots", () => {
  it("lights a slot per mark, three at the most", () => {
    expect(grudgeSlots(0)).toEqual([]);
    expect(grudgeSlots(undefined)).toEqual([]);
    expect(grudgeSlots(1)).toEqual([true, false, false]);
    expect(grudgeSlots(3)).toEqual([true, true, true]);
    expect(grudgeSlots(9)).toEqual([true, true, true]);
  });
});

describe("dueClock", () => {
  const now = new Date(2026, 9, 13, 16, 0, 0);

  it("counts down to a due time", () => {
    expect(dueClock("open", new Date(2026, 9, 13, 18, 10, 0), "6:10pm", now)).toBe("Due 6:10pm · 2h 10m left");
    expect(dueClock("open", new Date(2026, 9, 13, 16, 35, 0), "4:35pm", now)).toBe("Due 4:35pm · 35m left");
  });

  it("says Anytime for a quest with no time", () => {
    expect(dueClock("open", null, "Anytime", now)).toBe("Anytime today");
  });

  it("marks what is overdue", () => {
    expect(dueClock("overdue", new Date(2026, 9, 13, 9, 0, 0), "9:00am", now)).toBe("Overdue · was due 9:00am");
  });

  it("says nothing for a tamed or pending quest", () => {
    expect(dueClock("done", null, "", now)).toBe("");
    expect(dueClock("pending", new Date(2026, 9, 13, 18, 0, 0), "6:00pm", now)).toBe("");
  });

  it("names the time of a quest that is not due yet", () => {
    expect(dueClock("later", null, "Wed 14 Oct", now)).toBe("Due Wed 14 Oct");
  });
});

describe("spanText", () => {
  it("shortens a span", () => {
    expect(spanText(0)).toBe("under a minute");
    expect(spanText(45)).toBe("45m");
    expect(spanText(120)).toBe("2h");
    expect(spanText(130)).toBe("2h 10m");
    expect(spanText(1500)).toBe("1d 1h");
    expect(spanText(2880)).toBe("2d");
  });
});

describe("hunt bonus", () => {
  it("prints the one shared number as a percentage", () => {
    expect(HUNT_BONUS_XP).toBe(0.25);
    expect(huntBonusLabel()).toBe("Hunt bonus +25% XP");
    expect(huntBonusLabel(0.5)).toBe("Hunt bonus +50% XP");
  });
});

describe("cardFace", () => {
  it("shows the beast's own look and backdrop", () => {
    const face = cardFace({ ...sockBeast, avatar: 7, bg1: 12, bg2: 34, imageUrl: "x.png" }, "monster");
    expect(face).toEqual({ name: "Socktopus", avatar: 7, picture: "x.png", bg1: 12, bg2: 34, isStandIn: false });
  });

  it("shows the tier's stand-in for a quest with no beast, like the fight", () => {
    const face = cardFace(undefined, "boss");
    expect(face.isStandIn).toBe(true);
    expect(face.name).not.toBe("");
    expect(face.avatar).toBeGreaterThan(0);
    expect(face.bg1).toBeUndefined();
  });
});

describe("the hunt bonus the card prints", () => {
  it("is the one shared number, handed on from the quest services", () => {
    expect(huntBonusXpOn(120)).toBe(30);
    expect(huntBonusLabel()).toBe("Hunt bonus +25% XP");
  });
});
