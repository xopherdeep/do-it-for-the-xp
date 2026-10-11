import { buildTempleMeshData, getTempleBoxes, TempleId } from "../voxel/templeShapes";

const TEMPLES: TempleId[] = [
  "wind-temple",
  "earth-temple",
  "water-temple",
  "fire-temple",
  "ice-temple",
  "light-temple",
  "shadow-temple",
  "storm-temple",
  "moon-temple",
];

describe("temple voxel generators", () => {
  for (const templeId of TEMPLES) {
    it(`generates valid boxes and mesh data for ${templeId}`, () => {
      const boxes = getTempleBoxes(templeId);
      expect(boxes.length).toBeGreaterThan(0);

      const mesh = buildTempleMeshData(templeId);
      expect(mesh.faceCount).toBeGreaterThan(0);
      expect(mesh.positions.length).toBe(mesh.faceCount * 12);
      expect(mesh.normals.length).toBe(mesh.faceCount * 12);
      expect(mesh.colors.length).toBe(mesh.faceCount * 12);
      expect(mesh.indices.length).toBe(mesh.faceCount * 6);

      for (let i = 0; i < mesh.positions.length; i++) {
        expect(Number.isFinite(mesh.positions[i])).toBe(true);
      }

      for (let i = 0; i < mesh.colors.length; i++) {
        const c = mesh.colors[i];
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1);
      }
    });
  }
});
