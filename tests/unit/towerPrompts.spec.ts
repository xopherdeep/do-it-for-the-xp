/**
 * What the tower says in the game's own prompts: the fanfare for a cleared floor (with the early bonus when there was
 * one) and the Game Master's last question before a project is given up. Pure: the words are the copy catalogue's.
 */
import { copyFor } from "@/lib/services/copy/copy";
import type { ProjectFloor } from "@/lib/services/projects/projectRecord";
import { abandonPrompt, floorClearedPrompt } from "@/lib/services/projects/towerPrompts";

const EM_DASH = String.fromCharCode(8212);
const VOICES = ["simple", "adventure", "classic"] as const;

const clearedFloor = (multiplier?: number): ProjectFloor => ({
  floorKey: "2F",
  phaseId: "deep-clean",
  window: { phaseId: "deep-clean", opensOn: "2027-04-01", dueOn: "2027-04-10" },
  questIds: ["pq-a"],
  wokenAt: "2027-04-01T15:00:00.000Z",
  clearedAt: "2027-04-05T12:00:00.000Z",
  ...(multiplier === undefined ? {} : { multiplier }),
});

describe("floorClearedPrompt", () => {
  it("cheers the floor and names it, with the early bonus when it was above x1", () => {
    const prompt = floorClearedPrompt(clearedFloor(1.6), "Deep Clean", "simple");

    expect(prompt.title).toBe("Floor cleared!");
    expect(prompt.lines[0]).toContain("Deep Clean");
    expect(prompt.lines.join(" ")).toContain("×1.6");
    expect(prompt.sprite).toBe("coins");
  });

  it("shows the multiplier with one decimal", () => {
    expect(floorClearedPrompt(clearedFloor(2), "Deep Clean", "simple").lines.join(" ")).toContain("×2.0");
  });

  it("says no bonus when the floor was cleared on time or late, or no multiplier was kept", () => {
    for (const floor of [clearedFloor(1), clearedFloor()]) {
      const prompt = floorClearedPrompt(floor, "Deep Clean", "simple");
      expect(prompt.lines).toHaveLength(1);
      expect(prompt.lines.join(" ")).not.toContain("×");
      expect(prompt.sprite).toBe("tablet");
    }
  });

  it("is one Onward that Escape stands for, in every voice, with no em dash", () => {
    for (const voice of VOICES) {
      const prompt = floorClearedPrompt(clearedFloor(1.4), "Deep Clean", voice);
      expect(prompt.choices.map((choice) => choice.id)).toEqual(["onward"]);
      expect(prompt.choices[0].label).toBe(copyFor("projectTower.onward", voice));
      expect(prompt.cancelId).toBe("onward");
      expect(`${prompt.title} ${prompt.lines.join(" ")}`).not.toContain(EM_DASH);
    }
  });
});

describe("abandonPrompt", () => {
  it("asks the Game Master by the tower's name: yes gives it up, no (or Escape) keeps it", () => {
    const prompt = abandonPrompt("The Spring Spire", "classic");

    expect(prompt.lines.join(" ")).toContain("The Spring Spire");
    expect(prompt.choices.map((choice) => choice.id)).toEqual(["yes", "no"]);
    expect(prompt.cancelId).toBe("no");
  });

  it("has its speaker and its two buttons from the copy catalogue, in the voice asked", () => {
    for (const voice of VOICES) {
      const prompt = abandonPrompt("The Spring Spire", voice);
      expect(prompt.speaker).toBe(copyFor("projectTower.keeper", voice));
      expect(prompt.choices.map((choice) => choice.label)).toEqual([copyFor("projectTower.abandon.yes", voice), copyFor("projectTower.abandon.no", voice)]);
    }
    expect(abandonPrompt("The Spring Spire", "simple").choices[0].label).toBe("Give up");
  });

  it("speaks in every voice with no em dash, and says what is lost", () => {
    for (const voice of VOICES) {
      const prompt = abandonPrompt("The Spring Spire", voice);
      expect(prompt.lines.join(" ")).not.toContain(EM_DASH);
      expect(prompt.lines.join(" ").length).toBeGreaterThan(10);
    }
  });
});
