/**
 * The text preview and the counts the Temple Creator shows for a generated temple, and the record helpers that
 * name a generated temple in TempleDb.
 */
import {
  generateTemple,
  previewRows,
  previewChar,
  summarize,
  floorsOf,
  PATH_CHAR,
  PREVIEW_CHARS,
  generatedTempleId,
  isGeneratedTempleId,
  nextSeed,
  randomSeed,
  slugify,
  toTempleRecord,
} from "@/lib/engine/dungeons/generator";
import type { Dungeon } from "@/lib/engine/core/dungeons/types";

const tiny: Pick<Dungeon, "maze" | "rooms"> = {
  maze: [
    ["E001", "O001", "k001"],
    ["____", "s001", "B001"],
  ],
  rooms: {
    ____: { type: "wall" },
    E001: { type: "entrance" },
    O001: { type: "empty" },
    k001: { type: "loot", content: { chest: "dungeon", dungeon: "key" }, locked: { east: true } },
    s001: { type: "monster", content: { difficulty: "easy" } },
    B001: { type: "boss", locked: { master: true }, content: { lockOnEnter: true } },
  },
};

describe("templePreview", () => {
  it("previewRows draws one string per row per floor, a space for walls, letters for the rooms", () => {
    expect(previewRows(tiny)).toEqual([{ floor: "1F", rows: ["E.k", " sB"] }]);
  });

  it("previewRows marks plain rooms on the highlighted path and leaves special rooms their letter", () => {
    const path = [
      { floor: "1F", row: 0, col: 0 },
      { floor: "1F", row: 0, col: 1 },
      { floor: "1F", row: 0, col: 2 },
    ];
    expect(previewRows(tiny, path)[0].rows).toEqual([`E${PATH_CHAR}k`, " sB"]);
  });

  it("previewChar tells key, master-key and Pegasus chests apart from ordinary loot", () => {
    const rooms: Dungeon["rooms"] = {
      a: { type: "loot", content: { chest: "consumable", items: ["potion"] } },
      b: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
      c: { type: "loot", content: { chest: "dungeon", dungeon: "master-key" } },
      d: { type: "loot", content: { chest: "dungeon", dungeon: "Pegasus", pegasus: true } },
      e: { type: "nonsense" },
    };
    expect(["a", "b", "c", "d", "e"].map((token) => previewChar({ rooms }, token))).toEqual([PREVIEW_CHARS.loot, "k", "K", "*", "?"]);
  });

  it("summarize counts rooms, kinds, monsters, keys, small locks and chests", () => {
    expect(summarize(tiny)).toEqual({
      floors: 1,
      rows: 2,
      cols: 3,
      rooms: 5,
      byKind: { entrance: 1, empty: 1, loot: 1, monster: 1, boss: 1 },
      monsters: 2,
      keys: 1,
      locks: 1,
      hasMasterKey: false,
      hasPegasus: false,
      chests: 1,
    });
  });

  it("agrees with the generator over every floor of a real temple", () => {
    const temple = generateTemple("preview-7", { theme: "Yard", size: "large", floors: 3, locks: 3 });
    const floors = floorsOf(temple.maze);
    const preview = previewRows(temple, temple.criticalPath);
    expect(preview.map((floor) => floor.floor)).toEqual(Object.keys(floors));
    for (const { floor, rows } of preview) {
      expect(rows).toHaveLength(floors[floor].length);
      for (const row of rows) expect(row).toHaveLength(floors[floor][0].length);
    }
    const summary = summarize(temple);
    expect(summary.floors).toBe(3);
    expect(summary.byKind.boss).toBe(1);
    expect(summary.byKind.miniboss).toBe(1);
    expect(summary.byKind.entrance).toBe(1);
    expect(summary.hasMasterKey).toBe(true);
    expect(summary.hasPegasus).toBe(true);
    expect(summary.rooms).toBe(Object.values(floors).flat(2).filter((token) => token !== "_").length);
    // the boss door is not a small lock; every critical lock is matched by at least one key (R3)
    expect(summary.keys).toBeGreaterThanOrEqual(Math.min(summary.locks, 3));
    expect(preview.flatMap((floor) => floor.rows).join("")).toContain("B");
    expect(preview.flatMap((floor) => floor.rows).join("")).toContain("E");
  });
});

describe("templeRecord", () => {
  it("names a generated temple after its seed", () => {
    expect(slugify("Sunday Chores 42")).toBe("sunday-chores-42");
    expect(generatedTempleId("Attic 417")).toBe("gen-attic-417");
    expect(generatedTempleId(42)).toBe("gen-42");
    expect(isGeneratedTempleId("gen-attic-417")).toBe(true);
    expect(isGeneratedTempleId("wind-temple")).toBe(false);
  });

  it("rerolls to the next seed", () => {
    expect(nextSeed("attic-417")).toBe("attic-418");
    expect(nextSeed("attic-999")).toBe("attic-1000");
    expect(nextSeed("attic")).toBe("attic-2");
  });

  it("randomSeed is a word and a three-digit number, deterministic for a fixed die", () => {
    expect(randomSeed(() => 0)).toBe("kitchen-100");
    expect(randomSeed(() => 0.999)).toMatch(/^[a-z]+-\d{3}$/);
    expect(randomSeed()).toMatch(/^[a-z]+-\d{3}$/);
  });

  it("toTempleRecord stores the layout under dungeonLayout with the generator's provenance", () => {
    const temple = generateTemple("attic-417", { theme: "Attic", size: "small", element: "shadow" });
    const record = toTempleRecord(temple);
    expect(record.id).toBe("gen-attic-417");
    expect(record.name).toBe("Attic Temple");
    expect(record.customName).toBe("Attic Temple");
    expect(record.seed).toBe("attic-417");
    expect(record.themeId).toBe("attic");
    expect(record.element).toBe("shadow");
    expect(record.generated).toBe(true);
    expect(record.categoryIds).toEqual([]);
    expect(record.dungeonLayout?.entrance).toEqual(temple.entrance);
    expect(record.dungeonLayout?.maze).toEqual(temple.maze);
    expect(record.dungeonLayout?.rooms).toEqual(temple.rooms);
    // a copy, not the generator's object: the creator may edit it later
    expect(record.dungeonLayout?.rooms).not.toBe(temple.rooms);
    expect(JSON.parse(JSON.stringify(record))).toEqual(record);
  });
});
