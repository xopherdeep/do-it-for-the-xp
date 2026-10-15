import { preloadImages, prefetchTemple, resetTempleAssetCache, templeFloorKeys, templeFloorUrls } from "@/lib/services/temples/templeAssets";

describe("temple floor pictures", () => {
  beforeEach(() => resetTempleAssetCache());

  it("lists a shipped temple's painted floors, the hero's room first", () => {
    const keys = templeFloorKeys("wind-temple", [2, 2]);
    expect(keys.length).toBeGreaterThan(10);
    expect(keys[0]).toBe("./wind-temple/[2,2].webp");
    expect(keys.every((key) => key.startsWith("./wind-temple/"))).toBe(true);
  });

  it("lists nothing for a temple without painted floors", () => {
    expect(templeFloorKeys("moving-house")).toEqual([]);
    expect(templeFloorUrls("")).toEqual([]);
  });

  it("reports progress and fetches each picture once", async () => {
    const loader = jest.fn(() => Promise.resolve());
    const progress: Array<[number, number]> = [];
    await preloadImages(["a", "b", "a"], { loader, onProgress: (done, total) => progress.push([done, total]) });
    expect(loader).toHaveBeenCalledTimes(2);
    expect(progress).toEqual([[0, 2], [1, 2], [2, 2]]);
    await preloadImages(["a", "b"], { loader });
    expect(loader).toHaveBeenCalledTimes(2);
  });

  it("counts a broken picture as done", async () => {
    const loader = jest.fn(() => Promise.reject(new Error("404")));
    await expect(preloadImages(["x"], { loader })).resolves.toBeUndefined();
  });

  it("stops waiting when the time runs out", async () => {
    jest.useFakeTimers();
    const pending = preloadImages(["slow"], { loader: () => new Promise(() => undefined), timeoutMs: 50 });
    jest.advanceTimersByTime(60);
    await expect(pending).resolves.toBeUndefined();
    jest.useRealTimers();
  });

  it("does nothing to warm a temple without painted floors", () => {
    const loader = jest.fn(() => Promise.resolve());
    prefetchTemple("moving-house", loader);
    expect(loader).not.toHaveBeenCalled();
  });
});
