import {
  KNOBS,
  TIER_BLURBS,
  TIER_NAMES,
  VOXEL_TIERS,
  isVoxelTier,
  knobsFor,
  rendererOptionsFor,
} from "@/lib/services/graphics/voxelQuality";

describe("voxelQuality", () => {
  it("pins Super to today's numbers", () => {
    expect(KNOBS.super).toEqual({
      art: "fine",
      material: "full",
      dprCap: 2,
      antialias: "rule",
      heroFps: 0,
      snapshotSamples: 4,
      thumbMaxPx: 0,
      thumbPerFrame: 3,
      landmarkScaleCap: 2,
    });
  });

  it("pins the Classic and Pocket starting values", () => {
    expect(KNOBS.classic).toEqual({
      art: "classic",
      material: "simple",
      dprCap: 1.5,
      antialias: "off",
      heroFps: 30,
      snapshotSamples: 0,
      thumbMaxPx: 128,
      thumbPerFrame: 2,
      landmarkScaleCap: 1.5,
    });
    expect(KNOBS.pocket).toEqual({
      art: "classic",
      material: "flat",
      dprCap: 1,
      antialias: "off",
      heroFps: 20,
      snapshotSamples: 0,
      thumbMaxPx: 64,
      thumbPerFrame: 1,
      landmarkScaleCap: 1,
    });
  });

  it("never gets heavier from Super to Classic to Pocket", () => {
    const [a, b, c] = VOXEL_TIERS.map((t) => KNOBS[t]);
    for (const key of ["dprCap", "thumbPerFrame", "landmarkScaleCap"] as const) {
      expect(a[key]).toBeGreaterThanOrEqual(b[key]);
      expect(b[key]).toBeGreaterThanOrEqual(c[key]);
    }
    // 0 means no cap, so it counts as the heaviest value.
    const cap = (n: number) => (n === 0 ? Infinity : n);
    expect(cap(a.thumbMaxPx)).toBeGreaterThanOrEqual(cap(b.thumbMaxPx));
    expect(cap(b.thumbMaxPx)).toBeGreaterThanOrEqual(cap(c.thumbMaxPx));
    expect(cap(a.heroFps)).toBeGreaterThanOrEqual(cap(b.heroFps));
    expect(cap(b.heroFps)).toBeGreaterThanOrEqual(cap(c.heroFps));
  });

  it("gives every tier a name and a blurb", () => {
    for (const tier of VOXEL_TIERS) {
      expect(TIER_NAMES[tier].length).toBeGreaterThan(0);
      expect(TIER_BLURBS[tier].length).toBeGreaterThan(0);
      expect(knobsFor(tier)).toBe(KNOBS[tier]);
    }
  });

  it("recognises only real tiers", () => {
    expect(isVoxelTier("super")).toBe(true);
    expect(isVoxelTier("pocket")).toBe(true);
    expect(isVoxelTier("auto")).toBe(false);
    expect(isVoxelTier("")).toBe(false);
    expect(isVoxelTier(2)).toBe(false);
    expect(isVoxelTier(null)).toBe(false);
  });

  describe("rendererOptionsFor", () => {
    // Today's rule (useHeroScene): dpr = min(ratio || 1, 2); antialias only while dpr <= 1.5.
    const today = (ratio: number) => {
      const dpr = Math.min(ratio || 1, 2);
      return { dpr, antialias: dpr <= 1.5 };
    };

    it.each([1, 1.25, 1.5, 2, 3])("Super matches today's rule at ratio %s", (ratio) => {
      expect(rendererOptionsFor(KNOBS.super, ratio)).toEqual(today(ratio));
    });

    it("treats a missing ratio as 1", () => {
      expect(rendererOptionsFor(KNOBS.super, 0)).toEqual({ dpr: 1, antialias: true });
    });

    it("caps Classic and Pocket and keeps antialias off", () => {
      expect(rendererOptionsFor(KNOBS.classic, 3)).toEqual({ dpr: 1.5, antialias: false });
      expect(rendererOptionsFor(KNOBS.pocket, 3)).toEqual({ dpr: 1, antialias: false });
      expect(rendererOptionsFor(KNOBS.pocket, 1)).toEqual({ dpr: 1, antialias: false });
    });
  });
});
