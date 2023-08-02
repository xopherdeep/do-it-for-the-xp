import stats from "./stats"

export interface ProfileName{
  fullName: string,
  first: string,
  last: string,
  middle: string,
  nick: string,
  preferred: string
}
export default class User {
  setName({ fullName, first, last, middle, nick, preferred }){
    const name = { fullName, first, last, middle, nick, preferred }
    if(fullName){
      const parts    = fullName.split(" ")
      const numParts = parts.length;

      switch(numParts){
          case 2: 
            name.first = parts[0]
            name.first = parts[1]
          break;
          case 3: 
            name.first  = parts[0]
            name.middle = parts[1]
            name.last   = parts[3]
          break;
          case 5: 
            name.first  = parts[0]
            name.middle = parts[1]
            name.last   = parts[2]
            name.nick   = parts[4]
          break;
          case 6: 
            name.first  = parts[0]
            name.middle = parts[1]
            name.last   = parts[2]
            name.nick   = `${parts[4]} ${parts[5]}`
          break;
        }
    }
    // console.log(name);
    return name 
  }
  constructor(defaults) {
    const name = this.setName(defaults.name);
    // const { avatar } = defaults

    return {
      ...defaults,
      birthday: "",   // Timestamp
      name,
      stats: new stats()
    }
  }
}
