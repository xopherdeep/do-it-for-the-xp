/**
 * The pictures a temple needs before the hero walks in: one painted floor per maze cell
 * (src/assets/images/backgrounds/<temple>/[row,col].webp). They are fetched and decoded ahead of time,
 * so a room never slides in as a bare floor that fills in a moment later.
 *
 * Each picture is fetched once per app run: the world map warms a temple while its door is on screen,
 * and the temple screen waits on the same promises, so nothing is fetched twice.
 */

type ImageContext = {
  keys: () => string[];
  (key: string): unknown;
};

let floorContext: ImageContext | null | undefined;

function getFloorContext(): ImageContext | null {
  const isContextRead = floorContext !== undefined;
  if (isContextRead) return floorContext ?? null;
  try {
    floorContext = require.context(
      "@/assets/images/backgrounds",
      true,
      /^\.\/[a-z-]+\/\[\d+,\d+\]\.webp$/
    ) as unknown as ImageContext;
  } catch {
    floorContext = null;
  }
  return floorContext;
}

function moduleToUrl(mod: unknown): string {
  const isUrl = typeof mod === "string";
  if (isUrl) return mod;
  const value = mod && typeof mod === "object" ? (mod as { default?: unknown }).default : undefined;
  return typeof value === "string" ? value : "";
}

const CELL = /\[(\d+),(\d+)\]\.webp$/;

/** The cell a floor picture belongs to, read from its file name. */
const cellOf = (key: string): [number, number] | null => {
  const match = CELL.exec(key);
  return match ? [Number(match[1]), Number(match[2])] : null;
};

/**
 * The floor pictures of a temple (their file keys), nearest to `near` first: the room the hero stands in, then its
 * neighbours, so the rooms the hero sees first are the first ones ready. A temple without painted floors has none.
 */
export function templeFloorKeys(temple: string, near: [number, number] = [0, 0]): string[] {
  const context = getFloorContext();
  const hasNoFloors = !context || !temple;
  if (hasNoFloors) return [];
  const prefix = `./${temple}/`;
  const distance = (key: string) => {
    const cell = cellOf(key);
    return cell ? Math.abs(cell[0] - near[0]) + Math.abs(cell[1] - near[1]) : Infinity;
  };
  return context
    .keys()
    .filter((key) => key.startsWith(prefix))
    .sort((a, b) => distance(a) - distance(b));
}

/** The floor pictures' URLs, in the same order as templeFloorKeys. */
export function templeFloorUrls(temple: string, near: [number, number] = [0, 0]): string[] {
  const context = getFloorContext();
  if (!context) return [];
  return templeFloorKeys(temple, near)
    .map((key) => moduleToUrl(context(key)))
    .filter(Boolean);
}

/** Fetches and decodes one picture. A broken picture counts as done: the room keeps its drawn floor. */
export type ImageLoader = (url: string) => Promise<void>;

const browserLoader: ImageLoader = (url) =>
  new Promise<void>((resolve) => {
    const img = new Image();
    const finish = () => resolve();
    img.onload = () => {
      // decode() keeps the first paint from stalling on a big picture; older webviews lack it
      const decoded = typeof img.decode === "function" ? img.decode() : Promise.resolve();
      decoded.then(finish, finish);
    };
    img.onerror = finish;
    img.src = url;
  });

const loaded = new Map<string, Promise<void>>();

/** Loads a picture once per app run; later calls share the first fetch. */
function loadOnce(url: string, loader: ImageLoader): Promise<void> {
  let pending = loaded.get(url);
  if (!pending) {
    pending = loader(url).catch(() => undefined);
    loaded.set(url, pending);
  }
  return pending;
}

export interface PreloadOptions {
  /** Called with (done, total) as each picture lands. */
  onProgress?: (done: number, total: number) => void;
  /** Gives up waiting after this long (the pictures keep loading); a slow network never locks the hero out. */
  timeoutMs?: number;
  loader?: ImageLoader;
}

/** Resolves once every picture is loaded (or broken), or when the time runs out, whichever comes first. */
export function preloadImages(urls: string[], options: PreloadOptions = {}): Promise<void> {
  const { onProgress, timeoutMs = 12000, loader = browserLoader } = options;
  const unique = [...new Set(urls)];
  const total = unique.length;
  let done = 0;
  onProgress?.(done, total);
  const isNothingToLoad = total === 0;
  if (isNothingToLoad) return Promise.resolve();
  const all = Promise.all(
    unique.map((url) =>
      loadOnce(url, loader).then(() => {
        done += 1;
        onProgress?.(done, total);
      })
    )
  ).then(() => undefined);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<void>((resolve) => {
    timer = setTimeout(resolve, timeoutMs);
  });
  return Promise.race([all, timeout]).finally(() => clearTimeout(timer));
}

/** Whether every one of these pictures has already been fetched this run. */
export function areImagesLoaded(urls: string[]): boolean {
  return urls.every((url) => loaded.has(url));
}

/** Starts fetching a temple's floors in the background, for a temple whose door is on screen. */
export function prefetchTemple(temple: string, loader?: ImageLoader): void {
  const urls = templeFloorUrls(temple);
  const hasNoFloors = urls.length === 0;
  if (hasNoFloors) return;
  void preloadImages(urls, { loader, timeoutMs: 60000 });
}

/** For tests: forget what was loaded. */
export function resetTempleAssetCache(): void {
  loaded.clear();
}
