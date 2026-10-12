import { getTempleWorldLocation } from "@/app/Console/TempleGrounds/templeGrounds/useTempleMeta";
import { resolveSwipeDirection } from "@/app/Console/TempleGrounds/templeGrounds/useTempleMovement";

// Characterization: what the temple screen's pure helpers return today, pinned when they left TempleGrounds.ts

describe("getTempleWorldLocation", () => {
  it.each([
    ["wind-temple", "plains", "world-plains"],
    ["water-temple", "islands", "world-islands"],
    ["earth-temple", "forest", "world-forest"],
    ["fire-temple", "mountains", "world-mountains"],
    ["ice-temple", "ice", "world-ice"],
    ["light-temple", "sands", "world-sands"],
    ["shadow-temple", "swamps", "world-swamps"],
    ["moon-temple", "the-moon", "the-moon"],
    ["storm-temple", "clouds", "world-clouds"],
  ])("walks out of %s into %s (%s)", (templeId, world, route) => {
    expect(getTempleWorldLocation(templeId)).toEqual({ world, route });
  });

  it.each(["gen-pantry-31", "", "WIND-TEMPLE"])("sends %p, which it does not know, home to town", (templeId) => {
    expect(getTempleWorldLocation(templeId)).toEqual({ world: "plains", route: "home-town" });
  });
});

describe("resolveSwipeDirection", () => {
  it("drags the world: a swipe right goes west, a swipe left goes east", () => {
    expect(resolveSwipeDirection(80, 10)).toBe("west");
    expect(resolveSwipeDirection(-80, 10)).toBe("east");
  });

  it("a swipe down goes north, a swipe up goes south", () => {
    expect(resolveSwipeDirection(10, 80)).toBe("north");
    expect(resolveSwipeDirection(10, -80)).toBe("south");
  });

  it("reads a diagonal by its longer side, and a tie as vertical", () => {
    expect(resolveSwipeDirection(60, -59)).toBe("west");
    expect(resolveSwipeDirection(-59, 60)).toBe("north");
    expect(resolveSwipeDirection(50, 50)).toBe("north");
    expect(resolveSwipeDirection(-50, -50)).toBe("south");
  });

  it("reads no movement at all as south", () => {
    expect(resolveSwipeDirection(0, 0)).toBe("south");
  });
});
