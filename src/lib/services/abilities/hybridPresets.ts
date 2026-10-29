import { Ability, AbilityType, TimePeriod, ABILITY_CLASSES } from '@/hooks/abilities/abilityConstants';

/**
 * Hybrid/Multi-class Ability Presets 
 */
export const HYBRID_PRESETS: Ability[] = [
  {
    id: 'hybrid-time-tech-quantum-computing',
    name: 'Quantum Computing',
    description: 'Combine time manipulation with technical skills to solve complex problems simultaneously.',
    type: AbilityType.InGame,
    frequency: TimePeriod.Weekly,
    mpCost: 45,
    apRequirement: {
      amount: 70,
      period: TimePeriod.Weekly
    },
    icon: 'flashOutline',
    prerequisites: ['time-mage-haste', 'tech-mage-debug'],
    isPreset: true,
    battleEffect: 'none',
    effect: 'Work on two different tasks simultaneously with 80% efficiency on both',
    characterRequirement: {
      level: 8,
      class: {
        [ABILITY_CLASSES.TimeMage]: 3,
        [ABILITY_CLASSES.Technician]: 3
      }
    },
    scaling: {
      attribute: 'intelligence',
      rate: 0.08
    },
    position: { x: 600, y: 500 }
  }
];
