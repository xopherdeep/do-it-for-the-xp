import { calendarActions, questLogRoute } from "../calendarActions";

describe("calendarActions", () => {
  it("offers every player the new quest first, then the Beast Log", () => {
    expect(calendarActions({ isToday: true }).map((action) => action.id)).toEqual(["new-quest", "quest-log"]);
    expect(calendarActions({ isToday: true })[0].text).toBe("New Quest");
  });

  it("only offers the way back to today from another day", () => {
    expect(calendarActions({ isToday: false }).map((action) => action.id)).toEqual(["new-quest", "today", "quest-log"]);
    expect(calendarActions({ isToday: true }).map((action) => action.id)).not.toContain("today");
  });

  it("offers Draw a Beast last to a maker, and to nobody else", () => {
    expect(calendarActions({ isToday: true, isMaker: true }).map((action) => action.id)).toEqual(["new-quest", "quest-log", "draw-beast"]);
    expect(calendarActions({ isToday: false, isMaker: true }).map((action) => action.id)).toEqual(["new-quest", "today", "quest-log", "draw-beast"]);
    expect(calendarActions({ isToday: true, isMaker: true })[2].text).toBe("Draw a Beast");
    expect(calendarActions({ isToday: true, isMaker: false })).toEqual(calendarActions({ isToday: true }));
  });

  it("gives every entry words and an icon", () => {
    for (const action of calendarActions({ isToday: false, isMaker: true })) {
      expect(action.text).not.toBe("");
      expect(action.icon).not.toBe("");
    }
  });
});

describe("questLogRoute", () => {
  it("opens the hero's own log", () => {
    expect(questLogRoute("hero-1")).toEqual({ name: "my-tasks", params: { userId: "hero-1" } });
  });
});
