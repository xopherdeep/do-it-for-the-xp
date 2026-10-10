import {
  claimStudioSplash,
  resetStudioSplashForTests,
  shouldSkipSplash,
  splashDuration,
  splashTimings,
  STUDIO_SPLASH_CHIME,
} from "@/components/organisms/Splash/splash";

describe("splashTimings", () => {
  it("fades in 0.4 s, holds 1.6 s and fades out 0.5 s by default", () => {
    expect(splashTimings(false)).toEqual({ fadeIn: 400, hold: 1600, fadeOut: 500 });
    expect(splashDuration(splashTimings(false))).toBe(2500);
  });

  it("drops the fades and holds 1 s under prefers-reduced-motion", () => {
    expect(splashTimings(true)).toEqual({ fadeIn: 0, hold: 1000, fadeOut: 0 });
    expect(splashDuration(splashTimings(true))).toBe(1000);
  });

  it("uses an existing UI sound key for the chime", () => {
    expect(STUDIO_SPLASH_CHIME).toBe("alert");
  });
});

describe("shouldSkipSplash", () => {
  const fresh = { search: "", hash: "#/intro", storedFlag: null, alreadyShown: false };

  it("shows the splash on a plain first launch", () => {
    expect(shouldSkipSplash(fresh)).toBe(false);
  });

  it("skips once it has been shown this launch", () => {
    expect(shouldSkipSplash({ ...fresh, alreadyShown: true })).toBe(true);
  });

  it("skips for ?nosplash in the search or behind the hash route", () => {
    expect(shouldSkipSplash({ ...fresh, search: "?nosplash" })).toBe(true);
    expect(shouldSkipSplash({ ...fresh, search: "?debug=1&nosplash=1" })).toBe(true);
    expect(shouldSkipSplash({ ...fresh, hash: "#/intro?nosplash" })).toBe(true);
    expect(shouldSkipSplash({ ...fresh, search: "?nosplashes" })).toBe(false);
  });

  it("skips when localStorage.xpSkipSplash is exactly \"1\"", () => {
    expect(shouldSkipSplash({ ...fresh, storedFlag: "1" })).toBe(true);
    expect(shouldSkipSplash({ ...fresh, storedFlag: "0" })).toBe(false);
    expect(shouldSkipSplash({ ...fresh, storedFlag: "true" })).toBe(false);
  });
});

describe("claimStudioSplash", () => {
  beforeEach(() => {
    resetStudioSplashForTests();
    localStorage.removeItem("xpSkipSplash");
  });

  it("grants the splash once per launch", () => {
    expect(claimStudioSplash()).toBe(true);
    expect(claimStudioSplash()).toBe(false);
  });

  it("honours the localStorage flag", () => {
    localStorage.setItem("xpSkipSplash", "1");
    expect(claimStudioSplash()).toBe(false);
  });
});
