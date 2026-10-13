import type { Achievement } from "@/lib/databases/AchievementDb";
import type { QuestBoardItem } from "@/lib/engine/quests/QuestEngine";
import {
  GRUDGE_PER_MARK,
  MAX_GRUDGE_FACTOR,
  MAX_GRUDGE_MARKS,
  addGrudgeMark,
  clampMarks,
  clearGrudgeMarks,
  grudgeFactor,
  grudgeFactorFor,
  grudgeLabel,
  marksFor,
  marksOfFactor,
  type QuestGrudges,
} from "@/lib/services/battle/questGrudge";
import { pickQuestAmbush } from "@/lib/services/battle/questAmbush";

/**
 * Grudge marks (docs/Quest-Rooms-Spec.md 5.7): running from a quest fight leaves one mark on that quest's beast for
 * that hero, up to three, and each mark makes the beast's strikes 25% harder until the quest is done. Pure: the rules
 * only, over the hero's `questGrudges` record, which may be missing or hold old and odd data.
 */

const NOW = 1_700_000_000_000;

describe("the numbers", () => {
  it("are the owner's: three marks, +25% each, so 1.75x at most", () => {
    expect(MAX_GRUDGE_MARKS).toBe(3);
    expect(GRUDGE_PER_MARK).toBe(0.25);
    expect(MAX_GRUDGE_FACTOR).toBe(1.75);
  });
});

describe("clampMarks", () => {
  it.each([
    [0, 0],
    [1, 1],
    [3, 3],
    [4, 3],
    [99, 3],
    [-2, 0],
    [2.9, 2],
    ["2", 2],
    [Number.NaN, 0],
    [Infinity, 0],
    [null, 0],
    [undefined, 0],
    ["many", 0],
    [{}, 0],
  ])("reads %p as %p", (raw, expected) => {
    expect(clampMarks(raw)).toBe(expected);
  });
});

describe("grudgeFactor", () => {
  it("is 1 + 0.25 a mark", () => {
    expect(grudgeFactor(0)).toBe(1);
    expect(grudgeFactor(1)).toBe(1.25);
    expect(grudgeFactor(2)).toBe(1.5);
    expect(grudgeFactor(3)).toBe(1.75);
  });

  it("stays between 1 and 1.75 whatever it is given", () => {
    expect(grudgeFactor(7)).toBe(1.75);
    expect(grudgeFactor(-4)).toBe(1);
    expect(grudgeFactor(Number.NaN)).toBe(1);
    expect(grudgeFactor(undefined)).toBe(1);
  });
});

describe("marksOfFactor", () => {
  it("turns a factor back into the marks that made it", () => {
    expect([1, 1.25, 1.5, 1.75].map(marksOfFactor)).toEqual([0, 1, 2, 3]);
  });

  it("is tolerant of a factor out of range or unreadable", () => {
    expect(marksOfFactor(9)).toBe(3);
    expect(marksOfFactor(0.2)).toBe(0);
    expect(marksOfFactor(Number.NaN)).toBe(0);
    expect(marksOfFactor(undefined)).toBe(0);
  });
});

describe("marksFor and grudgeFactorFor", () => {
  const record: QuestGrudges = { q1: { marks: 2 }, q2: { marks: 3, lastFledAt: NOW } };

  it("read this quest's marks and nobody else's", () => {
    expect(marksFor(record, "q1")).toBe(2);
    expect(marksFor(record, "q2")).toBe(3);
    expect(marksFor(record, "q3")).toBe(0);
    expect(grudgeFactorFor(record, "q1")).toBe(1.5);
    expect(grudgeFactorFor(record, "q3")).toBe(1);
  });

  it("take a numeric quest id", () => {
    expect(marksFor({ "7": { marks: 1 } }, 7)).toBe(1);
  });

  it("are tolerant of a hero with no record, an old record and a broken one", () => {
    expect(marksFor(undefined, "q1")).toBe(0);
    expect(marksFor(null, "q1")).toBe(0);
    expect(marksFor("grudge", "q1")).toBe(0);
    expect(marksFor([], "q1")).toBe(0);
    expect(marksFor({ q1: null }, "q1")).toBe(0);
    expect(marksFor({ q1: 2 }, "q1")).toBe(0);
    expect(marksFor({ q1: {} }, "q1")).toBe(0);
    expect(marksFor({ q1: { marks: "2" } }, "q1")).toBe(2);
    expect(marksFor({ q1: { marks: 40 } }, "q1")).toBe(3);
    expect(marksFor({ q1: { marks: -1 } }, "q1")).toBe(0);
    expect(grudgeFactorFor({ q1: { marks: 40 } }, "q1")).toBe(1.75);
  });

  it("find nothing for a quest with no id", () => {
    expect(marksFor(record, "")).toBe(0);
    expect(marksFor(record, undefined)).toBe(0);
  });
});

describe("addGrudgeMark", () => {
  it("puts the first mark on a quest and stamps when the hero fled", () => {
    expect(addGrudgeMark(undefined, "q1", NOW)).toEqual({ q1: { marks: 1, lastFledAt: NOW } });
    expect(addGrudgeMark({}, "q1", NOW)).toEqual({ q1: { marks: 1, lastFledAt: NOW } });
  });

  it("adds one more each time, three at the most", () => {
    let record: QuestGrudges = {};
    const seen: number[] = [];
    for (let flight = 0; flight < 5; flight++) {
      record = addGrudgeMark(record, "q1", NOW + flight);
      seen.push(record.q1.marks);
    }
    expect(seen).toEqual([1, 2, 3, 3, 3]);
    expect(record.q1.lastFledAt).toBe(NOW + 4);
  });

  it("leaves the other quests alone and keeps the ambush stamp", () => {
    const before: QuestGrudges = { q1: { marks: 1, lastAmbushAt: 55 }, q2: { marks: 2 } };
    const after = addGrudgeMark(before, "q1", NOW);
    expect(after).toEqual({ q1: { marks: 2, lastFledAt: NOW, lastAmbushAt: 55 }, q2: { marks: 2 } });
  });

  it("never edits the record it was given", () => {
    const before: QuestGrudges = { q1: { marks: 1 } };
    const snapshot = JSON.parse(JSON.stringify(before));
    const after = addGrudgeMark(before, "q1", NOW);
    expect(before).toEqual(snapshot);
    expect(after).not.toBe(before);
  });

  it("starts from a broken record or a broken entry instead of throwing", () => {
    expect(addGrudgeMark(null, "q1", NOW)).toEqual({ q1: { marks: 1, lastFledAt: NOW } });
    expect(addGrudgeMark("junk" as unknown as QuestGrudges, "q1", NOW)).toEqual({ q1: { marks: 1, lastFledAt: NOW } });
    expect(addGrudgeMark({ q1: { marks: "2" } } as unknown as QuestGrudges, "q1", NOW).q1.marks).toBe(3);
    expect(addGrudgeMark({ q1: { marks: 80 } } as unknown as QuestGrudges, "q1", NOW).q1.marks).toBe(3);
    expect(addGrudgeMark({ q1: null } as unknown as QuestGrudges, "q1", NOW).q1.marks).toBe(1);
  });

  it("marks nothing for a quest with no id", () => {
    expect(addGrudgeMark({ q1: { marks: 1 } }, "", NOW)).toEqual({ q1: { marks: 1 } });
  });

  it("keys by the quest id as text", () => {
    expect(Object.keys(addGrudgeMark({}, 12 as unknown as string, NOW))).toEqual(["12"]);
  });
});

describe("clearGrudgeMarks", () => {
  it("takes a quest's marks away and forgets the quest", () => {
    expect(clearGrudgeMarks({ q1: { marks: 3, lastFledAt: NOW }, q2: { marks: 1 } }, "q1")).toEqual({ q2: { marks: 1 } });
  });

  it("keeps the ambush stamp: the cooldown belongs to the ambush rule, not to the marks", () => {
    expect(clearGrudgeMarks({ q1: { marks: 2, lastFledAt: NOW, lastAmbushAt: 99 } }, "q1")).toEqual({
      q1: { marks: 0, lastAmbushAt: 99 },
    });
  });

  it("is a no-op for a quest with no marks, and for a missing or broken record", () => {
    expect(clearGrudgeMarks({ q2: { marks: 1 } }, "q1")).toEqual({ q2: { marks: 1 } });
    expect(clearGrudgeMarks(undefined, "q1")).toEqual({});
    expect(clearGrudgeMarks(null, "q1")).toEqual({});
    expect(clearGrudgeMarks("junk" as unknown as QuestGrudges, "q1")).toEqual({});
  });

  it("never edits the record it was given", () => {
    const before: QuestGrudges = { q1: { marks: 2, lastFledAt: NOW } };
    const snapshot = JSON.parse(JSON.stringify(before));
    clearGrudgeMarks(before, "q1");
    expect(before).toEqual(snapshot);
  });

  it("reads back as no grudge, and the next flight starts again at one", () => {
    const cleared = clearGrudgeMarks({ q1: { marks: 3, lastFledAt: NOW } }, "q1");
    expect(marksFor(cleared, "q1")).toBe(0);
    expect(grudgeFactorFor(cleared, "q1")).toBe(1);
    expect(addGrudgeMark(cleared, "q1", NOW).q1.marks).toBe(1);
  });
});

describe("grudgeLabel", () => {
  it("says nothing for no marks", () => {
    expect(grudgeLabel(0)).toBe("");
    expect(grudgeLabel(undefined)).toBe("");
  });

  it("names the marks and how much harder the beast hits, for a screen reader too", () => {
    expect(grudgeLabel(1)).toBe("Holds a grudge: 1 mark, hits 25% harder");
    expect(grudgeLabel(2)).toBe("Holds a grudge: 2 marks, hits 50% harder");
    expect(grudgeLabel(3)).toBe("Holds a grudge: 3 marks, hits 75% harder");
    expect(grudgeLabel(8)).toBe("Holds a grudge: 3 marks, hits 75% harder");
  });
});

describe("the ambush rule reads the same record", () => {
  const dishes = {
    id: "q1",
    achievementName: "Dishes",
    beastId: "beast-dish-goblin",
    type: "individual",
    assignee: ["hero-1"],
    basicSchedule: "daily",
    dueByTime: "08:00",
    startsOn: "",
    endsOn: "",
    repeatOnDays: [],
    difficulty: 1,
  } as unknown as Achievement;
  const board: QuestBoardItem[] = [{ quest: dishes, status: "open", progress: null, pending: false, overdue: true }];
  const noon = new Date(2026, 9, 12, 12, 0, 0, 0);

  it("a hero's questGrudges fits pickQuestAmbush, marks and all", () => {
    const grudges: QuestGrudges = { q1: { marks: 2, lastFledAt: noon.getTime() } };
    expect(pickQuestAmbush(board, undefined, grudges, noon)?.quest.id).toBe("q1");
  });

  it("a quest that ambushed the hero within the hour rests, whatever its marks say", () => {
    const grudges: QuestGrudges = { q1: { marks: 3, lastAmbushAt: noon.getTime() - 10 * 60_000 } };
    expect(pickQuestAmbush(board, undefined, grudges, noon)).toBeNull();
  });

  it("clearing the marks does not wipe the ambush cooldown", () => {
    const cleared = clearGrudgeMarks({ q1: { marks: 3, lastAmbushAt: noon.getTime() - 10 * 60_000 } }, "q1");
    expect(pickQuestAmbush(board, undefined, cleared, noon)).toBeNull();
  });
});
