import { NewProfileForm } from "@/databases/ProfileDb"
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
  public email: string
  public passcode: string
  public name: {
    full: string
    first: string
    middle: string
    last: string
    nick: string
    preferred: string
  }
  public stats: Stats
  public birthday?: string
  public avatar: string
  public favoriteThing: string
  public favoriteFood: string
  public jobClass: string
  public isAdult: boolean

  constructor(defaults: NewProfileForm) {
    this.id = defaults?.id || uuidv4()
    this.email = defaults.email || ""
    this.passcode = defaults.passcode || "";
    this.name = this.setName(defaults.name)
    this.stats = new Stats(defaults.stats)
    this.birthday = defaults.birthday
    this.avatar = defaults.avatar
    this.favoriteThing = defaults.favoriteThing
    this.favoriteFood = defaults.favoriteFood
    this.jobClass = defaults.jobClass
    this.isAdult = defaults.isAdult
  }
  setName({ full, first, last, middle, nick, preferred }: any) {
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
