import { PROJECT_TOWER_THEMES, buildBuildingMeshData, getBuildingBoxes, projectTowerSceneId } from "../voxel/buildingShapes";

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
    "project-tower",
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

  describe("the project tower: a narrow stack of the floor count, then a roof", () => {
    const topOf = (id: string) => Math.max(...getBuildingBoxes(id).map((box) => box.y + box.h));
    const wallsOf = (floors: number, element = "wind") => getBuildingBoxes(projectTowerSceneId(floors, element)).filter((box) => box.color === PROJECT_TOWER_THEMES[element].wall);
    const roofOf = (floors: number, element = "wind") => getBuildingBoxes(projectTowerSceneId(floors, element)).filter((box) => box.color === PROJECT_TOWER_THEMES[element].roof);

    it("builds valid mesh data for each size", () => {
      for (const floors of [1, 2, 4, 5, 8]) {
        const mesh = buildBuildingMeshData(projectTowerSceneId(floors, "wind"));
        expect(mesh.positions.length).toBeGreaterThan(0);
        expect(mesh.positions.length % 3).toBe(0);
        expect(mesh.indices.length).toBeGreaterThan(0);
      }
    });

    it("stacks one band for every floor, from two to eight", () => {
      for (const floors of [2, 3, 4, 5, 6, 7, 8]) expect(wallsOf(floors)).toHaveLength(floors);
    });

    it("puts the roof above every floor", () => {
      const walls = wallsOf(5);
      const roof = roofOf(5);
      expect(roof.length).toBeGreaterThanOrEqual(3);
      expect(Math.min(...roof.map((box) => box.y))).toBeGreaterThanOrEqual(Math.max(...walls.map((box) => box.y + box.h)) - 0.01);
    });

    it("grows taller with more floors, and stays inside the landmark camera's frame at any size", () => {
      expect(topOf(projectTowerSceneId(2, "wind"))).toBeLessThan(topOf(projectTowerSceneId(4, "wind")));
      for (const floors of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const boxes = getBuildingBoxes(projectTowerSceneId(floors, "wind"));
        const widest = Math.max(...boxes.map((box) => Math.max(Math.abs(box.x), Math.abs(box.x + box.w))));
        expect(topOf(projectTowerSceneId(floors, "wind"))).toBeLessThanOrEqual(16);
        expect(widest).toBeLessThanOrEqual(4);
      }
    });

    it("is narrow: narrower than the Hero's Home it stands beside", () => {
      const widthOf = (id: string) => Math.max(...getBuildingBoxes(id).map((box) => box.x + box.w)) - Math.min(...getBuildingBoxes(id).map((box) => box.x));
      expect(widthOf("project-tower")).toBeLessThan(widthOf("hero-home"));
    });

    it("wears the colours of its element, and the wind's for an element it does not know", () => {
      expect(PROJECT_TOWER_THEMES.wind.wall).not.toBe(PROJECT_TOWER_THEMES.earth.wall);
      expect(getBuildingBoxes(projectTowerSceneId(4, "earth")).some((box) => box.color === PROJECT_TOWER_THEMES.earth.wall)).toBe(true);
      expect(getBuildingBoxes(projectTowerSceneId(4, "no-such-element"))).toEqual(getBuildingBoxes(projectTowerSceneId(4, "wind")));
    });

    it("has a default size and element for the plain id, and keeps a made-up count within one to eight", () => {
      expect(getBuildingBoxes("project-tower")).toEqual(getBuildingBoxes(projectTowerSceneId(4, "wind")));
      expect(wallsOf(0)).toHaveLength(1);
      expect(wallsOf(40)).toHaveLength(8);
    });
  });

  it("falls back to hero-home for unknown building IDs", () => {
    const fallbackBoxes = getBuildingBoxes("unknown-building");
    const homeBoxes = getBuildingBoxes("hero-home");
    expect(fallbackBoxes).toEqual(homeBoxes);
  });
});
