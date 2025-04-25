import {
  _00_,
  O__O,
  K___,
  H__P,
  q__q,
  $__$,
  x__x,
  X__X,
  ____,
  SHOP,
  TELE,
} from "@/dungeons/roomTypes";

const LMAP = "LMAP";
const LCOM = "LCOM";
const K001 = "K001";
const windTemple = {
  entrance: [5, 2], // [row, column] - default to entrance
  maze: [
    [____, TELE, K001, ____, ____, ____], // y: 0
    [____, ____, q__q, ____, X__X, $__$], // y: 1
    [SHOP, q__q, LCOM, q__q, x__x, ____], // y: 2
    [____, O__O, q__q, LMAP, ____, $__$], // y: 3
    [____, ____, q__q, ____, q__q, x__x], // y: 4
    [____, K___, _00_, q__q, ____, TELE], // y: 5
    //x:0, x: 1, x: 2, x: 3, x: 4, x: 5
  ],
  rooms: {
    [____]: { type: "wall" },
    [_00_]: { type: "entrance", visited: true, locked: { north: true } },
    [O__O]: { type: "empty" },
    [H__P]: { type: "health", content: { healthPoints: 10 } },
    [X__X]: { type: "boss" },
    [q__q]: { type: "monster", content: { monsterType: "small" } },
    [TELE]: { type: "teleport" },
    [SHOP]: { type: "shop" },
    [x__x]: { type: "miniboss", locked: { north: true } },
    [$__$]: { type: "loot", content: { chest: "dungeon", dungeon: "Pegasus Whistle" } },
    // [$__$]: { type: "loot", content: { chest: 'random', quantity: 1, items: ["potion", "ether"] } },
    [K___]: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
    [K001]: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
    [LMAP]: { type: "loot", content: { chest: "dungeon", dungeon: "map" } },
    [LCOM]: { type: "loot", content: { chest: "dungeon", dungeon: "compass" } },
    // [LOOT]: {
    //   "5,1": { type: "loot", content: { item: "key" } },
    //   "2,2": { type: "loot", content: { item: "map" } },
    //   "3,3": { type: "loot", content: { item: "compass" } },
    // },
  },
}

export default windTemple