// Summarises per-frame WORK times (render plus gl.finish) for the Video page's speed test.
// Pure on purpose: no timers and no clock, the runner pushes the milliseconds it measured
// and counts frames and elapsed time itself for fps.
export interface SampleStats {
  count: number;
  medianMs: number | null;
  p95Ms: number | null;
  worstMs: number | null;
}

export interface SampleMeterOptions {
  /** Samples thrown away at the start: shader compiles and first uploads are not steady state. */
  warmup?: number;
  /** Samples over this are a hidden tab or a resume, not the device. */
  maxMs?: number;
}

const MIN_SAMPLES = 5;

function percentile(sorted: number[], fraction: number): number {
  const rank = Math.ceil(sorted.length * fraction) - 1;
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank))];
}

function median(sorted: number[]): number {
  const mid = sorted.length >> 1;
  const isEven = sorted.length % 2 === 0;
  return isEven ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function createSampleMeter({ warmup = 10, maxMs = 250 }: SampleMeterOptions = {}) {
  const kept: number[] = [];
  let seen = 0;

  function push(ms: number): void {
    seen += 1;
    const isWarmup = seen <= warmup;
    const isStall = !(ms <= maxMs) || ms < 0;
    const isDropped = isWarmup || isStall;
    if (!isDropped) kept.push(ms);
  }

  function stats(): SampleStats {
    const isTooFew = kept.length < MIN_SAMPLES;
    if (isTooFew) return { count: kept.length, medianMs: null, p95Ms: null, worstMs: null };
    const sorted = [...kept].sort((a, b) => a - b);
    return { count: sorted.length, medianMs: median(sorted), p95Ms: percentile(sorted, 0.95), worstMs: sorted[sorted.length - 1] };
  }

  return { push, stats };
}
