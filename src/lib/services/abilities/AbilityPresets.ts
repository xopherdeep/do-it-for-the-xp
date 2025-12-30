/**
 * Ability Presets
 * 
 * This file contains predefined ability presets that users can add to their game.
 */

import { Ability, AbilityType, TimePeriod, ABILITY_CLASSES } from '@/hooks/abilities/abilityConstants';
import { v4 as uuidv4 } from 'uuid';

/**
 * Time Mage Ability Presets
 */
export const TIME_MAGE_PRESETS: Ability[] = [
  {
    id: 'time-mage-haste',
    name: 'Haste',
    description: 'Complete tasks in less time by improving focus and efficiency.',
    type: AbilityType.InGame,
    frequency: TimePeriod.Daily,
    mpCost: 10,
    apRequirement: {
      amount: 100,
      period: TimePeriod.Daily
    },
    icon: 'timeOutline',
    prerequisites: [],
    isPreset: true,
    effect: 'Reduce the time required for your next task by 20%',
    characterRequirement: {
      level: 1,
      class: {
        [ABILITY_CLASSES.TimeMage]: 1
      }
    },
    position: { x: 100, y: 100 }
  },
  {
    id: 'time-mage-slow',
    name: 'Slow',
    description: 'Take more time on important tasks that require attention to detail.',
    type: AbilityType.InGame,
    frequency: TimePeriod.Daily,
    mpCost: 5,
    apRequirement: {
      amount: 50,
      period: TimePeriod.Daily
    },
    icon: 'timeOutline',
    prerequisites: [],
    isPreset: true,
    effect: 'Increase the quality of your next task by taking your time',
    characterRequirement: {
      level: 1,
      class: {
        [ABILITY_CLASSES.TimeMage]: 1
      }
    },
    position: { x: 200, y: 100 }
  },
  {
    id: 'time-mage-stop',
    name: 'Stop',
    description: 'Pause your schedule to take a break and recover energy.',
    type: AbilityType.InGame,
    frequency: TimePeriod.Weekly,
    mpCost: 25,
    apRequirement: {
      amount: 200,
      period: TimePeriod.Weekly
    },
    icon: 'timeOutline',
    prerequisites: ['time-mage-slow'],
    isPreset: true,
    effect: 'Take a 30-minute break without guilt to recover MP and reset cooldowns',
    characterRequirement: {
      level: 5,
      class: {
        [ABILITY_CLASSES.TimeMage]: 3
      }
    },
    position: { x: 300, y: 200 }
  },
  {
    id: 'time-mage-rewind',
    name: 'Rewind',
    description: 'Get a second chance at a task you failed or did poorly.',
    type: AbilityType.InGame,
    frequency: TimePeriod.Weekly,
    mpCost: 40,
    apRequirement: {
      amount: 300,
      period: TimePeriod.Weekly
    },
    icon: 'refreshOutline',
    prerequisites: ['time-mage-stop'],
    isPreset: true,
    effect: 'Retry a failed task with a +20% success bonus',
    characterRequirement: {
      level: 10,
      class: {
        [ABILITY_CLASSES.TimeMage]: 5
      }
    },
    scaling: {
      attribute: 'wisdom',
      rate: 0.05
    },
    position: { x: 400, y: 300 }
  }
];

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
      amount: 100,
      period: TimePeriod.Daily
    },
    icon: 'appsOutline',
    prerequisites: [],
    isPreset: true,
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
      amount: 50,
      period: TimePeriod.Daily
    },
    icon: 'saveOutline',
    prerequisites: [],
    isPreset: true,
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
      amount: 250,
      period: TimePeriod.Weekly
    },
    icon: 'flashOutline',
    prerequisites: ['tech-mage-debug'],
    isPreset: true,
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
      amount: 400,
      period: TimePeriod.Monthly
    },
    icon: 'refreshOutline',
    prerequisites: ['tech-mage-overclock'],
    isPreset: true,
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

/**
 * Real Life Reward Presets
 */
export const REAL_LIFE_PRESETS: Ability[] = [
  {
    id: 'irl-coffee-break',
    name: 'Coffee Break',
    description: 'Take a short break to enjoy a cup of coffee or tea.',
    type: AbilityType.RealLife,
    frequency: TimePeriod.Daily,
    mpCost: 5,
    apRequirement: {
      amount: 50,
      period: TimePeriod.Daily
    },
    icon: 'pizzaOutline',
    prerequisites: [],
    isPreset: true,
    position: { x: 100, y: 400 }
  },
  {
    id: 'irl-gaming-hour',
    name: 'Gaming Hour',
    description: 'Take an hour to play your favorite game guilt-free.',
    type: AbilityType.RealLife,
    frequency: TimePeriod.Weekly,
    mpCost: 10,
    apRequirement: {
      amount: 200,
      period: TimePeriod.Weekly
    },
    icon: 'gameControllerOutline',
    prerequisites: [],
    isPreset: true,
    position: { x: 200, y: 400 }
  },
  {
    id: 'irl-movie-night',
    name: 'Movie Night',
    description: 'Enjoy a movie or TV show marathon as a reward.',
    type: AbilityType.RealLife,
    frequency: TimePeriod.Weekly,
    mpCost: 15,
    apRequirement: {
      amount: 300,
      period: TimePeriod.Weekly
    },
    icon: 'tvOutline',
    prerequisites: [],
    isPreset: true,
    position: { x: 300, y: 400 }
  },
  {
    id: 'irl-restaurant-meal',
    name: 'Restaurant Meal',
    description: 'Treat yourself to a meal at your favorite restaurant.',
    type: AbilityType.RealLife,
    frequency: TimePeriod.Monthly,
    mpCost: 30,
    apRequirement: {
      amount: 500,
      period: TimePeriod.Monthly
    },
    icon: 'pizzaOutline',
    prerequisites: [],
    isPreset: true,
    position: { x: 400, y: 400 }
  },
  {
    id: 'irl-day-off',
    name: 'Day Off',
    description: 'Take a full day off to relax and recharge.',
    type: AbilityType.RealLife,
    frequency: TimePeriod.Monthly,
    mpCost: 50,
    apRequirement: {
      amount: 1000,
      period: TimePeriod.Monthly
    },
    icon: 'homeOutline',
    prerequisites: ['irl-restaurant-meal'],
    isPreset: true,
    position: { x: 500, y: 500 }
  }
];

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
      amount: 350,
      period: TimePeriod.Weekly
    },
    icon: 'flashOutline',
    prerequisites: ['time-mage-haste', 'tech-mage-debug'],
    isPreset: true,
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

/**
 * Create a custom ability with basic defaults
 */
export function createCustomAbility(partial: Partial<Ability> = {}): Ability {
  return {
    id: partial.id || uuidv4(),
    name: partial.name || 'New Ability',
    description: partial.description || 'Describe your ability here',
    type: partial.type || AbilityType.RealLife,
    frequency: partial.frequency || TimePeriod.Daily,
    mpCost: partial.mpCost !== undefined ? partial.mpCost : 10,
    apRequirement: partial.apRequirement || {
      amount: 100,
      period: TimePeriod.Daily
    },
    icon: partial.icon || 'colorWandOutline',
    prerequisites: partial.prerequisites || [],
    isPreset: false,
    position: partial.position || {
      x: Math.floor(Math.random() * 800),
      y: Math.floor(Math.random() * 600)
    },
    effect: partial.effect,
    characterRequirement: partial.characterRequirement,
    scaling: partial.scaling
  };
}

export default {
  TIME_MAGE_PRESETS,
  TECH_MAGE_PRESETS,
  REAL_LIFE_PRESETS,
  HYBRID_PRESETS,
  createCustomAbility
};