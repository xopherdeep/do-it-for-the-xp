/**
 * Small temples and heroes for the room and item specs.
 * A layout is a grid of room names ("E" is the entrance); `rooms` says what each name is.
 */
import { DungeonManager } from "@/lib/engine/core/dungeons/DungeonManager";
import type { Room } from "@/lib/engine/core/dungeons/types";
import { TempleSystem } from "@/lib/engine/core/dungeons/TempleSystem";
import type { RoomContext } from "@/lib/services/temples/RoomInteractions";
import { useUserStore } from "@/lib/store/stores/user";

export const HERO = "hero-1";

let counter = 0;
/** Both engines are singletons that outlive a test, so every test builds a temple of its own. */
export const nextTempleId = (): string => `fixture-temple-${++counter}`;

export const dungeons = DungeonManager.getInstance();
export const temples = TempleSystem.getInstance();

type Floors = string[][] | Record<string, string[][]>;

/** Register a temple. A plain grid is one floor ("1F"); an object of grids is a tower. */
export const makeTemple = (rooms: Record<string, Room>, floors: Floors, id: string = nextTempleId()): string => {
  const named = (key: string, floor?: string) => (floor ? `${floor}:${key}` : key);
  const maze: Floors = Array.isArray(floors)
    ? floors
    : Object.fromEntries(Object.entries(floors).map(([floor, grid]) => [floor, grid.map((row) => row.map((key) => named(key, floor)))]));

  const registered: Record<string, Room> = {};
  for (const [key, room] of Object.entries(rooms)) {
    const copy: Room = JSON.parse(JSON.stringify(room));
    if (Array.isArray(floors)) registered[key] = copy;
    else for (const floor of Object.keys(floors)) registered[named(key, floor)] = JSON.parse(JSON.stringify(room));
  }

  dungeons.registerDungeon({ id, name: id, maze, rooms: registered, visitedPositions: new Set<string>(), entrance: [0, 0] });
  return id;
};

/** A hero in the user store with HP 30/50, MP 10/40, 100 GP and 3 agility, unless told otherwise. */
export const addHero = (stats: Record<string, unknown> = {}): void => {
  useUserStore().users[HERO] = {
    id: HERO,
    name: { nick: "Hero", full: "Hero" },
    jobClass: "default",
    stats: {
      level: 1,
      xp: { now: 0, next_level: 100 },
      hp: { now: 30, max: 50 },
      mp: { now: 10, max: 40 },
      gp: { wallet: 100, savings: 0, debt: 0, limit: 1000 },
      special: { agility: 3 },
      ...stats,
    },
  };
};

export const hero = () => useUserStore().users[HERO];
export const hp = (): number => hero().stats.hp.now;
export const mp = (): number => hero().stats.mp.now;
export const wallet = (): number => hero().stats.gp.wallet;

/** Open the temple with the hero standing at `position` on `level`. */
export const enter = (id: string, position: [number, number], level?: string): void => {
  temples.initTemple(id, position, level);
};

export const contextAt = (
  templeId: string,
  position: [number, number],
  extra: Partial<RoomContext> = {}
): RoomContext => ({
  userId: HERO,
  templeId,
  level: temples.getTempleState(templeId)?.currentLevel ?? "1F",
  position,
  ...extra,
});

/** Dice that roll the given numbers in order, then keep rolling the last one. */
export const dice = (...rolls: number[]): (() => number) => {
  let index = 0;
  return () => rolls[Math.min(index++, rolls.length - 1)];
};
