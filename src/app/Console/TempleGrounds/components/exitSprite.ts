/**
 * The dungeon exit sprite for TempleChoiceReveal, painted on a 48 x 40 grid matching the tablet and coins:
 * an arched stone dungeon doorway with heavy wooden leaves swung open to reveal the outside daylight sky,
 * distant green hills, and the sunlit path leading out into the world.
 */

import { cornerInset, createGrid, gridRuns, outlineGrid, paint, type Grid, type PixelRun } from './pixelGrid';
import { doorPalette } from './doorSprite';

export const EXIT_W = 48;
export const EXIT_H = 40;

const INK = '#140a0e';
const WOOD = ['#2e1608', '#4c2812', '#6e3e1e', '#8e5a2e', '#b07a46'];

// The outside world seen through the open archway
const SKY = ['#eaf6ff', '#bfe2fc', '#7ec4f8', '#42a5f5'];
const HILLS = ['#2d6a4f', '#40916c', '#52b788', '#74c69d'];
const PATH = ['#8d6e63', '#a1887f', '#d7ccc8', '#fff8e1'];

const tone = (ramp: string[], index: number): string =>
  ramp[Math.max(0, Math.min(ramp.length - 1, index))];

/**
 * Check if a pixel is inside the arched opening of the exit doorway.
 * Opening spans x: 15 to 32, y: 8 to 34, with rounded arch apex at y=8.
 */
const inExitOpening = (x: number, y: number): boolean => {
  const isOutOfBounds = x < 15 || x > 32 || y < 8 || y > 34;
  if (isOutOfBounds) return false;
  const isLowerRect = y >= 16;
  if (isLowerRect) return true;
  const cx = 23.5;
  const cy = 16;
  const rx = 8.5;
  const ry = 8;
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
};

const outsideSkyColor = (y: number): string => {
  const isHighSky = y <= 10;
  if (isHighSky) return SKY[0];
  const isUpperSky = y <= 14;
  if (isUpperSky) return SKY[1];
  const isMidSky = y <= 16;
  if (isMidSky) return SKY[2];
  return SKY[3];
};

const hillColor = (x: number, y: number): string => {
  const hillProfile = Math.sin((x - 15) * 0.4) * 1.5;
  const isAboveHill = y - 20 < hillProfile;
  if (isAboveHill) return SKY[3];
  const isUpperSlope = y <= 22;
  if (isUpperSlope) return HILLS[1];
  return HILLS[0];
};

const outdoorGroundColor = (x: number, y: number): string => {
  const distFromCenter = Math.abs(x - 23.5);
  const isFlankingBank = distFromCenter > 6;
  if (isFlankingBank) {
    const isAlternatingRow = y % 2 === 0;
    return isAlternatingRow ? HILLS[0] : HILLS[1];
  }
  const isNearStep = y >= 32;
  if (isNearStep) return PATH[3];
  const isMidPath = y >= 28;
  if (isMidPath) return PATH[2];
  return PATH[1];
};

/**
 * Paints the outside daylight and scenery seen through the open doorway.
 */
const paintOutside = (g: Grid) => {
  for (let y = 8; y <= 34; y++) {
    for (let x = 15; x <= 32; x++) {
      const isDoorCell = inExitOpening(x, y);
      if (!isDoorCell) continue;

      const isSkyRow = y <= 19;
      if (isSkyRow) {
        paint(g, x, y, outsideSkyColor(y));
        continue;
      }
      const isHillRow = y <= 24;
      if (isHillRow) {
        paint(g, x, y, hillColor(x, y));
        continue;
      }
      paint(g, x, y, outdoorGroundColor(x, y));
    }
  }

  // Sunbeams pouring into the doorway
  paint(g, 23, 9, '#ffffff');
  paint(g, 24, 9, '#ffffff');
  paint(g, 22, 11, SKY[0]);
  paint(g, 25, 11, SKY[0]);
};

/**
 * Paints the wooden door leaves open against the jambs.
 */
const paintOpenDoorLeaves = (g: Grid, metalRamp: string[]) => {
  // Left door leaf swung open against the left jamb
  for (let y = 14; y <= 33; y++) {
    paint(g, 15, y, WOOD[1]);
    paint(g, 16, y, WOOD[2]);
    paint(g, 17, y, WOOD[3]);
  }
  // Left door iron hinges and straps
  const leftHingeRows = [18, 28];
  leftHingeRows.forEach((hy) => {
    paint(g, 15, hy, tone(metalRamp, 1));
    paint(g, 16, hy, tone(metalRamp, 3));
    paint(g, 17, hy, tone(metalRamp, 4));
  });

  // Right door leaf swung open against the right jamb
  for (let y = 14; y <= 33; y++) {
    paint(g, 30, y, WOOD[2]);
    paint(g, 31, y, WOOD[1]);
    paint(g, 32, y, WOOD[0]);
  }
  // Right door iron hinges and straps
  const rightHingeRows = [18, 28];
  rightHingeRows.forEach((hy) => {
    paint(g, 30, hy, tone(metalRamp, 3));
    paint(g, 31, hy, tone(metalRamp, 2));
    paint(g, 32, hy, tone(metalRamp, 1));
  });
};

const thresholdStep = (y: number): number => {
  const isTopEdge = y === 35;
  if (isTopEdge) return 4;
  const isUpperFace = y === 36;
  if (isUpperFace) return 3;
  const isBottomEdge = y === 39;
  if (isBottomEdge) return 1;
  return 2;
};

const pillarStoneStep = (x: number, isLeft: boolean): number => {
  if (isLeft) {
    const isLitSide = x <= 9;
    return isLitSide ? 3 : 2;
  }
  const isShadowSide = x >= 39;
  return isShadowSide ? 1 : 2;
};

const pillarCellStep = (x: number, isMortarRow: boolean, isBorder: boolean, isLeft: boolean): number => {
  if (isMortarRow) return 0;
  if (isBorder) return 1;
  return pillarStoneStep(x, isLeft);
};

const paintThreshold = (g: Grid, stoneRamp: string[]) => {
  for (let y = 35; y <= 39; y++) {
    const inset = cornerInset(y - 35, 3);
    const leftBound = 4 + inset;
    const rightBound = 43 - inset;
    for (let x = leftBound; x <= rightBound; x++) {
      paint(g, x, y, tone(stoneRamp, thresholdStep(y)));
    }
  }
};

const paintPillars = (g: Grid, stoneRamp: string[]) => {
  for (let y = 14; y <= 34; y++) {
    const isMortarRow = y % 5 === 4;
    for (let x = 6; x <= 14; x++) {
      const isBorder = isMortarRow || x === 6 || x === 14;
      paint(g, x, y, tone(stoneRamp, pillarCellStep(x, isMortarRow, isBorder, true)));
    }
    for (let x = 33; x <= 41; x++) {
      const isBorder = isMortarRow || x === 33 || x === 41;
      paint(g, x, y, tone(stoneRamp, pillarCellStep(x, isMortarRow, isBorder, false)));
    }
  }
};

const isArchStonePainted = (x: number, y: number): boolean => {
  const isInsideDoor = inExitOpening(x, y);
  if (isInsideDoor) return false;
  const isLowerPillarArea = y >= 14 && (x < 15 || x > 32);
  if (isLowerPillarArea) return false;
  const distFromCenter = Math.abs(x - 23.5);
  const isOuterCornerCut = y <= 7 && distFromCenter >= 14;
  return !isOuterCornerCut;
};

const archStoneStep = (x: number, y: number): number => {
  const distFromCenter = Math.abs(x - 23.5);
  const isKeystone = distFromCenter <= 2 && y <= 8;
  if (isKeystone) {
    const isKeystoneLit = x <= 23 && y <= 5;
    return isKeystoneLit ? 4 : 3;
  }
  const isLitEdge = y <= 6 || x <= 18;
  return isLitEdge ? 3 : 2;
};

const paintArchRing = (g: Grid, stoneRamp: string[]) => {
  for (let y = 3; y <= 15; y++) {
    for (let x = 6; x <= 41; x++) {
      const shouldPaint = isArchStonePainted(x, y);
      if (shouldPaint) {
        paint(g, x, y, tone(stoneRamp, archStoneStep(x, y)));
      }
    }
  }
};

/**
 * Generates pixel runs for the dungeon exit sprite in the temple's element palette.
 */
export const dungeonExitRuns = (element = 'wind'): PixelRun[] => {
  const { stone, metal } = doorPalette(element);
  const g = createGrid(EXIT_W, EXIT_H);

  paintOutside(g);
  paintOpenDoorLeaves(g, metal);
  paintThreshold(g, stone);
  paintPillars(g, stone);
  paintArchRing(g, stone);

  outlineGrid(g, INK);
  return gridRuns(g);
};
