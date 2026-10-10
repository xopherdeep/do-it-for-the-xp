// filepath: /Users/xopher/www/x/do-it-for-the-xp/src/app/Console/MyPortal/HomeTown/TempleGrounds/temples/earth-temple.ts
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
} from "@/lib/engine/dungeons/roomTypes";

// Reused constants for common room types
const LMAP = "LMAP"; // Map room
const LCOM = "LCOM"; // Compass room
const K001 = "K001"; // Key room
const PEGA = "PEGA"; // The Pegasus chest, behind the boss

const earthTemple = {
  entrance: [6, 3], // [row, column] - default to entrance
  maze: [
    [____, ____, _XX_, K___, x__x, MK__], // y: 0
    [____, LMAP, q__q, q__q, $__$, ____], // y: 1
    [____, q__q, q__q, _XX_, ____, ____], // y: 2
    [____, PUZL, H__P, PUZL, X__X, PEGA], // y: 3
    [TELE, q__q, _XX_, q__q, ____, ____], // y: 4
    [____, M__P, LCOM, q__q, SHOP, ____], // y: 5
    [____, ____, ____, _00_, K001, TELE], // y: 6
    //x:0, x: 1, x: 2, x: 3, x: 4, x: 5
  ],
  rooms: {
    [____]: { type: "wall" },
    [_00_]: { type: "entrance", visited: true, locked: { north: true } },
    [O__O]: { type: "empty" },
    [GATE]: { type: "gate", locked: { west: true } },
    [H__P]: { type: "health", content: { healthPoints: 15 } },
    [M__P]: { type: "mana", content: { magicPoints: 15 } },
    [X__X]: { type: "boss", content: { monsterType: "Titan", element: "earth", lockOnEnter: true }, locked: { master: true } },
    [q__q]: { type: "monster", content: { monsterType: "RockGolem" } },
    [_XX_]: { type: "trap", content: { trapType: "rockfall", damage: 7 } },
    [TELE]: { type: "teleport" },
    [SHOP]: { type: "shop", content: { specialItem: "EarthquakeScroll" } },
    [x__x]: { type: "miniboss", content: { monsterType: "StoneGuardian", lockOnEnter: true } },
    [PUZL]: { type: "puzzle", content: { puzzleType: "stonePillars" } },
    [$__$]: { type: "loot", content: { chest: "dungeon", dungeon: "Gaia's Hammer" } },
    [PEGA]: { type: "loot", content: { chest: "dungeon", dungeon: "Pegasus Whistle", pegasus: true } },
    [K___]: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
    [K001]: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
    [MK__]: { type: "loot", content: { chest: "dungeon", dungeon: "master-key" } },
    [LMAP]: { type: "loot", content: { chest: "dungeon", dungeon: "map" } },
    [LCOM]: { type: "loot", content: { chest: "dungeon", dungeon: "compass" } },
  },
};

export default earthTemple;
