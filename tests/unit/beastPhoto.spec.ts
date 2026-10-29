/**
 * A photo of a drawing becomes a beast's portrait (kid creations, task 3). The crop maths are pure: where the square
 * frame starts, how it moves and how it grows inside the picture. The canvas side only draws that frame at 512px and
 * squeezes the JPEG under 150 KB; it is checked here with a canvas that records what it was asked to do.
 */
import {
  MIN_FRAME,
  PORTRAIT_MAX_BYTES,
  PORTRAIT_SIDE,
  largestSquare,
  moveFrame,
  resizeFrame,
} from "@/lib/services/creations/beastPhoto";
import { portraitFromFile, portraitFromImage } from "@/lib/services/creations/beastPhotoImage";
import { PhotoRejectedError } from "@/lib/services/quests/claimPhotoImage";
import { dataUrlBytes } from "@/lib/services/quests/claimPhotos";

describe("the portrait's numbers", () => {
  it("are a 512px square under 150 KB, with a frame that never shrinks below 32px", () => {
    expect(PORTRAIT_SIDE).toBe(512);
    expect(PORTRAIT_MAX_BYTES).toBe(150 * 1024);
    expect(MIN_FRAME).toBe(32);
  });
});

describe("the first frame", () => {
  it("is the largest square, centred on the long side", () => {
    expect(largestSquare(100, 300)).toEqual({ x: 0, y: 100, size: 100 });
    expect(largestSquare(300, 100)).toEqual({ x: 100, y: 0, size: 100 });
    expect(largestSquare(200, 200)).toEqual({ x: 0, y: 0, size: 200 });
  });

  it("is nothing when the picture has no size", () => {
    const none = { x: 0, y: 0, size: 0 };
    expect(largestSquare(0, 10)).toEqual(none);
    expect(largestSquare(10, 0)).toEqual(none);
    expect(largestSquare(-5, 10)).toEqual(none);
    expect(largestSquare(Number.NaN, 10)).toEqual(none);
  });

  it("starts on a whole pixel when the picture is an odd size", () => {
    const frame = largestSquare(101, 300);
    expect(frame.size).toBe(101);
    expect(Number.isInteger(frame.y)).toBe(true);
    expect(frame.y + frame.size).toBeLessThanOrEqual(300);
  });
});

describe("moving the frame", () => {
  const frame = { x: 100, y: 50, size: 100 };

  it("slides by the drag and keeps its size", () => {
    expect(moveFrame(frame, 20, -10, 400, 300)).toEqual({ x: 120, y: 40, size: 100 });
  });

  it("stops at the left and top edges of the picture", () => {
    expect(moveFrame(frame, -1000, 0, 400, 300).x).toBe(0);
    expect(moveFrame(frame, 0, -1000, 400, 300).y).toBe(0);
  });

  it("stops at the right and bottom edges, where the frame's far side meets the picture", () => {
    expect(moveFrame(frame, 1000, 0, 400, 300).x).toBe(300);
    expect(moveFrame(frame, 0, 1000, 400, 300).y).toBe(200);
  });

  it("pulls a frame that sticks out back inside, even with no drag", () => {
    expect(moveFrame({ x: 350, y: 250, size: 100 }, 0, 0, 400, 300)).toEqual({ x: 300, y: 200, size: 100 });
  });

  it("does not change the frame it was given", () => {
    const given = { x: 100, y: 50, size: 100 };
    moveFrame(given, 500, 500, 400, 300);
    expect(given).toEqual({ x: 100, y: 50, size: 100 });
  });
});

describe("resizing the frame", () => {
  const frame = { x: 100, y: 50, size: 100 };

  it("grows about its centre", () => {
    // Centre (150, 100): a 140 square starts at (80, 30)
    expect(resizeFrame(frame, 40, 400, 300)).toEqual({ x: 80, y: 30, size: 140 });
  });

  it("shrinks about its centre", () => {
    expect(resizeFrame(frame, -40, 400, 300)).toEqual({ x: 120, y: 70, size: 60 });
  });

  it("never goes below the smallest frame", () => {
    expect(resizeFrame(frame, -1000, 400, 300)).toEqual({ x: 134, y: 84, size: MIN_FRAME });
  });

  it("never goes beyond the short side of the picture", () => {
    expect(resizeFrame(frame, 1000, 400, 300)).toEqual({ x: 0, y: 0, size: 300 });
  });

  it("comes back inside the picture when it grows past an edge", () => {
    // Centre (350, 50): a 140 square would start at (280, -20), so it sits at the top and its far side at 400
    expect(resizeFrame({ x: 300, y: 0, size: 100 }, 40, 400, 300)).toEqual({ x: 260, y: 0, size: 140 });
  });

  it("lands on whole pixels when the step is odd", () => {
    const grown = resizeFrame(frame, 15, 400, 300);
    expect(grown.size).toBe(115);
    expect(Number.isInteger(grown.x)).toBe(true);
    expect(Number.isInteger(grown.y)).toBe(true);
  });

  it("lets a picture smaller than the smallest frame be the frame", () => {
    expect(resizeFrame({ x: 0, y: 0, size: 20 }, -50, 20, 20)).toEqual({ x: 0, y: 0, size: 20 });
  });

  it("is nothing when the picture has no size", () => {
    expect(resizeFrame(frame, 10, 0, 300)).toEqual({ x: 0, y: 0, size: 0 });
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The canvas side, with a canvas that remembers what it drew and answers toDataURL from a list of sizes
// ---------------------------------------------------------------------------------------------------------------------

/** A data URL whose decoded body is `bytes` long (base64 with no padding when bytes is a multiple of 3) */
const dataUrlOf = (bytes: number): string => `data:image/jpeg;base64,${"A".repeat(Math.ceil((bytes * 4) / 3))}`;

interface FakeCanvas {
  width: number;
  height: number;
  getContext: jest.Mock;
  toDataURL: jest.Mock;
}

const drawImage = jest.fn();
const fillRect = jest.fn();
let canvas: FakeCanvas;

/** `sizes` are the byte sizes the canvas encodes at, one per call (the last one repeats) */
const useCanvas = (sizes: number[]) => {
  let call = 0;
  canvas = {
    width: 0,
    height: 0,
    getContext: jest.fn(() => ({ drawImage, fillRect })),
    toDataURL: jest.fn(() => dataUrlOf(sizes[Math.min(call++, sizes.length - 1)])),
  };
  const real = document.createElement.bind(document);
  jest.spyOn(document, "createElement").mockImplementation((tag: string, options?: ElementCreationOptions) =>
    tag === "canvas" ? (canvas as unknown as HTMLCanvasElement) : real(tag, options)
  );
};

const anImage = (width: number, height: number) => ({ naturalWidth: width, naturalHeight: height } as HTMLImageElement);

describe("drawing the portrait", () => {
  beforeEach(() => {
    drawImage.mockClear();
    fillRect.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("draws the frame, and only the frame, onto a 512px square", () => {
    useCanvas([50 * 1024]);
    const image = anImage(800, 600);
    const url = portraitFromImage(image, { x: 100, y: 50, size: 400 });
    expect(canvas.width).toBe(PORTRAIT_SIDE);
    expect(canvas.height).toBe(PORTRAIT_SIDE);
    expect(drawImage).toHaveBeenCalledWith(image, 100, 50, 400, 400, 0, 0, PORTRAIT_SIDE, PORTRAIT_SIDE);
    expect(url.startsWith("data:image/jpeg;base64,")).toBe(true);
  });

  it("lays white paper under the drawing, so a see-through picture does not turn black", () => {
    useCanvas([50 * 1024]);
    portraitFromImage(anImage(800, 600), { x: 0, y: 0, size: 600 });
    expect(fillRect).toHaveBeenCalledWith(0, 0, PORTRAIT_SIDE, PORTRAIT_SIDE);
    expect(fillRect.mock.invocationCallOrder[0]).toBeLessThan(drawImage.mock.invocationCallOrder[0]);
  });

  it("keeps the first quality when the picture is already small", () => {
    useCanvas([50 * 1024]);
    portraitFromImage(anImage(800, 600), { x: 0, y: 0, size: 600 });
    expect(canvas.toDataURL).toHaveBeenCalledTimes(1);
    expect(canvas.toDataURL).toHaveBeenCalledWith("image/jpeg", 0.7);
  });

  it("squeezes a notch at a time until the picture is under the cap", () => {
    useCanvas([200 * 1024, 170 * 1024, 120 * 1024]);
    const url = portraitFromImage(anImage(800, 600), { x: 0, y: 0, size: 600 });
    expect(canvas.toDataURL.mock.calls.map((call) => call[1])).toEqual([0.7, 0.6, 0.5]);
    expect(dataUrlBytes(url)).toBeLessThanOrEqual(PORTRAIT_MAX_BYTES);
  });

  it("turns the picture away when it is still too big at the lowest quality", () => {
    useCanvas([400 * 1024]);
    expect(() => portraitFromImage(anImage(800, 600), { x: 0, y: 0, size: 600 })).toThrow(PhotoRejectedError);
    // 0.7 down to 0.4 in tenths: the floor is 0.35
    expect(canvas.toDataURL.mock.calls.map((call) => call[1])).toEqual([0.7, 0.6, 0.5, 0.4]);
  });

  it("turns away a frame with no size", () => {
    useCanvas([1024]);
    expect(() => portraitFromImage(anImage(800, 600), { x: 0, y: 0, size: 0 })).toThrow(PhotoRejectedError);
    expect(drawImage).not.toHaveBeenCalled();
  });

  it("turns away a device with no canvas to draw on", () => {
    useCanvas([1024]);
    canvas.getContext.mockReturnValue(null);
    expect(() => portraitFromImage(anImage(800, 600), { x: 0, y: 0, size: 600 })).toThrow(PhotoRejectedError);
  });
});

describe("a picked file", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("is turned away when it is not a picture", async () => {
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });
    await expect(portraitFromFile(file)).rejects.toBeInstanceOf(PhotoRejectedError);
  });
});
