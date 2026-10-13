/**
 * Quest rooms, the pure rules (docs/Quest-Rooms-Spec.md section 5.1): the tier a quest's difficulty
 * makes, the attack factor of each tier, and the size of a temple. No storage, no Vue.
 *
 * Do not import QuestLabels here: its `tierLabel` reads this module, and the two must not form a cycle.
 */

/** The three kinds of quest room, weakest first. */
export const QUEST_TIERS = ["monster", "miniboss", "boss"] as const;
export type QuestTier = (typeof QUEST_TIERS)[number];

/** A temple whose quests add up to this much difficulty is full. Informational: it never blocks a save. */
export const TEMPLE_FULL_SIZE = 21;

/** The first difficulty of each tier above the monster (the Fibonacci slider's 3 and 8). */
const MINIBOSS_FROM = 3;
const BOSS_FROM = 8;

/**
 * How much harder a quest's beast hits for each tier: a monster is the plain strike, a miniboss 1.2x,
 * a boss 1.5x. Tunable. It replaces the old "a boss is harder to escape" odds.
 */
export const TIER_ATTACK_FACTOR: Record<QuestTier, number> = {
  monster: 1,
  miniboss: 1.2,
  boss: 1.5,
};

/**
 * The tier a difficulty makes: 1-2 a monster, 3-5 a miniboss, 8 and up a boss. A legacy value between two
 * steps rounds down (6 and 7 are minibosses, 9-12 bosses); a missing or non-positive one is a monster.
 */
export function questTier(difficulty?: number): QuestTier {
  const value = Number(difficulty);
  const isMonster = !(value >= MINIBOSS_FROM); // also true for NaN
  if (isMonster) return "monster";
  return value >= BOSS_FROM ? "boss" : "miniboss";
}

/** The attack factor a tier gives its beast (see TIER_ATTACK_FACTOR). */
export function tierAttackFactor(tier: QuestTier): number {
  return TIER_ATTACK_FACTOR[tier];
}

/**
 * One room's part in the size of a temple. `difficulty` is the difficulty of the quest the room holds, or of
 * its template when the room is dormant (no family quest fills it yet). Leave out rooms that hold no quest
 * (traps, classic beast rooms, empty lairs, non-combat rooms).
 */
export interface SizedRoom {
  difficulty: number;
  /** True when no live quest fills the room and the difficulty is the template's ("if woken"). */
  dormant?: boolean;
}

export interface TempleSize {
  /** Every room's difficulty added up, dormant ones included. */
  total: number;
  /** The part of the total that live quests make. */
  awake: number;
  /** The part of the total that dormant templates make: what the temple grows by when they wake. */
  dormant: number;
  /** How many rooms are dormant. */
  dormantRooms: number;
  /** The total has reached TEMPLE_FULL_SIZE. */
  isFull: boolean;
}

/** A difficulty that counts toward the size: unset, broken and negative values count for nothing. */
const sizeOf = (difficulty: number): number => {
  const value = Number(difficulty);
  return Number.isFinite(value) && value > 0 ? value : 0;
};

/**
 * The size of a temple: the sum of the difficulties of its quest rooms, with dormant rooms counted at their
 * template's difficulty and told apart so the screen can grey them ("if woken"). Values are added as they
 * stand; only the tier rounds a legacy value down.
 */
export function templeSize(rooms: readonly SizedRoom[]): TempleSize {
  let awake = 0;
  let dormant = 0;
  let dormantRooms = 0;
  for (const room of rooms) {
    const isDormant = Boolean(room.dormant);
    if (isDormant) {
      dormant += sizeOf(room.difficulty);
      dormantRooms++;
    } else {
      awake += sizeOf(room.difficulty);
    }
  }
  const total = awake + dormant;
  return { total, awake, dormant, dormantRooms, isFull: total >= TEMPLE_FULL_SIZE };
}
