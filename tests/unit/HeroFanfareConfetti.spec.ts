import {
  CHIP_CAP,
  burstFromEdges,
  chipFrom,
  chipWidth,
  isBlinkedOut,
  stepChips,
  type Chip,
} from "@/components/organisms/HeroFanfare/confetti";

/**
 * The new-hero reveal's confetti physics: chips leave all four edges of the screen aimed at the middle, arc under
 * gravity, and are gone off the bottom or at the end of their life. Pure numbers, so no canvas is needed.
 */

const SCREEN = { width: 130, height: 281 };
const half = () => 0.5;

/** A random that walks through a fixed list, so a burst is the same every run. */
const seeded = (): (() => number) => {
  let seed = 7;
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
};

const flyFor = (chip: Chip, seconds: number): Chip | undefined => {
  let chips = [chip];
  const step = 1 / 60;
  for (let time = 0; time < seconds; time += step) chips = stepChips(chips, step, SCREEN);
  return chips[0];
};

describe("a burst of confetti", () => {
  it("comes from all four edges, the same number from each", () => {
    const chips = burstFromEdges(SCREEN, 10, 0, seeded());
    expect(chips).toHaveLength(40);
    expect(chips.filter((chip) => chip.x < 0)).toHaveLength(10);
    expect(chips.filter((chip) => chip.x > SCREEN.width)).toHaveLength(10);
    expect(chips.filter((chip) => chip.y < 0)).toHaveLength(10);
    expect(chips.filter((chip) => chip.y > SCREEN.height)).toHaveLength(10);
  });

  it("never puts more than the cap on the screen at once", () => {
    const first = burstFromEdges(SCREEN, 1000, 0, seeded());
    expect(first.length).toBeLessThanOrEqual(CHIP_CAP);
    const none = burstFromEdges(SCREEN, 50, CHIP_CAP, seeded());
    expect(none).toHaveLength(0);
    const second = burstFromEdges(SCREEN, 50, CHIP_CAP - 40, seeded());
    expect(second.length + CHIP_CAP - 40).toBeLessThanOrEqual(CHIP_CAP);
  });

  it("uses small squares, diamonds and a few stars", () => {
    const chips = burstFromEdges(SCREEN, 60, 0, seeded());
    const shapes = new Set(chips.map((chip) => chip.shape));
    expect(shapes).toEqual(new Set(["square", "diamond", "star"]));
    const stars = chips.filter((chip) => chip.shape === "star");
    expect(stars.length).toBeLessThan(chips.length / 4);
  });

  it("is aimed at the middle of the screen, whichever edge it leaves", () => {
    // random() = 0.5 everywhere: the target is the middle of the screen, 40% down
    (["left", "right", "top", "bottom"] as const).forEach((edge) => {
      const chip = chipFrom(edge, SCREEN, half, 0);
      // Flight time for this edge, by the same rule the physics solved with
      const flight = edge === "bottom" ? 1.4 : 1.1;
      const there = flyFor(chip, flight);
      expect(there).toBeDefined();
      expect(Math.abs((there as Chip).x - SCREEN.width / 2)).toBeLessThan(18);
      expect(Math.abs((there as Chip).y - SCREEN.height * 0.4)).toBeLessThan(18);
    });
  });
});

describe("a chip in flight", () => {
  it("waits out its delay before it moves", () => {
    const chip = chipFrom("left", SCREEN, half, 0.5);
    const startedAt = { x: chip.x, y: chip.y };
    const [waiting] = stepChips([chip], 0.1, SCREEN);
    expect(waiting.x).toBe(startedAt.x);
    expect(waiting.y).toBe(startedAt.y);
    expect(waiting.age).toBe(0);
  });

  it("falls off the bottom and is gone", () => {
    const chip = chipFrom("top", SCREEN, half, 0);
    chip.life = 100;
    chip.vy = 200;
    chip.vx = 0;
    let chips = [chip];
    for (let n = 0; n < 240 && chips.length > 0; n++) chips = stepChips(chips, 1 / 60, SCREEN);
    expect(chips).toHaveLength(0);
  });

  it("is gone at the end of its life", () => {
    const chip = chipFrom("left", SCREEN, half, 0);
    chip.life = 0.2;
    chip.vx = 0;
    chip.vy = -1000;
    // A chip thrown out of the top would be off the screen for a while: only its life ends it here
    const chips = stepChips([chip], 0.25, SCREEN);
    expect(chips).toHaveLength(0);
  });

  it("slows to a drifting fall instead of speeding up forever", () => {
    const chip = chipFrom("top", SCREEN, half, 0);
    chip.life = 100;
    chip.y = -100;
    chip.vy = 0;
    chip.vx = 0;
    chip.age = 2;
    let chips = [chip];
    for (let n = 0; n < 120; n++) chips = stepChips(chips, 1 / 60, { width: 130, height: 100000 });
    expect(chips[0].vy).toBeLessThan(70);
  });
});

describe("drawing a chip", () => {
  it("blinks out in the last moments of its life, and not before", () => {
    const chip = chipFrom("left", SCREEN, half, 0);
    chip.life = 4;
    chip.age = 1;
    expect(isBlinkedOut(chip)).toBe(false);
    const seen = new Set<boolean>();
    for (let age = 3.4; age < 4; age += 0.03) {
      chip.age = age;
      seen.add(isBlinkedOut(chip));
    }
    expect(seen).toEqual(new Set([true, false]));
  });

  it("tumbles: face-on it is as wide as it is, edge-on it is one cell", () => {
    const chip = chipFrom("left", SCREEN, half, 0);
    chip.size = 3;
    chip.spin = 0;
    expect(chipWidth(chip)).toBe(3);
    chip.spin = Math.PI / 2;
    expect(chipWidth(chip)).toBe(1);
  });
});
