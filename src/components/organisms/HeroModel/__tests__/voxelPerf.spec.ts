import { DEFAULT_LOOK, FACE_STYLES, HAIR_STYLES, HAT_STYLES, SKIN_TONES } from "@/lib/hero-look/types";
import type { SkinTone } from "@/lib/hero-look/types";
import { assembleHero } from "../voxel/assemble";
import { BENCH_LOOKS } from "../voxel/benchLooks";
import { hair } from "../voxel/hair";
import { hat } from "../voxel/hats";
import { HEAD, head } from "../voxel/head";
import { GEAR_BY_ICON, held } from "../voxel/held";
import { formatMeasure, measureHero } from "../voxel/measure";
import { buildMeshData } from "../voxel/mesh";
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
    expect(m.boxes).toBe(52);
    expect(m.quads).toBeGreaterThan(400);
    expect(m.ms).toBeGreaterThanOrEqual(0);
    expect(Object.keys(m.parts).sort()).toEqual([...PART_NAMES].sort());
    expect(formatMeasure({ boxes: 46, quads: 489, ms: 9.46, parts: m.parts })).toBe("46 boxes · 489 quads · 9.5 ms");
  });
});

describe("budgets", () => {
  it("keeps the default hero under 1,200 quads and every bench look under 2,000", () => {
    expect(measureHero(DEFAULT_LOOK).quads).toBeLessThan(1200);
    for (const look of BENCH_LOOKS) expect(measureHero(look).quads).toBeLessThan(2000);
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
      const boxes = hat(style, "#aa0000");
      const isEmpty = boxes.length === 0;
      expect({ style, isEmpty }).toMatchObject({ isEmpty: false });
      const actual = boundsOf(boxes);
      expect({ style, actual, recorded, fits: within(actual, recorded) }).toMatchObject({ fits: true });
    }
    for (const icon of [...Object.keys(GEAR_BY_ICON), ...GENERIC_HELD]) {
      const recorded = HELD_BOUNDS[icon];
      if (!recorded) throw new Error(`no recorded bounds for the held ${icon}`);
      const item = held(icon);
      if (!item) throw new Error(`nothing held for ${icon}`);
      const isEmpty = item.boxes.length === 0;
      expect({ icon, isEmpty }).toMatchObject({ isEmpty: false });
      const actual = boundsOf(item.boxes);
      expect({ icon, actual, recorded, fits: within(actual, recorded) }).toMatchObject({ fits: true });
    }
  });
});

describe("head rules", () => {
  it("keeps the head inside its block, ears to 3.9, nothing past z 4.0, paint at most 0.25 thick and within x 3 of the face", () => {
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
          // the block's vertical edges are cut by half a unit, so the face plane is 6 wide
          if (isFacePaint) expect(Math.max(Math.abs(box.x), Math.abs(box.x + box.w))).toBeLessThanOrEqual(HEAD.x - 0.5 + 1e-6);
        }
      }
    }
  });

  it("keeps the head within x 3.5 and lets only the two ears reach 3.9", () => {
    for (const skin of Object.keys(SKIN_TONES)) {
      for (const face of FACE_STYLES) {
        const boxes = head(skin as SkinTone, face, "#222233");
        const wide = boxes.filter((box) => Math.max(Math.abs(box.x), Math.abs(box.x + box.w)) > 3.5 + 1e-6);
        // an ear may be a few boxes (a lobe on the main block), so the count is per side
        const right = wide.filter((box) => box.x + box.w / 2 > 0);
        const left = wide.filter((box) => box.x + box.w / 2 < 0);
        expect(right.length).toBeLessThanOrEqual(3);
        expect(left.length).toBeLessThanOrEqual(3);
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

/** A box obeys the half-unit floor when its two larger sides are at least 0.5 and its smallest is at least 0.5 or at most 0.25 (paint) */
const obeysFloor = (b: Box): boolean => {
  const [a, mid] = [b.w, b.h, b.d].sort((p, q) => p - q);
  const isMidWholeEnough = mid >= 0.5 - 1e-6;
  const isSmallestOnGrid = a >= 0.5 - 1e-6 || a <= 0.25 + 1e-6;
  return isMidWholeEnough && isSmallestOnGrid;
};

/** The labels of the boxes of `boxes` that break the floor, as `label#index` */
const breaking = (boxes: Box[], label: string): string[] => boxes.flatMap((b, i) => (obeysFloor(b) ? [] : [`${label}#${i}`]));

describe("half-unit floor", () => {
  it("builds the head, every hair and every hat from half-unit boxes and quarter-unit paint", () => {
    const offenders: string[] = [];
    for (const face of FACE_STYLES) offenders.push(...breaking(head("peach", face, "#222233"), `head/${face}`));
    for (const style of HAIR_STYLES) {
      for (const covered of [false, true]) {
        offenders.push(...breaking(hair(style, "#aa5500", { covered }), `hair/${style}${covered ? "/covered" : ""}`));
      }
    }
    for (const style of HAT_STYLES) offenders.push(...breaking(hat(style, "#aa0000"), `hat/${style}`));
    expect(offenders).toEqual([]);
  });
});

/** Every box split into n x n x n equal same-colour sub-boxes */
const subdivide = (boxes: Box[], n: number): Box[] => {
  const out: Box[] = [];
  for (const b of boxes) {
    const [w, h, d] = [b.w / n, b.h / n, b.d / n];
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        for (let k = 0; k < n; k++) out.push({ x: b.x + i * w, y: b.y + j * h, z: b.z + k * d, w, h, d, color: b.color });
  }
  return out;
};

/** The default hero's parts with every box split n x n x n, made once so only the meshing is timed */
const subdividedHero = (n: number): Box[][] => assembleHero(DEFAULT_LOOK).map((p) => subdivide(p.boxes, n));

/** Milliseconds to mesh every part */
const meshAll = (parts: Box[][]): number => {
  const start = performance.now();
  for (const boxes of parts) buildMeshData(boxes, []);
  return performance.now() - start;
};

/** The quickest of `runs` builds: a scheduler spike on a busy runner only ever adds time */
const quickest = (parts: Box[][], runs = 3): number => Math.min(...Array.from({ length: runs }, () => meshAll(parts)));

describe("hidden-face culling cost", () => {
  jest.retryTimes(2); // a rare noisy-neighbour run on CI heals itself on a retry

  /**
   * Guards against a return to testing every face against every box of the part, which takes over seventy times as
   * long at 8x. It is not a proof of strict linearity: the unit grid holds many boxes per cell at 8x, so the ratio
   * lands about nine.
   */
  it("builds an 8x hero in under twenty times a 4x hero (the grid takes about nine, a whole-part scan over seventy)", () => {
    const hero4 = subdividedHero(4);
    const hero8 = subdividedHero(8);
    meshAll(subdividedHero(2)); // warm the JIT
    const t4 = quickest(hero4);
    const t8 = quickest(hero8);
    expect(t8 / t4).toBeLessThan(20);
  }, 60000);
});
