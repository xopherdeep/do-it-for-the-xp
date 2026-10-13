import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { CLASSIC_BEASTS } from "@/lib/services/core/classicBeasts";
import { STARTER_BEASTS, STARTER_QUESTS } from "@/lib/services/core/StarterWorld";
import { TOTAL_BEAST_AVATARS } from "@/lib/services/battle/BestiaryService";
import { getAllWorlds } from "@/lib/engine/core/worldRegistry";

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
});
