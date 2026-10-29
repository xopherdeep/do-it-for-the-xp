/**
 * Ability Presets
 * 
 * This file contains predefined ability presets that users can add to their game.
 */

import { Ability, AbilityType, TimePeriod, ABILITY_CLASSES } from '@/hooks/abilities/abilityConstants';
import { HYBRID_PRESETS } from './hybridPresets';
import { createCustomAbility } from './customAbility';

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
      amount: 10,
      period: TimePeriod.Daily
    },
    icon: 'timeOutline',
    prerequisites: [],
    isPreset: true,
    battleEffect: 'kindle',
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
      amount: 8,
      period: TimePeriod.Daily
    },
    icon: 'timeOutline',
    prerequisites: [],
    isPreset: true,
    battleEffect: 'frost',
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
      amount: 40,
      period: TimePeriod.Weekly
    },
    icon: 'timeOutline',
    prerequisites: ['time-mage-slow'],
    isPreset: true,
    battleEffect: 'time-stop',
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
    description: "Turn back the beast's clock: it refills to full.",
    type: AbilityType.InGame,
    frequency: TimePeriod.Weekly,
    mpCost: 40,
    apRequirement: {
      amount: 60,
      period: TimePeriod.Weekly
    },
    icon: 'refreshOutline',
    prerequisites: ['time-mage-stop'],
    isPreset: true,
    battleEffect: 'gust',
    effect: "The beast's clock refills to full.",
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

/**
 * Real Life Privilege Presets
 *
 * Privileges only: freedoms a hero unlocks with AP and spends MP to use. Anything that costs the family money
 * (a restaurant meal, a movie ticket, a toy) is a shop item bought with GP instead (src/lib/services/shops/rewardPresets.ts).
 */
export const REAL_LIFE_PRESETS: Ability[] = [
  {
    id: 'irl-captains-seat',
    name: "Captain's Seat",
    description: 'Call the front seat, or any seat you like, for a whole day.',
    type: AbilityType.RealLife,
    frequency: TimePeriod.Daily,
    mpCost: 5,
    apRequirement: {
      amount: 8,
      period: TimePeriod.Daily
    },
    icon: 'steering-wheel',
    iconPrefix: 'fad',
    prerequisites: [],
    isPreset: true,
    position: { x: 100, y: 400 }
  },
  {
    id: 'irl-night-owl',
    name: 'Night Owl',
    description: 'Stay up 30 minutes past bedtime tonight.',
    type: AbilityType.RealLife,
    frequency: TimePeriod.Weekly,
    mpCost: 10,
    apRequirement: {
      amount: 30,
      period: TimePeriod.Weekly
    },
    icon: 'moon-stars',
    iconPrefix: 'fad',
    prerequisites: [],
    isPreset: true,
    timerMinutes: 30,
    position: { x: 200, y: 400 }
  },
  {
    id: 'irl-gaming-hour',
    name: 'Portal Hour',
    description: 'One extra hour of screen or game time, guilt-free.',
    type: AbilityType.RealLife,
    frequency: TimePeriod.Weekly,
    mpCost: 10,
    apRequirement: {
      amount: 40,
      period: TimePeriod.Weekly
    },
    icon: 'gamepad',
    iconPrefix: 'fad',
    prerequisites: [],
    isPreset: true,
    timerMinutes: 60,
    position: { x: 300, y: 400 }
  },
  {
    id: 'irl-bards-pick',
    name: "Bard's Pick",
    description: 'Choose the movie or show for family movie night at home.',
    type: AbilityType.RealLife,
    frequency: TimePeriod.Weekly,
    mpCost: 10,
    apRequirement: {
      amount: 50,
      period: TimePeriod.Weekly
    },
    icon: 'popcorn',
    iconPrefix: 'fad',
    prerequisites: [],
    isPreset: true,
    position: { x: 400, y: 400 }
  },
  {
    id: 'irl-feast-decree',
    name: 'Feast Decree',
    description: 'Choose what the family cooks for dinner one night.',
    type: AbilityType.RealLife,
    frequency: TimePeriod.Weekly,
    mpCost: 15,
    apRequirement: {
      amount: 60,
      period: TimePeriod.Weekly
    },
    icon: 'hat-chef',
    iconPrefix: 'fad',
    prerequisites: [],
    isPreset: true,
    position: { x: 500, y: 400 }
  },
  {
    id: 'irl-guild-gathering',
    name: 'Guild Gathering',
    description: 'Invite a friend over to play.',
    type: AbilityType.RealLife,
    frequency: TimePeriod.Monthly,
    mpCost: 20,
    apRequirement: {
      amount: 100,
      period: TimePeriod.Monthly
    },
    icon: 'campfire',
    iconPrefix: 'fad',
    prerequisites: ['irl-night-owl'],
    isPreset: true,
    position: { x: 300, y: 500 }
  },
  {
    id: 'irl-day-off',
    name: 'Day of Rest',
    description: 'A whole day with no chores. The Game Master picks the day.',
    type: AbilityType.RealLife,
    frequency: TimePeriod.Monthly,
    mpCost: 50,
    apRequirement: {
      amount: 200,
      period: TimePeriod.Monthly
    },
    icon: 'couch',
    iconPrefix: 'fad',
    prerequisites: ['irl-gaming-hour'],
    isPreset: true,
    position: { x: 500, y: 500 }
  },
  // On the quest board: these four bend the hero's own schedule when cast (PowerBoardEffects.ts)
  {
    id: 'irl-snooze',
    name: 'Snooze',
    description: 'Move one quest to tomorrow.',
    type: AbilityType.RealLife,
    frequency: TimePeriod.Weekly,
    mpCost: 10,
    apRequirement: {
      amount: 30,
      period: TimePeriod.Weekly
    },
    icon: 'alarm-snooze',
    iconPrefix: 'fad',
    prerequisites: [],
    isPreset: true,
    boardEffect: 'snooze',
    position: { x: 100, y: 600 }
  },
  {
    id: 'irl-extra-time',
    name: 'Extra Time',
    description: "24 more hours on one quest's deadline.",
    type: AbilityType.RealLife,
    frequency: TimePeriod.Weekly,
    mpCost: 10,
    apRequirement: {
      amount: 30,
      period: TimePeriod.Weekly
    },
    icon: 'hourglass-half',
    iconPrefix: 'fad',
    prerequisites: [],
    isPreset: true,
    boardEffect: 'extra-time',
    position: { x: 200, y: 600 }
  },
  {
    id: 'irl-quiet-day',
    name: 'Quiet Day',
    description: 'No ambushes for 24 hours.',
    type: AbilityType.RealLife,
    frequency: TimePeriod.Weekly,
    mpCost: 15,
    apRequirement: {
      amount: 40,
      period: TimePeriod.Weekly
    },
    icon: 'eye-slash',
    iconPrefix: 'fad',
    prerequisites: [],
    isPreset: true,
    boardEffect: 'quiet-day',
    position: { x: 300, y: 600 }
  },
  {
    id: 'irl-trusted-hour',
    name: 'Trusted Hour',
    description: 'For one hour, your claims skip the approval queue.',
    type: AbilityType.RealLife,
    frequency: TimePeriod.Weekly,
    mpCost: 20,
    apRequirement: {
      amount: 60,
      period: TimePeriod.Weekly
    },
    icon: 'user-shield',
    iconPrefix: 'fad',
    prerequisites: [],
    isPreset: true,
    boardEffect: 'trusted-hour',
    position: { x: 400, y: 600 }
  },
  {
    id: 'irl-car-dj',
    name: 'Car DJ Privilege',
    description: '15 minutes DJing in car.',
    type: AbilityType.RealLife,
    frequency: TimePeriod.Daily,
    mpCost: 5,
    apRequirement: {
      amount: 8,
      period: TimePeriod.Daily
    },
    icon: 'music',
    iconPrefix: 'fad',
    prerequisites: [],
    isPreset: true,
    timerMinutes: 15,
    position: { x: 500, y: 600 }
  },
  {
    id: 'irl-app-extension',
    name: 'App Extension Time',
    description: '30 minutes bonus device time.',
    type: AbilityType.RealLife,
    frequency: TimePeriod.Weekly,
    mpCost: 10,
    apRequirement: {
      amount: 20,
      period: TimePeriod.Weekly
    },
    icon: 'hourglass-half',
    iconPrefix: 'fad',
    prerequisites: [],
    isPreset: true,
    timerMinutes: 30,
    position: { x: 600, y: 600 }
  },
  {
    id: 'irl-yes-day',
    name: "The King's Decree",
    description: 'YES Day privilege.',
    type: AbilityType.RealLife,
    frequency: TimePeriod.Monthly,
    mpCost: 50,
    apRequirement: {
      amount: 300,
      period: TimePeriod.Monthly
    },
    icon: 'crown',
    iconPrefix: 'fad',
    prerequisites: [],
    isPreset: true,
    position: { x: 700, y: 600 }
  },
  {
    id: 'irl-daddy-date',
    name: 'Daddy Date Adventure',
    description: 'One-on-one time and an adventure of your choosing with Dad.',
    type: AbilityType.RealLife,
    frequency: TimePeriod.Weekly,
    mpCost: 10,
    apRequirement: {
      amount: 30,
      period: TimePeriod.Weekly
    },
    icon: 'user-friends',
    iconPrefix: 'fad',
    prerequisites: [],
    isPreset: true,
    position: { x: 800, y: 600 }
  }
];

// The hybrid presets and the custom ability live beside this file (hybridPresets.ts, customAbility.ts)
export { HYBRID_PRESETS, createCustomAbility };

export default {
  TIME_MAGE_PRESETS,
  TECH_MAGE_PRESETS,
  REAL_LIFE_PRESETS,
  HYBRID_PRESETS,
  createCustomAbility
};