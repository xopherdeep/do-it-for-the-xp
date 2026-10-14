import { DOOR_BY_BUILDING, DOOR_TYPES, doorTypeFor } from "@/lib/services/transitions/buildingDoors";
import { SHOP_METADATA } from "@/lib/engine/core/shopRegistry";
import { doorPieces } from "@/components/organisms/SceneTransition/effects/doorSprites";

describe("building doors", () => {
  it("gives every shop in the registry a door", () => {
    Object.keys(SHOP_METADATA).forEach((id) => expect(DOOR_BY_BUILDING[id]).toBeDefined());
  });

  it("uses every door type somewhere", () => {
    const used = new Set(Object.values(DOOR_BY_BUILDING));
    DOOR_TYPES.forEach((type) => expect(used.has(type)).toBe(true));
  });

  it("falls back to plank doors", () => {
    expect(doorTypeFor(undefined)).toBe("plank");
    expect(doorTypeFor("somewhere-new")).toBe("plank");
    expect(doorTypeFor("hermits-tent")).toBe("tent");
  });
});

describe("door sprites", () => {
  it.each(DOOR_TYPES.filter((type) => type !== "portal"))("paints the %s door", (type) => {
    const pieces = doorPieces(type, "Item Shop");
    expect(pieces.length).toBeGreaterThan(0);
    pieces.forEach((piece) => {
      expect(piece.runs.length).toBeGreaterThan(0);
      piece.runs.forEach((run) => {
        expect(run.x + run.w).toBeLessThanOrEqual(piece.w);
        expect(run.y).toBeLessThan(piece.h);
      });
    });
  });

  // A leaf that fills its half of the screen must be solid, or the page shows through while covered
  it.each(["plank", "shop", "sliding", "stone", "tent"] as const)("paints the %s leaves solid", (type) => {
    doorPieces(type, "Hospital")
      .filter((piece) => piece.fit === "stretch")
      .forEach((piece) => {
        const covered = piece.runs.reduce((sum, run) => sum + run.w, 0);
        expect(covered).toBe(piece.w * piece.h);
      });
  });

  it("draws the portal with CSS alone", () => {
    expect(doorPieces("portal")).toEqual([]);
  });
});
