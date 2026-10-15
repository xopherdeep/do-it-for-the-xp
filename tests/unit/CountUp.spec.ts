import { nextTick, ref } from "vue";
import { countAt, easeOutCubic, useCountUp } from "@/hooks/useCountUp";

describe("countAt", () => {
  it("starts at the old number and lands on the new one", () => {
    expect(countAt(100, 200, 0, 700)).toBe(100);
    expect(countAt(100, 200, 700, 700)).toBe(200);
    expect(countAt(100, 200, 5000, 700)).toBe(200);
  });

  it("moves most of the way early, like a counter settling", () => {
    expect(countAt(0, 100, 350, 700)).toBeGreaterThan(80);
  });

  it("counts down for a spend", () => {
    const mid = countAt(500, 300, 200, 700);
    expect(mid).toBeLessThan(500);
    expect(mid).toBeGreaterThan(300);
  });

  it("jumps when there is no time to count", () => {
    expect(countAt(1, 9, 0, 0)).toBe(9);
  });

  it("clamps the easing", () => {
    expect(easeOutCubic(-1)).toBe(0);
    expect(easeOutCubic(2)).toBe(1);
  });
});

describe("useCountUp", () => {
  it("shows the first value as it is", () => {
    const { shown, delta, pulse } = useCountUp(ref(42));
    expect(shown.value).toBe(42);
    expect(delta.value).toBe(0);
    expect(pulse.value).toBe(0);
  });

  it("records the size of each change and pulses once per change", async () => {
    const source = ref(10);
    const { delta, pulse } = useCountUp(source);
    source.value = 35;
    await nextTick();
    expect(delta.value).toBe(25);
    source.value = 5;
    await nextTick();
    expect(delta.value).toBe(-30);
    expect(pulse.value).toBe(2);
  });

  it("rolls to the new value over animation frames", async () => {
    let now = 0;
    const frames: FrameRequestCallback[] = [];
    jest.spyOn(performance, "now").mockImplementation(() => now);
    const raf = jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => frames.push(cb));
    const source = ref(0);
    const { shown } = useCountUp(source, 700);
    source.value = 100;
    await nextTick();
    now = 350;
    frames.shift()?.(now);
    expect(shown.value).toBeGreaterThan(0);
    expect(shown.value).toBeLessThan(100);
    now = 700;
    frames.shift()?.(now);
    expect(shown.value).toBe(100);
    expect(frames).toHaveLength(0);
    raf.mockRestore();
  });
});
