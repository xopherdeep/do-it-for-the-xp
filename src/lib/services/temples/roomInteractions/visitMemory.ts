/**
 * What a temple visit remembers and rolls: the once-per-visit memory ("once" means once per hero per temple
 * visit; it lives here for the length of the session, a reload starts a new visit, as it does for chests and
 * doors), the keys it files things under, and the dice.
 */
import type { RoomContext } from './vocabulary';

const visitLog = new Set<string>();

/** Remember that something happened this visit. Returns false if it already had. */
export const rememberOnce = (key: string): boolean => {
  if (visitLog.has(key)) return false;
  visitLog.add(key);
  return true;
};
export const hasHappened = (key: string): boolean => visitLog.has(key);
/** Start every hero's visit over (tests; a fresh session does the same by itself). */
export const resetVisitMemory = (): void => visitLog.clear();

export const roomKey = (ctx: RoomContext, topic: string): string =>
  `${ctx.userId}|${ctx.templeId}|${ctx.level}|${ctx.position[0]},${ctx.position[1]}|${topic}`;

/** Memory that belongs to the whole temple, not one room (the bottles). */
export const templeKey = (userId: string, templeId: string, topic: string): string => `${userId}|${templeId}|${topic}`;

export const randomInt = (min: number, max: number, rng: () => number): number =>
  min + Math.floor(rng() * (max - min + 1));

export const pick = <T>(list: T[], rng: () => number): T => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

export const rngOf = (ctx: RoomContext): (() => number) => ctx.rng ?? Math.random;
