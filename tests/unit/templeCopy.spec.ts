/**
 * What a temple says as a floor's beasts stir (catalog/temple.ts): the line in each voice, the count and the floor filled
 * in, and a line of its own for a single beast.
 */
import { copyFor } from "@/lib/services/copy/copy";
import { VOICES } from "@/lib/services/copy/voices";

describe("temple.floorWake", () => {
  it("tells how many beasts stirred on the floor, in each voice", () => {
    const vars = { count: 3, floor: "2F" };
    expect(copyFor("temple.floorWake", "simple", vars)).toBe("3 beasts woke up on 2F!");
    expect(copyFor("temple.floorWake", "adventure", vars)).toBe("3 beasts stir on 2F.");
    expect(copyFor("temple.floorWake", "classic", vars)).toBe("3 beasts stir on 2F.");
  });

  it("reads a single beast as one, never as '1 beasts'", () => {
    const vars = { count: 1, floor: "B1" };
    expect(copyFor("temple.floorWakeOne", "simple", vars)).toBe("A beast woke up on B1!");
    expect(copyFor("temple.floorWakeOne", "adventure", vars)).toBe("A beast stirs on B1.");
    expect(copyFor("temple.floorWakeOne", "classic", vars)).toBe("A beast stirs on B1.");
  });

  it("leaves no placeholder unfilled in any voice", () => {
    for (const voice of VOICES) {
      for (const key of ["temple.floorWake", "temple.floorWakeOne"]) {
        expect(copyFor(key, voice, { count: 2, floor: "1F" })).not.toMatch(/[{}]/);
      }
    }
  });
});
