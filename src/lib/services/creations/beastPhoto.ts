/**
 * A photo of a kid's drawing becomes a beast's portrait. This is the pure half: where the square crop frame starts, how
 * it moves and how it grows, all in source pixels so the picker maps a finger to the picture and nothing else. The
 * canvas half (draw the frame at 512px, squeeze the JPEG under the cap) is beastPhotoImage.ts.
 */

/** A portrait is a square this many pixels on a side (the battle and the Beast Card show it small) */
export const PORTRAIT_SIDE = 512;
/** A stored portrait is at most this many bytes: a hundred beasts must still fit in the device's storage */
export const PORTRAIT_MAX_BYTES = 150 * 1024;
/** The smallest frame the picker allows, in source pixels: any smaller and the portrait is only a blur */
export const MIN_FRAME = 32;

/** The square cut from the picture, in source pixels: its top-left corner and its side */
export interface CropFrame {
  x: number;
  y: number;
  size: number;
}

const NO_FRAME: CropFrame = { x: 0, y: 0, size: 0 };

const clamp = (value: number, low: number, high: number): number => Math.min(Math.max(value, low), high);

const hasNoSize = (width: number, height: number): boolean => !(width > 0) || !(height > 0);

/** The first frame the picker shows: the biggest square the picture holds, centred; nothing when the picture has no size. */
export const largestSquare = (width: number, height: number): CropFrame => {
  if (hasNoSize(width, height)) return NO_FRAME;
  const size = Math.min(width, height);
  return { x: Math.round((width - size) / 2), y: Math.round((height - size) / 2), size };
};

/**
 * The frame slid by a drag, kept inside the picture. The drag is not rounded: a slow finger moves a fraction of a
 * source pixel per event and would never get anywhere if every step were rounded away.
 */
export const moveFrame = (frame: CropFrame, dx: number, dy: number, width: number, height: number): CropFrame => ({
  x: clamp(frame.x + dx, 0, Math.max(0, width - frame.size)),
  y: clamp(frame.y + dy, 0, Math.max(0, height - frame.size)),
  size: frame.size,
});

/**
 * The frame grown (positive) or shrunk (negative) about its centre, never below MIN_FRAME nor beyond the picture's short
 * side (a picture smaller than MIN_FRAME is its own frame), then slid back inside the picture if the growth pushed it out.
 */
export const resizeFrame = (frame: CropFrame, delta: number, width: number, height: number): CropFrame => {
  if (hasNoSize(width, height)) return NO_FRAME;
  const shortSide = Math.min(width, height);
  const size = Math.round(clamp(frame.size + delta, Math.min(MIN_FRAME, shortSide), shortSide));
  const centreX = frame.x + frame.size / 2;
  const centreY = frame.y + frame.size / 2;
  return moveFrame({ x: Math.round(centreX - size / 2), y: Math.round(centreY - size / 2), size }, 0, 0, width, height);
};
