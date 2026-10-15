/**
 * The Moving Day temple: the old house as a dungeon, built from a Moving House pack.
 *
 * Pure: no storage, no Vue. `buildMovingTemple(pack, answers)` asks which rooms the home has and which quests each
 * holds (houseRooms.ts), lays them out as a floor plan (housePlanner.ts), and writes the plan as one temple record
 * (houseRecord.ts): the porch is the entrance, every room holds the packing quests for it, the key guard keeps the
 * junk drawer with the van keys, and the moving van is the boss behind the one door those keys open. The record is a
 * generated temple's (`gen-` id, floors of tokens and a rooms table), so the temple screen, the music and the Game
 * Master's temple list all know it; the solver and the audit say every house the setup can make can be finished
 * (tests/unit/movingTemple.spec.ts).
 *
 * `movingTempleBackup` adds the temple to the pack's backup file, so it goes in with the pack's merge load: the same
 * id every time, so loading it again replaces only this one record.
 */
import type { Achievement } from "@/lib/databases/AchievementDb";
import type { TempleInterface } from "@/lib/databases/TempleDb";
import { questTier, templeSize, type QuestTier } from "@/lib/services/temples/questRooms";
import type { BackupFile } from "@/lib/services/core/BackupService";
import { movingPackBackup } from "./movingPack";
import type { MovingAnswers, MovingPack } from "./movingPack";
import { packEntries, plural } from "./packCommon";
import { houseCellsFor, type HouseCellKind, type HouseFloor } from "./movingTemple/houseRooms";
import { planHouse } from "./movingTemple/housePlanner";
import { biggestDifficulty, heldQuestIds, houseLayout } from "./movingTemple/houseRecord";

/** The same every time, so loading the pack again replaces this temple and nothing else. The `gen-` prefix is what makes the screens know a temple that is not one of the nine. */
export const MOVING_TEMPLE_ID = "gen-move-house";
export const MOVING_TEMPLE_NAME = "The Old House";

export type MovingRoomType = "monster" | "miniboss" | "boss";

/** One fight room of the old house: a room of the home and the packing quests it holds */
export interface MovingTempleRoom {
  /** The cell it was built from: "kitchen", "bedroom-1" */
  id: string;
  /** The room of the home it stands for: "Kitchen", "Twelve's bedroom" */
  label: string;
  floor: HouseFloor;
  /** The pack quests the room holds, in the order a hero meets them */
  questIds: string[];
  /** Those quests' names, in the same order */
  names: string[];
  /** The room type in the layout: the key guard is the sealed miniboss, the van the boss, every other room an open monster room */
  type: MovingRoomType;
  /** What its biggest quest's difficulty makes it (questTier) */
  tier: QuestTier;
  /** Its biggest quest's difficulty, which sizes the room and sets its tier */
  difficulty: number;
  /** The junk drawer with the van keys sits behind this room */
  guardsKey: boolean;
}

export interface MovingTemple {
  record: TempleInterface;
  /** The fight rooms, in the order the plan placed them */
  rooms: MovingTempleRoom[];
  /** The rooms' biggest difficulties added up; 21 is a full temple */
  size: number;
  /** The floors that were built, bottom to top */
  floors: HouseFloor[];
}

/** The cells that are fights, and the layout type each is written as */
const FIGHT_TYPES: Partial<Record<HouseCellKind, MovingRoomType>> = { quest: "monster", guard: "miniboss", boss: "boss" };

/** The fight rooms of the driveway (houseRooms.ts), which the summary gives a line of their own */
const DRIVEWAY_ROOMS: ReadonlySet<string> = new Set(["van", "lastLook"]);

/** What the summary calls each floor of a two-floor house */
const FLOOR_NAMES: Record<HouseFloor, string> = { B1: "Basement", "1F": "Downstairs", "2F": "Upstairs" };

/** How many of a room the answers give, the way the pack and the house read it */
const countOf = (count: unknown): number => Math.max(0, Math.floor(Number(count) || 0));

/**
 * The plan's seed: the answers that shape the house (the ticked rooms, the floors, the basement, who plays and in
 * which band) and never the move date, so the same answers always give the same house. The basement counts only
 * while storage is ticked, as the setup asks it.
 */
const seedOf = (answers: MovingAnswers): string => {
  const ticked = Object.entries(answers.rooms)
    .map(([room, count]): [string, number] => [room, countOf(count)])
    .filter(([, count]) => count > 0)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  const rooms = Object.fromEntries(ticked);
  const floors = answers.floors === 2 ? 2 : 1;
  const basement = answers.basement === true && countOf(rooms.storage) > 0;
  const heroes = answers.heroes.filter((hero) => hero.band !== "out").map((hero) => [hero.id, hero.band]);
  return `moving-day:${JSON.stringify({ rooms, floors, basement, heroes })}`;
};

/**
 * The old house for a pack and the answers it was built from, or null when nobody plays or the pack has no "Load
 * the Van" quest. The same answers always give the same temple (the move date does not change it), so loading it
 * again replaces the saved one.
 */
export const buildMovingTemple = (pack: MovingPack, answers: MovingAnswers): MovingTemple | null => {
  const cells = houseCellsFor(pack, answers);
  if (!cells) return null;
  const seed = seedOf(answers);
  const plan = planHouse(cells, seed);
  const quests = new Map<string, Achievement>(pack.quests.map((quest) => [String(quest.id), quest]));

  const rooms = plan.cells.flatMap(({ cell }): MovingTempleRoom[] => {
    const type = FIGHT_TYPES[cell.kind];
    if (!type) return [];
    const questIds = heldQuestIds(cell);
    const difficulty = biggestDifficulty(questIds, quests);
    return [{
      id: cell.id,
      label: cell.name,
      floor: cell.floor,
      questIds,
      names: questIds.map((id) => String(quests.get(id)?.achievementName ?? id)),
      type,
      tier: questTier(difficulty),
      difficulty,
      guardsKey: cell.kind === "guard",
    }];
  });
  // Every house has a key guard (the Open First Box is everyone's); without one the van could never be opened
  const guard = rooms.find((room) => room.guardsKey);
  if (!guard) return null;

  const record: TempleInterface = {
    id: MOVING_TEMPLE_ID,
    name: MOVING_TEMPLE_NAME,
    customName: MOVING_TEMPLE_NAME,
    customDescription: `The old house, room by room. Every room holds the packing quests for it, and the key to the van is in the junk drawer behind the ${guard.label.toLowerCase()}.`,
    categoryIds: [],
    level: 1,
    seed,
    themeId: "home",
    element: "earth",
    generated: true,
    dungeonLayout: houseLayout(plan, quests),
  };
  const size = templeSize(rooms.map((room) => ({ difficulty: room.difficulty }))).total;
  return { record, rooms, size, floors: plan.floors };
};

/** The pack's backup file with the temple in it: one more store for the merge load, which writes it under its own id and keeps every other temple. */
export const movingTempleBackup = (pack: MovingPack, temple: MovingTemple | null, now: Date = new Date()): BackupFile => {
  const file = movingPackBackup(pack, now);
  if (!temple) return file;
  return { ...file, stores: { ...file.stores, __temples: packEntries([temple.record]) } };
};

/**
 * The after-summary: where the temple is and what to do in it, then the rooms floor by floor (bottom to top, a
 * one-floor house's ground floor as "Rooms") and the driveway last, each room once, in the order the plan placed them.
 */
export const movingTempleSummary = (temple: MovingTemple): string => {
  const hasUpstairs = temple.floors.includes("2F");
  const guard = temple.rooms.find((room) => room.guardsKey);
  const keys = guard ? ` Take the van keys from the junk drawer behind the ${guard.label.toLowerCase()}, then load the van.` : "";
  const head = `${MOVING_TEMPLE_NAME} is open in Hometown: a ${hasUpstairs ? "two-floor" : "one-floor"} house with ${plural(temple.rooms.length, "room")} of packing, size ${temple.size}.${keys}`;

  const floorName = (floor: HouseFloor): string => (floor === "1F" && !hasUpstairs ? "Rooms" : FLOOR_NAMES[floor]);
  const floorLines = temple.floors.flatMap((floor) => {
    const names = temple.rooms.filter((room) => room.floor === floor && !DRIVEWAY_ROOMS.has(room.id)).map((room) => room.label);
    return names.length ? [`${floorName(floor)}: ${names.join(", ")}`] : [];
  });
  const driveway = temple.rooms.filter((room) => DRIVEWAY_ROOMS.has(room.id)).map((room) => room.label);
  return [head, ...floorLines, `Driveway: ${driveway.join(", ")}`].join("\n");
};
