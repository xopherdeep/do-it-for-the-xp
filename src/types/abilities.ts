export enum AbilityType {
  RealLife = 'real-life',
  InGame = 'in-game'
}

export enum TimePeriod {
  Hourly = 'hourly',
  Daily = 'daily',
  Weekly = 'weekly',
  Monthly = 'monthly',
  Quarterly = 'quarterly',
  BiAnnual = 'bi-annual',
  Yearly = 'yearly',
  Flat = 'flat'
}

export enum AbilityStatus {
  Locked = 'locked',
  Unlocked = 'unlocked', 
  Available = 'available',
  Used = 'used',
  Cooling = 'cooling'
}

export const ABILITY_CLASSES = {
  TimeMage: 'time-mage',
  BlackMage: 'black-mage',
  WhiteMage: 'white-mage',
  Technician: 'technician',
  None: 'none'
};

export interface Ability {
  id: string;
  name: string;
  description: string;
  type: AbilityType;
  frequency: TimePeriod;
  icon: string;
  iconPrefix?: string; // 'fas', 'far', 'fal', 'fab', etc.
  position?: {
    x: number;
    y: number;
  };
  mpCost: number;
  apRequirement: {
    amount: number;
    period: TimePeriod;
  };
  // Only for in-game abilities
  effect?: string; 
  scaling?: {
    attribute: string;
    rate: number; // Percentage as decimal, e.g. 0.1 = 10%
  };
  characterRequirement?: {
    level?: number;
    class?: { [className: string]: number }; // className: requiredLevel
  };
  prerequisites?: string[]; // Array of ability IDs
  lastUsed?: string; // ISO date
  isPreset?: boolean; // Whether this is a predefined ability
}

// Helper function to check if an object is an Ability
export function isAbility(obj: any): obj is Ability {
  return obj 
    && typeof obj === 'object'
    && typeof obj.id === 'string'
    && typeof obj.name === 'string'
    && typeof obj.description === 'string'
    && (obj.type === AbilityType.RealLife || obj.type === AbilityType.InGame)
    && typeof obj.icon === 'string'
    && typeof obj.mpCost === 'number'
    && obj.apRequirement
    && typeof obj.apRequirement.amount === 'number'
    && Object.values(TimePeriod).includes(obj.apRequirement.period);
}