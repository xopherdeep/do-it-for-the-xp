import {
  pixelDataToBoxes,
  createPlaceholderMonsterMesh,
  spriteToVoxelMesh,
} from "@/lib/engine/voxel/spriteToVoxel";

describe("spriteToVoxel", () => {
  it("converts RGBA pixel buffer into extruded 3D voxel boxes", () => {
    // 2x2 image:
    // row 0: red, red
    // row 1: transparent, blue
    const pixels = new Uint8ClampedArray([
      255, 0, 0, 255,   255, 0, 0, 255,
      0, 0, 0, 0,       0, 0, 255, 255,
    ]);

    const boxes = pixelDataToBoxes(pixels, 2, 2, 2);

    // Row 0 has two consecutive red pixels -> consolidated into 1 box of width 2
    // Row 1 has 1 transparent pixel and 1 blue pixel -> 1 box of width 1
    expect(boxes.length).toBe(2);

    expect(boxes[0].color).toBe("#ff0000");
    expect(boxes[0].w).toBe(2);
    expect(boxes[0].d).toBe(2);

    expect(boxes[1].color).toBe("#0000ff");
    expect(boxes[1].w).toBe(1);
    expect(boxes[1].d).toBe(2);
  });

  it("skips completely transparent pixel buffers", () => {
    const pixels = new Uint8ClampedArray([
      0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0, 0,
    ]);

    const boxes = pixelDataToBoxes(pixels, 2, 2, 2);
    expect(boxes.length).toBe(0);
  });

  it("creates valid placeholder monster mesh data", () => {
    const mesh = createPlaceholderMonsterMesh("#9944bb");
    expect(mesh.positions.length).toBeGreaterThan(0);
    expect(mesh.normals.length).toBeGreaterThan(0);
    expect(mesh.colors.length).toBeGreaterThan(0);
    expect(mesh.indices.length).toBeGreaterThan(0);
    expect(mesh.faceCount).toBeGreaterThan(0);
  });

  it("falls back to placeholder mesh when image loading cannot decode", async () => {
    const mesh = await spriteToVoxelMesh("invalid-path.png");
    expect(mesh).toBeDefined();
    expect(mesh.faceCount).toBeGreaterThan(0);
  });
});
