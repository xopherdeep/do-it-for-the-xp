/**
 * The Moving Day temple: the old house as a dungeon, built from a Moving House pack.
 *
 * Pure: no storage, no Vue. `buildMovingTemple(pack, answers)` turns the pack's quests into one temple record: the
 * front door is the entrance, the hall runs past a room for each room the family ticked (a bedroom for each hero who
 * plays, since the pack gives every hero a quest for their own stuff), the kitchen guards the chest that holds the Boss
 * Key, and "Load the Van" is the boss behind the one locked door. Every combat room holds its quest by `questId`
 * (docs/Quest-Rooms-Spec.md 5.2), so clearing the room completes the quest and the beast comes back with the quest.
 *
 * The record is a generated temple's (`gen-` id, a layout of floors of tokens and a `rooms` table), so the temple
 * screen, the music and the Game Master's temple list all know it. The layout is laid out by hand from the quests
 * rather than rolled by the seeded generator, because the rooms are the family's and must follow what they ticked;
 * the temple solver and the audit still say it can be finished (tests/unit/movingTemple.spec.ts).
 *
 * `movingTempleBackup` adds the temple to the pack's backup file, so it goes in with the pack's merge load: the same
 * id every time, so loading it again replaces only this one record.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { TempleInterface } from "@/lib/databases/TempleDb";
import type { Room, RoomContent } from "@/lib/engine/core/dungeons/types";
import { $__$, ____, CAMP, MK__, O__O, Q__Q, X__X, _00_, q__q, x__x } from "@/lib/engine/dungeons/roomTypes";
import { questTier, templeSize, type QuestTier } from "@/lib/services/temples/questRooms";
import type { BackupFile } from "@/lib/services/core/BackupService";
import { movingPackBackup } from "./movingPack";
import type { MovingAnswers, MovingHero, MovingPack, MovingRoomId } from "./movingPack";
import { packEntries, plural } from "./packCommon";
import type { PackBand } from "./packCommon";

/** The same every time, so loading the pack again replaces this temple and nothing else. The `gen-` prefix is what makes the screens know a temple that is not one of the nine. */
export const MOVING_TEMPLE_ID = "gen-move-house";
export const MOVING_TEMPLE_NAME = "The Old House";

export type MovingRoomType = "monster" | "miniboss" | "boss";

/** One combat room of the old house */
export interface MovingTempleRoom {
  /** The pack quest the room holds */
  questId: string;
  /** The room of the home it stands for: "Kitchen", "Dad's bedroom" */
  label: string;
  /** The quest's name */
  name: string;
  /** The room type in the layout: one boss, and every quest of 3 or more a sealed miniboss (the fight itself follows the quest's tier) */
  type: MovingRoomType;
  /** What the quest's difficulty makes it (questTier) */
  tier: QuestTier;
  difficulty: number;
  /** The chest with the Boss Key sits behind this room */
  guardsKey: boolean;
}

export interface MovingTemple {
  record: TempleInterface;
  /** The combat rooms, the boss last */
  rooms: MovingTempleRoom[];
  /** The difficulties of the rooms added up; 21 is a full temple */
  size: number;
}

// ---------------------------------------------------------------------------------------------------------------
// Which quest each room holds. A room holds the first of its quests the pack made (a family with no grown-up has no
// grown-up kitchen job, so its kitchen holds the kids' mugs instead); a room with none is left out.

interface HouseRoom {
  /** The rooms of the setup that make this room */
  rooms: MovingRoomId[];
  label: string;
  /** Pack quest slugs, the main packing job first */
  quests: string[];
  /** Lower guards the key first: the kitchen, then the garage, then the Open First Box (the family rooms) */
  guardRank?: number;
}

const GUARD_RANK = { kitchen: 0, garage: 1, family: 2 };

/** The rooms in the order the pack asks them to be packed: the quiet rooms first, the kitchen near the end. */
const QUIET_ROOMS: readonly HouseRoom[] = [
  { rooms: ["storage"], label: "Storage", quests: ["storage"] },
  { rooms: ["garage"], label: "Garage", quests: ["garage", "garage-gear"], guardRank: GUARD_RANK.garage },
  { rooms: ["guest"], label: "Guest room", quests: ["guest-room"] },
  { rooms: ["office"], label: "Home office", quests: ["office"] },
  { rooms: ["yard"], label: "Yard", quests: ["yard"] },
  { rooms: ["pets"], label: "Pet corner", quests: ["pets"] },
];

const LIVING_ROOMS: readonly HouseRoom[] = [
  { rooms: ["living", "dining"], label: "Living room", quests: ["living-dining", "game-shelf"] },
  { rooms: ["kitchen"], label: "Kitchen", quests: ["dishes", "pantry-fridge", "mugs"], guardRank: GUARD_RANK.kitchen },
  { rooms: ["bathroom"], label: "Bathroom", quests: ["bathrooms"] },
  { rooms: ["laundry"], label: "Laundry room", quests: ["laundry"] },
];

/** The quest each band packs its own bedroom with */
const BEDROOM_QUEST: Record<PackBand, string> = { little: "toys-little", kid: "dresser-kid", grownup: "closet-grownup" };

/** The whole-family jobs that are rooms of the house too, so the kids have something to fight in every part of it */
const FAMILY_ROOMS: readonly { label: string; quest: string; guardRank?: number }[] = [
  { label: "Front hall", quest: "open-first", guardRank: GUARD_RANK.family },
  { label: "Final walkthrough", quest: "walkthrough" },
];

const BOSS_QUEST = "load-van";

interface Slot {
  label: string;
  questId: string;
  /** What makes it the one that guards the key (HouseRoom.guardRank) */
  guardRank?: number;
}

const questIdOf = (slug: string, heroId?: string): string => (heroId ? `move-${slug}-${heroId}` : `move-${slug}`);

// ---------------------------------------------------------------------------------------------------------------
// The layout. One floor, four rows: the Boss Key's chest on top of the kitchen, the rooms along the north of the hall,
// the hall itself from the front door to the van, the rooms along its south.
//
//   row 0           .   .   .   K   .   .   .
//   row 1 (north)   .  r1  r3  [M] r7  r9   .  .
//   row 2 (hall)    E  map cmp  .   .   .  camp [boss] [master]
//   row 3 (south)   .  r2  r4  r6  r8  r10  .  .

const HALL_ROW = 2;
const NORTH_ROW = 1;
const SOUTH_ROW = 3;
const KEY_ROW = 0;
const ROW_COUNT = 4;
/** The hall is at least this long: the map and the compass are the first two rooms past the door and the camp is the last */
const MIN_HALL = 3;

const easyOrNormal = (difficulty: number): RoomContent["difficulty"] => (difficulty <= 1 ? "easy" : "normal");

/** The rooms of the maze with a token each, the way the generator names them: the type's letter and a counter */
class RoomTable {
  readonly rooms: Record<string, Room> = { [____]: { type: "wall" } };
  private readonly counters = new Map<string, number>();

  add(char: string, room: Room): string {
    const count = (this.counters.get(char) ?? 0) + 1;
    this.counters.set(char, count);
    const token = `${char}${String(count).padStart(3, "0")}`;
    this.rooms[token] = room;
    return token;
  }
}

const chest = (dungeon: string): Room => ({ type: "loot", content: { chest: "dungeon", dungeon } });

interface Placed {
  slot: Slot;
  quest: Achievement;
  row: number;
  col: number;
}

/** North or south of the hall, nearest the front door first; the rooms alternate so both sides fill evenly, and the guard is always on the north side (the key's chest hangs above it) */
const placeSlots = (slots: Slot[], guard: number, quests: Map<string, Achievement>): Placed[] => {
  const guardIsOnOddIndex = guard % 2 === 1;
  return slots.map((slot, index) => {
    const isNorth = (index % 2 === 1) === guardIsOnOddIndex;
    return { slot, quest: quests.get(slot.questId)!, row: isNorth ? NORTH_ROW : SOUTH_ROW, col: 1 + Math.floor(index / 2) };
  });
};

const questRoomOf = (quest: Achievement, type: MovingRoomType): { char: string; room: Room } => {
  const difficulty = Number(quest.difficulty) || 1;
  const content: RoomContent = { questId: String(quest.id), difficulty: "hard" };
  if (type === "monster") {
    content.difficulty = easyOrNormal(difficulty);
    return { char: difficulty <= 1 ? q__q : Q__Q, room: { type, content } };
  }
  content.lockOnEnter = true;
  if (type === "boss") {
    content.difficulty = "boss";
    return { char: X__X, room: { type, content, locked: { master: true } } };
  }
  return { char: x__x, room: { type, content } };
};

/** The hall room at a column: the map, the compass, the camp in front of the van (its east door is the one the Boss Key opens), else empty hall */
const hallRoom = (col: number, hallLength: number): { char: string; room: Room } => {
  const isCamp = col === hallLength;
  if (isCamp) return { char: CAMP, room: { type: "camp", content: { healthPoints: 15 }, locked: { east: true } } };
  if (col === 1) return { char: $__$, room: chest("map") };
  if (col === 2) return { char: $__$, room: chest("compass") };
  return { char: O__O, room: { type: "empty" } };
};

interface CombatPlacement {
  quest: Achievement;
  type: MovingRoomType;
}

const layOut = (placed: Placed[], guard: number, boss: Achievement) => {
  const perSide = Math.ceil(placed.length / 2);
  const hallLength = Math.max(perSide, MIN_HALL);
  const bossCol = hallLength + 1;
  const masterCol = hallLength + 2;
  const width = masterCol + 1;
  const grid: string[][] = Array.from({ length: ROW_COUNT }, () => Array.from({ length: width }, () => ____));
  const table = new RoomTable();
  const combat: CombatPlacement[] = [];

  // The hall: the front door, the map, the compass, empty hall, and the camp in front of the van
  grid[HALL_ROW][0] = table.add(_00_, { type: "entrance", visited: true });
  for (let col = 1; col <= hallLength; col++) {
    const { char, room } = hallRoom(col, hallLength);
    grid[HALL_ROW][col] = table.add(char, room);
  }

  // The rooms of the house along both sides
  placed.forEach((spot, index) => {
    const difficulty = Number(spot.quest.difficulty) || 1;
    const type: MovingRoomType = questTier(difficulty) === "monster" ? "monster" : "miniboss";
    const { char, room } = questRoomOf(spot.quest, type);
    grid[spot.row][spot.col] = table.add(char, room);
    combat.push({ quest: spot.quest, type });
    const isGuard = index === guard;
    if (isGuard) grid[KEY_ROW][spot.col] = table.add(MK__, chest("master-key"));
  });

  // The van, behind the locked door, and the Pegasus chest behind it
  const bossRoom = questRoomOf(boss, "boss");
  grid[HALL_ROW][bossCol] = table.add(bossRoom.char, bossRoom.room);
  combat.push({ quest: boss, type: "boss" });
  grid[HALL_ROW][masterCol] = table.add($__$, { type: "master", content: { chest: "dungeon", dungeon: "Pegasus", pegasus: true } });

  return { grid, rooms: table.rooms, combat };
};

// ---------------------------------------------------------------------------------------------------------------
// The builder.

/**
 * The old house for a pack and the answers it was built from, or null when nobody plays. The same answers always give
 * the same temple (the move date does not change it), so loading it again replaces the saved one.
 */
export const buildMovingTemple = (pack: MovingPack, answers: MovingAnswers): MovingTemple | null => {
  const quests = new Map(pack.quests.map((quest) => [String(quest.id), quest]));
  const heroes = answers.heroes.filter((hero): hero is MovingHero & { band: PackBand } => hero.band !== "out");
  const roomCount = (room: MovingRoomId): number => Math.max(0, Math.floor(Number(answers.rooms[room]) || 0));
  const isTicked = (house: HouseRoom): boolean => house.rooms.some((room) => roomCount(room) > 0);

  const bossQuest = quests.get(questIdOf(BOSS_QUEST));
  const isNobodyPlaying = heroes.length === 0;
  if (isNobodyPlaying || !bossQuest) return null;

  const slots: Slot[] = [];
  const addHouseRoom = (house: HouseRoom): void => {
    if (!isTicked(house)) return;
    const questId = house.quests.map((slug) => questIdOf(slug)).find((id) => quests.has(id));
    if (questId) slots.push({ label: house.label, questId, guardRank: house.guardRank });
  };

  QUIET_ROOMS.forEach(addHouseRoom);
  if (roomCount("bedroom") > 0) {
    for (const hero of heroes) {
      const questId = questIdOf(BEDROOM_QUEST[hero.band], hero.id);
      if (quests.has(questId)) slots.push({ label: `${hero.name || "Hero"}'s bedroom`, questId });
    }
  }
  LIVING_ROOMS.forEach(addHouseRoom);
  for (const family of FAMILY_ROOMS) {
    const questId = questIdOf(family.quest);
    if (quests.has(questId)) slots.push({ label: family.label, questId, guardRank: family.guardRank });
  }

  if (!slots.length) return null;

  // The key's chest hangs behind the kitchen, else the garage, else the Open First Box
  const ranked = slots.map((slot, index) => ({ index, rank: slot.guardRank ?? Number.POSITIVE_INFINITY }));
  const guard = ranked.reduce((best, next) => (next.rank < best.rank ? next : best), ranked[0]).index;

  const placed = placeSlots(slots, guard, quests);
  const { grid, rooms, combat } = layOut(placed, guard, bossQuest);

  const typeOfQuest = new Map(combat.map((entry) => [String(entry.quest.id), entry.type]));
  const described: MovingTempleRoom[] = [
    ...slots.map((slot, index) => ({ slot, guardsKey: index === guard })),
    { slot: { label: "The moving van", questId: String(bossQuest.id) }, guardsKey: false },
  ].map(({ slot, guardsKey }) => {
    const quest = quests.get(slot.questId)!;
    const difficulty = Number(quest.difficulty) || 1;
    return {
      questId: slot.questId,
      label: slot.label,
      name: String(quest.achievementName),
      type: typeOfQuest.get(slot.questId) ?? "monster",
      tier: questTier(difficulty),
      difficulty,
      guardsKey,
    };
  });

  const record: TempleInterface = {
    id: MOVING_TEMPLE_ID,
    name: MOVING_TEMPLE_NAME,
    customName: MOVING_TEMPLE_NAME,
    customDescription: `The old house, room by room. Every room holds the packing quest for it, and the key to the van is behind the ${slots[guard].label.toLowerCase()}.`,
    categoryIds: [],
    level: 1,
    seed: "moving-day",
    themeId: "home",
    element: "earth",
    generated: true,
    dungeonLayout: { entrance: [0, HALL_ROW, 0], maze: { "1F": grid }, rooms },
  };
  const size = templeSize(described.map((room) => ({ difficulty: room.difficulty }))).total;
  return { record, rooms: described, size };
};

/** The pack's backup file with the temple in it: one more store for the merge load, which writes it under its own id and keeps every other temple. */
export const movingTempleBackup = (pack: MovingPack, temple: MovingTemple | null, now: Date = new Date()): BackupFile => {
  const file = movingPackBackup(pack, now);
  if (!temple) return file;
  return { ...file, stores: { ...file.stores, __temples: packEntries([temple.record]) } };
};

/** One line for the after-summary: where the temple is and what to do in it */
export const movingTempleSummary = (temple: MovingTemple): string => {
  const guard = temple.rooms.find((room) => room.guardsKey);
  const key = guard ? ` Beat the ${guard.label.toLowerCase()} for the key, then load the van.` : "";
  return `${temple.record.name} is open in Hometown: ${plural(temple.rooms.length, "room")} of packing, size ${temple.size}.${key}`;
};
