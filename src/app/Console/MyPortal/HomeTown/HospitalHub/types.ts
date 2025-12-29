export interface Stat {
  now: number;
  max: number;
}

export interface SpecialStats {
  strength: number;
  defense: number;
  endurance: number;
  intelligence: number;
  perception: number;
  wisdom: number;
  charisma: number;
  leadership: number;
  luck: number;
  agility: number;
  dexterity: number;
  vitality: number;
}

export interface UserStats {
  hp: Stat;
  mp: Stat;
  special: SpecialStats;
}

export interface StatArea {
  color: string;
  stats: {
    [key: string]: string;
  };
}

export interface StatAreas {
  [key: string]: StatArea;
}

export interface User {
  id: string;
  stats: UserStats;
  name: {
    full: string;
  };
}