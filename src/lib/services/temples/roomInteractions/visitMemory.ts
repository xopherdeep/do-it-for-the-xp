/**
 * What a temple visit remembers and rolls: the per-visit memory, the keys it files things under, and the dice.
 *
 * The memory is for what only lasts a visit: a spring drunk, a camp made, a trap sprung. It lives
 * here for the length of the session and starts over with a blood moon (forgetVisits). What the hero takes for
 * good (keys, maps, compasses, the secret chest, a find, a solved riddle) is not here: it is part of their saved
 * run, filed under the room in TempleState.openedChests (treasure.ts), where a reload finds it and a blood moon
 * gives it back.
 */
import type { RoomContext } from './vocabulary';

const visitLog = new Set<string>();

/** Remember that something happened this visit. Returns false if it already had. */
export const rememberOnce = (key: string): boolean => {
  const isRemembered = visitLog.has(key);
  if (isRemembered) return false;
  visitLog.add(key);
  return true;
};
export const hasHappened = (key: string): boolean => visitLog.has(key);
/** Start every hero's visit over (tests; a fresh session does the same by itself). */
export const resetVisitMemory = (): void => visitLog.clear();

/**
 * Start one temple's visit over, for one hero or (without one) for every hero: a blood moon gives the temple back
 * its springs, camps and traps, as it gives the saved run its chests and keys. Keys are `${userId}|${templeId}|...`.
 */
export const forgetVisits = (templeId: string, userId?: string): void => {
  for (const key of Array.from(visitLog)) {
    const [owner, temple] = key.split('|');
    const isThatVisit = temple === templeId && (!userId || owner === userId);
    if (isThatVisit) visitLog.delete(key);
  }
};

export const roomKey = (ctx: RoomContext, topic: string): string =>
  `${ctx.userId}|${ctx.templeId}|${ctx.level}|${ctx.position[0]},${ctx.position[1]}|${topic}`;

/** Memory that belongs to the whole temple, not one room (the bottles). */
export const templeKey = (userId: string, templeId: string, topic: string): string => `${userId}|${templeId}|${topic}`;

export const randomInt = (min: number, max: number, rng: () => number): number =>
  min + Math.floor(rng() * (max - min + 1));

export const pick = <T>(list: T[], rng: () => number): T => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

export const rngOf = (ctx: RoomContext): (() => number) => ctx.rng ?? Math.random;
