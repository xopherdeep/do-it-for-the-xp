/**
 * The seeded temple generator: every seed solvable, deterministic, within the bounds of R10, and accepted by
 * the engine's registerTemple.
 */
import { generateTemple, solveTemple, floorsOf, kindOf, type GeneratedTemple, type TempleSize } from "@/lib/engine/dungeons/generator";
import { registerTemple } from "@/lib/engine/core/dungeons/TempleAdapter";
import { grantsBossKey } from "@/lib/services/temples/roomGrants";

const SEEDS = 200;
const SIZES: TempleSize[] = ["small", "medium", "large"];
const THEME = "Kitchen";

const generated = new Map<TempleSize, GeneratedTemple[]>();
const templesOf = (size: TempleSize): GeneratedTemple[] => {
  if (!generated.has(size)) generated.set(size, Array.from({ length: SEEDS }, (_, i) => generateTemple(i + 1, { theme: THEME, size })));
  return generated.get(size)!;
};

/** Room types on a floor, one per standable cell. */
const kindsOn = (temple: GeneratedTemple, floor: string): string[] =>
  floorsOf(temple.maze)[floor].flat().map((token) => kindOf(temple.rooms[token])).filter((kind) => kind !== "wall");

const count = (kinds: string[], ...wanted: string[]): number => kinds.filter((kind) => wanted.includes(kind)).length;

describe("TempleGenerator", () => {
  for (const size of SIZES) {
    it(`${SEEDS} ${size} seeds are solvable and pass every rule`, () => {
      for (const temple of templesOf(size)) {
        const verdict = solveTemple(temple);
        expect({ seed: temple.seed, reasons: verdict.reasons, solvable: verdict.solvable }).toEqual({ seed: temple.seed, reasons: [], solvable: true });
      }
    });
  }

  it("R11 Determinism: the same seed and options give the same temple, another seed another temple", () => {
    const options = { theme: THEME, size: "medium" as const, locks: 2 as const };
    expect(generateTemple(42, options)).toEqual(generateTemple(42, options));
    expect(generateTemple("sunday-chores", options)).toEqual(generateTemple("sunday-chores", options));
    expect(generateTemple(42, options).maze).not.toEqual(generateTemple(43, options).maze);
    expect(generateTemple(42, options).seed).toBe(42);
  });

  it("R10 Size: floors, grid, rooms per floor, combat share, shops, saves and a heal room", () => {
    for (const size of SIZES) {
      for (const temple of templesOf(size)) {
        const floors = floorsOf(temple.maze);
        const names = Object.keys(floors);
        expect(names.length).toBeGreaterThanOrEqual(1);
        expect(names.length).toBeLessThanOrEqual(3);
        expect(names).toEqual(names.map((_, i) => `${i + 1}F`));

        const everywhere: string[] = [];
        for (const floor of names) {
          const grid = floors[floor];
          expect(grid.length).toBeGreaterThanOrEqual(4);
          expect(grid.length).toBeLessThanOrEqual(9);
          expect(grid[0].length).toBeGreaterThanOrEqual(4);
          expect(grid[0].length).toBeLessThanOrEqual(9);
          const kinds = kindsOn(temple, floor);
          expect(kinds.length).toBeGreaterThanOrEqual(6);
          expect(count(kinds, "save")).toBeLessThanOrEqual(1);
          everywhere.push(...kinds);
        }
        expect(count(everywhere, "monster", "miniboss", "boss") / everywhere.length).toBeLessThanOrEqual(0.4);
        expect(count(everywhere, "shop")).toBeLessThanOrEqual(1);
        expect(count(everywhere, "health", "camp")).toBeGreaterThanOrEqual(1);
        expect(count(everywhere, "boss")).toBe(1);
        expect(count(everywhere, "miniboss")).toBe(1);
        expect(count(everywhere, "entrance")).toBe(1);
      }
    }
  });

  it("honours the floors and locks options", () => {
    for (const floors of [1, 2, 3] as const) {
      const temple = generateTemple(7, { theme: THEME, size: "large", floors });
      expect(Object.keys(floorsOf(temple.maze))).toHaveLength(floors);
    }
    for (const locks of [0, 1, 2, 3] as const) {
      const temple = generateTemple(11, { theme: THEME, size: "large", locks });
      const smallLocks = Object.values(temple.rooms).filter((room) => room.locked && !room.locked.master).reduce((sum, room) => sum + Object.values(room.locked!).filter(Boolean).length, 0);
      // the boss door is barred on the room in front of it, and one optional side lock may be added (R3)
      expect(smallLocks - 1).toBeLessThanOrEqual(locks + 1);
      expect(smallLocks - 1).toBeGreaterThanOrEqual(Math.min(locks, 1));
    }
  });

  it("gives every room a token of its own and points the entrance at the entrance room", () => {
    for (const temple of templesOf("medium").slice(0, 20)) {
      const floors = floorsOf(temple.maze);
      const tokens = Object.values(floors).flat(2).filter((token) => token !== "_");
      expect(new Set(tokens).size).toBe(tokens.length);
      for (const token of tokens) {
        expect(token).toHaveLength(4);
        expect(temple.rooms[token]).toBeDefined();
      }
      const [floor, row, col] = temple.entrance;
      expect(temple.rooms[floors[Object.keys(floors)[floor]][row][col]].type).toBe("entrance");
    }
  });

  it("stores the seed, the theme and the critical path, and binds monster rooms to the theme's quests", () => {
    const quests = [{ id: "q-dishes" }, { id: "q-trash" }];
    const temple = generateTemple("family-1", { theme: "Kitchen Duty", size: "medium", quests, element: "fire" });
    expect(temple.seed).toBe("family-1");
    expect(temple.themeId).toBe("kitchen-duty");
    expect(temple.id).toBe("kitchen-duty-temple-family-1");
    expect(temple.name).toBe("Kitchen Duty Temple");
    expect(temple.criticalPath.length).toBeGreaterThan(3);
    expect(kindOf(temple.rooms[floorsOf(temple.maze)[temple.criticalPath[0].floor][temple.criticalPath[0].row][temple.criticalPath[0].col]])).toBe("entrance");
    const monsters = Object.values(temple.rooms).filter((room) => room.type === "monster");
    expect(monsters.length).toBeGreaterThan(0);
    for (const room of monsters) expect(["q-dishes", "q-trash"]).toContain(room.content?.questId);
    const boss = Object.values(temple.rooms).find((room) => room.type === "boss")!;
    expect(boss.locked).toEqual({ master: true });
    expect(boss.content?.lockOnEnter).toBe(true);
    expect(boss.content?.element).toBe("fire");
  });

  it("keeps the Boss Key in a loot chest past the mini-boss, never in the mini-boss room, whatever bossKeyChest says", () => {
    for (const size of SIZES) {
      for (let seed = 1; seed <= 30; seed++) {
        for (const bossKeyChest of [undefined, false]) {
          const temple = generateTemple(`key-${seed}`, { theme: THEME, size, bossKeyChest });
          const rooms = Object.values(temple.rooms);
          expect({ size, seed, bossKeyChest, inMiniboss: rooms.filter((room) => room.type === "miniboss" && room.content?.dungeon).length }).toEqual({ size, seed, bossKeyChest, inMiniboss: 0 });
          const holders = rooms.filter(grantsBossKey);
          expect(holders.length).toBeGreaterThanOrEqual(1);
          for (const room of holders) expect(room.type).toBe("loot");
        }
      }
    }
  });

  it("is accepted by registerTemple as it is", () => {
    const temple = generateTemple(3, { theme: THEME, size: "small" });
    const registered = registerTemple(temple.id, temple);
    expect(registered.maze).toEqual(temple.maze);
    expect(Object.keys(registered.rooms)).toEqual(Object.keys(temple.rooms));
  });
});
