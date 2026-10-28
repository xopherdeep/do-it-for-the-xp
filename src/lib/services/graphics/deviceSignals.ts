// What this device tells us about itself, for the Video page's "Test this device" and Auto.
// PRIVACY: the GPU renderer string and exact memory are fingerprint-grade. Keep the result in
// memory only: never storage, never analytics. The player sees it and shares it by tapping Share.
// Every signal is read on its own and is null when the browser will not say.
export interface DeviceSignals {
  chromeMajor: number | null;
  androidMajor: number | null;
  deviceMemoryGb: number | null;
  cores: number | null;
  dpr: number | null;
  screen: { w: number; h: number } | null;
  /** three creates only a webgl2 context, so false means no voxels at all. */
  webgl2: boolean;
  glRenderer: string | null;
  maxTextureSize: number | null;
  fragmentHighp: boolean | null;
  majorPerformanceCaveat: boolean | null;
}

export interface DeviceEnv {
  navigator: Navigator;
  window: Window;
  createCanvas: () => HTMLCanvasElement;
}

type Gl = WebGL2RenderingContext;

const UNMASKED_RENDERER_WEBGL = 0x9246;

export function defaultEnv(): DeviceEnv {
  return { navigator, window, createCanvas: () => document.createElement("canvas") };
}

function finiteOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function uaMajor(env: DeviceEnv, pattern: RegExp): number | null {
  try {
    const match = pattern.exec(env.navigator.userAgent);
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

function readNumber(read: () => unknown): number | null {
  try {
    return finiteOrNull(read());
  } catch {
    return null;
  }
}

function readScreen(env: DeviceEnv): DeviceSignals["screen"] {
  try {
    const { width, height } = env.window.screen;
    return typeof width === "number" && typeof height === "number" ? { w: width, h: height } : null;
  } catch {
    return null;
  }
}

function openGl(env: DeviceEnv, attrs?: WebGLContextAttributes): Gl | null {
  try {
    return (env.createCanvas().getContext("webgl2", attrs) as Gl | null) ?? null;
  } catch {
    return null;
  }
}

function readRenderer(gl: Gl): string | null {
  try {
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    if (!info) return null;
    const value = gl.getParameter(info.UNMASKED_RENDERER_WEBGL ?? UNMASKED_RENDERER_WEBGL);
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

function readHighp(gl: Gl): boolean | null {
  try {
    const format = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    return format ? format.precision > 0 : null;
  } catch {
    return null;
  }
}

function release(gl: Gl): void {
  try {
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    // chemx-allow: best-effort a context that will not let go is left to the garbage collector
    return undefined;
  }
}

export function readDeviceSignals(env: DeviceEnv = defaultEnv()): DeviceSignals {
  const gl = openGl(env);
  const signals: DeviceSignals = {
    chromeMajor: uaMajor(env, /Chrome\/(\d+)/),
    androidMajor: uaMajor(env, /Android (\d+)/),
    deviceMemoryGb: readNumber(() => (env.navigator as Navigator & { deviceMemory?: number }).deviceMemory),
    cores: readNumber(() => env.navigator.hardwareConcurrency),
    dpr: readNumber(() => env.window.devicePixelRatio),
    screen: readScreen(env),
    webgl2: gl !== null,
    glRenderer: gl ? readRenderer(gl) : null,
    maxTextureSize: gl ? readNumber(() => gl.getParameter(gl.MAX_TEXTURE_SIZE)) : null,
    fragmentHighp: gl ? readHighp(gl) : null,
    majorPerformanceCaveat: null,
  };
  if (gl) release(gl);
  // The strict context opens only after the plain one is released: a phone that holds few contexts must not
  // read as a slow GPU just because two were open at once
  const strict = gl ? openGl(env, { failIfMajorPerformanceCaveat: true }) : null;
  if (gl) signals.majorPerformanceCaveat = strict === null;
  if (strict) release(strict);
  return signals;
}
