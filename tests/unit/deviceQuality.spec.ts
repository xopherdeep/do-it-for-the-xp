import { VOXEL_TIERS, knobsFor } from "@/lib/services/graphics/voxelQuality";

const KEY = "xp.voxelQuality";

// The module reads storage once at import, so each case loads a fresh copy
const load = () => {
  let mod!: typeof import("@/lib/services/graphics/deviceQuality");
  jest.isolateModules(() => {
    mod = require("@/lib/services/graphics/deviceQuality");
  });
  return mod;
};

beforeEach(() => localStorage.clear());
afterEach(() => jest.restoreAllMocks());

describe("the Video quality tier kept on this device", () => {
  it("is Super when nothing was ever chosen", () => {
    const quality = load();
    expect(quality.voxelTier.value).toBe("super");
    expect(quality.currentTier()).toBe("super");
    expect(quality.currentKnobs()).toEqual(knobsFor("super"));
  });

  it("loads a saved tier", () => {
    localStorage.setItem(KEY, "pocket");
    const quality = load();
    expect(quality.voxelTier.value).toBe("pocket");
    expect(quality.currentKnobs()).toEqual(knobsFor("pocket"));
  });

  it("falls back to Super for a value it does not know", () => {
    localStorage.setItem(KEY, "ultra");
    expect(load().voxelTier.value).toBe("super");
  });

  it("validates, updates and persists what the setter is given", () => {
    const quality = load();
    VOXEL_TIERS.forEach((tier) => {
      quality.setVoxelTier(tier);
      expect(quality.voxelTier.value).toBe(tier);
      expect(quality.currentTier()).toBe(tier);
      expect(localStorage.getItem(KEY)).toBe(tier);
    });
    quality.setVoxelTier("ultra" as never);
    expect(quality.voxelTier.value).toBe("pocket");
    expect(localStorage.getItem(KEY)).toBe("pocket");
  });

  it("still updates the ref when storage throws", () => {
    const quality = load();
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    quality.setVoxelTier("classic");
    expect(quality.voxelTier.value).toBe("classic");
  });

  it("reads Super when storage throws on load", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(load().voxelTier.value).toBe("super");
  });
});
