import { Ability, AbilityType, TimePeriod } from '@/hooks/abilities/abilityConstants';
import { v4 as uuidv4 } from 'uuid';

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
    battleEffect: partial.battleEffect,
    boardEffect: partial.boardEffect,
    characterRequirement: partial.characterRequirement,
    scaling: partial.scaling
  };
}
