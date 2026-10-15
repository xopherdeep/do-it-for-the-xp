import {
  buildDungeonRoomMeshData,
  getDungeonRoomBoxes,
} from "../voxel/dungeonRoomShapes";
import type { DungeonRoomKind } from "../voxel/dungeonRoomShapes";

describe("dungeonRoomShapes: voxel geometries for treasure chest and dungeon room types", () => {
  const roomKinds: DungeonRoomKind[] = [
    "loot",
    "empty-chest",
    "key",
    "health",
    "mana",
    "camp",
    "puzzle",
    "teleport",
    "shop",
    "save",
    "master",
    "secret",
    "stairs-up",
    "stairs-down",
    "entrance",
    "gate",
    "trap",
    "pit",
    "void",
    "empty",
    "cleared",
  ];

  describe("Room Voxel Geometries", () => {
    it.each(roomKinds)("builds valid mesh data for room kind '%s'", (kind) => {
      const boxes = getDungeonRoomBoxes(kind);
      expect(boxes.length).toBeGreaterThanOrEqual(4);

      const mesh = buildDungeonRoomMeshData(kind);
      expect(mesh.positions.length).toBeGreaterThan(0);
      expect(mesh.normals.length).toBe(mesh.positions.length);
      expect(mesh.colors.length).toBe(mesh.positions.length);
      expect(mesh.indices.length).toBeGreaterThan(0);
      expect(mesh.faceCount).toBeGreaterThan(0);
      expect(mesh.positions.length % 3).toBe(0);
    });
  });

  describe("Treasure Chest Variants", () => {
    it("builds unopened treasure chest with golden lock and coin scatter", () => {
      const boxes = getDungeonRoomBoxes("loot", { isEmpty: false });
      const goldCoins = boxes.filter((b) => b.color === "#ffd700" || b.color === "#ffea00");
      expect(goldCoins.length).toBeGreaterThanOrEqual(3);

      const mesh = buildDungeonRoomMeshData("loot", { isEmpty: false });
      expect(mesh.faceCount).toBeGreaterThan(0);
    });

    it("builds empty chest with open lid and hollow interior", () => {
      const closedBoxes = getDungeonRoomBoxes("loot", { isEmpty: false });
      const emptyBoxes = getDungeonRoomBoxes("loot", { isEmpty: true });
      expect(emptyBoxes.length).not.toBe(closedBoxes.length);

      const mesh = buildDungeonRoomMeshData("loot", { isEmpty: true });
      expect(mesh.positions.length).toBeGreaterThan(0);
    });

    it("builds boss / master chest with ruby and crimson accents", () => {
      const bossBoxes = getDungeonRoomBoxes("loot", { isBoss: true });
      const rubyBox = bossBoxes.find((b) => b.color === "#ff1744" || b.color === "#e53935");
      expect(rubyBox).toBeDefined();

      const mesh = buildDungeonRoomMeshData("loot", { isBoss: true });
      expect(mesh.positions.length).toBeGreaterThan(0);
    });
  });

  describe("Combat Room States", () => {
    it("leaves a pile of bones, with the spoils until they are searched", () => {
      const isGold = (b: { color: string }) => b.color === "#ffd700";
      const unsearched = getDungeonRoomBoxes("monster", { cleared: true });
      const searched = getDungeonRoomBoxes("monster", { cleared: true, searched: true });
      expect(unsearched.some((b) => b.color === "#efe8d8")).toBe(true);
      expect(unsearched.some(isGold)).toBe(true);
      expect(searched.some(isGold)).toBe(false);
      expect(searched.length).toBeLessThan(unsearched.length);

      const mesh = buildDungeonRoomMeshData("monster", { cleared: true });
      expect(mesh.positions.length).toBeGreaterThan(0);
    });
  });
});
