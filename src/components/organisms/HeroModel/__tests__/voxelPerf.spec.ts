import { DEFAULT_LOOK, FACE_STYLES, HAIR_STYLES, HAT_STYLES, SKIN_TONES } from "@/lib/hero-look/types";
import type { SkinTone } from "@/lib/hero-look/types";
import { BENCH_LOOKS } from "../voxel/benchLooks";
import { hair } from "../voxel/hair";
import { hat } from "../voxel/hats";
import { HEAD, head } from "../voxel/head";
import { GEAR_BY_ICON, held } from "../voxel/held";
import { formatMeasure, measureHero } from "../voxel/measure";
import { PART_NAMES } from "../voxel/shape";
import type { Box } from "../voxel/shape";
import { BENCH_SIGNATURES, HAT_BOUNDS, HELD_BOUNDS } from "./fixtures/voxelBaselines";
import type { Bounds } from "./fixtures/voxelBaselines";

/**
 * The hero's geometry measured without WebGL: how many boxes and quads a look costs, and what it meshes to, pinned so
 * a change to the mesher can prove the art did not move. A bound or signature that moves on purpose is re-recorded in
 * voxelBaselines.ts.
 */

const boundsOf = (boxes: Box[]): Bounds => {
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const b of boxes) {
    const lows = [b.x, b.y, b.z];
    const highs = [b.x + b.w, b.y + b.h, b.z + b.d];
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], lows[a]);
      max[a] = Math.max(max[a], highs[a]);
    }
  }
  return { min, max };
};

/** Does `actual` sit inside `recorded`, give or take `tolerance` on every axis? */
const within = (actual: Bounds, recorded: Bounds, tolerance = 0.05): boolean =>
  [0, 1, 2].every((a) => {
    const isAboveFloor = actual.min[a] >= recorded.min[a] - tolerance;
    const isBelowCeiling = actual.max[a] <= recorded.max[a] + tolerance;
    return isAboveFloor && isBelowCeiling;
  });

const GENERIC_HELD = ["sword", "shield", "wand", "book", "axe", "hammer", "bow", "potion", "torch"];

describe("measureHero", () => {
  it("counts the default hero's boxes and quads and times the build", () => {
    const m = measureHero(DEFAULT_LOOK);
    expect(m.boxes).toBe(46);
    expect(m.quads).toBeGreaterThan(400);
    expect(m.ms).toBeGreaterThanOrEqual(0);
    expect(Object.keys(m.parts).sort()).toEqual([...PART_NAMES].sort());
    expect(formatMeasure({ boxes: 46, quads: 489, ms: 9.46, parts: m.parts })).toBe("46 boxes · 489 quads · 9.5 ms");
  });
});

describe("budgets", () => {
  it("keeps the default hero under 1,000 quads and every bench look under 1,400", () => {
    expect(measureHero(DEFAULT_LOOK).quads).toBeLessThan(1000);
    for (const look of BENCH_LOOKS) expect(measureHero(look).quads).toBeLessThan(1400);
  });
});

describe("pinned geometry", () => {
  it("meshes every bench look to its recorded per-part signature", () => {
    BENCH_LOOKS.forEach((look, i) => {
      const parts = measureHero(look).parts;
      for (const name of PART_NAMES) expect(parts[name].signature).toBe(BENCH_SIGNATURES[i][name]);
    });
  });

  it("keeps every hat and held item inside its recorded bounds", () => {
    for (const style of HAT_STYLES) {
      const isBareHead = style === "none";
      if (isBareHead) continue;
      const recorded = HAT_BOUNDS[style];
      if (!recorded) throw new Error(`no recorded bounds for the ${style} hat`);
      const actual = boundsOf(hat(style, "#aa0000"));
      expect({ style, actual, recorded, fits: within(actual, recorded) }).toMatchObject({ fits: true });
    }
    for (const icon of [...Object.keys(GEAR_BY_ICON), ...GENERIC_HELD]) {
      const recorded = HELD_BOUNDS[icon];
      if (!recorded) throw new Error(`no recorded bounds for the held ${icon}`);
      const item = held(icon);
      if (!item) throw new Error(`nothing held for ${icon}`);
      const actual = boundsOf(item.boxes);
      expect({ icon, actual, recorded, fits: within(actual, recorded) }).toMatchObject({ fits: true });
    }
  });
});

describe("head rules", () => {
  it("keeps the head inside its block, ears to 3.9, nothing past z 4.0, paint at most 0.25 thick on the face", () => {
    for (const skin of Object.keys(SKIN_TONES)) {
      for (const face of FACE_STYLES) {
        const boxes = head(skin as SkinTone, face, "#222233");
        const b = boundsOf(boxes);
        expect(b.min[0]).toBeGreaterThanOrEqual(-3.9 - 1e-6);
        expect(b.max[0]).toBeLessThanOrEqual(3.9 + 1e-6);
        expect(b.min[1]).toBeGreaterThanOrEqual(8 - 1e-6);
        expect(b.max[1]).toBeLessThanOrEqual(15 + 1e-6);
        expect(b.min[2]).toBeGreaterThanOrEqual(-3.5 - 1e-6);
        expect(b.max[2]).toBeLessThanOrEqual(4.0 + 1e-6);
        for (const box of boxes) {
          const isFacePaint = box.z >= HEAD.z - 1e-6 && box.d <= 0.25 + 1e-6;
          if (isFacePaint) expect(box.z + box.d).toBeLessThanOrEqual(HEAD.z + 0.5 + 1e-6);
        }
      }
    }
  });

  it("keeps the head within x 3.5 and lets only the two ears reach 3.9", () => {
    for (const skin of Object.keys(SKIN_TONES)) {
      for (const face of FACE_STYLES) {
        const boxes = head(skin as SkinTone, face, "#222233");
        const wide = boxes.filter((box) => Math.max(Math.abs(box.x), Math.abs(box.x + box.w)) > 3.5 + 1e-6);
        expect(wide.length).toBeLessThanOrEqual(2);
        for (const ear of wide) {
          const b = boundsOf([ear]);
          expect(b.min[0]).toBeGreaterThanOrEqual(-3.9 - 1e-6);
          expect(b.max[0]).toBeLessThanOrEqual(3.9 + 1e-6);
          expect(b.min[1]).toBeGreaterThanOrEqual(10 - 1e-6);
          expect(b.max[1]).toBeLessThanOrEqual(12.5 + 1e-6);
          expect(b.min[2]).toBeGreaterThanOrEqual(-1 - 1e-6);
          expect(b.max[2]).toBeLessThanOrEqual(1 + 1e-6);
        }
      }
    }
  });

  it("keeps covered hair under the hat rim", () => {
    for (const style of HAIR_STYLES) {
      for (const box of hair(style, "#aa5500", { covered: true })) expect(box.y + box.h).toBeLessThanOrEqual(14.5 + 1e-6);
    }
  });
});
