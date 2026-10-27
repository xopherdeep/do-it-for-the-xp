import debug from "@/lib/utils/debug";
import {
  dataUrlBytes,
  fitPhoto,
  isImageType,
  isPhotoSmallEnough,
  nextQuality,
  PHOTO_MAX_SIDE,
  PHOTO_QUALITY,
} from "@/lib/services/quests/claimPhotos";

/**
 * The browser side of photo proof: a picked file becomes a small JPEG data URL (longest side 1024px, quality 0.7 then lower
 * until it fits ~400 KB). Thin on purpose; the size rules are pure and tested in claimPhotos.ts. Needs a canvas.
 */
export class PhotoRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PhotoRejectedError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const loadImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new PhotoRejectedError("That file is not a picture the village can read."));
    image.src = url;
  });

/** Draw `image` at the fitted size and encode it as JPEG, lowering the quality until it is small enough */
export const encodeJpeg = (image: CanvasImageSource, width: number, height: number): string => {
  const size = fitPhoto(width, height, PHOTO_MAX_SIDE);
  const isUnreadable = size.width === 0 || size.height === 0;
  if (isUnreadable) throw new PhotoRejectedError("That picture has no size.");
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const context = canvas.getContext("2d");
  const hasNoContext = context === null;
  if (hasNoContext) throw new PhotoRejectedError("This device cannot shrink a picture.");
  context.drawImage(image, 0, 0, size.width, size.height);
  let dataUrl = canvas.toDataURL("image/jpeg", PHOTO_QUALITY);
  // Squeeze it a notch at a time until it fits the cap
  for (let quality = nextQuality(PHOTO_QUALITY); quality !== null && !isPhotoSmallEnough(dataUrl); quality = nextQuality(quality)) {
    dataUrl = canvas.toDataURL("image/jpeg", quality);
  }
  const isStillTooBig = !isPhotoSmallEnough(dataUrl);
  if (isStillTooBig) {
    debug.warn("[ClaimPhoto] still over the cap at the lowest quality", dataUrlBytes(dataUrl));
    throw new PhotoRejectedError("That picture is too big even after shrinking. Try another one.");
  }
  return dataUrl;
};

/** A picked file as a stored-size JPEG data URL. Throws PhotoRejectedError for anything that is not a readable picture. */
export const photoFromFile = async (file: File): Promise<string> => {
  const isNotImage = !isImageType(file.type);
  if (isNotImage) throw new PhotoRejectedError("Pick a picture, not another kind of file.");
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    return encodeJpeg(image, image.naturalWidth, image.naturalHeight);
  } finally {
    URL.revokeObjectURL(url);
  }
};
