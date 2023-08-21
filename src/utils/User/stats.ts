interface XPStats {
  now: number;
  next_level: number;
}

interface GPStats {
  limit: number;
  debt: number;
  wallet: number;
}

interface HPMPStats {
  now: number;
  max: number;
  min: number;
}

interface APStats {
  hour: number[];
  day: number[];
  week: number[];
  month: number[];
  year: number[];
}

interface SpecialStats {
  strength: number;
  defense: number;
  endurance: number;
  intelligence: number;
  perception: number;
  wisdom: number;
  charisma: number;
  awareness: number;
  presence: number;
  agility: number;
  guts: number;
  luck: number;
}

export default class Stats {
  level: number;
  xp: XPStats;
  gp: GPStats;
  hp: HPMPStats;
  mp: HPMPStats;
  ap: APStats;
  special: SpecialStats;

  constructor() {
    this.level = 1;
    this.xp = {
      now: 100,
      next_level: 1000,
    };
    this.gp = {
      limit: 1000,
      debt: 200,
      wallet: 400,
    };
    this.hp = {
      now: 25,
      max: 30,
      min: 0,
    };
    this.mp = {
      now: 0,
      max: 0,
      min: 0,
    };
    this.ap = {
      hour: [],
      day: [],
      week: [],
      month: [],
      year: [],
    };
    this.special = {
      strength: 0,
      defense: 0,
      endurance: 0,
      intelligence: 0,
      perception: 0,
      wisdom: 0,
      charisma: 0,
      awareness: 0,
      presence: 0,
      agility: 0,
      guts: 0,
      luck: 0,
    };
  }
}
