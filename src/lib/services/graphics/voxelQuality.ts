// The single table of what each Video quality tier changes. Pure: no Vue, no three. The hero, the
// builder thumbnails and the landmark renderer read these knobs; Super reproduces today's numbers
// exactly, so a player who never picks a tier sees nothing change. Tier names live only here.

export const VOXEL_TIERS = ["super", "classic", "pocket"] as const;
export type VoxelTier = (typeof VOXEL_TIERS)[number];

export function isVoxelTier(value: unknown): value is VoxelTier {
  return typeof value === "string" && (VOXEL_TIERS as readonly string[]).includes(value);
}

export interface VoxelKnobs {
  /** Data only until the older art lands: nothing reads it before then. */
  art: "fine" | "classic";
  material: "full" | "simple" | "flat";
  dprCap: number;
  /** "rule" is today's rule: antialias only while the capped dpr is 1.5 or less. */
  antialias: "rule" | "off";
  /** Frames per second for the hero; 0 means every display frame. */
  heroFps: number;
  snapshotSamples: number;
  /** Longest side of a builder thumbnail in pixels; 0 means no cap. */
  thumbMaxPx: number;
  thumbPerFrame: number;
  landmarkScaleCap: number;
}

export const KNOBS: Record<VoxelTier, VoxelKnobs> = {
  super: {
    art: "fine",
    material: "full",
    dprCap: 2,
    antialias: "rule",
    heroFps: 0,
    snapshotSamples: 4,
    thumbMaxPx: 0,
    thumbPerFrame: 3,
    landmarkScaleCap: 2,
  },
  classic: {
    art: "classic",
    material: "simple",
    dprCap: 1.5,
    antialias: "off",
    heroFps: 30,
    snapshotSamples: 0,
    thumbMaxPx: 128,
    thumbPerFrame: 2,
    landmarkScaleCap: 1.5,
  },
  pocket: {
    art: "classic",
    material: "flat",
    dprCap: 1,
    antialias: "off",
    heroFps: 20,
    snapshotSamples: 0,
    thumbMaxPx: 64,
    thumbPerFrame: 1,
    landmarkScaleCap: 1,
  },
};

export function knobsFor(tier: VoxelTier): VoxelKnobs {
  return KNOBS[tier];
}

// Same arithmetic as useHeroScene today: a missing ratio counts as 1, and for Super the cap is 2.
export function rendererOptionsFor(knobs: VoxelKnobs, devicePixelRatio: number): { dpr: number; antialias: boolean } {
  const dpr = Math.min(devicePixelRatio || 1, knobs.dprCap);
  const followsRule = knobs.antialias === "rule";
  const antialias = followsRule ? dpr <= 1.5 : false;
  return { dpr, antialias };
}

// Described by effect so they stay true before and after the older art lands.
export const TIER_NAMES: Record<VoxelTier, string> = {
  super: "Super",
  classic: "Classic",
  pocket: "Pocket",
};

export const TIER_BLURBS: Record<VoxelTier, string> = {
  super: "The finest heroes and sharpest shading. For recent phones.",
  classic: "Simpler shading and a lighter load. For older phones.",
  pocket: "The lightest drawing there is. For the oldest phones.",
};
