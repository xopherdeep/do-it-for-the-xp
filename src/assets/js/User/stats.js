export default class stats {
  constructor() {
    return {
      level: 1,
      xp: {
        now: 100, 
        next_level: 1000,
      },
      gp: {
        limit: 1000,
        debt: 200,  
        wallet: 400,
      },
      hp: {
        now: 25,
        max: 30,
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

      // HP - Physical 
      strength    : 0,   //? achievements take less HP
      defense     : 0,   //? influences max HP
      endurance   : 0,   //? increases HP restore rate

      // MP - Mental
      intelligence: 0,   //? abilities cost less MP to cast
      perception  : 0,   //? influences max MP
      wisdom      : 0,   //? increases MP restore rate

      // GP - Social
      charisma    : 0,   //? influences shop rates
      awareness   : 0,   //? increases reward of GP,
      presence    : 0,   //?

      // AP
      agility     : 0,   //? influences AP reward points
      guts        : 0,   // Influences XP points rewarded //? Smmmmassssshhhhhhhh!!!
      luck        : 0,   //? higher chance of successful outcome of random event
      
    };
  }
}
