// The two coin sounds: `coins` is one clink (a payout lands), `countCoins` is the tally that ticks while a balance rolls.
// `coins` used to be played by the Accessory Shop's ATM without existing anywhere in the fx map, so it was silent.
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

jest.mock("@/lib/utils/debug", () => ({
  __esModule: true,
  default: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock("@/lib/engine/audio/AudioEngine", () => {
  const state = { audioPermissionGranted: true, muted: false, uiVolume: 0.5, sfxVolume: 0.8, masterVolume: 0.5 };
  return { AudioEngine: { getInstance: () => ({ state }) } };
});

jest.mock("@/lib/services/feedback/soundFeel", () => ({ feelSound: jest.fn() }));

class FakeAudio {
  listeners: string[] = [];
  paused = true;
  loop = false;
  currentTime = 0;
  volume = 1;
  constructor(public src?: unknown) {}
  addEventListener(type: string) {
    this.listeners.push(type);
  }
  play = jest.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  pause = jest.fn(() => {
    this.paused = true;
  });
}

type Sounds = Record<string, any>;
type Library = { theme: { ui: string; rpg: string }; ui: Record<string, Sounds>; rpg: Record<string, Sounds> };

const realAudio = global.Audio;
let $fx: Library;
let play$fx: (fx?: string, options?: { loop?: boolean; stop?: boolean }) => void;

beforeAll(() => {
  (global as unknown as { Audio: unknown }).Audio = FakeAudio;
  $fx = require("@/assets/fx/library").default;
  play$fx = require("@/assets/fx/player").play$fx;
});

afterAll(() => {
  global.Audio = realAudio;
});

beforeEach(() => {
  jest.useFakeTimers();
  document.documentElement.setAttribute("data-user-interacted", "");
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

const coin = (key: "coins" | "countCoins"): FakeAudio => $fx.rpg[$fx.theme.rpg][key];

describe("the coin sounds in the fx map", () => {
  it("gives every RPG set a one-shot coins sound beside the countCoins tally", () => {
    for (const set of Object.values($fx.rpg)) {
      expect(set.coins).toBeInstanceOf(FakeAudio);
      expect(set.countCoins).toBeInstanceOf(FakeAudio);
    }
  });

  it("keeps the clink and the tally on separate Audio so one never cuts the other off", () => {
    expect(coin("coins")).not.toBe(coin("countCoins"));
    expect($fx.rpg.chronoTrigger.coins).toBe($fx.rpg.earthbound.coins);
    expect($fx.rpg.finalFantasy.coins).toBe($fx.rpg.earthbound.coins);
  });

  it("loops no sound by itself, coins included", () => {
    expect(coin("coins").listeners).toEqual([]);
    expect(coin("countCoins").listeners).toEqual([]);
  });
});

describe("play$fx('coins')", () => {
  it("plays one clink from the top: no loop, no timer left running", () => {
    const clink = coin("coins");
    clink.loop = true;
    clink.currentTime = 7;
    play$fx("coins");
    expect(clink.play).toHaveBeenCalledTimes(1);
    expect(clink.loop).toBe(false);
    expect(clink.currentTime).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("leaves the tally alone", () => {
    play$fx("coins");
    expect(coin("countCoins").play).not.toHaveBeenCalled();
  });
});

describe("play$fx('countCoins')", () => {
  it("ticks as a loop and stops itself, so it can never run on forever", () => {
    const tally = coin("countCoins");
    play$fx("countCoins");
    expect(tally.play).toHaveBeenCalledTimes(1);
    expect(tally.loop).toBe(true);
    jest.runOnlyPendingTimers();
    expect(tally.pause).toHaveBeenCalled();
    expect(tally.paused).toBe(true);
    expect(tally.loop).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });

  it("can be stopped early on request", () => {
    const tally = coin("countCoins");
    play$fx("countCoins");
    play$fx("countCoins", { stop: true });
    expect(tally.paused).toBe(true);
    expect(tally.loop).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe("the sound keys a screen hands to a prompt", () => {
  const sourceFiles = (dir: string, found: string[] = []): string[] => {
    readdirSync(dir).forEach((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) sourceFiles(path, found);
      else if (/\.(ts|vue)$/.test(name) && !/\.spec\.ts$/.test(name)) found.push(path);
    });
    return found;
  };

  // `sound: "no"` and `sound: isPaid ? "success" : "coins"`: the quoted keys right after the option, or after a ? or :
  const optionKeys = (): Map<string, string[]> => {
    const used = new Map<string, string[]>();
    sourceFiles(join(__dirname, "../../src")).forEach((file) => {
      // The weather presets name ambient soundscapes (rain, wind), which are not fx keys
      if (file.includes("/WeatherFX/")) return;
      const text = readFileSync(file, "utf8");
      for (const option of text.matchAll(/\bsound:\s*([^,}\n]*)/g)) {
        for (const key of option[1].matchAll(/(?:^|[?:])\s*["']([A-Za-z]+)["']/g)) {
          used.set(key[1], [...(used.get(key[1]) ?? []), file.replace(/^.*\/src\//, "src/")]);
        }
      }
    });
    return used;
  };

  it("all exist in the default sound set, so no prompt opens in silence", () => {
    const known = new Set([...Object.keys($fx.ui[$fx.theme.ui]), ...Object.keys($fx.rpg[$fx.theme.rpg])]);
    const missing = [...optionKeys()].filter(([key]) => !known.has(key)).map(([key, files]) => `${key} in ${files.join(", ")}`);
    expect(missing).toEqual([]);
  });
});
