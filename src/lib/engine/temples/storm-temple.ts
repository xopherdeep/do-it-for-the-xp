// filepath: /Users/xopher/www/x/do-it-for-the-xp/src/app/Console/MyPortal/HomeTown/TempleGrounds/temples/storm-temple.ts
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
  MK__,
} from "@/lib/engine/dungeons/roomTypes";

// Reused constants for common room types
const LMAP = "LMAP"; // Map room
const LCOM = "LCOM"; // Compass room
const K001 = "K001"; // Key room
const PEGA = "PEGA"; // The Pegasus chest, behind the boss

const stormTemple = {
  entrance: [6, 1], // [row, column] - default to entrance
  maze: [
    [____, TELE, K001, ____, MK__, ____], // y: 0
    [____, _XX_, q__q, LMAP, x__x, ____], // y: 1
    [____, q__q, O__O, q__q, H__P, ____], // y: 2
    [____, _XX_, q__q, PUZL, M__P, ____], // y: 3
    [____, $__$, q__q, ____, X__X, PEGA], // y: 4
    [____, q__q, LCOM, q__q, ____, ____], // y: 5
    [____, _00_, O__O, SHOP, K___, TELE], // y: 6
    //x:0, x: 1, x: 2, x: 3, x: 4, x: 5
  ],
  rooms: {
    [____]: { type: "wall" },
    [_00_]: { type: "entrance", visited: true, locked: { north: true } },
    [O__O]: { type: "empty" },
    [H__P]: { type: "health", content: { healthPoints: 10 } },
    [M__P]: { type: "mana", content: { manaPoints: 10 } },
    [X__X]: { type: "boss", content: { lockOnEnter: true }, locked: { master: true } },
    [q__q]: { type: "monster", content: { monsterType: "small" } },
    [_XX_]: { type: "trap" },
    [PUZL]: { type: "puzzle" },
    [TELE]: { type: "teleport" },
    [SHOP]: { type: "shop" },
    [x__x]: { type: "miniboss", content: { lockOnEnter: true }, locked: { north: true } },
    [$__$]: { type: "loot", content: { chest: "dungeon", dungeon: "Lightning Rod" } },
    [PEGA]: { type: "loot", content: { chest: "dungeon", dungeon: "Pegasus Whistle", pegasus: true } },
    [K___]: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
    [K001]: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
    [MK__]: { type: "loot", content: { chest: "dungeon", dungeon: "master-key" } },
    [LMAP]: { type: "loot", content: { chest: "dungeon", dungeon: "map" } },
    [LCOM]: { type: "loot", content: { chest: "dungeon", dungeon: "compass" } },
  },
}

export default stormTemple
