// The shape of one "Test this device" run. Types only: the runner fills it, the card shows it and
// deviceReport.ts turns it into the text the owner pastes. PRIVACY: memory only, never stored.
import type { SampleStats } from "@/lib/services/graphics/frameMeter";

// Inline until the tier module lands (VQ8), which then replaces this with its own export.
export type VoxelTier = "super" | "classic" | "pocket";

export type DeviceTestConfigId = "today" | "noMsaa" | "noMsaaDpr1" | "noMsaaDpr1Simple" | "noMsaaDpr1Flat" | "chosen";

export interface DeviceTestConfigResult {
  id: DeviceTestConfigId;
  label: string;
  /** false when this renderer setup could not open at all: the rest is then null. */
  supported: boolean;
  rendererMs: number | null;
  buildMs: number | null;
  firstRenderMs: number | null;
  /** Per-frame render plus gl.finish time. */
  work: SampleStats;
  fps: number | null;
}

export interface DeviceTestResult {
  configs: DeviceTestConfigResult[];
  /** measureHero(look).ms with no cache. */
  coldBuildMs: number | null;
  tier: VoxelTier | null;
  // Filled by the tiles, town and canvas checks (VQ4); absent means that part did not run.
  tiles?: { count: number; ms: number | null };
  town?: { count: number; ms: number | null };
  canvases?: number | null;
  aborted: boolean;
}
