const _____ = "_____";
const _00__ = "_00__";
const T0100 = "T0100";
const L0200 = "L0200";
const M0201 = "M0201";
const B0401 = "B0401";
const R0501 = "R0501";
const S0002 = "S0002";
const M0102 = "M0102";
const L0202 = "L0202";
const M0302 = "M0302";
const m0402 = "m0402";
const R0103 = "R0103";
const M0203 = "M0203";
const L0303 = "L0303";
const L0503 = "L0503";
const M0204 = "M0204";
const M0404 = "M0404";
const m0504 = "m0504";
const L0105 = "L0105";
const M0305 = "M0305";
const T0505 = "T0505";

const windtemple = {
  id: "wind-temple",
  name: "Wind Temple",
  entrance: [5, 2],
  maze: {
    "1F": [
      [_____, T0100, L0200, _____, _____, _____], // y: 0
      [_____, _____, M0201, _____, B0401, R0501], // y: 1
      [S0002, M0102, L0202, M0302, m0402, _____], // y: 2
      [_____, R0103, M0203, L0303, _____, L0503], // y: 3
      [_____, _____, M0204, _____, M0404, m0504], // y: 4
      [_____, L0105, _00__, M0305, _____, T0505], // y: 5
    ],
  },
  rooms: {
    [_____]: { type: "wall", content: { beasts: [] }, sides: { north: "door", east: "door", south: "door", west: "door" } },
    [_00__]: { type: "entrance", visited: true, content: { beasts: [] }, sides: { north: "locked", east: "door", south: "door", west: "door" } },
    [T0100]: { type: "teleport", content: { beasts: [], targetLevel: "1F", targetCoords: { x: 0, y: 0 } }, sides: { north: "door", east: "door", south: "door", west: "door" } },
    [L0200]: { type: "loot", content: { beasts: [], chest: "dungeon", dungeon: "small-key", gold: 40, isMimic: false, mimicType: "random" }, sides: { north: "door", east: "door", south: "door", west: "door" } },
    [M0201]: { type: "monster", content: { beasts: [], quest: { beastId: "beast-cushion-croc", difficulty: 1, basicSchedule: "daily", dueByTime: "19:00" } }, sides: { north: "door", east: "door", south: "door", west: "door" } },
    [B0401]: { type: "boss", content: { lockOnEnter: true, beasts: [], quest: { beastId: "beast-fluffalo", difficulty: 8, basicSchedule: "weekly", dueByTime: "18:00" } }, sides: { north: "door", east: "masterlocked", south: "masterlocked", west: "door" } },
    [R0501]: { type: "master", content: { beasts: [] }, sides: { north: "door", east: "door", south: "door", west: "masterlocked" } },
    [S0002]: { type: "shop" },
    [M0102]: { type: "monster", content: { beasts: [], quest: { beastId: "beast-gravel-gnome", difficulty: 2, basicSchedule: "weekly", dueByTime: "18:00" } }, sides: { north: "door", east: "door", south: "door", west: "door" } },
    [L0202]: { type: "loot", content: { chest: "dungeon", dungeon: "compass" } },
    [M0302]: { type: "monster", content: { beasts: [], quest: { beastId: "beast-crumb-crawler", difficulty: 2, basicSchedule: "daily", dueByTime: "19:00" } }, sides: { north: "door", east: "door", south: "door", west: "door" } },
    [m0402]: { type: "miniboss", locked: { north: true }, sides: { north: "masterlocked", east: "door", south: "door", west: "door" }, content: { beasts: [], quest: { beastId: "beast-dust-bunny-king", difficulty: 3, basicSchedule: "weekly", dueByTime: "18:00" } } },
    [R0103]: { type: "empty", content: { beasts: [] }, sides: { north: "door", east: "door", south: "door", west: "door" } },
    [M0203]: { type: "monster", content: { beasts: [], quest: { beastId: "beast-mailbox-mimic", difficulty: 1, basicSchedule: "daily", dueByTime: "19:00" } }, sides: { north: "door", east: "door", south: "door", west: "door" } },
    [L0303]: { type: "loot", content: { chest: "dungeon", dungeon: "map" } },
    [L0503]: { type: "loot", content: { chest: "dungeon", dungeon: "master-key", beasts: [] }, sides: { north: "door", east: "door", south: "locked", west: "door" } },
    [M0204]: { type: "monster", content: { beasts: [], quest: { beastId: "beast-spill-sprite", difficulty: 1, basicSchedule: "daily", dueByTime: "19:00" } }, sides: { north: "door", east: "door", south: "door", west: "door" } },
    [M0404]: { type: "key", content: { monsterType: "small", beasts: [] }, sides: { north: "door", east: "door", south: "door", west: "door" } },
    [m0504]: { type: "miniboss", locked: { north: true }, sides: { north: "locked", east: "door", south: "door", west: "door" }, content: { beasts: [], quest: { beastId: "beast-cobweb-widow", difficulty: 3, basicSchedule: "weekly", dueByTime: "18:00" } } },
    [L0105]: { type: "loot", content: { chest: "dungeon", dungeon: "key", beasts: [] }, sides: { north: "door", east: "door", south: "door", west: "door" } },
    [M0305]: { type: "monster", content: { beasts: [], quest: { beastId: "beast-mustwisp", difficulty: 1, basicSchedule: "daily", dueByTime: "08:00" } }, sides: { north: "door", east: "door", south: "door", west: "door" } },
    [T0505]: { type: "teleport", content: { beasts: [] }, sides: { north: "door", east: "door", south: "door", west: "door" } },
  },
};

export default windtemple;
