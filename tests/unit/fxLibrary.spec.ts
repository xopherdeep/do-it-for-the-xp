// Characterization of the $fx object (src/assets/fx/library.ts and the sets it is built from) as it
// behaved when fx/index.ts was split into modules.
import { BGM_CDN, fallbackFor } from "@/lib/engine/audio/remoteBgm";

class FakeAudio {
  listeners: string[] = [];
  constructor(public src?: unknown) {}
  addEventListener(type: string) {
    this.listeners.push(type);
  }
  play() {
    return Promise.resolve();
  }
  pause() {
    /* nothing to stop */
  }
}

type Sounds = Record<string, any>;
type Library = { theme: { ui: string; rpg: string }; ui: Record<string, Sounds>; rpg: Record<string, Sounds> };

const realAudio = global.Audio;
let fx: typeof import("@/assets/fx");
let $fx: Library;

beforeAll(() => {
  (global as unknown as { Audio: unknown }).Audio = FakeAudio;
  // Each spec file gets its own module registry, so the fake is in place when the sounds are first built
  fx = require("@/assets/fx");
  $fx = fx.default as unknown as Library;
});

afterAll(() => {
  global.Audio = realAudio;
});

const soundKeys = (set: Sounds) => Object.keys(set).filter((key) => key !== "BGM" && key !== "bgm");
const allStrings = (node: unknown, found: string[] = []): string[] => {
  if (typeof node === "string") found.push(node);
  else if (Array.isArray(node)) node.forEach((child) => allStrings(child, found));
  else if (node && typeof node === "object" && !(node instanceof FakeAudio)) Object.values(node).forEach((child) => allStrings(child, found));
  return found;
};

describe("the fx entry point", () => {
  it("exports play$fx and the $fx object, nothing else", () => {
    expect(Object.keys(fx).sort()).toEqual(["default", "play$fx"]);
    expect(typeof fx.play$fx).toBe("function");
  });

  it("puts play$fx on window", () => {
    expect((window as unknown as { play$fx: unknown }).play$fx).toBe(fx.play$fx);
  });
});

describe("$fx", () => {
  it("starts on the nintendo UI sounds and the earthbound RPG sounds", () => {
    expect($fx.theme).toEqual({ ui: "nintendo", rpg: "earthbound" });
    expect(Object.keys($fx)).toEqual(["theme", "ui", "rpg"]);
    expect(Object.keys($fx.ui)).toEqual(["nintendo", "sony"]);
    expect(Object.keys($fx.rpg)).toEqual(["earthbound", "chronoTrigger", "finalFantasy"]);
  });

  it("gives the nintendo UI set its sounds", () => {
    expect(Object.keys($fx.ui.nintendo)).toEqual([
      "loading", "intro", "setup", "start", "select", "click", "klick", "noSelect", "yes", "no", "alert", "options",
      "openTask", "closeTask", "openPage", "closePage", "chooseUser", "openShop", "okdesuka", "GameBoy", "key", "useKey",
    ]);
  });

  it("gives the sony UI set its sounds", () => {
    expect(Object.keys($fx.ui.sony)).toEqual([
      "loading", "intro", "setup", "start", "select", "click", "klick", "yes", "no", "alert", "options",
      "openTask", "closeTask", "openPage", "closePage", "chooseUser", "openShop",
    ]);
  });

  it("gives every RPG set the sound keys the game plays", () => {
    const common = [
      "gp", "shhh", "openMenu", "closeMenu", "newItem", "openChest", "takeItem", "fairy", "finish", "openDoor", "key", "useKey",
      "map", "error", "enterBattle", "startBattle", "attack", "runAway", "learn", "levelUp", "gainXP", "gainGP", "fillPoints",
      "countCoins", "restoreHP", "restoreMP", "restoreAll", "useMP", "openInventory", "loot", "present", "lootItem", "dropItem",
      "bonusItem", "equip", "useItem", "buyItem", "sellItem", "cursor", "click", "text", "cursorHoriz", "cursorVerti", "step", "steps",
    ];
    for (const set of Object.values($fx.rpg)) expect(soundKeys(set)).toEqual(expect.arrayContaining(common));
    expect(soundKeys($fx.rpg.earthbound)).toEqual(
      expect.arrayContaining(["message", "preAttack", "damage", "enemyDamage", "win", "die", "enemyDie", "defeat", "okdesuka"])
    );
  });

  it("shares one Audio between the RPG sets for the sounds they have in common", () => {
    const { earthbound, chronoTrigger, finalFantasy } = $fx.rpg;
    for (const key of ["gp", "shhh", "openMenu", "closeMenu", "newItem", "openChest", "takeItem", "fairy", "finish", "openDoor", "countCoins"]) {
      expect(chronoTrigger[key]).toBe(earthbound[key]);
      expect(finalFantasy[key]).toBe(earthbound[key]);
    }
    expect(finalFantasy.step).toBe(earthbound.step);
    expect(finalFantasy.steps).toBe(earthbound.steps);
    expect(chronoTrigger.step).not.toBe(earthbound.step);
  });

  it("builds the key and map sounds fresh for each set", () => {
    expect($fx.rpg.chronoTrigger.key).not.toBe($fx.rpg.earthbound.key);
    expect($fx.ui.nintendo.key).not.toBe($fx.rpg.earthbound.key);
  });

  it("loops only the coin counter, with one listener", () => {
    const looping = new Set<FakeAudio>();
    const visit = (node: unknown) => {
      if (node instanceof FakeAudio) {
        if (node.listeners.length) looping.add(node);
      } else if (Array.isArray(node)) node.forEach(visit);
      else if (node && typeof node === "object") Object.values(node).forEach(visit);
    };
    visit($fx);
    expect([...looping]).toEqual([$fx.rpg.earthbound.countCoins]);
    expect($fx.rpg.earthbound.countCoins.listeners).toEqual(["ended"]);
  });
});

describe("$fx.rpg.earthbound.BGM", () => {
  const bgm = () => $fx.rpg.earthbound.BGM as Sounds;

  it("has a slot for every screen the music guard asks for", () => {
    expect(Object.keys(bgm())).toEqual(
      expect.arrayContaining(["intro", "startScreen", "home", "hometown", "battle", "win", "winboss", "world", "worlds", "hotel", "hospital", "shop", "dungeon", "temples", "boss", "gameover"])
    );
  });

  it("has one theme per temple, with the dungeon slot for the rest", () => {
    expect(Object.keys(bgm().temples)).toEqual(
      expect.arrayContaining(["wind-temple", "earth-temple", "water-temple", "fire-temple", "ice-temple", "light-temple", "shadow-temple", "moon-temple", "storm-temple"])
    );
    expect(bgm().dungeon.length).toBeGreaterThan(0);
  });

  it("has terrain slots for every region of the world map", () => {
    expect(Object.keys(bgm().worlds.terrains)).toEqual(
      expect.arrayContaining(["plains", "snow", "sands", "swamp", "mountains", "forest", "islands", "moon", "clouds", "dungeon"])
    );
  });

  it("points every produced song at the bucket and remembers its chiptune fallback", () => {
    const songs = allStrings(bgm()).filter((url) => url.startsWith(BGM_CDN));
    expect(songs.length).toBeGreaterThan(50);
    for (const url of songs) expect(fallbackFor(url)).toBeDefined();
  });

  it("keeps the legacy online lists as plain starmen.net URLs", () => {
    expect(bgm().battleOnline.length).toBeGreaterThan(0);
    for (const url of bgm().battleOnline as string[]) expect(url).toMatch(/^https:\/\/starmen\.net\//);
  });
});
