interface XPStats {
  now: number;
  next_level: number;
  ledger: Entry[]
}

interface GPStats {
  limit: number;
  debt: number;
  wallet: number;
  savings: number;
  ledger: Entry[]
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
  total: number;
  ledger: Entry[];
}
interface Entry {
  type: 'reward' | 'penalty'; // Could be more types like 'purchase', 'exchange', etc.
  timestamp: number; // The Unix timestamp when the transaction occurred
  achievementId: any; // The ID of the achievement tied to this entry
  amount: number; // The amount gained or lost
  description: string; // A brief description of the entry
}


interface SpecialStats {
  ledger: Entry[];
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

  constructor({
    level, xp, gp, hp, mp, ap, special
  }: {
    level?: number,
    xp: XPStats,
    gp?: GPStats,
    hp?: HPMPStats,
    mp?: HPMPStats,
    ap?: APStats,
    special?: SpecialStats
  } = {
      xp: {
        now: 0,
        next_level: 100,
        ledger: [],
      }
    }) {

    const debt = gp && gp.wallet < 0 ? 1 * gp?.wallet : 0

    // console.log("debt", debt);


    this.level = level ?? 1;
    this.xp = {
      now: xp?.now,
      next_level: xp?.next_level,
      ledger: xp?.ledger,
    };
    this.gp = {
      limit: gp?.limit || 100,
      debt: Number(gp?.debt) + Number(debt) ?? debt,
      wallet: gp?.wallet ?? 0,
      savings: gp?.savings ?? 100,
      ledger: gp?.ledger ?? [],
    };
    this.ap = {
      hour: ap?.hour ?? [],
      day: ap?.day ?? [],
      week: ap?.week ?? [],
      month: ap?.month ?? [],
      year: ap?.year ?? [],
      total: ap?.total ?? 0,
      ledger: ap?.ledger ?? [],
    };
    this.special = {
      ledger: special?.ledger ?? [],
      strength: special?.strength ?? 0,
      defense: special?.defense ?? 0,
      endurance: special?.endurance ?? 0,
      intelligence: special?.intelligence ?? 0,
      perception: special?.perception ?? 0,
      wisdom: special?.wisdom ?? 0,
      charisma: special?.charisma ?? 0,
      awareness: special?.awareness ?? 0,
      presence: special?.presence ?? 0,
      agility: special?.agility ?? 0,
      guts: special?.guts ?? 0,
      luck: special?.luck ?? 0,

    };
    this.hp = {
      now: hp?.now ?? 25,
      max: hp?.max ?? 30,
      min: hp?.min ?? 0,
    };
    this.mp = {
      now: mp?.now ?? 0,
      max: mp?.max ?? 0,
      min: mp?.min ?? 0,
    };
  }
}
