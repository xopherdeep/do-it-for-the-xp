import { Ability, AbilityType, TimePeriod, ABILITY_CLASSES } from '@/hooks/abilities/abilityConstants';

/**
 * Tech Mage (Technician) Ability Presets
 */
export const TECH_MAGE_PRESETS: Ability[] = [
  {
    id: 'tech-mage-debug',
    name: 'Debug',
    description: 'Find and fix problems in your code or projects more efficiently.',
    type: AbilityType.InGame,
    frequency: TimePeriod.Daily,
    mpCost: 15,
    apRequirement: {
      amount: 10,
      period: TimePeriod.Daily
    },
    icon: 'appsOutline',
    prerequisites: [],
    isPreset: true,
    battleEffect: 'weaken',
    effect: 'Increase problem-solving speed by 25% for technical tasks',
    characterRequirement: {
      level: 1,
      class: {
        [ABILITY_CLASSES.Technician]: 1
      }
    },
    position: { x: 500, y: 100 }
  },
  {
    id: 'tech-mage-quicksave',
    name: 'Quick Save',
    description: 'Save your progress automatically to prevent losing work.',
    type: AbilityType.InGame,
    frequency: TimePeriod.Daily,
    mpCost: 5,
    apRequirement: {
      amount: 8,
      period: TimePeriod.Daily
    },
    icon: 'saveOutline',
    prerequisites: [],
    isPreset: true,
    battleEffect: 'none',
    effect: 'Automatically save your work every 15 minutes for the next 4 hours',
    characterRequirement: {
      level: 1,
      class: {
        [ABILITY_CLASSES.Technician]: 1
      }
    },
    position: { x: 600, y: 100 }
  },
  {
    id: 'tech-mage-overclock',
    name: 'Overclock',
    description: 'Push yourself to work faster for a limited time.',
    type: AbilityType.InGame,
    frequency: TimePeriod.Weekly,
    mpCost: 30,
    apRequirement: {
      amount: 50,
      period: TimePeriod.Weekly
    },
    icon: 'flashOutline',
    prerequisites: ['tech-mage-debug'],
    isPreset: true,
    battleEffect: 'stun',
    effect: 'Double your productivity for the next hour, but requires a cooldown period after',
    characterRequirement: {
      level: 5,
      class: {
        [ABILITY_CLASSES.Technician]: 3
      }
    },
    position: { x: 700, y: 200 }
  },
  {
    id: 'tech-mage-system-restore',
    name: 'System Restore',
    description: 'Reset your environment after a major disruption.',
    type: AbilityType.InGame,
    frequency: TimePeriod.Monthly,
    mpCost: 50,
    apRequirement: {
      amount: 80,
      period: TimePeriod.Monthly
    },
    icon: 'refreshOutline',
    prerequisites: ['tech-mage-overclock'],
    isPreset: true,
    battleEffect: 'heal',
    effect: 'Reset all cooldowns and restore 50% of MP',
    characterRequirement: {
      level: 10,
      class: {
        [ABILITY_CLASSES.Technician]: 5
      }
    },
    scaling: {
      attribute: 'intelligence',
      rate: 0.05
    },
    position: { x: 800, y: 300 }
  }
];
