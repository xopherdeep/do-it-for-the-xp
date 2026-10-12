// Characterization of src/assets/fx/player.ts as it behaved when it was split out of fx/index.ts.
jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("@/lib/engine/audio/AudioEngine", () => {
  const state = { audioPermissionGranted: true, muted: false, uiVolume: 0.5, sfxVolume: 0.8, masterVolume: 0.5 };
  return { AudioEngine: { getInstance: () => ({ state }) } };
});

jest.mock("@/assets/fx/library", () => {
  const sound = () => ({
    volume: 1,
    currentTime: 9,
    loop: true,
    paused: true,
    play: jest.fn(() => Promise.resolve()),
    pause: jest.fn(),
  });
  return {
    __esModule: true,
    default: {
      theme: { ui: "nintendo", rpg: "earthbound" },
      ui: { nintendo: { select: sound(), setup: sound(), loading: sound() }, sony: {} },
      rpg: { earthbound: { attack: sound(), music: sound() }, chronoTrigger: {}, finalFantasy: {} },
    },
  };
});

import debug from "@/lib/utils/debug";
import { AudioEngine } from "@/lib/engine/audio/AudioEngine";
import $fx from "@/assets/fx/library";
import { isAutoplayBlocked, play$fx } from "@/assets/fx/player";

const engineState = () => AudioEngine.getInstance().state;
const uiSound = (key: string) => (($fx.ui.nintendo as unknown) as Record<string, any>)[key];
const rpgSound = (key: string) => (($fx.rpg.earthbound as unknown) as Record<string, any>)[key];
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("isAutoplayBlocked", () => {
  it("is true for a NotAllowedError", () => {
    expect(isAutoplayBlocked({ name: "NotAllowedError" })).toBe(true);
  });

  it("is true when the message talks about interaction or user activation", () => {
    expect(isAutoplayBlocked({ message: "play() failed: needs user interact first" })).toBe(true);
    expect(isAutoplayBlocked({ message: "blocked: no user activation" })).toBe(true);
  });

  it("is false for anything else", () => {
    expect(isAutoplayBlocked({ name: "NotSupportedError", message: "no supported sources" })).toBe(false);
    expect(isAutoplayBlocked({})).toBe(false);
  });
});

describe("play$fx", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(engineState(), { audioPermissionGranted: true, muted: false });
    document.documentElement.removeAttribute("data-user-interacted");
    window.history.pushState({}, "", "/");
    for (const key of ["select", "setup", "loading"]) Object.assign(uiSound(key), { volume: 1, currentTime: 9, loop: true, paused: true });
    for (const key of ["attack", "music"]) Object.assign(rpgSound(key), { volume: 1, currentTime: 9, loop: true, paused: true });
  });

  it("plays a UI sound from the start at the UI volume times the master volume", () => {
    play$fx("select");
    expect(uiSound("select").volume).toBe(0.25);
    expect(uiSound("select").currentTime).toBe(0);
    expect(uiSound("select").play).toHaveBeenCalledTimes(1);
  });

  it("defaults to the select sound", () => {
    play$fx();
    expect(uiSound("select").play).toHaveBeenCalledTimes(1);
  });

  it("plays the setup sound instead of loading inside the compendium", () => {
    window.history.pushState({}, "", "/game-master/compendium");
    play$fx("loading");
    expect(uiSound("setup").play).toHaveBeenCalledTimes(1);
    expect(uiSound("loading").play).not.toHaveBeenCalled();
  });

  it("plays loading as loading anywhere else", () => {
    play$fx("loading");
    expect(uiSound("loading").play).toHaveBeenCalledTimes(1);
    expect(uiSound("setup").play).not.toHaveBeenCalled();
  });

  it("is silent while muted but still plays", () => {
    engineState().muted = true;
    play$fx("select");
    expect(uiSound("select").volume).toBe(0);
    expect(uiSound("select").play).toHaveBeenCalledTimes(1);
  });

  it("skips playing until the engine has permission or the page was touched", () => {
    engineState().audioPermissionGranted = false;
    play$fx("select");
    expect(uiSound("select").play).not.toHaveBeenCalled();
    expect(debug.log).toHaveBeenCalledWith("Skipping UI sound playback due to lack of permission");

    document.documentElement.setAttribute("data-user-interacted", "");
    play$fx("select");
    expect(uiSound("select").play).toHaveBeenCalledTimes(1);
  });

  it("revokes the permission when the browser blocks a UI sound", async () => {
    uiSound("select").play.mockReturnValueOnce(Promise.reject({ name: "NotAllowedError" }));
    play$fx("select");
    await flush();
    expect(engineState().audioPermissionGranted).toBe(false);
    expect(debug.warn).toHaveBeenCalledWith("UI Sound playback was prevented:", { name: "NotAllowedError" });
  });

  it("falls through to the RPG set at the sfx volume, one shot, not looping", () => {
    play$fx("attack");
    expect(rpgSound("attack").volume).toBe(0.4);
    expect(rpgSound("attack").currentTime).toBe(0);
    expect(rpgSound("attack").loop).toBe(false);
    expect(rpgSound("attack").play).toHaveBeenCalledTimes(1);
    expect(uiSound("select").play).not.toHaveBeenCalled();
  });

  it("stops an RPG sound and rewinds it", () => {
    play$fx("music", { stop: true });
    expect(rpgSound("music").pause).toHaveBeenCalledTimes(1);
    expect(rpgSound("music").currentTime).toBe(0);
    expect(rpgSound("music").loop).toBe(false);
    expect(rpgSound("music").play).not.toHaveBeenCalled();
  });

  it("loops an RPG sound only when it is not already playing", () => {
    play$fx("music", { loop: true });
    expect(rpgSound("music").loop).toBe(true);
    expect(rpgSound("music").play).toHaveBeenCalledTimes(1);
    expect(rpgSound("music").currentTime).toBe(9);

    rpgSound("music").paused = false;
    play$fx("music", { loop: true });
    expect(rpgSound("music").play).toHaveBeenCalledTimes(1);
  });

  it("does nothing for an unknown key", () => {
    expect(() => play$fx("no-such-sound")).not.toThrow();
    expect(uiSound("select").play).not.toHaveBeenCalled();
    expect(rpgSound("attack").play).not.toHaveBeenCalled();
  });

  it("does not play an RPG sound without permission", () => {
    engineState().audioPermissionGranted = false;
    play$fx("attack");
    expect(rpgSound("attack").play).not.toHaveBeenCalled();
  });

  it("revokes the permission when the browser blocks an RPG sound, but not for unsupported sources", async () => {
    rpgSound("attack").play.mockReturnValueOnce(Promise.reject({ name: "NotAllowedError" }));
    play$fx("attack");
    await flush();
    expect(engineState().audioPermissionGranted).toBe(false);

    engineState().audioPermissionGranted = true;
    rpgSound("attack").play.mockReturnValueOnce(Promise.reject({ name: "NotSupportedError" }));
    play$fx("attack");
    await flush();
    expect(engineState().audioPermissionGranted).toBe(true);
  });

  it("stays quiet about an unsupported looping sound and warns about other loop failures", async () => {
    rpgSound("music").play.mockReturnValueOnce(Promise.reject({ name: "NotSupportedError" }));
    play$fx("music", { loop: true });
    await flush();
    expect(debug.warn).not.toHaveBeenCalled();

    rpgSound("music").play.mockReturnValueOnce(Promise.reject({ name: "AbortError" }));
    play$fx("music", { loop: true });
    await flush();
    expect(debug.warn).toHaveBeenCalledWith("RPG Sound loop playback was prevented:", { name: "AbortError" });
  });
});
