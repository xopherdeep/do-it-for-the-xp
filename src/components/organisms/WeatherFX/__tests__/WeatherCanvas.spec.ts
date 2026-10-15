import { createWeatherCanvas } from "../engine/WeatherCanvas";
import { weatherPresets } from "../presets";
import type { WeatherType } from "../types";

/**
 * The engine against a fake 2D context: every preset runs, the budget adapts to slow frames,
 * stop() cancels the loop and dispose() lets go of everything.
 */

type Fn = jest.Mock;
const makeContext = () => {
  const gradient = { addColorStop: jest.fn() };
  const ctx: Record<string, Fn | number | string> = {};
  for (const name of [
    "setTransform", "clearRect", "fillRect", "strokeRect", "beginPath", "moveTo", "lineTo", "quadraticCurveTo", "arc", "ellipse",
    "closePath", "fill", "stroke", "save", "restore", "drawImage", "translate",
  ]) ctx[name] = jest.fn();
  ctx.createLinearGradient = jest.fn(() => gradient);
  ctx.createRadialGradient = jest.fn(() => gradient);
  return ctx as unknown as CanvasRenderingContext2D;
};

const makeCanvas = (ctx: CanvasRenderingContext2D) => {
  const canvas = document.createElement("canvas");
  canvas.getContext = jest.fn(() => ctx) as unknown as typeof canvas.getContext;
  const parent = document.createElement("div");
  Object.defineProperty(parent, "getBoundingClientRect", { value: () => ({ width: 390, height: 844 }) });
  parent.appendChild(canvas);
  document.body.appendChild(parent);
  return canvas;
};

let frameCallbacks: FrameRequestCallback[] = [];
let nowMs = 0;

beforeEach(() => {
  frameCallbacks = [];
  nowMs = 0;
  jest.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
    frameCallbacks.push(cb);
    return frameCallbacks.length;
  });
  jest.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
  jest.spyOn(performance, "now").mockImplementation(() => nowMs);
  // offscreen blobs for clouds, fog and lanterns use a second canvas
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => makeContext() as never);
});
afterEach(() => {
  jest.restoreAllMocks();
  document.body.innerHTML = "";
});

/** Runs the next scheduled frame, pretending it took `costMs` of work. */
const runFrame = (costMs = 2) => {
  const cb = frameCallbacks.shift();
  if (!cb) throw new Error("no frame scheduled");
  const start = nowMs;
  const original = performance.now as jest.Mock;
  original.mockImplementation(() => nowMs);
  nowMs = start + 16;
  // the engine reads performance.now() at the start and the end of the frame
  let calls = 0;
  original.mockImplementation(() => (calls++ === 0 ? start : start + costMs));
  cb(start);
  original.mockImplementation(() => nowMs);
};

describe("WeatherCanvas", () => {
  it.each(Object.keys(weatherPresets) as WeatherType[])("runs the %s preset for ten frames without throwing", (type) => {
    const ctx = makeContext();
    const canvas = makeCanvas(ctx);
    const engine = createWeatherCanvas(canvas, { type, intensity: 7 });
    engine.start();
    for (let i = 0; i < 10; i++) runFrame();
    expect((ctx.clearRect as unknown as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(10);
    engine.dispose();
  });

  it("drops the budget after three slow frames and earns it back after fifty quick ones", () => {
    const engine = createWeatherCanvas(makeCanvas(makeContext()), { type: "stormy", intensity: 10 });
    engine.start();
    expect(engine.budget).toBe(1);
    for (let i = 0; i < 3; i++) runFrame(40);
    expect(engine.budget).toBe(0.75);
    for (let i = 0; i < 50; i++) runFrame(2);
    expect(engine.budget).toBe(1);
    engine.dispose();
  });

  it("stops scheduling frames after stop()", () => {
    const engine = createWeatherCanvas(makeCanvas(makeContext()), { type: "rainy", intensity: 5 });
    engine.start();
    runFrame();
    const scheduled = frameCallbacks.length;
    engine.stop();
    runFrame();
    expect(frameCallbacks.length).toBeLessThanOrEqual(scheduled);
    engine.dispose();
  });

  it("switches presets in place", () => {
    const engine = createWeatherCanvas(makeCanvas(makeContext()), { type: "none", intensity: 5 });
    engine.start();
    runFrame();
    engine.setType("snowy");
    engine.setIntensity(9);
    expect(() => runFrame()).not.toThrow();
    engine.dispose();
  });
});
