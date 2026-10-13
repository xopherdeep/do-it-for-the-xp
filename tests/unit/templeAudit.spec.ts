/**
 * The temple audit: the seven checks that say whether a temple can be finished.
 * A layout here is a grid of room names ("E" is the entrance, "_" a wall); `rooms` says what each name is.
 */
import temples from "@/lib/engine/temples";
import { auditSummary, auditTemple, describeTempleSize, missingLines, missingNames, shortList } from "@/lib/services/temples/templeAudit";
import type { AuditableMaze, AuditableRoom, AuditResult } from "@/lib/services/temples/templeAudit";

const chest = (dungeon: string): AuditableRoom => ({ type: "loot", content: { chest: "dungeon", dungeon } });

/** Every room a finishable temple has, each under its own name */
const ROOMS: Record<string, AuditableRoom> = {
  _: { type: "wall" },
  E: { type: "entrance", visited: true },
  G: { type: "gate" },
  B: { type: "boss", content: { lockOnEnter: true } },
  K: chest("master-key"),
  M: { type: "master" },
  P: chest("map"),
  C: chest("compass"),
  s: { type: "monster", content: { monsterType: "small" } },
};

const FULL: string[][] = [
  ["E", "s", "K", "P"],
  ["_", "C", "_", "s"],
  ["G", "B", "M", "_"],
];

const temple = (maze: AuditableMaze = FULL, rooms: Record<string, AuditableRoom> = ROOMS) => ({ dungeonLayout: { maze, rooms } });

/** The full temple with a room swapped, taken out (null) or added */
const without = (...names: string[]): string[][] => FULL.map((row) => row.map((cell) => (names.includes(cell) ? "_" : cell)));

const check = (result: AuditResult, id: string) => result.checks.find((c) => c.id === id)!;
const failed = (result: AuditResult): string[] => result.checks.filter((c) => !c.ok).map((c) => c.id);

describe("auditTemple", () => {
  it("runs the seven checks in order", () => {
    expect(auditTemple(temple()).checks.map((c) => c.id)).toEqual(["entrance", "exit", "boss", "bossKey", "masterRoom", "map", "compass"]);
    expect(auditTemple(temple()).checks.map((c) => c.label)).toEqual([
      "Entrance",
      "Exit",
      "Boss",
      "Boss Key",
      "Master Room",
      "Dungeon Map",
      "Compass",
    ]);
  });

  it("passes a temple that has everything", () => {
    const result = auditTemple(temple());
    expect(failed(result)).toEqual([]);
    expect(result.passed).toBe(true);
    expect(result.checks.every((c) => c.detail !== "")).toBe(true);
    expect(check(result, "entrance").detail).toBe("Placed");
    expect(check(result, "exit").detail).toBe("Placed");
  });

  it("fails only the Master Room check when there is no Master Room", () => {
    const result = auditTemple(temple(without("M")));
    expect(failed(result)).toEqual(["masterRoom"]);
    expect(result.passed).toBe(false);
    expect(check(result, "masterRoom").detail).toBe("The Pegasus Egg chamber. Goes right after the boss.");
  });

  describe("entrance", () => {
    it("is missing without an entrance, and the exit is missing too when there is no gate either", () => {
      const result = auditTemple(temple(without("E", "G")));
      expect(check(result, "entrance")).toMatchObject({ ok: false, detail: "Missing" });
      expect(check(result, "exit")).toMatchObject({ ok: false, detail: "Missing" });
      expect(result.passed).toBe(false);
    });

    it("wants exactly one", () => {
      const result = auditTemple(temple([["E", "s", "K", "P"], ["E", "C", "_", "s"], ["G", "B", "M", "_"]]));
      expect(check(result, "entrance")).toMatchObject({ ok: false, detail: "Two entrances: keep one" });
      expect(failed(result)).toEqual(["entrance"]);
    });

    it("counts the cells, not the room definitions: one definition shared by three cells is three entrances", () => {
      const result = auditTemple(temple([["E", "s", "K", "P"], ["E", "C", "E", "s"], ["G", "B", "M", "_"]]));
      expect(check(result, "entrance").detail).toBe("3 entrances: keep one");
    });
  });

  describe("exit", () => {
    it("is the entrance when there is no gate: the temple ends where it began", () => {
      const result = auditTemple(temple(without("G")));
      expect(check(result, "exit")).toMatchObject({ ok: true, detail: "Entrance doubles as exit" });
      expect(result.passed).toBe(true);
    });

    it("is the gate when there is one", () => {
      expect(check(auditTemple(temple()), "exit")).toMatchObject({ ok: true, detail: "Placed" });
    });

    it("passes with a gate and no entrance, though the entrance check still fails", () => {
      const result = auditTemple(temple(without("E")));
      expect(check(result, "exit").ok).toBe(true);
      expect(failed(result)).toEqual(["entrance"]);
    });
  });

  describe("boss", () => {
    it("is missing without a boss room", () => {
      const result = auditTemple(temple(without("B")));
      expect(check(result, "boss")).toMatchObject({ ok: false, detail: "Missing" });
      expect(failed(result)).toEqual(["boss"]);
    });

    it("wants exactly one: two bosses fail", () => {
      const result = auditTemple(temple([["E", "s", "K", "P"], ["_", "C", "_", "B"], ["G", "B", "M", "_"]]));
      expect(check(result, "boss")).toMatchObject({ ok: false, detail: "Two bosses: keep one" });
      expect(failed(result)).toEqual(["boss"]);
    });
  });

  describe("Boss Key", () => {
    it("is missing without a chest holding it, and says what to do", () => {
      const result = auditTemple(temple(without("K")));
      expect(check(result, "bossKey")).toMatchObject({ ok: false, detail: "Place a Chest holding the Boss Key before the boss door" });
      expect(failed(result)).toEqual(["bossKey"]);
    });

    it("is not the small key, the map or the Pegasus", () => {
      const rooms = { ...ROOMS, K: chest("key") };
      expect(check(auditTemple(temple(FULL, rooms)), "bossKey").ok).toBe(false);
    });

    it("counts a chest of any chest type", () => {
      for (const type of ["loot", "chest", "treasure"]) {
        const rooms = { ...ROOMS, K: { type, content: { dungeon: "master-key" } } };
        expect(check(auditTemple(temple(FULL, rooms)), "bossKey").ok).toBe(true);
      }
    });

    it("is not a Master Room left holding the key it was edited from", () => {
      const rooms = { ...ROOMS, M: { type: "master", content: { chest: "dungeon", dungeon: "master-key" } } };
      const result = auditTemple(temple(without("K"), rooms));
      expect(check(result, "bossKey").ok).toBe(false);
      expect(check(result, "masterRoom").ok).toBe(true);
    });

    it("counts the older Key room whose key is the master key (the Water Temple's)", () => {
      const rooms = { ...ROOMS, K: { type: "key", content: { keyId: "master", keyName: "Trident Key" } } };
      expect(check(auditTemple(temple(FULL, rooms)), "bossKey").ok).toBe(true);
      const small = { ...ROOMS, K: { type: "key", content: { keyId: "key1" } } };
      expect(check(auditTemple(temple(FULL, small)), "bossKey").ok).toBe(false);
    });
  });

  describe("Master Room", () => {
    it("takes the Dragon Egg, the older name for the same room", () => {
      for (const type of ["dragon-egg", "Dragon_Egg"]) {
        const result = auditTemple(temple(FULL, { ...ROOMS, M: { type } }));
        expect(check(result, "masterRoom")).toMatchObject({ ok: true, detail: "Placed" });
      }
    });

    it("takes the Pegasus chest the built-in temples and the generator use", () => {
      const rooms = { ...ROOMS, M: { type: "loot", content: { chest: "dungeon", dungeon: "Pegasus Whistle", pegasus: true } } };
      expect(check(auditTemple(temple(FULL, rooms)), "masterRoom").ok).toBe(true);
    });

    it("is not an ordinary chest", () => {
      const rooms = { ...ROOMS, M: chest("compass") };
      expect(check(auditTemple(temple(FULL, rooms)), "masterRoom").ok).toBe(false);
    });

    it("wants exactly one", () => {
      const result = auditTemple(temple([["E", "s", "K", "P"], ["M", "C", "_", "s"], ["G", "B", "M", "_"]]));
      expect(check(result, "masterRoom")).toMatchObject({ ok: false, detail: "Two Master Rooms: keep one" });
    });
  });

  describe("map and compass", () => {
    it("are listed as Missing and never stop a temple from being finished", () => {
      const result = auditTemple(temple(without("P", "C")));
      expect(check(result, "map")).toMatchObject({ ok: false, detail: "Missing", optional: true });
      expect(check(result, "compass")).toMatchObject({ ok: false, detail: "Missing", optional: true });
      expect(result.passed).toBe(true);
      expect(auditSummary(result)).toBe("5 of 7 checks passed");
      expect(missingNames(result)).toEqual([]);
    });

    it("count the editor's own spelling of the map", () => {
      const result = auditTemple(temple(FULL, { ...ROOMS, P: chest("dungeon-map") }));
      expect(check(result, "map")).toMatchObject({ ok: true, detail: "Placed" });
    });

    it("are Placed when a chest holds them", () => {
      const result = auditTemple(temple());
      expect(check(result, "map").detail).toBe("Placed");
      expect(check(result, "compass").detail).toBe("Placed");
    });
  });

  describe("reading the rooms", () => {
    it("reads every floor of a tower", () => {
      const tower = {
        B1: [["E", "_"], ["K", "s"]],
        "1F": [["P", "C"], ["G", "_"]],
        "2F": [["B", "M"]],
      };
      const result = auditTemple(temple(tower));
      expect(failed(result)).toEqual([]);
      expect(result.passed).toBe(true);
    });

    it("does not count a room nobody placed on the maze", () => {
      const result = auditTemple(temple(without("M", "K"), { ...ROOMS, X: { type: "master" }, Y: chest("master-key") }));
      expect(failed(result)).toEqual(["bossKey", "masterRoom"]);
    });

    it("ignores walls, voids and tokens with no room", () => {
      const result = auditTemple(temple([["E", ".", "????", "____", "_", "WALL"]], ROOMS));
      expect(check(result, "entrance").ok).toBe(true);
      expect(check(result, "boss").ok).toBe(false);
    });

    it("reads a temple that keeps its maze and rooms at the top", () => {
      const result = auditTemple({ maze: FULL, rooms: ROOMS });
      expect(result.passed).toBe(true);
    });

    it("fails everything, and does not throw, for a temple with no layout", () => {
      for (const empty of [undefined, null, {}, { dungeonLayout: null }, { dungeonLayout: { maze: [], rooms: {} } }, { dungeonLayout: { maze: FULL } }]) {
        const result = auditTemple(empty as any);
        expect(result.passed).toBe(false);
        expect(failed(result)).toEqual(["entrance", "exit", "boss", "bossKey", "masterRoom", "map", "compass"]);
      }
    });

    it("does not change the temple it is given", () => {
      const given = temple();
      const before = JSON.stringify(given);
      auditTemple(given);
      expect(JSON.stringify(given)).toBe(before);
    });
  });

  describe("the temples that ship with the app", () => {
    it.each(Object.keys(temples))("%s can be finished", (id) => {
      const t = (temples as Record<string, any>)[id];
      const result = auditTemple({ dungeonLayout: { maze: t.maze, rooms: t.rooms } });
      expect(missingNames(result)).toEqual([]);
      expect(result.passed).toBe(true);
    });
  });
});

describe("auditSummary", () => {
  it("counts the checks that passed, optional ones too", () => {
    expect(auditSummary(auditTemple(temple()))).toBe("7 of 7 checks passed");
    expect(auditSummary(auditTemple(temple(without("M"))))).toBe("6 of 7 checks passed");
    expect(auditSummary(auditTemple(undefined))).toBe("0 of 7 checks passed");
  });
});

describe("missingLines", () => {
  it("is the detail line of each failed check, in order", () => {
    expect(missingLines(auditTemple(temple()))).toEqual([]);
    expect(missingLines(auditTemple(temple(without("M"))))).toEqual(["The Pegasus Egg chamber. Goes right after the boss."]);
    expect(missingLines(auditTemple(temple(without("K", "M", "P"))))).toEqual([
      "Place a Chest holding the Boss Key before the boss door",
      "The Pegasus Egg chamber. Goes right after the boss.",
      "Missing",
    ]);
  });
});

describe("missingNames", () => {
  it("is the name of each failed check the temple needs, in order", () => {
    expect(missingNames(auditTemple(temple()))).toEqual([]);
    expect(missingNames(auditTemple(temple(without("E", "G", "M"))))).toEqual(["Entrance", "Exit", "Master Room"]);
  });
});

describe("shortList", () => {
  it("names the first two and counts the rest", () => {
    expect(shortList([])).toBe("");
    expect(shortList(["Entrance"])).toBe("Entrance");
    expect(shortList(["Entrance", "Master Room"])).toBe("Entrance, Master Room");
    expect(shortList(["Entrance", "Exit", "Boss"])).toBe("Entrance, Exit +1 more");
    expect(shortList(["Entrance", "Exit", "Boss", "Boss Key", "Master Room"])).toBe("Entrance, Exit +3 more");
  });
});

describe("the size check (docs/Quest-Rooms-Spec.md section 9)", () => {
  // A monster room holds a quest of 3; the boss room is a template nobody has woken yet, an 8 "if woken"
  const sizeOf = (room: AuditableRoom) => {
    if (room.type === "monster") return { difficulty: 3 };
    if (room.type === "boss") return { difficulty: 8, dormant: true };
    return null;
  };

  it("is not part of the audit unless a lookup is given: the seven checks stay seven", () => {
    expect(auditTemple(temple()).checks.map((c) => c.id)).not.toContain("size");
    expect(auditTemple(temple()).checks).toHaveLength(7);
  });

  it("adds an eighth, optional check that says 'Size 14 of 21' and what the sleeping rooms would add", () => {
    const result = auditTemple(temple(), { sizeOf });
    expect(result.checks.map((c) => c.id)).toEqual(["entrance", "exit", "boss", "bossKey", "masterRoom", "map", "compass", "size"]);
    // two monster rooms (3 + 3) and one dormant boss room (8)
    expect(check(result, "size")).toMatchObject({ label: "Size", ok: false, optional: true, detail: "Size 14 of 21 · 8 if woken" });
  });

  it("never fails the audit, however small the temple", () => {
    const result = auditTemple(temple(), { sizeOf: () => null });
    expect(check(result, "size")).toMatchObject({ ok: false, detail: "Size 0 of 21" });
    expect(result.passed).toBe(true);
    expect(missingNames(result)).toEqual([]);
  });

  it("does not rescue a temple that is missing something", () => {
    const result = auditTemple(temple(without("M")), { sizeOf: () => ({ difficulty: 30 }) });
    expect(check(result, "size").ok).toBe(true);
    expect(result.passed).toBe(false);
    expect(missingNames(result)).toEqual(["Master Room"]);
  });

  it("is ok once the temple is full, and says so without the 'if woken' tail when nothing sleeps", () => {
    const result = auditTemple(temple(), { sizeOf: (room) => (room.type === "monster" ? { difficulty: 11 } : null) });
    expect(check(result, "size")).toMatchObject({ ok: true, detail: "Size 22 of 21" });
  });

  it("takes a plain difficulty as a quest that is awake", () => {
    const result = auditTemple(temple(), { sizeOf: (room) => (room.type === "boss" ? 13 : undefined) });
    expect(check(result, "size").detail).toBe("Size 13 of 21");
  });

  it("counts the cells, not the definitions, and reads every floor", () => {
    const tower = { "1F": [["E", "s", "s"]], "2F": [["G", "s", "B"]] };
    const result = auditTemple(temple(tower), { sizeOf: (room) => (room.type === "monster" ? 2 : null) });
    expect(check(result, "size").detail).toBe("Size 6 of 21");
  });

  it("counts toward the summary, and stays out of the lines and names of what is missing", () => {
    const result = auditTemple(temple(), { sizeOf });
    expect(auditSummary(result)).toBe("7 of 8 checks passed");
    expect(missingNames(result)).toEqual([]);
  });

  it("copes with a temple that has no layout", () => {
    const result = auditTemple(undefined, { sizeOf });
    expect(check(result, "size").detail).toBe("Size 0 of 21");
  });
});

describe("describeTempleSize", () => {
  it("says the size against the full temple, with the sleeping part when there is one", () => {
    expect(describeTempleSize({ total: 17, dormant: 0 })).toBe("Size 17 of 21");
    expect(describeTempleSize({ total: 17, dormant: 9 })).toBe("Size 17 of 21 · 9 if woken");
    expect(describeTempleSize({ total: 0, dormant: 0 })).toBe("Size 0 of 21");
  });
});
