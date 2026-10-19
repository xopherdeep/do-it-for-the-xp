import { SIMPLE_MAX_WORDS } from "@/lib/services/copy/copy";
import { bedRestConfirmPrompt } from "@/lib/services/hometown/bedRestPrompt";

describe("bedRestConfirmPrompt", () => {
  it("asks in the game's own dialog, with the bed rising and a way to say not now", () => {
    const prompt = bedRestConfirmPrompt("adventure");
    expect(prompt).toMatchObject({ speaker: "Cozy Bed", sprite: "bed", cancelId: "no" });
    expect(prompt.choices.map((choice) => choice.id)).toEqual(["yes", "no"]);
    expect(prompt.lines).toEqual(["Sleep in your cozy bed to restore all HP and MP? Once a day."]);
  });

  it("speaks in each voice, and the simple one stays short", () => {
    const simple = bedRestConfirmPrompt("simple").lines[0];
    expect(simple.split(/\s+/).length).toBeLessThanOrEqual(SIMPLE_MAX_WORDS);
    expect(bedRestConfirmPrompt("classic").lines[0]).not.toBe(bedRestConfirmPrompt("adventure").lines[0]);
  });

  it("defaults to the adventure voice", () => {
    expect(bedRestConfirmPrompt().lines).toEqual(bedRestConfirmPrompt("adventure").lines);
  });
});
