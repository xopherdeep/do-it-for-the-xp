/**
 * Pure rules for the studio splash ("Presented by Hall of the Gods, Inc.") that opens the app.
 * The component in XpStudioSplash.vue reads these; the spec in tests/unit/StudioSplash.spec.ts
 * pins them without mounting Ionic.
 */

export interface SplashTimings {
  /** Fade from black to the mark, in ms. */
  fadeIn: number;
  /** Time the mark stays fully lit, in ms. */
  hold: number;
  /** Fade back to black before the title screen, in ms. */
  fadeOut: number;
}

/** The soft Switch "Bing" (0.56 s), the gentlest single chime among the UI sound keys. */
export const STUDIO_SPLASH_CHIME = "alert";

/** The query flag and the localStorage key that suppress the splash (Cypress sets the latter). */
export const SPLASH_SKIP_QUERY = "nosplash";
export const SPLASH_SKIP_STORAGE_KEY = "xpSkipSplash";

/** Fade 0.4 s, hold 1.6 s, fade out 0.5 s; with reduced motion there is no fade and a 1 s hold. */
export function splashTimings(reducedMotion: boolean): SplashTimings {
  return reducedMotion
    ? { fadeIn: 0, hold: 1000, fadeOut: 0 }
    : { fadeIn: 400, hold: 1600, fadeOut: 500 };
}

/** Total time the splash occupies the screen when nobody skips it. */
export function splashDuration(timings: SplashTimings): number {
  return timings.fadeIn + timings.hold + timings.fadeOut;
}

export interface SplashGateInput {
  /** `window.location.search`, e.g. "?nosplash". */
  search?: string;
  /** `window.location.hash`; hash routing may carry the query there, e.g. "#/intro?nosplash". */
  hash?: string;
  /** `localStorage.xpSkipSplash`. */
  storedFlag?: string | null;
  /** Whether this page load already showed the splash. */
  alreadyShown: boolean;
}

function hasQueryFlag(query: string | undefined, flag: string): boolean {
  if (!query) return false;
  const start = query.indexOf("?");
  if (start === -1) return false;
  return query
    .slice(start + 1)
    .split("&")
    .some((pair) => pair.split("=")[0] === flag);
}

/** True when the splash should be skipped: already shown, `?nosplash`, or `localStorage.xpSkipSplash === "1"`. */
export function shouldSkipSplash(input: SplashGateInput): boolean {
  if (input.alreadyShown) return true;
  if (input.storedFlag === "1") return true;
  return hasQueryFlag(input.search, SPLASH_SKIP_QUERY) || hasQueryFlag(input.hash, SPLASH_SKIP_QUERY);
}

/* Module-level: one splash per page load. Hot reloads of the component keep this module, so a
 * reload loop while editing the splash does not replay it. */
let shownThisLaunch = false;

function readStoredFlag(): string | null {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(SPLASH_SKIP_STORAGE_KEY) : null;
  } catch {
    return null;
  }
}

/** Reads the window and decides whether to show the splash now; a true answer marks it as shown. */
export function claimStudioSplash(): boolean {
  if (typeof window === "undefined") return false;
  const skip = shouldSkipSplash({
    search: window.location.search,
    hash: window.location.hash,
    storedFlag: readStoredFlag(),
    alreadyShown: shownThisLaunch,
  });
  if (skip) return false;
  shownThisLaunch = true;
  return true;
}

/** Test seam: forget that the splash was shown. */
export function resetStudioSplashForTests(): void {
  shownThisLaunch = false;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}
