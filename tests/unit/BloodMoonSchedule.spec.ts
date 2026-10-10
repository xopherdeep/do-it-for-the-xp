/**
 * The blood moon's calendar (section 5 of docs/Temple-Generation-Contract.md): nextWeekly finds the next
 * weekly rising at the same wall-clock time, describeNextMoon puts a record's schedule in one line for the
 * Game Master's panel.
 */
import { describeNextMoon, describeWait, formatMoonDate, nextWeekly } from "@/lib/engine/core/dungeons/bloodMoonSchedule";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Local calendar day and wall-clock time of an ISO instant, for comparisons a DST change cannot upset. */
const local = (iso: string) => {
  const at = new Date(iso);
  return { day: Math.floor((at.getTime() - at.getTimezoneOffset() * 60 * 1000) / DAY_MS), hours: at.getHours(), minutes: at.getMinutes() };
};

describe("nextWeekly", () => {
  const now = new Date("2026-10-10T18:30:00.000Z");

  it("is a week on from now, to the minute, when counted from now", () => {
    const next = nextWeekly(now.toISOString(), now);

    expect(local(next)).toEqual({ ...local(now.toISOString()), day: local(now.toISOString()).day + 7 });
    expect(Date.parse(next)).toBeGreaterThan(now.getTime());
  });

  it("keeps a time still to come as it is", () => {
    expect(nextWeekly("2026-10-12T06:00:00.000Z", now)).toBe("2026-10-12T06:00:00.000Z");
  });

  it("steps a spent time forward in whole weeks until it is still to come", () => {
    const spent = "2026-10-01T06:00:00.000Z"; // a Thursday; the 8th has also passed, the 15th has not
    const next = nextWeekly(spent, now);

    expect(local(next)).toEqual({ ...local(spent), day: local(spent).day + 14 });
    expect(Date.parse(next)).toBeGreaterThan(now.getTime());
  });

  it("skips months a hero was away in whole weeks, landing on the same weekday", () => {
    const spent = "2025-01-02T06:00:00.000Z";
    const next = nextWeekly(spent, now);

    expect((local(next).day - local(spent).day) % 7).toBe(0);
    expect(Date.parse(next)).toBeGreaterThan(now.getTime());
    expect(Date.parse(next) - now.getTime()).toBeLessThanOrEqual(7 * DAY_MS);
  });

  it("counts from now when given no date at all", () => {
    expect(nextWeekly("not a date", now)).toBe(nextWeekly(now.toISOString(), now));
  });
});

describe("describeWait", () => {
  const now = new Date("2026-10-10T12:00:00.000Z");

  it("rounds to the largest unit that fits", () => {
    expect(describeWait("2026-10-17T12:00:00.000Z", now)).toBe("in 7 days");
    expect(describeWait("2026-10-11T12:00:00.000Z", now)).toBe("in 1 day");
    expect(describeWait("2026-10-10T15:10:00.000Z", now)).toBe("in 3 hours");
    expect(describeWait("2026-10-10T12:20:00.000Z", now)).toBe("in 20 minutes");
    expect(describeWait("2026-10-10T12:01:00.000Z", now)).toBe("in 1 minute");
  });

  it("is 'in a moment' for what is at hand, past, or not a date", () => {
    expect(describeWait("2026-10-10T12:00:30.000Z", now)).toBe("in a moment");
    expect(describeWait("2026-10-01T12:00:00.000Z", now)).toBe("in a moment");
    expect(describeWait("soon", now)).toBe("in a moment");
  });
});

describe("describeNextMoon", () => {
  const now = new Date("2026-10-10T12:00:00.000Z");
  const FUTURE = "2026-10-17T12:00:00.000Z";
  const PAST = "2026-10-03T12:00:00.000Z";

  it("says when a scheduled moon rises, and that it then repeats weekly", () => {
    expect(describeNextMoon({ bloodMoonAt: FUTURE }, now)).toBe(`Rises in 7 days (${formatMoonDate(FUTURE)})`);
    expect(describeNextMoon({ bloodMoonAt: FUTURE, bloodMoonEvery: "weekly" }, now)).toBe(`Rises in 7 days (${formatMoonDate(FUTURE)}), then weekly`);
  });

  it("marks a moon whose time has come as due at the hero's next entry", () => {
    expect(describeNextMoon({ bloodMoonAt: PAST }, now)).toBe(`Due: rises when the hero next enters (was ${formatMoonDate(PAST)})`);
    expect(describeNextMoon({ bloodMoonAt: PAST, bloodMoonEvery: "weekly" }, now)).toMatch(/^Due: .*, then weekly$/);
  });

  it("says when nothing is scheduled, with or without a record", () => {
    expect(describeNextMoon({}, now)).toBe("No blood moon scheduled");
    expect(describeNextMoon(null, now)).toBe("No blood moon scheduled");
    expect(describeNextMoon(undefined, now)).toBe("No blood moon scheduled");
    expect(describeNextMoon({ bloodMoonEvery: "weekly" }, now)).toBe("Weekly, waiting for a first date");
  });

  it("prints the date for the viewer and hands back what is not a date", () => {
    expect(formatMoonDate(FUTURE)).toMatch(/Oct 17/);
    expect(formatMoonDate("tonight")).toBe("tonight");
  });
});
