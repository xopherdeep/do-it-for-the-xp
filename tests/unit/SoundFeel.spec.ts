// The town's reward sounds buzz with them, every sound key a screen plays exists, and the battle obeys the Vibration switch.
import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

jest.mock("@capacitor/haptics", () => ({
  Haptics: { impact: jest.fn().mockResolvedValue(undefined), notification: jest.fn().mockResolvedValue(undefined) },
  ImpactStyle: { Light: "LIGHT", Medium: "MEDIUM", Heavy: "HEAVY" },
  NotificationType: { Success: "SUCCESS", Warning: "WARNING", Error: "ERROR" },
}));

import { Haptics } from "@capacitor/haptics";
import { HAPTICS_KEY } from "@/lib/services/feedback/haptics";
import { SOUND_FEELS, feelForSound, feelSound } from "@/lib/services/feedback/soundFeel";
import { useBattleFeedback } from "@/app/Console/BattleField/composables/useBattleFeedback";

class FakeAudio {
  constructor(public src?: unknown) {}
  addEventListener() {
    /* no events in jsdom */
  }
  play() {
    return Promise.resolve();
  }
  pause() {
    /* nothing to stop */
  }
}

const impact = Haptics.impact as jest.Mock;
const notification = Haptics.notification as jest.Mock;

beforeEach(() => {
  impact.mockClear();
  notification.mockClear();
  localStorage.removeItem(HAPTICS_KEY);
});

describe("feelSound", () => {
  it("buzzes for a purchase and a heal", () => {
    feelSound("buyItem");
    feelSound("restoreHP");
    expect(impact).toHaveBeenCalledWith({ style: "MEDIUM" });
    expect(notification).toHaveBeenCalledWith({ type: "SUCCESS" });
  });

  it("stays still for menu sounds and for the sounds that bring their own rumble", () => {
    ["select", "cursor", "no", "win", "levelUp", "openChest", "openDoor"].forEach((sound) => feelSound(sound));
    expect(impact).not.toHaveBeenCalled();
    expect(notification).not.toHaveBeenCalled();
  });

  it("never buzzes for a loop or a stop", () => {
    feelSound("countCoins", { loop: true });
    feelSound("countCoins", { stop: true });
    expect(impact).not.toHaveBeenCalled();
  });

  it("obeys the Vibration switch", () => {
    localStorage.setItem(HAPTICS_KEY, "off");
    feelSound("buyItem");
    expect(impact).not.toHaveBeenCalled();
  });

  it("does not treat object keys as sounds", () => {
    expect(feelForSound("toString")).toBeUndefined();
  });
});

describe("the battle's buzzes", () => {
  // The composable registers an unmount hook; outside a component Vue only warns about it
  beforeEach(() => jest.spyOn(console, "warn").mockImplementation(() => undefined));
  afterEach(() => (console.warn as jest.Mock).mockRestore());

  it("go quiet when Vibration is off in Settings", () => {
    localStorage.setItem(HAPTICS_KEY, "off");
    const feedback = useBattleFeedback();
    feedback.heroHit();
    feedback.beastHit();
    feedback.victory();
    expect(impact).not.toHaveBeenCalled();
    expect(notification).not.toHaveBeenCalled();
  });

  it("buzz when Vibration is on", () => {
    const feedback = useBattleFeedback();
    feedback.heroHit();
    feedback.victory();
    expect(impact).toHaveBeenCalledWith({ style: "HEAVY" });
    expect(notification).toHaveBeenCalledWith({ type: "SUCCESS" });
  });
});

describe("the sound keys the screens play", () => {
  type Sounds = Record<string, unknown>;
  let library: { theme: { ui: string; rpg: string }; ui: Record<string, Sounds>; rpg: Record<string, Sounds> };
  const realAudio = global.Audio;

  beforeAll(() => {
    (global as unknown as { Audio: unknown }).Audio = FakeAudio;
    library = require("@/assets/fx/library").default;
  });

  afterAll(() => {
    global.Audio = realAudio;
  });

  const sourceFiles = (dir: string, found: string[] = []): string[] => {
    readdirSync(dir).forEach((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) sourceFiles(path, found);
      else if (/\.(ts|vue)$/.test(name) && !/\.spec\.ts$/.test(name)) found.push(path);
    });
    return found;
  };

  const playedKeys = (): Set<string> => {
    const keys = new Set<string>();
    sourceFiles(join(__dirname, "../../src")).forEach((file) => {
      const text = readFileSync(file, "utf8");
      for (const match of text.matchAll(/play\$fx\(\s*["']([A-Za-z]+)["']/g)) keys.add(match[1]);
    });
    return keys;
  };

  it("all exist in the default sound set, so no tap is silent", () => {
    const known = new Set([
      ...Object.keys(library.ui[library.theme.ui]),
      ...Object.keys(library.rpg[library.theme.rpg]),
    ]);
    const missing = [...playedKeys()].filter((key) => !known.has(key));
    expect(missing).toEqual([]);
  });

  it("include every sound that carries a feel", () => {
    const known = new Set(Object.keys(library.rpg[library.theme.rpg]));
    expect(Object.keys(SOUND_FEELS).filter((key) => !known.has(key))).toEqual([]);
  });
});
