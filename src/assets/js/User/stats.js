export default class stats {
  constructor() {
    return {
      level: 1,
      xp: 0,
      gp: 0,
      hp: {
        now: 0,
        max: 0,
        min: 0,
      },
      mp: {
        now: 0,
        max: 0,
        min: 0,
      },
      ap: {
        hour: [],
        day: [],
        week: [],
        month: [],
        year: [],
      },
      // SPECIAL-G Stats
      // HP
      strength: 0, //? achievements take less HP
      defense: 0, //? influences max HP
      endurance: 0, //? increases HP restore rate
      // MP
      intelligence: 0, //? abilities cost less MP to cast
      perception: 0, //? influences max MP
      wisdom: 0, //? increases MP restore rate
      // GP
      charm: 0, //? influences shop rates
      charisma: 0, //? increases reward of GP,
      presence: 0, //?
      // AP
      agility: 0, //? influences AP reward points
      // ??
      lucky: 0, //? higher chance of successful outcome of random event
      // Influences XP points rewarded
      guts: 0, //? Smmmmassssshhhhhhhh!!!
    };
  }
}
