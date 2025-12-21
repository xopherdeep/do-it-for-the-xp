// filepath: /home/xopher/www/x/do-it-for-the-xp/src/views/MyPortal/HomeTown/TempleGrounds/temples/fire-temple.ts
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
} from "@/lib/engine/dungeons/roomTypes";

const LMAP = "LMAP";
const LCOM = "LCOM";
const K001 = "K001";
const FPIT = "FPIT"; // Fire pit special room
const MK__ = "MK__"; // Master key room

const fireTemple = {
  entrance: [6, 2], // [row, column] - default to entrance
  maze: [
    [____, ____, _XX_, $__$, ____, ____], // y: 0
    [____, K___, q__q, PUZL, ____, ____], // y: 1
    [____, q__q, H__P, q__q, x__x, ____], // y: 2
    [TELE, LMAP, FPIT, LCOM, FPIT, X__X], // y: 3
    [____, q__q, _XX_, q__q, ____, GATE], // y: 4
    [____, SHOP, q__q, M__P, ____, ____], // y: 5
    [____, ____, _00_, q__q, MK__, TELE], // y: 6
    //x:0, x: 1, x: 2, x: 3, x: 4, x: 5
  ],
  rooms: {
    [____]: { type: "wall" },
    [_00_]: { type: "entrance", visited: true, locked: { north: true } },
    [O__O]: { type: "empty" },
    [GATE]: { type: "gate", locked: { west: true } },
    [H__P]: { type: "health", content: { healthPoints: 10 } },
    [M__P]: { type: "mana", content: { magicPoints: 10 } },
    [X__X]: { type: "boss", content: { monsterType: "Ifrit", element: "fire" } },
    [q__q]: { type: "monster", content: { monsterType: "FireImp" } },
    [_XX_]: { type: "trap", content: { trapType: "fire", damage: 5 } },
    [TELE]: { type: "teleport" },
    [SHOP]: { type: "shop", content: { specialItem: "FireResistPotion" } },
    [x__x]: { type: "miniboss", content: { monsterType: "FireElemental" }, locked: { west: true } },
    [PUZL]: { type: "puzzle", content: { puzzleType: "fireSequence" } },
    [$__$]: { type: "loot", content: { chest: "dungeon", dungeon: "Flame Shield" } },
    [K___]: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
    [K001]: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
    [MK__]: { type: "loot", content: { chest: "dungeon", dungeon: "master-key" } },
    [LMAP]: { type: "loot", content: { chest: "dungeon", dungeon: "map" } },
    [LCOM]: { type: "loot", content: { chest: "dungeon", dungeon: "compass" } },
    [FPIT]: { type: "trap", content: { trapType: "lavaPool", damage: 8, avoidable: true } },
  },
};

export default fireTemple;