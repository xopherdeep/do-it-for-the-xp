/**
 * The nine temples that ship with the app (src/lib/engine/temples) can all be finished.
 *
 * Each one is registered the way the engine registers it (TempleAdapter.registerTemple, so a Master Room becomes the
 * Pegasus chest and the editor's door sides become locks), then read by the temple audit and the solver. The eight
 * temples written by the generator (tools/temples/regenerate.ts) must also keep to the shape they were made in:
 * two or three floors joined by stairs, a short critical path, every rule of the Temple Generation Contract.
 * The Wind Temple is authored by hand and only has to be finishable. It is the one temple that asks for a Bomb: its
 * Boss Key lies past a cracked wall, and its own shop, in reach of the entrance without one, sells Bombs. It is read
 * here as shipped, no wall blown by hand: the shop is a Bomb source, so the solver opens the cracked wall itself once
 * the hero has reached the shop (WindTemple.spec.ts checks the shop really comes first).
 *
 * Quest Rooms (docs/Quest-Rooms-Spec.md section 11): every combat room of the nine holds a quest template from the
 * chore library, bound to a beast of the temple's theme, and the templates add up to a full temple (21 or more).
 */
import temples from "@/lib/engine/temples";
import { TEMPLE_METADATA } from "@/lib/engine/temples/templeRegistry";
import { DungeonManager } from "@/lib/engine/core/dungeons/DungeonManager";
import { registerTemple } from "@/lib/engine/core/dungeons/TempleAdapter";
import { buildTempleGraph, generateTemple, previewChar, reachableFrom, roomKey, solveTemple, summarize, type GraphRoom, type TempleGraph } from "@/lib/engine/dungeons/generator";
import type { RoomQuestTemplate } from "@/lib/engine/core/dungeons/types";
import { getQuestWindow } from "@/lib/engine/quests/QuestSchedule";
import { BEAST_LIBRARY } from "@/lib/services/core/beastLibrary";
import { STARTER_QUESTS } from "@/lib/services/core/StarterWorld";
import { questFromTemplate, mondayOf } from "@/lib/services/temples/wakeTempleQuests";
import { TEMPLE_FULL_SIZE, questTier, resolveRoomQuest, templeSize, type QuestTier } from "@/lib/services/temples/questRooms";
import { auditSummary, auditTemple, missingNames, type AuditableRoom } from "@/lib/services/temples/templeAudit";
import { generateShipped, renderShippedModule, SHIPPED_IDS } from "../../tools/temples/regenerate";
import { CLASSIC_IDS, dressClassic } from "../../tools/temples/classic/dress";
import { readFileSync } from "fs";
import { join } from "path";

const shipped = temples as Record<string, any>;
const IDS = Object.keys(shipped);
const HAND_MADE = ["wind-temple"];
/** The temples dressed from a classic dungeon's JSON (tools/temples/classic/dress.ts), one at a time as they move over */
const CLASSIC = IDS.filter((id) => CLASSIC_IDS.includes(id));
const REGENERATED = IDS.filter((id) => !HAND_MADE.includes(id) && !CLASSIC.includes(id));

/** Floors each regenerated temple was spread over */
const FLOORS: Record<string, number> = {
  "fire-temple": 2,
  "ice-temple": 2,
  "moon-temple": 3,
  "shadow-temple": 3,
};

/** The relics each regenerated temple keeps in a chest */
const RELICS: Record<string, string[]> = {
  "fire-temple": ["Flame Shield"],
  "ice-temple": ["Frost Wand"],
  "moon-temple": ["Lunar Pendant", "Moon Shard"],
  "shadow-temple": ["Void Dagger"],
};

/**
 * Quest Rooms (docs/Quest-Rooms-Spec.md sections 10 and 11): the combat rooms of each temple as (monster, miniboss, boss)
 * counts, and the size its quest templates add up to. A full temple is 21 or more. A classic temple's counts and size
 * follow its dungeon (`dressed`); only the size's floor of 21 is pinned for it.
 */
const COMBAT_ROOMS: Record<string, [number, number, number]> = {
  "wind-temple": [6, 2, 1],
  "shadow-temple": [7, 1, 1],
  "fire-temple": [4, 1, 1],
  "ice-temple": [3, 1, 1],
  "moon-temple": [6, 1, 1],
};

const TEMPLE_SIZE: Record<string, number> = {
  "wind-temple": 22,
  "shadow-temple": 23,
  "fire-temple": 25,
  "ice-temple": 23,
  "moon-temple": 22,
};

/** A classic temple's combat rooms and size, read from its dressed rooms (side rooms, repeats of a must-clear beast, count too) */
const dressed = (id: string): { counts: [number, number, number]; size: number } => {
  const rooms = Object.values(dressClassic(id).rooms);
  const count = (type: string) => rooms.filter((room) => room.type === type).length;
  const quests = rooms.filter((room) => room.content?.quest).map((room) => ({ difficulty: Number(room.content!.quest!.difficulty), dormant: true }));
  return { counts: [count("monster"), count("miniboss"), count("boss")], size: templeSize(quests).total };
};
const combatCountsOf = (id: string): [number, number, number] => (CLASSIC.includes(id) ? dressed(id).counts : COMBAT_ROOMS[id]);
const sizeOf = (id: string): number => (CLASSIC.includes(id) ? dressed(id).size : TEMPLE_SIZE[id]);

/**
 * Section 12: the starter world's quests that fill a shipped room at once, by beast. Two fill a room through the
 * library's suggestion, because they have no beast of their own: Feed the Loyal Familiar (Kibble Kobold, Earth) and
 * Study the Ancient Tomes (Pop Quiz Poltergeist, Light's boss room). Water holds none.
 */
const STARTER_MATCHES: Record<string, string[]> = {
  "wind-temple": ["quest-dust", "quest-vacuum"],
  "fire-temple": ["quest-breakfast", "quest-cook"],
  "earth-temple": ["quest-weeds", "quest-pet", "quest-plants", "quest-walk-dog", "quest-poop"],
  "shadow-temple": ["quest-dishes", "quest-crumbs", "quest-table-set", "quest-table-clear", "quest-mop"],
  "ice-temple": ["quest-socks", "quest-fridge", "quest-laundry"],
  "light-temple": ["quest-backpack", "quest-homework", "quest-reading"],
  "moon-temple": ["quest-teeth", "quest-outfit", "quest-hands", "quest-hair", "quest-screen-rest", "quest-wake", "quest-sleep"],
  "storm-temple": ["quest-bed", "quest-shoes", "quest-toys"],
};

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];
const COMBAT_TYPES = ["monster", "miniboss", "boss"] as const;
const SCHOOL_DAYS = ["mon", "tue", "wed", "thu", "fri"];

/** What each room adds to the size of a temple: its template's difficulty, "if woken" (no family quest fills a shipped room yet) */
const templateSize = (room: AuditableRoom) => (room.content?.quest ? { difficulty: Number(room.content.quest.difficulty), dormant: true } : null);

/** The combat rooms of a registered temple by tier, in order of path distance from the entrance (every door counted as open) */
const combatRooms = (graph: TempleGraph, tier: QuestTier): GraphRoom[] =>
  reachableFrom(graph, graph.entrance!)
    .map((key) => graph.rooms.get(key)!)
    .filter((room) => room.kind === tier);

const templateOf = (room: GraphRoom): RoomQuestTemplate => room.room.content!.quest!;

/**
 * Template schedule rules (section 11): daily chores are due 19:00 ("am" 08:00, "bed" 20:30), "school" is weekly on
 * mon to fri, weekly chores are due 18:00 on the window's last day, monthly is custom with one month.
 */
const followsScheduleRules = (template: RoomQuestTemplate): boolean => {
  const days = template.repeatOnDays ?? [];
  switch (template.basicSchedule) {
    case "daily":
      return !days.length && ["19:00", "08:00", "20:30"].includes(String(template.dueByTime));
    case "weekly":
      return days.length ? JSON.stringify(days) === JSON.stringify(SCHOOL_DAYS) && ["18:00", "20:30"].includes(String(template.dueByTime)) : template.dueByTime === "18:00";
    case "custom":
      return template.customPeriodType === "month" && !days.length && template.dueByTime === "18:00";
    default:
      return false;
  }
};

/** The temple as the engine holds it after registration, cracked walls and all (the Wind Temple's shop is the Bomb that opens its wall) */
const registered = (id: string) => {
  registerTemple(id, shipped[id], { force: true });
  const dungeon = DungeonManager.getInstance().getDungeon(id)!;
  return { id, entrance: dungeon.entrance, maze: dungeon.maze, rooms: dungeon.rooms };
};

const roomsOn = (graph: TempleGraph, floor: string) => [...graph.rooms.values()].filter((room) => room.ref.floor === floor);

describe("the shipped temples", () => {
  it("are the nine of the registry", () => {
    expect(IDS.sort()).toEqual(Object.keys(TEMPLE_METADATA).sort());
    expect(IDS).toHaveLength(9);
  });

  describe.each(IDS)("%s", (id) => {
    const layout = registered(id);
    const graph = buildTempleGraph(layout);
    const rooms = [...graph.rooms.values()];
    const verdict = solveTemple(layout);
    const audit = auditTemple(layout);

    it("passes the audit, map and compass included", () => {
      expect(missingNames(audit)).toEqual([]);
      expect(audit.passed).toBe(true);
      // the optional stairs check (#1360) joins the seven for a temple with stairs
      expect(auditSummary(audit)).toBe(`${audit.checks.length} of ${audit.checks.length} checks passed`);
    });

    it("leads every stairway to another floor", () => {
      const hasStairs = rooms.some((room) => room.kind === "stairs-up" || room.kind === "stairs-down");
      const stairs = audit.checks.find((check) => check.id === "stairs");
      expect(Boolean(stairs)).toBe(hasStairs);
      if (stairs) expect(stairs).toMatchObject({ ok: true, detail: "Placed" });
    });

    it("has one entrance, one boss, one Master Room and a Boss Key chest", () => {
      expect(rooms.filter((room) => room.kind === "entrance")).toHaveLength(1);
      expect(rooms.filter((room) => room.kind === "boss")).toHaveLength(1);
      expect(rooms.filter((room) => room.prize)).toHaveLength(1);
      expect(rooms.filter((room) => room.masterKey).length).toBeGreaterThanOrEqual(1);
    });

    it("puts the Master Room right behind the boss", () => {
      const boss = rooms.find((room) => room.kind === "boss")!;
      const master = rooms.find((room) => room.prize)!;
      expect(graph.doors.some((door) => door.from === boss.key && door.to === master.key)).toBe(true);
    });

    it("can be cleared: the hero reaches the boss and the Master Room", () => {
      expect(verdict.solvable).toBe(true);
      const path = verdict.criticalPath.map(roomKey);
      expect(path).toContain(rooms.find((room) => room.kind === "boss")!.key);
      expect(path).toContain(rooms.find((room) => room.prize)!.key);
      expect(path).toContain(graph.entrance);
    });

    it("is filed under the id the registry knows it by", () => {
      expect(TEMPLE_METADATA[id].id).toBe(id);
      expect(shipped[id].id ?? id).toBe(id);
    });
  });
});

describe("the shipped temples as quest rooms", () => {
  it("name the size each temple should come to, from section 11 (a classic temple's follows its dungeon)", () => {
    const pinned = IDS.filter((id) => !CLASSIC.includes(id)).sort();
    expect(Object.keys(TEMPLE_SIZE).sort()).toEqual(pinned);
    expect(Object.keys(COMBAT_ROOMS).sort()).toEqual(pinned);
  });

  describe.each(IDS)("%s", (id) => {
    const layout = registered(id);
    const graph = buildTempleGraph(layout);
    const [monsterCount, minibossCount, bossCount] = combatCountsOf(id);
    const theme = id.replace("-temple", "");
    const rooms = COMBAT_TYPES.flatMap((tier) => combatRooms(graph, tier));
    const templates = rooms.map(templateOf);
    const isClassic = CLASSIC.includes(id);
    /** A classic temple's side rooms repeat a must-clear beast: the rules of "once" and "easiest first" read its sealed rooms */
    const sealed = (room: GraphRoom): boolean => !isClassic || room.room.content?.lockOnEnter === true;

    it("has the combat rooms of the theme map: monsters, minibosses and one boss", () => {
      expect(combatRooms(graph, "monster")).toHaveLength(monsterCount);
      expect(combatRooms(graph, "miniboss")).toHaveLength(minibossCount);
      expect(combatRooms(graph, "boss")).toHaveLength(bossCount);
    });

    it("gives every combat room a quest template, and no loose beast, monster type or room pay", () => {
      for (const { room } of rooms) {
        expect(room.content?.quest).toEqual(expect.objectContaining({ beastId: expect.any(String), difficulty: expect.any(Number), basicSchedule: expect.any(String) }));
        expect(room.content?.questId).toBeUndefined();
        expect(room.content?.monsterType).toBeUndefined();
        expect(room.content?.xp).toBeUndefined();
        expect(room.content?.gp).toBeUndefined();
        expect(room.content?.ap).toBeUndefined();
        expect(room.content?.beasts ?? []).toEqual([]);
      }
    });

    it("keeps to the theme: every beast is a library beast of this temple's theme, used once (a classic temple: once per sealed room)", () => {
      const once = rooms.filter(sealed).map((room) => templateOf(room).beastId);
      expect(new Set(once).size).toBe(once.length);
      const ids = templates.map((template) => template.beastId);
      for (const beastId of ids) {
        const beast = BEAST_LIBRARY.find((entry) => entry.id === beastId);
        expect({ beastId, known: Boolean(beast) }).toEqual({ beastId, known: true });
        expect({ beastId, theme: beast!.theme }).toEqual({ beastId, theme });
      }
    });

    it("matches the tier of every template to the type of its room, on the Fibonacci scale", () => {
      for (const room of rooms) {
        const { difficulty } = templateOf(room);
        expect(FIBONACCI).toContain(difficulty);
        expect({ beast: templateOf(room).beastId, tier: questTier(difficulty) }).toEqual({ beast: templateOf(room).beastId, tier: room.kind });
      }
    });

    it("gives every template a schedule by the rules: daily 19:00 (am 08:00, bed 20:30), school weekdays, weekly 18:00, monthly", () => {
      for (const template of templates) {
        expect({ beast: template.beastId, ok: followsScheduleRules(template) }).toEqual({ beast: template.beastId, ok: true });
        expect(template.estimatedMinutes).toBeUndefined();
        if (template.timesOfDay) expect(template.basicSchedule).toBe("daily");
      }
    });

    it("wakes into a quest the board can schedule on a Monday", () => {
      const monday = mondayOf(new Date(2026, 9, 14));
      for (const template of templates) {
        const quest = questFromTemplate(id, template, ["hero"], "Chore", monday);
        expect({ beast: template.beastId, window: Boolean(getQuestWindow(quest, monday)) }).toEqual({ beast: template.beastId, window: true });
      }
    });

    it("puts the easier monster quests in the rooms nearest the entrance", () => {
      const monsterDifficulties = combatRooms(graph, "monster")
        .filter(sealed)
        .map((room) => templateOf(room).difficulty);
      expect(monsterDifficulties).toEqual([...monsterDifficulties].sort((a, b) => a - b));
    });

    it("comes to a full temple: the quests add up to the size of the theme map, 21 or more", () => {
      const share = templeSize(rooms.map((room) => ({ difficulty: templateOf(room).difficulty, dormant: true })));
      expect(share.total).toBe(sizeOf(id));
      expect(share.total).toBeGreaterThanOrEqual(TEMPLE_FULL_SIZE);
      expect(share.isFull).toBe(true);
    });

    it("passes the audit with its size check too, every template counted as asleep", () => {
      const sized = auditTemple(layout, { sizeOf: templateSize });
      expect(sized.passed).toBe(true);
      expect(auditSummary(sized)).toBe(`${sized.checks.length} of ${sized.checks.length} checks passed`);
      expect(sized.checks.find((check) => check.id === "size")).toMatchObject({ ok: true, detail: `Size ${sizeOf(id)} of ${TEMPLE_FULL_SIZE} · ${sizeOf(id)} if woken` });
    });

    it("is filled at once by the starter quests section 12 names (by beast or by the library's suggestion), and by no other", () => {
      const wanted = STARTER_MATCHES[id] ?? [];
      const filled = rooms
        .map((room) => resolveRoomQuest(room.room, "hero", [], STARTER_QUESTS))
        .flatMap((resolution) => (resolution.kind === "quest" ? [resolution.quest.id] : []));
      // A classic temple's side rooms repeat a beast, so one starter quest can fill several rooms
      expect([...new Set(filled)].sort()).toEqual([...wanted].sort());
    });
  });
});

// The temples dressed from a classic dungeon (tools/temples/classic/dress.ts) are checked in ClassicTemples.spec.ts

describe("the regenerated temples", () => {
  it("are every shipped temple but the hand-made Wind Temple and the classic dungeon temples: the ones regenerate.ts plans", () => {
    expect(REGENERATED.slice().sort()).toEqual(SHIPPED_IDS.slice().sort());
    expect(REGENERATED).not.toContain("storm-temple");
  });

  describe.each(REGENERATED)("%s", (id) => {
    const layout = registered(id);
    const graph = buildTempleGraph(layout);
    const rooms = [...graph.rooms.values()];

    it("is spread over several floors with a short run on each", () => {
      expect(graph.floors).toHaveLength(FLOORS[id]);
      for (const floor of graph.floors) {
        const count = roomsOn(graph, floor).length;
        expect(count).toBeGreaterThanOrEqual(8);
        expect(count).toBeLessThanOrEqual(14);
      }
    });

    it("starts on the ground floor, and a flight of stairs joins each floor to the next", () => {
      expect(shipped[id].entrance).toHaveLength(3);
      expect(shipped[id].entrance[0]).toBe(0);
      graph.floors.slice(0, -1).forEach((floor, index) => {
        const next = graph.floors[index + 1];
        const up = graph.doors.filter((door) => door.kind === "stairs" && graph.rooms.get(door.from)!.ref.floor === floor && graph.rooms.get(door.to)!.ref.floor === next);
        const down = graph.doors.filter((door) => door.kind === "stairs" && graph.rooms.get(door.from)!.ref.floor === next && graph.rooms.get(door.to)!.ref.floor === floor);
        expect(up.length).toBeGreaterThanOrEqual(1);
        expect(down.length).toBeGreaterThanOrEqual(1);
      });
    });

    it("keeps the Master Room under its own name and the mini-boss on the way", () => {
      const placed = Object.values(shipped[id].maze as Record<string, string[][]>)
        .flat(2)
        .map((token) => shipped[id].rooms[token]?.type);
      expect(placed.filter((type) => type === "master")).toHaveLength(1);
      expect(placed.filter((type) => type === "miniboss")).toHaveLength(1);
      expect(placed.filter((type) => type === "boss")).toHaveLength(1);
    });

    it("hands out at least as many small keys as it has small locks", () => {
      const keys = rooms.reduce((sum, room) => sum + room.smallKeys, 0);
      const locks = graph.doors.filter((door) => door.lock === "small").length;
      expect(locks).toBeGreaterThanOrEqual(1);
      expect(keys).toBeGreaterThanOrEqual(locks);
    });

    it("keeps the registry's element on its boss and a quest template on every monster room", () => {
      const boss = rooms.find((room) => room.kind === "boss")!;
      expect(boss.room.content?.element).toBe(TEMPLE_METADATA[id].element);
      const monsters = rooms.filter((room) => room.kind === "monster");
      expect(monsters.length).toBeGreaterThanOrEqual(3);
      for (const room of monsters) expect(room.room.content?.quest?.beastId).toEqual(expect.any(String));
    });

    it("keeps its relic in a chest", () => {
      const held = rooms.filter((room) => room.room.type === "loot" && room.room.content?.chest === "dungeon").map((room) => room.room.content?.dungeon);
      expect(held).toEqual(expect.arrayContaining(RELICS[id]));
    });

    it("is exactly what tools/temples/regenerate.ts writes from its seed", () => {
      const file = readFileSync(join(__dirname, "../../src/lib/engine/temples", `${id}.ts`), "utf8");
      expect(file).toBe(renderShippedModule(id, generateShipped(id)));
      expect(file).toContain(`// seed: "${id}"`);
    });

    it("breaks no rule of the Temple Generation Contract", () => {
      expect(solveTemple(layout).reasons).toEqual([]);
    });
  });
});

describe("the generator defaults the shipped temples are made with", () => {
  const options = { theme: "Kitchen", size: "small" as const, floors: 2 as const, locks: 1 as const };
  const typed = (temple: { rooms: Record<string, { type: string }> }, type: string) => Object.values(temple.rooms).filter((room) => room.type === type);
  const keyInMiniboss = (temple: { rooms: Record<string, { type: string; content?: Record<string, any> }> }) =>
    Object.values(temple.rooms).some((room) => room.type === "miniboss" && room.content?.dungeon === "master-key");

  it("name the Pegasus chamber a Master Room unless told not to", () => {
    const named = generateTemple("master-room", options);
    const plain = generateTemple("master-room", { ...options, masterRoom: false });
    expect(typed(named, "master")).toHaveLength(1);
    expect(typed(named, "master")[0]).toMatchObject({ content: { chest: "dungeon", pegasus: true } });
    expect(typed(plain, "master")).toHaveLength(0);
    expect(Object.values(plain.rooms).filter((room) => room.content?.pegasus)).toHaveLength(1);
    expect(solveTemple(named).reasons).toEqual([]);
    expect(solveTemple(plain).reasons).toEqual([]);
  });

  it("put the Boss Key in a chest of its own, so every temple passes the audit with no flags", () => {
    for (const size of ["small", "medium", "large"] as const) {
      for (let seed = 1; seed <= 8; seed++) {
        const temple = generateTemple(`default-${seed}`, { theme: "Kitchen", size });
        expect(keyInMiniboss(temple)).toBe(false);
        expect({ size, seed, passed: auditTemple(temple).passed }).toEqual({ size, seed, passed: true });
      }
    }
  });

  it("never put the Boss Key in the mini-boss room, whatever the ignored bossKeyChest option says (play gives no chest there)", () => {
    const seeds = Array.from({ length: 12 }, (_, i) => generateTemple(`older-${i + 1}`, { ...options, bossKeyChest: false, masterRoom: false }));
    expect(seeds.some(keyInMiniboss)).toBe(false);
    for (const temple of seeds) expect(auditTemple(temple).passed).toBe(true);
  });

  it("find the Boss Key in a loot chest or a master Key room, and nowhere else: a mini-boss room's chest is not one", () => {
    const rooms = (extra: Record<string, any>) => ({
      maze: [["E", "m", "B", "M"]],
      rooms: { E: { type: "entrance" }, B: { type: "boss" }, M: { type: "master" }, m: { type: "miniboss", content: { lockOnEnter: true } }, ...extra },
    });
    const bossKey = (temple: ReturnType<typeof rooms>) => auditTemple(temple).checks.find((check) => check.id === "bossKey")!.ok;
    expect(bossKey(rooms({}))).toBe(false);
    expect(bossKey(rooms({ m: { type: "miniboss", content: { chest: "dungeon", dungeon: "master-key" } } }))).toBe(false);
    expect(bossKey(rooms({ m: { type: "loot", content: { chest: "dungeon", dungeon: "master-key" } } }))).toBe(true);
    expect(bossKey(rooms({ m: { type: "key", content: { keyId: "master" } } }))).toBe(true);
    expect(bossKey(rooms({ m: { type: "miniboss", content: { chest: "dungeon", dungeon: "key" } } }))).toBe(false);
    expect(bossKey(rooms({ B: { type: "boss", content: { chest: "dungeon", dungeon: "master-key" } } }))).toBe(false);
  });

  it("draw the Master Room as the Pegasus star in the preview", () => {
    const temple = generateTemple("preview", options);
    const token = Object.keys(temple.rooms).find((key) => temple.rooms[key].type === "master")!;
    expect(previewChar(temple, token)).toBe("*");
    expect(summarize(temple).hasPegasus).toBe(true);
  });

  it("carve as many rooms a floor as asked, loops and the Master Room on top", () => {
    for (let seed = 1; seed <= 12; seed++) {
      const temple = generateTemple(`rooms-${seed}`, { ...options, roomsPerFloor: 9 });
      for (const grid of Object.values(temple.maze)) {
        const count = grid.flat().filter((token) => token !== "_").length;
        expect(count).toBeGreaterThanOrEqual(8);
        expect(count).toBeLessThanOrEqual(14);
      }
    }
  });

  it("give the same temple for the same seed", () => {
    expect(generateTemple("again", { ...options, roomsPerFloor: 9 })).toEqual(generateTemple("again", { ...options, roomsPerFloor: 9 }));
  });
});
