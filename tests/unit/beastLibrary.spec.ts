import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { CLASSIC_BEASTS } from "@/lib/services/core/classicBeasts";
import { STARTER_BEASTS, STARTER_QUESTS } from "@/lib/services/core/StarterWorld";
import { TOTAL_BEAST_AVATARS } from "@/lib/services/battle/BestiaryService";
import { getAllWorlds } from "@/lib/engine/core/worldRegistry";
import { TEMPLE_THEME_KEYS, isTempleTheme } from "@/lib/services/temples/templeThemes";
import { readFileSync } from "fs";
import { join } from "path";

const count = <T>(items: T[], key: (item: T) => string) =>
  items.reduce<Record<string, number>>((acc, item) => ({ ...acc, [key(item)]: (acc[key(item)] ?? 0) + 1 }), {});

describe("the beast library", () => {
  it("holds a hundred chores, ten per region element, with distinct ids, names and portraits", () => {
    expect(BEAST_LIBRARY).toHaveLength(100);
    expect(new Set(BEAST_LIBRARY.map((b) => b.id)).size).toBe(100);
    expect(new Set(BEAST_LIBRARY.map((b) => b.name)).size).toBe(100);
    expect(new Set(BEAST_LIBRARY.map((b) => b.avatar)).size).toBe(100);
    const perElement = count(BEAST_LIBRARY, (b) => b.element ?? "");
    expect(Object.keys(perElement)).toHaveLength(10);
    expect(Object.values(perElement).every((n) => n === 10)).toBe(true);
    const known = new Set(getAllWorlds().map((world) => world.element));
    expect(Object.keys(perElement).every((element) => known.has(element))).toBe(true);
  });

  it("gives every beast a task list of three or more steps, a chore and a portrait that exists", () => {
    for (const beast of BEAST_LIBRARY) {
      expect(beast.checklist.length).toBeGreaterThanOrEqual(3);
      expect(beast.chore).toBeTruthy();
      expect(["little", "kid", "teen"]).toContain(beast.age);
      expect(beast.avatar).toBeGreaterThanOrEqual(1);
      expect(beast.avatar).toBeLessThanOrEqual(TOTAL_BEAST_AVATARS);
    }
  });

  it("seeds the whole library and the classic beasts into the starter world as plain beasts the quests can still find", () => {
    expect(STARTER_BEASTS).toHaveLength(BEAST_LIBRARY.length + CLASSIC_BEASTS.length);
    expect(STARTER_BEASTS.slice(0, BEAST_LIBRARY.length).map((b) => b.id)).toEqual(BEAST_LIBRARY.map((b) => b.id));
    expect(STARTER_BEASTS.slice(BEAST_LIBRARY.length).map((b) => b.id)).toEqual(CLASSIC_BEASTS.map((b) => b.id));
    expect(new Set(STARTER_BEASTS.map((b) => b.id)).size).toBe(STARTER_BEASTS.length);
    expect(STARTER_BEASTS.slice(BEAST_LIBRARY.length).some((b) => "element" in b)).toBe(false);
    for (const beast of STARTER_BEASTS) {
      expect(beast).not.toHaveProperty("chore");
      expect(beast).not.toHaveProperty("classic");
      expect(beast).not.toHaveProperty("slug");
    }
    const ids = new Set(STARTER_BEASTS.map((b) => b.id));
    for (const quest of STARTER_QUESTS) if (quest.beastId) expect(ids.has(quest.beastId)).toBe(true);
  });

  describe("temple themes", () => {
    const SPEC_COUNTS = { wind: 13, earth: 16, water: 9, fire: 7, ice: 11, light: 10, shadow: 12, moon: 10, storm: 12 };
    const inTheme = (theme: string) => BEAST_LIBRARY.filter((b) => b.theme === theme).map((b) => b.slug);

    it("gives every beast exactly one of the nine temple themes", () => {
      for (const beast of BEAST_LIBRARY) {
        expect(isTempleTheme(beast.theme)).toBe(true);
        expect(typeof beast.theme).toBe("string");
      }
      expect(new Set(BEAST_LIBRARY.map((b) => b.theme))).toEqual(new Set(TEMPLE_THEME_KEYS));
    });

    it("splits the hundred beasts across the themes as the Quest Rooms spec lists them", () => {
      expect(count(BEAST_LIBRARY, (b) => b.theme)).toEqual(SPEC_COUNTS);
      expect(Object.values(SPEC_COUNTS).reduce((a, b) => a + b, 0)).toBe(100);
    });

    it("puts the bathroom in Water, the dishes in Shadow and the laundry basket in Ice", () => {
      expect(inTheme("water").sort()).toEqual(BEAST_LIBRARY.filter((b) => b.room === "bathroom").map((b) => b.slug).sort());
      expect(inTheme("shadow")).toEqual(expect.arrayContaining(["dish-goblin", "crumb-gremlin", "trash-troll"]));
      expect(inTheme("ice")).toEqual(expect.arrayContaining(["socktopus", "laundry-lurker", "freezer-yeti"]));
      expect(inTheme("wind")).toContain("dust-bunny-king");
      expect(inTheme("earth")).toContain("weed-wyrm");
      expect(inTheme("light")).toContain("homework-hydra");
      expect(inTheme("moon")).toContain("fang-fairy");
      expect(inTheme("storm")).toContain("bed-basilisk");
    });

    it("keeps the theme apart from the art element (Dish Goblin is a Water-art beast in the Shadow temple)", () => {
      const dish = BEAST_LIBRARY.find((b) => b.slug === "dish-goblin")!;
      expect(dish.element).toBe("water");
      expect(dish.theme).toBe("shadow");
      expect(BEAST_LIBRARY.some((b) => b.element !== b.theme)).toBe(true);
    });

    it("matches the roster the library is generated from, so a stale generated file shows up here", () => {
      const roster: { slug: string; theme: string }[] = JSON.parse(
        readFileSync(join(__dirname, "../../tools/art/beast_roster.json"), "utf8"));
      expect(roster).toHaveLength(BEAST_LIBRARY.length);
      expect(BEAST_LIBRARY.map((b) => [b.slug, b.theme])).toEqual(roster.map((b) => [b.slug, b.theme]));
    });

    it("leaves the classic beasts without a theme", () => {
      expect(CLASSIC_BEASTS.some((b) => "theme" in b)).toBe(false);
    });
  });
});
