import { fastestConfig, formatReport } from "@/lib/services/graphics/deviceReport";
import type { DeviceSignals } from "@/lib/services/graphics/deviceSignals";
import type { DeviceTestConfigResult, DeviceTestResult } from "@/lib/services/graphics/deviceTestTypes";

const NOW = new Date("2026-10-28T12:00:00Z");

const signals: DeviceSignals = {
  chromeMajor: 78,
  androidMajor: 8,
  deviceMemoryGb: 2,
  cores: 4,
  dpr: 2,
  screen: { w: 360, h: 640 },
  webgl2: true,
  glRenderer: "Mali-T720",
  maxTextureSize: 4096,
  fragmentHighp: true,
  majorPerformanceCaveat: false,
};

const nothing = { count: 0, medianMs: null, p95Ms: null, worstMs: null };

function config(id: DeviceTestConfigResult["id"], medianMs: number | null, supported = true): DeviceTestConfigResult {
  return {
    id,
    label: id,
    supported,
    rendererMs: 12,
    buildMs: 30.25,
    firstRenderMs: 80,
    work: medianMs === null ? nothing : { count: 50, medianMs, p95Ms: medianMs * 2, worstMs: medianMs * 5 },
    fps: 30,
  };
}

const result: DeviceTestResult = {
  configs: [config("today", 16), config("noMsaa", 9)],
  coldBuildMs: 120,
  tier: "classic",
  tiles: { count: 12, ms: 340 },
  town: { count: 5, ms: 90 },
  canvases: 3,
  aborted: false,
};

const GOLDEN = [
  "XP video test v1 2026-10-28",
  "Tier: Classic",
  "Classic caps the hero at 30 fps",
  "Chrome: 78",
  "Android: 8",
  "Memory: 2 GB",
  "Cores: 4",
  "Pixel ratio: 2",
  "Screen: 360x640",
  "WebGL2: yes",
  "GPU: Mali-T720",
  "Max texture: 4096",
  "Fragment highp: yes",
  "Performance caveat: no",
  "today (today): renderer 12.0 ms, build 30.3 ms, first render 80.0 ms, work median 16.0 ms p95 32.0 ms worst 80.0 ms, fps 30.0",
  "noMsaa (noMsaa): renderer 12.0 ms, build 30.3 ms, first render 80.0 ms, work median 9.0 ms p95 18.0 ms worst 45.0 ms, fps 30.0",
  "Cold hero build: 120.0 ms",
  "Tiles: 12 in 340.0 ms",
  "Town: 5 in 90.0 ms",
  "Canvases: 3",
].join("\n");

describe("formatReport", () => {
  it("matches the golden text for a fixed result", () => {
    expect(formatReport(signals, result, NOW)).toBe(GOLDEN);
  });

  it("is deterministic and stays within 45 lines", () => {
    const text = formatReport(signals, result, NOW);
    expect(formatReport(signals, result, NOW)).toBe(text);
    expect(text.split("\n").length).toBeLessThanOrEqual(45);
  });

  it("prints unknown for null fields", () => {
    const blank: DeviceSignals = {
      ...signals,
      chromeMajor: null,
      deviceMemoryGb: null,
      screen: null,
      glRenderer: null,
      fragmentHighp: null,
      majorPerformanceCaveat: null,
    };
    const text = formatReport(blank, { ...result, tier: null, coldBuildMs: null, configs: [config("today", null)] }, NOW);
    expect(text).toContain("Tier: none");
    expect(text).toContain("Chrome: unknown");
    expect(text).toContain("Memory: unknown");
    expect(text).toContain("Screen: unknown");
    expect(text).toContain("GPU: unknown");
    expect(text).toContain("Fragment highp: unknown");
    expect(text).toContain("Performance caveat: unknown");
    expect(text).toContain("work median unknown p95 unknown worst unknown");
    expect(text).toContain("Cold hero build: unknown");
  });

  it("prints not run for the extras that are absent", () => {
    const { tiles: _tiles, town: _town, canvases: _canvases, ...bare } = result;
    const text = formatReport(signals, bare, NOW);
    expect(text).toContain("Tiles: not run");
    expect(text).toContain("Town: not run");
    expect(text).toContain("Canvases: not run");
  });

  it("says plainly when a config cannot draw 3D", () => {
    const text = formatReport(signals, { ...result, configs: [config("today", null, false)] }, NOW);
    expect(text).toContain("today (today): cannot draw 3D");
  });

  it("names each tier and notes the cap only for the capped ones", () => {
    const super_ = formatReport(signals, { ...result, tier: "super" }, NOW);
    expect(super_).toContain("Tier: Super");
    expect(super_).not.toContain("caps the hero");
    expect(formatReport(signals, { ...result, tier: "pocket" }, NOW)).toContain("Pocket caps the hero at 20 fps");
  });

  it("notes an aborted run", () => {
    expect(formatReport(signals, { ...result, aborted: true }, NOW)).toContain("Stopped early");
  });
});

describe("fastestConfig", () => {
  it("picks the lowest median", () => {
    expect(fastestConfig(result)).toBe("noMsaa");
  });

  it("ignores unsupported configs and configs with no median", () => {
    const configs = [config("today", 20), config("noMsaa", 1, false), config("chosen", null)];
    expect(fastestConfig({ ...result, configs })).toBe("today");
  });

  it("returns null when nothing qualifies", () => {
    expect(fastestConfig({ ...result, configs: [config("today", null, false)] })).toBeNull();
  });
});
