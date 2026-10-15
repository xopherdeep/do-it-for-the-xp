import { TEMPLE_METADATA, getTempleMetadata } from "@/lib/engine/temples/templeRegistry";
import temples from "@/lib/engine/temples";

describe("templeRegistry", () => {
  it("has metadata for every registered temple", () => {
    Object.keys(temples).forEach((id) => {
      expect(TEMPLE_METADATA[id]).toBeDefined();
      expect(getTempleMetadata(id).name).not.toBe("Unknown Temple");
    });
  });

  it("names the moon and storm temples", () => {
    expect(getTempleMetadata("moon-temple")).toMatchObject({ world: "moon", element: "moon" });
    expect(getTempleMetadata("storm-temple")).toMatchObject({ world: "clouds", element: "storm" });
  });
});
