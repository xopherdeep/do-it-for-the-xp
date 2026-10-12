import type { Box, MeshData } from "@/components/organisms/HeroModel/voxel/mesh";
import { buildMeshData } from "@/components/organisms/HeroModel/voxel/mesh";

/** In-memory cache of generated MeshData keyed by image source URL */
const meshCache = new Map<string, MeshData>();

/** Convert RGB components to 6-digit hex color string */
const rgbToHex = (r: number, g: number, b: number): string => {
  const hex = (r << 16) | (g << 8) | b;
  return `#${hex.toString(16).padStart(6, "0")}`;
};

/**
 * Fallback procedural voxel cube for SSR/headless testing or while image loads
 */
export const createPlaceholderMonsterMesh = (color = "#9944bb"): MeshData => {
  const boxes: Box[] = [
    { x: -5, y: -4, z: -2, w: 10, h: 8, d: 4, color },
    { x: -4, y: 4, z: -1.5, w: 8, h: 4, d: 3, color },
    { x: -3, y: 0, z: 2.1, w: 2, h: 2, d: 0.2, color: "#ffffff" },
    { x: 1, y: 0, z: 2.1, w: 2, h: 2, d: 0.2, color: "#ffffff" },
    { x: -2, y: 0, z: 2.2, w: 1, h: 1, d: 0.2, color: "#000000" },
    { x: 2, y: 0, z: 2.2, w: 1, h: 1, d: 0.2, color: "#000000" },
  ];
  return buildMeshData(boxes);
};

/**
 * Convert pixel data into extruded 3D voxel boxes with horizontal run consolidation
 */
export const pixelDataToBoxes = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  depth = 1.6
): Box[] => {
  const boxes: Box[] = [];
  const halfW = width / 2;
  const halfH = height / 2;
  const halfD = depth / 2;

  for (let y = 0; y < height; y++) {
    let runStart = -1;
    let runColor = "";

    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const alpha = pixels[idx + 3];

      if (alpha > 48) {
        const hex = rgbToHex(pixels[idx], pixels[idx + 1], pixels[idx + 2]);

        if (runStart === -1) {
          runStart = x;
          runColor = hex;
        } else if (runColor !== hex) {
          // Finish previous run
          const span = x - runStart;
          boxes.push({
            x: runStart - halfW,
            y: height - y - halfH,
            z: -halfD,
            w: span,
            h: 1,
            d: depth,
            color: runColor,
          });
          runStart = x;
          runColor = hex;
        }
      } else if (runStart !== -1) {
        // Transparent pixel ends current run
        const span = x - runStart;
        boxes.push({
          x: runStart - halfW,
          y: height - y - halfH,
          z: -halfD,
          w: span,
          h: 1,
          d: depth,
          color: runColor,
        });
        runStart = -1;
        runColor = "";
      }
    }

    if (runStart !== -1) {
      const span = width - runStart;
      boxes.push({
        x: runStart - halfW,
        y: height - y - halfH,
        z: -halfD,
        w: span,
        h: 1,
        d: depth,
        color: runColor,
      });
    }
  }

  return boxes;
};

/**
 * Load an image from URL and sample its pixels onto an offscreen canvas
 */
export const sampleImagePixels = (
  imageSrc: string,
  targetResolution = 28
): Promise<{ pixels: Uint8ClampedArray; width: number; height: number } | null> => {
  return new Promise((resolve) => {
    if (typeof document === "undefined" || typeof Image === "undefined") {
      resolve(null);
      return;
    }

    const timer = setTimeout(() => resolve(null), 1500);
    const finish = (
      result: { pixels: Uint8ClampedArray; width: number; height: number } | null
    ) => {
      clearTimeout(timer);
      resolve(result);
    };

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const aspect = img.width / (img.height || 1);
        let sampleW = targetResolution;
        let sampleH = targetResolution;

        if (aspect > 1) {
          sampleH = Math.max(8, Math.round(targetResolution / aspect));
        } else {
          sampleW = Math.max(8, Math.round(targetResolution * aspect));
        }

        const canvas = document.createElement("canvas");
        canvas.width = sampleW;
        canvas.height = sampleH;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          finish(null);
          return;
        }

        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, 0, 0, sampleW, sampleH);

        const imgData = ctx.getImageData(0, 0, sampleW, sampleH);
        finish({ pixels: imgData.data, width: sampleW, height: sampleH });
      } catch {
        finish(null);
      }
    };

    img.onerror = () => finish(null);
    img.src = imageSrc;
  });
};

/**
 * Convert a 2D monster sprite URL into an extruded 3D voxel MeshData
 */
export const spriteToVoxelMesh = async (
  imageSrc: string,
  targetResolution = 26,
  depth = 1.6
): Promise<MeshData> => {
  if (meshCache.has(imageSrc)) {
    return meshCache.get(imageSrc)!;
  }

  const sample = await sampleImagePixels(imageSrc, targetResolution);
  if (!sample || sample.pixels.length === 0) {
    const placeholder = createPlaceholderMonsterMesh();
    meshCache.set(imageSrc, placeholder);
    return placeholder;
  }

  const boxes = pixelDataToBoxes(sample.pixels, sample.width, sample.height, depth);
  if (boxes.length === 0) {
    const placeholder = createPlaceholderMonsterMesh();
    meshCache.set(imageSrc, placeholder);
    return placeholder;
  }

  const meshData = buildMeshData(boxes);
  meshCache.set(imageSrc, meshData);
  return meshData;
};
