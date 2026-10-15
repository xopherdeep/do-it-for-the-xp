import {
  cssColorToHex,
  DEFAULT_ICON_COLOR,
  iconToVoxelMesh,
  itemIconClass,
  layerToBoxes,
  shadeForOpacity,
  standOnFloor,
} from "@/lib/engine/voxel/iconToVoxel";

// A width x height RGBA buffer; `on` lists the [x, y] pixels that are drawn, each at `alpha`.
const pixels = (width: number, height: number, on: Array<[number, number]>, alpha = 255, rgb = [10, 20, 30]) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const [x, y] of on) {
    const i = (y * width + x) * 4;
    data.set([rgb[0], rgb[1], rgb[2], alpha], i);
  }
  return data;
};

describe("itemIconClass", () => {
  it("reads a bare Font Awesome name as a duotone class and keeps a full class as given", () => {
    expect(itemIconClass("film")).toBe("fad fa-film");
    expect(itemIconClass("fas fa-film")).toBe("fas fa-film");
    expect(itemIconClass("")).toBe("fad fa-gift");
  });
});

describe("cssColorToHex", () => {
  it("turns computed colours into #rrggbb", () => {
    expect(cssColorToHex("rgb(190, 92, 0)")).toBe("#be5c00");
    expect(cssColorToHex("rgba(255, 192, 203, 1)")).toBe("#ffc0cb");
    expect(cssColorToHex("#fff")).toBe("#ffffff");
  });

  it("falls back for transparent or unreadable colours", () => {
    expect(cssColorToHex("rgba(0, 0, 0, 0)")).toBe(DEFAULT_ICON_COLOR);
    expect(cssColorToHex("currentcolor")).toBe(DEFAULT_ICON_COLOR);
  });
});

describe("shadeForOpacity", () => {
  it("keeps a fully opaque secondary colour and shades a see-through one toward the base", () => {
    expect(shadeForOpacity("#ffffff", 1, "#000000")).toBe("#ffffff");
    expect(shadeForOpacity("#ffffff", 0.4, "#000000")).toBe("#666666");
    expect(shadeForOpacity("#ffffff", 0, "#000000")).toBe("#000000");
  });
});

describe("layerToBoxes", () => {
  it("builds one run of the layer's colour per row, ignoring the antialiased fringe", () => {
    const solid = pixels(4, 2, [
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
    // a faint fringe pixel on row 2: under the cutoff, so no voxel
    solid.set([10, 20, 30, 40], (1 * 4 + 3) * 4);
    const boxes = layerToBoxes(solid, 4, 2, "#be5c00", 3);
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toMatchObject({ w: 3, h: 1, d: 3, color: "#be5c00" });
  });

  it("snaps a half-covered edge pixel in, in the layer's colour, so a row never splits into shades", () => {
    const edge = pixels(3, 1, [[0, 0], [1, 0]], 255, [1, 2, 3]);
    edge.set([200, 100, 50, 160], 2 * 4);
    const boxes = layerToBoxes(edge, 3, 1, "#ffc0cb", 2);
    expect(boxes).toHaveLength(1);
    expect(boxes[0]).toMatchObject({ w: 3, color: "#ffc0cb" });
  });
});

describe("standOnFloor", () => {
  it("lifts the model so its lowest voxel sits just above the floor", () => {
    const lifted = standOnFloor([
      { x: 0, y: -5, z: 0, w: 1, h: 1, d: 1, color: "#000000" },
      { x: 0, y: 3, z: 0, w: 1, h: 1, d: 1, color: "#000000" },
    ]);
    expect(lifted.map((box) => box.y)).toEqual([1, 9]);
  });
});

describe("iconToVoxelMesh", () => {
  it("gives a crate when the icon cannot be drawn (no canvas in this test DOM)", async () => {
    const mesh = await iconToVoxelMesh("film");
    expect(mesh.faceCount).toBeGreaterThan(0);
  });
});
