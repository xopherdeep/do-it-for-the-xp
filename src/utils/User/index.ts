import Stats from "./stats"
import { v4 as uuidv4 } from 'uuid'

export interface ProfileName {
  fullName: string,
  first: string,
  last: string,
  middle: string,
  nick: string,
  preferred: string
}
export default class User {
  public id: string
  public name: {
    full: string
    first: string
    middle: string
    last: string
    nick: string
    preferred: string
  }
  public stats: Stats
  public birthday: string
  public avatar: string
  public favoriteThing: string
  public favoriteFood: string
  public jobClass: string

  constructor(defaults?) {
    this.id = uuidv4()
    this.name = this.setName(defaults.name)
    this.stats = new Stats()
    this.birthday = defaults.birthday
    this.avatar = defaults.avatar
    this.favoriteThing = defaults.favoriteThing
    this.favoriteFood = defaults.favoriteFood
    this.jobClass = defaults.favoriteFood
  }
  setName({ full, first, last, middle, nick, preferred }) {
    const name = { full, first, last, middle, nick, preferred }
    if (full) {
      const parts = full.split(" ")
      const numParts = parts.length;

      switch (numParts) {
        case 2:
          name.first = parts[0]
          name.first = parts[1]
          break;
        case 3:
          name.first = parts[0]
          name.middle = parts[1]
          name.last = parts[3]
          break;
        case 5:
          name.first = parts[0]
          name.middle = parts[1]
          name.last = parts[2]
          name.nick = parts[4]
          break;
        case 6:
          name.first = parts[0]
          name.middle = parts[1]
          name.last = parts[2]
          name.nick = `${parts[4]} ${parts[5]}`
          break;
      }
    }
    return name
  }
}
