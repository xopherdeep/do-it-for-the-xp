import { spriteFor } from "@/components/organisms/RevealPrompt/revealSprites";
import type { RevealSpriteName } from "@/components/organisms/RevealPrompt/revealPrompt";

const NAMES: RevealSpriteName[] = ["chest", "chestOpen", "coins", "tablet", "heart", "bed"];

describe("the sprites that rise in an in-world prompt", () => {
  it.each(NAMES)("%s is painted: runs of one colour, every one inside its own grid", (name) => {
    const sprite = spriteFor(name);
    expect(sprite.runs.length).toBeGreaterThan(20);
    for (const run of sprite.runs) {
      expect(run.w).toBeGreaterThan(0);
      expect(run.x).toBeGreaterThanOrEqual(0);
      expect(run.x + run.w).toBeLessThanOrEqual(sprite.width);
      expect(run.y).toBeGreaterThanOrEqual(0);
      expect(run.y).toBeLessThan(sprite.height);
      expect(run.fill).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it("paints the heart red with a dark outline, and the bed with wood, linen and a hearth-orange blanket", () => {
    const fills = (name: RevealSpriteName) => new Set(spriteFor(name).runs.map((run) => run.fill));
    expect(fills("heart")).toContain("#c01c3c");
    expect(fills("heart")).toContain("#1c0a04");
    expect(fills("bed")).toContain("#e2783c");
    expect(fills("bed")).toContain("#e6e3f4");
    expect(fills("bed")).toContain("#8a4e26");
  });

  it("fills the heart's whole height and width, so it is not drawn tiny in its frame", () => {
    const { runs, width, height } = spriteFor("heart");
    const xs = runs.flatMap((run) => [run.x, run.x + run.w - 1]);
    const ys = runs.map((run) => run.y);
    expect(Math.min(...xs)).toBeLessThanOrEqual(2);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(width - 3);
    expect(Math.min(...ys)).toBeLessThanOrEqual(2);
    expect(Math.max(...ys)).toBeGreaterThanOrEqual(height - 3);
  });
});
