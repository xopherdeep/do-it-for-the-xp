import { parseDayKey, prefillQueryFor, questPrefill } from "@/lib/services/quests/questPrefill";

describe("prefillQueryFor", () => {
  it("carries the day, the part of the day and the hero", () => {
    expect(prefillQueryFor(new Date(2026, 9, 14, 15, 30), "evening", "hero-1")).toEqual({
      day: "2026-10-14",
      time: "evening",
      hero: "hero-1",
    });
  });

  it("leaves the time out under the All tab and the hero out when there is none", () => {
    expect(prefillQueryFor(new Date(2026, 0, 5), "all", "")).toEqual({ day: "2026-01-05" });
  });
});

describe("parseDayKey", () => {
  it("reads a real day as local midnight", () => {
    const day = parseDayKey("2026-10-14");
    expect(day?.getFullYear()).toBe(2026);
    expect(day?.getMonth()).toBe(9);
    expect(day?.getDate()).toBe(14);
    expect(day?.getHours()).toBe(0);
  });

  it("rejects what is not a day", () => {
    expect(parseDayKey("")).toBeNull();
    expect(parseDayKey("tomorrow")).toBeNull();
    expect(parseDayKey("2026-02-30")).toBeNull();
    expect(parseDayKey("2026-13-01")).toBeNull();
  });
});

describe("questPrefill", () => {
  it("fills the start day, the time of day and the party", () => {
    const prefill = questPrefill({ day: "2026-10-14", time: "noon", hero: "hero-1" });
    expect(new Date(prefill.startsOn as string).getDate()).toBe(14);
    expect(prefill.timesOfDay).toEqual(["noon"]);
    expect(prefill.assignee).toEqual(["hero-1"]);
    expect(prefill.type).toBe("individual");
  });

  it("round-trips what the calendar sends", () => {
    const query = prefillQueryFor(new Date(2026, 9, 14), "morning", "hero-2");
    const prefill = questPrefill(query);
    expect(new Date(prefill.startsOn as string).getDate()).toBe(14);
    expect(prefill.timesOfDay).toEqual(["morning"]);
    expect(prefill.assignee).toEqual(["hero-2"]);
  });

  it("ignores what it cannot read", () => {
    expect(questPrefill({ day: "soon", time: "teatime", hero: "  " })).toEqual({});
    expect(questPrefill(undefined)).toEqual({});
    expect(questPrefill({})).toEqual({});
  });

  it("takes the first of a repeated key", () => {
    expect(questPrefill({ time: ["night", "noon"], hero: ["hero-9"] })).toMatchObject({
      timesOfDay: ["night"],
      assignee: ["hero-9"],
    });
  });

  it("asks for one field at a time", () => {
    expect(questPrefill({ time: "evening" })).toEqual({ timesOfDay: ["evening"] });
  });
});
