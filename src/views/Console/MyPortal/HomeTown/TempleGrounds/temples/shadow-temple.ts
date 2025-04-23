// filepath: /Users/xopher/www/x/do-it-for-the-xp/src/views/Console/MyPortal/HomeTown/TempleGrounds/temples/shadow-temple.ts
import {
  _00_,
  O__O,
  K___,
  H__P,
  M__P,
  q__q,
  $__$,
  x__x,
  X__X,
  ____,
  SHOP,
  TELE,
  _XX_,
  PUZL,
  GATE,
  MK__,
} from "@/dungeons/roomTypes";

// Reused constants for common room types
const LMAP = "LMAP"; // Map room
const LCOM = "LCOM"; // Compass room
const K001 = "K001"; // Key room

const shadowTemple = {
  entrance: [6, 2], // [row, column] - default to entrance
  maze: [
    [____, ____, $__$, ____, X__X, ____], // y: 0
    [____, _XX_, q__q, _XX_, ____, ____], // y: 1
    [____, LMAP, q__q, q__q, ____, ____], // y: 2
    [____, q__q, PUZL, q__q, ____, GATE], // y: 3
    [TELE, _XX_, q__q, _XX_, ____, ____], // y: 4
    [____, K___, x__x, LCOM, H__P, ____], // y: 5
    [____, ____, _00_, M__P, MK__, TELE], // y: 6
    //x:0, x: 1, x: 2, x: 3, x: 4, x: 5
  ],
  rooms: {
    [____]: { type: "wall" },
    [_00_]: { type: "entrance", visited: true, locked: { north: true } },
    [O__O]: { type: "empty" },
    [GATE]: { type: "gate", locked: { west: true } },
    [H__P]: { type: "health", content: { healthPoints: 15 } },
    [M__P]: { type: "mana", content: { magicPoints: 15 } },
    [X__X]: { type: "boss", content: { monsterType: "Shadowlord", element: "shadow" } },
    [q__q]: { type: "monster", content: { monsterType: "ShadowStalker" } },
    [_XX_]: { type: "trap", content: { trapType: "voidTrap", damage: 8 } },
    [TELE]: { type: "teleport" },
    [SHOP]: { type: "shop", content: { specialItem: "ShadowVeil" } },
    [x__x]: { type: "miniboss", content: { monsterType: "DarkPhantom" }, locked: { east: true } },
    [PUZL]: { type: "puzzle", content: { puzzleType: "shadowReflection" } },
    [$__$]: { type: "loot", content: { chest: "dungeon", dungeon: "Void Dagger" } },
    [K___]: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
    [K001]: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
    [MK__]: { type: "loot", content: { chest: "dungeon", dungeon: "master-key" } },
    [LMAP]: { type: "loot", content: { chest: "dungeon", dungeon: "map" } },
    [LCOM]: { type: "loot", content: { chest: "dungeon", dungeon: "compass" } },
  },
};

export default shadowTemple;