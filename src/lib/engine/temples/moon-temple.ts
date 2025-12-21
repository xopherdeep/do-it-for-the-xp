// filepath: /Users/xopher/www/x/do-it-for-the-xp/src/views/Console/MyPortal/HomeTown/TempleGrounds/temples/moon-temple.ts
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
} from "@/lib/engine/dungeons/roomTypes";

// Reused constants for common room types
const LMAP = "LMAP"; // Map room
const LCOM = "LCOM"; // Compass room
const K001 = "K001"; // Key room
const K002 = "K002"; // Key room 2
const MSHR = "MSHR"; // Moon shrine special room

const moonTemple = {
  entrance: [4, 3], // [row, column] - default to entrance
  maze: [
    [____, ____, K001, ____, ____, ____], // y: 0
    [____, q__q, H__P, q__q, ____, ____], // y: 1
    [____, $__$, O__O, _XX_, LMAP, ____], // y: 2
    [K002, O__O, PUZL, O__O, LCOM, ____], // y: 3
    [____, x__x, O__O, _00_, q__q, ____], // y: 4
    [____, MSHR, O__O, _XX_, TELE, ____], // y: 5
    [____, X__X, SHOP, q__q, M__P, ____], // y: 6
    //x:0, x: 1, x: 2, x: 3, x: 4, x: 5
  ],
  rooms: {
    [____]: { type: "wall" },
    [_00_]: { type: "entrance", visited: true },
    [O__O]: { type: "empty" },
    [H__P]: { type: "health", content: { healthPoints: 10 } },
    [M__P]: { type: "mana", content: { manaPoints: 10 } },
    [X__X]: { type: "boss", locked: { east: true } },
    [q__q]: { type: "monster", content: { monsterType: "small" } },
    [_XX_]: { type: "trap" },
    [PUZL]: { type: "puzzle" },
    [TELE]: { type: "teleport" },
    [SHOP]: { type: "shop" },
    [x__x]: { type: "miniboss", locked: { east: true } },
    [$__$]: { type: "loot", content: { chest: "dungeon", dungeon: "Lunar Pendant" } },
    [K___]: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
    [K001]: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
    [K002]: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
    [LMAP]: { type: "loot", content: { chest: "dungeon", dungeon: "map" } },
    [LCOM]: { type: "loot", content: { chest: "dungeon", dungeon: "compass" } },
    [MSHR]: { type: "loot", content: { chest: "dungeon", dungeon: "Moon Shard" } },
  },
}

export default moonTemple