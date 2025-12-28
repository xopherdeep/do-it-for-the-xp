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
} from "@/lib/engine/dungeons/roomTypes";

const LMAP = "LMAP";
const LCOM = "LCOM";
const K001 = "K001";
const windTemple = {
  id: "wind-temple",
  name: "Wind Temple",
  entrance: [1, 5, 2], // [Floor Index (1F is index 1), row, column]
  maze: {
    "2F": [
      [____, TELE, ____, ____, ____, ____],
      [____, ____, ____, ____, X__X, $__$],
    ],
    "1F": [
      [____, ____, ____, ____, ____, ____],
      [____, ____, q__q, ____, ____, ____],
      [SHOP, q__q, LCOM, q__q, x__x, ____],
      [____, O__O, q__q, LMAP, ____, $__$],
      [____, ____, q__q, ____, q__q, x__x],
      [____, K___, _00_, q__q, ____, TELE],
    ],
    "B1": [
      [____, ____, ____, ____, ____, ____],
      [____, ____, ____, ____, ____, ____],
      [____, ____, ____, ____, ____, ____],
      [____, ____, ____, ____, ____, ____],
      [____, K001, ____, ____, ____, ____],
    ]
  },
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