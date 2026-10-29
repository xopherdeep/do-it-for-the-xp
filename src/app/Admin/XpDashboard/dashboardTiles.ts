/**
 * The figures on the Game Master dashboard tiles. Every one is a count of what the stores
 * really hold: a family with nothing yet reads 0, never a placeholder.
 */

export interface TileStats {
  users: number;
  achievements: number;
  beasts: number;
  dos: number;
  donts: number;
  /** Items on the shop shelves (the shop catalogue) */
  items: number;
}

/** What EngineStatsService.getSystemStats hands back (it carries more than the tiles use) */
export type TileSource = Partial<Record<keyof TileStats, unknown>>;

/** A tile figure: a whole number, never below 0; anything that is not a number reads 0 */
export const wholeCount = (raw: unknown): number => {
  const count = Math.floor(Number(raw));
  return Number.isFinite(count) && count > 0 ? count : 0;
};

export const emptyTileStats = (): TileStats => ({ users: 0, achievements: 0, beasts: 0, dos: 0, donts: 0, items: 0 });

/** The tile figures out of the system stats; a missing stat is 0 */
export const tileStatsOf = (system?: TileSource | null): TileStats => ({
  users: wholeCount(system?.users),
  achievements: wholeCount(system?.achievements),
  beasts: wholeCount(system?.beasts),
  dos: wholeCount(system?.dos),
  donts: wholeCount(system?.donts),
  items: wholeCount(system?.items),
});

/**
 * Quests waiting on the Game Master, shop purchases waiting to be handed over, the kids' creations waiting on a
 * verdict, and the family reward of a cleared project that is earned and not yet handed over (1 while one waits,
 * 0 otherwise)
 */
export const approvalsTotal = (chores: unknown, rewards: unknown, creations: unknown = 0, familyReward: unknown = 0): number =>
  wholeCount(chores) + wholeCount(rewards) + wholeCount(creations) + wholeCount(familyReward);
