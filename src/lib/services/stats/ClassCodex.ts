/**
 * The Class Codex: everything the class picker tells a hero about a class, as plain data.
 *
 * What the class is (description, creed), what it does in the game (passive, pillars, starting HP/MP), what it
 * means in real life (three short lines), what it grows into and what unlocks it (base -> advanced -> crown).
 * The Codex modal (XpClassCodex.vue) only draws these entries; every rule is read from the same tables the engines use
 * (JOB_CLASS_OPTIONS, ClassPassives, PlayerStatsService, PILLARS), so the screen cannot drift from the game.
 *
 * Pure: no store, no Vue. Callers hand in the hero's class levels (`classLevelsOf(user.stats.classes)`).
 */
import { JOB_CLASS_OPTIONS, type JobClass } from '@/constants/JOB_CLASS_OPTIONS';
import { PILLARS, type PillarType } from '@/constants/PILLARS';
import { calculateMaxHp, calculateMaxMp, JOB_UNLOCK_REQUIREMENTS } from './PlayerStatsService';
import { canonicalClassName, classPassive, classRequirementLabel, isClassUnlocked } from './ClassPassives';

export type PillarRank = 'Primary' | 'Secondary' | 'Tertiary';

export interface CodexPillar {
  key: PillarType;
  /** The name a hero knows the pillar by: Body, Mind, Spirit, Heart or Legend. */
  name: string;
  rank: PillarRank;
  /** The stat names the pillar trains (PILLARS), e.g. ["Defense", "Strength", "Endurance"]. */
  stats: string[];
  /** Font Awesome icon class of the pillar. */
  icon: string;
  /** Ionic colour name of the pillar (use as `var(--ion-color-{color})`). */
  color: string;
  /** What the pillar fills: HP, MP, AP, GP or XP. */
  currency: string;
}

export interface CodexEvolution {
  name: string;
  icon: string;
  /** The other parent this class pairs with to reach the evolution (a tier-2 class for a crown class); null when the evolution has one parent. */
  with: string | null;
  /** "Warrior 10" or "Knight 10 + Mystic 10". */
  requirement: string;
  /** Whether the hero already meets the requirement. */
  met: boolean;
}

/** How far the hero is toward one parent's level ("Warrior 3 of 10"). */
export interface CodexRequirementProgress {
  name: string;
  level: number;
  needed: number;
  met: boolean;
}

export interface ClassCodexEntry {
  name: string;
  icon: string;
  description: string;
  creed: string;
  realLife: string[];
  /** The class passive in the voice of the game (ClassPassives blurb). */
  passive: string;
  /** Primary, secondary and tertiary pillar, in that order. */
  pillars: CodexPillar[];
  /** Max HP and MP at hero level 1 with no trained stats and no class levels. */
  startingHp: number;
  startingMp: number;
  /** 1 base class, 2 advanced class (one parent), 3 crown class (two advanced parents). */
  tier: 1 | 2 | 3;
  /** True while the hero has not met the requirement. */
  sealed: boolean;
  /** "Warrior 10" or "Knight 10 + Mystic 10", or '' for a tier-1 class. */
  requirement: string;
  /** Where the hero stands on each parent level; empty for a tier-1 class. */
  requirementProgress: CodexRequirementProgress[];
  /** The hero's level in this class (0 when never played). */
  heroLevel: number;
  /** Tier 1: the advanced classes it parents. Tier 2: the crown classes it parents, each with the other parent. Tier 3: nothing. */
  growsInto: CodexEvolution[];
  /** All five pillars in the profile's order (Body, Mind, Spirit, Heart, Legend), each with its starting power. */
  power: CodexPower[];
}

/** One bar of the class-select screen: how strong a class starts in a pillar. */
export interface CodexPower {
  key: PillarType;
  name: string;
  icon: string;
  color: string;
  /** The class's base stats in this pillar, added up. */
  value: number;
  /** `value` over the strongest start any class has in any pillar (0 to 1), so every bar shares one scale. */
  share: number;
  /** Primary, Secondary or Tertiary when the class trains this pillar; null when it does not. */
  rank: PillarRank | null;
}

/** Pillar names as heroes read them in the profile (UserProfileModal) and the class descriptions. */
export const PILLAR_LABELS: Record<PillarType, string> = {
  physical: 'Body',
  mental: 'Mind',
  vibrational: 'Spirit',
  relational: 'Heart',
  eternal: 'Legend',
};

const RANKS: PillarRank[] = ['Primary', 'Secondary', 'Tertiary'];

/** A class level from the hero's levels, however the class name is cased; 0 when the class was never played. */
const levelIn = (levels: Record<string, number>, name: string): number => {
  const key = Object.keys(levels ?? {}).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? Math.max(0, Number(levels[key]) || 0) : 0;
};

const pillarOf = (key: PillarType, rank: PillarRank): CodexPillar => ({
  key,
  name: PILLAR_LABELS[key],
  rank,
  stats: Object.values(PILLARS[key].stats).map((stat) => stat.name),
  icon: PILLARS[key].icon,
  color: PILLARS[key].color,
  currency: PILLARS[key].currencyLabel,
});

/** The classes that list `name` as a parent, in JOB_CLASS_OPTIONS order, each with the other parent (null when it has just one). */
const evolutionsOf = (name: string, levels: Record<string, number>): CodexEvolution[] =>
  JOB_CLASS_OPTIONS.filter((job) => job.name in JOB_UNLOCK_REQUIREMENTS && name in JOB_UNLOCK_REQUIREMENTS[job.name]).map((job) => ({
    name: job.name,
    icon: job.icon,
    with: Object.keys(JOB_UNLOCK_REQUIREMENTS[job.name]).find((parent) => parent !== name) ?? null,
    requirement: classRequirementLabel(job.name),
    met: isClassUnlocked(job.name, levels),
  }));

const codexTier = (tier: number | undefined): 1 | 2 | 3 => {
  const isTopTier = tier === 3;
  if (isTopTier) return 3;
  const isMiddleTier = tier === 2;
  if (isMiddleTier) return 2;
  return 1;
};

const PILLAR_ORDER: PillarType[] = ['physical', 'mental', 'vibrational', 'relational', 'eternal'];

/** A class's base stats in one pillar, added up (the three PILLARS stats of that pillar). */
export const pillarPower = (job: Pick<JobClass, 'baseStats'>, pillar: PillarType): number =>
  Object.keys(PILLARS[pillar].stats).reduce((sum, stat) => sum + (job.baseStats?.[stat] ?? 0), 0);

/** The strongest start any class has in any pillar: the full length of a class-select bar. */
export const PILLAR_POWER_MAX = Math.max(
  1,
  ...JOB_CLASS_OPTIONS.flatMap((job) => PILLAR_ORDER.map((pillar) => pillarPower(job, pillar)))
);

const powerOf = (job: JobClass): CodexPower[] => {
  const ranked = [job.primaryPillar, job.secondaryPillar, job.tertiaryPillar];
  return PILLAR_ORDER.map((key) => {
    const value = pillarPower(job, key);
    const rankIndex = ranked.indexOf(key);
    return {
      key,
      name: PILLAR_LABELS[key],
      icon: PILLARS[key].icon,
      color: PILLARS[key].color,
      value,
      share: Math.min(1, value / PILLAR_POWER_MAX),
      rank: rankIndex >= 0 ? RANKS[rankIndex] : null,
    };
  });
};

const buildEntry = (job: JobClass, levels: Record<string, number>): ClassCodexEntry => {
  const tier = codexTier(job.tier);
  const requirement = JOB_UNLOCK_REQUIREMENTS[job.name] ?? {};
  return {
    name: job.name,
    icon: job.icon,
    description: job.description ?? '',
    creed: job.creed,
    realLife: [...job.realLife],
    passive: classPassive(job.name).blurb,
    pillars: [job.primaryPillar, job.secondaryPillar, job.tertiaryPillar].map((key, index) => pillarOf(key, RANKS[index])),
    startingHp: calculateMaxHp(1, job.name),
    startingMp: calculateMaxMp(1, job.name),
    tier,
    sealed: !isClassUnlocked(job.name, levels),
    requirement: classRequirementLabel(job.name),
    requirementProgress: Object.entries(requirement).map(([name, needed]) => ({
      name,
      needed,
      level: levelIn(levels, name),
      met: levelIn(levels, name) >= needed,
    })),
    heroLevel: levelIn(levels, job.name),
    growsInto: tier < 3 ? evolutionsOf(job.name, levels) : [],
    power: powerOf(job),
  };
};

/** Every class in JOB_CLASS_OPTIONS order (tier 1 first), judged against the hero's class levels. */
export const classCodex = (levels: Record<string, number>): ClassCodexEntry[] =>
  JOB_CLASS_OPTIONS.map((job) => buildEntry(job, levels ?? {}));

/** One class by name ("warrior" and "Warrior" are the same), or null when there is no such class. */
export const classCodexEntry = (name: string, levels: Record<string, number>): ClassCodexEntry | null => {
  const wanted = canonicalClassName(name);
  const job = JOB_CLASS_OPTIONS.find((candidate) => candidate.name === wanted);
  return job ? buildEntry(job, levels ?? {}) : null;
};
