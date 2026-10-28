/**
 * Project Towers chore list: a project type plus the house's rooms and the heroes become a suggested list of
 * chores, one for each suggestion in each room of its kind, sized and handed out by age; and last run's list
 * comes back as the next run's start. The Game Master edits the list in the wizard afterwards. Pure: no storage,
 * no Vue.
 *
 * A chore id is `${phaseId}:${slug}:${roomId}`, with `:${heroId}` added for a chore made for each hero, so the same
 * input gives the same ids. A chore split over several rooms adds its room's name to its name (the id is unchanged).
 * A re-run's ids add `~r${run}` (see `choresFromLastRun`).
 */
import { MOVING_ROOMS } from "@/lib/services/core/packs/movingPack";
import { nearestDifficulty } from "@/lib/services/core/packs/packCommon";
import type { MovingRoomId } from "@/lib/services/core/packs/movingPack";
import type { PackBand, PackHero } from "@/lib/services/core/packs/packCommon";
import type { ProjectChoreSuggestion, ProjectType } from "@/lib/services/core/packs/projects";
import { ROOF_PHASE_ID } from "./projectSchedule";

export interface ProjectHouse {
  /** How many of each room the house has; absent or 0 means none */
  rooms: Partial<Record<MovingRoomId, number>>;
  /** The storage room is a basement; carried for the tower, the chore list does not read it */
  basement?: boolean;
}

export interface ProjectRoom {
  /** "kitchen" for a room there is one of, "bedroom-2" for a counted room */
  id: string;
  kind: MovingRoomId | "house";
  name: string;
}

export interface ProjectChore {
  id: string;
  /** The floor it belongs to: a phase id, or "roof" for the finale */
  phaseId: string;
  /** A `ProjectRoom` id, or "roof" for the finale */
  roomId: string;
  name: string;
  /** On the Fibonacci slider: 1, 2, 3, 5, 8 or 13 */
  difficulty: number;
  /** Hero ids; empty while nobody can take it */
  assignee: string[];
  beastId?: string;
  minutes?: number;
  /** Added by the Game Master, not suggested by the type */
  custom?: boolean;
}

// ---------------------------------------------------------------------------------------------------------------
// The rooms

/** The room every house has: a chore with no room of its own, or whose room is gone, lands here */
export const WHOLE_HOUSE_ID = "house";

const WHOLE_HOUSE_NAME = "The Whole House";

const roomCountOf = (house: ProjectHouse, room: (typeof MOVING_ROOMS)[number]): number => {
  const count = Math.max(0, Math.floor(Number(house.rooms[room.id]) || 0));
  return room.counted ? Math.min(count, room.max ?? count) : Math.min(count, 1);
};

/** "Bedrooms" is "Bedroom" once the room is numbered */
const singularOf = (label: string): string => label.replace(/s$/, "");

const roomsOfKind = (room: (typeof MOVING_ROOMS)[number], count: number): ProjectRoom[] => {
  if (!room.counted) return Array.from({ length: count }, () => ({ id: room.id, kind: room.id, name: room.label }));
  return Array.from({ length: count }, (_, index) => ({
    id: `${room.id}-${index + 1}`,
    kind: room.id,
    name: `${singularOf(room.label)} ${index + 1}`,
  }));
};

/** The rooms a house has, in the setup's order: counted ones numbered, then "The Whole House" */
export const houseRoomsOf = (house: ProjectHouse): ProjectRoom[] => [
  ...MOVING_ROOMS.flatMap((room) => roomsOfKind(room, roomCountOf(house, room))),
  { id: WHOLE_HOUSE_ID, kind: "house", name: WHOLE_HOUSE_NAME },
];

/**
 * The chores as the house holds them: one whose room the house lacks (a re-run into a smaller home) goes to the Whole
 * House, none is dropped, and the roof's finale stays where it is. Chores are copied only when they move.
 */
export const rehomeChores = (chores: readonly ProjectChore[], house: ProjectHouse): ProjectChore[] => {
  const known = new Set(houseRoomsOf(house).map((room) => room.id));
  return chores.map((chore) => {
    const isLost = chore.phaseId !== ROOF_PHASE_ID && !known.has(chore.roomId);
    return isLost ? { ...chore, roomId: WHOLE_HOUSE_ID } : chore;
  });
};

// ---------------------------------------------------------------------------------------------------------------
// The heroes: who can take a chore, and in what turn

/** The sizes a band takes on the slider, both ends included */
const BAND_RANGES: Record<PackBand, readonly [number, number]> = { little: [1, 2], kid: [2, 5], grownup: [5, 13] };

/** Where a band's chore goes when the band has no hero: the next band up first, the younger ones last */
const BAND_FALLBACKS: Record<PackBand, readonly PackBand[]> = {
  little: ["little", "kid", "grownup"],
  kid: ["kid", "grownup", "little"],
  grownup: ["grownup", "kid", "little"],
};

type Player = PackHero & { band: PackBand };

const isPlaying = (hero: PackHero): hero is Player => hero.band !== "out";

/** The nearest slider size that lies inside a band's range */
const clampToBand = (difficulty: number, band: PackBand): number => {
  const [low, high] = BAND_RANGES[band];
  return Math.min(high, Math.max(low, nearestDifficulty(difficulty)));
};

const rangeHolds = (band: PackBand, size: number): boolean => {
  const [low, high] = BAND_RANGES[band];
  const isInRange = size >= low && size <= high;
  return isInRange;
};

/** The oldest band whose range holds a size: a size two or three is a kid's, five and up a grown-up's */
const bandForSize = (difficulty: number): PackBand => {
  const size = nearestDifficulty(difficulty);
  const oldestFirst: readonly PackBand[] = ["grownup", "kid", "little"];
  return oldestFirst.find((band) => rangeHolds(band, size)) ?? "grownup";
};

/** The heroes playing (the sitting-out are not heroes here) and the rotations that hand chores out to them */
interface Roster {
  everyone: readonly Player[];
  has(heroId: string): boolean;
  /** The heroes a band's chore goes to: the band's own, else the first fallback band that has any */
  pool(band: PackBand): readonly Player[];
  /** The next hero in the band's rotation, or undefined when nobody can take it */
  next(band: PackBand): Player | undefined;
  /** The next hero in the one rotation across everybody */
  nextAny(): Player | undefined;
}

const rosterOf = (heroes: readonly PackHero[]): Roster => {
  const everyone = heroes.filter(isPlaying);
  const turns = new Map<string, number>();
  const rotate = (key: string, pool: readonly Player[]): Player | undefined => {
    if (pool.length === 0) return undefined;
    const turn = turns.get(key) ?? 0;
    turns.set(key, turn + 1);
    return pool[turn % pool.length];
  };
  const bandWithHeroes = (band: PackBand): PackBand | undefined =>
    BAND_FALLBACKS[band].find((candidate) => everyone.some((hero) => hero.band === candidate));
  const pool = (band: PackBand): readonly Player[] => everyone.filter((hero) => hero.band === bandWithHeroes(band));
  return {
    everyone,
    has: (heroId) => everyone.some((hero) => hero.id === heroId),
    pool,
    // A fallback shares the rotation of the band it falls back to, so that band's load stays even
    next: (band) => rotate(`band:${bandWithHeroes(band)}`, pool(band)),
    nextAny: () => rotate("any", everyone),
  };
};

// ---------------------------------------------------------------------------------------------------------------
// The suggested list

interface Place {
  phaseId: string;
  roomId: string;
}

const isBandWho = (who: ProjectChoreSuggestion["who"]): who is PackBand => !["any", "team"].includes(who);

const choreOf = (suggestion: ProjectChoreSuggestion, place: Place, assignee: readonly Player[], difficulty: number, heroId?: string): ProjectChore => ({
  id: [place.phaseId, suggestion.slug, place.roomId, ...(heroId ? [heroId] : [])].join(":"),
  phaseId: place.phaseId,
  roomId: place.roomId,
  name: suggestion.name,
  difficulty,
  assignee: assignee.map((hero) => hero.id),
  ...(suggestion.beastId ? { beastId: suggestion.beastId } : {}),
  ...(suggestion.minutes !== undefined ? { minutes: suggestion.minutes } : {}),
});

/** One shared chore: the whole team's, or one hero's by rotation, sized to that hero's band */
const sharedChore = (suggestion: ProjectChoreSuggestion, place: Place, roster: Roster): ProjectChore => {
  const { who } = suggestion;
  if (who === "team") return choreOf(suggestion, place, roster.everyone, nearestDifficulty(suggestion.difficulty));
  const hero = isBandWho(who) ? roster.next(who) : roster.nextAny();
  if (!hero) return choreOf(suggestion, place, [], nearestDifficulty(suggestion.difficulty));
  return choreOf(suggestion, place, [hero], clampToBand(suggestion.difficulty, hero.band));
};

/** One chore for each hero of the band (of everyone, for an anyone or team chore), each sized to that hero */
const heroChores = (suggestion: ProjectChoreSuggestion, place: Place, roster: Roster): ProjectChore[] => {
  const heroes = isBandWho(suggestion.who) ? roster.pool(suggestion.who) : roster.everyone;
  if (heroes.length === 0) return [choreOf(suggestion, place, [], nearestDifficulty(suggestion.difficulty))];
  return heroes.map((hero) => choreOf(suggestion, place, [hero], clampToBand(suggestion.difficulty, hero.band), hero.id));
};

/**
 * The rooms a suggestion makes chores in. One kind of room: every room of that kind (three bedrooms, three chores).
 * Several kinds: "any of these rooms", so one chore, in the first room of the first kind (in the suggestion's own
 * order) that the house has.
 */
const matchingRooms = (suggestion: ProjectChoreSuggestion, rooms: readonly ProjectRoom[]): ProjectRoom[] => {
  const kinds: readonly string[] = suggestion.rooms === "house" ? ["house"] : suggestion.rooms;
  const isAnyOfSeveral = kinds.length > 1;
  if (!isAnyOfSeveral) return rooms.filter((room) => kinds.includes(room.kind));
  const firstRoom = kinds.map((kind) => rooms.find((room) => room.kind === kind)).find((room) => room !== undefined);
  return firstRoom ? [firstRoom] : [];
};

/** A chore split over several rooms names its room: "Clear Under the Bed (Bedroom 2)" */
const inRoom = (suggestion: ProjectChoreSuggestion, room: ProjectRoom, isSplit: boolean): ProjectChoreSuggestion =>
  isSplit ? { ...suggestion, name: `${suggestion.name} (${room.name})` } : suggestion;

const choresOfSuggestion = (suggestion: ProjectChoreSuggestion, phaseId: string, rooms: readonly ProjectRoom[], roster: Roster): ProjectChore[] => {
  const matched = matchingRooms(suggestion, rooms);
  const isSplit = matched.length > 1;
  return matched.flatMap((room) => {
    const named = inRoom(suggestion, room, isSplit);
    const place = { phaseId, roomId: room.id };
    return named.perHero ? heroChores(named, place, roster) : [sharedChore(named, place, roster)];
  });
};

/** The finale is the whole family's, unless the type gives it to a band */
const finaleChore = (finale: ProjectChoreSuggestion, roster: Roster): ProjectChore => {
  const who = isBandWho(finale.who) ? finale.who : "team";
  return sharedChore({ ...finale, who }, { phaseId: ROOF_PHASE_ID, roomId: ROOF_PHASE_ID }, roster);
};

/**
 * The chores a type suggests for a house and its heroes, floor by floor and the finale last. Each suggestion makes a
 * chore in each room it matches; a band's chores take turns across that band's heroes, an anyone chore across all of
 * them, and a chore is sized into the range of the hero it lands on. Heroes sitting out are left out. The type is
 * never changed and every chore is a new object.
 */
export const suggestChores = (type: ProjectType, house: ProjectHouse, heroes: readonly PackHero[]): ProjectChore[] => {
  const rooms = houseRoomsOf(house);
  const roster = rosterOf(heroes);
  const chores: ProjectChore[] = [];
  for (const phase of type.phases) {
    for (const suggestion of phase.chores) chores.push(...choresOfSuggestion(suggestion, phase.id, rooms, roster));
  }
  chores.push(finaleChore(type.finale, roster));
  return chores;
};

// ---------------------------------------------------------------------------------------------------------------
// Re-runs

const RUN_SUFFIX = /~r(\d+)$/;

const runOf = (id: string): number => Number(RUN_SUFFIX.exec(id)?.[1] ?? 0);

/** `${id}~r${run}` without the run suffix an earlier re-run left; `-2`, `-3` and so on only to avoid a clash */
const freshId = (id: string, run: number, used: Set<string>): string => {
  const base = `${id.replace(RUN_SUFFIX, "")}~r${run}`;
  let fresh = base;
  for (let copy = 2; used.has(fresh); copy += 1) fresh = `${base}-${copy}`;
  used.add(fresh);
  return fresh;
};

/** Who does a chore this time: the assignees still playing, else the whole team if it was a team's, else a hero by size */
const assigneeAfter = (chore: ProjectChore, roster: Roster): string[] => {
  const stillPlaying = chore.assignee.filter((heroId) => roster.has(heroId));
  const hasSomeone = stillPlaying.length > 0;
  if (hasSomeone) return stillPlaying;
  const wasTeam = chore.assignee.length > 1;
  if (wasTeam) return roster.everyone.map((hero) => hero.id);
  const hero = roster.next(bandForSize(chore.difficulty));
  return hero ? [hero.id] : [];
};

/**
 * Last run's final list as this run's starting list: names, sizes, places and the Game Master's own chores stay.
 * An assignee who is no longer a hero (or now sits out) is dropped. A chore left with nobody goes to the whole team
 * if it was a team's, else to a hero by turns in the band its size fits (the oldest band whose range holds it),
 * with the usual fallback; the size stays as it was. Every chore gets a fresh id: the old one without any `~r<n>`
 * suffix, then `~r<run>`, where run is one more than the highest in the list, so a second re-run reads `~r2`.
 */
export const choresFromLastRun = (last: readonly ProjectChore[], heroes: readonly PackHero[]): ProjectChore[] => {
  const roster = rosterOf(heroes);
  const run = Math.max(0, ...last.map((chore) => runOf(chore.id))) + 1;
  const used = new Set<string>();
  return last.map((chore) => ({ ...chore, id: freshId(chore.id, run, used), assignee: assigneeAfter(chore, roster) }));
};
