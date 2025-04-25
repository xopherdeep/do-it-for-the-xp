// filepath: /Users/xopher/www/x/do-it-for-the-xp/src/views/Console/MyPortal/HomeTown/TempleGrounds/temples/water-temple.ts
import {
  _00_,
  O__O,
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
} from "@/dungeons/roomTypes";

// Custom room types for water temple
const LMAP = "LMAP"; // Map room
const LCOM = "LCOM"; // Compass room
const K001 = "K001"; // Key room for Door 1
const K002 = "K002"; // Key room for Door 2
const K003 = "K003"; // Key room for Door 3
const D001 = "D001"; // Door 1 - requires Key 1
const D002 = "D002"; // Door 2 - requires Key 2
const D003 = "D003"; // Door 3 - requires Key 3
const MK__ = "MK__"; // Master key room - unlocks boss room

const waterTemple = {
  entrance: [6, 2], // [row, column] - default to entrance
  maze: [
    [____, ____, K002, ____, ____, ____], // y: 0
    [____, _XX_, q__q, _XX_, ____, ____], // y: 1
    [____, q__q, D002, q__q, X__X, ____], // y: 2
    [____, PUZL, H__P, K003, D003, ____], // y: 3
    [TELE, q__q, D001, q__q, ____, ____], // y: 4
    [____, LMAP, LCOM, _XX_, M__P, ____], // y: 5
    [____, K001, _00_, SHOP, MK__, TELE], // y: 6
    //x:0, x: 1, x: 2, x: 3, x: 4, x: 5
  ],
  rooms: {
    [____]: { type: "wall" },
    [_00_]: { type: "entrance", visited: true, locked: { north: true } },
    [O__O]: { type: "empty" },
    [H__P]: { type: "health", content: { healthPoints: 15 } },
    [M__P]: { type: "mana", content: { magicPoints: 15 } },
    [X__X]: { type: "boss", content: { monsterType: "Leviathan", element: "water" }, locked: { west: true } },
    [q__q]: { type: "monster", content: { monsterType: "WaterElemental" } },
    [_XX_]: { type: "trap", content: { trapType: "whirlpool", damage: 5 } },
    [TELE]: { type: "teleport", content: { destination: "random" } },
    [SHOP]: { type: "shop", content: { specialItem: "WaterBreathingPotion" } },
    [x__x]: { type: "miniboss", content: { monsterType: "GiantSquid" } },
    [PUZL]: { type: "puzzle", content: { puzzleType: "waterLevels" } },
    [$__$]: { type: "loot", content: { chest: "dungeon", dungeon: "Trident of Tides" } },
    
    // Keys that unlock specific doors
    [K001]: { type: "key", content: { keyId: "key1", keyName: "Blue Water Key" } },
    [K002]: { type: "key", content: { keyId: "key2", keyName: "Coral Key" } },
    [K003]: { type: "key", content: { keyId: "key3", keyName: "Pearl Key" } },
    
    // Locked doors that require specific keys
    [D001]: { type: "door", locked: { north: true }, content: { keyRequired: "key1", doorName: "Blue Water Door" } },
    [D002]: { type: "door", locked: { north: true }, content: { keyRequired: "key2", doorName: "Coral Door" } },
    [D003]: { type: "door", locked: { west: true }, content: { keyRequired: "key3", doorName: "Pearl Door" } },
    
    [MK__]: { type: "key", content: { keyId: "master", keyName: "Trident Key" } },
    [LMAP]: { type: "loot", content: { chest: "dungeon", dungeon: "map" } },
    [LCOM]: { type: "loot", content: { chest: "dungeon", dungeon: "compass" } },
  },
  // Progression hints to help players understand the puzzle flow
  hints: [
    "The Blue Water Key unlocks the path to the upper temple",
    "Find the Coral Key in the upper level to access the middle chamber",
    "The Pearl Key is guarded by water elementals",
    "Only with the Trident Key can you challenge Leviathan"
  ]
};

export default waterTemple;