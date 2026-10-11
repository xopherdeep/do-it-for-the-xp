import {
  orderedTimesOfDay,
  timesOfDayLine,
  toggleTimeOfDay,
  withoutEmptyTimes,
} from "@/app/Admin/XpCompendium/views/XpAchievements/XpConfigAchievement/hooks/timesOfDayEditor";

describe("toggleTimeOfDay", () => {
  it("adds a time to a quest that has none, creating the list", () => {
    expect(toggleTimeOfDay(undefined, "noon")).toEqual(["noon"]);
    expect(toggleTimeOfDay([], "morning")).toEqual(["morning"]);
  });

  it("keeps the list in day order whatever order the chips are tapped in", () => {
    let times = toggleTimeOfDay([], "night");
    times = toggleTimeOfDay(times, "morning");
    times = toggleTimeOfDay(times, "evening");
    expect(times).toEqual(["morning", "evening", "night"]);
  });

  it("takes a time out when it is tapped again", () => {
    expect(toggleTimeOfDay(["morning", "night"], "night")).toEqual(["morning"]);
    expect(toggleTimeOfDay(["noon"], "noon")).toEqual([]);
  });

  it("does not change the list it was given", () => {
    const before = ["morning"] as const;
    toggleTimeOfDay(before, "noon");
    expect(before).toEqual(["morning"]);
  });
});

describe("orderedTimesOfDay", () => {
  it("orders, dedupes and drops strangers", () => {
    expect(orderedTimesOfDay(["night", "morning", "night", "teatime"])).toEqual(["morning", "night"]);
    expect(orderedTimesOfDay(undefined)).toEqual([]);
  });
});

describe("timesOfDayLine", () => {
  it("joins the short names in day order", () => {
    expect(timesOfDayLine(["night", "morning"])).toBe("Morn · Night");
    expect(timesOfDayLine(["morning", "noon", "evening", "night"])).toBe("Morn · Noon · Even · Night");
  });

  it("is empty when no time is picked", () => {
    expect(timesOfDayLine([])).toBe("");
    expect(timesOfDayLine(undefined)).toBe("");
  });
});

describe("withoutEmptyTimes", () => {
  it("leaves the key out when the list is empty or missing", () => {
    const stored = withoutEmptyTimes({ id: "q", timesOfDay: [] as string[] });
    expect(stored).toEqual({ id: "q" });
    expect("timesOfDay" in stored).toBe(false);
    expect("timesOfDay" in withoutEmptyTimes({ id: "q" })).toBe(false);
  });

  it("keeps a picked list, in day order", () => {
    expect(withoutEmptyTimes({ id: "q", timesOfDay: ["night", "morning"] })).toEqual({
      id: "q",
      timesOfDay: ["morning", "night"],
    });
  });

  it("returns a copy and leaves the form's object alone", () => {
    const form = { id: "q", timesOfDay: [] as string[] };
    withoutEmptyTimes(form);
    expect(form).toEqual({ id: "q", timesOfDay: [] });
  });
});
