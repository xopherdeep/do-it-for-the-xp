import { buildBuildingMeshData, getBuildingBoxes } from "../voxel/buildingShapes";

describe("buildingShapes: voxel geometries for Hometown and Land shops", () => {
  const hometownBuildings = [
    "hero-home",
    "my-home",
    "old-house",
    "hometown-market",
    "shop",
    "hospital",
    "hotel",
    "bank",
    "town-hall",
    "home-town",
    "hometown",
    "world-plains",
    "plains",
  ];

  const landShops = [
    "pegasus",
    "pegasus-ranch",
    "wrecked-ship",
    "hermits-tent",
    "crystal-caverns",
    "pond-of-life",
    "witchs-hut",
    "snow-shack",
    "cloud-market",
    "theia-city",
    "traveling-merchant",
  ];

  const homeLandmarks = [
    "home-calendar",
    "calendar",
    "home-storage",
    "storage",
    "home-workbench",
    "craft-item",
    "home-kitchen",
    "cook-food",
    "home-bed",
    "bed",
    "home-door",
    "front-door",
  ];

  describe("Hometown buildings", () => {
    it.each(hometownBuildings)("builds valid mesh data for %s", (buildingId) => {
      const boxes = getBuildingBoxes(buildingId);
      expect(boxes.length).toBeGreaterThanOrEqual(10);

      const mesh = buildBuildingMeshData(buildingId);
      expect(mesh.positions.length).toBeGreaterThan(0);
      expect(mesh.normals.length).toBe(mesh.positions.length);
      expect(mesh.colors.length).toBe(mesh.positions.length);
      expect(mesh.indices.length).toBeGreaterThan(0);
      expect(mesh.positions.length % 3).toBe(0);
    });
  });

  describe("Home interior landmarks", () => {
    it.each(homeLandmarks)("builds valid mesh data for %s", (landmarkId) => {
      const boxes = getBuildingBoxes(landmarkId);
      expect(boxes.length).toBeGreaterThanOrEqual(10);

      const mesh = buildBuildingMeshData(landmarkId);
      expect(mesh.positions.length).toBeGreaterThan(0);
      expect(mesh.normals.length).toBe(mesh.positions.length);
      expect(mesh.colors.length).toBe(mesh.positions.length);
      expect(mesh.indices.length).toBeGreaterThan(0);
      expect(mesh.positions.length % 3).toBe(0);
    });
  });

  describe("Land world shops", () => {
    it.each(landShops)("builds valid mesh data for shop %s", (shopId) => {
      const boxes = getBuildingBoxes(shopId);
      expect(boxes.length).toBeGreaterThanOrEqual(10);

      const mesh = buildBuildingMeshData(shopId);
      expect(mesh.positions.length).toBeGreaterThan(0);
      expect(mesh.normals.length).toBe(mesh.positions.length);
      expect(mesh.colors.length).toBe(mesh.positions.length);
      expect(mesh.indices.length).toBeGreaterThan(0);
      expect(mesh.positions.length % 3).toBe(0);
    });
  });

  it("hangs the traveling merchant's wagon under a balloon, all inside the landmark camera's frame", () => {
    const boxes = getBuildingBoxes("traveling-merchant");
    const top = Math.max(...boxes.map((box) => box.y + box.h));
    const widest = Math.max(...boxes.map((box) => Math.max(Math.abs(box.x), Math.abs(box.x + box.w))));
    const balloon = boxes.filter((box) => box.y >= 8);
    const wagon = boxes.filter((box) => box.y + box.h <= 6);
    expect(balloon.length).toBeGreaterThanOrEqual(6);
    expect(wagon.length).toBeGreaterThanOrEqual(10);
    expect(top).toBeLessThanOrEqual(16);
    expect(widest).toBeLessThanOrEqual(8);
  });

  it("falls back to hero-home for unknown building IDs", () => {
    const fallbackBoxes = getBuildingBoxes("unknown-building");
    const homeBoxes = getBuildingBoxes("hero-home");
    expect(fallbackBoxes).toEqual(homeBoxes);
  });
});
