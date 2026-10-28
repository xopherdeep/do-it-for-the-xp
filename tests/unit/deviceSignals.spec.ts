import { readDeviceSignals, type DeviceEnv } from "@/lib/services/graphics/deviceSignals";

const UA = "Mozilla/5.0 (Linux; Android 9; SM-J200) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.136 Mobile Safari/537.36";

interface GlOptions {
  debug?: boolean;
  highp?: boolean;
  loseContext?: jest.Mock;
}

interface EnvOptions {
  nav?: Record<string, unknown>;
  gl?: ReturnType<typeof fakeGl>;
  caveat?: boolean;
  throws?: boolean;
}

const PARAMS: Record<number, unknown> = { 37446: "Mali-400 MP", 3379: 4096 };

function fakeGl({ debug = true, highp = true, loseContext = jest.fn() }: GlOptions = {}) {
  const hasDebug = debug;
  const extensions: Record<string, unknown> = {
    WEBGL_lose_context: { loseContext },
    ...(hasDebug ? { WEBGL_debug_renderer_info: { UNMASKED_RENDERER_WEBGL: 37446 } } : {}),
  };
  return {
    FRAGMENT_SHADER: 35632,
    HIGH_FLOAT: 36338,
    MAX_TEXTURE_SIZE: 3379,
    getParameter: (key: number) => PARAMS[key] ?? null,
    getShaderPrecisionFormat: () => ({ precision: highp ? 23 : 0 }),
    getExtension: (name: string) => extensions[name] ?? null,
  };
}

function fakeEnv(over: EnvOptions = {}): DeviceEnv {
  const gl = over.gl ?? fakeGl();
  const nav = over.nav ?? { userAgent: UA, deviceMemory: 1, hardwareConcurrency: 4 };
  return {
    navigator: nav as unknown as Navigator,
    window: { devicePixelRatio: 2, screen: { width: 360, height: 640 } } as unknown as Window,
    createCanvas: () =>
      ({
        getContext: (kind: string, attrs?: { failIfMajorPerformanceCaveat?: boolean }) => {
          const isStrictAsk = attrs?.failIfMajorPerformanceCaveat === true;
          const isRefused = kind !== "webgl2" || (isStrictAsk && over.caveat === true);
          if (over.throws) throw new Error("no gl");
          return isRefused ? null : gl;
        },
      }) as unknown as HTMLCanvasElement,
  };
}

describe("readDeviceSignals", () => {
  it("a full fake env gives every field", () => {
    expect(readDeviceSignals(fakeEnv())).toEqual({
      chromeMajor: 74,
      androidMajor: 9,
      deviceMemoryGb: 1,
      cores: 4,
      dpr: 2,
      screen: { w: 360, h: 640 },
      webgl2: true,
      glRenderer: "Mali-400 MP",
      maxTextureSize: 4096,
      fragmentHighp: true,
      majorPerformanceCaveat: false,
    });
  });

  it("a navigator without deviceMemory gives null", () => {
    const signals = readDeviceSignals(fakeEnv({ nav: { userAgent: UA, hardwareConcurrency: 4 } }));
    expect(signals.deviceMemoryGb).toBeNull();
    expect(signals.cores).toBe(4);
  });

  it("a user agent without the tokens gives null versions", () => {
    const signals = readDeviceSignals(fakeEnv({ nav: { userAgent: "Mozilla/5.0 (X11; Linux) Firefox/120" } }));
    expect(signals.chromeMajor).toBeNull();
    expect(signals.androidMajor).toBeNull();
  });

  it("getContext throwing gives webgl2 false and no throw", () => {
    const signals = readDeviceSignals(fakeEnv({ throws: true }));
    expect(signals.webgl2).toBe(false);
    expect(signals.glRenderer).toBeNull();
    expect(signals.maxTextureSize).toBeNull();
    expect(signals.fragmentHighp).toBeNull();
  });

  it("no debug extension gives glRenderer null", () => {
    expect(readDeviceSignals(fakeEnv({ gl: fakeGl({ debug: false }) })).glRenderer).toBeNull();
  });

  it("flags a major performance caveat when only the plain context works", () => {
    expect(readDeviceSignals(fakeEnv({ caveat: true })).majorPerformanceCaveat).toBe(true);
  });

  it("reads low-precision fragment shaders", () => {
    expect(readDeviceSignals(fakeEnv({ gl: fakeGl({ highp: false }) })).fragmentHighp).toBe(false);
  });

  it("releases the probe context", () => {
    const loseContext = jest.fn();
    readDeviceSignals(fakeEnv({ gl: fakeGl({ loseContext }) }));
    expect(loseContext).toHaveBeenCalled();
  });
});
