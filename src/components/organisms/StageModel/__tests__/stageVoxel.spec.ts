import { buildStageMeshData, getStageBoxes } from "../voxel/stageShapes";

describe("stageShapes: voxel geometries for all 9 World Map stages", () => {
  const stageIds = [
    "world-plains",
    "world-forest",
    "world-islands",
    "world-swamps",
    "world-mountains",
    "world-sands",
    "world-clouds",
    "world-ice",
    "the-moon",
  ];

  const aliasIds = [
    "plains",
    "forest",
    "islands",
    "swamps",
    "mountains",
    "sands",
    "clouds",
    "ice",
    "moon",
  ];

  describe("Canonical stage IDs", () => {
    it.each(stageIds)("builds valid mesh data for %s", (stageId) => {
      const boxes = getStageBoxes(stageId);
      expect(boxes.length).toBeGreaterThanOrEqual(9);

      const mesh = buildStageMeshData(stageId);
      expect(mesh.positions.length).toBeGreaterThan(0);
      expect(mesh.normals.length).toBe(mesh.positions.length);
      expect(mesh.colors.length).toBe(mesh.positions.length);
      expect(mesh.indices.length).toBeGreaterThan(0);
      expect(mesh.positions.length % 3).toBe(0);
    });
  });

  describe("Alias stage IDs", () => {
    it.each(aliasIds)("builds valid mesh data for alias %s", (aliasId) => {
      const boxes = getStageBoxes(aliasId);
      expect(boxes.length).toBeGreaterThanOrEqual(9);

      const mesh = buildStageMeshData(aliasId);
      expect(mesh.positions.length).toBeGreaterThan(0);
      expect(mesh.normals.length).toBe(mesh.positions.length);
      expect(mesh.colors.length).toBe(mesh.positions.length);
      expect(mesh.indices.length).toBeGreaterThan(0);
    });
  });

  it("falls back to plains for unknown stage IDs", () => {
    const fallbackBoxes = getStageBoxes("unknown-realm");
    const plainsBoxes = getStageBoxes("world-plains");
    expect(fallbackBoxes).toEqual(plainsBoxes);
  });
});
