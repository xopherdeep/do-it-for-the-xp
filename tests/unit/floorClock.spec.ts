/**
 * The floor clock in the temple's header (Project Towers): what a floor's due day reads like to a hero, and the offer to
 * clear it early for a bigger bonus. The words are the copy catalogue's three voices; the multiplier is floorBonus's. Pure.
 */
import { copyFor } from "@/lib/services/copy/copy";
import { floorMultiplier } from "@/lib/services/projects/floorBonus";
import { bonusOfferLine, floorClockLine, floorClockState, floorClockView, phaseNameOf } from "@/lib/services/projects/floorClock";
import type { ProjectFloor, ProjectRecord } from "@/lib/services/projects/projectRecord";

/** Deep Clean: ten days, the 1st to Saturday the 10th of April 2027, so a day early is a tenth of a half-window more */
const WINDOW = { phaseId: "deep-clean", opensOn: "2027-04-01", dueOn: "2027-04-10" };

const floorOf = (extra: Partial<ProjectFloor> = {}): ProjectFloor => ({
  floorKey: "2F",
  phaseId: "deep-clean",
  window: { ...WINDOW },
  questIds: ["pq-a"],
  wokenAt: "2027-04-01T15:00:00.000Z",
  ...extra,
});

const NAME = "Deep Clean";
const EM_DASH = String.fromCharCode(8212);

describe("floorClockLine", () => {
  it("names the floor, the day it is due and the days left", () => {
    expect(floorClockLine(floorOf(), NAME, "2027-04-07", "simple")).toBe("Deep Clean: due Sat, 3 days left");
  });

  it("says one day left in the singular", () => {
    expect(floorClockLine(floorOf(), NAME, "2027-04-09", "simple")).toBe("Deep Clean: due Sat, 1 day left");
  });

  it("reads 'due today' on the due day", () => {
    expect(floorClockLine(floorOf(), NAME, "2027-04-10", "simple")).toBe("Deep Clean: due today");
  });

  it("reads 'late' after the due day, however long after", () => {
    expect(floorClockLine(floorOf(), NAME, "2027-04-11", "simple")).toBe("Deep Clean: late");
    expect(floorClockLine(floorOf(), NAME, "2027-05-30", "simple")).toBe("Deep Clean: late");
  });

  it("gives the date, not the weekday, when the day is more than a week away", () => {
    expect(floorClockLine(floorOf(), NAME, "2027-04-02", "simple")).toBe("Deep Clean: due Apr 10, 8 days left");
    expect(floorClockLine(floorOf(), NAME, "2027-04-04", "simple")).toBe("Deep Clean: due Sat, 6 days left");
  });

  it("reads a floor cleared early as cleared, never as days left or late", () => {
    const cleared = floorOf({ clearedAt: "2027-04-03T12:00:00.000Z" });
    expect(floorClockLine(cleared, NAME, "2027-04-07", "simple")).toBe("Deep Clean: cleared");
    expect(floorClockLine(cleared, NAME, "2027-04-20", "simple")).toBe("Deep Clean: cleared");
  });

  it("speaks in each voice, the adventure line when a voice has none of its own", () => {
    expect(floorClockLine(floorOf(), NAME, "2027-04-07", "adventure")).toContain("Deep Clean");
    expect(floorClockLine(floorOf(), NAME, "2027-04-07", "classic")).toContain("Sat");
    expect(floorClockLine(floorOf(), NAME, "2027-04-11", "classic")).toBe("Deep Clean: overdue");
    expect(floorClockLine(floorOf(), NAME, "2027-04-11", "adventure")).toBe("Deep Clean: running late");
  });

  it("writes no em dash in any voice", () => {
    for (const voice of ["simple", "adventure", "classic"] as const) {
      for (const today of ["2027-04-02", "2027-04-09", "2027-04-10", "2027-04-11"]) {
        expect(floorClockLine(floorOf(), NAME, today, voice)).not.toContain(EM_DASH);
      }
    }
  });
});

describe("floorClockState", () => {
  it("tells a cleared floor, a late one, one due today and one still open", () => {
    expect(floorClockState(floorOf({ clearedAt: "2027-04-03T12:00:00.000Z" }), "2027-04-20")).toBe("cleared");
    expect(floorClockState(floorOf(), "2027-04-11")).toBe("late");
    expect(floorClockState(floorOf(), "2027-04-10")).toBe("today");
    expect(floorClockState(floorOf(), "2027-04-07")).toBe("open");
  });
});

describe("bonusOfferLine", () => {
  it("offers the multiplier floorMultiplier gives for clearing today", () => {
    const floor = floorOf();
    const multiplier = floorMultiplier(floor.window, "2027-04-07");
    expect(multiplier).toBe(1.6);
    expect(bonusOfferLine(floor, "2027-04-07", "simple")).toBe("Clear this floor today for ×1.6");
  });

  it("shows one decimal, so a full x2 reads 2.0", () => {
    expect(bonusOfferLine(floorOf(), "2027-04-02", "simple")).toBe("Clear this floor today for ×2.0");
  });

  it("disappears at x1: on the due day and after it", () => {
    expect(floorMultiplier(WINDOW, "2027-04-10")).toBe(1);
    expect(bonusOfferLine(floorOf(), "2027-04-10", "simple")).toBeNull();
    expect(bonusOfferLine(floorOf(), "2027-04-11", "simple")).toBeNull();
  });

  it("disappears once the floor is cleared", () => {
    expect(bonusOfferLine(floorOf({ clearedAt: "2027-04-03T12:00:00.000Z" }), "2027-04-04", "simple")).toBeNull();
  });

  it("speaks in each voice and keeps the multiplier in all of them", () => {
    for (const voice of ["simple", "adventure", "classic"] as const) {
      const line = bonusOfferLine(floorOf(), "2027-04-07", voice) as string;
      expect(line).toContain("×1.6");
      expect(line).not.toContain(EM_DASH);
    }
  });
});

describe("floorClockView", () => {
  const projectOf = (floors: ProjectFloor[]): ProjectRecord => ({
    id: "spring-cleaning-2027-04-01",
    typeId: "spring-cleaning",
    templeId: "gen-project-spring-cleaning",
    status: "active",
    startOn: "2027-04-01",
    endOn: "2027-04-10",
    house: { rooms: { kitchen: 1 } },
    floors,
    chores: [],
    reward: { text: "Pizza night", seenBy: [] },
    creditsSeenBy: [],
  });

  it("is the clock of the floor the hero stands on: its line, its offer and where it stands", () => {
    const project = projectOf([floorOf({ floorKey: "1F", phaseId: "declutter", window: { ...WINDOW, phaseId: "declutter" } }), floorOf()]);

    const view = floorClockView(project, "2F", "2027-04-07", "simple");

    expect(view).toEqual({
      floorKey: "2F",
      name: "Deep Clean",
      line: "Deep Clean: due Sat, 3 days left",
      offer: "Clear this floor today for ×1.6",
      state: "open",
    });
  });

  it("has no offer on a late or cleared floor, and says which it is", () => {
    const late = floorClockView(projectOf([floorOf()]), "2F", "2027-04-12", "simple");
    expect(late).toMatchObject({ line: "Deep Clean: late", offer: null, state: "late" });
    const cleared = floorClockView(projectOf([floorOf({ clearedAt: "2027-04-03T12:00:00.000Z" })]), "2F", "2027-04-07", "simple");
    expect(cleared).toMatchObject({ line: "Deep Clean: cleared", offer: null, state: "cleared" });
  });

  it("is null for a floor the project does not have", () => {
    expect(floorClockView(projectOf([floorOf()]), "9F", "2027-04-07", "simple")).toBeNull();
  });
});

describe("phaseNameOf", () => {
  it("is the phase's name from the project type, the roof's own name for the roof", () => {
    expect(phaseNameOf("spring-cleaning", { floorKey: "2F", phaseId: "deep-clean" })).toBe("Deep Clean");
    expect(phaseNameOf("spring-cleaning", { floorKey: "5F", phaseId: "roof" })).toBe("The Roof");
  });

  it("says the roof's name from the copy catalogue, in the voice asked (the adventure voice by default)", () => {
    const roof = { floorKey: "5F", phaseId: "roof" };
    for (const voice of ["simple", "adventure", "classic"] as const) {
      expect(phaseNameOf("spring-cleaning", roof, voice)).toBe(copyFor("projectTower.roofName", voice));
    }
    expect(phaseNameOf("spring-cleaning", roof)).toBe(copyFor("projectTower.roofName", "adventure"));
  });

  it("falls back to the floor's key when the type or the phase is gone", () => {
    expect(phaseNameOf("gone-type", { floorKey: "2F", phaseId: "deep-clean" })).toBe("2F");
    expect(phaseNameOf("spring-cleaning", { floorKey: "9F", phaseId: "no-such-phase" })).toBe("9F");
  });
});
