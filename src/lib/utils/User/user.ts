import { NewProfileForm } from "@/lib/databases/ProfileDb"
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
  /** A new hero starts with no items unlocked; temples, shops and the Pegasi add to this (see ItemEffects.ts) */
  public unlockedItems: string[]

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
    this.unlockedItems = Array.isArray(defaults.unlockedItems) ? [...defaults.unlockedItems] : []
  }
  setName({ full, first, last, middle, nick, preferred }: any) {
    const name = { full, first, last, middle, nick, preferred }
    if (full) {
      // Accepts "First Last", "First Middle Last" (any number of middle names)
      // and an optional nickname after "aka", e.g. "Sam Jo Smith aka Sammy".
      const [realName, akaNick] = String(full).split(/\s+aka\s+/i)
      const parts = realName.trim().split(/\s+/).filter(Boolean)
      if (parts.length) {
        name.first = name.first || parts[0]
        name.last = name.last || (parts.length > 1 ? parts[parts.length - 1] : "")
        name.middle = name.middle || parts.slice(1, -1).join(" ")
      }
      if (akaNick) name.nick = name.nick || akaNick.trim()
    }
    // Every hero needs something to be called by; fall back to the first name
    if (!name.nick) name.nick = name.first || name.full
    return name
  }
}
