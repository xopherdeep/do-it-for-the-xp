/**
 * Five Pillars of Mastery Configuration
 * 
 * Central source of truth for pillar data including:
 * - Colors, icons, descriptions
 * - Associated stats (3 per pillar = 15 total stats)
 * - Currency association (HP, MP, AP, GP, XP)
 */

export type PillarType = 'physical' | 'mental' | 'vibrational' | 'relational' | 'eternal';

export interface PillarStat {
  name: string;
  description: string;
}

export interface PillarConfig {
  name: string;
  color: string;           // Ionic color name
  icon: string;            // FontAwesome icon class
  currency: string;        // Associated point type
  currencyLabel: string;   // Display label for currency
  description: string;     // Pillar description
  stats: Record<string, PillarStat>;
}

export const PILLARS: Record<PillarType, PillarConfig> = {
  physical: {
    name: 'Physical',
    color: 'danger',
    icon: 'fa-heartbeat',
    currency: 'hp',
    currencyLabel: 'HP',
    description: 'Vitality and endurance',
    stats: {
      defense: { name: 'Defense', description: 'Increases Maximum HP capacity' },
      strength: { name: 'Strength', description: 'Decreases HP loss when taking damage' },
      endurance: { name: 'Endurance', description: 'Boosts HP recovery and restoration' }
    }
  },
  mental: {
    name: 'Mental',
    color: 'tertiary',
    icon: 'fa-brain',
    currency: 'mp',
    currencyLabel: 'MP',
    description: 'Focus and wisdom',
    stats: {
      perception: { name: 'Perception', description: 'Increases Maximum MP capacity' },
      intelligence: { name: 'Intelligence', description: 'Decreases MP cost for active abilities' },
      wisdom: { name: 'Wisdom', description: 'Boosts MP recovery and meditation rate' }
    }
  },
  vibrational: {
    name: 'Vibrational',
    color: 'secondary',
    icon: 'fa-waveform',
    currency: 'ap',
    currencyLabel: 'AP',
    description: 'Energy and attention',
    stats: {
      agility: { name: 'Agility', description: 'Gain more AP when completing tasks' },
      focus: { name: 'Focus', description: 'Influence chances of receiving bonus AP points' },
      flow: { name: 'Flow', description: 'Reduces AP cost for active abilities' }
    }
  },
  relational: {
    name: 'Relational',
    color: 'warning',
    icon: 'fa-handshake-alt',
    currency: 'gp',
    currencyLabel: 'GP',
    description: 'Social presence and trade',
    stats: {
      awareness: { name: 'Awareness', description: 'Influences the amount of GP awarded' },
      presence: { name: 'Presence', description: 'Influences GP to $ conversion and trade rates' },
      charisma: { name: 'Charisma', description: 'Reduces the GP cost of items in shops' }
    }
  },
  eternal: {
    name: 'Eternal',
    color: 'success',
    icon: 'fa-atom',
    currency: 'xp',
    currencyLabel: 'XP',
    description: 'Lasting legacy and growth',
    stats: {
      guts: { name: 'Guts', description: 'Influences the amount of XP awarded' },
      luck: { name: 'Luck', description: 'Influence chances of receiving bonus XP points' },
      mastery: { name: 'Mastery', description: 'Reduces the XP threshold required to reach the next Level' }
    }
  }
};

// Helper: Get pillar icon
export const getPillarIcon = (pillar: PillarType): string => PILLARS[pillar]?.icon || 'fa-circle';

// Helper: Get pillar color as CSS variable
export const getPillarColor = (pillar: PillarType): string => {
  const config = PILLARS[pillar];
  return config ? `var(--ion-color-${config.color})` : 'var(--ion-color-medium)';
};

// Helper: Map stat name to its pillar
export const getStatPillar = (stat: string): PillarType | null => {
  for (const [pillarKey, pillar] of Object.entries(PILLARS)) {
    if (stat in pillar.stats) {
      return pillarKey as PillarType;
    }
  }
  return null;
};

// All 15 stat names
export const ALL_STATS = Object.values(PILLARS).flatMap(p => Object.keys(p.stats));
