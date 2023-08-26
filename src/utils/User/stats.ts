interface XPStats {
  now: number;
  next_level: number;
}

interface GPStats {
  limit: number;
  debt: number;
  wallet: number;
  savings: number;
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

  constructor({ level, xp, gp, hp, mp, ap, special }: { level?: number, xp: XPStats, gp?: GPStats, hp?: HPMPStats, mp?: HPMPStats, ap?: APStats, special?: SpecialStats } = {
    xp: {
      now: 0,
      next_level: 100
    }

  }) {

    const debt = gp && gp.wallet < 0 ? 1 * gp?.wallet : 0

    // console.log("debt", debt);


    this.level = level ?? 1;
    this.xp = {
      now: xp?.now,
      next_level: xp?.next_level,
    };
    this.gp = {
      limit: gp?.limit || 100,
      debt: Number(gp?.debt) + Number(debt) ?? debt,
      wallet: gp?.wallet ?? 0,
      savings: gp?.savings ?? 100
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
    this.ap = {
      hour: ap?.hour ?? [],
      day: ap?.day ?? [],
      week: ap?.week ?? [],
      month: ap?.month ?? [],
      year: ap?.year ?? [],
    };
    this.special = {
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
  }
}
