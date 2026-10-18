import { BUILT_IN_PACKS, FAMILY_PACK } from "@/lib/services/core/packs/catalog";
import type { XpPack } from "@/lib/services/core/packs/packFormat";
import { addProblem, isAdded, packTag, withAdded, withoutAdded } from "@/lib/services/core/packs/packLibrary";

const shared = (id: string, version = "1.0.0"): XpPack => ({ ...FAMILY_PACK, id, name: `Pack ${id}`, version });

describe("the added packs", () => {
  it("turns away a pack with a built-in's id", () => {
    expect(addProblem(shared("family"), BUILT_IN_PACKS)).toMatch(/built-in Family pack/);
    expect(addProblem(shared("ours-k3f9"), BUILT_IN_PACKS)).toBeNull();
  });

  it("puts a newer version in place of the pack with its id", () => {
    const list = withAdded(withAdded([], shared("a")), shared("b"));
    const updated = withAdded(list, shared("a", "2.0.0"));
    expect(updated.map((pack) => [pack.id, pack.version])).toEqual([
      ["a", "2.0.0"],
      ["b", "1.0.0"],
    ]);
    expect(isAdded(updated, "b")).toBe(true);
    expect(withoutAdded(updated, "a").map((pack) => pack.id)).toEqual(["b"]);
  });

  it("tags a new pack id with four letters and digits", () => {
    expect(packTag(() => 0)).toBe("aaaa");
    expect(packTag()).toMatch(/^[a-z2-9]{4}$/);
  });
});
