/**
 * Five Pillars of Mastery Configuration
 * 
 * Central source of truth for pillar data including:
 * - Colors, icons, descriptions
 * - Associated stats (3 per pillar = 15 total stats)
 * - Currency association (HP, MP, AP, GP, XP)
 *
 * Every stat description below is a promise the code keeps (docs/Stats-Contract.md, StatEffects.ts).
 * "Per point trained" means the points earned at level-ups; the class's starting number is already
 * folded into its base HP/MP and passive. A stat that changes nothing yet says "flavour for now".
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
      defense: { name: 'Defense', description: 'Adds 1 HP to your maximum per point trained' },
      strength: { name: 'Strength', description: 'Every beast strike lands 1% softer per point trained (up to 25%)' },
      endurance: { name: 'Endurance', description: 'Adds HP to your maximum per point trained; how much depends on your class (a Warrior gets 3)' }
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
      perception: { name: 'Perception', description: 'Sharper eyes: +2% chance per point trained to find something when you search a temple room (up to +30%)' },
      intelligence: { name: 'Intelligence', description: 'Adds MP to your maximum per point trained (a Mage gets 3), and takes 1% off every MP cost (up to 25%)' },
      wisdom: { name: 'Wisdom', description: 'Adds MP to your maximum per point trained (a Mage gets 2)' }
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
      agility: { name: 'Agility', description: 'Per point trained: +1% chance to dodge the parting strike when you run and +1 second per chore on the battle clock; 8 or more clears temple traps' },
      focus: { name: 'Focus', description: 'Steadies the mind. Flavour for now: it changes nothing yet' },
      flow: { name: 'Flow', description: 'Keeps you moving. Flavour for now: abilities have no AP cost yet' }
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
      awareness: { name: 'Awareness', description: '+1% GP from temple chests, searches and gates per point trained (up to +25%)' },
      presence: { name: 'Presence', description: 'How you carry yourself. Flavour for now: GP has no exchange rate yet' },
      charisma: { name: 'Charisma', description: 'Shop prices drop 1% per point trained (up to 20%), in town and in temple shops' }
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
      guts: { name: 'Guts', description: 'Defend blocks 1% more of a strike per point trained (up to 25%), and each point adds half an HP to your maximum' },
      luck: { name: 'Luck', description: 'Temple chests and searches can pay more: the top of the GP range grows 2% per point trained (up to +50%)' },
      mastery: { name: 'Mastery', description: 'The mark of a seasoned hero. Flavour for now: the XP curve is the same for everyone' }
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
