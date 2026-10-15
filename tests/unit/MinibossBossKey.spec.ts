/**
 * A key written into a room that has no chest is never handed out in play: the engine makes chests for loot rooms
 * only, and a loot room holds a dungeon item only when its chest is a Dungeon Item chest. The audit and the solver
 * count what play grants (src/lib/services/temples/roomGrants.ts), so an older copy that keeps the Boss Key in the
 * mini-boss room's chest is called unfinishable instead of being offered to a hero who would wait for a key that
 * never comes (docs/Temple-Generation-Contract.md R4).
 */
import { DungeonManager } from "@/lib/engine/core/dungeons/DungeonManager";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { buildTempleGraph, solveTemple, type TempleLayout } from "@/lib/engine/dungeons/generator";
import { chestDungeonItem, grantsBossKey, smallKeysGranted } from "@/lib/services/temples/roomGrants";
import { auditTemple } from "@/lib/services/temples/templeAudit";

const _ = "_";

const BOSS_KEY_CHEST = { chest: "dungeon", dungeon: "master-key" };

/** The hero walks east: the entrance, the mini-boss, the barred boss door, the boss, the Pegasus chest. The key room, when there is one, lies past the mini-boss. */
const rooms = (miniboss: Room["content"] = { lockOnEnter: true }, keyRoom: Room = { type: "loot", content: BOSS_KEY_CHEST }): Record<string, Room> => ({
  [_]: { type: "wall" },
  E001: { type: "entrance", visited: true },
  R001: { type: "empty" },
  R002: { type: "empty" },
  b001: { type: "miniboss", content: miniboss },
  B001: { type: "boss", content: { lockOnEnter: true }, locked: { master: true } },
  P001: { type: "master", content: { chest: "dungeon", dungeon: "Pegasus", pegasus: true } },
  MK01: keyRoom,
});

const GRID = [
  [_, _, _, "MK01", _, _],
  ["E001", "R001", "b001", "R002", "B001", "P001"],
];

const layout = (miniboss?: Room["content"], keyRoom?: Room): TempleLayout => ({ entrance: [1, 0], maze: GRID, rooms: rooms(miniboss, keyRoom) });

/** An older copy: the key is in the mini-boss room's chest and the key room is gone */
const older = (): TempleLayout => ({ ...layout({ lockOnEnter: true, ...BOSS_KEY_CHEST }), maze: GRID.map((row) => row.map((token) => (token === "MK01" ? _ : token))) });

describe("roomGrants: what play hands out", () => {
  it("a loot room with a Dungeon Item chest holds that item, by the id the take path knows", () => {
    expect(chestDungeonItem({ type: "loot", content: BOSS_KEY_CHEST })).toBe("master-key");
    expect(chestDungeonItem({ type: "loot", content: { chest: "dungeon", dungeon: "small-key" } })).toBe("key");
  });

  it("no other room, and no other chest, holds a dungeon item", () => {
    expect(chestDungeonItem({ type: "miniboss", content: BOSS_KEY_CHEST })).toBe("");
    expect(chestDungeonItem({ type: "boss", content: BOSS_KEY_CHEST })).toBe("");
    expect(chestDungeonItem({ type: "master", content: BOSS_KEY_CHEST })).toBe("");
    expect(chestDungeonItem({ type: "loot", content: { chest: "treasure", dungeon: "master-key" } })).toBe("");
    expect(chestDungeonItem({ type: "loot", content: { dungeon: "master-key" } })).toBe("");
    expect(chestDungeonItem(undefined)).toBe("");
  });

  it("the Boss Key comes from a chest holding it or a Key room that is the master's, never from a fight room", () => {
    expect(grantsBossKey({ type: "loot", content: BOSS_KEY_CHEST })).toBe(true);
    expect(grantsBossKey({ type: "key", content: { keyId: "master" } })).toBe(true);
    expect(grantsBossKey({ type: "miniboss", content: BOSS_KEY_CHEST })).toBe(false);
    expect(grantsBossKey({ type: "key", content: { keyId: "key1" } })).toBe(false);
    expect(grantsBossKey({ type: "loot", content: { chest: "dungeon", dungeon: "key" } })).toBe(false);
  });

  it("small keys: a key chest, the key rows of a loot room, a Key room; nothing from a room without a chest", () => {
    expect(smallKeysGranted({ type: "loot", content: { chest: "dungeon", dungeon: "key" } })).toBe(1);
    expect(smallKeysGranted({ type: "loot", content: { chest: "treasure", items: ["key", "potion", "key"] } })).toBe(2);
    expect(smallKeysGranted({ type: "key", content: { keyId: "key1" } })).toBe(1);
    expect(smallKeysGranted({ type: "key", content: { keyId: "master" } })).toBe(0);
    expect(smallKeysGranted({ type: "loot", content: { chest: "treasure", dungeon: "key" } })).toBe(0);
    expect(smallKeysGranted({ type: "miniboss", content: { chest: "dungeon", dungeon: "key", items: ["key"] } })).toBe(0);
  });
});

describe("a Boss Key in the mini-boss room's chest", () => {
  it("the solver does not count it: the older copy is unsolvable, the same temple with a key room is not", () => {
    const stuck = solveTemple(older());
    expect(stuck.solvable).toBe(false);
    expect(stuck.reasons).toEqual(expect.arrayContaining([expect.stringMatching(/^R2: the master key is out of reach/)]));
    expect(buildTempleGraph(older()).rooms.get("1F:1,2")).toMatchObject({ kind: "miniboss", masterKey: false });

    expect(solveTemple(layout())).toMatchObject({ solvable: true, reasons: [] });
    expect(buildTempleGraph(layout()).rooms.get("1F:0,3")).toMatchObject({ masterKey: true });
  });

  it("the solver does not count a small key a loot room names under another chest", () => {
    const graph = buildTempleGraph(layout({ lockOnEnter: true }, { type: "loot", content: { chest: "treasure", dungeon: "key" } }));
    expect(graph.rooms.get("1F:0,3")).toMatchObject({ smallKeys: 0, masterKey: false });
  });

  it("the audit does not find the Boss Key there, and finds it in a chest", () => {
    const bossKey = (temple: TempleLayout) => auditTemple(temple).checks.find((check) => check.id === "bossKey")!.ok;
    expect(bossKey(older())).toBe(false);
    expect(bossKey(layout())).toBe(true);
    expect(bossKey(layout({ lockOnEnter: true }, { type: "key", content: { keyId: "master" } }))).toBe(true);
    expect(bossKey(layout({ lockOnEnter: true }, { type: "loot", content: { dungeon: "master-key" } }))).toBe(false);
  });

  it("the engine makes no chest for the mini-boss room, and a Dungeon Item chest holds the item only under chest 'dungeon'", () => {
    const manager = DungeonManager.getInstance();
    const id = "miniboss-boss-key-spec";
    const rooms = { ...older().rooms, T001: { type: "loot", content: { chest: "treasure", dungeon: "key" } }, MK02: { type: "loot", content: BOSS_KEY_CHEST } };
    manager.registerDungeon({ id, name: id, maze: [["E001", "b001", "T001", "MK02"]], rooms, visitedPositions: new Set<string>() });

    expect(manager.getRoom(id, [0, 1])?.content?.chestId).toBeUndefined();
    expect(manager.openChestInRoom(id, [0, 1])).toBeUndefined();
    expect(manager.openChestInRoom(id, [0, 2])?.dungeon).toBeUndefined();
    expect(manager.openChestInRoom(id, [0, 3])?.dungeon).toBe("master-key");
  });
});
