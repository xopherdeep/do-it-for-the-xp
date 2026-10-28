// Plain-text report of a device test, short enough to paste into a board comment.
// Pure: the caller passes the clock so the same input always gives the same text.
import type { DeviceSignals } from "@/lib/services/graphics/deviceSignals";
import type { DeviceTestConfigResult, DeviceTestResult } from "@/lib/services/graphics/deviceTestTypes";

const UNKNOWN = "unknown";
const NOT_RUN = "not run";

function num(value: number | null | undefined, unit = "", digits = 1): string {
  const isKnown = typeof value === "number" && Number.isFinite(value);
  return isKnown ? `${value.toFixed(digits)}${unit}` : UNKNOWN;
}

function whole(value: number | null): string {
  return value === null ? UNKNOWN : String(value);
}

function yesNo(value: boolean | null): string {
  const isKnown = value !== null;
  if (!isKnown) return UNKNOWN;
  return value ? "yes" : "no";
}

function signalLines(s: DeviceSignals): string[] {
  const screen = s.screen ? `${s.screen.w}x${s.screen.h}` : UNKNOWN;
  return [
    `Chrome: ${whole(s.chromeMajor)}`,
    `Android: ${whole(s.androidMajor)}`,
    `Memory: ${s.deviceMemoryGb === null ? UNKNOWN : `${s.deviceMemoryGb} GB`}`,
    `Cores: ${whole(s.cores)}`,
    `Pixel ratio: ${whole(s.dpr)}`,
    `Screen: ${screen}`,
    `WebGL2: ${yesNo(s.webgl2)}`,
    `GPU: ${s.glRenderer ?? UNKNOWN}`,
    `Max texture: ${whole(s.maxTextureSize)}`,
    `Fragment highp: ${yesNo(s.fragmentHighp)}`,
    `Performance caveat: ${yesNo(s.majorPerformanceCaveat)}`,
  ];
}

function configLine(c: DeviceTestConfigResult): string {
  const isUnsupported = !c.supported;
  if (isUnsupported) return `${c.id} (${c.label}): cannot draw 3D`;
  const { work } = c;
  return (
    `${c.id} (${c.label}): renderer ${num(c.rendererMs, " ms")}, build ${num(c.buildMs, " ms")}, ` +
    `first render ${num(c.firstRenderMs, " ms")}, work median ${num(work.medianMs, " ms")} ` +
    `p95 ${num(work.p95Ms, " ms")} worst ${num(work.worstMs, " ms")}, fps ${num(c.fps)}`
  );
}

function countLine(name: string, part: { count: number; ms: number | null } | undefined): string {
  const isMissing = !part;
  if (isMissing) return `${name}: ${NOT_RUN}`;
  return `${name}: ${part?.count} in ${num(part?.ms, " ms")}`;
}

function canvasLine(canvases: number | null | undefined): string {
  const isMissing = canvases === undefined;
  if (isMissing) return `Canvases: ${NOT_RUN}`;
  return `Canvases: ${whole(canvases)}`;
}

/** The id of the supported config with the lowest median work time, or null when none has one. */
export function fastestConfig(result: DeviceTestResult): DeviceTestConfigResult["id"] | null {
  const timed = result.configs.filter((c) => c.supported && c.work.medianMs !== null);
  const fastest = timed.reduce<DeviceTestConfigResult | null>((best, c) => {
    const isFaster = best === null || (c.work.medianMs ?? Infinity) < (best.work.medianMs ?? Infinity);
    return isFaster ? c : best;
  }, null);
  return fastest ? fastest.id : null;
}

export function formatReport(signals: DeviceSignals, result: DeviceTestResult, now: Date = new Date()): string {
  const lines = [
    `XP video test v1 ${now.toISOString().slice(0, 10)}`,
    `Tier: ${result.tier ?? "none"}`,
    ...(result.aborted ? ["Stopped early: the test did not finish"] : []),
    ...signalLines(signals),
    ...result.configs.map(configLine),
    `Cold hero build: ${num(result.coldBuildMs, " ms")}`,
    countLine("Tiles", result.tiles),
    countLine("Town", result.town),
    canvasLine(result.canvases),
  ];
  return lines.slice(0, 45).join("\n");
}
