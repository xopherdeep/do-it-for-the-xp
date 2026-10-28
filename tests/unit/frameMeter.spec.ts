import { createSampleMeter } from "@/lib/services/graphics/frameMeter";

const feed = (meter: ReturnType<typeof createSampleMeter>, samples: number[]) => samples.forEach((ms) => meter.push(ms));

describe("createSampleMeter", () => {
  it("steady 8 ms samples give a median of 8", () => {
    const meter = createSampleMeter();
    feed(meter, Array(60).fill(8));
    expect(meter.stats()).toEqual({ count: 50, medianMs: 8, p95Ms: 8, worstMs: 8 });
  });

  it("a 40 ms spike moves p95 and worst but not the median", () => {
    const meter = createSampleMeter({ warmup: 0 });
    feed(meter, [...Array(90).fill(8), ...Array(10).fill(40)]);
    const stats = meter.stats();
    expect(stats.medianMs).toBe(8);
    expect(stats.p95Ms).toBe(40);
    expect(stats.worstMs).toBe(40);
  });

  it("drops the warm-up samples", () => {
    const meter = createSampleMeter({ warmup: 3 });
    feed(meter, [100, 100, 100, 8, 8, 8, 8, 8]);
    expect(meter.stats()).toEqual({ count: 5, medianMs: 8, p95Ms: 8, worstMs: 8 });
  });

  it("drops samples over the maximum (hidden tab or resume)", () => {
    const meter = createSampleMeter({ warmup: 0, maxMs: 250 });
    feed(meter, [8, 8, 8, 8, 8, 900, 251]);
    expect(meter.stats().count).toBe(5);
    expect(meter.stats().worstMs).toBe(8);
  });

  it("keeps a sample exactly at the maximum", () => {
    const meter = createSampleMeter({ warmup: 0, maxMs: 250 });
    feed(meter, [8, 8, 8, 8, 250]);
    expect(meter.stats().worstMs).toBe(250);
  });

  it("gives null fields under 5 samples", () => {
    const meter = createSampleMeter({ warmup: 0 });
    feed(meter, [8, 8, 8, 8]);
    expect(meter.stats()).toEqual({ count: 4, medianMs: null, p95Ms: null, worstMs: null });
  });

  it("warm-up samples do not count toward the 5", () => {
    const meter = createSampleMeter();
    feed(meter, Array(12).fill(8));
    expect(meter.stats().medianMs).toBeNull();
  });
});
