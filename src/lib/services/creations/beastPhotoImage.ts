import { largestSquare, PORTRAIT_MAX_BYTES, PORTRAIT_SIDE } from "@/lib/services/creations/beastPhoto";
import type { CropFrame } from "@/lib/services/creations/beastPhoto";
import { loadImage, PhotoRejectedError } from "@/lib/services/quests/claimPhotoImage";
import { dataUrlBytes, isImageType, isPhotoSmallEnough, nextQuality, PHOTO_QUALITY } from "@/lib/services/quests/claimPhotos";
import debug from "@/lib/utils/debug";

/**
 * The browser side of a beast's portrait: a picked photo is cut to the crop frame, drawn on a 512px square and encoded as
 * JPEG, the quality lowered until it fits 150 KB. Thin on purpose; the crop maths are pure and live in beastPhoto.ts, the
 * size rules in claimPhotos.ts. Needs a canvas.
 */

/** A loaded picture and the object URL it came from. The caller revokes the URL when it is done with the picture. */
export interface OpenedPicture {
  image: HTMLImageElement;
  url: string;
}

/** A picked file read as a picture. Throws PhotoRejectedError for a file that is not an image or cannot be read. */
export const openPicture = async (file: File): Promise<OpenedPicture> => {
  const isNotImage = !isImageType(file.type);
  if (isNotImage) throw new PhotoRejectedError("Pick a picture, not another kind of file.");
  const url = URL.createObjectURL(file);
  try {
    return { image: await loadImage(url), url };
  } catch (caught) {
    URL.revokeObjectURL(url);
    throw caught;
  }
};

/**
 * The frame's part of `image` as a 512px square JPEG data URL, under PORTRAIT_MAX_BYTES. Throws PhotoRejectedError for a
 * frame with no size, a device without a canvas, or a picture still too big at the lowest quality.
 */
export const portraitFromImage = (image: HTMLImageElement, frame: CropFrame): string => {
  const isUnreadable = !(frame.size > 0);
  if (isUnreadable) throw new PhotoRejectedError("That picture has no size.");
  const canvas = document.createElement("canvas");
  canvas.width = PORTRAIT_SIDE;
  canvas.height = PORTRAIT_SIDE;
  const context = canvas.getContext("2d");
  const hasNoContext = context === null;
  if (hasNoContext) throw new PhotoRejectedError("This device cannot shrink a picture.");
  // A picture with see-through parts would turn black in a JPEG: paper is white
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, PORTRAIT_SIDE, PORTRAIT_SIDE);
  context.imageSmoothingQuality = "high";
  context.drawImage(image, frame.x, frame.y, frame.size, frame.size, 0, 0, PORTRAIT_SIDE, PORTRAIT_SIDE);
  let dataUrl = canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
  // Squeeze it a notch at a time until it fits the cap
  for (
    let quality = nextQuality(PHOTO_QUALITY);
    quality !== null && !isPhotoSmallEnough(dataUrl, PORTRAIT_MAX_BYTES);
    quality = nextQuality(quality)
  ) {
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  const isStillTooBig = !isPhotoSmallEnough(dataUrl, PORTRAIT_MAX_BYTES);
  if (isStillTooBig) {
    debug.warn("[BeastPhoto] still over the cap at the lowest quality", dataUrlBytes(dataUrl));
    throw new PhotoRejectedError("That picture is too big even after shrinking. Try another one.");
  }
  return dataUrl;
};

/**
 * A picked file as a portrait: cut by `frame` (given the picture's size; the largest centred square when left out).
 * Throws PhotoRejectedError for anything that is not a readable picture.
 */
export const portraitFromFile = async (
  file: File,
  frame: (size: { width: number; height: number }) => CropFrame = ({ width, height }) => largestSquare(width, height)
): Promise<string> => {
  const { image, url } = await openPicture(file);
  try {
    return portraitFromImage(image, frame({ width: image.naturalWidth, height: image.naturalHeight }));
  } finally {
    URL.revokeObjectURL(url);
  }
};
