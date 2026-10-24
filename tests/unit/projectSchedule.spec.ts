/**
 * Project Towers schedule math: a project's phases spread over its dates, re-spread when the Game Master extends the
 * end, and the earliest end a project can have. Pure date math on local "YYYY-MM-DD" days.
 */
import { ROOF_PHASE_ID, daysBetween, extendWindows, minimumEndOn, phaseWindows } from "@/lib/services/projects/projectSchedule";
import type { PhaseWindow } from "@/lib/services/projects/projectSchedule";

const SPRING_SHARES = [
  { id: "p1", share: 0.3 },
  { id: "p2", share: 0.4 },
  { id: "p3", share: 0.2 },
  { id: "p4", share: 0.1 },
];

/** How many days each window covers, both ends counted */
const dayCounts = (windows: readonly PhaseWindow[]): number[] => windows.map((w) => daysBetween(w.opensOn, w.dueOn) + 1);

describe("daysBetween", () => {
  it("counts whole calendar days, signed", () => {
    expect(daysBetween("2027-04-03", "2027-04-16")).toBe(13);
    expect(daysBetween("2027-04-16", "2027-04-03")).toBe(-13);
    expect(daysBetween("2027-04-03", "2027-04-03")).toBe(0);
  });

  it("is not thrown by the daylight saving change", () => {
    expect(daysBetween("2027-03-13", "2027-03-15")).toBe(2);
    expect(daysBetween("2027-11-06", "2027-11-08")).toBe(2);
  });
});

describe("phaseWindows", () => {
  const windows = phaseWindows(SPRING_SHARES, "2027-04-03", "2027-04-16");

  it("spreads 14 days by cumulative share, rounded", () => {
    expect(dayCounts(windows)).toEqual([4, 6, 3, 1]);
  });

  it("opens the first phase on the start and the last one due on the end", () => {
    expect(windows[0].opensOn).toBe("2027-04-03");
    expect(windows[3].dueOn).toBe("2027-04-16");
  });

  it("opens each next phase the day after the previous one is due", () => {
    expect(windows.map((w) => [w.opensOn, w.dueOn])).toEqual([
      ["2027-04-03", "2027-04-06"],
      ["2027-04-07", "2027-04-12"],
      ["2027-04-13", "2027-04-15"],
      ["2027-04-16", "2027-04-16"],
    ]);
  });

  it("carries the phase ids in order", () => {
    expect(windows.map((w) => w.phaseId)).toEqual(["p1", "p2", "p3", "p4"]);
  });

  it("walks across a month and a year end", () => {
    const span = phaseWindows(SPRING_SHARES, "2027-12-28", "2028-01-10");
    expect(span[0].opensOn).toBe("2027-12-28");
    expect(span[3].dueOn).toBe("2028-01-10");
    expect(dayCounts(span).reduce((sum, n) => sum + n, 0)).toBe(14);
  });

  it("gives every phase a day, taking it from the biggest phase", () => {
    const lopsided = [
      { id: "a", share: 0.01 },
      { id: "b", share: 0.495 },
      { id: "c", share: 0.495 },
    ];
    expect(dayCounts(phaseWindows(lopsided, "2027-04-03", "2027-04-05"))).toEqual([1, 1, 1]);
  });

  it("breaks a tie for the biggest phase toward the earlier one", () => {
    const tie = [
      { id: "a", share: 0 },
      { id: "b", share: 0.5 },
      { id: "c", share: 0.5 },
    ];
    // boundaries 0, 2, 4 give [0, 2, 2]; the empty phase takes its day from b, the first of the biggest
    expect(dayCounts(phaseWindows(tie, "2027-04-03", "2027-04-06"))).toEqual([1, 1, 2]);
  });

  it("keeps the total and a day per phase over many lengths", () => {
    for (let length = SPRING_SHARES.length; length <= 60; length += 1) {
      const counts = dayCounts(phaseWindows(SPRING_SHARES, "2027-04-03", dayAfterStart(length - 1)));
      expect(counts.reduce((sum, n) => sum + n, 0)).toBe(length);
      expect(Math.min(...counts)).toBeGreaterThanOrEqual(1);
    }
  });

  it("settles a half day the same way whatever the float error", () => {
    // 0.3 + 0.2 sums to exactly 0.5 and 0.1 + 0.2 to 0.30000000000000004: both land on a half over 5 and 10 days
    const halves = [
      { id: "a", share: 0.3 },
      { id: "b", share: 0.2 },
      { id: "c", share: 0.5 },
    ];
    expect(dayCounts(phaseWindows(halves, "2027-04-03", "2027-04-07"))).toEqual([2, 1, 2]);
  });

  it("fits a project with exactly one day per phase", () => {
    const tight = phaseWindows(SPRING_SHARES, "2027-04-03", "2027-04-06");
    expect(tight.map((w) => [w.opensOn, w.dueOn])).toEqual([
      ["2027-04-03", "2027-04-03"],
      ["2027-04-04", "2027-04-04"],
      ["2027-04-05", "2027-04-05"],
      ["2027-04-06", "2027-04-06"],
    ]);
  });

  it("throws a RangeError when the end is too close for the phases", () => {
    expect(() => phaseWindows(SPRING_SHARES, "2027-04-03", "2027-04-04")).toThrow(RangeError);
  });

  it("throws a RangeError when the end is before the start", () => {
    expect(() => phaseWindows(SPRING_SHARES, "2027-04-03", "2027-04-01")).toThrow(RangeError);
  });

  it("returns no windows for no phases", () => {
    expect(phaseWindows([], "2027-04-03", "2027-04-16")).toEqual([]);
  });

  it("spreads evenly when no phase has a share", () => {
    const flat = [
      { id: "a", share: 0 },
      { id: "b", share: 0 },
    ];
    expect(dayCounts(phaseWindows(flat, "2027-04-03", "2027-04-08"))).toEqual([3, 3]);
  });
});

/** The date `days` after the spec's start, as a key */
function dayAfterStart(days: number): string {
  const end = new Date(2027, 3, 3 + days);
  const month = String(end.getMonth() + 1).padStart(2, "0");
  const day = String(end.getDate()).padStart(2, "0");
  return `${end.getFullYear()}-${month}-${day}`;
}

describe("minimumEndOn", () => {
  it("is the start plus one day fewer than the phases", () => {
    expect(minimumEndOn(4, "2027-04-03")).toBe("2027-04-06");
    expect(minimumEndOn(1, "2027-04-03")).toBe("2027-04-03");
  });

  it("is a date phaseWindows accepts, and the day before it is not", () => {
    expect(() => phaseWindows(SPRING_SHARES, "2027-04-03", minimumEndOn(4, "2027-04-03"))).not.toThrow();
    expect(() => phaseWindows(SPRING_SHARES, "2027-04-03", "2027-04-05")).toThrow(RangeError);
  });

  it("crosses a month end", () => {
    expect(minimumEndOn(4, "2027-04-29")).toBe("2027-05-02");
  });
});

describe("extendWindows", () => {
  const original = phaseWindows(SPRING_SHARES, "2027-04-03", "2027-04-16");
  const shares = { p1: 0.3, p2: 0.4, p3: 0.2, p4: 0.1 };
  const cleared = new Set(["p1"]);

  it("keeps a cleared phase's window untouched", () => {
    const extended = extendWindows(original, shares, cleared, "2027-04-08", "2027-04-23");
    expect(extended[0]).toEqual({ phaseId: "p1", opensOn: "2027-04-03", dueOn: "2027-04-06" });
  });

  it("spreads the other phases from today to the new end by their renormalised shares", () => {
    const extended = extendWindows(original, shares, cleared, "2027-04-08", "2027-04-23");
    // 16 days over 0.4 / 0.2 / 0.1 (4/7, 2/7, 1/7): boundaries 9.14 -> 9, 13.71 -> 14, 16
    expect(extended.slice(1).map((w) => [w.phaseId, w.opensOn, w.dueOn])).toEqual([
      ["p2", "2027-04-08", "2027-04-16"],
      ["p3", "2027-04-17", "2027-04-21"],
      ["p4", "2027-04-22", "2027-04-23"],
    ]);
  });

  it("keeps the phase order of the windows it was given", () => {
    const extended = extendWindows(original, shares, cleared, "2027-04-08", "2027-04-23");
    expect(extended.map((w) => w.phaseId)).toEqual(["p1", "p2", "p3", "p4"]);
  });

  it("does not change the windows it was given", () => {
    const before = JSON.parse(JSON.stringify(original));
    extendWindows(original, shares, cleared, "2027-04-08", "2027-04-23");
    expect(original).toEqual(before);
  });

  it("re-spreads every phase when none is cleared", () => {
    const extended = extendWindows(original, shares, new Set(), "2027-04-03", "2027-04-30");
    expect(extended).toEqual(phaseWindows(SPRING_SHARES, "2027-04-03", "2027-04-30"));
  });

  it("returns the windows as they are when every phase is cleared", () => {
    const all = new Set(["p1", "p2", "p3", "p4"]);
    expect(extendWindows(original, shares, all, "2027-04-17", "2027-04-30")).toEqual(original);
  });

  it("allows an end that leaves one day per uncleared phase", () => {
    const extended = extendWindows(original, shares, cleared, "2027-04-08", "2027-04-10");
    expect(extended.slice(1).map((w) => [w.opensOn, w.dueOn])).toEqual([
      ["2027-04-08", "2027-04-08"],
      ["2027-04-09", "2027-04-09"],
      ["2027-04-10", "2027-04-10"],
    ]);
  });

  it("throws a RangeError when the new end is before today", () => {
    expect(() => extendWindows(original, shares, cleared, "2027-04-08", "2027-04-07")).toThrow(RangeError);
  });

  it("throws a RangeError when the new end is too close for the uncleared phases", () => {
    expect(() => extendWindows(original, shares, cleared, "2027-04-08", "2027-04-09")).toThrow(RangeError);
  });

  it("reads a phase missing from the shares as no share", () => {
    const extended = extendWindows(original, { p2: 0.5, p3: 0.5 }, cleared, "2027-04-08", "2027-04-13");
    // 6 days over 0.5 / 0.5 / 0 gives [3, 3, 0]; the empty phase takes a day from p2, the first of the biggest
    expect(dayCounts(extended.slice(1))).toEqual([2, 3, 1]);
  });
});

describe("ROOF_PHASE_ID", () => {
  it("names the roof floor, which takes the last phase's window", () => {
    expect(ROOF_PHASE_ID).toBe("roof");
  });
});
