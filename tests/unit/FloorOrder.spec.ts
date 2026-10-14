/**
 * The order floors are climbed in (task #1380): basements below, then 1F, 2F ..., whatever order the maze map holds
 * them in. Stairs and pits go to the next floor of this order.
 */
import { climbOrder, floorHeight, neighbourFloorOf } from "@/lib/engine/core/dungeons/floorOrder";

describe("floorHeight", () => {
  it("reads surface floors as positive, basements as negative, anything else as ground level", () => {
    expect(floorHeight("1F")).toBe(1);
    expect(floorHeight("12F")).toBe(12);
    expect(floorHeight("B1")).toBe(-1);
    expect(floorHeight("B3")).toBe(-3);
    expect(floorHeight("Attic")).toBe(0);
    expect(floorHeight("")).toBe(0);
  });

  it("puts a name with no number at ground level", () => {
    expect(floorHeight("F")).toBe(0);
    expect(floorHeight("B")).toBe(0);
    expect(floorHeight("B0")).toBe(0);
  });
});

describe("climbOrder", () => {
  it("lists a basement added after the floors above it where it belongs: below", () => {
    expect(climbOrder(["1F", "2F", "B1"])).toEqual(["B1", "1F", "2F"]);
  });

  it("goes from the deepest basement up, reading numbers as numbers", () => {
    expect(climbOrder(["10F", "2F", "B2", "1F", "B10", "B1"])).toEqual(["B10", "B2", "B1", "1F", "2F", "10F"]);
  });

  it("keeps the order given for floors that stand equally high, and does not touch the list it is given", () => {
    const given = ["Roof", "1F", "Attic", "B1"];

    expect(climbOrder(given)).toEqual(["B1", "Roof", "Attic", "1F"]);
    expect(given).toEqual(["Roof", "1F", "Attic", "B1"]);
  });
});

describe("neighbourFloorOf", () => {
  const drawn = ["1F", "2F", "B1"]; // the basement was added last

  it("climbs and descends along the climbing order, not the order the floors were drawn in", () => {
    expect(neighbourFloorOf(drawn, "1F", -1)).toBe("B1");
    expect(neighbourFloorOf(drawn, "B1", 1)).toBe("1F");
    expect(neighbourFloorOf(drawn, "1F", 1)).toBe("2F");
    expect(neighbourFloorOf(drawn, "2F", -1)).toBe("1F");
  });

  it("finds nothing past the bottom or the top of the temple", () => {
    expect(neighbourFloorOf(drawn, "B1", -1)).toBeUndefined();
    expect(neighbourFloorOf(drawn, "2F", 1)).toBeUndefined();
  });

  it("finds nothing from a floor the temple does not have", () => {
    expect(neighbourFloorOf(drawn, "7F", 1)).toBeUndefined();
    expect(neighbourFloorOf(drawn, "7F", -1)).toBeUndefined();
    expect(neighbourFloorOf([], "1F", 1)).toBeUndefined();
  });
});
