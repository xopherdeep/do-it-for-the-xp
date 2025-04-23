// filepath: /Users/xopher/www/x/do-it-for-the-xp/src/views/Console/MyPortal/HomeTown/TempleGrounds/temples/ice-temple.ts
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

const iceTemple = {
  entrance: [6, 2], // [row, column] - default to entrance
  maze: [
    [____, ____, LMAP, ____, ____, ____], // y: 0
    [____, _XX_, q__q, _XX_, ____, ____], // y: 1
    [____, q__q, PUZL, q__q, X__X, ____], // y: 2
    [TELE, H__P, _XX_, $__$, ____, GATE], // y: 3
    [____, q__q, x__x, q__q, ____, ____], // y: 4
    [____, LCOM, q__q, _XX_, K___, ____], // y: 5
    [____, ____, _00_, SHOP, MK__, TELE], // y: 6
    //x:0, x: 1, x: 2, x: 3, x: 4, x: 5
  ],
  rooms: {
    [____]: { type: "wall" },
    [_00_]: { type: "entrance", visited: true, locked: { north: true } },
    [O__O]: { type: "empty" },
    [GATE]: { type: "gate", locked: { west: true } },
    [H__P]: { type: "health", content: { healthPoints: 15 } },
    [M__P]: { type: "mana", content: { magicPoints: 15 } },
    [X__X]: { type: "boss", content: { monsterType: "FrostGiant", element: "ice" } },
    [q__q]: { type: "monster", content: { monsterType: "IceGolem" } },
    [_XX_]: { type: "trap", content: { trapType: "iceSpikes", damage: 6 } },
    [TELE]: { type: "teleport" },
    [SHOP]: { type: "shop", content: { specialItem: "FrostResistPotion" } },
    [x__x]: { type: "miniboss", content: { monsterType: "IceWyrm" }, locked: { east: true } },
    [PUZL]: { type: "puzzle", content: { puzzleType: "mirrorIce" } },
    [$__$]: { type: "loot", content: { chest: "dungeon", dungeon: "Frost Wand" } },
    [K___]: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
    [K001]: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
    [MK__]: { type: "loot", content: { chest: "dungeon", dungeon: "master-key" } },
    [LMAP]: { type: "loot", content: { chest: "dungeon", dungeon: "map" } },
    [LCOM]: { type: "loot", content: { chest: "dungeon", dungeon: "compass" } },
  },
};

export default iceTemple;