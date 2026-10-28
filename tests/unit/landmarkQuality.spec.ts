import {
  landmarkBufferScale,
  landmarkContextAntialias,
  landmarkMaterialOptions,
  landmarkRendererOptions,
  noteLandmarkContext,
} from "@/components/organisms/BuildingModel/voxel/landmarkQuality";
import { KNOBS } from "@/lib/services/graphics/voxelQuality";

describe("landmarkQuality", () => {
  it("reads null until a context is noted, then the noted value", () => {
    expect(landmarkContextAntialias()).toBeNull();
    noteLandmarkContext(true);
    expect(landmarkContextAntialias()).toBe(true);
    noteLandmarkContext(false);
    expect(landmarkContextAntialias()).toBe(false);
  });

  it.each([
    [1, true, 1],
    [1.5, true, 1.5],
    [2, false, 2],
    [3, false, 2],
  ])("Super at dpr %s is today's rule (antialias %s, scale %s)", (dpr, antialias, scale) => {
    expect(landmarkRendererOptions(KNOBS.super, dpr)).toEqual({ antialias });
    expect(landmarkBufferScale(KNOBS.super, dpr)).toBe(scale);
  });

  it("treats a missing ratio as 1", () => {
    expect(landmarkBufferScale(KNOBS.super, 0)).toBe(1);
    expect(landmarkRendererOptions(KNOBS.super, 0)).toEqual({ antialias: true });
  });

  it.each([1, 1.5, 2, 3])("Classic and Pocket never antialias at dpr %s", (dpr) => {
    expect(landmarkRendererOptions(KNOBS.classic, dpr)).toEqual({ antialias: false });
    expect(landmarkRendererOptions(KNOBS.pocket, dpr)).toEqual({ antialias: false });
  });

  it("caps the buffer scale per tier", () => {
    expect(landmarkBufferScale(KNOBS.classic, 3)).toBe(1.5);
    expect(landmarkBufferScale(KNOBS.classic, 1)).toBe(1);
    expect(landmarkBufferScale(KNOBS.pocket, 3)).toBe(1);
    expect(landmarkBufferScale(KNOBS.pocket, 2)).toBe(1);
  });

  it("maps the shading knob to material options", () => {
    expect(landmarkMaterialOptions(KNOBS.super)).toEqual({});
    expect(landmarkMaterialOptions(KNOBS.classic)).toEqual({ simple: true });
    expect(landmarkMaterialOptions(KNOBS.pocket)).toEqual({ flat: true });
  });
});
