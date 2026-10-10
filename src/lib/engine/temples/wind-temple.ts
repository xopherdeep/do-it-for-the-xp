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
  ST_U,
  ST_D,
  MK__,
} from "@/lib/engine/dungeons/roomTypes";

const LMAP = "LMAP";
const LCOM = "LCOM";
const K001 = "K001";
const PEGA = "PEGA"; // The Pegasus chest, behind the boss

// Floors run bottom to top: stairs up lead to the next floor in this list, a pit drops to the one before.
const windTemple = {
  id: "wind-temple",
  name: "Wind Temple",
  entrance: [1, 5, 2], // [Floor Index (1F is index 1), row, column]
  maze: {
    "B1": [
      [____, ____, ____, ____, ____, ____],
      [____, ____, ____, ____, ____, ____],
      [____, ____, ____, ____, ____, ____],
      [____, ST_U, ____, ____, ____, ____],
      [____, K001, ____, ____, ____, ____],
    ],
    "1F": [
      [____, ____, ____, ____, ____, ____],
      [____, ____, q__q, ____, ____, ____],
      [SHOP, q__q, LCOM, q__q, x__x, MK__],
      [____, ST_D, q__q, LMAP, ____, $__$],
      [____, ____, q__q, ____, ____, q__q],
      [____, K___, _00_, q__q, ____, TELE],
    ],
    "2F": [
      [____, ____, TELE, H__P, O__O, ____],
      [____, ____, ____, ____, X__X, PEGA],
    ],
  },
  rooms: {
    [____]: { type: "wall" },
    [_00_]: { type: "entrance", visited: true, locked: { north: true } },
    [O__O]: { type: "empty" },
    [H__P]: { type: "health", content: { healthPoints: 10 } },
    [X__X]: { type: "boss", content: { lockOnEnter: true }, locked: { master: true } },
    [q__q]: { type: "monster", content: { monsterType: "small" } },
    [TELE]: { type: "teleport" },
    [SHOP]: { type: "shop" },
    [ST_U]: { type: "stairs-up" },
    [ST_D]: { type: "stairs-down" },
    [x__x]: { type: "miniboss", content: { lockOnEnter: true } },
    [$__$]: { type: "loot", content: { chest: "random", quantity: 1, items: ["potion", "ether"] } },
    [PEGA]: { type: "loot", content: { chest: "dungeon", dungeon: "Pegasus Whistle", pegasus: true } },
    [K___]: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
    [K001]: { type: "loot", content: { chest: "dungeon", dungeon: "key" } },
    [MK__]: { type: "loot", content: { chest: "dungeon", dungeon: "master-key" } },
    [LMAP]: { type: "loot", content: { chest: "dungeon", dungeon: "map" } },
    [LCOM]: { type: "loot", content: { chest: "dungeon", dungeon: "compass" } },
  },
}

export default windTemple
